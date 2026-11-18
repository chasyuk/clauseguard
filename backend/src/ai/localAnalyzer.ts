import { ClauseItem, ContractLanguage } from '../extraction/clauseSplitter.js';
import {
  CATEGORY_TO_VETTED_CLAUSE_ID,
  ContextDiscrepancy,
  ContractAnalysisResult,
  DealContext,
  FlaggedClause,
  hasDealContext,
  parseAndValidateAnalysis,
  RiskCategory,
  RiskLevel,
} from './schema.js';

interface RiskRule {
  category: RiskCategory;
  detect: (lowerText: string) => RiskLevel | null;
  buildUk: (clause: ClauseItem, level: RiskLevel) => Omit<FlaggedClause, 'clauseNumber' | 'category' | 'riskLevel' | 'originalExcerpt'>;
  buildEn: (clause: ClauseItem, level: RiskLevel) => Omit<FlaggedClause, 'clauseNumber' | 'category' | 'riskLevel' | 'originalExcerpt'>;
}

const RISK_RULES: RiskRule[] = [
  {
    category: 'UNLIMITED_LIABILITY',
    detect: (t) => {
      if (
        /unlimited|uncapped|необмежен|без встановлення будь-якої верхньої межі|обмежується сумою в \$100/i.test(
          t,
        )
      ) {
        return 'HIGH';
      }
      if (/consequential damages|lost profits|упущену вигоду/i.test(t)) {
        return 'MEDIUM';
      }
      return null;
    },
    buildUk: () => ({
      plainLanguageSummary:
        'Цей пункт покладає на виконавця фінансову відповідальність без верхньої межі, включаючи упущену вигоду замовника. Один технічний збій чи спір може призвести до вимог, що перевищують увесь ваш дохід за договором.',
      counterClause:
        'Жодна зі Сторін не несе відповідальності за непрямі збитки або упущену вигоду. За винятком умисного порушення, сукупна відповідальність Виконавця за цим Договором обмежується сумою фактично отриманої винагороди за останні 3 (три) місяці.',
    }),
    buildEn: () => ({
      plainLanguageSummary:
        'This clause exposes you to uncapped damages, including the client’s lost profits and third-party claims, with no maximum dollar ceiling. A single dispute could cost far more than the total value of your contract.',
      counterClause:
        'Neither party shall be liable for indirect, incidental, or consequential damages or lost profits. Except for willful misconduct, each party’s aggregate liability under this Agreement shall not exceed the fees actually paid to Contractor in the preceding three (3) months.',
    }),
  },
  {
    category: 'DELAYED_PAYMENT',
    detect: (t) => {
      if (
        /pay-when-paid|until client has first received|шістдесят|60\s*(?:calendar|bank|банківських)?\s*дн|sixty \(60\)|надходження валютної виручки|призупинити виплату.*невизначений/i.test(
          t,
        )
      ) {
        return 'HIGH';
      }
      if (/forty-five|45\s*(?:calendar|days|дн)|довільний строк|sole discretion/i.test(t)) {
        return 'MEDIUM';
      }
      return null;
    },
    buildUk: () => ({
      plainLanguageSummary:
        'Виплата винагороди відкладається понад 30 днів або залежить від того, чи заплатить замовнику його кінцевий клієнт. Ви фактично безкоштовно кредитуєте замовника і ризикуєте не отримати гроші за вже виконану роботу.',
      counterClause:
        'Замовник оплачує надані послуги протягом 15 (п’ятнадцяти) календарних днів з дати виставлення рахунку або підписання Акта, незалежно від розрахунків Замовника з третіми особами. У разі відсутності обґрунтованих зауважень протягом 5 робочих днів послуги вважаються прийнятими.',
    }),
    buildEn: () => ({
      plainLanguageSummary:
        'Payment is delayed beyond 30 days or conditioned on when the client gets paid by its own customer. You carry the client’s credit risk and could wait months—or indefinitely—for completed work.',
      counterClause:
        'Client shall pay undisputed invoices within fifteen (15) calendar days of receipt, regardless of whether Client has received payment from any third party. Deliverables shall be deemed accepted unless Client provides written defect notice within seven (7) business days.',
    }),
  },
  {
    category: 'UNFAIR_IP_TRANSFER',
    detect: (t) => {
      if (
        /pre-existing|попередні напрацювання|власні бібліотеки|before any invoice is paid|regardless of whether invoices.*paid|незалежно від факту проведення оплати|upon creation/i.test(
          t,
        )
      ) {
        return 'HIGH';
      }
      if (/intellectual property assignment|майнові права інтелектуальної власності/i.test(t) && !/upon full payment|після повної оплати/i.test(t)) {
        return 'MEDIUM';
      }
      return null;
    },
    buildUk: () => ({
      plainLanguageSummary:
        'Права інтелектуальної власності на код і навіть ваші власні попередні бібліотеки переходять до замовника ще до отримання оплати. Якщо замовник не сплатить рахунок, ви втратите право використовувати власні напрацювання в інших проєктах.',
      counterClause:
        'Виключні майнові права на спеціально створений Результат послуг переходять до Замовника виключно з моменту повної оплати відповідного рахунку. Попередні напрацювання, бібліотеки та інструменти Виконавця залишаються у його власності з наданням Замовнику невиключної ліцензії на використання у складі оплаченого Результату.',
    }),
    buildEn: () => ({
      plainLanguageSummary:
        'This clause transfers ownership of your code—and even your pre-existing libraries and reusable tools—before your invoice is paid. If the client fails to pay, you lose both the payment and the right to reuse your own starter utilities.',
      counterClause:
        'Exclusive rights to custom Deliverables transfer to Client solely upon Contractor’s receipt of full payment for the applicable milestone. Contractor retains ownership of all pre-existing code libraries, tools, and general know-how, granting Client a non-exclusive license to use any components embedded in paid Deliverables.',
    }),
  },
  {
    category: 'PENALTY_CLAUSES',
    detect: (t) => {
      if (
        /\$15,000|\$10,000|50 000|2%|5%|liquidated penalty|fixed penalty|штраф.*пен|неустойк/i.test(
          t,
        )
      ) {
        return 'HIGH';
      }
      if (/deduct unilaterally|withhold payment/i.test(t)) {
        return 'MEDIUM';
      }
      return null;
    },
    buildUk: () => ({
      plainLanguageSummary:
        'Договір передбачає непропорційно великі фіксовані штрафи або пеню за кожен день навіть мінімальної затримки без права на виправлення. Замовник може утримати ці суми в односторонньому порядку з вашого гонорару.',
      counterClause:
        'У разі порушення строків з вини Виконавця, Замовник надсилає письмове повідомлення з наданням 5 (п’яти) робочих днів на усунення порушення. Після спливу цього строку може застосовуватися пеня у розмірі 0,1% від вартості простроченого етапу за день, але не більше 5% загальної вартості етапу.',
    }),
    buildEn: () => ({
      plainLanguageSummary:
        'This clause imposes steep fixed fines or daily percentage penalties for minor delays without giving you a cure period. The client can unilaterally deduct those penalties straight from your pending invoices.',
      counterClause:
        'If delivery is delayed due to Contractor’s fault, Client shall provide written notice and a five (5) business day cure period. Only if uncured may Contractor be subject to a capped delay credit of 0.1% of the delayed milestone fee per day, capped at five percent (5%) of that milestone.',
    }),
  },
  {
    category: 'UNFAIR_NON_COMPETE',
    detect: (t) => {
      if (
        /non-compete|неконкуренц|twenty-four \(24\) months|трьох \(3\) років|3 роки|worldwide|не має права надавати будь-які послуги/i.test(
          t,
        )
      ) {
        return 'HIGH';
      }
      if (/exclusivity|ексклюзивн/i.test(t)) {
        return 'MEDIUM';
      }
      return null;
    },
    buildUk: () => ({
      plainLanguageSummary:
        'Пункт забороняє вам працювати з іншими ІТ-компаніями у всьому секторі протягом кількох років після завершення контракту. Для фрілансера або агенції це фактична заборона на професію без компенсації.',
      counterClause:
        'Протягом дії Договору та 6 (шести) місяців після його припинення Виконавець зобов’язується не переманювати конкретних кінцевих клієнтів Замовника, до яких Виконавець отримав прямий доступ у межах цього проєкту. Жодні обмеження не стосуються роботи з іншими компаніями на ринку ІТ.',
    }),
    buildEn: () => ({
      plainLanguageSummary:
        'This restriction bars you from working across the entire software/tech industry for years after the contract ends. For a freelancer or boutique agency, an industry-wide non-compete effectively blocks your livelihood.',
      counterClause:
        'During this Agreement and for six (6) months thereafter, Contractor shall not directly solicit Client’s specific end-customers to whom Contractor was directly introduced under this Agreement. Nothing restricts Contractor from serving other clients in the technology sector.',
    }),
  },
  {
    category: 'OTHER_ASYMMETRIC_RISK',
    detect: (t) => {
      if (/односторонньому порядку розірвати|без оплати фактично виконаного|arbitration in new york/i.test(t)) {
        return 'HIGH';
      }
      if (/sole discretion|довільний строк без обмеження часу/i.test(t)) {
        return 'MEDIUM';
      }
      return null;
    },
    buildUk: () => ({
      plainLanguageSummary:
        'Замовник може в односторонньому порядку розірвати договір або нескінченно затягувати приймання робіт без оплати фактично витраченого часу. Ви ризикуєте виконати тижні роботи без права вимагати розрахунку.',
      counterClause:
        'Будь-яка Сторона може розірвати Договір з письмовим попередженням за 14 (чотирнадцять) календарних днів, при цьому Замовник зобов’язаний оплатити весь фактично виконаний та задокументований обсяг послуг до дати розірвання.',
    }),
    buildEn: () => ({
      plainLanguageSummary:
        'This clause gives the client unilateral power over acceptance, termination, or costly dispute venues at your expense. You risk completing weeks of work without a fair acceptance deadline or guaranteed compensation.',
      counterClause:
        'Either party may terminate this Agreement for convenience upon fourteen (14) days’ prior written notice, and Client shall pay Contractor for all services rendered and expenses incurred up to the termination date.',
    }),
  },
];

function isClauseUkrainian(text: string): boolean {
  const cyr = (text.match(/[\u0400-\u04FF]/g) ?? []).length;
  const lat = (text.match(/[a-zA-Z]/g) ?? []).length;
  return cyr > lat;
}

function findRelevantClauseExcerpt(clauses: ClauseItem[], pattern: RegExp): string | null {
  const match = clauses.find((c) => pattern.test(`${c.title} ${c.text}`));
  if (!match) return null;
  const normalized = match.text.replace(/\s+/g, ' ').trim();
  return `§${match.clauseNumber}: ${normalized.slice(0, 170)}${normalized.length > 170 ? '...' : ''}`;
}

function extractSignificantTokens(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s.+-]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !/^(with|that|this|from|into|only|agreed|project|scope|договір|проєкт|роботи|строк|оплата|тільки)$/i.test(w)),
    ),
  );
}

/**
 * Reconciles agreed project/SOW deal context against the actual contract clauses
 * to surface hidden scope mismatches, timeline conflicts, and omitted protections.
 */
export function evaluateDealContextDiscrepancies(
  clauses: ClauseItem[],
  dealContext: DealContext | undefined,
  lang: ContractLanguage,
): { contextAlignmentScore?: number; contextDiscrepancies: ContextDiscrepancy[] } {
  if (!hasDealContext(dealContext) || !dealContext) {
    return { contextDiscrepancies: [] };
  }

  const isUk = lang === 'uk';
  const fullText = clauses.map((c) => `${c.title} ${c.text}`).join('\n');
  const lower = fullText.toLowerCase();
  const discrepancies: ContextDiscrepancy[] = [];

  const rawNotes = dealContext.rawNotes?.trim() || '';
  const rawSegments = rawNotes
    .split(/[.;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const pickNoteSegment = (pattern: RegExp) =>
    rawSegments.filter((s) => pattern.test(s)).join('; ');

  // 1. SCOPE_AND_DELIVERABLES
  const agreedScope = dealContext.agreedScope?.trim() || rawNotes;
  if (agreedScope) {
    const scopeExcerpt = findRelevantClauseExcerpt(
      clauses,
      /scope|services|deliverable|subject|предмет|послуг|результат|обсяг/i,
    );
    const hasOpenEndedScopeTrap =
      /any other.*services|related services as requested|unrestricted|without additional fee|без.*додаткової оплати|будь-які супутні|на вимогу замовника/i.test(
        lower,
      );
    const tokens = extractSignificantTokens(agreedScope);
    const matchedTokens = tokens.filter((t) => lower.includes(t));
    const coverageRatio = tokens.length > 0 ? matchedTokens.length / tokens.length : 1;

    if (hasOpenEndedScopeTrap || (coverageRatio < 0.25 && tokens.length >= 2)) {
      discrepancies.push({
        dimension: 'SCOPE_AND_DELIVERABLES',
        status: scopeExcerpt ? 'MISMATCH' : 'OMITTED_IN_CONTRACT',
        agreedTerm: agreedScope,
        contractTerm:
          scopeExcerpt ??
          (isUk
            ? 'У тексті договору немає конкретної прив’язки до узгодженого скоупу.'
            : 'Written draft lacks concrete deliverables matching the agreed scope.'),
        riskImpact: isUk
          ? 'Розмитий або розширений предмет робіт дозволяє клієнту вимагати додаткові модулі в межах старої ціни.'
          : 'Missing or open-ended scope phrasing allows Client to demand extra modules under the original fee.',
        suggestedAmendment: isUk
          ? `1.1 Обсяг послуг обмежується виключно: «${agreedScope}». Будь-які інші модулі оформлюються через письмовий Change Order [VETTED-SCOPE-FIXED-01].`
          : `1.1 Scope is strictly limited to: "${agreedScope}". Additional modules require a signed Change Order [VETTED-SCOPE-FIXED-01].`,
      });
    } else {
      discrepancies.push({
        dimension: 'SCOPE_AND_DELIVERABLES',
        status: 'MATCH',
        agreedTerm: agreedScope,
        contractTerm: scopeExcerpt ?? agreedScope,
        riskImpact: isUk
          ? 'Письмовий предмет робіт збігається з ключовими результатами проєкту.'
          : 'Written deliverables align cleanly with your agreed scope notes.',
        suggestedAmendment: isUk
          ? 'Збережіть поточну прив’язку до ТЗ та переконайтеся, що фінальний список модулів додано в Додаток.'
          : 'Keep concrete deliverable references and ensure the final backlog list stays attached.',
      });
    }
  }

  // 2. TIMELINE_AND_DEADLINES
  const agreedTimeline =
    dealContext.agreedTimeline?.trim() ||
    pickNoteSegment(/week|day|deadline|launch|delivery|sla|тижд|дн|дедлайн|строк|термін/i);
  if (agreedTimeline) {
    const timelineExcerpt = findRelevantClauseExcerpt(
      clauses,
      /deadline|schedule|delivery|milestone|penalt|строк|термін|етап|штраф|пен/i,
    );
    const hasStrictPenaltyTrap =
      /\$15,000|\$10,000|50 000|2%|5%|liquidated penalty|time is of the essence|без права на виправлення|незалежно від затрим/i.test(
        lower,
      );
    const timelineNums = agreedTimeline.match(/\d+/g) ?? [];
    const dateMatched = timelineNums.length === 0 || timelineNums.some((n) => lower.includes(n));

    if (hasStrictPenaltyTrap || !timelineExcerpt || !dateMatched) {
      discrepancies.push({
        dimension: 'TIMELINE_AND_DEADLINES',
        status: !timelineExcerpt ? 'OMITTED_IN_CONTRACT' : 'MISMATCH',
        agreedTerm: agreedTimeline,
        contractTerm:
          timelineExcerpt ??
          (isUk
            ? 'У договорі не зафіксовано узгоджений графік і залежність дедлайнів від фідбеку клієнта.'
            : 'Contract omits the agreed deadline or Client feedback dependency relief.'),
        riskImpact: isUk
          ? 'Якщо клієнт затримає доступи чи макети, суворі дедлайни або велика пеня активуються проти виконавця.'
          : 'Without Client dependency relief and realistic dates, Client delays could trigger penalties against you.',
        suggestedAmendment: isUk
          ? `Узгоджений графік: «${agreedTimeline}». Затримки з надання доступів чи погоджень Замовником автоматично зсувають дедлайн день-у-день [VETTED-CHG-BUFFER-02].`
          : `Agreed schedule: "${agreedTimeline}". Any Client feedback or asset delay extends the deadline day-for-day without penalty [VETTED-CHG-BUFFER-02].`,
      });
    } else {
      discrepancies.push({
        dimension: 'TIMELINE_AND_DEADLINES',
        status: 'MATCH',
        agreedTerm: agreedTimeline,
        contractTerm: timelineExcerpt,
        riskImpact: isUk
          ? 'Строки виконання у договорі узгоджуються з планом проєкту.'
          : 'Stated delivery dates align with agreed project timeline.',
        suggestedAmendment: isUk
          ? 'Додайте згадку про перенесення строків у разі затримки доступів Замовника.'
          : 'Verify explicit day-for-day extension if Client inputs arrive late.',
      });
    }
  }

  // 3. PAYMENT_AND_MILESTONES
  const agreedPayment =
    dealContext.agreedPayment?.trim() ||
    pickNoteSegment(/\$|usd|eur|uah|грн|%|upfront|deposit|net\s*\d+|pay|оплат|аванс|передоплат|бюджет/i);
  if (agreedPayment) {
    const payExcerpt = findRelevantClauseExcerpt(
      clauses,
      /pay|invoice|fee|compensation|оплат|рахунок|винагород|вартіст/i,
    );
    const hasBadPayTrap =
      /60|sixty|шістдесят|45|forty-five|pay-when-paid|валютної виручки|невизначений/i.test(lower);
    const expectsUpfront = /%|upfront|deposit|аванс|передоплат/i.test(agreedPayment);
    const hasUpfrontInContract = /upfront|deposit|prepayment|аванс|передоплат/i.test(lower);

    if (hasBadPayTrap || (expectsUpfront && !hasUpfrontInContract) || !payExcerpt) {
      discrepancies.push({
        dimension: 'PAYMENT_AND_MILESTONES',
        status: !payExcerpt ? 'OMITTED_IN_CONTRACT' : 'MISMATCH',
        agreedTerm: agreedPayment,
        contractTerm:
          payExcerpt ??
          (isUk ? 'Графік оплати та аванс відсутні у договорі.' : 'Payment schedule is omitted in contract.'),
        riskImpact: isUk
          ? 'Розходження в умовах оплати (напр. Net 60 замість узгоджених 10–14 днів або відсутність передоплати) заморожує ваш кеш-фло.'
          : 'Contract payment delay (or missing upfront deposit vs. agreed terms) forces you to finance the client’s project.',
        suggestedAmendment: isUk
          ? `Встановити оплату згідно з домовленістю («${agreedPayment}») незалежно від кінцевих клієнтів Замовника [VETTED-PAY-MILESTONE-01].`
          : `Replace with agreed payment terms ("${agreedPayment}"), unconditional of third-party payments [VETTED-PAY-MILESTONE-01].`,
      });
    } else {
      discrepancies.push({
        dimension: 'PAYMENT_AND_MILESTONES',
        status: 'MATCH',
        agreedTerm: agreedPayment,
        contractTerm: payExcerpt,
        riskImpact: isUk
          ? 'Умови оплати відповідають фінансовим домовленостям.'
          : 'Payment schedule matches your agreed commercial terms.',
        suggestedAmendment: isUk
          ? 'Перевірте правильність банківських реквізитів та валюти платежу.'
          : 'Confirm invoice currency and IBAN/SWIFT coordinates before kickoff.',
      });
    }
  }

  // 4. REVISIONS_AND_ACCEPTANCE
  const acceptanceExcerpt = findRelevantClauseExcerpt(
    clauses,
    /accept|revision|approval|прийман|акт|правок|ревіз/i,
  );
  const hasAcceptanceTrap =
    /sole discretion|unlimited revision|без обмеження часу|довільний строк|безкінечн/i.test(lower);
  const hasDeemedAcceptance = /deemed accepted|вважаються прийнятими/i.test(lower);

  if (hasAcceptanceTrap || (!hasDeemedAcceptance && (agreedScope || agreedTimeline))) {
    discrepancies.push({
      dimension: 'REVISIONS_AND_ACCEPTANCE',
      status: hasAcceptanceTrap ? 'MISMATCH' : 'OMITTED_IN_CONTRACT',
      agreedTerm: isUk
        ? 'Фіксований строк приймання (5 робочих днів) та обмежена кількість раундів правок'
        : '5-business-day acceptance SLA + capped revision cycles',
      contractTerm:
        acceptanceExcerpt ??
        (isUk
          ? 'Строк приймання робіт і ліміт раундів правок не визначені.'
          : 'No automatic deemed-acceptance deadline or revision cap defined.'),
      riskImpact: isUk
        ? 'Замовник може тижнями не підписувати Акт або вимагати нескінченні переробки без доплати.'
        : 'Client can stall milestone sign-off indefinitely or demand unlimited unpaid redesign cycles.',
      suggestedAmendment: isUk
        ? 'Додати правило: якщо впродовж 5 робочих днів не надано письмових зауважень до ТЗ, етап вважається прийнятим; включено до 2 раундів правок [VETTED-ACC-DEEMED-01].'
        : 'Add 5-business-day deemed acceptance and cap free revisions at 2 consolidated rounds [VETTED-ACC-DEEMED-01].',
    });
  }

  // 5. EXCLUSIONS_AND_IP
  const agreedExclusions =
    dealContext.agreedExclusions?.trim() ||
    pickNoteSegment(/exclud|out of scope|library|libraries|starter|devops|ip|поза скоуп|виключ|бібліотек|власн|права/i);
  if (agreedExclusions) {
    const ipOrExclExcerpt = findRelevantClauseExcerpt(
      clauses,
      /exclu|out of scope|intellectual property|pre-existing|попередні|виключ|майнові права/i,
    );
    const hasIpOrExclusionConflict =
      /pre-existing|попередні напрацювання|upon creation|до моменту оплати|незалежно від факту проведення оплати/i.test(
        lower,
      );
    const exclTokens = extractSignificantTokens(agreedExclusions);
    const exclCovered = exclTokens.some((t) => lower.includes(t));

    if (hasIpOrExclusionConflict || !exclCovered) {
      discrepancies.push({
        dimension: 'EXCLUSIONS_AND_IP',
        status: hasIpOrExclusionConflict ? 'MISMATCH' : 'OMITTED_IN_CONTRACT',
        agreedTerm: agreedExclusions,
        contractTerm:
          ipOrExclExcerpt ??
          (isUk
            ? 'Узгоджені виключення чи захист власних інструментів не закріплені в тексті.'
            : 'Agreed out-of-scope exclusions / background tool carve-outs are omitted.'),
        riskImpact: isUk
          ? 'Ви ризикуєте безоплатно робити виключені задачі або втратити права на власні бібліотеки та код до оплати.'
          : 'Omitted exclusions expose you to free extra work, and missing IP carve-outs jeopardize your starter tools.',
        suggestedAmendment: isUk
          ? `Явно виключити зі скоупу: «${agreedExclusions}». Права ІВ переходять лише після повної оплати, власні інструменти залишаються у Виконавця [VETTED-IP-UPON-PAYMENT-01].`
          : `Explicitly exclude: "${agreedExclusions}". Custom IP transfers solely upon full payment; background tools remain yours [VETTED-IP-UPON-PAYMENT-01].`,
      });
    } else {
      discrepancies.push({
        dimension: 'EXCLUSIONS_AND_IP',
        status: 'MATCH',
        agreedTerm: agreedExclusions,
        contractTerm: ipOrExclExcerpt ?? agreedExclusions,
        riskImpact: isUk
          ? 'Виключення та застереження щодо ІВ враховані в договорі.'
          : 'Exclusions and IP carve-outs are reflected cleanly.',
        suggestedAmendment: isUk
          ? 'Перевірте фінальне формулювання застереження щодо моменту переходу ІВ.'
          : 'Double-check payment condition precedent on custom IP assignment.',
      });
    }
  }

  const mismatches = discrepancies.filter((d) => d.status === 'MISMATCH').length;
  const omitted = discrepancies.filter((d) => d.status === 'OMITTED_IN_CONTRACT').length;
  const contextAlignmentScore = Math.max(5, Math.min(100, 100 - mismatches * 22 - omitted * 14));

  return { contextAlignmentScore, contextDiscrepancies: discrepancies };
}

/**
 * Deterministic grounded fallback analyzer used only when AWS Bedrock credentials are absent locally.
 * Validates output through the exact same Zod schema as live Bedrock responses.
 */
export function runLocalFallbackAnalysis(
  clauses: ClauseItem[],
  detectedLanguage: ContractLanguage,
  dealContext?: DealContext,
): ContractAnalysisResult {
  const flaggedClauses: FlaggedClause[] = [];

  for (const clause of clauses) {
    const lower = clause.text.toLowerCase();
    for (const rule of RISK_RULES) {
      const level = rule.detect(lower);
      if (!level) continue;

      const useUk =
        detectedLanguage === 'uk' ||
        (detectedLanguage === 'mixed' && isClauseUkrainian(clause.text));

      const content = useUk ? rule.buildUk(clause, level) : rule.buildEn(clause, level);
      flaggedClauses.push({
        clauseNumber: clause.clauseNumber,
        category: rule.category,
        riskLevel: level,
        originalExcerpt: clause.text,
        vettedClauseId: CATEGORY_TO_VETTED_CLAUSE_ID[rule.category],
        ...content,
      });
      // Match primary risk per clause to keep output concise and readable
      break;
    }
  }

  const highCount = flaggedClauses.filter((c) => c.riskLevel === 'HIGH').length;
  const medCount = flaggedClauses.filter((c) => c.riskLevel === 'MEDIUM').length;
  const lowCount = flaggedClauses.filter((c) => c.riskLevel === 'LOW').length;
  const rawScore = Math.min(96, highCount * 20 + medCount * 11 + lowCount * 5);

  const reconciliation = evaluateDealContextDiscrepancies(clauses, dealContext, detectedLanguage);
  const gapCount = reconciliation.contextDiscrepancies.filter((d) => d.status !== 'MATCH').length;

  const isUkSummary = detectedLanguage === 'uk';
  const executiveSummary =
    flaggedClauses.length === 0 && gapCount === 0
      ? isUkSummary
        ? 'Критичних комерційних пасток у перевірених пунктах не виявлено. Проте перевірте реквізити сторін та графік платежів перед підписанням.'
        : 'No major commercial traps were detected in the extracted clauses. Still review party details and milestone schedules before signing.'
      : isUkSummary
        ? `Виявлено ${flaggedClauses.length} ризикових умов (високий ризик: ${highCount}, середній: ${medCount})${gapCount > 0 ? ` та ${gapCount} розбіжностей із контекстом домовленостей проєкту` : ''}. Договір зміщує ризики на виконавця і потребує правок за перевіреними модулями перед підписанням.`
        : `Detected ${flaggedClauses.length} risky clauses (${highCount} High, ${medCount} Medium)${gapCount > 0 ? ` and ${gapCount} project-context discrepancy item(s)` : ''}. The draft shifts disproportionate commercial risk onto the contractor and should be aligned using the vetted amendments below.`;

  const negotiationChecklist =
    flaggedClauses.length === 0 && gapCount === 0
      ? [
          isUkSummary
            ? 'Перевірте точні строки оплати та банківські реквізити.'
            : 'Confirm payment dates and banking details.',
        ]
      : [
          ...flaggedClauses.slice(0, 4).map((item) =>
            isUkSummary
              ? `Пункт ${item.clauseNumber} (${item.category}): застосуйте перевірену правку ${item.vettedClauseId}.`
              : `Clause ${item.clauseNumber} (${item.category}): propose vetted replacement ${item.vettedClauseId}.`,
          ),
          ...(gapCount > 0
            ? [
                isUkSummary
                  ? `Узгодьте ${gapCount} розбіжност(ей) між контекстом проєкту (скоуп/дедлайни/оплата) та текстом SOW.`
                  : `Resolve ${gapCount} mismatch(es) between your agreed project context (scope/deadlines/payment) and the written SOW.`,
              ]
            : []),
        ];

  const candidateJson = JSON.stringify({
    contractLanguage: detectedLanguage,
    overallRiskScore: rawScore,
    executiveSummary,
    negotiationChecklist,
    flaggedClauses,
    contextAlignmentScore: reconciliation.contextAlignmentScore,
    contextDiscrepancies: reconciliation.contextDiscrepancies,
  });

  return parseAndValidateAnalysis(candidateJson, clauses, dealContext);
}
