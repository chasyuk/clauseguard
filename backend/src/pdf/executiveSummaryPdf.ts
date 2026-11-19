import { PDFFont } from 'pdf-lib';
import { AuditRecord } from '../storage/auditStore.js';
import { createUnicodePdfDocument, PDF_COLORS as COLORS, wrapPdfLines as wrapLines } from './fontHelper.js';

/**
 * Generates a strict 1-page A4 Executive Summary PDF with Cyrillic & Latin support.
 */
export async function generateExecutiveSummaryPdf(
  record: AuditRecord,
  uiLang: 'en' | 'uk' = 'en',
): Promise<Buffer> {
  const analysis = record.analysis;
  if (!analysis) {
    throw new Error('Cannot generate Executive Summary PDF before risk analysis completes.');
  }

  const { pdfDoc, regularFont, boldFont } = await createUnicodePdfDocument();

  const page = pdfDoc.addPage([595, 842]); // A4 portrait
  const marginX = 40;
  const contentWidth = 595 - marginX * 2;
  const isUk = uiLang === 'uk' || (uiLang !== 'en' && analysis.contractLanguage === 'uk');

  const counts = record.analysisMeta?.riskCounts ?? {
    high: analysis.flaggedClauses.filter((c) => c.riskLevel === 'HIGH').length,
    medium: analysis.flaggedClauses.filter((c) => c.riskLevel === 'MEDIUM').length,
    low: analysis.flaggedClauses.filter((c) => c.riskLevel === 'LOW').length,
  };

  // 1. Header Bar
  page.drawRectangle({
    x: marginX,
    y: 774,
    width: contentWidth,
    height: 36,
    color: COLORS.forest,
  });

  page.drawText(
    isUk
      ? 'CLAUSEGUARD — КОРОТКИЙ ЗВІТ АУДИТУ ДОГОВОРУ'
      : 'CLAUSEGUARD — EXECUTIVE CONTRACT AUDIT SUMMARY',
    {
      x: marginX + 12,
      y: 788,
      size: 10.5,
      font: boldFont,
      color: COLORS.white,
    },
  );

  const verifiedBadge = isUk ? 'ВЕРИФІКОВАНО ЗА СТАНДАРТАМИ B2B' : 'ENTERPRISE B2B VERIFIED';
  const badgeW = boldFont.widthOfTextAtSize(verifiedBadge, 8);
  page.drawText(verifiedBadge, {
    x: marginX + contentWidth - badgeW - 12,
    y: 789,
    size: 8,
    font: boldFont,
    color: COLORS.white,
  });

  // 2. Contract Metadata + Score Strip
  page.drawRectangle({
    x: marginX,
    y: 702,
    width: contentWidth,
    height: 62,
    color: COLORS.paper,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  const safeDocName =
    record.fileName.length > 48 ? `${record.fileName.slice(0, 45)}...` : record.fileName;
  page.drawText(`${isUk ? 'Документ' : 'Document'}: ${safeDocName}`, {
    x: marginX + 12,
    y: 746,
    size: 9.5,
    font: boldFont,
    color: COLORS.ink,
  });

  const metaLine = `${isUk ? 'Дата' : 'Date'}: ${record.createdAt.slice(0, 10)}   |   ${isUk ? 'Сторінок' : 'Pages'}: ${record.pageCount}   |   ${isUk ? 'Мова' : 'Language'}: ${analysis.contractLanguage.toUpperCase()}`;
  page.drawText(metaLine, {
    x: marginX + 12,
    y: 730,
    size: 8.5,
    font: regularFont,
    color: COLORS.muted,
  });

  const countsLine = isUk
    ? `Виявлені ризики — Високий: ${counts.high}   |   Середній: ${counts.medium}   |   Низький: ${counts.low}`
    : `Risk Counts — High: ${counts.high}   |   Medium: ${counts.medium}   |   Low: ${counts.low}`;
  page.drawText(countsLine, {
    x: marginX + 12,
    y: 713,
    size: 9,
    font: boldFont,
    color: COLORS.ink,
  });

  // Score Box on right side of metadata strip
  const scoreColor =
    analysis.overallRiskScore >= 60
      ? COLORS.highRed
      : analysis.overallRiskScore >= 30
        ? COLORS.medAmber
        : COLORS.lowGreen;
  const scoreText = `${analysis.overallRiskScore}/100`;
  const scoreLabel = isUk ? 'ІНДЕКС РИЗИКУ' : 'RISK SCORE';
  page.drawText(scoreLabel, {
    x: marginX + contentWidth - 102,
    y: 747,
    size: 7.5,
    font: boldFont,
    color: COLORS.muted,
  });
  page.drawText(scoreText, {
    x: marginX + contentWidth - 102,
    y: 718,
    size: 20,
    font: boldFont,
    color: scoreColor,
  });

  let cursorY = 682;

  // 3. Executive Summary
  page.drawText(isUk ? 'ЗАГАЛЬНИЙ ВИСНОВОК' : 'EXECUTIVE OVERVIEW', {
    x: marginX,
    y: cursorY,
    size: 9.5,
    font: boldFont,
    color: COLORS.forest,
  });
  cursorY -= 14;

  const summaryLines = wrapLines(analysis.executiveSummary, regularFont, 9.5, contentWidth).slice(
    0,
    4,
  );
  for (const line of summaryLines) {
    page.drawText(line, {
      x: marginX,
      y: cursorY,
      size: 9.5,
      font: regularFont,
      color: COLORS.ink,
    });
    cursorY -= 13;
  }

  cursorY -= 8;

  // 4. Negotiation Checklist
  page.drawText(
    isUk ? 'ЧЕКЛІСТ ДЛЯ ПЕРЕГОВОРІВ (ПЕРШОЧЕРГОВІ КРОКИ)' : 'NEGOTIATION CHECKLIST (PRIORITY ACTIONS)',
    {
      x: marginX,
      y: cursorY,
      size: 9.5,
      font: boldFont,
      color: COLORS.forest,
    },
  );
  cursorY -= 14;

  const checklistItems = analysis.negotiationChecklist.slice(0, 5);
  for (let i = 0; i < checklistItems.length; i++) {
    const bulletText = `${i + 1}. ${checklistItems[i]}`;
    const lines = wrapLines(bulletText, regularFont, 8.8, contentWidth - 8).slice(0, 2);
    for (const line of lines) {
      page.drawText(line, {
        x: marginX + 4,
        y: cursorY,
        size: 8.8,
        font: regularFont,
        color: COLORS.ink,
      });
      cursorY -= 12;
    }
  }

  cursorY -= 8;

  // 5. Key Flagged Clauses & Counter-Proposals
  page.drawText(
    isUk
      ? 'КЛЮЧОВІ РИЗИКОВІ ПУНКТИ ТА ЗБАЛАНСОВАНІ ПРАВКИ'
      : 'FLAGGED CLAUSES & BALANCED COUNTER-PROPOSALS',
    {
      x: marginX,
      y: cursorY,
      size: 9.5,
      font: boldFont,
      color: COLORS.forest,
    },
  );
  cursorY -= 12;

  let renderedFlags = 0;
  for (const flag of analysis.flaggedClauses) {
    const summaryRow = wrapLines(flag.plainLanguageSummary, regularFont, 8, contentWidth - 16).slice(
      0,
      2,
    );
    const counterRow = wrapLines(
      `${isUk ? 'Правка' : 'Counter'}: ${flag.counterClause}`,
      regularFont,
      8,
      contentWidth - 16,
    ).slice(0, 2);
    const boxHeight = 20 + summaryRow.length * 10.5 + counterRow.length * 10.5 + 8;

    // Strictly keep everything on 1 page
    if (cursorY - boxHeight < 58) {
      break;
    }

    page.drawRectangle({
      x: marginX,
      y: cursorY - boxHeight,
      width: contentWidth,
      height: boxHeight,
      color: COLORS.white,
      borderColor: COLORS.border,
      borderWidth: 0.8,
    });

    const levelColor =
      flag.riskLevel === 'HIGH'
        ? COLORS.highRed
        : flag.riskLevel === 'MEDIUM'
          ? COLORS.medAmber
          : COLORS.lowGreen;

    page.drawText(`§ ${flag.clauseNumber}  ·  ${flag.category}`, {
      x: marginX + 8,
      y: cursorY - 13,
      size: 8.5,
      font: boldFont,
      color: COLORS.ink,
    });

    const riskBadgeText = flag.riskLevel;
    const riskBadgeW = boldFont.widthOfTextAtSize(riskBadgeText, 8);
    page.drawText(riskBadgeText, {
      x: marginX + contentWidth - riskBadgeW - 8,
      y: cursorY - 13,
      size: 8,
      font: boldFont,
      color: levelColor,
    });

    let innerY = cursorY - 25;
    for (const line of summaryRow) {
      page.drawText(line, {
        x: marginX + 8,
        y: innerY,
        size: 8,
        font: regularFont,
        color: COLORS.muted,
      });
      innerY -= 10.5;
    }
    for (const line of counterRow) {
      page.drawText(line, {
        x: marginX + 8,
        y: innerY,
        size: 8,
        font: regularFont,
        color: COLORS.forest,
      });
      innerY -= 10.5;
    }

    cursorY -= boxHeight + 6;
    renderedFlags += 1;
  }

  const omittedCount = analysis.flaggedClauses.length - renderedFlags;
  if (omittedCount > 0 && cursorY > 56) {
    page.drawText(
      isUk
        ? `+ ще ${omittedCount} пунктів у повному веб-звіті (ID: ${record.auditId})`
        : `+ ${omittedCount} additional flagged clause(s) available in full web report (Audit ID: ${record.auditId})`,
      {
        x: marginX,
        y: cursorY - 6,
        size: 8,
        font: regularFont,
        color: COLORS.muted,
      },
    );
  }

  // 6. Footer Disclaimer
  page.drawLine({
    start: { x: marginX, y: 44 },
    end: { x: marginX + contentWidth, y: 44 },
    thickness: 0.75,
    color: COLORS.border,
  });

  const footerText = isUk
    ? `ClauseGuard ID: ${record.auditId} · Конфіденційний звіт комерційного аналізу B2B-контракту · Захищене шифрування`
    : `ClauseGuard Audit ID: ${record.auditId} · Confidential B2B Contract Commercial Intelligence Briefing · Encrypted`;
  page.drawText(footerText, {
    x: marginX,
    y: 28,
    size: 7.5,
    font: regularFont,
    color: COLORS.muted,
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
