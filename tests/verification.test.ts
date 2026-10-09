import { describe, it, expect } from 'vitest';
import {
  normalizeTextForMatching,
  verifySingleQuote,
  verifyEvidenceList,
} from '../src/lib/verification/evidence';
import { DocumentPage, RawEvidenceItem } from '../src/lib/ai/types';

describe('Evidence Verification & Normalization', () => {
  const samplePages: DocumentPage[] = [
    {
      pageNumber: 1,
      text: 'Điều 1. Phạm vi điều chỉnh và đối tượng áp dụng.\nQuy chế này quy định về đào tạo trình độ đại học theo hệ thống tín chỉ.',
    },
    {
      pageNumber: 2,
      text: 'Điều 14. Cảnh báo kết quả học tập và buộc thôi học.\n1. Cảnh báo kết quả học tập được thực hiện theo từng học kỳ.\n2. Sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp.',
    },
    {
      pageNumber: 3,
      text: 'Điều 18. Điều kiện xét và công nhận tốt nghiệp.\nSinh viên được công nhận tốt nghiệp khi có Điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên theo thang điểm 4.',
    },
  ];

  it('should normalize Vietnamese diacritics, whitespace, and typographic quotes', () => {
    const raw = '  “Điều 14.  Cảnh báo   kết quả học tập”  \n  và buộc thôi học.  ';
    const normalized = normalizeTextForMatching(raw);
    expect(normalized).toBe('"điều 14. cảnh báo kết quả học tập" và buộc thôi học.');
  });

  it('should verify exact quotes present on the page', () => {
    const quote = 'Cảnh báo kết quả học tập được thực hiện theo từng học kỳ';
    const result = verifySingleQuote(quote, samplePages[1].text);
    expect(result.verified).toBe(true);
    expect(result.matchScore).toBe(1.0);
  });

  it('should verify quotes spanning multiple lines with different whitespace formatting', () => {
    const quote = 'Điều 14. Cảnh báo kết quả học tập và buộc thôi học.\n1. Cảnh báo kết quả học tập';
    const result = verifySingleQuote(quote, samplePages[1].text);
    expect(result.verified).toBe(true);
  });

  it('should reject fabricated quotes that do not exist in the source text', () => {
    const fakeQuote = 'Sinh viên bị buộc thôi học ngay lập tức nếu trượt một môn thi cuối kỳ.';
    const result = verifySingleQuote(fakeQuote, samplePages[1].text);
    expect(result.verified).toBe(false);
    expect(result.matchScore).toBe(0);
  });

  it('should reject empty or extremely short quotes (< 3 characters)', () => {
    expect(verifySingleQuote('', samplePages[0].text).verified).toBe(false);
    expect(verifySingleQuote('   ', samplePages[0].text).verified).toBe(false);
    expect(verifySingleQuote('a', samplePages[0].text).verified).toBe(false);
  });

  it('should verify evidence list and distinguish verified vs unverified items accurately', () => {
    const rawEvidence: RawEvidenceItem[] = [
      {
        page: 2,
        section: 'Điều 14, Khoản 2',
        quotedText: 'Sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp.',
        rationale: 'Quy định số lần cảnh báo dẫn đến buộc thôi học.',
      },
      {
        page: 2,
        section: 'Điều 14',
        quotedText: 'Sinh viên phải nộp phạt 5 triệu đồng nếu bị cảnh báo học tập.', // Fabricated quote
        rationale: 'Không có trong văn bản.',
      },
      {
        page: 99, // Non-existent page
        section: 'Điều 50',
        quotedText: 'Quy định khác.',
        rationale: 'Trang không tồn tại.',
      },
    ];

    const verifiedList = verifyEvidenceList(rawEvidence, samplePages);

    expect(verifiedList.length).toBe(3);
    expect(verifiedList[0].verified).toBe(true);
    expect(verifiedList[0].section).toBe('Điều 14, Khoản 2');

    expect(verifiedList[1].verified).toBe(false); // Fabricated quote marked false

    expect(verifiedList[2].verified).toBe(false); // Non-existent page marked false
  });
});
