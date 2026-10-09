import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractPdfDocument,
  validatePdfBuffer,
  formatDocumentForPrompt,
  PdfProcessingError,
} from '../src/lib/documents/pdf';

describe('PDF Processing & Validation', () => {
  const samplePdfPath = path.resolve(__dirname, '../public/sample-docs/quy-che-dao-tao-mau.pdf');

  it('should successfully extract pages and text from a valid text-based PDF', async () => {
    const buffer = fs.readFileSync(samplePdfPath);
    const doc = await extractPdfDocument(buffer, 'quy-che-dao-tao-mau.pdf', 'application/pdf');

    expect(doc.filename).toBe('quy-che-dao-tao-mau.pdf');
    expect(doc.pageCount).toBe(3);
    expect(doc.pages.length).toBe(3);
    expect(doc.pages[0].pageNumber).toBe(1);
    expect(doc.pages[0].text).toContain('QUY CHE DAO TAO');
    expect(doc.pages[1].pageNumber).toBe(2);
    expect(doc.pages[1].text).toContain('Dieu 14');
    expect(doc.pages[2].pageNumber).toBe(3);
    expect(doc.pages[2].text).toContain('Dieu 18');
  });

  it('should format document text with explicit [PAGE X] headers', async () => {
    const buffer = fs.readFileSync(samplePdfPath);
    const doc = await extractPdfDocument(buffer, 'quy-che.pdf');
    const formatted = formatDocumentForPrompt(doc);

    expect(formatted).toContain('=== DOCUMENT: quy-che.pdf (Total Pages: 3) ===');
    expect(formatted).toContain('[PAGE 1]');
    expect(formatted).toContain('[PAGE 2]');
    expect(formatted).toContain('[PAGE 3]');
  });

  it('should reject empty buffers', () => {
    const empty = Buffer.alloc(0);
    expect(() => validatePdfBuffer(empty)).toThrowError(PdfProcessingError);
    expect(() => validatePdfBuffer(empty)).toThrowError(/empty/);
  });

  it('should reject non-PDF files', () => {
    const invalidBuffer = Buffer.from('This is a plain text file, not a PDF.');
    expect(() => validatePdfBuffer(invalidBuffer)).toThrowError(PdfProcessingError);
    expect(() => validatePdfBuffer(invalidBuffer)).toThrowError(/not a valid PDF/);
  });

  it('should reject files exceeding the maximum size limit', () => {
    // 11 MB fake buffer with %PDF- header
    const oversizedBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(11 * 1024 * 1024),
    ]);

    expect(() => validatePdfBuffer(oversizedBuffer)).toThrowError(PdfProcessingError);
    expect(() => validatePdfBuffer(oversizedBuffer)).toThrowError(/exceeds maximum allowed limit/);
  });

  it('should reject invalid MIME types', () => {
    const validHeader = Buffer.from('%PDF-1.4\nsomething');
    expect(() => validatePdfBuffer(validHeader, 'image/png')).toThrowError(PdfProcessingError);
    expect(() => validatePdfBuffer(validHeader, 'image/png')).toThrowError(/Unsupported MIME type/);
  });
});
