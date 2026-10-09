# HieuDaoTao Prototype — Post-Fix Verification 01

> **Document Type**: Post-Fix Live Verification Note  
> **Reference Evaluation**: [`real-document-evaluation-01.md`](./real-document-evaluation-01.md)  
> **Reference Verifier Improvement**: [`verifier-improvement-01.md`](./verifier-improvement-01.md)  
> **Verification Date**: 2026-10-09  
> **Runtime**: Live deployed prototype (`https://prototype.hieudaotao.io.vn/`)  
> **Provider / Model**: Vertex AI / `gemini-2.5-flash`

---

## 1. Purpose

This note records a targeted live post-fix verification pass after the evidence verifier was enhanced to support conservative adjacent-page boundary verification.

The objective was not to replace the historical V1 evaluation metrics. Instead, four previously important cases were re-run to confirm two properties:

1. evidence can still be verified when the model produces valid page-scoped evidence after the verifier change; and
2. wrong-page-only citations remain rejected and do not receive a false verified status.

Because model evidence generation is non-deterministic, the re-run did not always reproduce the exact evidence segmentation observed in the original evaluation. Therefore, this note does not recalculate the historical 6/10 verification metric.

---

## 2. Targeted Live Re-Run Results

| Case | Question | Live Re-Run Observation | Verification Outcome | Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| **Case 01** | Graduation eligibility conditions | The model split the evidence into separate page-scoped items across Page 13 and Page 14 instead of producing one combined cross-page quotation. | All displayed evidence items were verified against source. | Positive live result, but this run did not exercise the new cross-page boundary path because the model segmented the evidence by page. |
| **Case 03** | Forced academic dismissal conditions | The model produced several evidence items for Điều 12 Khoản 2 with some items attributed to Page 12 even though those clauses are on Page 11. Other evidence items were correctly grounded and verified. | Wrong-page items were rejected; correctly attributed items were verified. | Safety behavior preserved. The verifier did not silently correct model page metadata or falsely verify adjacent-page-only text. |
| **Case 05** | Course withdrawal conditions | The model split the procedure across separate Page 6 and Page 7 evidence items rather than one cross-page quote. | All displayed evidence items were verified against source. | Positive live result, but this run again did not exercise the cross-page boundary path because the model segmented evidence by page. |
| **Case 08** | Maximum credit exemption / recognition / transfer limit | The model again returned the substantively correct Điều 13 Khoản 3 quotation but attributed it to Page 13 instead of Page 12. | `Could not verify quoted passage automatically` | Critical regression safety confirmed: a correct quotation located entirely on the wrong adjacent page remains unverified. |

---

## 3. Case Notes

### Case 01 — Graduation Eligibility

The live re-run returned separate evidence items for the graduation conditions across Page 13 and Page 14, each independently verified.

This confirms that the current production verifier accepts correctly attributed page-scoped evidence. However, the model output shape differed from the historical V1 run, which had produced one combined quotation spanning the page boundary. For that reason, this live run cannot by itself be used as proof that the new cross-page branch executed.

Cross-page boundary behavior remains covered by deterministic unit and regression tests documented in [`verifier-improvement-01.md`](./verifier-improvement-01.md).

### Case 03 — Forced Academic Dismissal

The live re-run demonstrated an important safety property. Several clauses from Điều 12 Khoản 2 were attributed by the model to Page 12 even though the relevant text occurs on Page 11. Those items remained unverified.

Other correctly attributed evidence items were verified successfully.

The model also surfaced an additional provision from Điều 21 concerning fraudulent documents as a dismissal-related rule. That provision exists in the regulation, but it broadens the answer beyond the narrower Điều 12 dismissal clause used as the ground-truth scope in the original evaluation. This observation is recorded as model-output variability, not as verifier failure.

### Case 05 — Course Withdrawal

The live re-run returned evidence as separate Page 6 and Page 7 items. All displayed items were verified.

As with Case 01, this is a successful live grounding result, but it did not reproduce the historical single quotation that crossed the Page 6 → Page 7 boundary. Therefore, it should not be presented as a direct live execution of the new cross-page matching path.

### Case 08 — Wrong-Page Attribution Regression

The model again produced the correct substantive 50% rule from Điều 13 Khoản 3 but attributed it to Page 13 instead of the actual Page 12.

The verifier rejected the quotation and displayed an unverified warning.

This is the most important live safety confirmation in this re-run: adjacent-page support did not weaken page-attribution integrity. The verifier does not treat “the quote exists on a neighboring page” as sufficient for verification.

---

## 4. What This Re-Run Confirms

The live post-fix pass supports the following conclusions:

- correctly attributed evidence continues to verify normally;
- wrong-page-only evidence remains rejected;
- the verifier does not silently repair model page numbers;
- the Case 08 safety property is preserved in production;
- live model output segmentation can differ between runs, so verifier correctness should be evaluated with deterministic regression tests in addition to live smoke tests.

---

## 5. What This Re-Run Does Not Prove

This live pass does **not** justify changing the historical Real Document Evaluation 01 metrics.

Specifically:

- the original V1 record remains 6/10 questions with all evidence fully verified;
- the three historical cross-page limitation cases remain part of the immutable evaluation history;
- Cases 01 and 05 were re-generated as page-separated evidence, so the live runtime did not necessarily invoke the new cross-page branch;
- Case 03 generated new wrong-page citation behavior and therefore is not a like-for-like replay of the original evidence output;
- no new generalized verification percentage or accuracy claim should be published from this targeted re-run.

---

## 6. Engineering Interpretation

The combined evidence from the historical evaluation, deterministic regression tests, and this live post-fix pass supports the current verifier design:

1. **Historical evaluation** identified real page-boundary false negatives and wrong-page metadata errors.
2. **Regression tests** verify deterministic handling of genuine cross-page quotations and reject wrong-page-only quotations.
3. **Live post-fix verification** confirms that wrong-page protection remains active in production and that normal page-scoped evidence continues to verify successfully.

This separation avoids conflating model variability with verifier correctness.

---

## 7. Public-Safe Summary

A targeted live post-fix verification confirmed that correctly attributed evidence continues to verify while wrong-page-only citations remain rejected. Because the model generated different evidence segmentation on re-run, the historical V1 evaluation metrics remain unchanged; cross-page behavior is validated through deterministic regression tests and documented separately.
