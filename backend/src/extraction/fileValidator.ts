import path from 'node:path';
import { config } from '../config.js';

export type SupportedExtension = 'pdf' | 'docx';

export class ExtractionError extends Error {
  public readonly code:
    | 'EMPTY_FILE'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FILE_TYPE'
    | 'CORRUPTED_FILE'
    | 'DOCUMENT_TOO_LONG'
    | 'SCANNED_PDF_DETECTED';
  public readonly statusCode: number;
  public readonly details?: Record<string, string | number>;

  constructor(
    code: ExtractionError['code'],
    message: string,
    statusCode = 400,
    details?: Record<string, string | number>,
  ) {
    super(message);
    this.name = 'ExtractionError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ValidatedFile {
  originalName: string;
  extension: SupportedExtension;
  sizeBytes: number;
  buffer: Buffer;
}

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04 (docx/zip container)

/**
 * Validates file existence, maximum byte size (10 MB), extension, and binary magic bytes.
 */
export function validateUploadedFile(
  fileName: string,
  buffer: Buffer,
): ValidatedFile {
  if (!buffer || buffer.length === 0) {
    throw new ExtractionError('EMPTY_FILE', 'The uploaded file is empty.');
  }

  if (buffer.length > config.maxFileSizeBytes) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    throw new ExtractionError(
      'FILE_TOO_LARGE',
      `File size (${sizeMb} MB) exceeds the 10 MB maximum limit.`,
      413,
      { maxMb: 10, actualMb: Number(sizeMb) },
    );
  }

  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  if (ext !== 'pdf' && ext !== 'docx') {
    throw new ExtractionError(
      'UNSUPPORTED_FILE_TYPE',
      'Only .pdf and .docx contracts are supported.',
      415,
    );
  }

  if (ext === 'pdf') {
    if (buffer.length < PDF_MAGIC.length || !buffer.subarray(0, 5).equals(PDF_MAGIC)) {
      throw new ExtractionError(
        'CORRUPTED_FILE',
        'This file does not appear to be a valid PDF document (invalid %PDF header).',
      );
    }
  }

  if (ext === 'docx') {
    if (buffer.length < ZIP_MAGIC.length || !buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
      throw new ExtractionError(
        'CORRUPTED_FILE',
        'This file does not appear to be a valid .docx document (legacy .doc binary files are not supported; please save as .docx).',
      );
    }
  }

  return {
    originalName: path.basename(fileName),
    extension: ext,
    sizeBytes: buffer.length,
    buffer,
  };
}
