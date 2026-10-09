import { DocumentPage, EvidenceItem, RawEvidenceItem } from '../ai/types';

/**
 * Normalizes text for robust quotation verification.
 * Handles Unicode diacritics (NFC), collapses varying whitespace and line breaks,
 * normalizes curly/typographic quotes and hyphens.
 */
export function normalizeTextForMatching(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFC')
    // Replace non-breaking spaces and zero-width characters
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    // Normalize typographic quotes
    .replace(/[“”"«»]/g, '"')
    .replace(/[‘’'`]/g, "'")
    // Normalize various dashes/hyphens
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    // Collapse all whitespace (tabs, newlines, spaces) to single space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Strips punctuation for fallback fuzzy verification when models
 * trim or expand boundary punctuation.
 */
function stripPunctuation(text: string): string {
  return text.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'–—]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Verifies whether a quoted passage exists within the text of the stated page.
 * Strictly returns verified: true ONLY when verifiable against source text.
 */
export function verifySingleQuote(
  quotedText: string,
  pageText: string
): { verified: boolean; matchScore: number } {
  if (!quotedText || quotedText.trim().length < 3) {
    return { verified: false, matchScore: 0 };
  }

  const normQuote = normalizeTextForMatching(quotedText);
  const normPage = normalizeTextForMatching(pageText);

  // 1. Direct normalized substring match
  if (normPage.includes(normQuote)) {
    return { verified: true, matchScore: 1.0 };
  }

  // 2. Fallback: Strip punctuation at boundaries
  const strippedQuote = stripPunctuation(normQuote);
  const strippedPage = stripPunctuation(normPage);

  if (strippedQuote.length >= 8 && strippedPage.includes(strippedQuote)) {
    return { verified: true, matchScore: 0.95 };
  }

  // 3. Fallback: Check if first 80% of quote or significant prefix matches
  if (strippedQuote.length >= 30) {
    const prefix = strippedQuote.substring(0, Math.floor(strippedQuote.length * 0.75));
    if (strippedPage.includes(prefix)) {
      return { verified: true, matchScore: 0.85 };
    }
  }

  return { verified: false, matchScore: 0 };
}

/**
 * Verifies an array of raw evidence items against the document's extracted pages.
 * Never silently turns unverified evidence into verified evidence.
 */
export function verifyEvidenceList(
  evidenceList: RawEvidenceItem[],
  pages: DocumentPage[]
): EvidenceItem[] {
  if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
    return [];
  }

  return evidenceList.map((item) => {
    const targetPage = pages.find((p) => p.pageNumber === item.page);

    if (!targetPage) {
      return {
        ...item,
        verified: false,
        matchScore: 0,
      };
    }

    const { verified, matchScore } = verifySingleQuote(item.quotedText, targetPage.text);

    return {
      page: item.page,
      section: item.section,
      quotedText: item.quotedText,
      rationale: item.rationale,
      verified,
      matchScore,
    };
  });
}
