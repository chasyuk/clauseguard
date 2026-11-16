import { z } from 'zod';
import { ClauseItem } from '../extraction/clauseSplitter.js';

export const RiskCategorySchema = z.enum([
  'UNLIMITED_LIABILITY',
  'DELAYED_PAYMENT',
  'UNFAIR_IP_TRANSFER',
  'PENALTY_CLAUSES',
  'UNFAIR_NON_COMPETE',
  'OTHER_ASYMMETRIC_RISK',
]);

export const RiskLevelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const FlaggedClauseSchema = z.object({
  clauseNumber: z.string().min(1).max(32),
  category: RiskCategorySchema,
  riskLevel: RiskLevelSchema,
  originalExcerpt: z.string().min(15),
  plainLanguageSummary: z.string().min(20),
  counterClause: z.string().min(20),
});

export const ContractAnalysisResultSchema = z.object({
  contractLanguage: z.enum(['uk', 'en', 'mixed']),
  overallRiskScore: z.number().int().min(0).max(100),
  executiveSummary: z.string().min(20),
  negotiationChecklist: z.array(z.string().min(5)).min(1).max(8),
  flaggedClauses: z.array(FlaggedClauseSchema),
});

export type RiskCategory = z.infer<typeof RiskCategorySchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type FlaggedClause = z.infer<typeof FlaggedClauseSchema>;
export type ContractAnalysisResult = z.infer<typeof ContractAnalysisResultSchema>;

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Strips optional markdown code fences and extracts the top-level JSON object from raw model text.
 */
export function extractRawJsonString(rawOutput: string): string {
  const trimmed = rawOutput.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

/**
 * Splits text into sentences while respecting decimal numbers and common abbreviations,
 * then enforces the v1 requirement of exactly 2 plain-language sentences.
 */
export function enforceTwoSentences(text: string, fallbackSecondSentence: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // Split at sentence-ending punctuation followed by whitespace + uppercase/quote start
  const parts = cleaned
    .split(/(?<=[.!?])\s+(?=[A-ZА-ЯІЇЄҐ"«(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (parts.length === 0) {
    return `${ensureTerminalPeriod(cleaned)} ${ensureTerminalPeriod(fallbackSecondSentence)}`.trim();
  }
  if (parts.length === 1) {
    return `${ensureTerminalPeriod(parts[0])} ${ensureTerminalPeriod(fallbackSecondSentence)}`;
  }
  return `${ensureTerminalPeriod(parts[0])} ${ensureTerminalPeriod(parts[1])}`;
}

function ensureTerminalPeriod(sentence: string): string {
  const s = sentence.trim();
  if (!s) return '';
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

/**
 * Verifies that an excerpt actually appears inside the source contract (anti-hallucination guard).
 */
function isExcerptGroundedInContract(excerpt: string, fullSourceLower: string): boolean {
  const normalizedExcerpt = excerpt.replace(/\s+/g, ' ').trim().toLowerCase();
  if (fullSourceLower.includes(normalizedExcerpt)) {
    return true;
  }
  // Check substring match on a substantial 35-char anchor slice in case of minor quote truncation
  if (normalizedExcerpt.length >= 35) {
    const anchor = normalizedExcerpt.slice(0, 35);
    return fullSourceLower.includes(anchor);
  }
  return false;
}

/**
 * Parses, validates, and grounds raw LLM JSON against ContractAnalysisResultSchema.
 */
export function parseAndValidateAnalysis(
  rawOutput: string,
  sourceClauses: ClauseItem[],
): ContractAnalysisResult {
  const jsonStr = extractRawJsonString(rawOutput);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonStr);
  } catch (err) {
    throw new SchemaValidationError(
      `Invalid JSON syntax: ${err instanceof Error ? err.message : 'parse failed'}`,
    );
  }

  const zodResult = ContractAnalysisResultSchema.safeParse(parsedJson);
  if (!zodResult.success) {
    const issueSummary = zodResult.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ');
    throw new SchemaValidationError(`Schema mismatch: ${issueSummary}`);
  }

  const data = zodResult.data;
  const normalizedFullText = sourceClauses
    .map((c) => c.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // Filter out any hallucinated clauses whose quote doesn't exist in the source document
  const groundedClauses = data.flaggedClauses
    .filter((flag) => isExcerptGroundedInContract(flag.originalExcerpt, normalizedFullText))
    .map((flag) => {
      const fallback =
        data.contractLanguage === 'uk'
          ? 'Цей пункт створює суттєвий комерційний ризик для виконавця.'
          : 'This creates a material commercial risk for the contractor.';
      return {
        ...flag,
        plainLanguageSummary: enforceTwoSentences(flag.plainLanguageSummary, fallback),
      };
    });

  return {
    ...data,
    flaggedClauses: groundedClauses,
  };
}
