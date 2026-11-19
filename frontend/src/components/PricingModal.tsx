import React, { useState } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export type PricingReason = 'audit_limit' | 'builder' | 'general';
export type PlanTier = 'free' | 'pro' | 'single';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: PricingReason;
  currentPlan?: PlanTier;
  onActivatePlan?: (plan: PlanTier) => void;
}

const MONOBANK_JAR_URL = 'https://send.monobank.ua/jar/8D84Pi88MN';

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  reason = 'general',
  currentPlan = 'single',
  onActivatePlan,
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isUk = lang === 'uk';
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(currentPlan || 'single');
  const [justActivated, setJustActivated] = useState<PlanTier | null>(null);

  if (!isOpen) return null;

  const handlePay = (plan: PlanTier) => {
    if (plan === 'free') {
      onClose();
      return;
    }
    const amount = plan === 'pro' ? 499 : 199;
    const comment = encodeURIComponent(
      `ClauseGuard ${plan.toUpperCase()}: ${user?.email || 'user'}`
    );
    window.open(
      `${MONOBANK_JAR_URL}?text=${comment}&amount=${amount}`,
      '_blank',
      'noopener,noreferrer'
    );
    const accountKey = user?.email ? `cg_plan_${user.email.toLowerCase()}` : 'cg_plan_guest';
    localStorage.setItem(accountKey, plan);
    onActivatePlan?.(plan);
    setJustActivated(plan);
  };

  const handleManualConfirm = (plan: PlanTier = 'single') => {
    const accountKey = user?.email ? `cg_plan_${user.email.toLowerCase()}` : 'cg_plan_guest';
    localStorage.setItem(accountKey, plan);
    onActivatePlan?.(plan);
    setJustActivated(plan);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
    >
      <div className="relative my-8 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-paper-border bg-white p-5 shadow-2xl sm:p-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-muted hover:bg-paper hover:text-ink-primary"
          aria-label={isUk ? 'Закрити' : 'Close'}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center sm:text-left">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-forest">
            {isUk ? 'ТАРИФНІ ПЛАНИ' : 'PRICING & TIERS'}
          </div>

          <h2
            id="pricing-modal-title"
            className="mt-1.5 font-display text-2xl font-extrabold text-ink-primary sm:text-3xl"
          >
            {reason === 'audit_limit'
              ? isUk
                ? 'Ліміт безкоштовних перевірок вичерпано'
                : 'Free audit limit reached'
              : reason === 'builder'
                ? isUk
                  ? 'Конструктор договорів (тариф Pro)'
                  : 'Contract Builder (Pro feature)'
                : isUk
                  ? 'Оберіть план захисту ваших контрактів'
                  : 'Choose your contract protection plan'}
          </h2>

          <p className="mt-2 text-sm text-ink-secondary">
            {reason === 'audit_limit'
              ? isUk
                ? 'На цьому акаунті використано всі 3 безкоштовні перевірки. Оформіть підписку Pro для безлімітного аудиту або оберіть разовий пакет.'
                : 'You have used all 3 free contract audits on this account. Upgrade to Pro for unlimited audits or choose a single pass.'
              : reason === 'builder'
                ? isUk
                  ? 'Складання юридично вивірених договорів (MSA, SOW, NDA) за захисними пунктами ФОП доступне у тарифі Pro або за разовим пакетом.'
                  : 'Assembling and exporting verified B2B contracts (.docx/.pdf) is available with ClauseGuard Pro or single pass.'
                : isUk
                  ? '3 безкоштовні перевірки на акаунт. Конструктор договорів та необмежений аудит — у тарифі Pro.'
                  : '3 free audits per account. Contract builder and unlimited scans available in Pro.'}
          </p>
        </div>

        {justActivated && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-xs">
            <Check className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="text-xs">
              <span className="font-bold">
                {isUk ? 'Тариф успішно активовано!' : 'Plan successfully activated!'}
              </span>{' '}
              {isUk
                ? 'Конструктор договорів та додаткові перевірки розблоковано. Повертайтеся до роботи.'
                : 'Contract builder and audits unlocked. You can return to work.'}
            </div>
          </div>
        )}

        {/* 3 Pricing Cards with Dynamic Selection Color */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Free Tier */}
          <div
            onClick={() => setSelectedPlan('free')}
            className={`flex cursor-pointer flex-col justify-between rounded-xl border p-5 transition-all ${
              selectedPlan === 'free'
                ? 'border-2 border-forest bg-forest text-white shadow-lg ring-2 ring-forest/20'
                : 'border-paper-border bg-paper/40 text-ink-primary hover:border-paper-strong hover:bg-paper/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-xs font-semibold uppercase tracking-wider ${
                    selectedPlan === 'free' ? 'text-white/80' : 'text-ink-muted'
                  }`}
                >
                  {isUk ? 'Безкоштовний' : 'Free Tier'}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                    selectedPlan === 'free'
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-paper-border bg-paper text-ink-secondary'
                  }`}
                >
                  {isUk ? 'Поточний' : 'Current'}
                </span>
              </div>

              <div className="mt-3">
                <span
                  className={`font-display text-2xl font-extrabold ${
                    selectedPlan === 'free' ? 'text-white' : 'text-ink-primary'
                  }`}
                >
                  0 ₴
                </span>
                <span
                  className={`text-xs ${
                    selectedPlan === 'free' ? 'text-white/70' : 'text-ink-muted'
                  }`}
                >
                  {' '}
                  / {isUk ? 'назавжди' : 'forever'}
                </span>
              </div>

              <p
                className={`mt-2 text-xs ${
                  selectedPlan === 'free' ? 'text-white/80' : 'text-ink-secondary'
                }`}
              >
                {isUk
                  ? 'Базове знайомство з аналізом контрактів'
                  : 'Basic evaluation of contract risks'}
              </p>

              <ul
                className={`mt-4 space-y-2 text-xs ${
                  selectedPlan === 'free' ? 'text-white/90' : 'text-ink-primary'
                }`}
              >
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'free' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? '3 безкоштовні перевірки на акаунт'
                      : '3 free audits per account'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'free' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'Аналіз 16 комерційних ризиків'
                      : 'Scan 16 commercial risks'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'free' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'Шифрування та авто-видалення 24h'
                      : 'Encrypted & 24h auto-delete'}
                  </span>
                </li>
                <li
                  className={`flex items-start gap-2 ${
                    selectedPlan === 'free' ? 'text-white/50' : 'text-ink-muted'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {isUk
                      ? 'Конструктор договорів (закрито)'
                      : 'Contract Builder (locked)'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan('free');
                  onClose();
                }}
                className={`w-full rounded-lg py-2 text-xs font-semibold text-center transition-colors ${
                  selectedPlan === 'free'
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'border border-paper-border bg-paper text-ink-muted hover:bg-paper-soft'
                }`}
              >
                {selectedPlan === 'free'
                  ? isUk
                    ? 'Обрано (Поточний)'
                    : 'Selected (Current)'
                  : isUk
                    ? 'Ваш тариф'
                    : 'Current Plan'}
              </button>
            </div>
          </div>

          {/* Card 2: PRO */}
          <div
            onClick={() => setSelectedPlan('pro')}
            className={`flex cursor-pointer flex-col justify-between rounded-xl border p-5 transition-all ${
              selectedPlan === 'pro'
                ? 'border-2 border-forest bg-forest text-white shadow-xl ring-2 ring-forest/20'
                : 'border-paper-border bg-white text-ink-primary hover:border-paper-strong hover:bg-paper/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck
                    className={`h-4 w-4 ${
                      selectedPlan === 'pro' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span
                    className={`font-mono text-xs font-bold uppercase tracking-wider ${
                      selectedPlan === 'pro' ? 'text-signal' : 'text-forest'
                    }`}
                  >
                    ClauseGuard Pro
                  </span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                    selectedPlan === 'pro'
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-paper-border bg-paper text-ink-secondary'
                  }`}
                >
                  {isUk ? 'Щомісячно' : 'Monthly'}
                </span>
              </div>

              <div className="mt-3">
                <span
                  className={`font-display text-3xl font-extrabold ${
                    selectedPlan === 'pro' ? 'text-white' : 'text-ink-primary'
                  }`}
                >
                  499 ₴
                </span>
                <span
                  className={`text-xs ${
                    selectedPlan === 'pro' ? 'text-white/70' : 'text-ink-muted'
                  }`}
                >
                  {' '}
                  / {isUk ? 'місяць' : 'month'}
                </span>
              </div>

              <p
                className={`mt-2 text-xs ${
                  selectedPlan === 'pro' ? 'text-white/80' : 'text-ink-secondary'
                }`}
              >
                {isUk
                  ? 'Повний захист для IT-фахівців, фрілансерів та агенцій'
                  : 'Full protection for contractors and agencies'}
              </p>

              <ul
                className={`mt-4 space-y-2 text-xs ${
                  selectedPlan === 'pro' ? 'text-white/90' : 'text-ink-primary'
                }`}
              >
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'pro' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span className="font-medium">
                    {isUk
                      ? 'Повний Конструктор договорів'
                      : 'Full Contract Builder'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'pro' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'Експорт готових .docx та .pdf'
                      : 'Export ready .docx and .pdf'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'pro' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'Необмежений аудит контрактів'
                      : 'Unlimited contract scans'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'pro' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'Звірка SOW з чатом (Messenger)'
                      : 'SOW vs Chat reconciliation'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'pro' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'Двомовні версії (UA / EN)'
                      : 'Bilingual agreements (UA / EN)'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePay('pro');
                }}
                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
                  selectedPlan === 'pro'
                    ? 'bg-signal text-white shadow-md hover:bg-signal-hover'
                    : 'border border-forest bg-forest text-white hover:bg-forest-soft'
                }`}
              >
                <span>
                  {isUk ? 'Підключити Pro (499 ₴)' : 'Upgrade to Pro (499 ₴)'}
                </span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Single Pass */}
          <div
            onClick={() => setSelectedPlan('single')}
            className={`flex cursor-pointer flex-col justify-between rounded-xl border p-5 transition-all ${
              selectedPlan === 'single'
                ? 'border-2 border-forest bg-forest text-white shadow-xl ring-2 ring-forest/20'
                : 'border-paper-border bg-white text-ink-primary hover:border-paper-strong hover:bg-paper/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-xs font-semibold uppercase tracking-wider ${
                    selectedPlan === 'single' ? 'text-white/80' : 'text-ink-muted'
                  }`}
                >
                  {isUk ? 'Разовий договір' : 'Single Pass'}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                    selectedPlan === 'single'
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-paper-border bg-paper text-ink-secondary'
                  }`}
                >
                  {isUk ? 'Разово' : 'One-time'}
                </span>
              </div>

              <div className="mt-3">
                <span
                  className={`font-display text-2xl font-extrabold ${
                    selectedPlan === 'single' ? 'text-white' : 'text-ink-primary'
                  }`}
                >
                  199 ₴
                </span>
                <span
                  className={`text-xs ${
                    selectedPlan === 'single' ? 'text-white/70' : 'text-ink-muted'
                  }`}
                >
                  {' '}
                  / {isUk ? 'разово' : 'one-time'}
                </span>
              </div>

              <p
                className={`mt-2 text-xs ${
                  selectedPlan === 'single' ? 'text-white/80' : 'text-ink-secondary'
                }`}
              >
                {isUk
                  ? 'Коли потрібно терміново оформити одну конкретну угоду'
                  : 'Single deal drafting or checking'}
              </p>

              <ul
                className={`mt-4 space-y-2 text-xs ${
                  selectedPlan === 'single' ? 'text-white/90' : 'text-ink-primary'
                }`}
              >
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'single' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? '1 зібраний договір у Конструкторі'
                      : '1 assembled contract in Builder'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'single' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'Завантаження .docx та .pdf'
                      : 'Download .docx and .pdf'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'single' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'АБО 3 додаткові перевірки'
                      : 'OR 3 additional audits'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedPlan === 'single' ? 'text-signal' : 'text-forest'
                    }`}
                  />
                  <span>
                    {isUk
                      ? 'Захисні 16 пунктів для ФОП'
                      : 'Vetted 16 FOP clauses'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePay('single');
                }}
                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
                  selectedPlan === 'single'
                    ? 'bg-signal text-white shadow-md hover:bg-signal-hover'
                    : 'border border-paper-strong bg-paper text-ink-primary hover:border-forest hover:bg-white'
                }`}
              >
                <span>
                  {isUk
                    ? 'Оформити разово (199 ₴)'
                    : 'Get Single Pass (199 ₴)'}
                </span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-paper-border pt-4 text-xs text-ink-muted sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <p>
              {isUk
                ? '💳 Оплата через офіційну банку Monobank.'
                : '💳 Secure payment via Monobank Jar.'}
            </p>
            <button
              type="button"
              onClick={() => handleManualConfirm('single')}
              className="inline-flex items-center gap-1 font-bold text-forest underline hover:text-signal"
            >
              <span>
                {isUk
                  ? 'Вже переказали 199 ₴? Розблокувати доступ негайно →'
                  : 'Already paid 199 ₴? Unlock access now →'}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-lg bg-forest px-4 py-1.5 text-xs font-semibold text-white hover:bg-forest-soft sm:self-auto"
          >
            {isUk ? 'Повернутися до роботи' : 'Back to workspace'}
          </button>
        </div>
      </div>
    </div>
  );
};
