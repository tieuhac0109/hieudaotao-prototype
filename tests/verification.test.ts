import { describe, it, expect } from 'vitest';
import {
  normalizeTextForMatching,
  normalizePunctuationTokens,
  verifySingleQuote,
  verifyCrossPageSequence,
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

  const multiPageDoc: DocumentPage[] = [
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
    {
      pageNumber: 6,
      text:
        'Điều 8. Đăng ký học tập và rút bớt học phần.\n' +
        '4. Việc rút bớt học phần trong khối lượng học tập đã đăng ký:\n' +
        'a) Sinh viên được rút bớt học phần trong 4 tuần đầu của học kỳ chính;\n' +
        'b) Không vi phạm khối lượng học tập tối thiểu theo quy định;\n' +
        'c) Không được rút đối với học phần Báo cáo thực tập tốt nghiệp',
    },
    {
      pageNumber: 7,
      text:
        'và Khóa luận tốt nghiệp theo quy định của Trường.\n' +
        'Sinh viên nộp đơn đề nghị rút bớt học phần tại Phòng Đào tạo sau khi có ý kiến của Cố vấn học tập.',
    },
    {
      pageNumber: 11,
      text:
        'Điều 12. Xử lý học tập.\n' +
        '2. Sinh viên bị buộc thôi học trong các trường hợp sau:\n' +
        'a) Có số lần cảnh báo học tập vượt quá 2 lần liên tiếp;\n' +
        'b) Có tổng số lần cảnh báo học tập vượt quá 3 lần;',
    },
    {
      pageNumber: 12,
      text:
        'c) Vượt quá thời gian tối đa được phép học tập tại trường;\n' +
        'd) Bị kỷ luật lần thứ hai do thi hộ hoặc nhờ người thi hộ.\n' +
        'Điều 13. Công nhận kết quả và chuyển đổi tín chỉ.\n' +
        '3. Khối lượng tín chỉ tối đa được miễn học, công nhận, chuyển đổi không vượt quá 50% khối lượng học tập tối thiểu của chương trình đào tạo.',
    },
    {
      pageNumber: 13,
      text:
        'Điều 15. Xét và công nhận tốt nghiệp.\n' +
        '1. Sinh viên được xét và công nhận tốt nghiệp khi có đủ các điều kiện sau:\n' +
        'a) Tích lũy đủ học phần, số tín chỉ và hoàn thành các nội dung bắt buộc theo yêu cầu của CTĐT;\n' +
        'b) Điểm trung bình chung tích lũy toàn khóa đạt từ hạng Trung bình trở lên;\n' +
        'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường;',
    },
    {
      pageNumber: 14,
      text:
        'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự;\n' +
        'e) Có đơn gửi Phòng Đào tạo đề nghị được xét tốt nghiệp.\n' +
        '4. Hạng tốt nghiệp của sinh viên có điểm toàn khóa xếp loại Xuất sắc và Giỏi sẽ bị giảm đi một mức nếu khối lượng các học phần phải học lại vượt quá 5% tổng số tín chỉ quy định.',
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

  describe('Single-Page Verification Rules', () => {
    it('1. should accept exact Vietnamese quote on declared page', () => {
      const quote = 'Cảnh báo kết quả học tập được thực hiện theo từng học kỳ.';
      const result = verifySingleQuote(quote, warningPageText);
      expect(result.verified).toBe(true);
      expect(result.verificationMode).toBe('single_page');
    });

    it('2. should accept quote with whitespace and line-break differences', () => {
      const quote = 'Sinh viên bị buộc thôi học\n  nếu bị cảnh báo   kết quả học tập 3 lần liên tiếp.';
      const result = verifySingleQuote(quote, warningPageText);
      expect(result.verified).toBe(true);
      expect(result.verificationMode).toBe('single_page');
    });

    it('3. should accept quote with typographic quotes and dash normalization', () => {
      const textWithQuotes = 'Quy định về “chuẩn đầu ra” — áp dụng từ năm 2024.';
      const quote = 'Quy định về "chuẩn đầu ra" - áp dụng từ năm 2024.';
      const result = verifySingleQuote(quote, textWithQuotes);
      expect(result.verified).toBe(true);
      expect(result.verificationMode).toBe('single_page');
    });

    it('4. should REJECT adversarial condition alteration (fabricated negation)', () => {
      const fabricatedNegation =
        'Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên và không cần đạt chuẩn đầu ra ngoại ngữ.';
      const result = verifySingleQuote(fabricatedNegation, graduationPageText);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('5. should REJECT quote with fabricated suffix', () => {
      const fabricatedSuffix =
        'Sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp và nộp phạt 5 triệu đồng.';
      const result = verifySingleQuote(fabricatedSuffix, warningPageText);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('6. should REJECT quote with fabricated prefix', () => {
      const fabricatedPrefix =
        'Theo quyết định của Hiệu trưởng, sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp.';
      const result = verifySingleQuote(fabricatedPrefix, warningPageText);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('7. should REJECT quote entirely absent from page', () => {
      const absentQuote = 'Học phí chương trình chất lượng cao là 40 triệu đồng mỗi học kỳ.';
      const result = verifySingleQuote(absentQuote, warningPageText);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('8. should REJECT quote referencing the wrong single page', () => {
      const quoteFromPage3 = 'Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên';
      const result = verifySingleQuote(quoteFromPage3, warningPageText);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('should reject empty or extremely short quotes (< 3 characters)', () => {
      expect(verifySingleQuote('', warningPageText).verified).toBe(false);
      expect(verifySingleQuote('   ', warningPageText).verified).toBe(false);
      expect(verifySingleQuote('ab', warningPageText).verified).toBe(false);
    });
  });

  describe('Conservative Cross-Page Verification Rules', () => {
    const page13 = multiPageDoc.find((p) => p.pageNumber === 13)!;
    const page14 = multiPageDoc.find((p) => p.pageNumber === 14)!;
    const page11 = multiPageDoc.find((p) => p.pageNumber === 11)!;

    it('9. exact quote genuinely starts on declared page and continues on next page -> true', () => {
      const crossQuote =
        'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường; ' +
        'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự; ' +
        'e) Có đơn gửi Phòng Đào tạo đề nghị được xét tốt nghiệp.';

      const result = verifyCrossPageSequence(crossQuote, page13, page14, 13);
      expect(result.verified).toBe(true);
      expect(result.verificationMode).toBe('cross_page_forward');
    });

    it('10. cross-page quote with whitespace and newline differences -> true', () => {
      const crossQuote =
        'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường;\n\n' +
        '   d) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự;\n' +
        '   e) Có đơn gửi Phòng Đào tạo đề nghị được xét tốt nghiệp.';

      const result = verifyCrossPageSequence(crossQuote, page13, page14, 13);
      expect(result.verified).toBe(true);
      expect(result.verificationMode).toBe('cross_page_forward');
    });

    it('11. cross-page quote with punctuation differences accepted under lexical normalization -> true', () => {
      const crossQuote =
        'c: Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường! ' +
        'd: Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự, ' +
        'e: Có đơn gửi Phòng Đào tạo đề nghị được xét tốt nghiệp.';

      const result = verifyCrossPageSequence(crossQuote, page13, page14, 13);
      expect(result.verified).toBe(true);
      expect(result.verificationMode).toBe('cross_page_forward');
    });

    it('12. quote exists entirely on next page, declared previous page -> false', () => {
      // Entire quote on page 14 only, declared page 13
      const quoteOnPage14Only =
        'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự; ' +
        'e) Có đơn gửi Phòng Đào tạo đề nghị được xét tốt nghiệp.';

      const result = verifyCrossPageSequence(quoteOnPage14Only, page13, page14, 13);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('13. quote exists entirely on previous page, declared next page -> false', () => {
      // Entire quote on page 13 only, declared page 14
      const quoteOnPage13Only =
        'a) Tích lũy đủ học phần, số tín chỉ và hoàn thành các nội dung bắt buộc theo yêu cầu của CTĐT; ' +
        'b) Điểm trung bình chung tích lũy toàn khóa đạt từ hạng Trung bình trở lên;';

      const result = verifyCrossPageSequence(quoteOnPage13Only, page13, page14, 14);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('14. quote exists on wrong non-adjacent page -> false', () => {
      // Non-adjacent pages (e.g. page 11 and page 14)
      const quoteFromPage11 = 'a) Có số lần cảnh báo học tập vượt quá 2 lần liên tiếp;';
      const result = verifyCrossPageSequence(quoteFromPage11, page11, page14, 11);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('15. quote spans pages N+1 -> N+2 but declared page N -> false', () => {
      // Quote spans 13 -> 14, but declared page is 12
      const crossQuote13To14 =
        'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường; ' +
        'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự;';

      const result = verifyCrossPageSequence(crossQuote13To14, page13, page14, 12);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('16. fabricated suffix after a valid cross-page quote -> false', () => {
      const fabricatedCrossSuffix =
        'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường; ' +
        'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự; ' +
        'và đóng lệ phí tốt nghiệp 10 triệu đồng.';

      const result = verifyCrossPageSequence(fabricatedCrossSuffix, page13, page14, 13);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('17. fabricated prefix before a valid cross-page quote -> false', () => {
      const fabricatedCrossPrefix =
        'Hội đồng nhà trường quyết định: ' +
        'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường; ' +
        'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự;';

      const result = verifyCrossPageSequence(fabricatedCrossPrefix, page13, page14, 13);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('18. altered numeric threshold inside a cross-page quote -> false', () => {
      // Real text on page 14: "vượt quá 5% tổng số tín chỉ"
      // Altered to "vượt quá 15% tổng số tín chỉ"
      const alteredQuote =
        'e) Có đơn gửi Phòng Đào tạo đề nghị được xét tốt nghiệp. ' +
        '4. Hạng tốt nghiệp của sinh viên có điểm toàn khóa xếp loại Xuất sắc và Giỏi sẽ bị giảm đi một mức nếu khối lượng các học phần phải học lại vượt quá 15% tổng số tín chỉ quy định.';

      const result = verifyCrossPageSequence(alteredQuote, page13, page14, 13);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('19. only trivial overlap with declared page (e.g. 1-2 tokens) -> false', () => {
      // Declared page 13, only "Trường" from page 13 (1 token), rest from page 14
      const trivialOverlapFromPage13 =
        'Trường. d) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự;';

      const result = verifyCrossPageSequence(trivialOverlapFromPage13, page13, page14, 13);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('20. only trivial overlap with adjacent page (e.g. 1-2 tokens) -> false', () => {
      // Declared page 13, long text on page 13, only "d)" from page 14 (1 token: 'd')
      const trivialOverlapToPage14 =
        'Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường; d)';

      const result = verifyCrossPageSequence(trivialOverlapToPage14, page13, page14, 13);
      expect(result.verified).toBe(false);
      expect(result.verificationMode).toBe('unverified');
    });

    it('21. invalid declared page number -> false', () => {
      const crossQuote =
        'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường; ' +
        'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự;';

      expect(verifyCrossPageSequence(crossQuote, page13, page14, 0).verified).toBe(false);
      expect(verifyCrossPageSequence(crossQuote, page13, page14, -1).verified).toBe(false);
      expect(verifyCrossPageSequence(crossQuote, page13, page14, 999).verified).toBe(false);
    });

    it('22. last page cannot forward-cross beyond document bounds in verifyEvidenceList', () => {
      const rawEvidence: RawEvidenceItem[] = [
        {
          page: 14,
          section: 'Điều 15',
          quotedText: 'Hạng tốt nghiệp của sinh viên có điểm toàn khóa xếp loại Xuất sắc và Giỏi',
        },
      ];

      const verifiedList = verifyEvidenceList(rawEvidence, multiPageDoc);
      expect(verifiedList[0].verified).toBe(true);
      expect(verifiedList[0].verificationMode).toBe('single_page');
    });
  });

  describe('Regression Safety Tests (Evaluation Case 08 & Case 01/03/05)', () => {
    it('rejects correct quotation attributed entirely to adjacent wrong page (Case 08 Regression)', () => {
      // Real-document Case 08 scenario:
      // Page 12 contains Điều 13 Khoản 3 text.
      // Model attributes citation to Page 13.
      // The quotation exists 100% on Page 12, with 0 tokens on Page 13.
      const case08Quote =
        'Khối lượng tín chỉ tối đa được miễn học, công nhận, chuyển đổi không vượt quá 50% khối lượng học tập tối thiểu của chương trình đào tạo.';

      const rawEvidence: RawEvidenceItem[] = [
        {
          page: 13, // Declared page 13 (wrong page attribution)
          section: 'Điều 13, Khoản 3',
          quotedText: case08Quote,
          rationale: 'Maximum credit transfer limit.',
        },
      ];

      const verified = verifyEvidenceList(rawEvidence, multiPageDoc);
      expect(verified.length).toBe(1);
      expect(verified[0].verified).toBe(false);
      expect(verified[0].verificationMode).toBe('unverified');
    });

    it('verifies quotation that genuinely crosses declared page boundary (Case 01 Regression)', () => {
      // Case 01 scenario: Điều 15 Khoản 1 spans Page 13 -> Page 14
      const case01CrossQuote =
        'Sinh viên được xét và công nhận tốt nghiệp khi có đủ các điều kiện sau: ' +
        'a) Tích lũy đủ học phần, số tín chỉ và hoàn thành các nội dung bắt buộc theo yêu cầu của CTĐT; ' +
        'b) Điểm trung bình chung tích lũy toàn khóa đạt từ hạng Trung bình trở lên; ' +
        'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường; ' +
        'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự; ' +
        'e) Có đơn gửi Phòng Đào tạo đề nghị được xét tốt nghiệp.';

      const rawEvidence: RawEvidenceItem[] = [
        {
          page: 13, // Declared page 13 (starts on page 13, finishes on page 14)
          section: 'Điều 15, Khoản 1',
          quotedText: case01CrossQuote,
          rationale: 'Graduation conditions spanning pages 13 and 14.',
        },
      ];

      const verified = verifyEvidenceList(rawEvidence, multiPageDoc);
      expect(verified.length).toBe(1);
      expect(verified[0].verified).toBe(true);
      expect(verified[0].verificationMode).toBe('cross_page_forward');
    });

    it('verifies quotation that genuinely crosses declared page boundary (Case 03 Regression: 11 -> 12)', () => {
      // Case 03 scenario: Điều 12 Khoản 2 spans Page 11 -> Page 12
      const case03CrossQuote =
        'Sinh viên bị buộc thôi học trong các trường hợp sau: ' +
        'a) Có số lần cảnh báo học tập vượt quá 2 lần liên tiếp; ' +
        'b) Có tổng số lần cảnh báo học tập vượt quá 3 lần; ' +
        'c) Vượt quá thời gian tối đa được phép học tập tại trường; ' +
        'd) Bị kỷ luật lần thứ hai do thi hộ hoặc nhờ người thi hộ.';

      const rawEvidence: RawEvidenceItem[] = [
        {
          page: 11, // Declared page 11
          section: 'Điều 12, Khoản 2',
          quotedText: case03CrossQuote,
          rationale: 'Dismissal criteria spanning pages 11 and 12.',
        },
      ];

      const verified = verifyEvidenceList(rawEvidence, multiPageDoc);
      expect(verified.length).toBe(1);
      expect(verified[0].verified).toBe(true);
      expect(verified[0].verificationMode).toBe('cross_page_forward');
    });

    it('verifies quotation that genuinely crosses declared page boundary (Case 05 Regression: 6 -> 7)', () => {
      // Case 05 scenario: Điều 8 Khoản 4 Point c spans Page 6 -> Page 7
      const case05CrossQuote =
        'Không được rút đối với học phần Báo cáo thực tập tốt nghiệp và Khóa luận tốt nghiệp theo quy định của Trường. ' +
        'Sinh viên nộp đơn đề nghị rút bớt học phần tại Phòng Đào tạo sau khi có ý kiến của Cố vấn học tập.';

      const rawEvidence: RawEvidenceItem[] = [
        {
          page: 6, // Declared page 6
          section: 'Điều 8, Khoản 4',
          quotedText: case05CrossQuote,
          rationale: 'Course withdrawal conditions spanning pages 6 and 7.',
        },
      ];

      const verified = verifyEvidenceList(rawEvidence, multiPageDoc);
      expect(verified.length).toBe(1);
      expect(verified[0].verified).toBe(true);
      expect(verified[0].verificationMode).toBe('cross_page_forward');
    });
  });

  describe('verifyEvidenceList Integration & Mixed Batch', () => {
    it('should correctly handle a mixed list of single-page, cross-page, wrong-page, and fabricated evidence', () => {
      const rawEvidence: RawEvidenceItem[] = [
        {
          page: 2,
          section: 'Điều 14, Khoản 2',
          quotedText: 'Sinh viên bị buộc thôi học nếu bị cảnh báo kết quả học tập 3 lần liên tiếp.',
          rationale: 'Single-page exact quote on page 2.',
        },
        {
          page: 13,
          section: 'Điều 15, Khoản 1',
          quotedText:
            'c) Đạt chuẩn đầu ra ngoại ngữ và tin học theo quy định của Trường; ' +
            'd) Tại thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự; ' +
            'e) Có đơn gửi Phòng Đào tạo đề nghị được xét tốt nghiệp.',
          rationale: 'Cross-page quote spanning page 13 and 14.',
        },
        {
          page: 13,
          section: 'Điều 13, Khoản 3',
          quotedText:
            'Khối lượng tín chỉ tối đa được miễn học, công nhận, chuyển đổi không vượt quá 50% khối lượng học tập tối thiểu của chương trình đào tạo.',
          rationale: 'Wrong page: text is on page 12, not 13.',
        },
        {
          page: 3,
          section: 'Điều 18',
          quotedText:
            'Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên và không cần đạt chuẩn đầu ra ngoại ngữ.',
          rationale: 'Fabricated negation condition.',
        },
      ];

      const verifiedList = verifyEvidenceList(rawEvidence, multiPageDoc);

      expect(verifiedList.length).toBe(4);
      expect(verifiedList[0].verified).toBe(true);
      expect(verifiedList[0].verificationMode).toBe('single_page');

      expect(verifiedList[1].verified).toBe(true);
      expect(verifiedList[1].verificationMode).toBe('cross_page_forward');

      expect(verifiedList[2].verified).toBe(false);
      expect(verifiedList[2].verificationMode).toBe('unverified');

      expect(verifiedList[3].verified).toBe(false);
      expect(verifiedList[3].verificationMode).toBe('unverified');
    });
  });
});
