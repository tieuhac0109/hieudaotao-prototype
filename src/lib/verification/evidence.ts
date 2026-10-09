import { DocumentPage, EvidenceItem, RawEvidenceItem } from '../ai/types';

/**
 * Normalizes text for conservative quotation verification.
 * Performs safe Unicode normalization (NFC), non-breaking space replacement,
 * whitespace collapsing, typographic quote, and dash standardization.
 */
export function normalizeTextForMatching(text: string): string {
  if (!text) return '';

  return text
    // Normalize Unicode to Canonical Composition (NFC)
    .normalize('NFC')
    // Normalize non-breaking and special Unicode whitespace
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Normalize curly/typographic double quotes and angle quotes
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB\u2033\u2036]/g, '"')
    // Normalize curly/typographic single quotes, backticks, acute accents
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035\u0060\u00B4']/g, "'")
    // Normalize various dashes/hyphens
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    // Collapse all whitespace (tabs, newlines, repeated spaces) to a single space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalizes punctuation for safe lexical sequence comparison.
 * Replaces punctuation marks with spaces and collapses whitespace,
 * preserving all substantive lexical words in exact order.
 */
export function normalizePunctuationTokens(text: string): string {
  return normalizeTextForMatching(text)
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'–—«»[\]\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifies whether an evidence quotation exists completely in the stated source page.
 * Strictly requires the full lexical content of the quote to be present in the source text.
 * Rejects partially fabricated quotes, fabricated prefixes, fabricated suffixes, or altered conditions.
 */
export function verifySingleQuote(
  quotedText: string,
  pageText: string
): { verified: boolean } {
  if (!quotedText || quotedText.trim().length < 3 || !pageText || !pageText.trim()) {
    return { verified: false };
  }

  const normQuote = normalizeTextForMatching(quotedText);
  const normPage = normalizeTextForMatching(pageText);

  // 1. Direct normalized full substring match
  if (normPage.includes(normQuote)) {
    return { verified: true };
  }

  // 2. Safe punctuation-equivalent full lexical match
  // Requires the entire sequence of words in the quote to appear verbatim in the page.
  const tokenQuote = normalizePunctuationTokens(normQuote);
  const tokenPage = normalizePunctuationTokens(normPage);

  if (tokenQuote.length >= 3) {
    // Check word-boundary enclosed sequence
    const paddedQuote = ` ${tokenQuote} `;
    const paddedPage = ` ${tokenPage} `;

    if (paddedPage.includes(paddedQuote) || tokenPage.includes(tokenQuote)) {
      return { verified: true };
    }
  }

  // Rejects any quote with added, deleted, altered, or fabricated words.
  return { verified: false };
}

/**
 * Verifies an array of raw evidence items against extracted document pages.
 * Maps over all items and attaches conservative verification status.
 */
export function verifyEvidenceList(
  evidenceList: RawEvidenceItem[],
  pages: DocumentPage[]
): EvidenceItem[] {
  if (!evidenceList || !Array.isArray(evidenceList)) {
    return [];
  }

  return evidenceList.map((item) => {
    // 1-based page indexing
    const targetPage = pages.find((p) => p.pageNumber === item.page);

    if (!targetPage) {
      return {
        page: item.page,
        section: item.section,
        quotedText: item.quotedText,
        rationale: item.rationale,
        verified: false,
      };
    }

    const { verified } = verifySingleQuote(item.quotedText, targetPage.text);

    return {
      page: item.page,
      section: item.section,
      quotedText: item.quotedText,
      rationale: item.rationale,
      verified,
    };
  });
}
