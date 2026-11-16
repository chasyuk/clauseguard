import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Loader2, Upload } from 'lucide-react';
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
import { AuditExtractionRecord, SampleMetadata } from '../types';

interface UploadZoneProps {
  onExtracted: (record: AuditExtractionRecord) => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

export const UploadZone: React.FC<UploadZoneProps> = ({ onExtracted }) => {
  const { t, lang } = useLanguage();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleMetadata[]>([]);

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

  const runExtractAndAnalyze = async (extractPromise: Promise<AuditExtractionRecord>) => {
    setLoadingStage(t.upload.processingReading);
    const extracted = await extractPromise;

    setLoadingStage(t.upload.processingAnalyzing);
    const timer = window.setTimeout(() => {
      setLoadingStage(t.upload.processingCounterClauses);
    }, 650);

    try {
      const analyzed = await analyzeAudit(extracted.auditId, token);
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

    try {
      await runExtractAndAnalyze(extractContractFile(file, token));
    } catch (err) {
      setErrorMessage(mapErrorMessage(err));
    } finally {
      setLoadingStage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSampleTest = async (filename: string) => {
    setErrorMessage(null);
    try {
      await runExtractAndAnalyze(extractSampleContract(filename, token));
    } catch (err) {
      setErrorMessage(mapErrorMessage(err));
    } finally {
      setLoadingStage(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
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
  );
};
