import { describe, it, expect } from 'vitest';
import {
  normalizeTextForMatching,
  normalizePunctuationTokens,
  verifySingleQuote,
  verifyEvidenceList,
} from '../src/lib/verification/evidence';
import { DocumentPage, RawEvidenceItem } from '../src/lib/ai/types';

describe('Evidence Verification & Normalization', () => {
  const graduationPageText =
    'Điều 18. Điều kiện xét và công nhận tốt nghiệp.\n' +
    'Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên và đạt chuẩn đầu ra ngoại ngữ theo quy định của Trường.';

  const warningPageText =
    'Điều 14. Cảnh báo kết quả học tập và buộc thôi học.\n' +
    '1. Cảnh báo kết quả học tập được thực hiện theo từng học kỳ.\n' +
    '2. Sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp.';

  const samplePages: DocumentPage[] = [
    {
      pageNumber: 1,
      text: 'Điều 1. Phạm vi điều chỉnh và đối tượng áp dụng.\nQuy chế này quy định về đào tạo trình độ đại học theo hệ thống tín chỉ.',
    },
    {
      pageNumber: 2,
      text: warningPageText,
    },
    {
      pageNumber: 3,
      text: graduationPageText,
    },
  ];

  describe('Conservative Normalization', () => {
    it('should normalize Vietnamese diacritics, whitespace, and typographic quotes', () => {
      const raw = '  “Điều 14.  Cảnh báo   kết quả học tập”  \n  và buộc thôi học.  ';
      const normalized = normalizeTextForMatching(raw);
      expect(normalized).toBe('"điều 14. cảnh báo kết quả học tập" và buộc thôi học.');
    });

    it('should handle curly single quotes and dash variations', () => {
      const raw = "‘Khóa học — 2024–2028’";
      const normalized = normalizeTextForMatching(raw);
      expect(normalized).toBe("'khóa học - 2024-2028'");
    });

    it('should normalize punctuation tokens for safe word-sequence comparison', () => {
      const raw = 'Điều 14: Cảnh báo kết quả học tập; và buộc thôi học!';
      const tokens = normalizePunctuationTokens(raw);
      expect(tokens).toBe('điều 14 cảnh báo kết quả học tập và buộc thôi học');
    });
  });

  describe('Adversarial & Conservative Matching Rules', () => {
    it('1. should accept exact Vietnamese quote', () => {
      const quote = 'Cảnh báo kết quả học tập được thực hiện theo từng học kỳ.';
      const result = verifySingleQuote(quote, warningPageText);
      expect(result.verified).toBe(true);
    });

    it('2. should accept quote with line-break differences and repeated spaces', () => {
      const quote = 'Sinh viên bị buộc thôi học\n  nếu bị cảnh báo   kết quả học tập 3 lần liên tiếp.';
      const result = verifySingleQuote(quote, warningPageText);
      expect(result.verified).toBe(true);
    });

    it('3. should accept quote with curly quotes and dash normalization', () => {
      const textWithQuotes = 'Quy định về “chuẩn đầu ra” — áp dụng từ năm 2024.';
      const quote = 'Quy định về "chuẩn đầu ra" - áp dụng từ năm 2024.';
      const result = verifySingleQuote(quote, textWithQuotes);
      expect(result.verified).toBe(true);
    });

    it('4. should REJECT adversarial condition alteration (fabricated negation)', () => {
      // Source: "và đạt chuẩn đầu ra ngoại ngữ"
      // Model quote alters to: "và không cần đạt chuẩn đầu ra ngoại ngữ"
      const fabricatedNegation =
        'Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên và không cần đạt chuẩn đầu ra ngoại ngữ.';
      const result = verifySingleQuote(fabricatedNegation, graduationPageText);
      expect(result.verified).toBe(false);
    });

    it('5. should REJECT quote with fabricated suffix', () => {
      const fabricatedSuffix =
        'Sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp và nộp phạt 5 triệu đồng.';
      const result = verifySingleQuote(fabricatedSuffix, warningPageText);
      expect(result.verified).toBe(false);
    });

    it('6. should REJECT quote with fabricated prefix', () => {
      const fabricatedPrefix =
        'Theo quyết định của Hiệu trưởng, sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp.';
      const result = verifySingleQuote(fabricatedPrefix, warningPageText);
      expect(result.verified).toBe(false);
    });

    it('7. should REJECT quote referencing the wrong page', () => {
      const quoteFromPage3 = 'Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên';
      // Page 2 text does not contain Page 3 content
      const result = verifySingleQuote(quoteFromPage3, warningPageText);
      expect(result.verified).toBe(false);
    });

    it('8. should reject empty or extremely short quotes (< 3 characters)', () => {
      expect(verifySingleQuote('', warningPageText).verified).toBe(false);
      expect(verifySingleQuote('   ', warningPageText).verified).toBe(false);
      expect(verifySingleQuote('ab', warningPageText).verified).toBe(false);
    });
  });

  describe('verifyEvidenceList Integration', () => {
    it('should strictly verify evidence items and mark fabricated or wrong-page items as false', () => {
      const rawEvidence: RawEvidenceItem[] = [
        {
          page: 2,
          section: 'Điều 14, Khoản 2',
          quotedText: 'Sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp.',
          rationale: 'Quy định số lần cảnh báo dẫn đến buộc thôi học.',
        },
        {
          page: 3,
          section: 'Điều 18',
          quotedText: 'Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên và không cần đạt chuẩn đầu ra ngoại ngữ.',
          rationale: 'Fabricated condition.',
        },
        {
          page: 1, // Wrong page: graduation text is on page 3
          section: 'Điều 18',
          quotedText: 'Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên',
          rationale: 'Wrong page attribution.',
        },
        {
          page: 99, // Non-existent page
          section: 'Điều 99',
          quotedText: 'Nội dung không tồn tại.',
          rationale: 'Page 99 does not exist.',
        },
      ];

      const verifiedList = verifyEvidenceList(rawEvidence, samplePages);

      expect(verifiedList.length).toBe(4);
      expect(verifiedList[0].verified).toBe(true);
      expect(verifiedList[1].verified).toBe(false); // Rejected fabricated negation
      expect(verifiedList[2].verified).toBe(false); // Rejected wrong page
      expect(verifiedList[3].verified).toBe(false); // Rejected missing page
    });
  });
});
