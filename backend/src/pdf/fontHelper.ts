import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, rgb } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PDF_COLORS = {
  forest: rgb(0.059, 0.298, 0.227),      // #0F4C3A
  ink: rgb(0.078, 0.078, 0.075),         // #141413
  muted: rgb(0.42, 0.41, 0.38),          // #6B6860
  paper: rgb(0.969, 0.961, 0.941),       // #F7F5F0
  border: rgb(0.831, 0.812, 0.78),       // #D4CFC7
  highRed: rgb(0.62, 0.165, 0.169),      // #9E2A2B
  medAmber: rgb(0.549, 0.325, 0.098),    // #8C5319
  lowGreen: rgb(0.078, 0.325, 0.176),    // #14532D
  white: rgb(1, 1, 1),
};

/**
 * Loads bundled Unicode fonts across tsx (src/) and compiled Lambda/tsc (dist/) paths.
 */
export async function loadBundledFontBytes(fileName: string): Promise<Uint8Array> {
  const candidates = [
    path.resolve(__dirname, '../../assets/fonts', fileName),
    path.resolve(process.cwd(), 'assets/fonts', fileName),
    path.resolve(process.cwd(), 'backend/assets/fonts', fileName),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // Try next candidate
    }
  }
  throw new Error(`Bundled font not found: ${fileName}`);
}

export async function createUnicodePdfDocument(): Promise<{
  pdfDoc: PDFDocument;
  regularFont: PDFFont;
  boldFont: PDFFont;
}> {
  const [regularBytes, boldBytes] = await Promise.all([
    loadBundledFontBytes('AdwaitaSans-Regular.ttf'),
    loadBundledFontBytes('DroidSans-Bold.ttf'),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const regularFont = await pdfDoc.embedFont(regularBytes, { subset: false });
  const boldFont = await pdfDoc.embedFont(boldBytes, { subset: false });
  return { pdfDoc, regularFont, boldFont };
}

export function wrapPdfLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const paragraphs = text.split('\n');
  const allLines: string[] = [];

  for (const para of paragraphs) {
    const cleanPara = para.replace(/\s+/g, ' ').trim();
    if (!cleanPara) continue;

    const words = cleanPara.split(' ');
    let current = '';

    for (const word of words) {
      if (!word) continue;
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) allLines.push(current);
        current = word;
      }
    }
    if (current) allLines.push(current);
  }

  return allLines;
}
