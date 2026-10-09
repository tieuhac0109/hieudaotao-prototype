import { extractText } from 'unpdf';
import { DocumentContent, DocumentPage } from '../ai/types';
import { MAX_FILE_SIZE_BYTES } from '../validation/input';

export class PdfProcessingError extends Error {
  constructor(message: string, public readonly code: string = 'PDF_PROCESSING_ERROR') {
    super(message);
    this.name = 'PdfProcessingError';
  }
}

/**
 * Validates a PDF buffer before extraction.
 */
export function validatePdfBuffer(buffer: Buffer, mimeType: string = 'application/pdf'): void {
  if (!buffer || buffer.length === 0) {
    throw new PdfProcessingError('Uploaded file is empty.', 'EMPTY_FILE');
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    const limitMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    throw new PdfProcessingError(
      `File size (${sizeMb} MB) exceeds maximum allowed limit (${limitMb} MB).`,
      'FILE_TOO_LARGE'
    );
  }

  // Validate PDF magic number (%PDF-)
  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    throw new PdfProcessingError('Invalid file format. The file is not a valid PDF document.', 'INVALID_PDF_FORMAT');
  }

  if (mimeType && mimeType !== 'application/pdf' && mimeType !== 'application/x-pdf') {
    throw new PdfProcessingError(`Unsupported MIME type: ${mimeType}. Only application/pdf is supported.`, 'INVALID_MIME_TYPE');
  }
}

/**
 * Extracts page-by-page text from a PDF buffer.
 * Preserves page boundaries and numbers for citation grounding and verification.
 */
export async function extractPdfDocument(
  buffer: Buffer,
  filename: string = 'document.pdf',
  mimeType: string = 'application/pdf'
): Promise<DocumentContent> {
  validatePdfBuffer(buffer, mimeType);

  let extractionResult;
  try {
    // extractText with mergePages: false returns array of page texts
    extractionResult = await extractText(new Uint8Array(buffer), { mergePages: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown PDF parser error';
    throw new PdfProcessingError(`Failed to parse PDF document: ${message}`, 'PDF_PARSE_FAILED');
  }

  const { totalPages, text: rawPages } = extractionResult;

  if (totalPages === 0 || !rawPages || rawPages.length === 0) {
    throw new PdfProcessingError('The PDF document contains no pages.', 'NO_PAGES');
  }

  const pages: DocumentPage[] = rawPages.map((pageText, idx) => {
    // Clean null bytes and normalize line endings
    const cleanedText = (pageText || '')
      .replace(/\0/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    return {
      pageNumber: idx + 1,
      text: cleanedText,
    };
  });

  const fullText = pages.map((p) => p.text).join('\n\n');

  // Check if document has meaningful text (not a pure image scan without OCR)
  const totalCharacters = fullText.replace(/\s+/g, '').length;
  if (totalCharacters < 20) {
    throw new PdfProcessingError(
      'The uploaded PDF appears to be a scanned image or contains no extractable text. Prototype V1 requires text-based PDFs (OCR is not yet supported).',
      'NO_EXTRACTABLE_TEXT'
    );
  }

  return {
    filename,
    mimeType,
    pageCount: totalPages,
    pages,
    fullText,
    buffer,
  };
}

/**
 * Formats extracted document text with explicit [PAGE X] boundaries for model input.
 */
export function formatDocumentForPrompt(document: DocumentContent): string {
  const header = `=== DOCUMENT: ${document.filename} (Total Pages: ${document.pageCount}) ===\n\n`;
  const body = document.pages
    .map((page) => `[PAGE ${page.pageNumber}]\n${page.text}`)
    .join('\n\n');

  return `${header}${body}`;
}
