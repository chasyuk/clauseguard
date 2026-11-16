import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, rgb } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLES_DIR = path.resolve(__dirname, '../../samples');

async function buildDocx(title: string, paragraphs: string[]): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 240 },
          }),
          ...paragraphs.map(
            (text) =>
              new Paragraph({
                children: [new TextRun({ text, size: 22 })],
                spacing: { after: 180 },
              }),
          ),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

async function generateEnglishMsa(): Promise<void> {
  const lines = [
    'MASTER SERVICES AGREEMENT (B2B SOFTWARE DEVELOPMENT)',
    'This Master Services Agreement ("Agreement") is entered into as of November 1, 2026, by and between Apex Global Solutions Inc. ("Client") and Independent Contractor ("Contractor").',
    '1. Scope of Services. Contractor shall design, develop, and deliver software modules and technical documentation as specified in written Statements of Work signed by both parties.',
    '2. Acceptance Criteria. Client shall have thirty (30) calendar days to test deliverables. Deliverables shall only be deemed accepted upon Client issuing a formal written sign-off certificate at its sole discretion.',
    '3.2. Payment Terms and Delayed Payouts. Client shall pay Contractor undisputed invoices within sixty (60) days after formal written acceptance of the final milestone, provided however that Client shall have no obligation to pay Contractor until Client has first received corresponding payment from its end-customer ("pay-when-paid").',
    '4.1. Intellectual Property Assignment. Upon creation, Contractor hereby irrevocably assigns to Client all worldwide right, title, and interest in all Deliverables, including any pre-existing code libraries, reusable templates, open-source helpers, developer tools, and general know-how utilized or incorporated by Contractor, regardless of whether invoices for such work have been paid.',
    '5.1. Unlimited Liability and Indemnification. Contractor shall indemnify, defend, and hold harmless Client from any and all claims, damages, lost profits, indirect, incidental, or consequential damages arising out of or relating to this Agreement. Contractor\'s aggregate liability under this Agreement shall be completely unlimited and uncapped.',
    '6.1. Liquidated Damages and Penalties. If Contractor delivers any milestone even one (1) day past the estimated schedule, Contractor shall immediately pay Client a fixed penalty of USD $15,000 plus a continuing penalty of two percent (2%) of the total contract value per calendar day of delay, which Client may deduct unilaterally from any pending invoice.',
    '7.1. Non-Compete and Exclusivity. During the term of this Agreement and for a period of twenty-four (24) months following termination for any reason, Contractor shall not directly or indirectly provide any software development, UI/UX design, or consulting services to any company operating in the technology, SaaS, fintech, or e-commerce sectors worldwide.',
    '8.1. Governing Law. This Agreement is governed by the laws of the State of Delaware, and any dispute shall be resolved exclusively by binding arbitration in New York, NY, with all arbitration fees borne initially by Contractor.',
  ];

  const buffer = await buildDocx('MASTER SERVICES AGREEMENT — SAMPLE 01', lines);
  await fs.writeFile(path.join(SAMPLES_DIR, '01_Predatory_IT_MSA_EN.docx'), buffer);
}

async function generateUkrainianFopSow(): Promise<void> {
  const lines = [
    'ДОГОВІР № 14/2026 ПРО НАДАННЯ ІТ-ПОСЛУГ (ФОП 3 ГРУПА)',
    'м. Київ, 01 листопада 2026 року. ТОВ "ТехноІнвест Груп" (далі — "Замовник") та Фізична особа-підприємець (платник єдиного податку 3 групи, далі — "Виконавець") уклали цей Договір про наступне:',
    '1.1. Предмет Договору. Виконавець зобов\'язується надати послуги з розробки веб-додатку та програмного забезпечення відповідно до Технічного завдання, а Замовник зобов\'язується прийняти та оплатити належним чином надані послуги.',
    '2.1. Порядок здачі-приймання послуг. Замовник розглядає надані результати послуг у довільний строк без обмеження часу та підписує Акт наданих послуг виключно після підтвердження від свого кінцевого іноземного партнера.',
    '3.4. Вартість послуг та порядок розрахунків. Оплата вартості послуг здійснюється Замовником протягом шістдесяти (60) банківських днів з дати підписання Акта наданих послуг та виключно за умови фактичного надходження валютної виручки від кінцевого клієнта Замовника.',
    '4.2. Права інтелектуальної власності. Усі виключні майнові права інтелектуальної власності на створений програмний код, а також на всі попередні напрацювання, власні бібліотеки, шаблони та методики Виконавця переходять до Замовника з моменту їх створення, незалежно від факту проведення оплати за цим Договором.',
    '5.1. Необмежена відповідальність сторін. Виконавець несе повну та необмежену матеріальну відповідальність за будь-які прямі та непрямі збитки Замовника, включаючи упущену вигоду та репутаційні втрати, без встановлення будь-якої верхньої межі компенсації.',
    '6.2. Штрафні санкції та пеня. У разі порушення Виконавцем строку здачі будь-якого етапу робіт хоча б на один день, Виконавець зобов\'язаний сплатити штраф у розмірі 50 000 грн та пеню у розмірі 5% від загальної суми Договору за кожен календарний день прострочення.',
    '7.1. Застереження про неконкуренцію (Non-Compete). Протягом дії цього Договору та протягом трьох (3) років після його припинення Виконавець не має права надавати будь-які послуги з розробки програмного забезпечення, дизайну або ІТ-консалтингу іншим компаніям у сфері інформаційних технологій на території України та ЄС.',
    '8.1. Прикінцеві положення. Замовник має право в односторонньому порядку розірвати Договір у будь-який момент без попереднього повідомлення та без оплати фактично виконаного, але не прийнятого Замовником обсягу послуг.',
  ];

  const buffer = await buildDocx('ДОГОВІР ПРО НАДАННЯ ІТ-ПОСЛУГ — ЗРАЗОК 02', lines);
  await fs.writeFile(path.join(SAMPLES_DIR, '02_Unfair_FOP_SOW_UK.docx'), buffer);
}

async function generateMixedPdf(): Promise<void> {
  const fontPath = '/usr/share/fonts/adwaita-sans-fonts/AdwaitaSans-Regular.ttf';
  const fontBytes = await fs.readFile(fontPath);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const customFont = await pdfDoc.embedFont(fontBytes);

  const sections = [
    'BILINGUAL NDA & SERVICE ADDENDUM (ДВОМОВНИЙ ДОГОВІР NDA)',
    '1. Parties / Сторони: Digital Venture Studio LLC ("Client") and Boutique Agency / ФОП Виконавець ("Provider").',
    '2. Payment Terms / Оплата: All invoices shall be settled within forty-five (45) calendar days after invoice approval. Замовник має право призупинити виплату винагороди на невизначений термін у разі зауважень до коду.',
    '3. Intellectual Property / Інтелектуальна власність: Provider transfers all pre-existing internal tools and proprietary frameworks to Client upon signing, before any invoice is paid.',
    '4. Confidentiality & Penalty / Штраф за розголошення: Any accidental disclosure or minor delay triggers an automatic liquidated penalty of USD $10,000 (десять тисяч доларів США), payable within 5 days without proof of actual loss.',
    '5. Liability / Відповідальність: Сторони погодили, що Виконавець несе повну необмежену відповідальність за збитки, тоді як відповідальність Замовника обмежується сумою в $100.',
  ];

  let page = pdfDoc.addPage([595, 842]);
  let y = 780;
  const maxWidth = 500;
  const fontSize = 11;
  const lineHeight = 16;

  for (const paragraph of sections) {
    const wrapped = wrapText(paragraph, customFont, fontSize, maxWidth);
    for (const line of wrapped) {
      if (y < 60) {
        page = pdfDoc.addPage([595, 842]);
        y = 780;
      }
      page.drawText(line, {
        x: 48,
        y,
        size: fontSize,
        font: customFont,
        color: rgb(0.08, 0.1, 0.15),
      });
      y -= lineHeight;
    }
    y -= 10;
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(path.join(SAMPLES_DIR, '03_Mixed_NDA_Service.pdf'), pdfBytes);
}

async function generateScannedOnlyPdf(): Promise<void> {
  // Creates a 2-page PDF containing only vector scan-like rectangles/lines and ZERO text characters
  const pdfDoc = await PDFDocument.create();
  for (let p = 0; p < 2; p++) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawRectangle({
      x: 45,
      y: 60,
      width: 505,
      height: 720,
      borderColor: rgb(0.75, 0.78, 0.82),
      borderWidth: 1.5,
      color: rgb(0.97, 0.97, 0.98),
    });
    // Draw horizontal scan-line bars mimicking photographed text lines without text layer
    for (let lineY = 730; lineY > 120; lineY -= 26) {
      page.drawRectangle({
        x: 70,
        y: lineY,
        width: 380 + ((lineY * 13) % 70),
        height: 8,
        color: rgb(0.55, 0.58, 0.63),
      });
    }
  }
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(path.join(SAMPLES_DIR, '04_Scanned_Image_Only_Test.pdf'), pdfBytes);
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, size: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function main() {
  await fs.mkdir(SAMPLES_DIR, { recursive: true });
  await generateEnglishMsa();
  await generateUkrainianFopSow();
  await generateMixedPdf();
  await generateScannedOnlyPdf();
  console.log('Generated 4 sample files in:', SAMPLES_DIR);
}

main().catch((err) => {
  console.error('Failed to generate samples:', err);
  process.exit(1);
});
