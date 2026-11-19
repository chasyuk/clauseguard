export type ContractLanguage = 'uk' | 'en' | 'mixed';

export type RiskCategory =
  | 'UNLIMITED_LIABILITY'
  | 'DELAYED_PAYMENT'
  | 'UNFAIR_IP_TRANSFER'
  | 'PENALTY_CLAUSES'
  | 'UNFAIR_NON_COMPETE'
  | 'OTHER_ASYMMETRIC_RISK';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type DiscrepancyDimension =
  | 'SCOPE_AND_DELIVERABLES'
  | 'TIMELINE_AND_DEADLINES'
  | 'PAYMENT_AND_MILESTONES'
  | 'REVISIONS_AND_ACCEPTANCE'
  | 'EXCLUSIONS_AND_IP';

export type DiscrepancyStatus = 'MISMATCH' | 'OMITTED_IN_CONTRACT' | 'MATCH';

export interface DealContext {
  agreedScope?: string;
  agreedTimeline?: string;
  agreedPayment?: string;
  agreedExclusions?: string;
  rawNotes?: string;
}

export interface ContextDiscrepancy {
  dimension: DiscrepancyDimension;
  status: DiscrepancyStatus;
  agreedTerm: string;
  contractTerm: string;
  riskImpact: string;
  suggestedAmendment: string;
}

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
  vettedClauseId?: string;
}

export interface ContractAnalysisResult {
  contractLanguage: ContractLanguage;
  overallRiskScore: number;
  executiveSummary: string;
  negotiationChecklist: string[];
  flaggedClauses: FlaggedClause[];
  contextAlignmentScore?: number;
  contextDiscrepancies?: ContextDiscrepancy[];
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
  dealContext?: DealContext;
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
  defaultDealContext?: DealContext;
}

export type ClauseModuleType =
  | 'SCOPE_AND_DELIVERABLES'
  | 'PAYMENT_AND_CURRENCY'
  | 'ACCEPTANCE_AND_REVISIONS'
  | 'CHANGE_CONTROL_OUT_OF_SCOPE'
  | 'IP_AND_BACKGROUND_TOOLS'
  | 'LIABILITY_AND_INDEMNITY'
  | 'CONFIDENTIALITY_AND_PORTFOLIO'
  | 'TERMINATION_AND_FOP_COMPLIANCE';

export type ClausePosture = 'CONTRACTOR_PROTECTIVE' | 'BALANCED';
export type BuilderLanguage = 'en' | 'uk' | 'bilingual';

export interface ContractParameters {
  clientName: string;
  contractorName: string;
  projectTitle: string;
  projectScope: string;
  deliverablesList: string;
  exclusions: string;
  pricingModel: 'FIXED_PRICE' | 'TIME_AND_MATERIALS';
  totalFee: string;
  currency: string;
  hourlyRate: string;
  upfrontPercent: number;
  paymentWindowDays: number;
  acceptanceDays: number;
  revisionRounds: number;
  deadlineDate: string;
  liabilityCapMonths: number;
  governingLaw: string;
  clientAddress?: string;
  contractorAddress?: string;
  clientTaxId?: string;
  contractorTaxId?: string;
  clientIban?: string;
  contractorIban?: string;
  clientBank?: string;
  contractorBank?: string;
}

export interface VettedClauseVariant {
  clauseId: string;
  module: ClauseModuleType;
  posture: ClausePosture;
  sectionNumber: string;
  titleEn: string;
  titleUk: string;
  rationaleEn: string;
  rationaleUk: string;
  templateEn: string;
  templateUk: string;
}

export interface ContractTemplateDefinition {
  templateId: string;
  titleEn: string;
  titleUk: string;
  subtitleEn: string;
  subtitleUk: string;
  idealForEn: string;
  idealForUk: string;
  defaultPricingModel: 'FIXED_PRICE' | 'TIME_AND_MATERIALS';
  modules: ClauseModuleType[];
  defaultParameters: Partial<ContractParameters>;
}

export interface BuilderScenarioPreset {
  id: string;
  labelEn: string;
  labelUk: string;
  templateId: string;
  plainTextEn: string;
  plainTextUk: string;
}

export interface BuilderCatalogResponse {
  templates: ContractTemplateDefinition[];
  clauses: VettedClauseVariant[];
  moduleTitles: Record<ClauseModuleType, { en: string; uk: string }>;
  scenarios: BuilderScenarioPreset[];
}

export interface OmittedTermWarning {
  field: string;
  titleEn: string;
  titleUk: string;
  reasonEn: string;
  reasonUk: string;
  appliedDefaultClauseId: string;
}

export interface ClauseAlternativeOption {
  clauseId: string;
  posture: ClausePosture;
  title: string;
  rationale: string;
  renderedText: string;
}

export interface AssembledClauseSection {
  module: ClauseModuleType;
  moduleTitle: string;
  selectedClauseId: string;
  posture: ClausePosture;
  title: string;
  rationale: string;
  renderedText: string;
  alternatives: ClauseAlternativeOption[];
}

export interface AssembledContractResult {
  templateId: string;
  templateTitle: string;
  contractLanguage: BuilderLanguage;
  posture: ClausePosture;
  provider: 'bedrock' | 'local_parser';
  modelId: string;
  parameters: ContractParameters;
  omittedWarnings: OmittedTermWarning[];
  sections: AssembledClauseSection[];
  fullContractText: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  plan?: 'free' | 'pro' | 'single';
  auditsUsed?: number;
  auditsLimit?: number;
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
