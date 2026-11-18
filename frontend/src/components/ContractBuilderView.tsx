import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ApiClientError,
  assembleContract,
  exportAssembledContractDocx,
  exportAssembledContractPdf,
  fetchBuilderCatalog,
} from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import {
  AssembledContractResult,
  BuilderCatalogResponse,
  BuilderLanguage,
  ClauseModuleType,
  ClausePosture,
  ContractParameters,
} from '../types';

interface ContractBuilderViewProps {
  initialTemplateId?: string;
}

export const ContractBuilderView: React.FC<ContractBuilderViewProps> = ({ initialTemplateId }) => {
  const { t, lang } = useLanguage();
  const [catalog, setCatalog] = useState<BuilderCatalogResponse | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId || 'TPL-FOP-SOW-FIXED',
  );
  const [plainText, setPlainText] = useState<string>('');
  const [contractLanguage, setContractLanguage] = useState<BuilderLanguage>(lang);
  const [posture, setPosture] = useState<ClausePosture>('CONTRACTOR_PROTECTIVE');

  const [selectedClauseIds, setSelectedClauseIds] = useState<
    Partial<Record<ClauseModuleType, string>>
  >({});
  const [paramDraft, setParamDraft] = useState<Partial<ContractParameters>>({});
  const [assembled, setAssembled] = useState<AssembledContractResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [exportingType, setExportingType] = useState<'docx' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  useEffect(() => {
    if (initialTemplateId) {
      setSelectedTemplateId(initialTemplateId);
    }
  }, [initialTemplateId]);

  useEffect(() => {
    fetchBuilderCatalog()
      .then((res) => {
        setCatalog(res);
        const firstScenario = res.scenarios[0];
        if (firstScenario && !plainText) {
          setPlainText(lang === 'uk' ? firstScenario.plainTextUk : firstScenario.plainTextEn);
        }
      })
      .catch(() => {
        // Handled when user triggers assembly
      });
  }, []);

  const copyWithFeedback = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2200);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const runAssembly = async (opts?: {
    overrideText?: string;
    overrideTemplateId?: string;
    overrideClauseIds?: Partial<Record<ClauseModuleType, string>>;
    overrideParams?: Partial<ContractParameters>;
    overridePosture?: ClausePosture;
    overrideLang?: BuilderLanguage;
  }) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await assembleContract({
        plainTextRequirements: opts?.overrideText ?? plainText,
        templateId: opts?.overrideTemplateId ?? selectedTemplateId,
        contractLanguage: opts?.overrideLang ?? contractLanguage,
        posture: opts?.overridePosture ?? posture,
        selectedClauseIds: opts?.overrideClauseIds ?? selectedClauseIds,
        parameterOverrides: opts?.overrideParams,
      });
      setAssembled(result);
      setParamDraft(result.parameters);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to assemble contract.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadScenario = (scenarioId: string) => {
    const scenario = catalog?.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    const text = lang === 'uk' ? scenario.plainTextUk : scenario.plainTextEn;
    setSelectedTemplateId(scenario.templateId);
    setPlainText(text);
    setSelectedClauseIds({});
    setParamDraft({});
    void runAssembly({
      overrideText: text,
      overrideTemplateId: scenario.templateId,
      overrideClauseIds: {},
      overrideParams: undefined,
    });
  };

  const handleSwapClauseVariant = (module: ClauseModuleType, clauseId: string) => {
    const nextMap = { ...selectedClauseIds, [module]: clauseId };
    setSelectedClauseIds(nextMap);
    void runAssembly({
      overrideClauseIds: nextMap,
      overrideParams: paramDraft,
    });
  };

  const handleDownload = async (format: 'docx' | 'pdf') => {
    if (!assembled) return;
    setExportingType(format);
    setError(null);
    try {
      if (format === 'docx') {
        await exportAssembledContractDocx(assembled);
      } else {
        await exportAssembledContractPdf(assembled);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportingType(null);
    }
  };

  const isUk = lang === 'uk';

  return (
    <div className="space-y-8">
      {/* Builder Configuration (Prompt + Primary Assemble CTA FIRST for instant mobile & desktop access) */}
      <section id="builder-assemble-area" className="space-y-6">
        <div className="border-b border-surface-border pb-3">
          <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
            {t.builder.sectionTitle}
          </h2>
        </div>

        {/* 1. Plain Text Input + Example Scenarios */}
        <div>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <label
              htmlFor="builder-plain-text"
              className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted"
            >
              {t.builder.plainTextLabel}
            </label>
            {catalog && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] text-ink-muted">
                  {t.builder.tryScenario}
                </span>
                {catalog.scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleLoadScenario(sc.id)}
                    className="rounded-md border border-surface-border bg-surface-card px-2.5 py-1.5 font-mono text-xs font-medium text-ink-primary transition-colors hover:border-brand hover:text-brand-text"
                  >
                    {isUk ? sc.labelUk : sc.labelEn}
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            id="builder-plain-text"
            rows={4}
            value={plainText}
            onChange={(e) => setPlainText(e.target.value)}
            placeholder={t.builder.plainTextPlaceholder}
            className="mt-2.5 w-full rounded-md border border-surface-strong bg-surface-card p-3.5 text-sm leading-relaxed text-white placeholder:text-ink-muted focus:border-brand focus:outline-none sm:p-4 sm:text-base"
          />
        </div>

        {/* Language, Posture & Prominent Primary Assemble Button */}
        <div className="flex flex-col justify-between gap-5 border-b border-surface-border pb-6 lg:flex-row lg:items-end">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-6 lg:w-auto">
            <div className="w-full sm:w-auto">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {t.builder.languageLabel}
              </p>
              <div className="mt-1.5 flex w-full overflow-hidden rounded-md border border-surface-border bg-surface-card sm:inline-flex sm:w-auto">
                {(['en', 'uk', 'bilingual'] as BuilderLanguage[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setContractLanguage(opt)}
                    className={`flex-1 border-r border-surface-border px-3 py-2.5 font-mono text-xs font-medium last:border-r-0 sm:flex-initial sm:px-3.5 sm:py-2 ${
                      contractLanguage === opt
                        ? 'bg-surface-subtle text-white'
                        : 'text-ink-muted hover:text-ink-primary'
                    }`}
                  >
                    {t.builder.langOptions[opt]}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {t.builder.postureLabel}
              </p>
              <div className="mt-1.5 flex w-full overflow-hidden rounded-md border border-surface-border bg-surface-card sm:inline-flex sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPosture('CONTRACTOR_PROTECTIVE');
                    setSelectedClauseIds({});
                  }}
                  className={`flex-1 border-r border-surface-border px-3 py-2.5 font-mono text-xs font-medium sm:flex-initial sm:px-3.5 sm:py-2 ${
                    posture === 'CONTRACTOR_PROTECTIVE'
                      ? 'bg-brand text-white'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  {t.builder.postureProtective}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPosture('BALANCED');
                    setSelectedClauseIds({});
                  }}
                  className={`flex-1 px-3 py-2.5 font-mono text-xs font-medium sm:flex-initial sm:px-3.5 sm:py-2 ${
                    posture === 'BALANCED'
                      ? 'bg-surface-subtle text-white'
                      : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  {t.builder.postureBalanced}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading || plainText.trim().length < 15}
            onClick={() =>
              void runAssembly({
                overrideParams: undefined,
              })
            }
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-white bg-white px-7 py-4 text-base font-bold text-[#0A0A0A] transition-all duration-150 hover:bg-zinc-200 disabled:opacity-50 lg:w-auto lg:px-8"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            )}
            <span>{isLoading ? t.builder.assemblingBtn : t.builder.assembleBtn}</span>
          </button>
        </div>

        {/* 2. Template Selector (Horizontal Swipe on Mobile, 4-col Grid on Desktop) */}
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.builder.chooseTemplate}
          </p>
          <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-4">
            {catalog?.templates.map((tpl) => {
              const selected = tpl.templateId === selectedTemplateId;
              return (
                <button
                  key={tpl.templateId}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(tpl.templateId);
                    setSelectedClauseIds({});
                  }}
                  className={`flex min-w-[260px] shrink-0 snap-start flex-col justify-between rounded-md border p-4 text-left transition-all duration-150 hover:-translate-y-0.5 md:min-w-0 md:shrink ${
                    selected
                      ? 'border-brand bg-brand-subtle/40'
                      : 'border-surface-border bg-surface-card hover:border-surface-strong'
                  }`}
                >
                  <div>
                    <span className="inline-block rounded-sm border border-surface-border bg-surface-bg px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-text">
                      {tpl.templateId}
                    </span>
                    <h3 className="mt-2.5 text-base font-semibold text-white">
                      {isUk ? tpl.titleUk : tpl.titleEn}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                      {isUk ? tpl.subtitleUk : tpl.subtitleEn}
                    </p>
                  </div>
                  <p className="mt-3 border-t border-surface-border pt-2.5 font-mono text-[11px] text-ink-muted">
                    {isUk ? tpl.idealForUk : tpl.idealForEn}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-md border border-risk-highBorder bg-risk-highBg px-4 py-3 text-sm text-risk-highText"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Assembled Contract Workspace */}
      {assembled && (
        <div className="space-y-6">
          {/* Omitted-Term Warnings */}
          {assembled.omittedWarnings.length > 0 && (
            <section className="rounded-lg border border-risk-medBorder bg-risk-medBg p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-risk-medText" aria-hidden="true" />
                <div className="w-full">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-risk-medText">
                    {t.builder.omittedTitle} ({assembled.omittedWarnings.length})
                  </h3>
                  <p className="mt-1 text-xs text-ink-secondary">{t.builder.omittedDesc}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {assembled.omittedWarnings.map((w) => (
                      <div
                        key={w.field}
                        className="rounded-md border border-risk-medBorder bg-surface-card p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">
                            {isUk ? w.titleUk : w.titleEn}
                          </span>
                          <span className="rounded-sm border border-brand/50 bg-brand-subtle px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-text">
                            {w.appliedDefaultClauseId}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                          {isUk ? w.reasonUk : w.reasonEn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Editable Extracted Parameters Strip */}
          <section className="rounded-lg border border-surface-border bg-surface-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                {t.builder.paramsTitle}
              </h3>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void runAssembly({ overrideParams: paramDraft })}
                className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-surface-strong"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.builder.applyParamsBtn}</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['clientName', 'text'],
                  ['contractorName', 'text'],
                  ['projectTitle', 'text'],
                  ['deadlineDate', 'text'],
                  ['totalFee', 'text'],
                  ['currency', 'text'],
                  ['upfrontPercent', 'number'],
                  ['paymentWindowDays', 'number'],
                  ['acceptanceDays', 'number'],
                  ['revisionRounds', 'number'],
                  ['hourlyRate', 'text'],
                ] as Array<[keyof ContractParameters, 'text' | 'number']>
              ).map(([field, inputType]) => (
                <div key={field}>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {t.builder.paramLabels[field as keyof typeof t.builder.paramLabels] ?? field}
                  </label>
                  <input
                    type={inputType}
                    value={String(paramDraft[field] ?? '')}
                    onChange={(e) =>
                      setParamDraft((prev) => ({
                        ...prev,
                        [field]: inputType === 'number' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-surface-border bg-surface-bg px-2.5 py-1.5 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {t.builder.paramLabels.exclusions}
                </label>
                <input
                  type="text"
                  value={String(paramDraft.exclusions ?? '')}
                  onChange={(e) =>
                    setParamDraft((prev) => ({ ...prev, exclusions: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-surface-border bg-surface-bg px-2.5 py-1.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Action Toolbar + Assembled Clauses */}
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-3 border-b border-surface-border pb-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-brand/50 bg-brand-subtle px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-text">
                    {assembled.templateId}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {t.builder.sourceEngine}: {assembled.modelId}
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-xl font-bold text-white sm:text-2xl">
                  {t.builder.assembledTitle}: {assembled.templateTitle}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyWithFeedback('full-contract', assembled.fullContractText)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-card px-3 py-2 text-xs font-medium text-ink-primary transition-colors hover:border-surface-strong"
                >
                  {copiedKey === 'full-contract' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-risk-lowText" aria-hidden="true" />
                      <span>{t.builder.copiedFullBtn}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.builder.copyFullBtn}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={exportingType !== null}
                  onClick={() => void handleDownload('docx')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200 disabled:opacity-60"
                >
                  {exportingType === 'docx' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{t.builder.exportDocxBtn}</span>
                </button>

                <button
                  type="button"
                  disabled={exportingType !== null}
                  onClick={() => void handleDownload('pdf')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-subtle px-3.5 py-2 text-xs font-medium text-white transition-colors hover:border-surface-strong disabled:opacity-60"
                >
                  {exportingType === 'pdf' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{t.builder.exportPdfBtn}</span>
                </button>
              </div>
            </div>

            {/* Individual Vetted Module Cards */}
            <div className="space-y-4">
              {assembled.sections.map((section, idx) => (
                <article
                  key={section.module}
                  className="overflow-hidden rounded-lg border border-surface-border bg-surface-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border bg-surface-subtle px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm border border-surface-border bg-surface-bg px-2 py-0.5 font-mono text-xs font-semibold text-white">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold text-white">{section.title}</span>
                      <span className="rounded-sm border border-brand/50 bg-brand-subtle px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-text">
                        {section.selectedClauseId}
                      </span>
                    </div>

                    {/* Variant Switcher */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] text-ink-muted">
                        {t.builder.swapVariantLabel}
                      </span>
                      {section.alternatives.map((alt) => {
                        const active = alt.clauseId === section.selectedClauseId;
                        return (
                          <button
                            key={alt.clauseId}
                            type="button"
                            onClick={() => handleSwapClauseVariant(section.module, alt.clauseId)}
                            className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium transition-colors ${
                              active
                                ? 'border-brand bg-brand text-white'
                                : 'border-surface-border bg-surface-bg text-ink-secondary hover:border-surface-strong'
                            }`}
                          >
                            {alt.posture === 'CONTRACTOR_PROTECTIVE'
                              ? t.library.postureProtective
                              : t.library.postureBalanced}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 divide-y divide-surface-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                    <div className="p-4 lg:col-span-8">
                      <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-primary">
                        {section.renderedText}
                      </p>
                    </div>
                    <div className="flex flex-col justify-between bg-surface-bg p-4 lg:col-span-4">
                      <div>
                        <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-text">
                          {t.builder.rationalePrefix}
                        </span>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                          {section.rationale}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyWithFeedback(section.module, section.renderedText)}
                        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-surface-strong"
                      >
                        {copiedKey === section.module ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-risk-lowText" aria-hidden="true" />
                            <span>{t.specimen.copiedBtn}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t.builder.copySectionBtn}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Collapsible Full Assembled Document */}
            <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
              <button
                type="button"
                onClick={() => setShowFullPreview((p) => !p)}
                className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs font-semibold text-ink-secondary hover:bg-surface-subtle hover:text-white"
              >
                <span>
                  {showFullPreview ? t.builder.hideFullPreviewToggle : t.builder.fullPreviewToggle}
                </span>
                {showFullPreview ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {showFullPreview && (
                <pre className="whitespace-pre-wrap border-t border-surface-border bg-surface-bg p-5 font-mono text-xs leading-relaxed text-ink-primary">
                  {assembled.fullContractText}
                </pre>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
