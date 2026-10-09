# HieuDaoTao Prototype — Verifier Improvement 01

> **Document Type**: Verifier Engineering & Improvement Note  
> **Target Component**: `src/lib/verification/evidence.ts`  
> **Reference Evaluation**: [`real-document-evaluation-01.md`](./real-document-evaluation-01.md)  
> **Implementation Date**: 2026-10-09  
> **Status**: Implemented & Regression Tested  

---

## 1. Context & Motivation

In **Real Document Evaluation 01** ([`evaluation/real-document-evaluation-01.md`](./real-document-evaluation-01.md)), the prototype was evaluated against an 18-page public Vietnamese university academic regulation (*Trường Đại học Kinh tế - Đại học Đà Nẵng*, Decision No. 1284/QĐ-ĐHKT).

The initial V1 evaluation revealed two important operational phenomena:
1. **Cross-Page False Negatives (3 cases: Case 01, Case 03, Case 05)**: Substantively accurate quotations spanning consecutive PDF page boundaries (pages 13→14, 11→12, 6→7) failed verification because the V1 verifier strictly evaluated each quote within the boundaries of a single declared page.
2. **Wrong-Page Citation Safety (1 case: Case 08)**: The model provided an accurate answer and quoted the correct clause (*Điều 13, Khoản 3*), but cited Page 13 instead of Page 12 where the text actually resided. The V1 verifier correctly rejected this citation.

### Engineering Goal

Reduce conservative false negatives for genuine adjacent-page quotations **without weakening wrong-page protection**. A quotation that resides entirely on a neighboring page must continue to be strictly rejected.

---

## 2. Two-Stage Verification Architecture

The verifier (`src/lib/verification/evidence.ts`) was updated to implement a deterministic two-stage verification pipeline:

### Stage A — Declared-Page Strict Verification
- Always attempts strict verification against the model-declared page first.
- Checks direct normalized substring matching and punctuation-normalized full lexical sequence matching.
- If the complete quote exists on the declared page, it is marked as `verified: true` with `verificationMode: 'single_page'`.

### Stage B — Conservative Adjacent-Page Boundary Verification
If Stage A fails, a narrowly scoped adjacent-page check is evaluated under strict conditions:
1. **Adjacent-Page Boundary**: Checks forward adjacent page (`declaredPage + 1`) and backward adjacent page (`declaredPage - 1`).
2. **Strict Boundary Crossing**: The matched sequence must genuinely span across the boundary between the two pages. A match residing entirely on one page is rejected.
3. **Minimum Contribution Rule**: The quotation must contain at least **3 lexical tokens** from the declared page and at least **3 lexical tokens** from the adjacent page.
4. **Verbatim Sequence Preservation**: The entire token sequence must match without added, deleted, or fabricated words.
5. **Deterministic Scope**: No arbitrary page searching, no ±2/±3 page scanning, and no document-wide fallback.

---

## 3. Safety Guarantees & Regression Protection

| Scenario | Evaluation Case 08 / Edge Case | Verifier Behavior | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Exact Single Page** | Quote on declared page | Stage A verifies quote | `verified: true` (`single_page`) |
| **Genuine Cross-Page** | Quote spans declared page N → page N+1 (≥ 3 tokens each) | Stage B forward verifies boundary match | `verified: true` (`cross_page_forward`) |
| **Wrong Adjacent Page** | Quote entirely on page 12, declared page 13 (Case 08) | 0 tokens on page 13; fails contribution threshold | `verified: false` (`unverified`) |
| **Trivial Boundary Spillover** | Only 1 token on declared page, rest on adjacent page | < 3 tokens on declared page | `verified: false` (`unverified`) |
| **Fabricated Affix** | Fabricated prefix/suffix added to cross-page quote | Token sequence mismatch | `verified: false` (`unverified`) |
| **Altered Numeric Value** | Altered threshold inside cross-page quote | Token sequence mismatch | `verified: false` (`unverified`) |

---

## 4. Test Suite Validation

The test suite in `tests/verification.test.ts` was expanded to 31 dedicated tests (part of the 64-test repository suite):
- **Single-page verification**: Exact matches, whitespace/quote normalization, fabricated prefix/suffix rejection, altered condition rejection, empty quote rejection.
- **Cross-page verification**: Genuine boundary-crossing quotes, whitespace/punctuation tolerance across page breaks, wrong adjacent-page rejection, non-adjacent page rejection, fabricated affix rejection, trivial overlap rejection, invalid page rejection.
- **Explicit Regression Tests**:
  - `rejects correct quotation attributed entirely to adjacent wrong page (Case 08 Regression)`
  - `verifies quotation that genuinely crosses declared page boundary (Case 01 Regression)`
  - `verifies quotation that genuinely crosses declared page boundary (Case 03 Regression: 11 -> 12)`
  - `verifies quotation that genuinely crosses declared page boundary (Case 05 Regression: 6 -> 7)`

---

## 5. Evaluation Integrity & Scope Note

- **Historical Record Integrity**: The original evaluation record (`evaluation/real-document-evaluation-01.md`) remains **unmodified** as an auditable historical record of V1 behavior (which recorded 6 fully verified cases, 3 cross-page limitation cases, and 1 wrong-page attribution case).
- **Re-Evaluation Requirement**: While unit and regression tests demonstrate that the cross-page verifier resolves the 3 identified cross-page cases, official updated verification metrics require executing a fresh live re-evaluation across full documents.
