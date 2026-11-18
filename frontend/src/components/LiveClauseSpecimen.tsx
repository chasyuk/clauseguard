import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface SampleClauseItem {
  id: string;
  clause: string;
  titleEn: string;
  titleUk: string;
  severity: 'Critical' | 'Medium' | 'Low';
  severityUk: string;
  severityEn: string;
  summaryUk: string;
  summaryEn: string;
  excerptUk: string;
  excerptEn: string;
  riskNoteUk: string;
  riskNoteEn: string;
  fixUk: string;
  fixEn: string;
}

export const SAMPLE_CLAUSES: SampleClauseItem[] = [
  {
    id: 'pay',
    clause: '§ 4.2',
    titleUk: 'Порядок розрахунків (Net 90)',
    titleEn: 'Payment Terms (Net 90)',
    severity: 'Critical',
    severityUk: 'Критичний ризик',
    severityEn: 'Critical Risk',
    summaryUk: 'Net 90 днів без авансу та пені',
    summaryEn: 'Net 90 payment window with no advance or pause rights',
    excerptUk:
      '«Оплата наданих Послуг здійснюється Замовником протягом 90 (дев\'яноста) банківських днів після підписання Акта прийому-передачі без нарахування штрафних санкцій.»',
    excerptEn:
      '“Invoices are payable within ninety (90) business days following receipt and client acceptance of deliverables, without interest or penalty.”',
    riskNoteUk:
      'Замовник безкоштовно кредитується за ваш рахунок на 3 місяці. У разі касового розриву або зміни пріоритетів клієнта ви ризикуєте взагалі не отримати кошти за виконану роботу.',
    riskNoteEn:
      'The client receives 3 months of interest-free credit at your expense. Severe non-payment risk if the client pivots or encounters cashflow deficits.',
    fixUk:
      '«Оплата рахунків здійснюється протягом 14 календарних днів з моменту виставлення інвойсу. У разі затримки понад 5 днів нараховується пеня 0.1% за кожен день прострочення з правом призупинити послуги.»',
    fixEn:
      '“Invoices are payable within fourteen (14) calendar days of receipt. Late payments incur 0.1% daily statutory interest with the Contractor’s right to suspend services.”',
  },
  {
    id: 'ip',
    clause: '§ 5.1',
    titleUk: 'Інтелектуальна власність',
    titleEn: 'Intellectual Property (IP)',
    severity: 'Critical',
    severityUk: 'Критичний ризик',
    severityEn: 'Critical Risk',
    summaryUk: 'Відчуження pre-existing коду та бібліотек',
    summaryEn: 'Assignment of reusable tools and pre-existing code',
    excerptUk:
      '«Усі результати робіт, включно з попередніми бібліотеками, утилітами та напрацюваннями Виконавця, переходять у виключну власність Замовника з моменту створення.»',
    excerptEn:
      '“All work product, including Contractor\'s pre-existing software tools, frameworks, and reusable libraries, shall become sole Client property upon creation.”',
    riskNoteUk:
      'Ви юридично втрачаєте право повторно використовувати власний код, скрипти та модулі для інших проєктів. Ризик претензій від клієнта на ваш же базовий стек.',
    riskNoteEn:
      'You permanently surrender rights to your own foundational tooling, preventing reuse in future client engagements.',
    fixUk:
      '«Власні модулі та попередні інструменти (Pre-existing IP) залишаються власністю Виконавця; Замовник отримує невиключну ліцензію. Передача прав на результат — виключно після 100% оплати.»',
    fixEn:
      '“Contractor retains sole title to pre-existing libraries, granting Client a non-exclusive license. Deliverable IP transfers only upon receipt of 100% full payment.”',
  },
  {
    id: 'liab',
    clause: '§ 9.2',
    titleUk: 'Відповідальність сторін',
    titleEn: 'Limitation of Liability',
    severity: 'Medium',
    severityUk: 'Помірний ризик',
    severityEn: 'Medium Risk',
    summaryUk: 'Необмежена матеріальна відповідальність ФОП',
    summaryEn: 'Uncapped liability exposing personal assets',
    excerptUk:
      '«Відповідальність Виконавця за цим Договором є необмеженою за будь-якими вимогами Замовника чи третіх осіб, включно з упущеною вигодою.»',
    excerptEn:
      '“Contractor\'s liability shall be unlimited with respect to any and all claims, including lost profits, indirect, and consequential damages.”',
    riskNoteUk:
      'ФОП в Україні відповідає за зобов\'язаннями всім своїм особистим майном. Будь-який технічний збій створює ризик стягнення значних сум.',
    riskNoteEn:
      'Sole proprietors face personal asset exposure. Unlimited liability jeopardizes personal savings over service interruptions.',
    fixUk:
      '«Сукупна відповідальність Виконавця за будь-якими претензіями обмежується сумою винагороди, фактично отриманої за відповідним SOW. Упущена вигода прямо виключається.»',
    fixEn:
      '“Contractor\'s aggregate liability shall not exceed fees actually paid to Contractor under the applicable SOW. In no event shall Contractor be liable for lost profits.”',
  },
  {
    id: 'scope',
    clause: '§ 3.4',
    titleUk: 'Обсяг робіт і правки (Scope)',
    titleEn: 'Scope & Revision Caps',
    severity: 'Medium',
    severityUk: 'Помірний ризик',
    severityEn: 'Medium Risk',
    summaryUk: 'Безлімітні правки без доплати (Scope creep)',
    summaryEn: 'Unlimited revisions with no cap until client is satisfied',
    excerptUk:
      '«Виконавець зобов\'язується вносити всі зміни та корективи за запитом Замовника без обмеження кількості раундів до остаточного погодження.»',
    excerptEn:
      '“Contractor agrees to perform all revisions and enhancements requested by Client until full final satisfaction, without extra compensation.”',
    riskNoteUk:
      'Класичний scope creep: фіксована ціна перетворюється на нескінченну безоплатну роботу, а клієнт затягує підписання акту прийому-передачі.',
    riskNoteEn:
      'Classic scope creep trap: fixed-fee turns into infinite unbillable hours while final delivery acceptance is withheld.',
    fixUk:
      '«Вартість послуг покриває до двох (2) раундів правок у межах узгодженого ТЗ. Будь-які додаткові вимоги оплачуються погодинно за окремим Change Order.»',
    fixEn:
      '“The agreed fee includes up to two (2) rounds of revisions strictly within the original SOW. Additional scopes require an hourly Change Order.”',
  },
  {
    id: 'exit',
    clause: '§ 7.3',
    titleUk: 'Одностороннє розірвання',
    titleEn: 'Termination Terms',
    severity: 'Low',
    severityUk: 'В межах норми',
    severityEn: 'Standard Risk',
    summaryUk: 'Асиметричний строк розриву: 0 vs 60 днів',
    summaryEn: 'Asymmetric exit: Client cancels immediately, Contractor owes 60 days',
    excerptUk:
      '«Замовник має право розірвати цей Договір в односторонньому порядку негайно. Виконавець зобов\'язаний надати письмове повідомлення за 60 (шістдесят) днів.»',
    excerptEn:
      '“Client may terminate this Agreement immediately at any time. Contractor must provide at least sixty (60) days advance written notice.”',
    riskNoteUk:
      'Вас можуть зняти з проєкту в один день без компенсації, проте ви не зможете вийти з невигідного контракту протягом 2 місяців.',
    riskNoteEn:
      'You face abrupt cancellation without runway, yet remain tethered to the contract for two full months if rates or scope sour.',
    fixUk:
      '«Кожна зі Сторін має право розірвати цей Договір, попередивши іншу Сторону за 14 (чотирнадцять) календарних днів, з повною оплатою фактично наданих послуг.»',
    fixEn:
      '“Either party may terminate upon fourteen (14) days prior written notice, subject to prompt payment for all hours delivered through termination.”',
  },
  {
    id: 'law',
    clause: '§ 12.1',
    titleUk: 'Застосовне право та спори',
    titleEn: 'Governing Law & Disputes',
    severity: 'Low',
    severityUk: 'В межах норми',
    severityEn: 'Standard / Neutral',
    summaryUk: 'Штат Делавер (США), арбітраж AAA',
    summaryEn: 'Delaware law (USA) with American Arbitration Association rules',
    excerptUk:
      '«Цей Договір регулюється законодавством штату Делавер, США. Усі спори вирішуються в арбітражі за правилами AAA англійською мовою.»',
    excerptEn:
      '“This Agreement shall be construed under Delaware law. Any disputes shall be submitted to binding arbitration under AAA rules in English.”',
    riskNoteUk:
      'Типовий пункт для американських стартапів. Ризик помірний за умови регулярних виплат, проте судовий спір у США для ФОП є занадто дорогим.',
    riskNoteEn:
      'Standard for US ventures. Manageable with recurring payments, though formal US legal remedies exceed the value of most freelance claims.',
    fixUk:
      '«Прийнятно для міжнародного B2B. Для захисту рекомендується додати положення про онлайн-арбітраж (Virtual AAA) або досудове обов\'язкове врегулювання.»',
    fixEn:
      '“Acceptable for international contracts. Consider specifying virtual expedited arbitration to keep dispute resolution costs manageable.”',
  },
];

interface LiveClauseSpecimenProps {
  onRunSample?: () => void;
}

export const LiveClauseSpecimen: React.FC<LiveClauseSpecimenProps> = ({ onRunSample }) => {
  const { lang } = useLanguage();
  const isUk = lang === 'uk';
  const [selectedId, setSelectedId] = useState<string>('pay');
  const [copied, setCopied] = useState<boolean>(false);

  const active = SAMPLE_CLAUSES.find((b) => b.id === selectedId) ?? SAMPLE_CLAUSES[0];

  const handleCopyFix = () => {
    const textToCopy = isUk ? active.fixUk : active.fixEn;
    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 3 Distinct Color Themes:
  // 1. Critical: Signal Orange (#F26419) - Brand color from the site
  // 2. Medium: Royal Blue (#2563EB) - Distinct contrasting 3rd color
  // 3. Low: Forest Green (#18322B) - Brand color from the site
  const getTheme = (sev: SampleClauseItem['severity']) => {
    if (sev === 'Critical') {
      return {
        cardBorder: 'border-l-4 border-l-signal',
        badgeClass: 'border border-signal/40 bg-signal/10 text-signal font-bold',
        dotClass: 'bg-signal',
        activeRing: 'ring-2 ring-signal/30 border-signal/50 bg-signal/[0.03]',
        quoteBorder: 'border-l-4 border-signal bg-signal/[0.03]',
        icon: AlertCircle,
        labelUk: 'Критично',
        labelEn: 'Critical',
      };
    }
    if (sev === 'Medium') {
      return {
        cardBorder: 'border-l-4 border-l-blue-600',
        badgeClass: 'border border-blue-200 bg-blue-50 text-blue-700 font-bold',
        dotClass: 'bg-blue-600',
        activeRing: 'ring-2 ring-blue-500/30 border-blue-500/50 bg-blue-500/[0.03]',
        quoteBorder: 'border-l-4 border-blue-600 bg-blue-50/40',
        icon: AlertTriangle,
        labelUk: 'Помірно',
        labelEn: 'Medium',
      };
    }
    return {
      cardBorder: 'border-l-4 border-l-forest',
      badgeClass: 'border border-forest/30 bg-forest/10 text-forest font-bold',
      dotClass: 'bg-forest',
      activeRing: 'ring-2 ring-forest/30 border-forest/50 bg-forest/[0.03]',
      quoteBorder: 'border-l-4 border-forest bg-forest/[0.03]',
      icon: CheckCircle2,
      labelUk: 'В нормі',
      labelEn: 'Standard',
    };
  };

  const activeTheme = getTheme(active.severity);
  const ActiveIcon = activeTheme.icon;

  return (
    <div className="relative flex flex-col text-ink-primary">
      {/* Top Accent Bar (Brand Forest Green) */}
      <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-forest sm:-mx-6 sm:-mt-6" />

      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-paper-border pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-forest text-white shadow-xs">
              <FileText className="h-3 w-3" aria-hidden="true" />
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-forest">
              {isUk ? 'Зразок аудиту договору' : 'Sample Contract Audit'}
            </span>
          </div>
          <h2 className="mt-1 font-display text-base font-extrabold text-ink-primary sm:text-lg">
            IT Master Services Agreement (MSA)
          </h2>
        </div>

        {/* 3 Color Badges: Signal Orange, Royal Blue, Forest Green */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/40 bg-signal/10 px-2.5 py-1 text-xs font-bold text-signal">
            <span className="h-2 w-2 rounded-full bg-signal" />
            <span>{isUk ? '2 критичні' : '2 critical'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span>{isUk ? '2 помірні' : '2 medium'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/10 px-2.5 py-1 text-xs font-bold text-forest">
            <span className="h-2 w-2 rounded-full bg-forest" />
            <span>{isUk ? '2 безпечні' : '2 standard'}</span>
          </span>
        </div>
      </div>

      {/* 6 Structured Clause Cards with Distinct Color Borders */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SAMPLE_CLAUSES.map((item) => {
          const isSelected = item.id === active.id;
          const theme = getTheme(item.severity);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`group flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                theme.cardBorder
              } ${
                isSelected
                  ? `${theme.activeRing} shadow-sm font-semibold`
                  : 'border-paper-border bg-white hover:border-paper-strong hover:bg-paper/30'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-ink-primary">
                    {item.clause}
                  </span>
                  <span className="truncate text-xs font-bold text-ink-primary">
                    {isUk ? item.titleUk : item.titleEn}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-ink-secondary">
                  {isUk ? item.summaryUk : item.summaryEn}
                </p>
              </div>

              {/* Status pill with color theme */}
              <div className="shrink-0">
                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${theme.badgeClass}`}>
                  {isUk ? theme.labelUk : theme.labelEn}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Framed Inspection Card for Selected Clause */}
      <div className="mt-5 rounded-xl border-2 border-paper-strong/80 bg-white p-4 shadow-xs sm:p-5">
        {/* Inspection Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-forest">
              {active.clause}
            </span>
            <span className="text-sm font-bold text-ink-primary">
              {isUk ? active.titleUk : active.titleEn}
            </span>
          </div>

          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${activeTheme.badgeClass}`}>
            <ActiveIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isUk ? active.severityUk : active.severityEn}</span>
          </span>
        </div>

        {/* Document Excerpt in Distinct Quote Box */}
        <div className="mt-3.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            {isUk ? 'Оригінальний пункт договору:' : 'Original contract excerpt:'}
          </span>
          <div className={`mt-1.5 rounded-r-lg p-3.5 font-serif text-xs italic text-ink-primary shadow-xs ${activeTheme.quoteBorder}`}>
            {isUk ? active.excerptUk : active.excerptEn}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="mt-3.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            {isUk ? 'Чому це небезпечно для ФОП:' : 'Why this puts the contractor at risk:'}
          </span>
          <p className="mt-1 text-xs leading-relaxed text-ink-primary font-medium">
            {isUk ? active.riskNoteUk : active.riskNoteEn}
          </p>
        </div>

        {/* Recommended Counter-Clause Box */}
        <div className="mt-4 rounded-lg border border-forest/20 bg-forest/5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-forest">
              {isUk ? 'Рекомендоване формулювання (безпечна правка):' : 'Recommended counter-clause:'}
            </span>
            <button
              type="button"
              onClick={handleCopyFix}
              className="inline-flex items-center gap-1.5 rounded-md border border-forest/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-forest shadow-xs transition-colors hover:bg-forest hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>{isUk ? 'Скопійовано' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>{isUk ? 'Скопіювати правку' : 'Copy wording'}</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs font-semibold leading-relaxed text-forest">
            {isUk ? active.fixUk : active.fixEn}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-col justify-between gap-3 border-t border-paper-border pt-3 sm:flex-row sm:items-center">
        <p className="text-[11px] text-ink-muted">
          {isUk
            ? 'Оберіть будь-який пункт вище для перегляду аналізу та формулювання.'
            : 'Select any clause above to review the legal reasoning and counter-clause.'}
        </p>

        {onRunSample && (
          <button
            type="button"
            onClick={onRunSample}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-forest-soft sm:self-auto"
          >
            <span>{isUk ? 'Відкрити повний звіт' : 'Open full sample report'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
