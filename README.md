# HieuDaoTao — Academic Policy Intelligence Prototype V1

> **Provider-Agnostic Policy Reasoning with Server-Side Evidence Verification**  
> Active Provider: **Vertex AI / Gemini** (Express Mode API Key · Live Validated Locally) · Future-Ready: **Anthropic Claude Adapter**

---

## 1. Overview

**HieuDaoTao** is an academic policy intelligence engine designed for higher education institutions. It analyzes dense academic regulations (quản lý đào tạo, quy chế tín chỉ, điều kiện tốt nghiệp, kỷ luật học tập) and provides structured, grounded answers with exact source citations verified against original document pages.

### Core Principles
1. **Conservative Evidence Verification**: Quoted passages must match the source page text completely under safe normalization. Any fabricated prefix, suffix, or altered condition results in `verified: false`.
2. **Provider-Agnostic Architecture**: Implements a clean provider interface (`AIProvider`). Vertex AI is active and live-validated; an Anthropic Claude adapter is implemented in code and ready for future activation.
3. **Transparent Honesty**: Accurately distinguishes implemented adapters, runtime environment configuration, and recorded validation milestones without claiming unverified continuous live probing.
4. **Zero Client-Side Secret Leakage**: All credentials and model configurations remain strictly server-side. Public requests cannot select arbitrary model IDs.

---

## 2. Technical Pipeline

```
[ Upload PDF ] (Text-based academic regulation, ≤ 4.5 MB)
            ↓
[ Text Extraction & Page Tracking ] (unpdf, 1-based page indices)
            ↓
[ User Question ] (Vietnamese or English administrative query)
            ↓
[ Grounded AI Reasoning ] (Conservative prompt with strict JSON schema)
            ↓
[ Structured Output Parsing ] (Answer + Answerability + Evidence Items)
            ↓
[ Server-Side Evidence Verification ] (Exact normalized & lexical sequence matching)
            ↓
[ Transparent Presentation & Human Review ] (Verified citation badges + Review notice)
```

---

## 3. Architecture & Provider Abstraction

The codebase is built around a decoupled AI provider abstraction located in `src/lib/ai/`:

```
src/
  lib/
    ai/
      types.ts           # AIProvider interface, DocumentContent, EvidenceItem, Results
      errors.ts          # Typed error classes (ConfigurationError, AIProviderError, ModelOutputParseError)
      provider.ts        # getAIProvider() factory & non-secret diagnostics
      system-prompt.ts   # Grounded institutional reasoning system prompt
      providers/
        vertex.ts        # Active: Vertex AI Express Mode adapter (@google/genai)
        anthropic.ts     # Future-ready: Anthropic Claude adapter (@anthropic-ai/sdk)
      index.ts           # Module entry point
    documents/
      pdf.ts             # PDF validation, text extraction, [PAGE X] formatting
    verification/
      evidence.ts        # Conservative quotation verification
    validation/
      input.ts           # Zod schemas for question, file, and structured outputs
  app/
    api/
      analyze/route.ts   # POST /api/analyze route handler (server-controlled model)
      health/route.ts    # GET /api/health honest diagnostics route
    page.tsx             # Interactive Prototype UI
    page.module.css      # CSS module matching HieuDaoTao branding
```

### Common `AIProvider` Interface

```typescript
export interface AIProvider {
  readonly id: string;
  readonly displayName: string;

  /**
   * Analyzes an academic regulation document and answers a user question.
   * Active model is determined strictly server-side from environment configuration.
   */
  analyzeDocument(input: AnalyzeDocumentInput): Promise<RawModelOutput & { provider: string; model: string }>;
}
```

The application UI and API routes contain **no provider-specific business logic**. Provider authentication, SDK client initialization, and generation parameters are completely isolated within provider adapters.

---

## 4. Current Active Provider: Vertex AI / Gemini

- **Implementation**: Adapter implemented in `src/lib/ai/providers/vertex.ts` via `@google/genai`.
- **Live Validation Milestone**: Real local end-to-end inference has been successfully executed and validated using `gemini-2.5-flash` against the bundled 3-page academic regulation PDF. The reasoning produced source-grounded citations on Page 3 (*Điều 18, Khoản 1*) that passed server-side quotation verification (see [`evaluation/live-validation.md`](./evaluation/live-validation.md)).
- **Authentication Mode**: Supports **Vertex AI Express Mode API-key authentication** (`VERTEX_API_KEY` or `GEMINI_API_KEY`).
- **Model Configuration**: Configurable server-side via `VERTEX_MODEL` (default: `gemini-2.5-flash`).
- **Future Architecture Note**: Standard Google Cloud project/service-account authentication can later be added inside `VertexProvider` if required by infrastructure.

---

## 5. Future Provider: Anthropic Claude Adapter

- **Status**: Adapter implemented in `src/lib/ai/providers/anthropic.ts` using `@anthropic-ai/sdk`. Currently **unconfigured and unvalidated** in live runtime.
- **Requirements when activated**: When `AI_PROVIDER=anthropic`, the application requires both:
  - `ANTHROPIC_API_KEY`: A valid Anthropic API key.
  - `ANTHROPIC_MODEL`: Must be set to an active model available to the configured Anthropic account.
- **Safety**: If either variable is missing when Anthropic is active, the server returns a clear `ConfigurationError` without faking Claude responses.

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
| `VERTEX_API_KEY` | Yes (for Vertex) | — | Vertex AI Express Mode API key (or Gemini API key). |
| `VERTEX_MODEL` | No | `gemini-2.5-flash` | Configurable Vertex/Gemini model identifier. |
| `ANTHROPIC_API_KEY`| Yes (if Anthropic active) | — | Anthropic API key for Claude integration. |
| `ANTHROPIC_MODEL` | Yes (if Anthropic active) | — | Must be set to an active model available to the configured Anthropic account. |

> **Security Reminder**: Never prefix secret keys with `NEXT_PUBLIC_`. All credentials and model selectors remain exclusively on the server side.

---

## 8. Conservative Evidence Verification

HieuDaoTao distinguishes strictly between **model-generated claims** and **server-side verified quotations**:

1. **Model Evidence Output**: The model identifies the source `page` (1-based), `section` (e.g. *Điều 18*), `quotedText`, and `rationale`.
2. **Two-Stage Server-Side Verification Pipeline**:
   - **Stage A (Declared-Page Verification)**: Verifies the quotation directly against the declared page using safe Unicode normalization (NFC), whitespace collapsing, typographic quote/dash standardization, and full lexical sequence matching.
   - **Stage B (Adjacent-Page Boundary Verification)**: If Stage A fails, verifies whether the quotation genuinely crosses the boundary between the declared page and its adjacent page (`page N + page N+1` or `page N-1 + page N`). Requires minimum contribution (≥3 lexical tokens on both pages) and exact contiguous sequence matching.
   - **Strict Rejection Rule**: If the model fabricates a prefix, suffix, alters substantive conditions, or attributes a quote entirely to the wrong page (even if adjacent), verification strictly fails (`verified: false`).
3. **Visual Transparency**:
   - Quotes that match the source text receive a green `✓ Verified against source` badge.
   - Quotes that cannot be verified automatically receive an amber `⚠ Could not verify quoted passage automatically` badge.

---

## 9. Security & Error Handling

- **Server-Side Secrets**: All API credentials and model configurations are resolved exclusively on the server.
- **No Client Model Override**: `POST /api/analyze` determines the model only from server environment variables. Public requests cannot override or specify model IDs.
- **Sanitized Error Responses & Logs**: Upstream provider failures return safe messages (`AI provider request failed. Please try again.`, `The configured AI provider is unavailable.`, `The model response could not be processed.`). Raw provider stack traces, headers, URLs with keys, and credentials are never leaked in responses or server logs.
- **Ephemeral Processing**: PDF buffers and extracted text are processed in memory and discarded upon request completion. No documents are stored.

---

## 10. Limitations

- **Prototype Stage**: This software is an experimental prototype for administrative workflow validation, not autonomous production software.
- **Text-Based PDFs Only**: Scanned documents without selectable text layers are rejected in V1.
- **Human Oversight Mandatory**: Outputs are AI-assisted interpretations to accelerate administrative review. All decisions must be verified by accountable staff against official institutional documents.

---

## 11. Deployment Readiness

The prototype is ready for initial Vercel deployment once the owner manually configures these environment variables in the Vercel Project Dashboard:

```env
AI_PROVIDER=vertex
VERTEX_API_KEY=<configured_manually_in_vercel>
VERTEX_MODEL=gemini-2.5-flash
```

### Platform Compatibility & Constraints
- **Runtime**: Next.js 16 App Router runs natively on Vercel Serverless Functions (Node.js).
- **PDF Extraction**: `unpdf` runs purely in-memory in the serverless environment with zero native binary or filesystem dependencies.
- **Payload Limits**: Vercel Serverless Functions impose a standard request body payload limit of **4.5 MB**. The application file size validation is aligned to **4.5 MB**.
- **Static Assets**: Bundled sample regulations in `public/sample-docs/` are served statically by Vercel CDN.
- **Security Rule**: Never commit `.env.local` or `.env.production` files containing real API keys to GitHub.

---

## 12. Testing & Validation

```bash
npm test          # Run Vitest unit, secret-safety, and adversarial verification tests
npm run typecheck # TypeScript type checking
npm run lint      # ESLint static analysis
npm run build     # Next.js production build validation
```

### Real-Document Evaluation & Verifier Enhancement

- **Initial Evaluation (V1)**: A 10-question manual evaluation against an 18-page public Vietnamese university academic regulation judged all 10 answers substantively correct; 6/10 had fully verified evidence, 3 cases exposed cross-page verification limitations, and 1 case exposed wrong-page model attribution that was correctly rejected by the verifier (see [`evaluation/real-document-evaluation-01.md`](./evaluation/real-document-evaluation-01.md)).
- **Verifier Enhancement**: The verifier now supports conservative adjacent-page boundary verification (Stage B) requiring meaningful contribution (≥3 tokens) from both pages, resolving cross-page false negatives while strictly preserving wrong-page rejection (see [`evaluation/verifier-improvement-01.md`](./evaluation/verifier-improvement-01.md)).
- **Evaluation Integrity**: The historical V1 evaluation record remains unchanged; official post-fix verification metrics will be reported upon completing a formal re-evaluation pass.
