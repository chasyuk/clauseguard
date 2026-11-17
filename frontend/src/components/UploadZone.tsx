import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Download, Loader2, Upload } from 'lucide-react';
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
}

const MAX_BYTES = 10 * 1024 * 1024;

function cleanDealContext(ctx: DealContext): DealContext | undefined {
  const cleaned: DealContext = {
    agreedScope: ctx.agreedScope?.trim() || undefined,
    agreedTimeline: ctx.agreedTimeline?.trim() || undefined,
    agreedPayment: ctx.agreedPayment?.trim() || undefined,
    agreedExclusions: ctx.agreedExclusions?.trim() || undefined,
  };
  if (
    !cleaned.agreedScope &&
    !cleaned.agreedTimeline &&
    !cleaned.agreedPayment &&
    !cleaned.agreedExclusions
  ) {
    return undefined;
  }
  return cleaned;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onExtracted }) => {
  const { t, lang } = useLanguage();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleMetadata[]>([]);
  const [showContextFields, setShowContextFields] = useState(true);
  const [dealContext, setDealContext] = useState<DealContext>({
    agreedScope: '',
    agreedTimeline: '',
    agreedPayment: '',
    agreedExclusions: '',
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

  const handleFile = async (file: File) => {
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

    const activeCtx = cleanDealContext(dealContext);
    try {
      await runExtractAndAnalyze(extractContractFile(file, token, activeCtx), activeCtx);
    } catch (err) {
      setErrorMessage(mapErrorMessage(err));
    } finally {
      setLoadingStage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSampleTest = async (filename: string) => {
    setErrorMessage(null);
    const activeCtx = cleanDealContext(dealContext);
    try {
      await runExtractAndAnalyze(extractSampleContract(filename, token, activeCtx), activeCtx);
    } catch (err) {
      setErrorMessage(mapErrorMessage(err));
    } finally {
      setLoadingStage(null);
    }
  };

  const loadPresetContext = (mode: 'en' | 'uk') => {
    if (mode === 'en') {
      setDealContext({
        agreedScope: 'Custom React/Node SaaS portal MVP (Auth, Billing, Admin Console) per approved sprint SOW',
        agreedTimeline: '6-week delivery; 5 business days client review SLA; delays in client assets extend deadline',
        agreedPayment: '$8,500 USD total (40% upfront deposit, Net 14 calendar days unconditionally)',
        agreedExclusions: 'Contractor pre-existing utility libraries, UI templates, and post-launch DevOps support excluded',
      });
    } else {
      setDealContext({
        agreedScope: 'Розробка веб-кабінету та REST API інтеграції за узгодженим ТЗ (2 раунди правок)',
        agreedTimeline: '45 календарних днів від дати передоплати; 5 роб. днів на підписання Акта',
        agreedPayment: 'Передоплата 40%, фінальна оплата 10 банківських днів незалежно від кінцевих клієнтів',
        agreedExclusions: 'Власні бібліотеки Виконавця залишаються за ФОП; IP переходить виключно після повної оплати',
      });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Deal Context Input Panel: Check Written SOW Against Agreed Project Reality */}
      <section className="border border-surface-strong bg-surface-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-strong bg-surface-subtle px-4 py-2.5">
          <div>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-primary">
              {t.dealContext.heading}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowContextFields((p) => !p)}
            className="inline-flex items-center gap-1 border border-surface-border bg-surface-card px-2.5 py-1 font-mono text-[11px] font-medium text-ink-primary hover:border-surface-strong"
          >
            <span>{showContextFields ? t.dealContext.toggleHide : t.dealContext.toggleShow}</span>
            {showContextFields ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {showContextFields && (
          <div className="space-y-4 p-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <p className="text-xs leading-relaxed text-ink-secondary">{t.dealContext.subheading}</p>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => loadPresetContext('en')}
                  className="border border-surface-border bg-surface-bg px-2.5 py-1 font-mono text-[11px] font-medium text-ink-primary hover:border-brand hover:text-brand"
                >
                  {t.dealContext.presetEnBtn}
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetContext('uk')}
                  className="border border-surface-border bg-surface-bg px-2.5 py-1 font-mono text-[11px] font-medium text-ink-primary hover:border-brand hover:text-brand"
                >
                  {t.dealContext.presetUkBtn}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDealContext({
                      agreedScope: '',
                      agreedTimeline: '',
                      agreedPayment: '',
                      agreedExclusions: '',
                    })
                  }
                  className="border border-surface-border px-2.5 py-1 font-mono text-[11px] text-ink-muted hover:text-ink-primary"
                >
                  {t.dealContext.clearBtn}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t.dealContext.scopeLabel}
                </label>
                <input
                  type="text"
                  value={dealContext.agreedScope ?? ''}
                  onChange={(e) =>
                    setDealContext((prev) => ({ ...prev, agreedScope: e.target.value }))
                  }
                  placeholder={t.dealContext.scopePlaceholder}
                  className="mt-1 w-full border border-surface-border bg-surface-bg px-3 py-2 text-xs text-ink-primary focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t.dealContext.timelineLabel}
                </label>
                <input
                  type="text"
                  value={dealContext.agreedTimeline ?? ''}
                  onChange={(e) =>
                    setDealContext((prev) => ({ ...prev, agreedTimeline: e.target.value }))
                  }
                  placeholder={t.dealContext.timelinePlaceholder}
                  className="mt-1 w-full border border-surface-border bg-surface-bg px-3 py-2 text-xs text-ink-primary focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t.dealContext.paymentLabel}
                </label>
                <input
                  type="text"
                  value={dealContext.agreedPayment ?? ''}
                  onChange={(e) =>
                    setDealContext((prev) => ({ ...prev, agreedPayment: e.target.value }))
                  }
                  placeholder={t.dealContext.paymentPlaceholder}
                  className="mt-1 w-full border border-surface-border bg-surface-bg px-3 py-2 text-xs text-ink-primary focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t.dealContext.exclusionsLabel}
                </label>
                <input
                  type="text"
                  value={dealContext.agreedExclusions ?? ''}
                  onChange={(e) =>
                    setDealContext((prev) => ({ ...prev, agreedExclusions: e.target.value }))
                  }
                  placeholder={t.dealContext.exclusionsPlaceholder}
                  className="mt-1 w-full border border-surface-border bg-surface-bg px-3 py-2 text-xs text-ink-primary focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {!cleanDealContext(dealContext) && (
              <p className="border-l-2 border-brand bg-brand-subtle/40 px-3 py-1.5 text-[11px] text-ink-secondary">
                {t.dealContext.sampleContextActive}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left 6 cols: Primary Drag-and-Drop Box */}
      <div className="flex flex-col border border-surface-strong bg-surface-card lg:col-span-6">
        <div className="border-b border-surface-strong bg-surface-subtle px-4 py-2.5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-primary">
            {t.upload.sectionTitle}
          </h2>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div
            role="button"
            tabIndex={0}
            aria-label={t.upload.dropzoneTitle}
            onClick={() => !loadingStage && fileInputRef.current?.click()}
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
            className={`flex flex-1 cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-10 text-center transition-colors ${
              isDragging
                ? 'border-brand bg-brand-subtle'
                : 'border-surface-border bg-surface-bg hover:border-brand hover:bg-brand-subtle/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />

            {loadingStage ? (
              <div className="flex items-center gap-2.5 text-sm font-medium text-brand">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>{loadingStage}</span>
              </div>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center border border-surface-strong bg-brand text-white">
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-semibold text-ink-primary">
                  {t.upload.dropzoneTitle}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  {t.upload.dropzoneHint}
                </p>
              </>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 border border-risk-highBorder bg-risk-highBg px-3.5 py-3 text-xs leading-relaxed text-risk-highText"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right 6 cols: Human-Friendly Sample Contracts */}
      <div className="flex flex-col border border-surface-strong bg-surface-card lg:col-span-6">
        <div className="border-b border-surface-strong bg-surface-subtle px-4 py-2.5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-primary">
            {t.upload.samplesHeading}
          </h2>
        </div>

        <div className="flex-1 divide-y divide-surface-border">
          {samples.map((sample) => {
            const isScannedTest = sample.expectedOutcome === 'scanned_error';
            return (
              <div
                key={sample.filename}
                className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-primary">
                      {lang === 'uk' ? sample.labelUk : sample.labelEn}
                    </span>
                    <span className="border border-surface-border bg-surface-bg px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-muted">
                      {sample.filename.endsWith('.pdf') ? 'PDF' : 'DOCX'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {lang === 'uk' ? sample.descriptionUk : sample.descriptionEn}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={Boolean(loadingStage)}
                    onClick={() => void handleSampleTest(sample.filename)}
                    className={`border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      isScannedTest
                        ? 'border-risk-medBorder bg-risk-medBg text-risk-medText hover:bg-amber-100'
                        : 'border-brand bg-brand text-white hover:bg-brand-hover'
                    }`}
                  >
                    {isScannedTest ? t.upload.runTestError : t.upload.runTest}
                  </button>
                  <a
                    href={getSampleDownloadUrl(sample.filename)}
                    download={sample.filename}
                    title={t.upload.downloadSample}
                    aria-label={`${t.upload.downloadSample} ${sample.filename}`}
                    className="inline-flex items-center border border-surface-border bg-surface-bg p-1.5 text-ink-secondary transition-colors hover:border-surface-strong hover:text-ink-primary"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};
