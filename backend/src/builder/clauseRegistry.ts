export type ClauseModuleType =
  | 'SCOPE_AND_DELIVERABLES'
  | 'PAYMENT_AND_CURRENCY'
  | 'ACCEPTANCE_AND_REVISIONS'
  | 'CHANGE_CONTROL_OUT_OF_SCOPE'
  | 'IP_AND_BACKGROUND_TOOLS'
  | 'LIABILITY_AND_INDEMNITY'
  | 'CONFIDENTIALITY_AND_PORTFOLIO'
  | 'TERMINATION_AND_FOP_COMPLIANCE';

export type ClausePosture = 'CONTRACTOR_PROTECTIVE' | 'BALANCED';

export interface ContractParameters {
  clientName: string;
  contractorName: string;
  projectTitle: string;
  projectScope: string;
  deliverablesList: string;
  exclusions: string;
  pricingModel: 'FIXED_PRICE' | 'TIME_AND_MATERIALS';
  totalFee: string;
  currency: string;
  hourlyRate: string;
  upfrontPercent: number;
  paymentWindowDays: number;
  acceptanceDays: number;
  revisionRounds: number;
  deadlineDate: string;
  liabilityCapMonths: number;
  governingLaw: string;
  clientAddress?: string;
  contractorAddress?: string;
  clientTaxId?: string;
  contractorTaxId?: string;
  clientIban?: string;
  contractorIban?: string;
  clientBank?: string;
  contractorBank?: string;
}

export interface VettedClauseVariant {
  clauseId: string;
  module: ClauseModuleType;
  posture: ClausePosture;
  sectionNumber: string;
  titleEn: string;
  titleUk: string;
  rationaleEn: string;
  rationaleUk: string;
  templateEn: string;
  templateUk: string;
}

export interface ContractTemplateDefinition {
  templateId: string;
  titleEn: string;
  titleUk: string;
  subtitleEn: string;
  subtitleUk: string;
  idealForEn: string;
  idealForUk: string;
  defaultPricingModel: 'FIXED_PRICE' | 'TIME_AND_MATERIALS';
  modules: ClauseModuleType[];
  defaultParameters: Partial<ContractParameters>;
}

export interface BuilderScenarioPreset {
  id: string;
  labelEn: string;
  labelUk: string;
  templateId: string;
  plainTextEn: string;
  plainTextUk: string;
}

export const MODULE_ORDER: ClauseModuleType[] = [
  'SCOPE_AND_DELIVERABLES',
  'PAYMENT_AND_CURRENCY',
  'ACCEPTANCE_AND_REVISIONS',
  'CHANGE_CONTROL_OUT_OF_SCOPE',
  'IP_AND_BACKGROUND_TOOLS',
  'LIABILITY_AND_INDEMNITY',
  'CONFIDENTIALITY_AND_PORTFOLIO',
  'TERMINATION_AND_FOP_COMPLIANCE',
];

export const MODULE_TITLES: Record<ClauseModuleType, { en: string; uk: string }> = {
  SCOPE_AND_DELIVERABLES: {
    en: 'Scope, Deliverables & Exclusions',
    uk: 'Предмет робіт, результати та виключення',
  },
  PAYMENT_AND_CURRENCY: {
    en: 'Fees, Milestones & Currency',
    uk: 'Винагорода, етапи оплати та валюта',
  },
  ACCEPTANCE_AND_REVISIONS: {
    en: 'Acceptance & Revision Cap',
    uk: 'Приймання робіт та ліміт правок',
  },
  CHANGE_CONTROL_OUT_OF_SCOPE: {
    en: 'Change Control (Out-of-Scope)',
    uk: 'Додаткові вимоги (Change Order)',
  },
  IP_AND_BACKGROUND_TOOLS: {
    en: 'IP Transfer & Background Tools',
    uk: 'Права ІВ та власні бібліотеки',
  },
  LIABILITY_AND_INDEMNITY: {
    en: 'Liability Cap & Damages',
    uk: 'Обмеження відповідальності',
  },
  CONFIDENTIALITY_AND_PORTFOLIO: {
    en: 'Confidentiality & Portfolio Rights',
    uk: 'Конфіденційність та право на кейс',
  },
  TERMINATION_AND_FOP_COMPLIANCE: {
    en: 'Termination & FOP / NBU Export',
    uk: 'Розірвання та ЗЕД / ФОП-умови',
  },
};

export const VETTED_CLAUSES: VettedClauseVariant[] = [
  // 1. SCOPE_AND_DELIVERABLES
  {
    clauseId: 'VETTED-SCOPE-FIXED-01',
    module: 'SCOPE_AND_DELIVERABLES',
    posture: 'CONTRACTOR_PROTECTIVE',
    sectionNumber: '1',
    titleEn: 'Fixed Scope, Deliverables & Explicit Exclusions',
    titleUk: 'Фіксований обсяг робіт, результати та чіткі виключення',
    rationaleEn:
      'Anchors fixed-price work strictly to named deliverables and excludes unbudgeted features so scope creep cannot be forced under the original price.',
    rationaleUk:
      'Чітко прив’язує фіксовану ціну до переліку результатів і виключає позабюджетні задачі, захищаючи від нескінченного розширення скоупу.',
    templateEn:
      '1.1 Scope of Work ({{projectTitle}}). {{contractorName}} ("Contractor") shall deliver solely the expressly defined services for {{clientName}} ("Client"): {{projectScope}}. Deliverables: {{deliverablesList}}. Target completion date: {{deadlineDate}}, subject to timely Client feedback and upfront payment.\n1.2 Explicit Exclusions. Unless added via a signed Change Order, this SOW excludes: {{exclusions}}.',
    templateUk:
      '1.1 Обсяг послуг ({{projectTitle}}). {{contractorName}} («Виконавець») надає {{clientName}} («Замовник») виключно послуги, погоджені у цьому Додатку (SOW): {{projectScope}}. Перелік результатів: {{deliverablesList}}. Плановий строк виконання: {{deadlineDate}} (за умови своєчасних погоджень та передоплати).\n1.2 Прямі виключення. До вартості не входять і потребують окремого погодження: {{exclusions}}.',
  },
  {
    clauseId: 'VETTED-SCOPE-TM-02',
    module: 'SCOPE_AND_DELIVERABLES',
    posture: 'BALANCED',
    sectionNumber: '1',
    titleEn: 'Flexible Backlog / Time & Materials Scope',
    titleUk: 'Гнучкий беклог / Погодинний обсяг (Time & Materials)',
    rationaleEn:
      'Ideal when client priorities evolve weekly; treats estimates as non-binding forecasts billed on tracked hours or monthly capacity.',
    rationaleUk:
      'Оптимально для гнучкої розробки: завдання пріоритезуються по спринтах, а попередні оцінки годин не є фіксованою гарантією ціни.',
    templateEn:
      '1.1 Agile Scope ({{projectTitle}}). {{contractorName}} ("Contractor") shall provide software engineering and technical services to {{clientName}} ("Client") covering: {{projectScope}} (anticipated outputs: {{deliverablesList}}). Estimated delivery window: {{deadlineDate}}.\n1.2 Priorities & Estimates. Client may reprioritize backlog tasks weekly; all time estimates are good-faith forecasts and do not convert this Time & Materials engagement into a fixed-fee commitment.',
    templateUk:
      '1.1 Гнучкий обсяг послуг ({{projectTitle}}). {{contractorName}} («Виконавець») надає {{clientName}} («Замовник») послуги з розробки за напрямом: {{projectScope}} (очікувані результати: {{deliverablesList}}). Орієнтовний графік: {{deadlineDate}}.\n1.2 Пріоритезація та оцінки. Замовник може змінювати пріоритети задач у беклозі щотижня; попередні оцінки годин мають орієнтовний характер і не перетворюють модель T&M на фіксовану вартість.',
  },

  // 2. PAYMENT_AND_CURRENCY
  {
    clauseId: 'VETTED-PAY-MILESTONE-01',
    module: 'PAYMENT_AND_CURRENCY',
    posture: 'CONTRACTOR_PROTECTIVE',
    sectionNumber: '2',
    titleEn: 'Upfront Deposit & Unconditional Invoice Terms',
    titleUk: 'Передплата, етапи та безумовна оплата інвойсів',
    rationaleEn:
      'Requires an upfront deposit before work starts, eliminates "pay-when-paid" third-party risk, and lets Contractor pause work if invoices go overdue.',
    rationaleUk:
      'Гарантує стартовий аванс, забороняє затримувати виплату через розрахунки з третіми особами та дає право призупинити роботу при простроченні.',
    templateEn:
      '2.1 Compensation. Client shall pay Contractor {{totalFee}} {{currency}} allocated as {{upfrontPercent}}% non-refundable commencement deposit prior to kickoff and {{remainingPercent}}% upon milestone completion.\n2.2 Unconditional Payment & Suspension Right. Undisputed invoices are payable within {{paymentWindowDays}} calendar days of issue via SWIFT/SEPA/fiat bank transfer, independent of payments from Client’s end-customers. Contractor may suspend work after 5 business days’ written notice of overdue payment without penalty.',
    templateUk:
      '2.1 Винагорода. Загальна вартість послуг становить {{totalFee}} {{currency}}: {{upfrontPercent}}% аванс до початку робіт та {{remainingPercent}}% після завершення етапу (чи узгоджених проміжних етапів).\n2.2 Безумовний строк оплати. Замовник оплачує рахунок протягом {{paymentWindowDays}} календарних днів з дати виставлення, незалежно від розрахунків Замовника з третіми особами. У разі прострочення понад 5 робочих днів після повідомлення Виконавець має право призупинити надання послуг без штрафів.',
  },
  {
    clauseId: 'VETTED-PAY-TM-02',
    module: 'PAYMENT_AND_CURRENCY',
    posture: 'BALANCED',
    sectionNumber: '2',
    titleEn: 'Monthly Time-Tracked / Bi-Weekly Billing Schedule',
    titleUk: 'Щомісячний білінг за фактично відпрацьованим часом / ставкою',
    rationaleEn:
      'Matches standard agency/T&M billing cycles using approved timesheets and clear hourly rates without hidden holdbacks.',
    rationaleUk:
      'Фіксує прозору погодинну або щомісячну оплату за табелями обліку часу без утримань чи прихованих відтермінувань.',
    templateEn:
      '2.1 Rates & Billing ({{totalFee}} {{currency}} estimated budget). Services are billed at {{hourlyRate}} {{currency}}/hour ({{pricingModel}}) on bi-weekly or monthly invoices accompanied by activity summaries.\n2.2 Net Payment Window. Client shall settle invoices within {{paymentWindowDays}} calendar days of receipt. Overdue undisputed balances accrue statutory late interest of 0.1% per calendar day.',
    templateUk:
      '2.1 Ставки та білінг (орієнтовний бюджет {{totalFee}} {{currency}}). Послуги оплачуються за ставкою {{hourlyRate}} {{currency}}/год або за узгодженими етапами на підставі щомісячного чи двотижневого звіту наданих послуг.\n2.2 Строк розрахунків. Замовник оплачує інвойс протягом {{paymentWindowDays}} календарних днів з моменту отримання. За прострочення оплати нараховується пеня 0,1% за кожен календарний день затримки.',
  },

  // 3. ACCEPTANCE_AND_REVISIONS
  {
    clauseId: 'VETTED-ACC-DEEMED-01',
    module: 'ACCEPTANCE_AND_REVISIONS',
    posture: 'CONTRACTOR_PROTECTIVE',
    sectionNumber: '3',
    titleEn: 'Deemed Acceptance Window & Capped Revision Rounds',
    titleUk: 'Автоматичне приймання (Deemed Acceptance) та ліміт правок',
    rationaleEn:
      'Prevents silent stalling of Act/acceptance signing by auto-approving deliverables after N business days and capping free revision rounds.',
    rationaleUk:
      'Унеможливлює нескінченне затягування підписання Акта та «вічні безкоштовні правки» за рахунок фіксованого строку приймання і ліміту раундів.',
    templateEn:
      '3.1 Inspection & Deemed Acceptance. Upon delivery of any milestone, Client has {{acceptanceDays}} business days to test and provide a consolidated written list of material non-conformities against agreed specifications. Absent such written notice within {{acceptanceDays}} business days (or upon production deployment), Deliverables are deemed irrevocably accepted.\n3.2 Revision Cap. Fees include up to {{revisionRounds}} round(s) of consolidated in-scope revisions per deliverable; additional cycles are billed under Section 4.',
    templateUk:
      '3.1 Строк приймання та мовчазна згода. Після передачі результату Замовник має {{acceptanceDays}} робочих днів для перевірки та надання єдиного письмового переліку обґрунтованих недоліків. Якщо впродовж {{acceptanceDays}} робочих днів зауважень не надано (або результат використано у продакшені), послуги вважаються прийнятими в повному обсязі.\n3.2 Ліміт правок. Вартість включає до {{revisionRounds}} раунд(ів) узгоджених правок у межах первинного ТЗ; додаткові ітерації оплачуються окремо згідно з Розділом 4.',
  },
  {
    clauseId: 'VETTED-ACC-STANDARD-02',
    module: 'ACCEPTANCE_AND_REVISIONS',
    posture: 'BALANCED',
    sectionNumber: '3',
    titleEn: 'Collaborative QA Acceptance & Reasonable Cure Period',
    titleUk: 'Спільна перевірка QA та погоджений строк виправлення багів',
    rationaleEn:
      'Balances client testing needs with an objective acceptance window and a guaranteed cure window before any fee withholding.',
    rationaleUk:
      'Збалансований механізм приймання: Замовник перевіряє відповідність специфікації, а Виконавець отримує гарантований час на усунення помилок.',
    templateEn:
      '3.1 Objective Acceptance Criteria. Client shall review each Deliverable against written technical specifications within {{acceptanceDays}} business days. Unreasonable refusal unrelated to documented bugs is excluded.\n3.2 Cure Window & Revisions. If material defects are reported in writing, Contractor shall have ten (10) business days to cure them at no extra charge. Up to {{revisionRounds}} revision round(s) are included per milestone.',
    templateUk:
      '3.1 Об’єктивні критерії приймання. Замовник перевіряє результат на відповідність письмовому ТЗ протягом {{acceptanceDays}} робочих днів; відмова в прийманні не може ґрунтуватися на суб’єктивних смаках.\n3.2 Гарантія усунення дефектів. У разі виявлення відтворюваних дефектів Виконавець усуває їх протягом 10 робочих днів. Включено до {{revisionRounds}} раунд(ів) узгоджених правок.',
  },

  // 4. CHANGE_CONTROL_OUT_OF_SCOPE
  {
    clauseId: 'VETTED-CHG-WRITTEN-01',
    module: 'CHANGE_CONTROL_OUT_OF_SCOPE',
    posture: 'CONTRACTOR_PROTECTIVE',
    sectionNumber: '4',
    titleEn: 'Strict Written Change Order for Out-of-Scope Requests',
    titleUk: 'Письмовий Change Order та оплата позапланових задач',
    rationaleEn:
      'Stops "can you also quickly add..." requests from turning into unpaid labor; requires written fee & deadline adjustment before starting extra tasks.',
    rationaleUk:
      'Захищає від безкоштовних доробок («доробіть ще оце заодно»): будь-які нові вимоги вимагають письмового погодження вартості та дедлайну.',
    templateEn:
      '4.1 Out-of-Scope Requests. Any feature, third-party integration, extra screen, or revision beyond {{revisionRounds}} round(s) (including items listed in Exclusions: {{exclusions}}) constitutes Out-of-Scope Work.\n4.2 Written Change Order. Contractor has no obligation to perform Out-of-Scope Work until both parties approve in writing (email/Slack/Jira confirmation suffices) the adjusted delivery date and additional fee at {{hourlyRate}} {{currency}}/hour.',
    templateUk:
      '4.1 Позапланові роботи. Будь-які нові функції, інтеграції чи правки понад {{revisionRounds}} раунд(и) (включно з переліком виключень: {{exclusions}}) є додатковими роботами (Out-of-Scope).\n4.2 Письмовий Change Order. Виконавець не приступає до додаткових робіт без письмового погодження сторонами (у т.ч. через email або таск-трекер) нового строку здачі та додаткової оплати за ставкою {{hourlyRate}} {{currency}}/год.',
  },
  {
    clauseId: 'VETTED-CHG-BUFFER-02',
    module: 'CHANGE_CONTROL_OUT_OF_SCOPE',
    posture: 'BALANCED',
    sectionNumber: '4',
    titleEn: 'Controlled Change Process with Timeline Extension',
    titleUk: 'Керований порядок змін з автоматичним зсувом строків',
    rationaleEn:
      'Allows minor swap-ins of equal effort while automatically extending the deadline whenever Client changes requirements mid-sprint.',
    rationaleUk:
      'Дозволяє рівноцінну заміну дрібних задач у беклозі та автоматично подовжує дедлайни на час, потрібний на зміни замовника.',
    templateEn:
      '4.1 Scope Swap & Change Requests. Minor equivalent-effort adjustments may be swapped before sprint start. Material additions require a signed Change Request specifying impact on {{totalFee}} {{currency}} budget or {{hourlyRate}} {{currency}}/hour extra billing.\n4.2 Automatic Deadline Relief. Any Client-requested change or delayed Client dependency extends {{deadlineDate}} day-for-day without constituting delay by Contractor.',
    templateUk:
      '4.1 Зміна вимог та рівноцінний обмін. Дрібні задачі однакового обсягу можуть замінюватися до старту спринту; суттєві розширення оформлюються додатковою оцінкою (за ставкою {{hourlyRate}} {{currency}}/год).\n4.2 Автоматичне подовження строків. Будь-яка зміна вимог чи затримка матеріалів від Замовника автоматично подовжує дату {{deadlineDate}} на відповідну кількість днів.',
  },

  // 5. IP_AND_BACKGROUND_TOOLS
  {
    clauseId: 'VETTED-IP-UPON-PAYMENT-01',
    module: 'IP_AND_BACKGROUND_TOOLS',
    posture: 'CONTRACTOR_PROTECTIVE',
    sectionNumber: '5',
    titleEn: 'IP Transfers Upon Full Payment + Background Tools Carve-Out',
    titleUk: 'Передача ІВ лише після повної оплати + захист власних бібліотек',
    rationaleEn:
      'Prevents handing over source code before getting paid and protects Contractor’s reusable starter templates, utility libraries, and open-source code.',
    rationaleUk:
      'Гарантує, що права ІВ не перейдуть без грошей, а ваші власні заготовки, скрипти та open-source інструменти залишаються за вами.',
    templateEn:
      '5.1 Conditional Assignment Upon Full Payment. Exclusive economic intellectual property rights in custom Deliverables created specifically for this Agreement transfer to Client strictly upon Contractor’s receipt of full payment for the applicable milestone or final invoice.\n5.2 Background IP & Reusable Tools. Contractor retains all ownership of pre-existing libraries, UI/API starter utilities, frameworks, open-source packages, and general know-how, granting Client a perpetual, non-exclusive license to use any components embedded in paid Deliverables.',
    templateUk:
      '5.1 Передача прав лише після повної оплати. Виключні майнові права інтелектуальної власності на спеціально створений Результат переходять до Замовника виключно з моменту зарахування 100% оплати за відповідний рахунок/етап.\n5.2 Попередні напрацювання. Власні бібліотеки, стартові шаблони, утиліти та загальний досвід Виконавця залишаються в його власності; Замовник отримує невиключну безстрокову ліцензію на їх використання у складі оплаченого Результату.',
  },
  {
    clauseId: 'VETTED-IP-WORKFORHIRE-02',
    module: 'IP_AND_BACKGROUND_TOOLS',
    posture: 'BALANCED',
    sectionNumber: '5',
    titleEn: 'Paid-Work IP Assignment with Open-Source Carve-Out',
    titleUk: 'Передача прав на оплачений код із застереженням щодо Open-Source',
    rationaleEn:
      'Satisfies enterprise clients seeking clean chain of title for paid custom code while explicitly exempting third-party open-source dependencies.',
    rationaleUk:
      'Забезпечує замовнику повні права на оплачений кастомний код, чітко відокремлюючи сторонні open-source бібліотеки (MIT/Apache).',
    templateEn:
      '5.1 Work Product Ownership. Subject to receipt of all due fees, Contractor assigns all worldwide copyright and economic IP rights in custom project Deliverables to Client.\n5.2 Third-Party & Open-Source Components. Open-source libraries and Contractor’s generic pre-existing utilities remain governed by their respective licenses or non-exclusive embedded license grants.',
    templateUk:
      '5.1 Майнові права на оплачений результат. За умови повної оплати Замовник набуває усіх виключних майнових прав на створений під замовлення програмний код у всьому світі.\n5.2 Сторонні та Open-Source компоненти. Використані відкриті бібліотеки регулюються їхніми ліцензіями (MIT/Apache тощо), а загальні інструменти Виконавця надаються на умовах невиключної ліцензії.',
  },

  // 6. LIABILITY_AND_INDEMNITY
  {
    clauseId: 'VETTED-LIAB-CAP3M-01',
    module: 'LIABILITY_AND_INDEMNITY',
    posture: 'CONTRACTOR_PROTECTIVE',
    sectionNumber: '6',
    titleEn: 'Aggregate Liability Cap & Exclusion of Lost Profits',
    titleUk: 'Обмеження відповідальності ({{liabilityCapMonths}} міс.) без упущеної вигоди',
    rationaleEn:
      'Eliminates existential FOP risk by capping total damages at fees paid over N months and excluding lost profits or consequential claims.',
    rationaleUk:
      'Захищає ФОП та невеликі агенції від багатомільйонних позовів за упущений прибуток клієнта та обмежує стелю відповідальності.',
    templateEn:
      '6.1 Waiver of Consequential Damages. Neither party shall be liable for indirect, incidental, special, or consequential damages, loss of revenue, lost profits, or business interruption.\n6.2 Liability Ceiling. Except for willful misconduct or unpaid fees owed by Client, each party’s aggregate cumulative liability arising out of this Agreement shall not exceed the fees actually received by Contractor during the preceding {{liabilityCapMonths}} month(s) (or total fee paid under this SOW if shorter).',
    templateUk:
      '6.1 Виключення непрямих збитків. Жодна зі Сторін не несе відповідальності за непрямі збитки, втрачену вигоду, репутаційні втрати або недоотриманий прибуток.\n6.2 Верхня межа відповідальності. За винятком умисного порушення або обов’язку Замовника оплатити послуги, сукупна відповідальність Виконавця за цим Договором обмежується сумою фактично отриманої винагороди за останні {{liabilityCapMonths}} міс. (але не більше сплаченої суми за SOW).',
  },
  {
    clauseId: 'VETTED-LIAB-CAP6M-02',
    module: 'LIABILITY_AND_INDEMNITY',
    posture: 'BALANCED',
    sectionNumber: '6',
    titleEn: 'Mutual Capped Liability with IP Indemnity Safeguard',
    titleUk: 'Взаємне обмеження відповідальності з гарантією чистоти коду',
    rationaleEn:
      'Provides a slightly broader cap with mutual IP originality assurances that satisfy EU/US B2B procurement reviews without uncapped exposure.',
    rationaleUk:
      'Збалансований варіант із взаємним лімітом відповідальності та гарантією оригінальності коду без ризику необмежених штрафів.',
    templateEn:
      '6.1 Mutual Damages Cap. Excluding breach of confidentiality and Client’s payment obligations, neither party is liable for lost profits, and each party’s aggregate liability is capped at total fees paid during the preceding {{liabilityCapMonths}} month(s).\n6.2 Originality Warranty. Contractor warrants that custom code written by Contractor does not knowingly infringe third-party copyrights.',
    templateUk:
      '6.1 Взаємний ліміт відповідальності. За винятком порушення конфіденційності та обов’язку оплати, жодна зі Сторін не відповідає за упущену вигоду, а загальна відповідальність кожної Сторони обмежена сумою оплат за останні {{liabilityCapMonths}} міс.\n6.2 Гарантія оригінальності. Виконавець гарантує, що власноруч створений код не містить неправомірних запозичень чужої інтелектуальної власності.',
  },

  // 7. CONFIDENTIALITY_AND_PORTFOLIO
  {
    clauseId: 'VETTED-NDA-2YR-01',
    module: 'CONFIDENTIALITY_AND_PORTFOLIO',
    posture: 'CONTRACTOR_PROTECTIVE',
    sectionNumber: '7',
    titleEn: 'Mutual 2-Year NDA + Portfolio Showcase & Non-Restrictive Skills',
    titleUk: 'Взаємний NDA (2 роки), право на кейс у портфоліо та вільна робота на ринку',
    rationaleEn:
      'Protects confidential credentials for a fixed 2-year term, expressly rejects industry non-competes, and preserves your right to cite public work in your portfolio.',
    rationaleUk:
      'Фіксує розумний дворічний NDA, гарантує відсутність заборони на професію (non-compete) та зберігає право показувати проєкт у портфоліо.',
    templateEn:
      '7.1 Mutual Confidentiality (2 Years). For two (2) years following disclosure, both parties shall protect marked Confidential Information with reasonable care, excluding public, independently developed, or lawfully obtained data.\n7.2 No Non-Compete & Portfolio Right. Nothing restricts Contractor from providing IT services to other clients in any industry. Upon public launch (or anonymized after delivery), Contractor may list Client’s name/logo and high-level case summary in Contractor’s portfolio.',
    templateUk:
      '7.1 Взаємна конфіденційність (2 роки). Протягом 2 (двох) років Сторони зберігають конфіденційність комерційної та технічної інформації, крім загальнодоступних даних чи незалежних розробок.\n7.2 Відсутність Non-Compete та портфоліо. Договір не обмежує право Виконавця працювати з іншими клієнтами в будь-якій галузі. Після публічного релізу (або в знеособленому вигляді) Виконавець може вказувати проєкт у власному портфоліо.',
  },
  {
    clauseId: 'VETTED-NDA-STRICT-02',
    module: 'CONFIDENTIALITY_AND_PORTFOLIO',
    posture: 'BALANCED',
    sectionNumber: '7',
    titleEn: 'Mutual Strict NDA with Explicit Consent for Portfolio',
    titleUk: 'Суворий взаємний NDA з публікацією портфоліо за згодою',
    rationaleEn:
      'Protects stealth-mode startups via strict secrecy and consent-based logo use while still protecting Contractor’s right to reuse general technical skills.',
    rationaleUk:
      'Підходить для стартапів у режимі stealth: згадка у портфоліо за попереднім погодженням, але без заборони використовувати технічний досвід.',
    templateEn:
      '7.1 Mutual Non-Disclosure (3 Years). Neither party shall disclose Confidential Information or non-public product roadmaps for three (3) years without prior written consent.\n7.2 Portfolio Consent & General Skills. Public attribution requires Client’s written consent (email approval). Residual general technical knowledge retained in unaided memory may always be used cleanly.',
    templateUk:
      '7.1 Суворий взаємний NDA (3 роки). Протягом 3 (трьох) років Сторони зобов’язуються не розголошувати конфіденційні матеріали без письмової згоди.\n7.2 Портфоліо за згодою та вільний досвід. Публічна згадка бренду Замовника потребує попереднього погодження; загальний професійний досвід Виконавця не обмежується.',
  },

  // 8. TERMINATION_AND_FOP_COMPLIANCE
  {
    clauseId: 'VETTED-TERM-14D-01',
    module: 'TERMINATION_AND_FOP_COMPLIANCE',
    posture: 'CONTRACTOR_PROTECTIVE',
    sectionNumber: '8',
    titleEn: '14-Day Bilateral Notice, WIP Payment & FOP Group 3 Export Terms',
    titleUk: 'Розірвання за 14 днів з оплатою WIP та ЗЕД-умови ФОП 3 групи',
    rationaleEn:
      'Guarantees full compensation for work-in-progress if the client cancels early and includes Ukrainian FOP Group 3 / NBU cross-border invoice compliance.',
    rationaleUk:
      'Зобов’язує замовника оплатити весь виконаний обсяг (WIP) при достроковому виході та містить правильне формулювання акта-інвойсу для ФОП ЗЕД.',
    templateEn:
      '8.1 Termination with Paid Work-in-Progress. Either party may terminate on fourteen (14) calendar days’ written notice. Upon any termination without Contractor’s uncured breach, Client shall pay for all completed milestones and work-in-progress up to the effective termination date.\n8.2 Independent Contractor & Governing Law. Contractor acts as an independent B2B contractor (including under Ukraine’s simplified FOP Group 3 tax regime; electronic invoice/payment serves as acceptance Act under Law No. 1724-VIII). Governing law: {{governingLaw}}.',
    templateUk:
      '8.1 Розірвання з оплатою виконаного обсягу (WIP). Кожна зі Сторін може розірвати договір з повідомленням за 14 календарних днів. Замовник зобов’язаний оплатити всі фактично виконані до дати припинення етапи та витрачений час.\n8.2 Незалежний підрядник / ФОП ЗЕД та право. Виконавець діє як незалежний суб’єкт (зокрема ФОП 3 групи; оплата інвойсу є підтвердженням надання послуг за ЗУ №1724-VIII для валютного нагляду). Право: {{governingLaw}}.',
  },
  {
    clauseId: 'VETTED-TERM-30D-02',
    module: 'TERMINATION_AND_FOP_COMPLIANCE',
    posture: 'BALANCED',
    sectionNumber: '8',
    titleEn: '30-Day Wind-Down, Handover & Governing Law',
    titleUk: '30-денне повідомлення про вихід, передача коду та юрисдикція',
    rationaleEn:
      'Provides a clean 30-day transition window with repository handover tied strictly to final settlement.',
    rationaleUk:
      'Забезпечує плавну передачу репозиторіїв протягом 30 днів після повного фінансового розрахунку за виконану роботу.',
    templateEn:
      '8.1 Termination & Transition (30 Days). Either party may terminate for convenience with thirty (30) days’ written notice or immediately for material breach uncured after ten (10) business days. Handover of final work product is contingent upon settlement of all earned fees.\n8.2 Independent Status & Law. Both parties act as independent businesses. Governing law & venue: {{governingLaw}}.',
    templateUk:
      '8.1 Порядок виходу (30 днів). Кожна Сторона може припинити співпрацю з повідомленням за 30 календарних днів; передача фінальних результатів здійснюється після повного розрахунку за відпрацьований період.\n8.2 Незалежний статус та право. Сторони діють як незалежні підприємці без трудових відносин. Застосовне право: {{governingLaw}}.',
  },
];

export const CONTRACT_TEMPLATES: ContractTemplateDefinition[] = [
  {
    templateId: 'TPL-FOP-SOW-FIXED',
    titleEn: 'Fixed-Price Milestone SOW (Web / App / Design)',
    titleUk: 'Фіксований SOW на етапи розробки / дизайну',
    subtitleEn: 'Protects fixed bids with explicit exclusions, milestone deposits, 5-day deemed acceptance, and paid change orders.',
    subtitleUk: 'Захищає фіксовану ціну: чіткі виключення, аванс, 5-денне мовчазне приймання та платні Change Order.',
    idealForEn: 'Fixed-budget MVPs, landing pages, design systems, and agency builds.',
    idealForUk: 'MVP з фіксованим бюджетом, лендінги, дизайн-системи, проєктні етапи.',
    defaultPricingModel: 'FIXED_PRICE',
    modules: MODULE_ORDER,
    defaultParameters: {
      pricingModel: 'FIXED_PRICE',
      upfrontPercent: 40,
      paymentWindowDays: 10,
      acceptanceDays: 5,
      revisionRounds: 2,
      liabilityCapMonths: 3,
      governingLaw: 'Laws of Ukraine / International B2B Invoice Rules',
    },
  },
  {
    templateId: 'TPL-FOP-MSA',
    titleEn: 'FOP Group 3 Master Service Agreement (MSA)',
    titleUk: 'Рамковий IT-договір (MSA) для ФОП 3 групи',
    subtitleEn: 'Reusable B2B framework covering NBU export invoice compliance, IP-upon-payment, 3-month liability cap, and no non-compete.',
    subtitleUk: 'Базовий рамковий договір: ЗЕД-інвойси (ЗУ №1724-VIII), IP після оплати, ліміт відповідальності та без non-compete.',
    idealForEn: 'Long-term EU/US or Ukrainian IT client retainers.',
    idealForUk: 'Тривала B2B-співпраця з іноземними та українськими IT-клієнтами.',
    defaultPricingModel: 'TIME_AND_MATERIALS',
    modules: MODULE_ORDER,
    defaultParameters: {
      pricingModel: 'TIME_AND_MATERIALS',
      upfrontPercent: 0,
      paymentWindowDays: 10,
      acceptanceDays: 5,
      revisionRounds: 2,
      liabilityCapMonths: 3,
      governingLaw: 'Laws of England and Wales (or Ukraine for domestic FOP)',
    },
  },
  {
    templateId: 'TPL-SOW-TM',
    titleEn: 'Time & Materials / Dedicated Contractor SOW',
    titleUk: 'Договір погодинної оплати (Time & Materials SOW)',
    subtitleEn: 'Billed hourly or monthly without fixed-price penalty traps, with non-binding sprint estimates and 14-day WIP exit.',
    subtitleUk: 'Погодинний білінг без фіксованих штрафів, з орієнтовними оцінками беклогу та оплатою WIP при виході.',
    idealForEn: 'Staff augmentation, ongoing backend/frontend engineering, QA support.',
    idealForUk: 'Аутстафінг, регулярна розробка бекенду/фронтенду, QA-супровід.',
    defaultPricingModel: 'TIME_AND_MATERIALS',
    modules: MODULE_ORDER,
    defaultParameters: {
      pricingModel: 'TIME_AND_MATERIALS',
      upfrontPercent: 0,
      paymentWindowDays: 14,
      acceptanceDays: 5,
      revisionRounds: 2,
      liabilityCapMonths: 3,
      governingLaw: 'Laws of Ukraine / Delaware USA (negotiable)',
    },
  },
  {
    templateId: 'TPL-MUTUAL-NDA',
    titleEn: 'Mutual B2B NDA & Portfolio Rights Agreement',
    titleUk: 'Збалансований взаємний NDA + права на портфоліо',
    subtitleEn: 'Symmetric 2-year secrecy rules without hidden sector-wide non-compete bans blocking your freelance career.',
    subtitleUk: 'Симетрична конфіденційність на 2 роки без прихованої заборони працювати з іншими ІТ-клієнтами.',
    idealForEn: 'Pre-sale discovery calls, code audits, architectural consulting.',
    idealForUk: 'Пресейл, аудит коду, технічний консалтинг перед стартом проєкту.',
    defaultPricingModel: 'FIXED_PRICE',
    modules: [
      'SCOPE_AND_DELIVERABLES',
      'CONFIDENTIALITY_AND_PORTFOLIO',
      'IP_AND_BACKGROUND_TOOLS',
      'LIABILITY_AND_INDEMNITY',
      'TERMINATION_AND_FOP_COMPLIANCE',
    ],
    defaultParameters: {
      pricingModel: 'FIXED_PRICE',
      upfrontPercent: 0,
      paymentWindowDays: 10,
      acceptanceDays: 5,
      revisionRounds: 1,
      liabilityCapMonths: 3,
      governingLaw: 'Laws of Ukraine / EU Mutual Arbitration',
    },
  },
];

export const BUILDER_SCENARIOS: BuilderScenarioPreset[] = [
  {
    id: 'scenario-saas-mvp',
    labelEn: 'SaaS MVP ($8,500 Fixed SOW)',
    labelUk: 'SaaS MVP ($8,500 фіксований SOW)',
    templateId: 'TPL-FOP-SOW-FIXED',
    plainTextEn:
      'Client: NordPay Fintech GmbH. Contractor: FOP Olena Kovalenko. Project: B2B Client Portal MVP (Next.js frontend, Node.js REST API, Stripe webhook billing). Price: $8,500 USD fixed, 40% upfront deposit, 60% after launch, pay within 10 days. Out of scope: iOS mobile app, SEO copywriting, DevOps infrastructure setup. Deadline: December 20, 2026. 2 rounds of UI revisions.',
    plainTextUk:
      'Замовник: NordPay Fintech GmbH. Виконавець: ФОП Олена Коваленко. Проєкт: B2B-портал клієнта MVP (Next.js фронтенд, Node.js API, інтеграція Stripe). Бюджет: $8,500 USD фіксовано, 40% передоплата, 60% після запуску, оплата 10 днів. Поза скоупом: мобільний додаток iOS, наповнення контентом, налаштування серверів. Дедлайн: 20 грудня 2026. 2 раунди правок дизайну.',
  },
  {
    id: 'scenario-vagueness-trap',
    labelEn: 'Messy Telegram Note (Detects Omissions)',
    labelUk: 'Нотатка з чату (виявляє пропущені умови)',
    templateId: 'TPL-FOP-SOW-FIXED',
    plainTextEn:
      'Need a contract for building a Telegram e-commerce mini-app for BrightStore LLC for $3,200 EUR, deadline November 30, hourly rate 45 EUR for extras.',
    plainTextUk:
      'Потрібен договір на розробку Telegram mini-app магазину для BrightStore LLC за 3200 EUR, дедлайн 30 листопада, додаткові години по 45 EUR.',
  },
  {
    id: 'scenario-tm-retainer',
    labelEn: 'Senior React Retainer ($45/hr T&M)',
    labelUk: 'Погодинний контракт Senior React ($45/год)',
    templateId: 'TPL-SOW-TM',
    plainTextEn:
      'Client: Veridian Cloud Inc. Contractor: Kovalenko Digital Agency FOP. Ongoing React/TypeScript frontend architecture and code reviews at $45 USD/hour, monthly cap ~160h ($7,200 USD), net 14 days payment, background UI kit stays ours.',
    plainTextUk:
      'Замовник: Veridian Cloud Inc. Виконавець: агенція Коваленко Digital ФОП. Погодинна розробка React/TypeScript та код-рев’ю за ставкою $45 USD/год, орієнтовно $7,200 USD/міс, оплата 14 днів, власні UI-компоненти залишаються у виконавця.',
  },
];

export function interpolateClauseText(template: string, params: ContractParameters): string {
  const remainingPercent = Math.max(0, 100 - (Number.isFinite(params.upfrontPercent) ? params.upfrontPercent : 40));
  const tokens: Record<string, string> = {
    clientName: params.clientName,
    contractorName: params.contractorName,
    projectTitle: params.projectTitle,
    projectScope: params.projectScope,
    deliverablesList: params.deliverablesList,
    exclusions: params.exclusions,
    pricingModel: params.pricingModel === 'FIXED_PRICE' ? 'Fixed-Price Milestone' : 'Time & Materials',
    totalFee: params.totalFee,
    currency: params.currency,
    hourlyRate: params.hourlyRate,
    upfrontPercent: String(params.upfrontPercent),
    remainingPercent: String(remainingPercent),
    paymentWindowDays: String(params.paymentWindowDays),
    acceptanceDays: String(params.acceptanceDays),
    revisionRounds: String(params.revisionRounds),
    deadlineDate: params.deadlineDate,
    liabilityCapMonths: String(params.liabilityCapMonths),
    governingLaw: params.governingLaw,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => tokens[key] ?? '');
}
