import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { createUnicodePdfDocument, PDF_COLORS, wrapPdfLines } from '../pdf/fontHelper.js';
import { AssembledContractResult } from './contractBuilder.js';

function getUkrainianDate(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const monthsUk = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
  ];
  const month = monthsUk[d.getMonth()] || 'січня';
  const year = d.getFullYear();
  return `«${day}» ${month} ${year} р.`;
}

function getEnglishDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Exports an assembled vetted contract to a clean, formal Microsoft Word (.docx) document
 * styled as an authentic Ukrainian legal agreement.
 */
export async function generateAssembledContractDocx(
  assembled: AssembledContractResult,
): Promise<Buffer> {
  const isUk = assembled.contractLanguage === 'uk';
  const today = new Date();
  const dateStr = isUk ? getUkrainianDate(today) : getEnglishDate(today);
  const cityStr = isUk ? 'м. Вінниця' : 'City of Kyiv / Remote';

  const children: Paragraph[] = [];

  // 1. Centered Title: ДОГОВІР № 20-CG
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({
          text: isUk ? 'ДОГОВІР № 20-CG' : 'AGREEMENT NO. 20-CG',
          bold: true,
          size: 28, // 14pt
          font: 'Times New Roman',
        }),
      ],
    }),
  );

  // 2. Subtitle: Template Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: assembled.templateTitle.toUpperCase(),
          bold: true,
          size: 22, // 11pt
          font: 'Times New Roman',
        }),
      ],
    }),
  );

  // 3. City (left) and Date (right)
  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: cityStr,
          bold: true,
          size: 22,
          font: 'Times New Roman',
        }),
        new TextRun({
          text: '                                                                                ',
        }),
        new TextRun({
          text: dateStr,
          bold: true,
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
  );

  // 4. Formal Preamble
  const preambleLines = isUk
    ? [
        `    ${assembled.parameters.clientName}, що діє на підставі статуту / реєстраційних документів (надалі – «Замовник»), з однієї сторони,`,
        `    та ${assembled.parameters.contractorName}, що діє на підставі статуту / виписки з ЄДР (надалі – «Виконавець»), з іншої сторони,`,
        `    разом іменовані «Сторони», а кожна окремо – «Сторона», уклали даний Договір про наступне:`,
      ]
    : [
        `    ${assembled.parameters.clientName} (hereinafter referred to as the "Client"), of the first part, and`,
        `    ${assembled.parameters.contractorName} (hereinafter referred to as the "Contractor"), of the second part,`,
        `    collectively referred to as the "Parties" and individually as a "Party", have entered into this Agreement as follows:`,
      ];

  for (const line of preambleLines) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 60, after: 60, line: 276 },
        children: [
          new TextRun({
            text: line,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
    );
  }

  // 5. Numbered Legal Sections
  for (const [idx, section] of assembled.sections.entries()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 260, after: 120 },
        children: [
          new TextRun({
            text: `РОЗДІЛ ${idx + 1}. ${section.title.toUpperCase()}`,
            bold: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
    );

    // Split paragraphs, add legal paragraph indent, clean away any technical tags
    for (const para of section.renderedText.split('\n').filter((l) => l.trim().length > 0)) {
      const cleanPara = para.replace(/\[VETTED-[^\]]+\]/g, '').trim();
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100, line: 276 },
          children: [
            new TextRun({
              text: `    ${cleanPara}`,
              size: 22,
              font: 'Times New Roman',
            }),
          ],
        }),
      );
    }
  }

  // 6. Signatures and Requisites Block
  const sigSectionNumber = assembled.sections.length + 1;
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 320, after: 160 },
      children: [
        new TextRun({
          text: isUk
            ? `РОЗДІЛ ${sigSectionNumber}. МІСЦЕЗНАХОДЖЕННЯ, РЕКВІЗИТИ ТА ПІДПИСИ СТОРІН`
            : `SECTION ${sigSectionNumber}. ADDRESSES, DETAILS & SIGNATURES`,
          bold: true,
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
  );

  const sigRows = isUk
    ? [
        { left: 'ЗАМОВНИК:', right: 'ВИКОНАВЕЦЬ:', bold: true },
        { left: assembled.parameters.clientName, right: assembled.parameters.contractorName, bold: true },
        { left: 'Адреса: [Юридична адреса]', right: 'Адреса: [Юридична адреса]', bold: false },
        { left: 'Код ЄДРПОУ: ___________________', right: 'РНОКПП / ЄДРПОУ: ________________', bold: false },
        { left: 'IBAN: ___________________________', right: 'IBAN: ___________________________', bold: false },
        { left: 'Банк: ___________________________', right: 'Банк: ___________________________', bold: false },
        { left: '', right: '', bold: false },
        { left: 'Підпис: _________________________', right: 'Підпис: _________________________', bold: false },
        { left: `        / ${assembled.parameters.clientName} /`, right: `        / ${assembled.parameters.contractorName} /`, bold: false },
        { left: 'М.П.', right: 'М.П.', bold: true },
      ]
    : [
        { left: 'CLIENT:', right: 'CONTRACTOR:', bold: true },
        { left: assembled.parameters.clientName, right: assembled.parameters.contractorName, bold: true },
        { left: 'Address: [Legal Address]', right: 'Address: [Legal Address]', bold: false },
        { left: 'Tax ID: __________________________', right: 'Tax ID: __________________________', bold: false },
        { left: 'Account: _________________________', right: 'Account: _________________________', bold: false },
        { left: '', right: '', bold: false },
        { left: 'Signature: _______________________', right: 'Signature: _______________________', bold: false },
        { left: `           / ${assembled.parameters.clientName} /`, right: `           / ${assembled.parameters.contractorName} /`, bold: false },
      ];

  for (const row of sigRows) {
    if (!row.left && !row.right) {
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }
    // Pad left column to align nicely
    const leftText = row.left.padEnd(46, ' ');
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `${leftText}    ${row.right}`,
            bold: row.bold,
            size: 20,
            font: 'Courier New',
          }),
        ],
      }),
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

/**
 * Exports an assembled vetted contract to multi-page Unicode A4 PDF with authentic legal formatting.
 */
export async function generateAssembledContractPdf(
  assembled: AssembledContractResult,
): Promise<Buffer> {
  const { pdfDoc, regularFont, boldFont } = await createUnicodePdfDocument();
  const marginX = 48;
  const pageWidth = 595;
  const pageHeight = 842;
  const contentWidth = pageWidth - marginX * 2;
  const isUk = assembled.contractLanguage === 'uk';
  const today = new Date();
  const dateStr = isUk ? getUkrainianDate(today) : getEnglishDate(today);
  const cityStr = isUk ? 'м. Вінниця' : 'City of Kyiv / Remote';

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = 792;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight < 48) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = 792;
    }
  };

  // 1. Centered Document Title
  const titleText = isUk ? 'ДОГОВІР № 20-CG' : 'AGREEMENT NO. 20-CG';
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 14);
  page.drawText(titleText, {
    x: marginX + (contentWidth - titleWidth) / 2,
    y: cursorY,
    size: 14,
    font: boldFont,
    color: PDF_COLORS.ink,
  });
  cursorY -= 18;

  // 2. Subtitle: Template Title
  const subTitle = assembled.templateTitle.toUpperCase();
  const subWidth = boldFont.widthOfTextAtSize(subTitle, 10.5);
  page.drawText(subTitle, {
    x: marginX + Math.max(0, (contentWidth - subWidth) / 2),
    y: cursorY,
    size: 10.5,
    font: boldFont,
    color: PDF_COLORS.ink,
  });
  cursorY -= 20;

  // 3. City (left) and Date (right)
  page.drawText(cityStr, {
    x: marginX,
    y: cursorY,
    size: 9.5,
    font: boldFont,
    color: PDF_COLORS.ink,
  });
  const dateWidth = boldFont.widthOfTextAtSize(dateStr, 9.5);
  page.drawText(dateStr, {
    x: marginX + contentWidth - dateWidth,
    y: cursorY,
    size: 9.5,
    font: boldFont,
    color: PDF_COLORS.ink,
  });
  cursorY -= 22;

  // 4. Formal Preamble
  const preamble = isUk
    ? `${assembled.parameters.clientName}, що діє на підставі статуту / реєстраційних документів (надалі – «Замовник»), з однієї сторони, та ${assembled.parameters.contractorName}, що діє на підставі статуту / виписки з ЄДР (надалі – «Виконавець»), з іншої сторони, разом іменовані «Сторони», а кожна окремо – «Сторона», уклали даний Договір про наступне:`
    : `${assembled.parameters.clientName} (hereinafter referred to as the "Client"), of the first part, and ${assembled.parameters.contractorName} (hereinafter referred to as the "Contractor"), of the second part, collectively referred to as the "Parties" and individually as a "Party", have entered into this Agreement as follows:`;

  const preambleLines = wrapPdfLines(preamble, regularFont, 9, contentWidth);
  for (const line of preambleLines) {
    ensureSpace(14);
    page.drawText(line, {
      x: marginX,
      y: cursorY,
      size: 9,
      font: regularFont,
      color: PDF_COLORS.ink,
    });
    cursorY -= 13;
  }
  cursorY -= 10;

  // 5. Sections
  for (const [idx, section] of assembled.sections.entries()) {
    const heading = `РОЗДІЛ ${idx + 1}. ${section.title.toUpperCase()}`;
    const cleanBody = section.renderedText.replace(/\[VETTED-[^\]]+\]/g, '').trim();
    const bodyLines = wrapPdfLines(cleanBody, regularFont, 8.8, contentWidth);

    ensureSpace(26 + bodyLines.length * 12.5);

    const headingWidth = boldFont.widthOfTextAtSize(heading, 9.5);
    const headingX = headingWidth < contentWidth ? marginX + (contentWidth - headingWidth) / 2 : marginX;
    page.drawText(heading, {
      x: headingX,
      y: cursorY,
      size: 9.5,
      font: boldFont,
      color: PDF_COLORS.ink,
    });
    cursorY -= 16;

    for (const line of bodyLines) {
      ensureSpace(14);
      page.drawText(line, {
        x: marginX,
        y: cursorY,
        size: 8.8,
        font: regularFont,
        color: PDF_COLORS.ink,
      });
      cursorY -= 12.5;
    }
    cursorY -= 8;
  }

  // 6. Signatures and Requisites Block
  ensureSpace(160);
  const sigHeading = isUk
    ? `РОЗДІЛ ${assembled.sections.length + 1}. МІСЦЕЗНАХОДЖЕННЯ, РЕКВІЗИТИ ТА ПІДПИСИ СТОРІН`
    : `SECTION ${assembled.sections.length + 1}. ADDRESSES, DETAILS & SIGNATURES`;
  const sigHeadingWidth = boldFont.widthOfTextAtSize(sigHeading, 9.5);
  page.drawText(sigHeading, {
    x: marginX + Math.max(0, (contentWidth - sigHeadingWidth) / 2),
    y: cursorY,
    size: 9.5,
    font: boldFont,
    color: PDF_COLORS.ink,
  });
  cursorY -= 20;

  page.drawLine({
    start: { x: marginX, y: cursorY },
    end: { x: marginX + contentWidth, y: cursorY },
    thickness: 0.75,
    color: PDF_COLORS.border,
  });
  cursorY -= 16;

  // Two columns for signatures
  const colWidth = (contentWidth - 20) / 2;
  const col1X = marginX;
  const col2X = marginX + colWidth + 20;

  const leftLines = isUk
    ? [
        'ЗАМОВНИК:',
        assembled.parameters.clientName,
        'Адреса: [Вкажіть юридичну адресу]',
        'Код ЄДРПОУ / РНОКПП: ____________',
        'IBAN: ___________________________',
        'Банк: ___________________________',
        '',
        'Підпис: _________________________',
        `        / ${assembled.parameters.clientName} /`,
        'М.П.',
      ]
    : [
        'CLIENT:',
        assembled.parameters.clientName,
        'Address: [Legal Address]',
        'Tax ID: __________________________',
        'Account: _________________________',
        '',
        'Signature: _______________________',
        `           / ${assembled.parameters.clientName} /`,
      ];

  const rightLines = isUk
    ? [
        'ВИКОНАВЕЦЬ:',
        assembled.parameters.contractorName,
        'Адреса: [Вкажіть юридичну адресу]',
        'РНОКПП / ЄДРПОУ: ________________',
        'IBAN: ___________________________',
        'Банк: ___________________________',
        '',
        'Підпис: _________________________',
        `        / ${assembled.parameters.contractorName} /`,
        'М.П.',
      ]
    : [
        'CONTRACTOR:',
        assembled.parameters.contractorName,
        'Address: [Legal Address]',
        'Tax ID: __________________________',
        'Account: _________________________',
        '',
        'Signature: _______________________',
        `           / ${assembled.parameters.contractorName} /`,
      ];

  const startSigY = cursorY;
  leftLines.forEach((text, i) => {
    if (!text) return;
    const isBold = i === 0 || i === 1 || i === leftLines.length - 1;
    page.drawText(text.slice(0, 48), {
      x: col1X,
      y: startSigY - i * 13,
      size: 8.5,
      font: isBold ? boldFont : regularFont,
      color: PDF_COLORS.ink,
    });
  });

  rightLines.forEach((text, i) => {
    if (!text) return;
    const isBold = i === 0 || i === 1 || i === rightLines.length - 1;
    page.drawText(text.slice(0, 48), {
      x: col2X,
      y: startSigY - i * 13,
      size: 8.5,
      font: isBold ? boldFont : regularFont,
      color: PDF_COLORS.ink,
    });
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
