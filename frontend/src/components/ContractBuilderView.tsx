import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
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

type BuildMode = 'text' | 'template';
type WizardStep = 1 | 2 | 3;

const DEFAULT_PARAMS: ContractParameters = {
  clientName: 'ТОВ «Діджитал Партнерс»',
  contractorName: 'ФОП Коваленко Олена Ігорівна',
  projectTitle: 'B2B Client Portal MVP',
  projectScope:
    'Розробка веб-порталу клієнта (Next.js фронтенд, Node.js REST API, інтеграція платежів)',
  deliverablesList: 'Веб-додаток, REST API, технічна документація',
  exclusions: 'iOS-додаток, SEO-копірайтинг, налаштування DevOps-інфраструктури',
  pricingModel: 'FIXED_PRICE',
  totalFee: '2500',
  currency: 'USD',
  hourlyRate: '35',
  upfrontPercent: 50,
  paymentWindowDays: 10,
  acceptanceDays: 5,
  revisionRounds: 2,
  deadlineDate: '30 календарних днів',
  liabilityCapMonths: 3,
  governingLaw: 'Законодавство України / ЗЕД-контракт ФОП',
};

function sanitizeScenarioText(text: string): string {
  return text
    .replace(/Oleksandr Vlasyuk/gi, 'Olena Kovalenko')
    .replace(/Олександр Власюк/gi, 'Олена Коваленко');
}

export const ContractBuilderView: React.FC<ContractBuilderViewProps> = ({ initialTemplateId }) => {
  const { t, lang } = useLanguage();
  const isUk = lang === 'uk';

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [buildMode, setBuildMode] = useState<BuildMode>(initialTemplateId ? 'template' : 'text');
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
  const [paramDraft, setParamDraft] = useState<Partial<ContractParameters>>(DEFAULT_PARAMS);
  const [assembled, setAssembled] = useState<AssembledContractResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [exportingType, setExportingType] = useState<'docx' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const didMountBuilderRef = useRef(false);
  useEffect(() => {
    if (!didMountBuilderRef.current) {
      didMountBuilderRef.current = true;
      return;
    }
    window.requestAnimationFrame(() => {
      const el = document.getElementById('workspace-card-top');
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    });
  }, [wizardStep, buildMode]);

  useEffect(() => {
    if (initialTemplateId) {
      setSelectedTemplateId(initialTemplateId);
      setBuildMode('template');
      setWizardStep(1);
    }
  }, [initialTemplateId]);

  useEffect(() => {
    fetchBuilderCatalog()
      .then((res) => {
        const cleanedScenarios = res.scenarios.map((sc) => ({
          ...sc,
          plainTextEn: sanitizeScenarioText(sc.plainTextEn),
          plainTextUk: sanitizeScenarioText(sc.plainTextUk),
        }));
        setCatalog({ ...res, scenarios: cleanedScenarios });
        const firstScenario = cleanedScenarios[0];
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

  // Step 1 -> Step 2 (Parse text via AI and show parameters in the exact same place)
  const handleParseTextToParams = async (overrideText?: string, overrideTemplateId?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const effectiveText = (overrideText ?? plainText).trim();
      const result = await assembleContract({
        plainTextRequirements: effectiveText,
        templateId: overrideTemplateId ?? selectedTemplateId,
        contractLanguage,
        posture,
        selectedClauseIds: {},
      });
      const cleanedParams: ContractParameters = {
        ...result.parameters,
        contractorName: sanitizeScenarioText(result.parameters.contractorName || ''),
      };
      setAssembled({ ...result, parameters: cleanedParams });
      setParamDraft(cleanedParams);
      if (result.templateId) {
        setSelectedTemplateId(result.templateId);
      }
      setWizardStep(2);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to parse contract requirements.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 (Template mode) -> Step 2 (Load template defaults and open parameter editor in-place)
  const handlePickTemplateAndContinue = (tplId: string) => {
    setSelectedTemplateId(tplId);
    setSelectedClauseIds({});
    const tpl = catalog?.templates.find((item) => item.templateId === tplId);
    const nextParams: Partial<ContractParameters> = {
      ...DEFAULT_PARAMS,
      ...(tpl?.defaultParameters ?? {}),
      pricingModel: tpl?.defaultPricingModel ?? DEFAULT_PARAMS.pricingModel,
    };
    setParamDraft(nextParams);
    setWizardStep(2);
  };

  // Step 2 -> Step 3 (Assemble contract from verified parameters and show contract in-place)
  const handleAssembleFromParams = async (opts?: {
    overrideClauseIds?: Partial<Record<ClauseModuleType, string>>;
    overrideParams?: Partial<ContractParameters>;
    overridePosture?: ClausePosture;
    overrideLang?: BuilderLanguage;
  }) => {
    setError(null);
    setIsLoading(true);
    try {
      const paramsToUse = opts?.overrideParams ?? paramDraft;
      const effectiveText =
        plainText.trim().length >= 15
          ? plainText.trim()
          : `${paramsToUse.clientName || 'Client'} / ${paramsToUse.contractorName || 'Contractor'} — ${paramsToUse.projectTitle || 'Software Development Services'} (${paramsToUse.totalFee || '2500'} ${paramsToUse.currency || 'USD'})`;

      const result = await assembleContract({
        plainTextRequirements: effectiveText,
        templateId: selectedTemplateId,
        contractLanguage: opts?.overrideLang ?? contractLanguage,
        posture: opts?.overridePosture ?? posture,
        selectedClauseIds: opts?.overrideClauseIds ?? selectedClauseIds,
        parameterOverrides: paramsToUse,
      });
      setAssembled(result);
      setParamDraft(result.parameters);
      setWizardStep(3);
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
    const text = sanitizeScenarioText(isUk ? scenario.plainTextUk : scenario.plainTextEn);
    setSelectedTemplateId(scenario.templateId);
    setPlainText(text);
    setSelectedClauseIds({});
  };

  const handleSwapClauseVariant = (module: ClauseModuleType, clauseId: string) => {
    const nextMap = { ...selectedClauseIds, [module]: clauseId };
    setSelectedClauseIds(nextMap);
    void handleAssembleFromParams({
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

  const updateParam = <K extends keyof ContractParameters>(
    key: K,
    value: ContractParameters[K],
  ) => {
    setParamDraft((prev) => ({ ...prev, [key]: value }));
  };

  const inputClass =
    'w-full rounded-xl border border-paper-border bg-paper-soft/50 px-3.5 py-2.5 text-sm font-medium text-ink-primary transition-colors focus:border-forest focus:bg-white focus:outline-none';
  const labelClass = 'mb-1.5 block text-xs font-medium text-ink-secondary';

  return (
    <div className="space-y-6">
      {/* Top Bar: Title + Compact 3-Step Progress Indicator */}
      <div className="flex flex-col justify-between gap-4 border-b border-paper-border pb-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">
            {t.builder.sectionTitle}
          </h2>
          <p className="mt-0.5 text-xs text-ink-secondary sm:text-sm">
            {wizardStep === 1
              ? isUk
                ? 'Крок 1 з 3: Опишіть умови проєкту своїми словами або оберіть готовий шаблон.'
                : 'Step 1 of 3: Describe your deal in plain words or pick a standard template.'
              : wizardStep === 2
                ? isUk
                  ? 'Крок 2 з 3: Перевірте розпізнані параметри та натисніть «Зібрати договір».'
                  : 'Step 2 of 3: Verify the extracted parameters and click "Assemble contract".'
                : isUk
                  ? 'Крок 3 з 3: Ваш договір готовий — скопіюйте або завантажте у .docx / .pdf.'
                  : 'Step 3 of 3: Your contract is ready — copy or download as .docx / .pdf.'}
          </p>
        </div>

        {/* Clickable 3-Step Pills */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-paper-border bg-paper p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setWizardStep(1)}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              wizardStep === 1
                ? 'bg-forest text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {isUk ? '1. Умови / Шаблон' : '1. Input / Template'}
          </button>
          <span className="text-ink-muted">→</span>
          <button
            type="button"
            onClick={() => setWizardStep(2)}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              wizardStep === 2
                ? 'bg-forest text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {isUk ? '2. Перевірка параметрів' : '2. Check parameters'}
          </button>
          <span className="text-ink-muted">→</span>
          <button
            type="button"
            disabled={!assembled}
            onClick={() => assembled && setWizardStep(3)}
            className={`rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 ${
              wizardStep === 3
                ? 'bg-signal text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {isUk ? '3. Готовий договір' : '3. Ready contract'}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-risk-highBorder bg-risk-highBg px-4 py-3 text-sm text-risk-highText"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1 (IN-PLACE): Choose Text Mode or Template Mode                  */}
      {/* ===================================================================== */}
      {wizardStep === 1 && (
        <div className="space-y-5">
          {/* Sub-mode Toggle: Text vs Template */}
          <div className="inline-flex rounded-xl border border-paper-border bg-paper p-1">
            <button
              type="button"
              onClick={() => setBuildMode('text')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                buildMode === 'text'
                  ? 'bg-white text-ink-primary shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden="true" />
              <span>
                {isUk ? 'Зібрати за допомогою тексту (ШІ)' : 'Build from plain text (AI)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBuildMode('template')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                buildMode === 'template'
                  ? 'bg-white text-ink-primary shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
              <span>
                {isUk ? 'Обрати типовий договір із 4 шаблонів' : 'Pick a standard template'}
              </span>
            </button>
          </div>

          {buildMode === 'text' ? (
            <section className="rounded-2xl border border-paper-border bg-paper-soft/40 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <label
                  htmlFor="builder-plain-text"
                  className="font-mono text-xs font-bold uppercase tracking-wider text-ink-primary"
                >
                  {isUk
                    ? '1. ОПИШІТЬ УМОВИ ПРОЄКТУ ПРОСТИМИ СЛОВАМИ (ХТО, СКОУП, БЮДЖЕТ, ДЕДЛАЙН, ЩО НЕ ВХОДИТЬ)'
                    : '1. DESCRIBE PROJECT TERMS IN PLAIN WORDS (PARTIES, SCOPE, BUDGET, DEADLINE, EXCLUSIONS)'}
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
                        className="rounded-lg border border-paper-border bg-white px-2.5 py-1 font-mono text-xs font-medium text-ink-primary transition-colors hover:border-signal hover:text-signal"
                      >
                        {isUk ? sc.labelUk : sc.labelEn}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                id="builder-plain-text"
                rows={5}
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                placeholder={t.builder.plainTextPlaceholder}
                className="w-full rounded-xl border border-paper-border bg-white p-4 text-sm leading-relaxed text-ink-primary placeholder:text-ink-muted focus:border-forest focus:outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-ink-secondary">
                  {isUk
                    ? 'ШІ автоматично витягне суму, валюту, дедлайн, відсоток авансу та відкриє параметри для перевірки на цьому ж місці.'
                    : 'AI extracts fee, currency, deadline, and deposit % and opens the parameter check right here.'}
                </p>
                <button
                  type="button"
                  disabled={isLoading || plainText.trim().length < 15}
                  onClick={() => void handleParseTextToParams()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-signal px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-signal-hover disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>
                    {isLoading
                      ? isUk
                        ? 'ШІ розбирає текст...'
                        : 'AI is parsing text...'
                      : isUk
                        ? 'Розібрати текст і перевірити параметри →'
                        : 'Parse text & check parameters →'}
                  </span>
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-ink-primary">
                {isUk
                  ? '1. ОБЕРІТЬ ТИПОВИЙ B2B-ШАБЛОН (НАТИСНІТЬ НА КАРТКУ, ЩОБ ПЕРЕЙТИ ДО ПАРАМЕТРІВ)'
                  : '1. CHOOSE A TYPICAL B2B TEMPLATE (CLICK A CARD TO CONFIGURE PARAMETERS)'}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {catalog?.templates.map((tpl) => {
                  const selected = tpl.templateId === selectedTemplateId;
                  return (
                    <button
                      key={tpl.templateId}
                      type="button"
                      onClick={() => handlePickTemplateAndContinue(tpl.templateId)}
                      className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                        selected
                          ? 'border-forest bg-forest/5 ring-1 ring-forest'
                          : 'border-paper-border bg-white hover:border-paper-strong'
                      }`}
                    >
                      <div>
                        <span className="inline-block rounded-md border border-paper-border bg-paper px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary">
                          {tpl.templateId}
                        </span>
                        <h3 className="mt-2.5 text-sm font-bold text-ink-primary">
                          {isUk ? tpl.titleUk : tpl.titleEn}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                          {isUk ? tpl.subtitleUk : tpl.subtitleEn}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-paper-border pt-2.5">
                        <span className="font-mono text-[10px] text-ink-muted">
                          {isUk ? 'Обрати та заповнити' : 'Select & fill'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-signal" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2 (IN-PLACE): Review & Tweak Parameters -> Click "Assemble"       */}
      {/* ===================================================================== */}
      {wizardStep === 2 && (
        <section className="rounded-2xl border border-paper-border bg-white p-5 sm:p-7 shadow-xs space-y-5">
          {/* Omitted-Term Warnings (if AI parsed plain text that lacked key protections) */}
          {buildMode === 'text' && assembled && assembled.omittedWarnings.length > 0 && (
            <div className="rounded-xl border border-risk-medBorder bg-risk-medBg p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-risk-medText"
                  aria-hidden="true"
                />
                <div className="w-full">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-risk-medText">
                    {t.builder.omittedTitle} ({assembled.omittedWarnings.length})
                  </h3>
                  <p className="mt-1 text-xs text-ink-secondary">{t.builder.omittedDesc}</p>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {assembled.omittedWarnings.map((w) => (
                      <div
                        key={w.field}
                        className="rounded-lg border border-risk-medBorder bg-white p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ink-primary">
                            {isUk ? w.titleUk : w.titleEn}
                          </span>
                          <span className="rounded-sm border border-brand/50 bg-brand-subtle px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-text">
                            {w.appliedDefaultClauseId}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
                          {isUk ? w.reasonUk : w.reasonEn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-border pb-4">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-primary">
                {isUk
                  ? '2. ПЕРЕВІРТЕ ТА УТОЧНІТЬ ПАРАМЕТРИ ДОГОВОРУ'
                  : '2. REVIEW & TWEAK CONTRACT PARAMETERS'}
              </h3>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {isUk
                  ? 'Перевірте правильність усіх полів і натисніть «Зібрати договір», щоб сформувати готовий текст.'
                  : 'Verify all fields below and click "Assemble contract" to generate your final agreement.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setWizardStep(1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-paper-border bg-paper px-3.5 py-2 text-xs font-semibold text-ink-primary hover:border-paper-strong"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isUk ? 'Назад до кроку 1' : 'Back to step 1'}</span>
            </button>
          </div>

          {/* Clean 2-col Parameters Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t.builder.paramLabels.clientName}</label>
              <input
                type="text"
                value={String(paramDraft.clientName ?? '')}
                onChange={(e) => updateParam('clientName', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.contractorName}</label>
              <input
                type="text"
                value={String(paramDraft.contractorName ?? '')}
                onChange={(e) => updateParam('contractorName', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.projectTitle}</label>
              <input
                type="text"
                value={String(paramDraft.projectTitle ?? '')}
                onChange={(e) => updateParam('projectTitle', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.deadlineDate}</label>
              <input
                type="text"
                value={String(paramDraft.deadlineDate ?? '')}
                onChange={(e) => updateParam('deadlineDate', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.totalFee}</label>
              <input
                type="text"
                value={String(paramDraft.totalFee ?? '')}
                onChange={(e) => updateParam('totalFee', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.currency}</label>
              <select
                value={String(paramDraft.currency ?? 'USD')}
                onChange={(e) => updateParam('currency', e.target.value)}
                className={inputClass}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="UAH">UAH</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.upfrontPercent}</label>
              <input
                type="number"
                value={String(paramDraft.upfrontPercent ?? 50)}
                onChange={(e) => updateParam('upfrontPercent', Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.paymentWindowDays}</label>
              <input
                type="number"
                value={String(paramDraft.paymentWindowDays ?? 10)}
                onChange={(e) => updateParam('paymentWindowDays', Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.acceptanceDays}</label>
              <input
                type="number"
                value={String(paramDraft.acceptanceDays ?? 5)}
                onChange={(e) => updateParam('acceptanceDays', Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.revisionRounds}</label>
              <select
                value={String(paramDraft.revisionRounds ?? 2)}
                onChange={(e) => updateParam('revisionRounds', Number(e.target.value))}
                className={inputClass}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>{t.builder.paramLabels.hourlyRate}</label>
              <input
                type="text"
                value={String(paramDraft.hourlyRate ?? '')}
                onChange={(e) => updateParam('hourlyRate', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                {isUk ? 'Структура договору (Шаблон)' : 'Contract Structure (Template)'}
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className={inputClass}
              >
                {(catalog?.templates ?? []).map((tpl) => (
                  <option key={tpl.templateId} value={tpl.templateId}>
                    {isUk ? tpl.titleUk : tpl.titleEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
                {isUk ? 'Предмет послуг (Scope of Services)' : 'Service scope (optional)'}
              </label>
              <input
                type="text"
                placeholder={
                  isUk
                    ? 'Напр.: Розробка веб-порталу на Next.js та інтеграція платіжного шлюзу'
                    : 'e.g. building a Next.js web portal and payment gateway integration'
                }
                value={String(paramDraft.projectScope ?? '')}
                onChange={(e) => updateParam('projectScope', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>{t.builder.paramLabels.exclusions}</label>
              <input
                type="text"
                value={String(paramDraft.exclusions ?? '')}
                onChange={(e) => updateParam('exclusions', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Language, Posture & Primary Assemble CTA Bar */}
          <div className="flex flex-col justify-between gap-4 border-t border-paper-border pt-5 lg:flex-row lg:items-end">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t.builder.languageLabel}
                </p>
                <div className="mt-1.5 inline-flex overflow-hidden rounded-xl border border-paper-border bg-paper">
                  {(['en', 'uk', 'bilingual'] as BuilderLanguage[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setContractLanguage(opt)}
                      className={`border-r border-paper-border px-3.5 py-2 font-mono text-xs font-semibold last:border-r-0 ${
                        contractLanguage === opt
                          ? 'bg-forest text-white'
                          : 'text-ink-secondary hover:text-ink-primary'
                      }`}
                    >
                      {t.builder.langOptions[opt]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t.builder.postureLabel}
                </p>
                <div className="mt-1.5 inline-flex overflow-hidden rounded-xl border border-paper-border bg-paper">
                  <button
                    type="button"
                    onClick={() => {
                      setPosture('CONTRACTOR_PROTECTIVE');
                      setSelectedClauseIds({});
                    }}
                    className={`border-r border-paper-border px-3.5 py-2 font-mono text-xs font-semibold ${
                      posture === 'CONTRACTOR_PROTECTIVE'
                        ? 'bg-signal text-white'
                        : 'text-ink-secondary hover:text-ink-primary'
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
                    className={`px-3.5 py-2 font-mono text-xs font-semibold ${
                      posture === 'BALANCED'
                        ? 'bg-forest text-white'
                        : 'text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    {t.builder.postureBalanced}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleAssembleFromParams()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-signal px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-signal-hover disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {isLoading
                  ? t.builder.assemblingBtn
                  : isUk
                    ? 'Зібрати договір →'
                    : 'Assemble contract →'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 3 (IN-PLACE): Assembled Contract + Export                        */}
      {/* ===================================================================== */}
      {wizardStep === 3 && assembled && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 border-b border-paper-border pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm border border-brand/50 bg-brand-subtle px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-text">
                  {assembled.templateId}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  {t.builder.sourceEngine}: {assembled.modelId}
                </span>
              </div>
              <h3 className="mt-1.5 font-display text-xl font-bold text-ink-primary sm:text-2xl">
                {assembled.templateTitle}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-paper-border bg-paper px-3.5 py-2 text-xs font-semibold text-ink-primary transition-colors hover:border-paper-strong"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isUk ? 'Змінити параметри' : 'Edit parameters'}</span>
              </button>

              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-paper-border bg-white px-3 py-2 text-xs font-medium text-ink-secondary transition-colors hover:border-paper-strong hover:text-ink-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isUk ? 'Спочатку' : 'Start over'}</span>
              </button>

              <button
                type="button"
                onClick={() => void copyWithFeedback('full-contract', assembled.fullContractText)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-paper-border bg-white px-3.5 py-2 text-xs font-semibold text-ink-primary transition-colors hover:border-paper-strong"
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-signal px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-signal-hover disabled:opacity-60"
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-forest-deep disabled:opacity-60"
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
                className="overflow-hidden rounded-xl border border-paper-border bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border bg-paper-soft px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-sm border border-paper-border bg-white px-2 py-0.5 font-mono text-xs font-semibold text-ink-primary">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-semibold text-ink-primary">{section.title}</span>
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
                          className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                            active
                              ? 'border-forest bg-forest text-white'
                              : 'border-paper-border bg-white text-ink-secondary hover:border-paper-strong'
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

                <div className="grid grid-cols-1 divide-y divide-paper-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                  <div className="p-4 lg:col-span-8">
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-primary">
                      {section.renderedText}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between bg-paper-soft/50 p-4 lg:col-span-4">
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
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-paper-border bg-white px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:border-paper-strong"
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
          <div className="overflow-hidden rounded-xl border border-paper-border bg-white">
            <button
              type="button"
              onClick={() => setShowFullPreview((p) => !p)}
              className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs font-semibold text-ink-secondary hover:bg-paper-soft hover:text-ink-primary"
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
              <pre className="whitespace-pre-wrap border-t border-paper-border bg-paper-soft p-5 font-mono text-xs leading-relaxed text-ink-primary">
                {assembled.fullContractText}
              </pre>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
