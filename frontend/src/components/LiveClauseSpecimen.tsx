import React, { useState } from 'react';
import { AlertOctagon, Check, Copy } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const LiveClauseSpecimen: React.FC = () => {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const items = t.specimen.items;
  const active = items[activeIndex] ?? items[0];

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard API may be blocked on non-HTTPS origins
    }
  };

  return (
    <section
      aria-labelledby="specimen-title"
      className="overflow-hidden rounded-lg border border-surface-border bg-surface-card"
    >
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border bg-surface-subtle px-4 py-3">
        <h2
          id="specimen-title"
          className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-primary"
        >
          {t.specimen.panelTitle}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-risk-highBorder bg-risk-highBg px-2.5 py-0.5 font-mono text-[11px] font-semibold text-risk-highText">
          <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{active.riskLabel}</span>
        </span>
      </div>

      {/* Clause switch tabs */}
      <div
        className="flex flex-wrap border-b border-surface-border bg-surface-bg"
        role="tablist"
        aria-label="Sample flagged clauses"
      >
        {items.map((item, idx) => {
          const isSelected = idx === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveIndex(idx)}
              className={`border-r border-surface-border px-4 py-2.5 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-surface-subtle text-white'
                  : 'text-ink-muted hover:bg-surface-card hover:text-ink-primary'
              }`}
            >
              {item.tabLabel}
            </button>
          );
        })}
      </div>

      {/* 3-Column Comparison Grid */}
      <div className="grid grid-cols-1 divide-y divide-surface-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {/* Column 1: Original Clause */}
        <div className="flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between border-b border-surface-border pb-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {t.specimen.col1Title}
            </span>
            <span className="font-mono text-[11px] font-medium text-ink-secondary">
              {active.clauseRef}
            </span>
          </div>
          <blockquote className="rounded-md border border-surface-border bg-surface-bg p-4 text-sm leading-relaxed text-ink-primary">
            “{active.originalExcerpt}”
          </blockquote>
        </div>

        {/* Column 2: Plain-Language Meaning */}
        <div className="flex flex-col p-5">
          <div className="mb-3 border-b border-surface-border pb-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {t.specimen.col2Title}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-secondary">
            {active.plainLanguageSummary}
          </p>
        </div>

        {/* Column 3: Counter-Clause */}
        <div className="flex flex-col bg-surface-subtle/40 p-5">
          <div className="mb-3 flex items-center justify-between border-b border-surface-border pb-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-text">
              {t.specimen.col3Title}
            </span>
          </div>
          <p className="flex-1 rounded-md border border-surface-border bg-surface-bg p-3.5 text-[13px] leading-relaxed text-ink-primary">
            {active.counterClause}
          </p>
          <button
            type="button"
            onClick={() => void handleCopy(active.id, active.counterClause)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200"
          >
            {copiedId === active.id ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.specimen.copiedBtn}</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.specimen.copyBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
