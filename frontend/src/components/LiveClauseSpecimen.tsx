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
    summaryUk: 'Оплата через 90 днів без авансу та без права зупинки робіт',
    summaryEn: 'Net 90 payment window with no advance or right to pause',
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
    summaryUk: 'Повне відчуження прав включно з власними бібліотеками та pre-existing кодом',
    summaryEn: 'Complete assignment of pre-existing boilerplate, tools and frameworks',
    excerptUk:
      '«Усі результати робіт, включно з попередніми бібліотеками, утилітами та напрацюваннями Виконавця, переходять у виключну власність Замовника з моменту створення.»',
    excerptEn:
      '“All work product, including Contractor\'s pre-existing software tools, frameworks, and reusable libraries, shall become sole Client property upon creation.”',
    riskNoteUk:
      'Ви юридично втрачаєте право повторно використовувати власний код, скрипти та модулі для інших проєктів. Ризик звинувачень у порушенні прав на свій же код.',
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
    summaryUk: 'Необмежена матеріальна відповідальність ФОП за будь-якими збитками',
    summaryEn: 'Uncapped liability exposing personal assets to unlimited damage claims',
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
    summaryUk: 'Безлімітні безкоштовні доопрацювання до повного затвердження клієнтом',
    summaryEn: 'Unlimited revisions with no cap until client is fully satisfied',
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
    severityUk: 'Низький ризик',
    severityEn: 'Low Risk',
    summaryUk: 'Асиметричний строк: Замовник розриває день-у-день, ФОП — за 60 днів',
    summaryEn: 'Asymmetric exit: Client cancels immediately, Contractor must provide 60-day notice',
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
    summaryUk: 'Право штату Делавер (США) та арбітраж AAA',
    summaryEn: 'Delaware state law (USA) with American Arbitration Association rules',
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

  const severityBadge = (sev: SampleClauseItem['severity'], ukLabel: string, enLabel: string) => {
    if (sev === 'Critical') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
          <AlertCircle className="h-3 w-3 text-rose-600" aria-hidden="true" />
          <span>{isUk ? ukLabel : enLabel}</span>
        </span>
      );
    }
    if (sev === 'Medium') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          <AlertTriangle className="h-3 w-3 text-amber-600" aria-hidden="true" />
          <span>{isUk ? ukLabel : enLabel}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
        <span>{isUk ? ukLabel : enLabel}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col text-ink-primary">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 border-b border-paper-border pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-forest/10 text-forest">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-forest">
              {isUk ? 'Зразок аудиту договору' : 'Sample Audit Report'}
            </span>
          </div>
          <h2 className="mt-1 font-display text-base font-bold text-ink-primary sm:text-lg">
            {isUk
              ? 'IT Master Services Agreement (MSA)'
              : 'IT Master Services Agreement (MSA)'}
          </h2>
        </div>

        {/* Risk summary pills */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100">
            {isUk ? '2 критичні' : '2 critical'}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-100">
            {isUk ? '2 помірні' : '2 medium'}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
            {isUk ? '2 безпечні' : '2 standard'}
          </span>
        </div>
      </div>

      {/* Clause selector list */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SAMPLE_CLAUSES.map((item) => {
          const isSelected = item.id === active.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`group flex items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                isSelected
                  ? 'border-forest bg-paper/70 shadow-xs ring-1 ring-forest/20'
                  : 'border-paper-border bg-white hover:border-paper-strong hover:bg-paper/30'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-ink-secondary">
                    {item.clause}
                  </span>
                  <span className="truncate text-xs font-semibold text-ink-primary">
                    {isUk ? item.titleUk : item.titleEn}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                  {isUk ? item.summaryUk : item.summaryEn}
                </p>
              </div>

              <div className="shrink-0">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    item.severity === 'Critical'
                      ? 'bg-rose-500'
                      : item.severity === 'Medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  title={isUk ? item.severityUk : item.severityEn}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Clause Inspection Card */}
      <div className="mt-4 rounded-xl border border-paper-border bg-paper/40 p-4">
        {/* Inspection Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest">
              {active.clause}
            </span>
            <span className="text-xs font-bold text-ink-primary">
              {isUk ? active.titleUk : active.titleEn}
            </span>
          </div>
          {severityBadge(active.severity, active.severityUk, active.severityEn)}
        </div>

        {/* Document Excerpt */}
        <div className="mt-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {isUk ? 'Оригінальний пункт договору:' : 'Original contract excerpt:'}
          </span>
          <div className="mt-1 rounded-md border-l-2 border-signal bg-white p-3 font-serif text-xs italic text-ink-secondary shadow-xs">
            {isUk ? active.excerptUk : active.excerptEn}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="mt-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {isUk ? 'Чому це небезпечно для ФОП:' : 'Why this puts the contractor at risk:'}
          </span>
          <p className="mt-1 text-xs leading-relaxed text-ink-primary">
            {isUk ? active.riskNoteUk : active.riskNoteEn}
          </p>
        </div>

        {/* Recommended Counter-Clause */}
        <div className="mt-3.5 rounded-lg border border-emerald-200/90 bg-emerald-50/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-emerald-900">
              {isUk ? 'Рекомендоване формулювання (правка):' : 'Recommended counter-clause:'}
            </span>
            <button
              type="button"
              onClick={handleCopyFix}
              className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200 hover:bg-emerald-100/60 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>{isUk ? 'Скопійовано' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>{isUk ? 'Скопіювати' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-emerald-950 font-medium">
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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-forest px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-forest-soft sm:self-auto"
          >
            <span>{isUk ? 'Відкрити повний звіт' : 'Open full sample report'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
