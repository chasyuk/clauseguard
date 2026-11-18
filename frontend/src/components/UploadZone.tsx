import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileText,
  Lock,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import {
  analyzeAudit,
  ApiClientError,
  extractContractFile,
  extractSampleContract,
  fetchSamples,
  getSampleDownloadUrl,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AuditExtractionRecord, DealContext, SampleMetadata } from '../types';

interface UploadZoneProps {
  onExtracted: (record: AuditExtractionRecord) => void;
  auditsCount?: number;
  onOpenPricing?: (reason: 'audit_limit') => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

type UserRole = 'contractor' | 'client';
type DocType = 'auto' | 'MSA' | 'NDA' | 'SOW';

function buildDealContext(
  ctx: DealContext,
  role: UserRole,
  docType: DocType,
): DealContext | undefined {
  const notes = ctx.rawNotes?.trim();
  if (!notes && role === 'contractor' && docType === 'auto') return undefined;
  const metaParts: string[] = [];
  metaParts.push(`Reviewing party: ${role === 'contractor' ? 'Contractor / FOP' : 'Client'}`);
  if (docType !== 'auto') metaParts.push(`Document type: ${docType}`);
  const combined = notes ? `${metaParts.join(' | ')}\n${notes}` : metaParts.join(' | ');
  return { rawNotes: combined };
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onExtracted,
  auditsCount = 0,
  onOpenPricing,
}) => {
  const freeAuditsLimit = 3;
  const isLimitReached = auditsCount >= freeAuditsLimit;
  const { t, lang } = useLanguage();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUk = lang === 'uk';

  const [sourceTab, setSourceTab] = useState<'upload' | 'samples'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('contractor');
  const [docType, setDocType] = useState<DocType>('auto');
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleMetadata[]>([]);
  const [dealContext] = useState<DealContext>({
    rawNotes: '',
  });

  useEffect(() => {
    fetchSamples()
      .then(setSamples)
      .catch(() => {
        // Non-blocking when backend is offline
      });
  }, []);

  const mapErrorMessage = (err: unknown): string => {
    if (err instanceof ApiClientError) {
      const knownMap = t.upload.errors as Record<string, string>;
      return knownMap[err.code] || err.message || t.upload.errors.GENERIC;
    }
    return t.upload.errors.GENERIC;
  };

  const runExtractAndAnalyze = async (
    extractPromise: Promise<AuditExtractionRecord>,
    activeContext?: DealContext,
  ) => {
    setLoadingStage(t.upload.processingReading);
    const extracted = await extractPromise;

    setLoadingStage(t.upload.processingAnalyzing);
    const timer = window.setTimeout(() => {
      setLoadingStage(t.upload.processingCounterClauses);
    }, 650);

    try {
      const analyzed = await analyzeAudit(extracted.auditId, token, activeContext);
      onExtracted(analyzed);
    } finally {
      window.clearTimeout(timer);
    }
  };

  const validateAndStageFile = (file: File) => {
    setErrorMessage(null);
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) {
      setErrorMessage(t.upload.errors.UNSUPPORTED_FILE_TYPE);
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrorMessage(t.upload.errors.FILE_TOO_LARGE);
      return;
    }
    setSelectedFile(file);
  };

  const handleAuditSelectedFile = async () => {
    if (isLimitReached) {
      onOpenPricing?.('audit_limit');
      return;
    }
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setErrorMessage(null);
    const activeCtx = buildDealContext(dealContext, userRole, docType);
    try {
      await runExtractAndAnalyze(extractContractFile(selectedFile, token, activeCtx), activeCtx);
    } catch (err) {
      setErrorMessage(mapErrorMessage(err));
    } finally {
      setLoadingStage(null);
    }
  };

  const handleSampleTest = async (filename: string) => {
    if (isLimitReached) {
      onOpenPricing?.('audit_limit');
      return;
    }
    setErrorMessage(null);
    const activeCtx = buildDealContext(dealContext, userRole, docType);
    try {
      await runExtractAndAnalyze(extractSampleContract(filename, token, activeCtx), activeCtx);
    } catch (err) {
      setErrorMessage(mapErrorMessage(err));
    } finally {
      setLoadingStage(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLimitReached) {
      onOpenPricing?.('audit_limit');
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndStageFile(file);
  };

  return (
    <div className="space-y-5 text-ink-primary">
      {/* Free Audit Counter or Limit Banner */}
      {isLimitReached ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-amber-700" />
              <span className="font-bold">
                {isUk ? 'Використано 3 з 3 безкоштовних перевірок' : '3 of 3 free audits used'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenPricing?.('audit_limit')}
              className="rounded-lg bg-forest px-3 py-1 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-forest-soft"
            >
              {isUk ? 'Перейти на Pro' : 'Upgrade to Pro'}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-amber-900/80">
            {isUk
              ? 'На вашому акаунті досягнуто ліміту безкоштовних перевірок. Підключіть Pro для безліміту або придбайте разовий пакет.'
              : 'Free audit limit reached on this account. Upgrade to Pro for unlimited scans.'}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-paper-border bg-paper/60 px-3.5 py-1.5 text-xs">
          <span className="text-ink-secondary">
            {isUk ? 'Безкоштовний тариф на акаунт:' : 'Free tier plan:'}
          </span>
          <span className="font-mono text-xs font-semibold text-forest">
            {isUk
              ? `Залишилось ${freeAuditsLimit - auditsCount} з ${freeAuditsLimit} перевірок`
              : `${freeAuditsLimit - auditsCount} of ${freeAuditsLimit} audits remaining`}
          </span>
        </div>
      )}
      {/* Step 1 Header + Source Switch */}
      <div>
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {isUk ? '1 · ДОДАЙТЕ ДОГОВІР' : '1 · ADD YOUR CONTRACT'}
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSourceTab('upload')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              sourceTab === 'upload'
                ? 'bg-forest text-white'
                : 'border border-paper-border bg-white text-ink-secondary hover:border-paper-strong'
            }`}
          >
            {isUk ? 'Завантажити файл' : 'Upload file'}
          </button>
          <button
            type="button"
            onClick={() => setSourceTab('samples')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              sourceTab === 'samples'
                ? 'bg-forest text-white'
                : 'border border-paper-border bg-white text-ink-secondary hover:border-paper-strong'
            }`}
          >
            {isUk ? 'Тестові зразки' : 'Sample contracts'}
          </button>
        </div>
      </div>

      {sourceTab === 'upload' ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={t.upload.dropzoneTitle}
          onClick={() => {
            if (isLimitReached) {
              onOpenPricing?.('audit_limit');
              return;
            }
            if (!loadingStage) fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !loadingStage) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-5 py-7 text-center transition-colors ${
            isDragging
              ? 'border-signal bg-signal-soft'
              : 'border-paper-strong bg-paper/70 hover:border-forest hover:bg-paper-soft'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) validateAndStageFile(file);
            }}
          />

          {loadingStage ? (
            <div className="flex items-center gap-2.5 text-sm font-semibold text-signal">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>{loadingStage}</span>
            </div>
          ) : selectedFile ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-md border border-paper-border bg-white px-3.5 py-2.5 text-left">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-primary">
                    {selectedFile.name}
                  </p>
                  <p className="font-mono text-[11px] text-ink-muted">
                    {(selectedFile.size / 1024).toFixed(1)} KB ·{' '}
                    {isUk ? 'Готово до перевірки' : 'Ready to audit'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                aria-label="Remove file"
                className="rounded-md p-1 text-ink-muted hover:bg-paper-soft hover:text-ink-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-5 w-5 text-ink-secondary" aria-hidden="true" />
              <p className="mt-2.5 text-sm font-semibold text-ink-primary">
                {isUk ? 'Перетягніть договір сюди' : 'Drop a contract here'}
              </p>
              <p className="mt-1 text-xs text-ink-muted">PDF {isUk ? 'або' : 'or'} DOCX</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="rounded border border-paper-strong bg-paper-soft px-2.5 py-1 font-medium text-ink-primary">
                  {isUk ? 'Обрати файл…' : 'Browse...'}
                </span>
                <span className="text-ink-muted">
                  {isUk ? 'Файл не обрано.' : 'No file selected.'}
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="divide-y divide-paper-border rounded-lg border border-paper-border bg-paper/60">
          {samples.map((sample) => {
            const isScannedTest = sample.expectedOutcome === 'scanned_error';
            return (
              <div
                key={sample.filename}
                className="flex flex-col justify-between gap-2.5 px-3.5 py-2.5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-ink-primary">
                      {isUk ? sample.labelUk : sample.labelEn}
                    </span>
                    <span className="rounded border border-paper-border bg-white px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-muted">
                      {sample.filename.endsWith('.pdf') ? 'PDF' : 'DOCX'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-secondary">
                    {isUk ? sample.descriptionUk : sample.descriptionEn}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={Boolean(loadingStage)}
                    onClick={() => void handleSampleTest(sample.filename)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                      isScannedTest
                        ? 'border border-risk-medBorder bg-risk-medBg text-risk-medText'
                        : 'bg-forest text-white hover:bg-forest-soft'
                    }`}
                  >
                    {isScannedTest ? t.upload.runTestError : t.upload.runTest}
                  </button>
                  <a
                    href={getSampleDownloadUrl(sample.filename)}
                    download={sample.filename}
                    title={t.upload.downloadSample}
                    aria-label={`${t.upload.downloadSample} ${sample.filename}`}
                    className="inline-flex items-center rounded-full border border-paper-border bg-white p-1.5 text-ink-secondary hover:border-paper-strong hover:text-ink-primary"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-risk-highBorder bg-risk-highBg px-3.5 py-2.5 text-xs leading-relaxed text-risk-highText"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 2: Role */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="w-24 shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {isUk ? '2 · Я —' : '2 · I AM THE'}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['contractor', 'client'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setUserRole(role)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                userRole === role
                  ? 'bg-forest text-white'
                  : 'border border-paper-border bg-white text-ink-secondary hover:border-paper-strong'
              }`}
            >
              {role === 'contractor'
                ? isUk
                  ? 'Виконавець / ФОП'
                  : 'Contractor'
                : isUk
                  ? 'Замовник'
                  : 'Client'}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Contract Type */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="w-24 shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {isUk ? '3 · ТИП' : '3 · TYPE'}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['auto', isUk ? 'Автовизначення' : 'Auto-detect'],
              ['MSA', 'MSA'],
              ['NDA', 'NDA'],
              ['SOW', 'SOW'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDocType(id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                docType === id
                  ? 'bg-forest text-white'
                  : 'border border-paper-border bg-white text-ink-secondary hover:border-paper-strong'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Signal Orange CTA */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          disabled={Boolean(loadingStage)}
          onClick={() => void handleAuditSelectedFile()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-signal px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-signal-hover disabled:opacity-60"
        >
          {loadingStage ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{isUk ? 'Аналізуємо…' : 'Auditing…'}</span>
            </>
          ) : (
            <span>{isUk ? 'Перевірити договір' : 'Audit my contract'}</span>
          )}
        </button>
        <span className="text-xs text-ink-muted">
          {isUk ? 'Безкоштовно. Видаляється за 24 год.' : 'Free. Deleted after 24 hours.'}
        </span>
      </div>
    </div>
  );
};
