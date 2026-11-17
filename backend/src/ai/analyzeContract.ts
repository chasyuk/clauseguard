import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config.js';
import { ClauseItem, ContractLanguage } from '../extraction/clauseSplitter.js';
import { runLocalFallbackAnalysis } from './localAnalyzer.js';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt.js';
import {
  ContractAnalysisResult,
  DealContext,
  parseAndValidateAnalysis,
  SchemaValidationError,
} from './schema.js';

export type LlmInvoker = (systemPrompt: string, userPrompt: string) => Promise<string>;

export interface AnalysisOutcome {
  analysis: ContractAnalysisResult;
  provider: 'bedrock' | 'local_fallback';
  modelId: string;
  attempts: number;
}

export class AnalysisError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 502) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function defaultBedrockInvoke(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = new BedrockRuntimeClient({ region: config.awsRegion });
  const command = new ConverseCommand({
    modelId: config.bedrockModelId,
    system: [{ text: systemPrompt }],
    messages: [
      {
        role: 'user',
        content: [{ text: userPrompt }],
      },
    ],
    inferenceConfig: {
      temperature: 0.1,
      maxTokens: 4096,
    },
  });

  const response = await client.send(command);
  const textBlocks = response.output?.message?.content ?? [];
  const combined = textBlocks
    .map((block) => ('text' in block && typeof block.text === 'string' ? block.text : ''))
    .join('\n')
    .trim();

  if (!combined) {
    throw new AnalysisError('EMPTY_LLM_RESPONSE', 'Bedrock returned an empty response.', 502);
  }
  return combined;
}

function isMissingAwsCredentialsError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String(err.name) : '';
  const msg = 'message' in err ? String(err.message) : '';
  return (
    name === 'CredentialsProviderError' ||
    name === 'UnrecognizedClientException' ||
    name === 'AccessDeniedException' ||
    /Could not load credentials|Missing credentials|security token included in the request is invalid/i.test(
      msg,
    )
  );
}

/**
 * Analyzes split clauses in a single LLM call (with 1 automatic retry on invalid JSON/schema).
 * Falls back cleanly to deterministic local clause rules when AWS credentials are not configured locally.
 */
export async function analyzeContractClauses(
  clauses: ClauseItem[],
  detectedLanguage: ContractLanguage,
  options?: { invokeFn?: LlmInvoker; dealContext?: DealContext },
): Promise<AnalysisOutcome> {
  if (config.bedrockMode === 'local' && !options?.invokeFn) {
    return {
      analysis: runLocalFallbackAnalysis(clauses, detectedLanguage, options?.dealContext),
      provider: 'local_fallback',
      modelId: 'local-rules-v1',
      attempts: 1,
    };
  }

  const invokeFn = options?.invokeFn ?? defaultBedrockInvoke;
  const userPrompt = buildUserPrompt(clauses, detectedLanguage, options?.dealContext);

  let attempt = 1;
  let lastSchemaError = '';

  while (attempt <= 2) {
    const promptForAttempt =
      attempt === 1
        ? userPrompt
        : `${userPrompt}\n\nPREVIOUS OUTPUT FAILED VALIDATION (${lastSchemaError}). Respond with ONLY a valid JSON object matching the exact schema, no markdown fences, and ensure every plainLanguageSummary has 2 sentences.`;

    try {
      const rawResponse = await invokeFn(SYSTEM_PROMPT, promptForAttempt);
      const validated = parseAndValidateAnalysis(rawResponse, clauses, options?.dealContext);
      return {
        analysis: validated,
        provider: 'bedrock',
        modelId: options?.invokeFn ? 'custom-invoker' : config.bedrockModelId,
        attempts: attempt,
      };
    } catch (err) {
      if (err instanceof SchemaValidationError) {
        lastSchemaError = err.message;
        console.warn(
          JSON.stringify({
            event: 'LLM_JSON_VALIDATION_FAILED',
            attempt,
            reason: err.message,
          }),
        );
        attempt += 1;
        continue;
      }

      if (!options?.invokeFn && config.bedrockMode === 'auto' && isMissingAwsCredentialsError(err)) {
        console.info(
          JSON.stringify({
            event: 'BEDROCK_LOCAL_FALLBACK',
            reason: 'AWS credentials not configured locally; using grounded local analyzer.',
          }),
        );
        return {
          analysis: runLocalFallbackAnalysis(clauses, detectedLanguage, options?.dealContext),
          provider: 'local_fallback',
          modelId: 'local-rules-v1',
          attempts: 1,
        };
      }

      throw err;
    }
  }

  throw new AnalysisError(
    'INVALID_LLM_JSON',
    `AI model returned invalid JSON after 1 retry (${lastSchemaError}).`,
    502,
  );
}
