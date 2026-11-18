import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { fetchBuilderCatalog } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { BuilderCatalogResponse, ClauseModuleType } from '../types';

interface ClauseLibraryViewProps {
  onUseTemplate: (templateId: string) => void;
}

export const ClauseLibraryView: React.FC<ClauseLibraryViewProps> = ({ onUseTemplate }) => {
  const { t, lang } = useLanguage();
  const [catalog, setCatalog] = useState<BuilderCatalogResponse | null>(null);
  const [selectedModule, setSelectedModule] = useState<ClauseModuleType | 'ALL'>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchBuilderCatalog()
      .then(setCatalog)
      .catch(() => {
        // Non-blocking
      });
  }, []);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // Ignored
    }
  };

  const isUk = lang === 'uk';
  const filteredClauses =
    catalog?.clauses.filter((c) => selectedModule === 'ALL' || c.module === selectedModule) ?? [];

  return (
    <div className="space-y-8">
      <div className="border-b border-surface-border pb-4">
        <h2 className="font-display text-2xl font-bold text-ink-primary">{t.library.heading}</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-secondary">{t.library.subtitle}</p>
      </div>

      {/* 4 Typical B2B Contract Templates */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-primary">
          {t.library.templatesTitle}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {catalog?.templates.map((tpl) => (
            <article
              key={tpl.templateId}
              className="flex flex-col justify-between rounded-lg border border-surface-border bg-surface-card p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-sm border border-brand/50 bg-brand-subtle px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-text">
                    {tpl.templateId}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {tpl.modules.length} {isUk ? 'модулів' : 'modules'}
                  </span>
                </div>
                <h4 className="mt-2.5 font-display text-lg font-bold text-ink-primary">
                  {isUk ? tpl.titleUk : tpl.titleEn}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                  {isUk ? tpl.subtitleUk : tpl.subtitleEn}
                </p>
                <p className="mt-2 font-mono text-[11px] text-ink-muted">
                  {isUk ? tpl.idealForUk : tpl.idealForEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseTemplate(tpl.templateId)}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-signal px-4 py-2 text-xs font-bold text-ink-primary transition-colors hover:bg-signal-hover"
              >
                <span>{t.library.useTemplateBtn}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* 16 Vetted Clause Registry Browser */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-primary">
            {t.library.clausesTitle} ({filteredClauses.length})
          </h3>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as ClauseModuleType | 'ALL')}
            aria-label={t.library.clausesTitle}
            className="rounded-md border border-surface-border bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-primary focus:border-signal focus:outline-none"
          >
            <option value="ALL">{t.library.filterAll}</option>
            {catalog &&
              Object.entries(catalog.moduleTitles).map(([key, labels]) => (
                <option key={key} value={key}>
                  {isUk ? labels.uk : labels.en}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-4">
          {filteredClauses.map((clause) => (
            <article
              key={clause.clauseId}
              className="overflow-hidden rounded-lg border border-surface-border bg-surface-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border bg-surface-subtle px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-brand/50 bg-brand-subtle px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-text">
                    {clause.clauseId}
                  </span>
                  <span className="text-xs font-semibold text-ink-primary">
                    {isUk ? clause.titleUk : clause.titleEn}
                  </span>
                </div>
                <span
                  className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    clause.posture === 'CONTRACTOR_PROTECTIVE'
                      ? 'border-brand/50 bg-brand-subtle text-brand-text'
                      : 'border-surface-strong bg-surface-bg text-ink-secondary'
                  }`}
                >
                  {clause.posture === 'CONTRACTOR_PROTECTIVE'
                    ? t.library.postureProtective
                    : t.library.postureBalanced}
                </span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-surface-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <div className="flex flex-col justify-between p-4">
                  <div>
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      ENGLISH TEXT
                    </span>
                    <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink-primary">
                      {clause.templateEn}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(`${clause.clauseId}-en`, clause.templateEn)}
                    className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md border border-surface-border bg-surface-bg px-2.5 py-1 text-xs font-medium text-ink-primary hover:border-surface-strong"
                  >
                    {copiedKey === `${clause.clauseId}-en` ? (
                      <Check className="h-3.5 w-3.5 text-risk-lowText" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{t.library.copyEnBtn}</span>
                  </button>
                </div>

                <div className="flex flex-col justify-between p-4">
                  <div>
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      УКРАЇНСЬКИЙ ТЕКСТ
                    </span>
                    <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink-primary">
                      {clause.templateUk}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(`${clause.clauseId}-uk`, clause.templateUk)}
                    className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md border border-surface-border bg-surface-bg px-2.5 py-1 text-xs font-medium text-ink-primary hover:border-surface-strong"
                  >
                    {copiedKey === `${clause.clauseId}-uk` ? (
                      <Check className="h-3.5 w-3.5 text-risk-lowText" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{t.library.copyUkBtn}</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-surface-border bg-surface-bg px-4 py-2 text-xs text-ink-secondary">
                <strong className="font-mono text-[10px] uppercase text-brand-text">
                  {t.builder.rationalePrefix}{' '}
                </strong>
                {isUk ? clause.rationaleUk : clause.rationaleEn}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
