# HieuDaoTao Prototype V1 — Live Validation Milestone Record

> **Milestone Type**: Development & Grounding Validation Record  
> **Status**: Successfully Executed Locally (Human-Verified)  
> **Auditable Scope**: Prototype workflow validation against sample institutional regulation PDF.

---

## 1. Execution Summary

| Parameter | Recorded Value |
| :--- | :--- |
| **Validation Date** | 2026-10-09 |
| **Environment** | Local Development Environment (`localhost:3000`) |
| **Active Provider** | `Vertex AI` (`@google/genai` SDK) |
| **Authentication Mode** | Vertex AI Express Mode API Key (Configured locally in `.env.local`) |
| **Active Model** | `gemini-2.5-flash` |
| **Document Type** | Text-based Academic Regulation PDF (*Quy chế đào tạo mẫu trình độ đại học*) |
| **Page Count** | 3 Pages |
| **Question Category** | Vietnamese graduation eligibility (*Điều kiện xét và công nhận tốt nghiệp*) |
| **Processing Latency** | ~3.47 seconds (end-to-end extraction, model reasoning, server-side verification) |

---

## 2. Model & Verification Results

```json
{
  "provider": "vertex",
  "model": "gemini-2.5-flash",
  "answerability": "supported",
  "evidenceCount": 1,
  "verifiedEvidenceCount": 1,
  "evidence": [
    {
      "page": 3,
      "section": "Điều 18, Khoản 1",
      "quotedText": "Sinh viên được công nhận tốt nghiệp khi điểm trung bình chung tích lũy toàn khóa đạt từ 2.00 trở lên theo thang điểm 4 và đạt chuẩn đầu ra ngoại ngữ theo quy định của Trường.",
      "rationale": "Quy định đầy đủ các điều kiện cần thiết để sinh viên được xét công nhận tốt nghiệp đại học.",
      "verified": true
    }
  ]
}
```

---

## 3. Human Observation & Quality Audit

- **Answer Completeness**: The generated answer accurately articulated all graduation requirements specified in Article 18 of the uploaded regulation without hallucinating omitted conditions.
- **Evidence Precision**: The citation pinpointed the exact page (Page 3) and clause (*Điều 18, Khoản 1*).
- **Server-Side Verification**: The verbatim quotation successfully matched the normalized page text and received the green `✓ Verified against source` status.
- **Privacy & Security**: No secret keys, billing metadata, authorization tokens, or internal credentials were leaked to the client bundle or server logs.

---

## 4. Provider Milestone Classification

- **Vertex AI**: Adapter implemented and **live validated** via local end-to-end inference.
- **Anthropic Claude**: Adapter implemented in code; remains **unconfigured and unvalidated** in live runtime.
