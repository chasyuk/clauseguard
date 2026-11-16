import mammoth from 'mammoth';
import { extractText } from 'unpdf';
import { config } from '../config.js';
import { ExtractionError, SupportedExtension } from './fileValidator.js';

export interface ExtractedDocumentText {
  text: string;
  pageCount: number;
  wordCount: number;
  charCount: number;
}

/**
 * Extracts plain text from digital .pdf or .docx buffers without paid OCR.
 * Rejects files exceeding 30 pages or scanned/image-only PDFs with insufficient selectable text.
 */
export async function extractDocumentText(
  buffer: Buffer,
  extension: SupportedExtension,
): Promise<ExtractedDocumentText> {
  if (extension === 'docx') {
    return extractDocxText(buffer);
  }
  return extractPdfText(buffer);
}

async function extractDocxText(buffer: Buffer): Promise<ExtractedDocumentText> {
  let rawText = '';
  try {
    const result = await mammoth.extractRawText({ buffer });
    rawText = normalizeWhitespace(result.value ?? '');
  } catch {
    throw new ExtractionError(
      'CORRUPTED_FILE',
      'Unable to parse .docx content. Please verify the file is not password-protected or corrupted.',
    );
  }

  const cleanCharCount = rawText.replace(/\s+/g, '').length;
  if (cleanCharCount < 50) {
    throw new ExtractionError(
      'EMPTY_FILE',
      'The .docx file contains too little text to audit (minimum 50 characters required).',
    );
  }

  const wordCount = countWords(rawText);
  // Standard legal document density is ~450 words per page
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 450));
  if (estimatedPages > config.maxPages) {
    throw new ExtractionError(
      'DOCUMENT_TOO_LONG',
      `Document is approximately ${estimatedPages} pages (${wordCount} words), exceeding the ${config.maxPages}-page v1 limit.`,
      413,
      { pageCount: estimatedPages, maxPages: config.maxPages },
    );
  }

  return {
    text: rawText,
    pageCount: estimatedPages,
    wordCount,
    charCount: rawText.length,
  };
}

async function extractPdfText(buffer: Buffer): Promise<ExtractedDocumentText> {
  let parsed: { totalPages: number; text: string };
  try {
    parsed = await extractText(new Uint8Array(buffer), { mergePages: true });
  } catch {
    throw new ExtractionError(
      'CORRUPTED_FILE',
      'Unable to read PDF. Please ensure it is not password-protected or corrupted.',
    );
  }

  const pageCount = Math.max(1, parsed.totalPages || 1);
  if (pageCount > config.maxPages) {
    throw new ExtractionError(
      'DOCUMENT_TOO_LONG',
      `Document has ${pageCount} pages, exceeding the ${config.maxPages}-page maximum limit for v1.`,
      413,
      { pageCount, maxPages: config.maxPages },
    );
  }

  const rawText = normalizeWhitespace(parsed.text ?? '');
  const nonWhitespaceChars = rawText.replace(/\s+/g, '').length;
  const avgCharsPerPage = nonWhitespaceChars / pageCount;

  // Detect scanned / image-only PDFs (selectable text layer absent or minimal)
  if (nonWhitespaceChars < 50 || avgCharsPerPage < 25) {
    throw new ExtractionError(
      'SCANNED_PDF_DETECTED',
      'This PDF appears to be a scanned image without selectable text. Paid OCR is disabled to keep ClauseGuard 100% free — please upload a digital PDF or .docx file.',
      422,
      { pageCount, extractedChars: nonWhitespaceChars },
    );
  }

  return {
    text: rawText,
    pageCount,
    wordCount: countWords(rawText),
    charCount: rawText.length,
  };
}

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
