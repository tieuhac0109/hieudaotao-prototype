# HieuDaoTao — Application Evidence Pack

> **Purpose**: Consolidated evidence pack for future startup-program applications and external due diligence.  
> **Project**: HieuDaoTao  
> **Positioning**: Early-stage EdTech project focused on academic policy intelligence for higher education.  
> **Status**: Working public prototype deployed and manually evaluated.  
> **Important Provider Note**: The current live prototype uses Vertex AI / Gemini 2.5 Flash. Claude is not currently the active live provider and must not be described as such.

---

## 1. Public Footprint

### Main Website

- **URL**: https://www.hieudaotao.io.vn/
- **Public positioning**: Academic Policy Intelligence for Higher Education.
- **Current website state**:
  - presents HieuDaoTao as an early-stage project;
  - links to the live prototype;
  - explains source-grounded policy analysis and human review;
  - describes a provider-agnostic AI architecture;
  - positions Claude as a future reasoning provider to evaluate, not as the current active backend.

### Live Prototype

- **URL**: https://prototype.hieudaotao.io.vn/
- **Repository**: https://github.com/tieuhac0109/hieudaotao-prototype
- **Deployment**: Vercel production deployment with custom HieuDaoTao subdomain.

### Founder LinkedIn

- **Canonical profile**: https://www.linkedin.com/in/hieudangvan/

### Contact Identity

- **Founder/application email**: `hieu@hieudaotao.io.vn`
- **Public website contact**: `hello@hieudaotao.io.vn`

---

## 2. Working Prototype Evidence

The deployed prototype implements an end-to-end academic-regulation analysis workflow:

`Academic Regulation PDF → Text extraction with page tracking → AI-assisted policy reasoning → Source-grounded answer → Server-side quotation verification → Human review`

Current capabilities demonstrated in the live system:

- upload a text-based academic regulation PDF;
- extract text while preserving page boundaries;
- ask natural-language policy questions in Vietnamese or English;
- generate an answer grounded in the uploaded document;
- return supporting evidence with page and section metadata;
- independently verify generated quotations against extracted source text;
- reject or flag evidence that cannot be verified;
- keep final interpretation explicitly subject to human review.

Current prototype limitations are intentionally disclosed:

- text-based PDFs only;
- scanned PDFs requiring OCR are not yet supported;
- upload size is constrained by deployment limits;
- AI-generated interpretation is not an official institutional decision;
- confidential or sensitive documents should not be uploaded during the prototype phase.

---

## 3. Provider Architecture and Current Runtime

The application uses a provider-agnostic AI service layer.

Current live runtime:

- **Provider**: Vertex AI
- **Model**: `gemini-2.5-flash`
- **Authentication pattern**: Vertex AI Express Mode API-key integration

Provider architecture:

- `VertexProvider`: implemented and live validated;
- `AnthropicProvider`: implemented as an adapter, but not currently configured or live validated;
- provider selection remains server-side;
- the user interface is provider-neutral.

### Claude Positioning

HieuDaoTao is particularly interested in Claude for policy-intensive higher-education workflows involving:

- long-document reasoning;
- grounded structured outputs;
- tool-enabled workflows;
- evaluation and reliability;
- human-in-the-loop administrative review.

Current truthful positioning:

> HieuDaoTao has a working provider-agnostic prototype and is seeking to evaluate Claude as a primary reasoning layer for academic policy intelligence workflows.

Do **not** claim:

- `Claude powers HieuDaoTao`;
- `Built on Claude`;
- `Claude-powered prototype`;
- live Anthropic API usage;
- completed Claude evaluation.

---

## 4. First Live Validation Milestone

Historical record:

- [`live-validation.md`](./live-validation.md)

This records the first successful real AI inference through the prototype using Vertex AI / Gemini 2.5 Flash.

Observed milestone:

- text-based PDF parsed successfully;
- question answered using the uploaded document;
- answerability marked as supported;
- source evidence returned;
- evidence independently checked against the source;
- human verification notice displayed;
- no mock or simulated AI output used.

This milestone established that the prototype was operational end-to-end before broader evaluation.

---

## 5. Real-Document Evaluation Evidence

Historical evaluation record:

- [`real-document-evaluation-01.md`](./real-document-evaluation-01.md)

Evaluation source:

- public Vietnamese university academic regulation;
- institution: Trường Đại học Kinh tế - Đại học Đà Nẵng;
- Decision No. 1284/QĐ-ĐHKT;
- dated 20/09/2021;
- 18 pages;
- text-based PDF.

Evaluation scope:

- 10 manually reviewed policy questions;
- questions covered graduation, academic warnings, forced dismissal, study-load limits, course withdrawal, thesis eligibility, grade improvement, credit recognition limits, second-program registration, and graduation classification rules.

Recorded results:

- **Questions tested**: 10
- **Substantively correct answers**: 10
- **Partial answers**: 0
- **Incorrect answers**: 0
- **Questions with all evidence automatically verified**: 6
- **Questions with verification warnings**: 4
- **Observed cross-page verification limitations**: 3 cases
- **Observed wrong-page model attribution**: 1 case
- **Fabricated substantive answers observed**: 0

Important interpretation:

> This is an initial case-based evaluation on one institutional document. It is not a statistically representative benchmark, accuracy certification, or generalized performance claim.

Public-safe summary:

> In an initial 10-question manual evaluation against one public Vietnamese university regulation, all 10 answers were judged substantively correct. Six questions had fully server-verified evidence; three exposed cross-page verification limitations, and one contained a correct quotation attributed to the wrong page, which the verifier appropriately rejected.

---

## 6. Observed Failure Modes and Engineering Response

The evaluation intentionally records failure modes rather than hiding them.

### Failure Mode A — Cross-Page Quotation Verification

Observed in three historical cases where a correct regulation clause crossed a PDF page boundary.

V1 behavior:

- verifier required the full quotation to exist within the model-declared page;
- genuine multi-page quotations could receive an unverified warning;
- this was classified as a conservative false negative, not a hallucination.

### Failure Mode B — Wrong-Page Model Attribution

Observed when the model:

- selected the correct text;
- identified the correct article and clause;
- attributed the quotation to the wrong adjacent page.

V1 verifier behavior:

- rejected the evidence;
- did not silently repair the page number;
- prevented incorrect page metadata from receiving a verified badge.

This was treated as a useful safety property.

---

## 7. Verifier Improvement Evidence

Engineering record:

- [`verifier-improvement-01.md`](./verifier-improvement-01.md)

The verifier was upgraded from single-page-only matching to a conservative two-stage pipeline:

1. strict declared-page verification;
2. adjacent-page boundary verification only if the first stage fails.

Cross-page verification requires:

- adjacent pages only;
- an actual match that crosses the page boundary;
- meaningful lexical contribution from both pages;
- full deterministic token-sequence matching;
- no fuzzy similarity;
- no whole-document fallback;
- no automatic correction of the model's page metadata.

Regression protection explicitly preserves the wrong-page rejection behavior identified in the original evaluation.

---

## 8. Post-Fix Live Verification

Post-fix verification record:

- [`post-fix-verification-01.md`](./post-fix-verification-01.md)

Four targeted cases were rerun on the live deployed prototype after the verifier improvement.

Observed behavior:

- **Case 01**: model split evidence into separate Page 13 / Page 14 items; all displayed evidence verified;
- **Case 03**: some newly generated wrong-page evidence remained unverified while correctly attributed evidence verified;
- **Case 05**: model split evidence into separate Page 6 / Page 7 items; all displayed evidence verified;
- **Case 08**: correct quotation again attributed to the wrong page and correctly remained unverified.

Interpretation:

- page-attribution safety remained active after the cross-page enhancement;
- live model evidence segmentation varied between runs;
- therefore historical V1 metrics were intentionally not rewritten;
- deterministic regression tests remain the primary evidence for the cross-page algorithm itself.

---

## 9. Engineering Practices Demonstrated

The repository history provides evidence of iterative engineering rather than a single demo build.

Examples include:

- provider abstraction instead of hard-coded provider logic;
- strict server-side model selection;
- secret-safe configuration handling;
- sanitized public errors and server logs;
- conservative evidence verification;
- explicit wrong-page rejection;
- deterministic regression tests;
- evaluation records preserved historically rather than overwritten after fixes;
- live deployment validation;
- public disclosure of prototype limitations;
- human-in-the-loop product design.

This sequence is important:

`Build → Deploy → Evaluate → Identify failure modes → Improve verifier → Re-test safety`

---

## 10. Claims That Are Supported Today

The following claims are supported by current evidence:

- HieuDaoTao has a deployed working prototype for academic policy intelligence.
- The prototype analyzes text-based Vietnamese academic regulations.
- It generates source-grounded answers and supporting evidence.
- Supporting quotations are independently checked server-side against extracted source text.
- The prototype has been manually evaluated against a real public university regulation.
- The first 10-question evaluation recorded 10 substantively correct answers in that case-based set.
- The evaluation identified both cross-page verification limitations and wrong-page citation errors.
- The evidence verifier was subsequently improved with deterministic adjacent-page boundary verification.
- Wrong-page-only evidence continues to be rejected after the verifier enhancement.
- Human review remains required for operational or administrative use.
- The architecture is provider-agnostic.
- Vertex AI / Gemini 2.5 Flash is the current live-validated reasoning backend.

---

## 11. Claims That Must Not Be Made

Do not claim any of the following unless future evidence supports them:

- production-ready institutional software;
- university deployment or institutional adoption;
- university customers;
- university partnerships or endorsements;
- paying users;
- commercial traction;
- statistically validated accuracy;
- 100% accuracy;
- guaranteed legal or administrative correctness;
- autonomous academic decision-making;
- Claude-powered operation;
- active Anthropic API usage;
- completed Claude evaluation;
- company incorporation if no legal entity has been formed.

---

## 12. Application-Ready Project Narrative

A concise factual narrative suitable for adapting into startup-program applications:

> HieuDaoTao is an early-stage EdTech project building academic policy intelligence workflows for higher education. We have deployed a working prototype that analyzes text-based Vietnamese academic regulations, generates source-grounded answers, and independently verifies supporting quotations against the source document before human review. We evaluated the system against a public university regulation using 10 manually reviewed policy questions, documented both successful grounding and citation failure modes, and improved the verifier after identifying cross-page evidence limitations. The architecture is provider-agnostic; the current live prototype uses Vertex AI, and we are particularly interested in evaluating Claude as the primary reasoning layer for long-document, policy-intensive higher-education workflows.

This wording is intentionally transparent that Claude is a target provider rather than the current live provider.

---

## 13. Suggested Anthropic Application Framing

The strongest current framing is not "we already use Claude," but:

> We have already built and deployed the workflow we want to evaluate with Claude.

Supporting reasoning:

- the product problem is concrete and narrow;
- the prototype is public and operational;
- a real document has been evaluated;
- failure modes have been documented;
- verifier safety behavior has been improved and regression-tested;
- the provider layer is already abstracted;
- Anthropic support would help HieuDaoTao evaluate Claude specifically for this validated workflow rather than fund an untested concept.

A suitable application statement is:

> We have built and deployed a provider-agnostic prototype for academic policy intelligence in higher education. The current implementation uses Vertex AI to analyze Vietnamese academic regulations, generate source-grounded answers, and verify quoted evidence before human review. We are applying to evaluate Claude as the primary reasoning layer for these long-document, policy-intensive workflows and to compare its grounding, structured reasoning, and reliability against our existing baseline.

---

## 14. Evidence Index

| Evidence | Location | What It Demonstrates |
| :--- | :--- | :--- |
| Main website | https://www.hieudaotao.io.vn/ | Public positioning and product narrative |
| Live prototype | https://prototype.hieudaotao.io.vn/ | Public working deployment |
| Prototype repository | https://github.com/tieuhac0109/hieudaotao-prototype | Technical implementation and commit history |
| Founder LinkedIn | https://www.linkedin.com/in/hieudangvan/ | Canonical founder public profile |
| First live validation | [`live-validation.md`](./live-validation.md) | Initial real end-to-end AI inference |
| Real-document evaluation | [`real-document-evaluation-01.md`](./real-document-evaluation-01.md) | 10-question manual evaluation and historical failure modes |
| Verifier improvement | [`verifier-improvement-01.md`](./verifier-improvement-01.md) | Engineering response to evaluation findings |
| Post-fix live verification | [`post-fix-verification-01.md`](./post-fix-verification-01.md) | Live safety re-check after verifier enhancement |

---

## 15. Re-Application Readiness Checklist

Before submitting a new startup-program application, verify that:

- [ ] the main website is live;
- [ ] the live prototype is reachable;
- [ ] the prototype still completes a production smoke test;
- [ ] public wording does not imply active Claude usage;
- [ ] founder LinkedIn points to `https://www.linkedin.com/in/hieudangvan/`;
- [ ] application email uses `hieu@hieudaotao.io.vn`;
- [ ] evaluation links are public and readable;
- [ ] no unsupported customer, partnership, traction, or incorporation claims are introduced;
- [ ] application responses are consistent with the facts recorded in this evidence pack.

---

## 16. Current Bottom Line

HieuDaoTao is no longer only a concept or marketing demo.

It currently has:

- a public product website;
- a public live prototype;
- a custom domain and domain email identity;
- a founder public profile;
- a provider-agnostic implementation;
- a live AI backend;
- a real-document manual evaluation;
- documented failure modes;
- an engineering improvement derived from evaluation results;
- post-fix production safety verification.

The remaining Anthropic-specific gap is explicit and intentional: **Claude has not yet been run as the live provider.** Any re-application should state that directly and frame Anthropic support as the path to evaluating Claude on an already-working, already-evaluated workflow.
