# HieuDaoTao Policy Intelligence Prototype (V1)

> **Academic Policy Intelligence for Higher Education**  
> *Provider-agnostic architecture: Vertex AI (Gemini) active, Anthropic Claude architecturally supported.*

---

## 1. Overview

**HieuDaoTao Prototype V1** is a vertical slice web application designed to demonstrate source-grounded reasoning on Vietnamese higher-education academic regulations and institutional policy documents.

Unlike generic chatbots that summarize without accountability, HieuDaoTao enforces a strict grounding pipeline: every substantive assertion in the synthesized answer is paired with an exact quoted passage from the source document and verified server-side against the original page text.

---

## 2. Current Workflow

```
[ Academic Regulation PDF ]
            ↓ (Upload & Validation: MIME, size, magic bytes)
[ Text Extraction & Page Indexing ] (Preserves [PAGE 1], [PAGE 2], ...)
            ↓
[ User Question ] (Vietnamese or English administrative query)
            ↓
[ Grounded AI Reasoning ] (Conservative prompt with strict schema constraints)
            ↓
[ Structured Output Parsing ] (Answer + Answerability State + Evidence Items)
            ↓
[ Server-Side Quotation Verification ] (Verbatim & normalized page matching)
            ↓
[ Transparent Presentation & Human Review ] (Verified citations + Human verification notice)
```

---

## 3. Architecture & Provider Abstraction

The codebase is built around a decoupled AI provider abstraction located in `src/lib/ai/`:

```
src/
  lib/
    ai/
      types.ts           # AIProvider interface, DocumentContent, EvidenceItem, Results
      provider.ts        # getAIProvider() factory & configuration diagnostics
      system-prompt.ts   # Grounded institutional reasoning system instructions
      providers/
        vertex.ts        # Active: Vertex AI / Google Gen AI adapter (@google/genai)
        anthropic.ts     # Future ready: Anthropic Claude adapter (@anthropic-ai/sdk)
      index.ts           # Module entry point
    documents/
      pdf.ts             # PDF validation, text extraction, [PAGE X] formatting
    verification/
      evidence.ts        # Verbatim & normalized quotation verification
    validation/
      input.ts           # Zod schemas for question, file, and structured outputs
  app/
    api/
      analyze/route.ts   # POST /api/analyze route handler
      health/route.ts    # GET /api/health diagnostics route
    page.tsx             # Interactive Prototype UI
    page.module.css      # CSS module matching HieuDaoTao branding
```

### Common `AIProvider` Interface

```typescript
export interface AIProvider {
  readonly id: string;
  readonly displayName: string;
  readonly defaultModel: string;

  analyzeDocument(input: AnalyzeDocumentInput): Promise<RawModelOutput & { provider: string; model: string }>;
}
```

The application UI and API routes contain **no provider-specific business logic**. Provider-specific authentication, SDK client initialization, and generation parameters are completely isolated within provider adapters.

---

## 4. Current Active Provider: Vertex AI / Gemini

- **Active Provider**: `Vertex AI` (via Google Gen AI official SDK: `@google/genai`).
- **Default Model**: `gemini-2.5-flash` (configurable via `VERTEX_MODEL`).
- **Authentication**: Supports Vertex AI Express Mode API-key authentication (`VERTEX_API_KEY` or `GEMINI_API_KEY`) as well as standard Google Cloud project/location configurations.
- **Output Format**: Enforced JSON schema generation via `responseMimeType: "application/json"`.

---

## 5. Future Provider: Anthropic Claude Adapter

An `AnthropicProvider` adapter is fully implemented using `@anthropic-ai/sdk` and ready in `src/lib/ai/providers/anthropic.ts`.

- When `AI_PROVIDER=anthropic`, the application routes requests to `AnthropicProvider`.
- If `ANTHROPIC_API_KEY` is not configured, the adapter safely returns a clean configuration error rather than faking API responses or mocking Claude output.
- Switching to Anthropic in the future requires setting `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=<key>` in the environment without modifying application code.

---

## 6. Local Setup

### Prerequisites

- Node.js 18.18+ or 20+ (Node 24 tested)
- npm 10+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tieuhac0109/hieudaotao-prototype.git
   cd hieudaotao-prototype
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local environment configuration:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your Vertex API Key in `.env.local`:
   ```env
   AI_PROVIDER=vertex
   VERTEX_API_KEY=your_actual_vertex_api_key_here
   VERTEX_MODEL=gemini-2.5-flash
   ```

5. Run development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `AI_PROVIDER` | No | `vertex` | Active AI provider (`vertex` or `anthropic`). |
| `VERTEX_API_KEY` | Yes (for Vertex) | — | Vertex AI Express Mode API key or Gemini API key. |
| `VERTEX_MODEL` | No | `gemini-2.5-flash` | Configurable Vertex/Gemini model identifier. |
| `VERTEX_PROJECT_ID`| No | — | Optional Google Cloud project ID if using standard GCP auth. |
| `VERTEX_LOCATION` | No | `us-central1` | Optional Google Cloud region if using standard GCP auth. |
| `ANTHROPIC_API_KEY`| Yes (if Anthropic active) | — | Anthropic API key for Claude integration. |
| `ANTHROPIC_MODEL` | No | `claude-3-7-sonnet-20250219` | Configurable Anthropic model identifier. |

> **Security Reminder**: Never prefix secret keys with `NEXT_PUBLIC_`. All secret variables remain exclusively on the server side.

---

## 8. PDF Processing Strategy

1. **Text-Based PDF Ingestion**: Prototype V1 accepts text-based PDFs (up to **10 MB**).
2. **Page-by-Page Extraction**: Extracted text preserves page numbers (`1`, `2`, `...`, `N`) using `unpdf`.
3. **Structured Context Injection**: Documents are fed into the model with explicit `[PAGE X]` boundaries.
4. **No OCR in V1**: Scanned PDFs consisting entirely of bitmap images without embedded text layers will be rejected with a clear message: `"The uploaded PDF appears to be a scanned image or contains no extractable text. Prototype V1 requires text-based PDFs."`

---

## 9. Source Evidence Verification

HieuDaoTao distinguishes strictly between **model-generated evidence** and **server-side verified quotations**:

1. **Model Evidence Generation**: The LLM identifies the stated `page`, `section` (e.g. *Điều 18*), `quotedText`, and `rationale`.
2. **Server-Side Verification**: Before returning results to the client, the server normalizes whitespace, typographic quotes, and Unicode diacritics, and executes a substring verification against the extracted text of the stated page.
3. **Visual Transparency**:
   - Quotes that match the source text receive a green `✓ Verified against source` badge.
   - Quotes that cannot be verified automatically receive an amber `⚠ Could not verify quoted passage automatically` badge.
   - The verification status is never falsified or silently converted.

---

## 10. Security & Privacy

- **Server-Side Secrets**: All API credentials are read strictly on the server in route handlers.
- **Zero Client Leakage**: No API keys or authorization headers are exposed in client bundles or responses.
- **Ephemeral Processing**: Uploaded PDF buffers and extracted text are processed in memory and discarded upon request completion. No documents are persisted to disk or databases.
- **Safe Audit Logging**: Operational logs record request IDs, timestamps, provider IDs, models, page counts, and execution latency, but **never** record secret keys, authorization headers, or document contents.

---

## 11. Limitations

- **Prototype Stage**: This software is an experimental prototype for workflow validation, not production software.
- **Text-Based PDFs Only**: Scanned documents requiring Optical Character Recognition (OCR) are not supported in V1.
- **Human Oversight Mandatory**: Outputs are AI-assisted interpretations to accelerate administrative review. All decisions must be verified by accountable staff against official institutional documents.
- **No Authority**: The prototype holds no legal or administrative authority and does not make autonomous admission or graduation decisions.

---

## 12. Evaluation Protocol

See [`evaluation/README.md`](./evaluation/README.md) for detailed evaluation dimensions, test case schema, and sample administrative scenarios on Vietnamese academic regulations.

---

## 13. Vercel Deployment

1. Push your code to GitHub: `tieuhac0109/hieudaotao-prototype`.
2. Import the project into Vercel.
3. In Project Settings → Environment Variables, add:
   - `AI_PROVIDER=vertex`
   - `VERTEX_API_KEY=<your_api_key>`
   - `VERTEX_MODEL=gemini-2.5-flash`
4. Deploy. The Node.js App Router serverless handler runs natively on Vercel.
