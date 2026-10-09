# Evaluation Protocol for HieuDaoTao Policy Intelligence Prototype

This directory outlines the evaluation methodology, test case schema, and historical evaluation records for validating the accuracy, groundedness, and reliability of the HieuDaoTao prototype on Vietnamese higher-education academic regulations.

> **Important**: This evaluation framework is designed for structured qualitative and quantitative validation during pilot trials. No arbitrary benchmark percentages or marketing accuracy claims are made.

---

## Evaluation & Validation Records

- **Sample Document Live Validation**: [`live-validation.md`](./live-validation.md)  
  *First sample-document live validation*: Documents initial local runtime smoke test and single-query verification against the bundled 3-page sample regulation PDF (`quy-che-dao-tao-mau.pdf`).
- **Real-Document 10-Question Evaluation 01**: [`real-document-evaluation-01.md`](./real-document-evaluation-01.md)  
  *First real-document 10-question evaluation*: Evaluates 10 diverse policy questions against an 18-page public Vietnamese university academic regulation (*Trường Đại học Kinh tế - Đại học Đà Nẵng*, Decision No. 1284/QĐ-ĐHKT). Documents answer accuracy, citation correctness, cross-page verifier limitations, and verifier rejection of wrong-page model citations.
- **Verifier Improvement Note 01**: [`verifier-improvement-01.md`](./verifier-improvement-01.md)  
  *Cross-page verification enhancement*: Documents the two-stage boundary-aware evidence verification architecture, safety regression guarantees for wrong-page citations (preserving Case 08 rejection), and comprehensive test suite validation.

---

## Evaluation Dimensions

1. **Answer Correctness & Administrative Intent**
   - Does the AI-generated answer faithfully represent the institutional regulation without hallucination or distortion of administrative intent?
   - Does it correctly handle exceptions, thresholds, and conditions?

2. **Citation & Evidence Precision**
   - Does the model accurately identify the exact Article (*Điều*), Clause (*Khoản*), Point (*Điểm*), or Appendix (*Phụ lục*)?
   - Are the extracted quotes verbatim from the stated page number?

3. **Server-Side Quotation Verification**
   - Does the server-side text matching successfully verify the quoted passages against the extracted source text?
   - Are unverified or hallucinated quotes clearly flagged for human review?

4. **Answerability Determination**
   - Does the model correctly report `supported`, `partial`, or `not_supported`?
   - Does it refuse cleanly when a question asks for provisions not present in the document?

5. **Human Review Efficiency**
   - Can university administrative staff verify and audit the generated conclusion faster than manual searching while retaining full decision authority?

---

## Test Case Schema

Each evaluation case is recorded using the following standardized schema:

```json
{
  "test_id": "TC-REG-001",
  "document": {
    "title": "Quy chế đào tạo trình độ đại học",
    "reference": "Thông tư số 17/2021/TT-BGDĐT / Quy chế nội bộ",
    "filename": "quy-che-dao-tao-mau.pdf",
    "total_pages": 3
  },
  "question": "Theo quy chế này, điều kiện để sinh viên được công nhận tốt nghiệp là gì?",
  "expected_grounding": {
    "page": 3,
    "section": "Điều 18",
    "key_provisions": [
      "Tích lũy đủ số tín chỉ quy định",
      "Điểm trung bình chung tích lũy toàn khóa từ 2.00 trở lên theo thang điểm 4",
      "Đạt chuẩn đầu ra ngoại ngữ và tin học",
      "Có chứng chỉ Giáo dục quốc phòng - an ninh và Giáo dục thể chất",
      "Không bị kỷ luật từ mức đình chỉ học tập trở lên"
    ]
  },
  "expected_answerability": "supported",
  "execution_record": {
    "provider": "vertex",
    "model": "gemini-2.5-flash",
    "timestamp": "2026-10-09T...",
    "model_answer": "...",
    "model_evidence": [
      {
        "page": 3,
        "section": "Điều 18",
        "quotedText": "...",
        "verified": true
      }
    ],
    "verification_rate": "1/1 verified"
  },
  "human_reviewer_outcome": {
    "reviewer": "Academic Affairs Officer",
    "decision": "APPROVED", // APPROVED | NEEDS_REVISION | REJECTED
    "notes": "Answer matches institutional graduation policy exactly; citations verified on page 3."
  }
}
```

---

## Sample Test Scenarios

### Scenario 1: Graduation Requirements (Direct Provision)
- **Document**: Standard Academic Regulation
- **Question**: `Điều kiện xét và công nhận tốt nghiệp là gì?`
- **Expected Outcome**: `supported`, citation to *Điều 18*, CPA threshold >= 2.00, verified quote.

### Scenario 2: Academic Warning & Dismissal (Multi-clause Logic)
- **Document**: Standard Academic Regulation
- **Question**: `Quy định về việc cảnh báo học tập và buộc thôi học như thế nào?`
- **Expected Outcome**: `supported`, citation to *Điều 14*, criteria for semester GPA and cumulative GPA, 3 consecutive warnings leading to dismissal.

### Scenario 3: Unmentioned Topic (Clean Refusal)
- **Document**: Academic Training Regulation (no tuition or financial aid rules)
- **Question**: `Mức học phí cho chương trình chất lượng cao là bao nhiêu?`
- **Expected Outcome**: `not_supported`, clear statement that tuition fees are not governed by the provided training regulation, 0 hallucinated quotes.
