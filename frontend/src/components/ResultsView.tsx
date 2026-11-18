import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  Link2,
  Loader2,
  Trash2,
} from 'lucide-react';
import { downloadExecutivePdf } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { AuditExtractionRecord, RiskLevel } from '../types';
import { RiskBadge } from './RiskBadge';

interface ResultsViewProps {
  record: AuditExtractionRecord;
  onReset: () => void;
  onOpenDonate: () => void;
}

type FilterOption = 'ALL' | RiskLevel;
type NegotiationTone = 'firm' | 'balanced' | 'friendly';

function formatCountdown(expiresAtIso: string): string {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  if (Number.isNaN(diffMs) || diffMs <= 0) return '23:59:00';
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function buildToneCounterClause(
  baseCounterClause: string,
  tone: NegotiationTone,
  isUk: boolean,
): string {
  if (tone === 'balanced') return baseCounterClause;
  if (tone === 'firm') {
    return isUk
      ? `Обов'язкова правка перед підписанням: ${baseCounterClause}`
      : `Required revision prior to execution: ${baseCounterClause}`;
  }
  return isUk
    ? `Пропонуємо узгодити таке збалансоване формулювання: ${baseCounterClause}`
    : `Could we update this clause to keep both sides protected? Suggested wording: ${baseCounterClause}`;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  record,
  onReset,
  onOpenDonate,
}) => {
  const { t, lang } = useLanguage();
  const isUk = lang === 'uk';

  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toneByClause, setToneByClause] = useState<Record<string, NegotiationTone>>({});
  const [expandedAll, setExpandedAll] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [showRawClauses, setShowRawClauses] = useState(false);
  const [showDownloadPage, setShowDownloadPage] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(() => formatCountdown(record.expiresAt));

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(formatCountdown(record.expiresAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [record.expiresAt]);

  const analysis = record.analysis;
  const counts = record.analysisMeta?.riskCounts ?? { high: 0, medium: 0, low: 0 };
  const flaggedClauses = analysis?.flaggedClauses ?? [];

  const filteredClauses = useMemo(() => {
    if (filter === 'ALL') return flaggedClauses;
    return flaggedClauses.filter((c) => c.riskLevel === filter);
  }, [flaggedClauses, filter]);

  const visibleClauses = useMemo(() => {
    if (expandedAll || filteredClauses.length <= 3) return filteredClauses;
    return filteredClauses.slice(0, 3);
  }, [expandedAll, filteredClauses]);

  const hiddenCount = Math.max(0, filteredClauses.length - visibleClauses.length);

  const copyWithFeedback = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard fallback ignored if blocked by browser policy
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/?audit=${encodeURIComponent(record.auditId)}`;
    void copyWithFeedback('share-link', shareUrl);
  };

  const handleDownloadPdf = async () => {
    setPdfError(null);
    setDownloadingPdf(true);
    try {
      await downloadExecutivePdf(record.auditId, record.fileName, lang);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'PDF download failed.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const jumpToClauseBar = (idx: number) => {
    setFilter('ALL');
    setExpandedAll(true);
    setHighlightedIdx(idx);
    window.setTimeout(() => {
      const el = document.getElementById(`clause-card-${idx}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    window.setTimeout(() => setHighlightedIdx(null), 1800);
  };

  const score = analysis?.overallRiskScore ?? 0;

  const headlineText = useMemo(() => {
    if (counts.high > 0) {
      if (isUk) {
        return counts.high === 1
          ? 'Одна критична умова потребує правки перед підписанням.'
          : `${counts.high} критичні умови потребують правки перед підписанням.`;
      }
      return counts.high === 1
        ? 'One clause needs fixing before you sign.'
        : `${counts.high} clauses need fixing before you sign.`;
    }
    if (counts.medium > 0) {
      return isUk
        ? 'Критичних загроз немає, але варто уточнити середні ризики.'
        : 'No critical traps found — review medium clauses before signing.';
    }
    return isUk
      ? 'Договір виглядає збалансованим і готовим до підписання.'
      : 'Contract looks balanced with only minor notes.';
  }, [counts.high, counts.medium, isUk]);

  const topThreeChecklist = (analysis?.negotiationChecklist ?? []).slice(0, 3);
  const discrepancies = analysis?.contextDiscrepancies ?? [];

  if (showDownloadPage && analysis) {
    return (
      <div className="bg-paper px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-border pb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-primary">
                {t.extraction.downloadPageTitle}
              </h1>
              <p className="mt-1 text-sm text-ink-secondary">{t.extraction.downloadPageSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDownloadPage(false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-paper-border bg-white px-4 py-2 text-xs font-semibold text-ink-primary hover:border-paper-strong"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.extraction.backToResultsBtn}</span>
              </button>
              <button
                type="button"
                disabled={downloadingPdf}
                onClick={() => void handleDownloadPdf()}
                className="inline-flex items-center gap-1.5 rounded-full bg-signal px-5 py-2 text-xs font-bold text-white hover:bg-signal-hover disabled:opacity-60"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {downloadingPdf ? t.extraction.downloadingPdfBtn : t.extraction.downloadPdfBtn}
                </span>
              </button>
            </div>
          </div>

          {pdfError && (
            <div
              role="alert"
              className="rounded-lg border border-risk-highBorder bg-risk-highBg px-4 py-3 text-xs text-risk-highText"
            >
              {pdfError}
            </div>
          )}

          <article className="rounded-xl border border-paper-border bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border pb-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-signal">
                CLAUSEGUARD · EXECUTIVE SUMMARY
              </span>
              <span className="font-mono text-[11px] text-ink-muted">{t.disclaimerBadge}</span>
            </div>
            <div className="mt-4 flex flex-col justify-between gap-4 rounded-lg border border-paper-border bg-paper p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold text-ink-primary">{record.fileName}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-muted">
                  {record.pageCount}p · {record.wordCount}w ·{' '}
                  {analysis.contractLanguage.toUpperCase()}
                </p>
              </div>
              <div className="font-mono text-3xl font-extrabold text-signal">{score}/100</div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-ink-secondary">
              {analysis.executiveSummary}
            </p>
            <div className="mt-5 border-t border-paper-border pt-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t.extraction.checklistTitle}
              </h2>
              <ul className="mt-2.5 space-y-1.5">
                {analysis.negotiationChecklist.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-ink-primary">
                    <span className="font-mono font-bold text-signal">{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-paper">
      {/* Dark Forest Report Header Band (matches Image 1) */}
      <section className="border-b border-forest-border bg-forest text-white">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-full border border-forest-border bg-forest-deep px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/40"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isUk ? 'Новий аудит' : 'New audit'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 rounded-full border border-forest-border px-3.5 py-1.5 text-xs font-medium text-forest-muted transition-colors hover:border-white/40 hover:text-white"
              >
                {copiedKey === 'share-link' ? (
                  <Check className="h-3.5 w-3.5 text-[#52C48A]" aria-hidden="true" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {copiedKey === 'share-link'
                    ? t.extraction.copiedBtn
                    : isUk
                      ? 'Посилання'
                      : 'Share link'}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-full border border-forest-border px-3.5 py-1.5 text-xs font-medium text-forest-muted transition-colors hover:border-white/40 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isUk ? 'Видалити зараз' : 'Delete now'}</span>
              </button>
              {analysis && (
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => void handleDownloadPdf()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-signal px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-signal-hover disabled:opacity-60"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {downloadingPdf
                      ? t.extraction.downloadingPdfBtn
                      : isUk
                        ? 'Завантажити 1-стор. PDF'
                        : 'Download 1-page PDF'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {pdfError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-signal bg-forest-deep px-4 py-2.5 text-xs text-white"
            >
              {pdfError}
            </div>
          )}

          {/* Meta + Headline + Score */}
          <div className="mt-7 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-wider text-forest-muted">
                {isUk ? 'ЗВІТ АУДИТУ' : 'AUDIT REPORT'} · {record.fileName} · {record.wordCount}{' '}
                {isUk ? 'слів' : 'words'} · {isUk ? 'видалиться за' : 'deletes in'} {countdown}
              </p>
              <h1 className="mt-2.5 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl">
                {headlineText}
              </h1>
            </div>

            {analysis && (
              <div className="shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl font-extrabold leading-none text-signal">
                    {score}
                  </span>
                  <span className="font-mono text-base font-semibold text-forest-muted">/100</span>
                </div>
                <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-forest-soft">
                  <div
                    className="h-full rounded-full bg-signal transition-all"
                    style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
                  />
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-forest-muted">
                  {t.extraction.riskScoreLabel}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Clause Map Bar (Image 1) */}
          {flaggedClauses.length > 0 && (
            <div className="mt-7 border-t border-forest-border pt-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-forest-muted">
                {isUk
                  ? 'МАПА КЛАУЗУЛ · ВИЩА СМУЖКА = ВИЩИЙ РИЗИК · НАТИСНІТЬ ДЛЯ ПЕРЕХОДУ'
                  : 'CLAUSE MAP · TALLER MEANS RISKIER · TAP A BAR TO JUMP'}
              </p>
              <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-6 md:grid-cols-9">
                {flaggedClauses.map((clause, idx) => {
                  const barHeight =
                    clause.riskLevel === 'HIGH'
                      ? 'h-5 bg-signal'
                      : clause.riskLevel === 'MEDIUM'
                        ? 'h-3.5 bg-[#EAB308]'
                        : 'h-2.5 bg-[#52C48A]';
                  return (
                    <button
                      key={`${clause.clauseNumber}-${idx}`}
                      type="button"
                      onClick={() => jumpToClauseBar(idx)}
                      title={`§ ${clause.clauseNumber} — ${t.extraction.categories[clause.category]}`}
                      className="group flex h-7 items-end rounded-sm bg-forest-deep/60 p-0.5 transition-transform hover:-translate-y-0.5"
                    >
                      <span className={`w-full rounded-sm transition-opacity group-hover:opacity-90 ${barHeight}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Light Paper Body */}
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {/* Filter Pills */}
        {analysis && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['ALL', isUk ? 'Усі' : 'All', flaggedClauses.length],
                  ['HIGH', isUk ? 'Критичні' : 'Critical', counts.high],
                  ['MEDIUM', isUk ? 'Середні' : 'Medium', counts.medium],
                  ['LOW', isUk ? 'Низькі' : 'Low', counts.low],
                ] as const
              ).map(([id, label, count]) => {
                const active = filter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-forest text-white'
                        : 'border border-paper-border bg-white text-ink-secondary hover:border-paper-strong hover:text-ink-primary'
                    }`}
                  >
                    {label} {count}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowDownloadPage(true)}
              className="font-mono text-xs font-medium text-ink-secondary underline-offset-4 hover:text-signal hover:underline"
            >
              {isUk ? 'Перегляд 1-стор. звіту' : 'Preview 1-page summary'}
            </button>
          </div>
        )}

        {/* "Do these three things first" card (Image 1) */}
        {topThreeChecklist.length > 0 && (
          <div className="rounded-xl border border-paper-border bg-white p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-ink-primary">
              {isUk ? 'Зробіть ці три кроки першими' : 'Do these three things first'}
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-ink-secondary">
              {topThreeChecklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-ink-primary">{idx + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* SOW vs Deal Context Discrepancies (when present) */}
        {discrepancies.length > 0 && (
          <div className="space-y-3">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {isUk ? 'ЗВІРКА З ДОМОВЛЕНОСТЯМИ ПРОЄКТУ' : 'SOW VS. AGREED PROJECT CONTEXT'}
            </div>
            {discrepancies.map((d, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-paper-border bg-white"
              >
                <div
                  className={`h-1 w-full ${
                    d.status === 'MISMATCH'
                      ? 'bg-signal'
                      : d.status === 'OMITTED_IN_CONTRACT'
                        ? 'bg-[#EAB308]'
                        : 'bg-[#52C48A]'
                  }`}
                />
                <div className="space-y-3 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-base font-bold text-ink-primary">
                      {t.discrepancyMatrix.dimensions[d.dimension]}
                    </span>
                    <span className="rounded-full bg-signal-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-signal">
                      {t.discrepancyMatrix.statusLabels[d.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-paper-soft p-3 text-xs">
                      <div className="font-mono text-[10px] uppercase text-ink-muted">
                        {t.discrepancyMatrix.agreedCol}
                      </div>
                      <p className="mt-1 text-ink-primary">{d.agreedTerm}</p>
                    </div>
                    <div className="rounded-lg bg-paper-soft p-3 text-xs">
                      <div className="font-mono text-[10px] uppercase text-ink-muted">
                        {t.discrepancyMatrix.contractCol}
                      </div>
                      <p className="mt-1 text-ink-primary">{d.contractTerm}</p>
                    </div>
                  </div>
                  <p className="text-sm text-ink-secondary">{d.riskImpact}</p>
                  <div className="rounded-lg border border-paper-border bg-paper p-3.5 text-xs text-ink-primary">
                    <div className="font-mono text-[10px] font-semibold uppercase text-ink-muted">
                      {t.discrepancyMatrix.impactCol}
                    </div>
                    <p className="mt-1">{d.suggestedAmendment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flagged Clause Cards (matching Image 1) */}
        <div className="space-y-4">
          {visibleClauses.map((clause, idx) => {
            const tone: NegotiationTone = toneByClause[clause.clauseNumber] ?? 'balanced';
            const topStripe =
              clause.riskLevel === 'HIGH'
                ? 'bg-signal'
                : clause.riskLevel === 'MEDIUM'
                  ? 'bg-[#EAB308]'
                  : 'bg-[#52C48A]';
            const copyKey = `clause-${clause.clauseNumber}-${idx}`;
            const counterText = buildToneCounterClause(clause.counterClause, tone, isUk);

            return (
              <article
                id={`clause-card-${idx}`}
                key={`${clause.clauseNumber}-${idx}`}
                className={`overflow-hidden rounded-xl border bg-white transition-all ${
                  highlightedIdx === idx
                    ? 'border-signal ring-2 ring-signal/30'
                    : 'border-paper-border'
                }`}
              >
                <div className={`h-1 w-full ${topStripe}`} />
                <div className="space-y-4 p-5 sm:p-6">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-ink-primary">
                      <span className="mr-2 font-mono text-sm font-medium text-ink-muted">
                        § {clause.clauseNumber}
                      </span>
                      <span>{t.extraction.categories[clause.category]}</span>
                    </h3>
                    <RiskBadge level={clause.riskLevel} />
                  </div>

                  {/* WHAT THE CONTRACT SAYS */}
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      {isUk ? 'ЩО НАПИСАНО В ДОГОВОРІ' : 'WHAT THE CONTRACT SAYS'}
                    </div>
                    <div className="mt-1.5 rounded-lg bg-paper-soft px-4 py-3 font-mono text-xs leading-relaxed text-ink-primary">
                      {clause.originalExcerpt}
                    </div>
                  </div>

                  {/* WHAT IT MEANS FOR YOU */}
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      {isUk ? 'ЩО ЦЕ ОЗНАЧАЄ ДЛЯ ВАС' : 'WHAT IT MEANS FOR YOU'}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                      {clause.plainLanguageSummary}
                    </p>
                  </div>

                  {/* SAY THIS INSTEAD inner box */}
                  <div className="rounded-lg border border-paper-border bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                        {isUk ? 'ЗАПРОПОНУЙТЕ ЗАМІНУ' : 'SAY THIS INSTEAD'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(
                          [
                            ['firm', isUk ? 'Жорстко' : 'Firm'],
                            ['balanced', isUk ? 'Збалансовано' : 'Balanced'],
                            ['friendly', isUk ? 'М’яко' : 'Friendly'],
                          ] as const
                        ).map(([toneId, label]) => (
                          <button
                            key={toneId}
                            type="button"
                            onClick={() =>
                              setToneByClause((prev) => ({
                                ...prev,
                                [clause.clauseNumber]: toneId,
                              }))
                            }
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                              tone === toneId
                                ? 'bg-forest text-white'
                                : 'border border-paper-border bg-white text-ink-secondary hover:border-paper-strong'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-ink-primary">{counterText}</p>

                    <button
                      type="button"
                      onClick={() => void copyWithFeedback(copyKey, counterText)}
                      className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-signal-hover"
                    >
                      {copiedKey === copyKey ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t.extraction.copiedBtn}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {isUk ? 'Скопіювати правку' : 'Copy counter-clause'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Show X more clauses */}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpandedAll(true)}
            className="w-full rounded-full border border-paper-border bg-white py-3 text-xs font-semibold text-ink-primary transition-colors hover:border-paper-strong hover:bg-paper-soft"
          >
            {isUk
              ? `Показати ще ${hiddenCount} клаузул`
              : `Show ${hiddenCount} more clause${hiddenCount === 1 ? '' : 's'}`}
          </button>
        )}

        {/* Raw Extracted Clauses Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowRawClauses((p) => !p)}
            className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-ink-muted hover:text-ink-primary"
          >
            {showRawClauses ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {showRawClauses
                ? isUk
                  ? 'Сховати повний текст клаузул'
                  : 'Hide raw extracted clauses'
                : isUk
                  ? `Показати всі ${record.clauses.length} розпізнаних клаузул`
                  : `View all ${record.clauses.length} extracted clauses`}
            </span>
          </button>

          {showRawClauses && (
            <div className="mt-3 divide-y divide-paper-border rounded-xl border border-paper-border bg-white">
              {record.clauses.map((c) => (
                <div key={c.id} className="p-4 text-xs">
                  <div className="font-mono font-semibold text-ink-primary">
                    § {c.clauseNumber} {c.title}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-ink-secondary">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-border bg-white px-5 py-4">
          <p className="text-sm text-ink-secondary">
            <strong className="font-semibold text-ink-primary">ClauseGuard</strong>{' '}
            {isUk
              ? 'безкоштовний. Якщо він вберіг вас від поганої угоди, підтримайте проєкт.'
              : 'is free. If it saved you from a bad deal, you can chip in.'}
          </p>
          <button
            type="button"
            onClick={onOpenDonate}
            className="rounded-full border border-paper-border bg-paper px-4 py-1.5 text-xs font-semibold text-ink-primary transition-colors hover:border-forest hover:bg-white"
          >
            {isUk ? 'Підтримати через Monobank' : 'Support via Monobank'}
          </button>
        </div>
      </section>
    </div>
  );
};
