/**
 * Types for the HieuDaoTao AI Provider Abstraction.
 * Provider-agnostic interface enabling seamless switching between Vertex AI (Gemini)
 * and future Anthropic Claude models without application layer modifications.
 */

export type AIProviderId = 'vertex' | 'anthropic';

export type AnswerabilityState = 'supported' | 'partial' | 'not_supported';

export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export interface DocumentContent {
  filename: string;
  mimeType: string;
  pageCount: number;
  pages: DocumentPage[];
  fullText: string;
  buffer?: Buffer;
}

export interface AnalyzeDocumentInput {
  question: string;
  document: DocumentContent;
  model?: string;
}

export interface RawEvidenceItem {
  page: number;
  section?: string;
  quotedText: string;
  rationale?: string;
}

export interface EvidenceItem extends RawEvidenceItem {
  verified: boolean;
  matchScore?: number;
}

export interface RawModelOutput {
  answer: string;
  answerability: AnswerabilityState;
  evidence: RawEvidenceItem[];
  warnings?: string[];
}

export interface AnalyzeDocumentResult {
  provider: string;
  model: string;
  answer: string;
  answerability: AnswerabilityState;
  evidence: EvidenceItem[];
  warnings?: string[];
  metadata?: {
    pageCount: number;
    processingTimeMs: number;
    model: string;
    provider: string;
  };
}

export interface AIProvider {
  readonly id: string;
  readonly displayName: string;
  readonly defaultModel: string;

  /**
   * Analyzes an academic regulation document and answers a user question.
   * Returns structured output with grounded evidence and answerability state.
   */
  analyzeDocument(input: AnalyzeDocumentInput): Promise<RawModelOutput & { provider: string; model: string }>;
}
