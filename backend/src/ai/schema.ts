import { z } from 'zod';
import { ClauseItem } from '../extraction/clauseSplitter.js';
import { evaluateDealContextDiscrepancies } from './localAnalyzer.js';

export const RiskCategorySchema = z.enum([
  'UNLIMITED_LIABILITY',
  'DELAYED_PAYMENT',
  'UNFAIR_IP_TRANSFER',
  'PENALTY_CLAUSES',
  'UNFAIR_NON_COMPETE',
  'OTHER_ASYMMETRIC_RISK',
]);

export const RiskLevelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const DealContextSchema = z.object({
  agreedScope: z.string().optional(),
  agreedTimeline: z.string().optional(),
  agreedPayment: z.string().optional(),
  agreedExclusions: z.string().optional(),
  rawNotes: z.string().optional(),
});

export const ContextDiscrepancySchema = z.object({
  dimension: z.enum([
    'SCOPE_AND_DELIVERABLES',
    'TIMELINE_AND_DEADLINES',
    'PAYMENT_AND_MILESTONES',
    'REVISIONS_AND_ACCEPTANCE',
    'EXCLUSIONS_AND_IP',
  ]),
  status: z.enum(['MISMATCH', 'OMITTED_IN_CONTRACT', 'MATCH']),
  agreedTerm: z.string().min(2),
  contractTerm: z.string().min(2),
  riskImpact: z.string().min(3),
  suggestedAmendment: z.string().min(3),
});

export const FlaggedClauseSchema = z.object({
  clauseNumber: z.string().min(1).max(32),
  category: RiskCategorySchema,
  riskLevel: RiskLevelSchema,
  originalExcerpt: z.string().min(15),
  plainLanguageSummary: z.string().min(20),
  counterClause: z.string().min(20),
  vettedClauseId: z.string().optional(),
});

export const ContractAnalysisResultSchema = z.object({
  contractLanguage: z.enum(['uk', 'en', 'mixed']),
  overallRiskScore: z.number().int().min(0).max(100),
  executiveSummary: z.string().min(20),
  negotiationChecklist: z.array(z.string().min(5)).min(1).max(8),
  flaggedClauses: z.array(FlaggedClauseSchema),
  contextAlignmentScore: z.number().int().min(0).max(100).optional(),
  contextDiscrepancies: z.array(ContextDiscrepancySchema).optional().default([]),
});

export type RiskCategory = z.infer<typeof RiskCategorySchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type DealContext = z.infer<typeof DealContextSchema>;
export type ContextDiscrepancy = z.infer<typeof ContextDiscrepancySchema>;
export type FlaggedClause = z.infer<typeof FlaggedClauseSchema>;
export type ContractAnalysisResult = z.infer<typeof ContractAnalysisResultSchema>;

export const CATEGORY_TO_VETTED_CLAUSE_ID: Record<RiskCategory, string> = {
  UNLIMITED_LIABILITY: 'VETTED-LIAB-CAP3M-01',
  DELAYED_PAYMENT: 'VETTED-PAY-MILESTONE-01',
  UNFAIR_IP_TRANSFER: 'VETTED-IP-UPON-PAYMENT-01',
  PENALTY_CLAUSES: 'VETTED-ACC-DEEMED-01',
  UNFAIR_NON_COMPETE: 'VETTED-NDA-2YR-01',
  OTHER_ASYMMETRIC_RISK: 'VETTED-TERM-14D-01',
};

export function hasDealContext(ctx?: DealContext): boolean {
  if (!ctx) return false;
  return Boolean(
    ctx.agreedScope?.trim() ||
      ctx.agreedTimeline?.trim() ||
      ctx.agreedPayment?.trim() ||
      ctx.agreedExclusions?.trim() ||
      ctx.rawNotes?.trim(),
  );
}

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
  dealContext?: DealContext,
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

  if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
    const candidate = parsedJson as Record<string, unknown>;
    if (Array.isArray(candidate.contextDiscrepancies)) {
      candidate.contextDiscrepancies = candidate.contextDiscrepancies.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const obj = entry as Record<string, unknown>;
        const normalized = {
          dimension: obj.dimension,
          status: obj.status,
          agreedTerm: obj.agreedTerm,
          contractTerm: obj.contractTerm,
          riskImpact:
            typeof obj.riskImpact === 'string' && obj.riskImpact.trim().length >= 3
              ? obj.riskImpact
              : 'Potential divergence between agreed expectations and written terms.',
          suggestedAmendment:
            typeof obj.suggestedAmendment === 'string' && obj.suggestedAmendment.trim().length >= 3
              ? obj.suggestedAmendment
              : 'Align written SOW wording explicitly with the agreed deal context.',
        };
        const check = ContextDiscrepancySchema.safeParse(normalized);
        return check.success ? [check.data] : [];
      });
    }
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
        vettedClauseId: flag.vettedClauseId || CATEGORY_TO_VETTED_CLAUSE_ID[flag.category],
        plainLanguageSummary: enforceTwoSentences(flag.plainLanguageSummary, fallback),
      };
    });

  let contextDiscrepancies = data.contextDiscrepancies ?? [];
  let contextAlignmentScore = data.contextAlignmentScore;

  if (hasDealContext(dealContext) && contextDiscrepancies.length === 0) {
    const reconciled = evaluateDealContextDiscrepancies(
      sourceClauses,
      dealContext,
      data.contractLanguage,
    );
    contextDiscrepancies = reconciled.contextDiscrepancies;
    contextAlignmentScore = reconciled.contextAlignmentScore;
  } else if (hasDealContext(dealContext) && contextAlignmentScore === undefined) {
    const mismatches = contextDiscrepancies.filter((d) => d.status === 'MISMATCH').length;
    const omitted = contextDiscrepancies.filter((d) => d.status === 'OMITTED_IN_CONTRACT').length;
    contextAlignmentScore = Math.max(5, Math.min(100, 100 - mismatches * 22 - omitted * 14));
  }

  return {
    ...data,
    flaggedClauses: groundedClauses,
    contextAlignmentScore,
    contextDiscrepancies,
  };
}
