# HieuDaoTao Prototype — Real Document Evaluation 01

> **Document Type**: Initial Real-Document Qualitative & Grounding Evaluation Record  
> **Evaluation Scope**: 10-question policy Q&A evaluation against one public Vietnamese university academic regulation  
> **Evaluated Runtime**: Live deployed prototype (`https://prototype.hieudaotao.io.vn/`)  
> **Active Provider & Model**: Vertex AI (`gemini-2.5-flash`) via Vertex AI Express Mode  
> **Evaluation Date**: 2026-10-09  
> **Reviewer**: Manual human review against the official source regulation  
> **Disclaimer**: This is an initial manual evaluation based on one real Vietnamese university regulation using 10 policy questions executed on the deployed prototype with Vertex AI / Gemini 2.5 Flash and manually reviewed against the source regulation. It is **not** a statistically representative benchmark and does **not** constitute an accuracy certification.

---

## 1. Source Document Identity

| Attribute | Detail |
| :--- | :--- |
| **Institution** | Trường Đại học Kinh tế - Đại học Đà Nẵng |
| **Title** | Quy chế đào tạo trình độ đại học |
| **Issuing Decision** | Decision No. 1284/QĐ-ĐHKT |
| **Issue Date** | 20/09/2021 |
| **Page Count** | 18 pages |
| **Format** | Text-based PDF (public institutional academic regulation) |

---

## 2. Evaluation Summary & Metrics

This evaluation clearly separates five distinct dimensions:
1. **Answer correctness**: Substantive fidelity of the answer to institutional regulations.
2. **Citation / article correctness**: Correct identification of Articles (*Điều*), Clauses (*Khoản*), and Points (*Điểm*).
3. **Page attribution correctness**: Accuracy of the model-declared 1-based page number.
4. **Automatic quotation verification status**: Independent server-side string matching between model quotation and extracted page text.
5. **Human review judgment**: Final qualitative verification of compliance by human review.

### Evaluation Summary

| Metric | Recorded Value | Notes |
| :--- | :--- | :--- |
| **Questions tested** | 10 | Diverse university academic policy topics |
| **Manually judged substantively correct answers** | 10 | Verified against Decision No. 1284/QĐ-ĐHKT |
| **Partial answers** | 0 | No omitted required conditions |
| **Incorrect answers** | 0 | No substantive hallucinations |
| **Questions with all supporting evidence automatically verified** | 6 | All generated quotes passed server-side matching |
| **Questions with one or more evidence verification warnings** | 4 | Quoted passages flagged as unverified by verifier |
| **— Observed cross-page verification limitations** | 3 cases | Substantively correct quotes spanning across page boundaries |
| **— Observed wrong-page citation** | 1 case | Correct quote/clause attributed to wrong page (rejected by verifier) |
| **Fabricated substantive answers observed** | 0 | Zero ungrounded substantive claims |

> **Important Distinction**: A correct answer does **not** imply that every citation or evidence item was automatically verified. The server-side verifier enforces strict, conservative page-bounded matching independently of answer validity.

---

## 3. Evaluation Cases

### Case 01: Graduation Eligibility Conditions
- **Case ID**: `EVAL-01-CASE-01`
- **Question**: `Sinh viên được xét và công nhận tốt nghiệp khi đáp ứng những điều kiện nào?`
- **Relevant Provision**: `Điều 15, Khoản 1`
- **Expected / Ground-Truth Summary**:
  - Accumulated all required courses and credits.
  - Completed mandatory program requirements.
  - Achieved program learning outcomes.
  - Cumulative GPA at least "Trung bình".
  - Not under criminal prosecution or academic suspension at graduation review time.
  - Submitted a request to Phòng Đào tạo for graduation consideration.
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Warning / not fully automatically verified`
- **Failure Mode**: `Cross-page quotation`
- **Reason**: Điều 15 Khoản 1 spans page 13 and page 14. The model produced a combined quote covering items a-d but attributed the evidence to page 13, while item d appears on page 14.
- **Classification**: `Correct answer / cross-page verification limitation`
- **Human Review Note**: The answer is substantively complete and accurate. The verifier flagged the citation because the quotation crossed a page boundary.

---

### Case 02: Academic Warnings
- **Case ID**: `EVAL-01-CASE-02`
- **Question**: `Trong những trường hợp nào sinh viên bị cảnh báo học tập?`
- **Relevant Provision**: `Điều 12, Khoản 1`
- **Expected / Ground-Truth Summary**:
  - Semester GPA below 0.8 in first semester; below 1.0 in subsequent semesters.
  - Cumulative GPA below:
    - 1.2 for first-year level
    - 1.4 for second-year level
    - 1.6 for third-year level
    - 1.8 for later years
  - The special non-registration / insufficient-credit condition described in point c.
  - Point c warning does not accumulate toward forced dismissal count.
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Fully verified`
- **Observed Evidence**: `4/4 evidence items automatically verified`
- **Failure Mode**: None
- **Classification**: `Correct / fully grounded / fully verified`
- **Human Review Note**: Exact extraction of all numeric GPA thresholds across study levels and preservation of the point c non-accumulation rule.

---

### Case 03: Forced Academic Dismissal
- **Case ID**: `EVAL-01-CASE-03`
- **Question**: `Sinh viên bị buộc thôi học trong những trường hợp nào?`
- **Relevant Provision**: `Điều 12, Khoản 2`
- **Expected / Ground-Truth Summary**:
  - More than 2 consecutive academic warnings.
  - More than 3 warnings, with stated exception.
  - Exceeding maximum study duration.
  - Second violation involving exam impersonation.
  - No course registration for one main semester without permitted suspension in the relevant case.
  - No course registration for two consecutive main semesters in the relevant case.
  - Component scores of all registered courses in the semester equal 0.
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Warning / not fully automatically verified`
- **Failure Mode**: `Cross-page quotation`
- **Reason**: Điều 12 Khoản 2 begins on page 11 and continues on page 12, while the generated evidence combined the clause into one page-scoped quote.
- **Classification**: `Correct answer / cross-page verification limitation`
- **Human Review Note**: Complete and correct identification of all 7 dismissal conditions. Verification warning resulted from multi-page clause spanning.

---

### Case 04: Minimum & Maximum Semester Credit Load
- **Case ID**: `EVAL-01-CASE-04`
- **Question**: `Khối lượng đăng ký học tập tối thiểu và tối đa trong một học kỳ chính là bao nhiêu tín chỉ?`
- **Relevant Provision**: `Điều 8, Khoản 3`
- **Expected / Ground-Truth Summary**:
  - If the institution runs 2 main semesters:
    - Normal academic standing: 12-25 credits
    - Weak academic standing: 12-17 credits
  - If the institution runs 3 main semesters:
    - Normal academic standing: 8-16 credits
    - Weak academic standing: 8-11 credits
  - Includes exceptions where minimum study load does not apply.
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Fully verified`
- **Observed Evidence**: `3/3 evidence items automatically verified`
- **Failure Mode**: None
- **Classification**: `Correct / fully grounded / fully verified`
- **Human Review Note**: Perfect extraction of both 2-semester and 3-semester credit limits and applicable exceptions.

---

### Case 05: Course Withdrawal Conditions
- **Case ID**: `EVAL-01-CASE-05`
- **Question**: `Sinh viên được rút bớt học phần đã đăng ký khi nào và với điều kiện gì?`
- **Relevant Provision**: `Điều 8, Khoản 4`
- **Expected / Ground-Truth Summary**:
  - Withdrawal takes place in week 4 of the main semester.
  - Minimum study-load rules must not be violated.
  - Course cannot be Báo cáo thực tập tốt nghiệp or Khóa luận tốt nghiệp.
  - Student submits a request to Phòng Đào tạo.
  - Academic advisor approval is required.
  - Student may stop attending only after notification from Phòng Đào tạo.
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Partially verified`
- **Observed Evidence**: 2 evidence items verified; 1 evidence item not automatically verified.
- **Failure Mode**: `Cross-page quotation`
- **Reason**: Point c begins on page 6 and continues onto page 7.
- **Classification**: `Correct answer / partial evidence verification / cross-page limitation`
- **Human Review Note**: Highly thorough procedural answer. The single unverified quote crossed the page 6/7 boundary.

---

### Case 06: Graduation Thesis Eligibility
- **Case ID**: `EVAL-01-CASE-06`
- **Question**: `Điều kiện để sinh viên được làm khóa luận tốt nghiệp là gì?`
- **Relevant Provision**: `Điều 14, Khoản 2`
- **Expected / Ground-Truth Summary**:
  - Maximum 7 credits remaining uncompleted.
  - Remaining courses must not belong to the required pre-internship course list.
  - Cumulative GPA at least 3.0 at registration time.
  - Already studying or has studied Phương pháp nghiên cứu khoa học at registration time.
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Fully verified`
- **Observed Evidence**: `1/1 automatically verified`
- **Failure Mode**: None
- **Classification**: `Correct / fully grounded / fully verified`
- **Human Review Note**: Accurate capture of all four concurrent criteria for thesis eligibility.

---

### Case 07: Retaking Passed Courses for Grade Improvement
- **Case ID**: `EVAL-01-CASE-07`
- **Question**: `Nếu sinh viên đã có điểm đạt nhưng học lại để cải thiện điểm thì điểm chính thức được tính như thế nào?`
- **Relevant Provision**: `Điều 10, Khoản 5, Điểm b`
- **Expected / Ground-Truth Summary**: `Điểm chính thức là điểm cao nhất trong các lần học.`
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Fully verified`
- **Failure Mode**: None
- **Classification**: `Correct / fully grounded / fully verified`
- **Human Review Note**: Precise and verbatim policy extraction regarding grade improvement calculation.

---

### Case 08: Maximum Credit Exemption & Transfer Limit
- **Case ID**: `EVAL-01-CASE-08`
- **Question**: `Sinh viên có thể được miễn học, công nhận hoặc chuyển đổi tối đa bao nhiêu phần trăm số tín chỉ của chương trình?`
- **Relevant Provision**: `Điều 13, Khoản 3`
- **Expected / Ground-Truth Summary**: `Không vượt quá 50% khối lượng học tập tối thiểu của chương trình đào tạo.`
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Not automatically verified`
- **Observed Model Issue**:
  - Quotation text was substantively correct.
  - Article and clause were correct (*Điều 13, Khoản 3*).
  - Page attribution was incorrect: model attributed the provision to Page 13, whereas the provision is actually on Page 12.
- **Failure Mode**: `Wrong-page attribution`
- **Important Interpretation**: The verifier correctly rejected the evidence because the quotation did not exist on the stated page.
- **Classification**: `Correct answer / correct provision / incorrect page citation / verifier correctly rejected`
- **Human Review Note**: Substantively correct answer (50% threshold). The server-side verifier successfully prevented an incorrect page citation (Page 13 instead of Page 12) from receiving a verified badge, demonstrating intended verifier safety behavior.

---

### Case 09: Second Degree Program Registration
- **Case ID**: `EVAL-01-CASE-09`
- **Question**: `Điều kiện để đăng ký học chương trình thứ hai là gì?`
- **Relevant Provision**: `Điều 19, Khoản 2`
- **Expected / Ground-Truth Summary**:
  - Earliest registration is after being classified at second-year level in the first program.
  - Student must satisfy one of two academic conditions:
    - Cumulative academic classification at least Khá and satisfy quality threshold for the second program in that admission year;
    - Cumulative academic classification Trung bình and satisfy admission conditions for the second program in that admission year.
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Fully verified`
- **Observed Evidence**: `3/3 evidence items automatically verified`
- **Failure Mode**: None
- **Classification**: `Correct / fully grounded / fully verified`
- **Human Review Note**: Clear distinction between timing eligibility and the two alternative academic qualification thresholds.

---

### Case 10: Graduation Honors Reduction Criteria
- **Case ID**: `EVAL-01-CASE-10`
- **Question**: `Trong trường hợp nào hạng tốt nghiệp Xuất sắc hoặc Giỏi bị giảm đi một mức?`
- **Relevant Provision**: `Điều 15, Khoản 4`
- **Expected / Ground-Truth Summary**:
  - Repeated-course workload exceeds 5% of the total program credits.
  - Student received disciplinary action from warning level or higher during study.
- **Model Answer Judgment**: `Correct`
- **Evidence Verification Result**: `Fully verified`
- **Observed Evidence**: `1/1 automatically verified`
- **Failure Mode**: None
- **Classification**: `Correct / fully grounded / fully verified`
- **Human Review Note**: Both conditions causing a one-level downward adjustment of honors standing were accurately identified and cited.

---

## 4. Observed Failure Modes

The 10-question evaluation revealed two distinct operational failure modes:

### A. Cross-Page Quotation Verification

**Observed in**: Case 01, Case 03, Case 05

**Description**:  
The model may generate a single supporting quotation spanning content across adjacent PDF pages.

The current verifier is page-scoped and expects the complete quoted text to exist on the model-declared page.

Therefore, a substantively correct quote that crosses a page boundary may receive:

`Could not verify quoted passage automatically`

This is a **conservative false negative** in the verifier.

Do **not** describe this as a hallucination.

### B. Wrong-Page Model Attribution

**Observed in**: Case 08

**Description**:  
The model selected the correct regulation text and correct article/clause but attributed it to the wrong page (Page 13 instead of Page 12).

The server-side verifier rejected the evidence because the quoted passage was not found on the claimed page.

This demonstrates a useful **safety behavior**:

The verifier prevented an incorrect page citation from receiving a verified status.

Do **not** classify this as a verifier bug.

---

## 5. Interpretation

- The evaluation shows that the prototype can produce substantively correct policy answers across multiple regulation topics.
- Evidence verification is valuable because it separates model-generated citation claims from text actually confirmed on the source page.
- The evaluation also exposes a page-boundary limitation in the current V1 verifier.
- One wrong-page attribution demonstrates that automatic verification can catch citation metadata errors even when answer content is correct.
- The sample size is too small to support generalized accuracy claims.
- Broader evaluation across more documents, question types, and institutions is required.

---

## 6. Public-Safe Summary

In an initial 10-question manual evaluation against one public Vietnamese university regulation, all 10 answers were judged substantively correct. Six questions had fully server-verified evidence; three exposed cross-page verification limitations, and one contained a correct quotation attributed to the wrong page, which the verifier appropriately rejected.

This is an initial case-based evaluation, not a statistically representative accuracy benchmark.
