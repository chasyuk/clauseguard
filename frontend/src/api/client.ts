import {
  ApiErrorPayload,
  AssembledContractResult,
  AuditExtractionRecord,
  AuditSummaryItem,
  BuilderCatalogResponse,
  BuilderLanguage,
  ClauseModuleType,
  ClausePosture,
  ContractParameters,
  DealContext,
  PublicUser,
  SampleMetadata,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let payload: ApiErrorPayload = {
      error: 'GENERIC',
      message: `Request failed with status ${res.status}`,
    };
    try {
      payload = (await res.json()) as ApiErrorPayload;
    } catch {
      // Fallback to HTTP status message
    }
    throw new ApiClientError(payload.error || 'GENERIC', payload.message, res.status);
  }
  return (await res.json()) as T;
}

export function getSampleDownloadUrl(filename: string): string {
  return `${API_BASE}/api/samples/${encodeURIComponent(filename)}`;
}

export async function fetchSamples(): Promise<SampleMetadata[]> {
  const res = await fetch(`${API_BASE}/api/samples`);
  const data = await handleResponse<{ samples: SampleMetadata[] }>(res);
  return data.samples;
}

export async function extractContractFile(
  file: File,
  token: string | null,
  dealContext?: DealContext,
): Promise<AuditExtractionRecord> {
  const formData = new FormData();
  formData.append('file', file);
  if (dealContext) {
    formData.append('dealContext', JSON.stringify(dealContext));
  }
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/extract`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse<AuditExtractionRecord>(res);
}

export async function extractSampleContract(
  sampleFilename: string,
  token: string | null,
  dealContext?: DealContext,
): Promise<AuditExtractionRecord> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/extract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sampleFilename, dealContext }),
  });
  return handleResponse<AuditExtractionRecord>(res);
}

export async function analyzeAudit(
  auditId: string,
  token: string | null,
  dealContext?: DealContext,
): Promise<AuditExtractionRecord> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/audits/${encodeURIComponent(auditId)}/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ dealContext }),
  });
  return handleResponse<AuditExtractionRecord>(res);
}

// --- Phase 5: Vetted Clause Registry & AI Contract Builder ---

export async function fetchBuilderCatalog(): Promise<BuilderCatalogResponse> {
  const res = await fetch(`${API_BASE}/api/builder/templates`);
  return handleResponse<BuilderCatalogResponse>(res);
}

export interface AssembleContractPayload {
  plainTextRequirements: string;
  templateId?: string;
  contractLanguage?: BuilderLanguage;
  posture?: ClausePosture;
  selectedClauseIds?: Partial<Record<ClauseModuleType, string>>;
  parameterOverrides?: Partial<ContractParameters>;
}

export async function assembleContract(
  payload: AssembleContractPayload,
): Promise<AssembledContractResult> {
  const res = await fetch(`${API_BASE}/api/builder/assemble`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<AssembledContractResult>(res);
}

async function triggerBinaryDownload(
  endpoint: string,
  assembled: AssembledContractResult,
  fileName: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assembled),
  });
  if (!res.ok) {
    throw new ApiClientError('EXPORT_ERROR', `Failed to export ${fileName}`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportAssembledContractDocx(
  assembled: AssembledContractResult,
): Promise<void> {
  return triggerBinaryDownload(
    '/api/builder/export/docx',
    assembled,
    `ClauseGuard_${assembled.templateId}.docx`,
  );
}

export async function exportAssembledContractPdf(
  assembled: AssembledContractResult,
): Promise<void> {
  return triggerBinaryDownload(
    '/api/builder/export/pdf',
    assembled,
    `ClauseGuard_${assembled.templateId}.pdf`,
  );
}

export async function fetchAuditById(auditId: string): Promise<AuditExtractionRecord> {
  const res = await fetch(`${API_BASE}/api/audits/${encodeURIComponent(auditId)}`);
  return handleResponse<AuditExtractionRecord>(res);
}

export async function fetchMyAudits(token: string): Promise<AuditSummaryItem[]> {
  const res = await fetch(`${API_BASE}/api/my-audits`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleResponse<{ audits: AuditSummaryItem[] }>(res);
  return data.audits;
}

export async function downloadExecutivePdf(
  auditId: string,
  fileName: string,
  lang: 'en' | 'uk',
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/audits/${encodeURIComponent(auditId)}/pdf?lang=${lang}`,
  );
  if (!res.ok) {
    throw new ApiClientError('PDF_ERROR', 'Failed to generate Executive Summary PDF.', res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeBase = fileName.replace(/\.[^.]+$/, '') || 'Audit';
  link.href = url;
  link.download = `ClauseGuard_${safeBase}_Summary.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface DonationReceipt {
  donationId: string;
  gateway: string;
  status: 'completed' | 'redirect_required';
  amountUah: number;
  currency: 'UAH';
  checkoutUrl?: string;
}

export async function submitDonation(
  amountUah: number,
  gateway: 'mock' | 'monobank_jar' | 'wayforpay' | 'liqpay',
  auditId?: string,
): Promise<DonationReceipt> {
  const res = await fetch(`${API_BASE}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountUah, gateway, auditId }),
  });
  return handleResponse<DonationReceipt>(res);
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<{ token: string; user: PublicUser }> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse<{ token: string; user: PublicUser }>(res);
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ token: string; user: PublicUser }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ token: string; user: PublicUser }>(res);
}

export async function fetchMe(token: string): Promise<{ user: PublicUser }> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ user: PublicUser }>(res);
}
