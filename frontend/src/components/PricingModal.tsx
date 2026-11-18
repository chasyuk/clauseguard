import React from 'react';
import {
  X,
  Check,
  Sparkles,
  ShieldCheck,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export type PricingReason = 'audit_limit' | 'builder' | 'general';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: PricingReason;
}

const MONOBANK_JAR_URL = 'https://send.monobank.ua/jar/8D84Pi88MN';

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  reason = 'general',
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isUk = lang === 'uk';

  if (!isOpen) return null;

  const handlePay = (plan: 'pro' | 'single') => {
    const amount = plan === 'pro' ? 499 : 199;
    const comment = encodeURIComponent(
      `ClauseGuard ${plan.toUpperCase()}: ${user?.email || 'user'}`
    );
    window.open(`${MONOBANK_JAR_URL}?text=${comment}&amount=${amount}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
    >
      <div className="relative my-8 w-full max-w-3xl rounded-2xl border border-paper-border bg-white p-6 shadow-2xl sm:p-8">
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
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>{isUk ? 'ТАРИФНІ ПЛАНИ' : 'PRICING & TIERS'}</span>
          </div>

          <h2
            id="pricing-modal-title"
            className="mt-2.5 font-display text-2xl font-extrabold text-ink-primary sm:text-3xl"
          >
            {reason === 'audit_limit'
              ? isUk
                ? 'Ліміт безкоштовних перевірок вичерпано'
                : 'Free audit limit reached'
              : reason === 'builder'
                ? isUk
                  ? 'Конструктор договорів (ClauseGuard Pro)'
                  : 'Contract Builder (ClauseGuard Pro)'
                : isUk
                  ? 'Оберіть план захисту ваших контрактів'
                  : 'Choose your contract protection plan'}
          </h2>

          <p className="mt-2 text-sm text-ink-secondary">
            {reason === 'audit_limit'
              ? isUk
                ? 'На цьому акаунті використано всі 3 безкоштовні перевірки. Оформіть підписку Pro для безлімітного аудиту або придбайте разовий доступ.'
                : 'You have used all 3 free contract audits on this account. Upgrade to Pro for unlimited audits or buy a single pass.'
              : reason === 'builder'
                ? isUk
                  ? 'Складання юридично вивірених договорів (MSA, SOW, NDA) за захисними пунктами ФОП доступне у тарифі Pro або за разовим пакетом.'
                  : 'Assembling and exporting verified B2B contracts (.docx/.pdf) is available with ClauseGuard Pro or single pass.'
                : isUk
                  ? '3 безкоштовні перевірки на акаунт. Конструктор договорів та необмежений аудит — у тарифі Pro.'
                  : '3 free audits per account. Contract builder and unlimited scans available in Pro.'}
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Free Tier */}
          <div className="flex flex-col justify-between rounded-xl border border-paper-border bg-paper/40 p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {isUk ? 'Безкоштовний' : 'Free Tier'}
                </span>
                <span className="rounded bg-paper px-2 py-0.5 text-[10px] font-medium text-ink-secondary border border-paper-border">
                  {isUk ? 'Поточний' : 'Current'}
                </span>
              </div>

              <div className="mt-3">
                <span className="font-display text-2xl font-extrabold text-ink-primary">0 ₴</span>
                <span className="text-xs text-ink-muted"> / {isUk ? 'назавжди' : 'forever'}</span>
              </div>

              <p className="mt-2 text-xs text-ink-secondary">
                {isUk ? 'Базове знайомство з аналізом контрактів' : 'Basic evaluation of contract risks'}
              </p>

              <ul className="mt-4 space-y-2 text-xs text-ink-primary">
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-forest" />
                  <span>{isUk ? '3 безкоштовні перевірки на акаунт' : '3 free audits per account'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-forest" />
                  <span>{isUk ? 'Аналіз 16 комерційних ризиків' : 'Scan 16 commercial risks'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-forest" />
                  <span>{isUk ? 'Шифрування та авто-видалення 24h' : 'Encrypted & 24h auto-delete'}</span>
                </li>
                <li className="flex items-start gap-2 text-ink-muted">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                  <span>{isUk ? 'Конструктор договорів (закрито)' : 'Contract Builder (locked)'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                disabled
                className="w-full rounded-lg border border-paper-border bg-paper py-2 text-xs font-semibold text-ink-muted cursor-not-allowed text-center"
              >
                {isUk ? 'Ваш тариф' : 'Current Plan'}
              </button>
            </div>
          </div>

          {/* Card 2: PRO (Featured) */}
          <div className="relative flex flex-col justify-between rounded-xl border-2 border-forest bg-forest text-white p-5 shadow-lg">
            <div className="absolute -top-3 right-4 rounded-full bg-signal px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
              {isUk ? 'Найпопулярніший' : 'Most Popular'}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-signal" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-signal">
                  ClauseGuard Pro
                </span>
              </div>

              <div className="mt-3">
                <span className="font-display text-3xl font-extrabold text-white">499 ₴</span>
                <span className="text-xs text-white/70"> / {isUk ? 'місяць' : 'month'}</span>
              </div>

              <p className="mt-2 text-xs text-white/80">
                {isUk ? 'Повний захист для IT-фахівців, фрілансерів та агенцій' : 'Full protection for contractors and agencies'}
              </p>

              <ul className="mt-4 space-y-2 text-xs text-white/90">
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-signal" />
                  <span className="font-medium">
                    {isUk ? '⭐ Повний Конструктор договорів' : '⭐ Full Contract Builder'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-signal" />
                  <span>{isUk ? '⭐ Експорт готових .docx та .pdf' : '⭐ Export ready .docx and .pdf'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-signal" />
                  <span>{isUk ? '⭐ Необмежений аудит контрактів' : '⭐ Unlimited contract scans'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-signal" />
                  <span>{isUk ? '⭐ Звірка SOW з чатом (Messenger)' : '⭐ SOW vs Chat reconciliation'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-signal" />
                  <span>{isUk ? '⭐ Двомовні версії (UA / EN)' : '⭐ Bilingual agreements (UA / EN)'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => handlePay('pro')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-signal py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-signal-hover"
              >
                <span>{isUk ? 'Підключити Pro (499 ₴)' : 'Upgrade to Pro (499 ₴)'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Single Pass */}
          <div className="flex flex-col justify-between rounded-xl border border-paper-border bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {isUk ? 'Разовий договір' : 'Single Pass'}
                </span>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                  {isUk ? 'Без підписки' : 'One-time'}
                </span>
              </div>

              <div className="mt-3">
                <span className="font-display text-2xl font-extrabold text-ink-primary">199 ₴</span>
                <span className="text-xs text-ink-muted"> / {isUk ? 'разово' : 'one-time'}</span>
              </div>

              <p className="mt-2 text-xs text-ink-secondary">
                {isUk ? 'Коли потрібно терміново оформити одну конкретну угоду' : 'Single deal drafting or checking'}
              </p>

              <ul className="mt-4 space-y-2 text-xs text-ink-primary">
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-forest" />
                  <span>{isUk ? '1 зібраний договір у Конструкторі' : '1 assembled contract in Builder'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-forest" />
                  <span>{isUk ? 'Завантаження .docx та .pdf' : 'Download .docx and .pdf'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-forest" />
                  <span>{isUk ? 'АБО 3 додаткові перевірки' : 'OR 3 additional audits'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-forest" />
                  <span>{isUk ? 'Захисні 16 пунктів для ФОП' : 'Vetted 16 FOP clauses'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => handlePay('single')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-paper-strong bg-paper py-2 text-xs font-bold text-ink-primary transition-colors hover:border-forest hover:bg-white"
              >
                <span>{isUk ? 'Оформити разово (199 ₴)' : 'Get Single Pass (199 ₴)'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-paper-border pt-4 text-xs text-ink-muted sm:flex-row sm:items-center">
          <p>
            {isUk
              ? '💳 Оплата через офіційну банку Monobank. Вкажіть ваш email у призначенні платежу.'
              : '💳 Secure payment via Monobank Jar. Please provide your email in the payment comment.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="self-start text-xs font-medium text-ink-secondary hover:text-ink-primary sm:self-auto"
          >
            {isUk ? 'Повернутися до роботи' : 'Back to workspace'}
          </button>
        </div>
      </div>
    </div>
  );
};
