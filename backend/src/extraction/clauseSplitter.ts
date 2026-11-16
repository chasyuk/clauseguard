export type ContractLanguage = 'uk' | 'en' | 'mixed';

export interface ClauseItem {
  id: string;
  clauseNumber: string;
  title: string;
  text: string;
  charCount: number;
}

/**
 * Detects whether the contract text is Ukrainian ('uk'), English ('en'), or bilingual ('mixed').
 */
export function detectContractLanguage(text: string): ContractLanguage {
  const cyrillicMatches = text.match(/[\u0400-\u04FF]/g) ?? [];
  const latinMatches = text.match(/[a-zA-Z]/g) ?? [];
  const totalLetters = cyrillicMatches.length + latinMatches.length;

  if (totalLetters === 0) {
    return 'en';
  }

  const cyrillicRatio = cyrillicMatches.length / totalLetters;
  if (cyrillicRatio >= 0.7) {
    return 'uk';
  }
  if (cyrillicRatio <= 0.3) {
    return 'en';
  }
  return 'mixed';
}

// Matches common English and Ukrainian contract section/clause headings at the start of a line
const CLAUSE_HEADING_REGEX =
  /^(?:(?:Section|Article|Clause|Paragraph|Розділ|Стаття|Пункт|Глава)\s+[0-9IVXLC]+(?:\.[0-9]+)*\.?|(?:\d+(?:\.\d+){1,3})\.?|(?:\d+)\.(?=\s+[A-ZА-ЯІЇЄҐ]))\s*(.*)$/i;

/**
 * Splits normalized contract text into discrete, numbered clauses prior to LLM analysis.
 * Keeps preamble/header lines attached cleanly and merges tiny orphaned lines.
 */
export function splitIntoClauses(text: string): ClauseItem[] {
  const lines = text.split('\n');
  const clauses: ClauseItem[] = [];

  let currentNumber = '0';
  let currentTitle = 'Preamble / Header';
  let buffer: string[] = [];

  const flushCurrent = () => {
    const joined = buffer.join('\n').trim();
    if (!joined) return;
    clauses.push({
      id: `clause-${clauses.length + 1}`,
      clauseNumber: currentNumber,
      title: currentTitle,
      text: joined,
      charCount: joined.length,
    });
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (buffer.length > 0 && buffer[buffer.length - 1] !== '') {
        buffer.push('');
      }
      continue;
    }

    const match = line.match(CLAUSE_HEADING_REGEX);
    if (match) {
      // Only start a new clause if the existing buffer has meaningful text
      if (buffer.join(' ').trim().length >= 20) {
        flushCurrent();
      } else if (clauses.length === 0 && buffer.length > 0) {
        flushCurrent();
      }

      const extractedNum = extractLeadingNumber(line);
      currentNumber = extractedNum || String(clauses.length + 1);
      const rest = (match[1] ?? '').trim();
      currentTitle = rest.length > 0 && rest.length <= 90 ? rest : `Clause ${currentNumber}`;
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  flushCurrent();

  // Fallback for unnumbered contracts: chunk by double newlines into readable paragraphs
  if (clauses.length <= 1 && text.length > 500) {
    return fallbackParagraphSplit(text);
  }

  return clauses;
}

function extractLeadingNumber(line: string): string {
  const numMatch = line.match(/(?:^|\s)(\d+(?:\.\d+)*|[IVXLC]+)\.?/i);
  return numMatch?.[1] ?? '';
}

function fallbackParagraphSplit(text: string): ClauseItem[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((p, index) => {
    const firstLine = p.split('\n')[0].slice(0, 70);
    return {
      id: `clause-${index + 1}`,
      clauseNumber: String(index + 1),
      title: firstLine.length < p.length ? `${firstLine}...` : firstLine,
      text: p,
      charCount: p.length,
    };
  });
}
