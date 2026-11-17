import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { createUnicodePdfDocument, PDF_COLORS, wrapPdfLines } from '../pdf/fontHelper.js';
import { AssembledContractResult } from './contractBuilder.js';

/**
 * Exports an assembled vetted contract to a clean, editable Microsoft Word (.docx) document.
 */
export async function generateAssembledContractDocx(
  assembled: AssembledContractResult,
): Promise<Buffer> {
  const isUk = assembled.contractLanguage === 'uk';
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: assembled.templateTitle.toUpperCase(),
          bold: true,
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: isUk
            ? `Зібрано з перевірених модулів ClauseGuard · Замовник: ${assembled.parameters.clientName} · Виконавець: ${assembled.parameters.contractorName}`
            : `Assembled from Vetted ClauseGuard Modules · Client: ${assembled.parameters.clientName} · Contractor: ${assembled.parameters.contractorName}`,
          italics: true,
          size: 20,
          color: '4A4843',
        }),
      ],
    }),
  ];

  for (const [idx, section] of assembled.sections.entries()) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 100 },
        children: [
          new TextRun({
            text: `${idx + 1}. ${section.title} `,
            bold: true,
            size: 24,
          }),
          new TextRun({
            text: `[${section.selectedClauseId}]`,
            font: 'Courier New',
            size: 18,
            color: '0F4C3A',
          }),
        ],
      }),
    );

    for (const para of section.renderedText.split('\n').filter((line) => line.trim().length > 0)) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: para.trim(), size: 22 })],
        }),
      );
    }
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 140 },
      children: [
        new TextRun({
          text: isUk ? 'ПІДПИСИ СТОРІН' : 'EXECUTION & SIGNATURES',
          bold: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `${isUk ? 'Замовник' : 'Client'}: ${assembled.parameters.clientName}   ____________________________`,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${isUk ? 'Виконавець' : 'Contractor'}: ${assembled.parameters.contractorName}   ____________________________`,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: isUk
            ? 'Примітка: Сформовано за бібліотекою перевірених B2B-модулів ClauseGuard. Не є індивідуальною юридичною консультацією.'
            : 'Note: Assembled from ClauseGuard vetted B2B clause modules. Not legal advice.',
          italics: true,
          size: 18,
          color: '6B6860',
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

/**
 * Exports an assembled vetted contract to multi-page Unicode A4 PDF with Cyrillic & Latin support.
 */
export async function generateAssembledContractPdf(
  assembled: AssembledContractResult,
): Promise<Buffer> {
  const { pdfDoc, regularFont, boldFont } = await createUnicodePdfDocument();
  const marginX = 44;
  const pageWidth = 595;
  const pageHeight = 842;
  const contentWidth = pageWidth - marginX * 2;
  const isUk = assembled.contractLanguage === 'uk';

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = 790;

  const drawHeaderBar = () => {
    page.drawRectangle({
      x: marginX,
      y: 774,
      width: contentWidth,
      height: 34,
      color: PDF_COLORS.forest,
    });
    page.drawText(`CLAUSEGUARD · ${assembled.templateTitle}`, {
      x: marginX + 10,
      y: 787,
      size: 9.5,
      font: boldFont,
      color: PDF_COLORS.white,
    });
    const badge = isUk ? 'НЕ Є ЮР. ПОРАДОЮ' : 'VETTED TEMPLATE BUILD';
    const badgeWidth = boldFont.widthOfTextAtSize(badge, 7.5);
    page.drawText(badge, {
      x: marginX + contentWidth - badgeWidth - 10,
      y: 788,
      size: 7.5,
      font: boldFont,
      color: PDF_COLORS.white,
    });
    cursorY = 754;
  };

  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight < 52) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = 792;
    }
  };

  drawHeaderBar();

  const metaLines = [
    `${isUk ? 'Замовник' : 'Client'}: ${assembled.parameters.clientName}`,
    `${isUk ? 'Виконавець' : 'Contractor'}: ${assembled.parameters.contractorName}`,
    `${isUk ? 'Проєкт' : 'Project'}: ${assembled.parameters.projectTitle} (${assembled.parameters.totalFee} ${assembled.parameters.currency})`,
  ];

  page.drawRectangle({
    x: marginX,
    y: cursorY - 48,
    width: contentWidth,
    height: 48,
    color: PDF_COLORS.paper,
    borderColor: PDF_COLORS.border,
    borderWidth: 1,
  });

  metaLines.forEach((line, idx) => {
    page.drawText(line.slice(0, 96), {
      x: marginX + 10,
      y: cursorY - 15 - idx * 13,
      size: 8.5,
      font: idx === 2 ? boldFont : regularFont,
      color: PDF_COLORS.ink,
    });
  });

  cursorY -= 66;

  for (const [idx, section] of assembled.sections.entries()) {
    const heading = `${idx + 1}. ${section.title} [${section.selectedClauseId}]`;
    const bodyLines = wrapPdfLines(section.renderedText, regularFont, 8.8, contentWidth);
    const blockHeight = 20 + bodyLines.length * 12 + 12;

    ensureSpace(Math.min(blockHeight, 120));

    page.drawText(heading, {
      x: marginX,
      y: cursorY,
      size: 9.5,
      font: boldFont,
      color: PDF_COLORS.forest,
    });
    cursorY -= 15;

    for (const line of bodyLines) {
      ensureSpace(16);
      page.drawText(line, {
        x: marginX,
        y: cursorY,
        size: 8.8,
        font: regularFont,
        color: PDF_COLORS.ink,
      });
      cursorY -= 12;
    }
    cursorY -= 8;
  }

  ensureSpace(64);
  page.drawLine({
    start: { x: marginX, y: cursorY },
    end: { x: marginX + contentWidth, y: cursorY },
    thickness: 1,
    color: PDF_COLORS.border,
  });
  cursorY -= 18;
  page.drawText(
    `${isUk ? 'Замовник' : 'Client'}: ${assembled.parameters.clientName}   ________________________`,
    { x: marginX, y: cursorY, size: 9, font: boldFont, color: PDF_COLORS.ink },
  );
  cursorY -= 18;
  page.drawText(
    `${isUk ? 'Виконавець' : 'Contractor'}: ${assembled.parameters.contractorName}   ________________________`,
    { x: marginX, y: cursorY, size: 9, font: boldFont, color: PDF_COLORS.ink },
  );

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
