import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, FileCheck, Layers, Loader2, MessageSquareText } from 'lucide-react';
import {
  analyzeAudit,
  extractSampleContract,
  fetchAuditById,
  fetchMyAudits,
} from './api/client';
import { AuthModal } from './components/AuthModal';
import { ContractBuilderView } from './components/ContractBuilderView';
import { PricingModal, PricingReason, PlanTier } from './components/PricingModal';
import { LiveClauseSpecimen } from './components/LiveClauseSpecimen';
import { Navbar, PageView } from './components/Navbar';
import { ResultsView } from './components/ResultsView';
import { SowReconciliationView } from './components/SowReconciliationView';
import { UploadZone } from './components/UploadZone';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuditExtractionRecord, AuditSummaryItem } from './types';

function readAuditIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('audit');
  if (queryId) return queryId;

  const pathMatch = window.location.pathname.match(/^\/audits\/([^/]+)$/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
}

function readPageFromUrl(): PageView {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  if (page === 'audit' || page === 'auditor') return 'auditor';
  if (page === 'reconcile') return 'reconcile';
  if (page === 'builder') return 'builder';
  return 'home';
}

const MARQUEE_ITEMS_EN = [
  'PAYMENT TERMS',
  'IP RIGHTS',
  'LIABILITY',
  'SCOPE CREEP',
  'TERMINATION',
  'NON-COMPETE',
  'GOVERNING LAW',
];

const MARQUEE_ITEMS_UK = [
  'УМОВИ ОПЛАТИ',
  'ПРАВА IP',
  'ВІДПОВІДАЛЬНІСТЬ',
  'РОЗМИТТЯ СКОУПУ',
  'РОЗІРВАННЯ',
  'NON-COMPETE',
  'ЗАСТОСОВНЕ ПРАВО',
];

const MainShell: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, token } = useAuth();
  const isUk = lang === 'uk';

  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'signup' }>({
    open: false,
    mode: 'login',
  });
  const [pricingModal, setPricingModal] = useState<{ open: boolean; reason: PricingReason }>({
    open: false,
    reason: 'general',
  });
  const [userPlan, setUserPlan] = useState<PlanTier>('free');

  useEffect(() => {
    // Clean up any legacy global plan key
    try {
      localStorage.removeItem('cg_user_plan');
    } catch {
      // ignore
    }
    if (!user) {
      setUserPlan('free');
      return;
    }
    const normalized = user.email.toLowerCase();
    // Only the exact paying account has the paid plan activated by default
    if (normalized === 'm.moroz.pn@ucu.edu.ua' || user.plan === 'single' || user.plan === 'pro') {
      setUserPlan(user.plan || 'single');
      return;
    }
    // Check if this specific email was explicitly unlocked
    const accountKey = `cg_plan_${normalized}`;
    const saved = localStorage.getItem(accountKey) as PlanTier | null;
    if (saved === 'single' || saved === 'pro') {
      setUserPlan(saved);
    } else {
      setUserPlan('free');
    }
  }, [user]);

  const isPaidUser = userPlan === 'single' || userPlan === 'pro';

  const openPricingModal = (reason: PricingReason = 'general') => {
    setPricingModal({ open: true, reason });
  };
  const [activeRecord, setActiveRecord] = useState<AuditExtractionRecord | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditLoadError, setAuditLoadError] = useState(false);
  const [recentAudits, setRecentAudits] = useState<AuditSummaryItem[]>([]);
  const [currentPage, setCurrentPage] = useState<PageView>(() => readPageFromUrl());

  const loadAuditFromId = async (auditId: string) => {
    setLoadingAudit(true);
    setAuditLoadError(false);
    try {
      const record = await fetchAuditById(auditId);
      setActiveRecord(record);
      setCurrentPage('auditor');
    } catch {
      setActiveRecord(null);
      setAuditLoadError(true);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    const urlAuditId = readAuditIdFromUrl();
    if (urlAuditId) {
      void loadAuditFromId(urlAuditId);
    }

    const onPopState = () => {
      const nextAuditId = readAuditIdFromUrl();
      if (nextAuditId) {
        void loadAuditFromId(nextAuditId);
      } else {
        setActiveRecord(null);
        setAuditLoadError(false);
        setCurrentPage(readPageFromUrl());
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!token || !user) {
      setRecentAudits([]);
      return;
    }
    fetchMyAudits(token)
      .then(setRecentAudits)
      .catch(() => setRecentAudits([]));
  }, [token, user, activeRecord]);

  const openRecord = (record: AuditExtractionRecord) => {
    setActiveRecord(record);
    setAuditLoadError(false);
    setCurrentPage('auditor');
    const targetUrl = `/?audit=${encodeURIComponent(record.auditId)}`;
    if (window.location.search !== `?audit=${encodeURIComponent(record.auditId)}`) {
      window.history.pushState({}, '', targetUrl);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPage = (page: PageView) => {
    setActiveRecord(null);
    setAuditLoadError(false);
    setCurrentPage(page);
    const targetUrl = page === 'home' ? '/' : `/?page=${page}`;
    window.history.pushState({}, '', targetUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToUpload = () => {
    setActiveRecord(null);
    setAuditLoadError(false);
    setCurrentPage('auditor');
    window.history.pushState({}, '', '/?page=audit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRunLiveSample = async () => {
    setLoadingAudit(true);
    setAuditLoadError(false);
    try {
      const extracted = await extractSampleContract('01_Predatory_IT_MSA_EN.docx', token);
      const analyzed = await analyzeAudit(extracted.auditId, token);
      openRecord(analyzed);
    } catch {
      setAuditLoadError(true);
    } finally {
      setLoadingAudit(false);
    }
  };

  const marqueeWords = isUk ? MARQUEE_ITEMS_UK : MARQUEE_ITEMS_EN;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-paper text-ink-primary">
      <Navbar
        currentPage={activeRecord ? 'auditor' : currentPage}
        onSelectPage={handleSelectPage}
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
        onOpenPricing={() => openPricingModal('general')}
        freeAuditsRemaining={isPaidUser ? 99 : Math.max(0, 3 - recentAudits.length)}
        isPaidUser={isPaidUser}
      />

      {loadingAudit ? (
        <main className="flex flex-1 items-center justify-center bg-paper px-4 py-20">
          <div className="flex items-center gap-3 rounded-xl border border-paper-border bg-white px-6 py-5 text-sm font-semibold text-ink-primary shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-signal" aria-hidden="true" />
            <span>{t.auditNotFound.loading}</span>
          </div>
        </main>
      ) : auditLoadError ? (
        <main className="flex-1 bg-paper px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-2xl rounded-xl border border-paper-border bg-white p-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
              <div>
                <h1 className="font-display text-2xl font-bold text-ink-primary">
                  {t.auditNotFound.title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {t.auditNotFound.description}
                </p>
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-forest-soft"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>{t.auditNotFound.backBtn}</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : activeRecord ? (
        <ResultsView
          record={activeRecord}
          onReset={resetToUpload}
          onOpenPricing={() => openPricingModal('general')}
        />
      ) : currentPage === 'home' ? (
        /* HOME / LANDING VIEW */
        <main className="flex-1">
          {/* Hero Section: Clean & Focused Presentation */}
          <section className="bg-forest text-white">
            <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
              {/* Kicker: Orange */}
              <p className="inline-block font-mono text-[11px] font-semibold uppercase tracking-widest text-signal sm:text-xs">
                {isUk ? 'ПІДПИСУЙТЕ З ВІДКРИТИМИ ОЧИМА' : 'SIGN WITH YOUR EYES OPEN'}
              </p>

              {/* Main Heading: Large White */}
              <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">
                {isUk ? (
                  <>
                    Перевірка та конструктор
                    <br />
                    договорів для ФОП.
                  </>
                ) : (
                  <>
                    Contract verification &amp;
                    <br />
                    builder for freelancers.
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-forest-muted sm:text-base">
                {isUk
                  ? 'Завантажте MSA, NDA чи SOW або зберіть договір з перевірених пунктів ФОП. За хвилину ви отримаєте рейтинг ризиків, пояснення простою мовою та готові формулювання для переговорів.'
                  : 'Upload an MSA, NDA or SOW — or assemble one from vetted FOP clauses. In about a minute you get every risky clause ranked, explained in plain words, with replacement wording you can send back.'}
              </p>

              {/* Action Buttons: Balanced layout on mobile */}
              <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectPage('auditor')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal px-6 py-3.5 text-xs font-bold text-white transition-colors hover:bg-signal-hover sm:w-auto"
                >
                  <FileCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{isUk ? 'Перевірити договір' : 'Audit contract'}</span>
                </button>

                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleSelectPage('reconcile')}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-forest-border bg-forest-deep px-3.5 py-3.5 text-xs font-semibold text-white transition-colors hover:border-white/30 hover:bg-forest-soft sm:flex-none sm:px-5"
                  >
                    <MessageSquareText className="h-4 w-4 text-forest-muted" aria-hidden="true" />
                    <span>{isUk ? 'Звірка з чатом' : 'Chat vs SOW'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPage('builder')}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-forest-border bg-forest-deep px-3.5 py-3.5 text-xs font-semibold text-white transition-colors hover:border-white/30 hover:bg-forest-soft sm:flex-none sm:px-5"
                  >
                    <Layers className="h-4 w-4 text-forest-muted" aria-hidden="true" />
                    <span>{isUk ? 'Зібрати договір' : 'Assemble contract'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Full-Width Signal Orange Marquee Ticker */}
          <div className="overflow-hidden bg-signal py-2.5 text-forest-deep">
            <div className="animate-cg-marquee font-mono text-xs font-bold tracking-widest">
              {[...marqueeWords, ...marqueeWords, ...marqueeWords].map((word, idx) => (
                <span key={idx} className="mx-3 inline-flex items-center gap-3 whitespace-nowrap">
                  <span>{word}</span>
                  <span aria-hidden="true">/</span>
                </span>
              ))}
            </div>
          </div>

          {/* Photo 1: Three steps, about a minute (Light Paper Section) */}
          <section id="how-it-works" className="bg-paper px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-primary sm:text-3xl">
                    {isUk ? 'Три кроки, близько хвилини' : 'Three steps, about a minute'}
                  </h2>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {isUk
                      ? 'Простий та зрозумілий процес для кожного IT-спеціаліста чи фрілансера.'
                      : 'Simple and fast workflow designed for freelancers and small teams.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectPage('auditor')}
                  className="inline-flex items-center gap-1.5 self-start font-mono text-xs font-semibold text-signal hover:underline sm:self-auto"
                >
                  <span>{isUk ? 'Спробувати зараз' : 'Try it now'}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                {(
                  [
                    [
                      '1',
                      isUk ? 'Завантажте' : 'Upload',
                      isUk
                        ? 'PDF, DOCX або контекст проєкту. Вкажіть свою сторону — Виконавець чи Замовник.'
                        : 'PDF, DOCX or project context. Say whether you are the contractor or the client.',
                    ],
                    [
                      '2',
                      isUk ? 'Прочитайте рейтинг' : 'Read the ranking',
                      isUk
                        ? 'Кожен пункт договору отримує рівень ризику, пояснення у двох реченнях та точну цитату.'
                        : 'Every clause gets a severity, a two-sentence summary and the exact words that worry us.',
                    ],
                    [
                      '3',
                      isUk ? 'Надішліть правки' : 'Push back',
                      isUk
                        ? 'Скопіюйте жорсткий, збалансований або м’який варіант правки й додайте у переговори.'
                        : 'Copy a firm, balanced or friendly counter-clause and send it with your comments.',
                    ],
                  ] as const
                ).map(([num, title, desc]) => (
                  <div
                    key={num}
                    className="rounded-xl border border-paper-border bg-white p-6 shadow-sm transition-all hover:border-paper-strong hover:shadow-md"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-forest font-mono text-xs font-bold text-white">
                      {num}
                    </span>
                    <h3 className="mt-4 font-display text-base font-bold text-ink-primary">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Photo 2: Dark Forest Privacy Section ("Your contract stays yours.") */}
          <section id="privacy" className="bg-forest px-4 py-14 text-white sm:px-6 sm:py-16">
            <div className="mx-auto max-w-5xl">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {isUk ? 'Ваш договір залишається вашим.' : 'Your contract stays yours.'}
              </h2>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-forest-border bg-forest-deep/60 p-5">
                  <h3 className="font-mono text-xs font-semibold text-[#52C48A]">
                    {isUk ? 'Видалення за 24 години' : 'Deleted after 24 hours'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-forest-muted">
                    {isUk
                      ? 'Завантажений файл та результати аналізу автоматично видаляються.'
                      : 'The file and the analysis are removed automatically.'}
                  </p>
                </div>
                <div className="rounded-xl border border-forest-border bg-forest-deep/60 p-5">
                  <h3 className="font-mono text-xs font-semibold text-[#52C48A]">
                    {isUk ? 'Шифрування на сервері' : 'Encrypted at rest'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-forest-muted">
                    {isUk
                      ? 'Файлове сховище та база даних зашифровані.'
                      : 'Storage and database are both encrypted.'}
                  </p>
                </div>
                <div className="rounded-xl border border-forest-border bg-forest-deep/60 p-5">
                  <h3 className="font-mono text-xs font-semibold text-[#52C48A]">
                    {isUk ? 'Без тексту в логах' : 'No text in logs'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-forest-muted">
                    {isUk
                      ? 'Текст вашого договору ніколи не записується у серверні логи.'
                      : 'Contract text is never written to our logs.'}
                  </p>
                </div>
              </div>

              {/* Bottom Quick CTA */}
              <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-xl border border-forest-border bg-forest-deep p-6 sm:flex-row sm:p-8">
                <div>
                  <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                    {isUk
                      ? 'Готові захистити свій договір?'
                      : 'Ready to audit your contract?'}
                  </h3>
                  <p className="mt-1 text-xs text-forest-muted sm:text-sm">
                    {isUk
                      ? 'Безкоштовно, без реєстрації та за лічені секунди.'
                      : 'Free, no credit card required, ready in seconds.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectPage('auditor')}
                  className="inline-flex shrink-0 items-center rounded-full bg-signal px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-signal-hover"
                >
                  <span>{isUk ? 'Почати аудит договору' : 'Start contract audit'}</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      ) : currentPage === 'auditor' ? (
        /* DEDICATED AUDIT PAGE */
        <main className="flex-1 bg-paper px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-forest">
                  {isUk ? 'ПЕРЕВІРКА ДОГОВОРІВ ДЛЯ ФОП · PDF / DOCX' : 'CONTRACT AUDIT WORKSPACE'}
                </p>
                <h1 className="mt-1 font-display text-2xl font-extrabold text-ink-primary sm:text-3xl">
                  {isUk ? 'Аудит договору' : 'Contract Audit'}
                </h1>
                <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
                  {isUk
                    ? 'Завантажте договір або відкрийте тестовий зразок для миттєвого пошуку ризиків.'
                    : 'Upload a contract or run a sample scan to identify financial and legal risks.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPage('home')}
                className="inline-flex self-start items-center gap-1.5 rounded-full border border-paper-border bg-white px-3.5 py-1.5 text-xs font-medium text-ink-secondary hover:border-paper-strong hover:text-ink-primary sm:self-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isUk ? 'На головну' : 'Back to Home'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              {/* Left: Upload Card */}
              <div className="rounded-xl border border-paper-border bg-white p-5 shadow-sm sm:p-6 lg:col-span-6">
                {user && recentAudits.length > 0 && (
                  <div className="mb-5 border-b border-paper-border pb-4">
                    <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      {t.recentAudits.title}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentAudits.slice(0, 4).map((item) => (
                        <button
                          key={item.auditId}
                          type="button"
                          onClick={() => void loadAuditFromId(item.auditId)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-paper-border bg-paper px-3 py-1 text-xs font-medium text-ink-primary hover:border-signal hover:text-signal"
                        >
                          <span className="max-w-[140px] truncate">{item.fileName}</span>
                          {item.overallRiskScore !== null && (
                            <span className="font-mono text-[10px] text-ink-muted">
                              {item.overallRiskScore}/100
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <UploadZone
                  onExtracted={openRecord}
                  auditsCount={user ? recentAudits.length : 0}
                  onOpenPricing={openPricingModal}
                  isPaid={isPaidUser}
                />
              </div>

              {/* Right: Live Clause Specimen */}
              <div className="rounded-xl border-2 border-forest/20 bg-white p-5 shadow-sm sm:p-6 lg:col-span-6 overflow-hidden">
                <LiveClauseSpecimen onRunSample={() => void handleRunLiveSample()} />
              </div>
            </div>
          </div>
        </main>
      ) : currentPage === 'reconcile' ? (
        /* DEDICATED RECONCILE PAGE (CHAT VS SOW) */
        <main className="flex-1 bg-paper px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-forest">
                  {isUk ? 'SOW VS MESSENGER · АНАЛІЗ РОЗБІЖНОСТЕЙ' : 'AGREED CHAT VS CONTRACT SOW'}
                </p>
                <h1 className="mt-1 font-display text-2xl font-extrabold text-ink-primary sm:text-3xl">
                  {isUk ? 'Звірка переписки з договором' : 'Reconciliation: Chat vs SOW'}
                </h1>
                <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
                  {isUk
                    ? 'Порівняйте текст домовленостей у Slack, Telegram чи Upwork з фінальним SOW або MSA.'
                    : 'Compare agreed notes from chats against the drafted SOW to catch hidden discrepancies.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPage('home')}
                className="inline-flex self-start items-center gap-1.5 rounded-full border border-paper-border bg-white px-3.5 py-1.5 text-xs font-medium text-ink-secondary hover:border-paper-strong hover:text-ink-primary sm:self-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isUk ? 'На головну' : 'Back to Home'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-paper-border bg-white p-5 shadow-sm sm:p-7">
              <SowReconciliationView onOpenAuditRecord={openRecord} />
            </div>
          </div>
        </main>
      ) : (
        /* DEDICATED CONTRACT BUILDER PAGE */
        <main className="flex-1 bg-paper px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-forest">
                  {isUk ? 'КОНСТРУКТОР ДОГОВОРІВ ДЛЯ ФОП · ПЕРЕВІРЕНІ ПУНКТИ' : 'VETTED B2B CONTRACT BUILDER'}
                </p>
                <h1 className="mt-1 font-display text-2xl font-extrabold text-ink-primary sm:text-3xl">
                  {isUk ? 'Зібрати безпечний договір' : 'Contract Builder for FOP'}
                </h1>
                <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
                  {isUk
                    ? '3 прості кроки: виберіть умови та шаблон, налаштуйте параметри і завантажте готовий договір.'
                    : '3 simple steps: choose terms and template, review parameters, and download a vetted contract.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPage('home')}
                className="inline-flex self-start items-center gap-1.5 rounded-full border border-paper-border bg-white px-3.5 py-1.5 text-xs font-medium text-ink-secondary hover:border-paper-strong hover:text-ink-primary sm:self-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isUk ? 'На головну' : 'Back to Home'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-paper-border bg-white p-5 shadow-sm sm:p-7">
              <ContractBuilderView onOpenPricing={openPricingModal} isPro={isPaidUser} />
            </div>
          </div>
        </main>
      )}

      {/* Light Paper Footer */}
      <footer className="border-t border-paper-border bg-paper px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <p className="text-xs text-ink-muted">{t.disclaimerBanner}</p>
        </div>
      </footer>

      <AuthModal
        isOpen={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
      />

      <PricingModal
        isOpen={pricingModal.open}
        reason={pricingModal.reason}
        currentPlan={userPlan}
        onActivatePlan={(p) => setUserPlan(p)}
        onClose={() => setPricingModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainShell />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
