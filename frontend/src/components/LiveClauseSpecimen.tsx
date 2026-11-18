import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SampleBarItem {
  id: string;
  clause: string;
  labelEn: string;
  labelUk: string;
  severity: 'Critical' | 'Medium' | 'Low';
  severityUk: string;
  widthPct: number;
  excerptEn: string;
  excerptUk: string;
  fixEn: string;
  fixUk: string;
}

const SAMPLE_BARS: SampleBarItem[] = [
  {
    id: 'pay',
    clause: '§ 4.2',
    labelEn: 'Payment',
    labelUk: 'Оплата',
    severity: 'Critical',
    severityUk: 'Критично',
    widthPct: 86,
    excerptEn: 'Invoices are payable within ninety (90) days of receipt.',
    excerptUk: 'Оплата рахунків здійснюється протягом 90 днів з моменту отримання.',
    fixEn: 'Cut payment window from Net 90 to Net 14 + statutory late interest.',
    fixUk: 'Скоротіть строк оплати з 90 до 14 календарних днів + пеня за прострочення.',
  },
  {
    id: 'ip',
    clause: '§ 5.1',
    labelEn: 'IP rights',
    labelUk: 'Права IP',
    severity: 'Critical',
    severityUk: 'Критично',
    widthPct: 78,
    excerptEn: 'All work product, including pre-existing tools, becomes Client property.',
    excerptUk: 'Усі результати, включно з попередніми інструментами, переходять Замовнику.',
    fixEn: 'Keep pre-existing tools; transfer deliverable IP only after 100% payment.',
    fixUk: 'Залиште власні бібліотеки за ФОП; передача IP — лише після 100% оплати.',
  },
  {
    id: 'liab',
    clause: '§ 9.2',
    labelEn: 'Liability',
    labelUk: 'Відповід.',
    severity: 'Medium',
    severityUk: 'Середньо',
    widthPct: 54,
    excerptEn: "Contractor's liability is unlimited for any claim arising from services.",
    excerptUk: 'Відповідальність Виконавця є необмеженою за будь-якими вимогами.',
    fixEn: 'Cap total liability at fees paid in the preceding 12 months.',
    fixUk: 'Обмежте відповідальність сумою фактично отриманої винагороди.',
  },
  {
    id: 'scope',
    clause: '§ 3.4',
    labelEn: 'Scope',
    labelUk: 'Скоуп',
    severity: 'Medium',
    severityUk: 'Середньо',
    widthPct: 44,
    excerptEn: 'Revisions and additional features as requested by Client without cap.',
    excerptUk: 'Доопрацювання та правки за запитом Замовника без обмеження кількості.',
    fixEn: 'Limit to 2 revision rounds; out-of-scope work requires a signed Change Order.',
    fixUk: 'Обмежте 2 раундами правок; додатковий функціонал — окремим Change Order.',
  },
  {
    id: 'exit',
    clause: '§ 7.3',
    labelEn: 'Exit',
    labelUk: 'Вихід',
    severity: 'Low',
    severityUk: 'Низько',
    widthPct: 24,
    excerptEn: 'Client may terminate immediately; Contractor owes 60 days notice.',
    excerptUk: 'Замовник може розірвати миттєво, а Виконавець — за 60 днів.',
    fixEn: 'Make termination mutual with 14-day notice and payment for work completed.',
    fixUk: 'Зробіть розірвання взаємним (14 днів) з оплатою виконаного обсягу.',
  },
  {
    id: 'law',
    clause: '§ 12',
    labelEn: 'Law',
    labelUk: 'Право',
    severity: 'Low',
    severityUk: 'Низько',
    widthPct: 14,
    excerptEn: 'Governed by the laws of Delaware, USA.',
    excerptUk: 'Застосовне право — штат Делавер, США.',
    fixEn: 'Acceptable if payment is USD wire, or request neutral arbitration.',
    fixUk: 'Прийнятно для міжнародного B2B за умови чіткого валютного розрахунку.',
  },
];

interface LiveClauseSpecimenProps {
  onRunSample?: () => void;
}

export const LiveClauseSpecimen: React.FC<LiveClauseSpecimenProps> = ({ onRunSample }) => {
  const { lang } = useLanguage();
  const isUk = lang === 'uk';
  const [selectedId, setSelectedId] = useState<string>('pay');

  const active = SAMPLE_BARS.find((b) => b.id === selectedId) ?? SAMPLE_BARS[0];

  const barColor = (sev: SampleBarItem['severity']) => {
    if (sev === 'Critical') return 'bg-signal';
    if (sev === 'Medium') return 'bg-[#EAB308]';
    return 'bg-[#52C48A]';
  };

  return (
    <div className="rounded-xl border border-forest-border bg-forest-deep/90 p-5 text-white shadow-2xl shadow-black/25">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-forest-border pb-3 font-mono text-[11px] uppercase tracking-wider text-forest-muted">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#52C48A]" aria-hidden="true" />
          <span>
            {isUk
              ? 'ЗРАЗОК АНАЛІЗУ · 9 ПУНКТІВ · ЗА РИЗИКОМ'
              : 'SAMPLE SCAN · 9 CLAUSES · SORTED BY RISK'}
          </span>
        </div>
      </div>

      {/* Interactive Bars */}
      <div className="mt-4 space-y-2.5">
        {SAMPLE_BARS.map((item, idx) => {
          const isSelected = item.id === active.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              onMouseEnter={() => setSelectedId(item.id)}
              className={`group flex w-full items-center gap-3 rounded-md px-2 py-1 text-left transition-colors ${
                isSelected ? 'bg-forest-card/80' : 'hover:bg-forest-card/40'
              }`}
            >
              <span className="w-28 shrink-0 truncate font-mono text-xs text-white/90">
                {item.clause} {isUk ? item.labelUk : item.labelEn}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-forest-soft">
                <div
                  className={`animate-cg-bar h-full rounded-full ${barColor(item.severity)}`}
                  style={{
                    width: `${item.widthPct}%`,
                    animationDelay: `${idx * 70}ms`,
                  }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] text-forest-muted">
                {isUk ? item.severityUk : item.severity}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Interactive Clause Inspector (Fixed Height) */}
      <div className="mt-4 flex h-[138px] flex-col justify-between overflow-hidden rounded-lg border border-forest-border bg-forest-card/60 p-3.5 transition-all sm:h-[126px]">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-forest-muted">
          <span>
            {active.clause} · {isUk ? active.labelUk : active.labelEn}
          </span>
          <span
            className={
              active.severity === 'Critical'
                ? 'text-signal'
                : active.severity === 'Medium'
                  ? 'text-[#FACC15]'
                  : 'text-[#52C48A]'
            }
          >
            {isUk ? active.severityUk : active.severity}
          </span>
        </div>
        <p className="mt-1.5 font-mono text-xs text-white/85">
          “{isUk ? active.excerptUk : active.excerptEn}”
        </p>
        <p className="mt-2 text-xs text-[#86EFAC]">
          → {isUk ? active.fixUk : active.fixEn}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-forest-border pt-3">
        <p className="text-xs text-forest-muted">
          {isUk
            ? 'Довша смужка — вищий ризик. Найнебезпечніші пункти зверху.'
            : 'Longer bar, bigger risk. You see the worst clauses first.'}
        </p>
        {onRunSample && (
          <button
            type="button"
            onClick={onRunSample}
            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-signal transition-colors hover:text-white"
          >
            <span>{isUk ? 'Відкрити повний звіт' : 'Run live sample'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
