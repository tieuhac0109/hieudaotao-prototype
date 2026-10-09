import { describe, it, expect } from 'vitest';
import {
  QuestionSchema,
  ModelOutputSchema,
  parseAndValidateModelOutput,
} from '../src/lib/validation/input';

describe('Validation Schemas & Output Parsing', () => {
  describe('QuestionSchema', () => {
    it('should accept valid questions in Vietnamese and English', () => {
      const q1 = 'Theo quy chế này, điều kiện để sinh viên được công nhận tốt nghiệp là gì?';
      const q2 = 'What are the graduation requirements defined in this regulation?';

      expect(QuestionSchema.parse(q1)).toBe(q1);
      expect(QuestionSchema.parse(q2)).toBe(q2);
    });

    it('should trim surrounding whitespace', () => {
      expect(QuestionSchema.parse('   Câu hỏi kiểm tra?   ')).toBe('Câu hỏi kiểm tra?');
    });

    it('should reject questions shorter than 3 characters', () => {
      expect(() => QuestionSchema.parse('ab')).toThrow();
      expect(() => QuestionSchema.parse('')).toThrow();
    });

    it('should reject questions longer than 2000 characters', () => {
      const longQuery = 'A'.repeat(2001);
      expect(() => QuestionSchema.parse(longQuery)).toThrow();
    });
  });

  describe('ModelOutputSchema & parseAndValidateModelOutput', () => {
    it('should directly validate structured object against ModelOutputSchema', () => {
      const validObj = {
        answer: 'Sinh viên phải tích lũy đủ số tín chỉ.',
        answerability: 'supported' as const,
        evidence: [
          {
            page: 1,
            section: 'Điều 1',
            quotedText: 'Tích lũy đủ số tín chỉ',
            rationale: 'Quy định tín chỉ.',
          },
        ],
      };

      const parsed = ModelOutputSchema.parse(validObj);
      expect(parsed.answerability).toBe('supported');
    });

    it('should validate clean JSON output matching schema', () => {
      const validJson = JSON.stringify({
        answer: 'Sinh viên phải đạt CPA từ 2.0 trở lên.',
        answerability: 'supported',
        evidence: [
          {
            page: 3,
            section: 'Điều 18',
            quotedText: 'Điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên',
            rationale: 'Quy định ngưỡng CPA tốt nghiệp.',
          },
        ],
        warnings: ['Cần lưu ý chuẩn đầu ra ngoại ngữ.'],
      });

      const parsed = parseAndValidateModelOutput(validJson);
      expect(parsed.answerability).toBe('supported');
      expect(parsed.evidence.length).toBe(1);
      expect(parsed.evidence[0].page).toBe(3);
    });

    it('should clean markdown ```json fences and parse inner JSON', () => {
      const markdownJson = `\`\`\`json
{
  "answer": "Quy chế không quy định điều này.",
  "answerability": "not_supported",
  "evidence": []
}
\`\`\``;

      const parsed = parseAndValidateModelOutput(markdownJson);
      expect(parsed.answerability).toBe('not_supported');
      expect(parsed.evidence).toEqual([]);
    });

    it('should extract outermost JSON if model includes preamble text', () => {
      const textWithPreamble = `Here is the analysis based on the document:
{
  "answer": "Quy chế chỉ quy định một phần điều kiện.",
  "answerability": "partial",
  "evidence": [
    {
      "page": 1,
      "quotedText": "Thời gian đào tạo tiêu chuẩn là 4 năm",
      "rationale": "Chỉ nêu thời gian chuẩn, chưa có quy định gia hạn."
    }
  ]
}
Hope this helps!`;

      const parsed = parseAndValidateModelOutput(textWithPreamble);
      expect(parsed.answerability).toBe('partial');
      expect(parsed.evidence.length).toBe(1);
    });

    it('should reject invalid answerability enum values', () => {
      const invalidJson = JSON.stringify({
        answer: 'Test',
        answerability: 'somewhat_supported', // invalid enum
        evidence: [],
      });

      expect(() => parseAndValidateModelOutput(invalidJson)).toThrow();
    });

    it('should throw clear error on unparseable JSON', () => {
      const corrupted = '{"answer": "Missing closing quote, answerability: "supported"}';
      expect(() => parseAndValidateModelOutput(corrupted)).toThrow(/Failed to parse AI output as JSON/);
    });
  });
});
