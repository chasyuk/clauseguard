import React, { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [50, 100, 200];

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const { t, lang } = useLanguage();
  const [selectedUah, setSelectedUah] = useState<number>(100);
  const [openedJar, setOpenedJar] = useState(false);

  if (!isOpen) return null;

  const jarUrl =
    (import.meta.env.VITE_MONOBANK_JAR_URL as string | undefined) ||
    'https://send.monobank.ua/jar/8D84Pi88MN';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-modal-title"
    >
      <div className="w-full max-w-md rounded-lg border border-surface-strong bg-surface-card p-6">
        <div className="flex items-start justify-between border-b border-surface-border pb-3">
          <h2 id="donate-modal-title" className="font-display text-lg font-bold text-ink-primary">
            {t.donation.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.donation.close}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-paper-soft hover:text-ink-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{t.donation.description}</p>

        <div className="mt-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            {t.donation.suggested}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setSelectedUah(amount);
                  setOpenedJar(false);
                }}
                className={`rounded-md border px-3 py-2 font-mono text-xs font-medium transition-colors ${
                  selectedUah === amount
                    ? 'border-brand bg-brand-subtle text-brand-text'
                    : 'border-surface-border bg-surface-bg text-ink-primary hover:bg-surface-subtle'
                }`}
              >
                {amount} UAH
              </button>
            ))}
          </div>
        </div>

        {openedJar && (
          <div className="mt-4 rounded-md border border-risk-lowBorder bg-risk-lowBg px-3 py-2 text-xs text-risk-lowText">
            {lang === 'uk'
              ? `Відкрито посилання на Монобанку (${selectedUah} грн). Дякуємо за підтримку.`
              : `Opened configurable Monobank Jar (${selectedUah} UAH). Thank you.`}
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          <a
            href={jarUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpenedJar(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-signal-hover"
          >
            <span>
              {t.donation.openJar} ({selectedUah} UAH)
            </span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-surface-border px-3 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-paper-soft hover:text-ink-primary"
          >
            {t.donation.close}
          </button>
        </div>
      </div>
    </div>
  );
};
