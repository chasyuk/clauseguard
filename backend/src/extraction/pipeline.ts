import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { AuditRecord, saveAudit } from '../storage/auditStore.js';
import { storeEncryptedUploadIfConfigured } from '../storage/s3Client.js';
import { detectContractLanguage, splitIntoClauses } from './clauseSplitter.js';
import { extractDocumentText } from './extractText.js';
import { validateUploadedFile } from './fileValidator.js';

/**
 * Runs Phase 1 ingestion pipeline: file validation -> text extraction -> language detection -> clause splitting.
 * Privacy invariant: never logs document text or clauses.
 */
export async function processContractUpload(
  fileName: string,
  buffer: Buffer,
  userId: string | null = null,
): Promise<AuditRecord> {
  const startMs = Date.now();
  const validated = validateUploadedFile(fileName, buffer);
  const extracted = await extractDocumentText(validated.buffer, validated.extension);
  const language = detectContractLanguage(extracted.text);
  const clauses = splitIntoClauses(extracted.text);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.auditTtlHours * 60 * 60 * 1000);
  const auditId = uuidv4();

  const record: AuditRecord = {
    auditId,
    userId,
    fileName: validated.originalName,
    extension: validated.extension,
    fileSizeBytes: validated.sizeBytes,
    pageCount: extracted.pageCount,
    wordCount: extracted.wordCount,
    language,
    clauses,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ttlEpochSeconds: Math.floor(expiresAt.getTime() / 1000),
  };

  await storeEncryptedUploadIfConfigured(auditId, validated.extension, validated.buffer);
  await saveAudit(record);

  // Privacy-safe structured log: metadata only, zero contract text
  console.info(
    JSON.stringify({
      event: 'CONTRACT_EXTRACTED',
      auditId,
      extension: validated.extension,
      sizeBytes: validated.sizeBytes,
      pageCount: extracted.pageCount,
      clauseCount: clauses.length,
      language,
      durationMs: Date.now() - startMs,
    }),
  );

  return record;
}
