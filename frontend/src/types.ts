export type ContractLanguage = 'uk' | 'en' | 'mixed';

export type RiskCategory =
  | 'UNLIMITED_LIABILITY'
  | 'DELAYED_PAYMENT'
  | 'UNFAIR_IP_TRANSFER'
  | 'PENALTY_CLAUSES'
  | 'UNFAIR_NON_COMPETE'
  | 'OTHER_ASYMMETRIC_RISK';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ClauseItem {
  id: string;
  clauseNumber: string;
  title: string;
  text: string;
  charCount: number;
}

export interface FlaggedClause {
  clauseNumber: string;
  category: RiskCategory;
  riskLevel: RiskLevel;
  originalExcerpt: string;
  plainLanguageSummary: string;
  counterClause: string;
}

export interface ContractAnalysisResult {
  contractLanguage: ContractLanguage;
  overallRiskScore: number;
  executiveSummary: string;
  negotiationChecklist: string[];
  flaggedClauses: FlaggedClause[];
}

export interface AnalysisMeta {
  provider: 'bedrock' | 'local_fallback';
  modelId: string;
  attempts: number;
  analyzedAt: string;
  durationMs: number;
  riskCounts: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface AuditExtractionRecord {
  auditId: string;
  userId: string | null;
  fileName: string;
  extension: 'pdf' | 'docx';
  fileSizeBytes: number;
  pageCount: number;
  wordCount: number;
  language: ContractLanguage;
  clauses: ClauseItem[];
  createdAt: string;
  expiresAt: string;
  analysis?: ContractAnalysisResult;
  analysisMeta?: AnalysisMeta;
}

export interface SampleMetadata {
  filename: string;
  labelEn: string;
  labelUk: string;
  descriptionEn: string;
  descriptionUk: string;
  expectedOutcome: 'risky' | 'scanned_error';
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface AuditSummaryItem {
  auditId: string;
  fileName: string;
  language: ContractLanguage;
  pageCount: number;
  createdAt: string;
  expiresAt: string;
  overallRiskScore: number | null;
  riskCounts: {
    high: number;
    medium: number;
    low: number;
  } | null;
}

export interface ApiErrorPayload {
  error: string;
  message: string;
  details?: Record<string, string | number>;
}
