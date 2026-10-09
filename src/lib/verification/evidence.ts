import { DocumentPage, EvidenceItem, RawEvidenceItem, VerificationMode } from '../ai/types';

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

export interface VerificationResult {
  verified: boolean;
  verificationMode?: VerificationMode;
}

/**
 * Stage A — Verifies whether an evidence quotation exists completely in the stated source page.
 * Strictly requires the full lexical content of the quote to be present on the declared page.
 * Rejects partially fabricated quotes, fabricated prefixes, fabricated suffixes, or altered conditions.
 */
export function verifySingleQuote(
  quotedText: string,
  pageText: string
): VerificationResult {
  if (!quotedText || quotedText.trim().length < 3 || !pageText || !pageText.trim()) {
    return { verified: false, verificationMode: 'unverified' };
  }

  const normQuote = normalizeTextForMatching(quotedText);
  const normPage = normalizeTextForMatching(pageText);

  // 1. Direct normalized full substring match
  if (normPage.includes(normQuote)) {
    return { verified: true, verificationMode: 'single_page' };
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
      return { verified: true, verificationMode: 'single_page' };
    }
  }

  // Rejects any quote with added, deleted, altered, or fabricated words.
  return { verified: false, verificationMode: 'unverified' };
}

/**
 * Stage B — Verifies whether an evidence quotation genuinely crosses the boundary between
 * two consecutive document pages.
 *
 * Conservative safety rules:
 * 1. Pages must be strictly consecutive (pageSecond.pageNumber === pageFirst.pageNumber + 1).
 * 2. Declared page must be either pageFirst (forward) or pageSecond (backward).
 * 3. Match must genuinely span the page boundary.
 * 4. Requires at least 3 lexical tokens contributed from pageFirst.
 * 5. Requires at least 3 lexical tokens contributed from pageSecond.
 * 6. Entire token sequence must match verbatim with 0 alterations/fabrications.
 * 7. Quotes existing entirely on one page are strictly rejected here.
 */
export function verifyCrossPageSequence(
  quotedText: string,
  pageFirst: DocumentPage,
  pageSecond: DocumentPage,
  declaredPage: number
): VerificationResult {
  if (!quotedText || !pageFirst?.text || !pageSecond?.text) {
    return { verified: false, verificationMode: 'unverified' };
  }

  // Enforce strictly consecutive pages
  if (pageSecond.pageNumber !== pageFirst.pageNumber + 1) {
    return { verified: false, verificationMode: 'unverified' };
  }

  // Determine direction relative to the model-declared page
  let mode: VerificationMode;
  if (declaredPage === pageFirst.pageNumber) {
    mode = 'cross_page_forward';
  } else if (declaredPage === pageSecond.pageNumber) {
    mode = 'cross_page_backward';
  } else {
    // Neither page is the declared page: strictly rejected
    return { verified: false, verificationMode: 'unverified' };
  }

  const quoteTokens = normalizePunctuationTokens(quotedText).split(' ').filter(Boolean);
  // Minimum contribution rule: at least 3 tokens from pageFirst + at least 3 tokens from pageSecond = 6 min tokens
  if (quoteTokens.length < 6) {
    return { verified: false, verificationMode: 'unverified' };
  }

  const tokensFirst = normalizePunctuationTokens(pageFirst.text).split(' ').filter(Boolean);
  const tokensSecond = normalizePunctuationTokens(pageSecond.text).split(' ').filter(Boolean);

  if (tokensFirst.length === 0 || tokensSecond.length === 0) {
    return { verified: false, verificationMode: 'unverified' };
  }

  const joinedTokens = [...tokensFirst, ...tokensSecond];
  const boundary = tokensFirst.length;

  const quoteLen = quoteTokens.length;
  const maxStart = joinedTokens.length - quoteLen;

  for (let i = 0; i <= maxStart; i++) {
    let match = true;
    for (let k = 0; k < quoteLen; k++) {
      if (joinedTokens[i + k] !== quoteTokens[k]) {
        match = false;
        break;
      }
    }

    if (match) {
      const matchStart = i;
      const matchEnd = i + quoteLen;
      const tokensFromFirst = Math.max(0, Math.min(matchEnd, boundary) - matchStart);
      const tokensFromSecond = Math.max(0, matchEnd - Math.max(matchStart, boundary));

      // Strictly verify that the match crosses the boundary with meaningful contribution on both sides
      if (tokensFromFirst >= 3 && tokensFromSecond >= 3) {
        return { verified: true, verificationMode: mode };
      }
    }
  }

  return { verified: false, verificationMode: 'unverified' };
}

/**
 * Verifies an array of raw evidence items against extracted document pages.
 * Executes two-stage verification:
 * Stage A: Strict declared-page verification
 * Stage B: Conservative adjacent-page boundary verification (if Stage A fails)
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
    const declaredPageNumber = item.page;
    const targetPage = pages.find((p) => p.pageNumber === declaredPageNumber);

    if (!targetPage) {
      return {
        page: item.page,
        section: item.section,
        quotedText: item.quotedText,
        rationale: item.rationale,
        verified: false,
        verificationMode: 'unverified',
      };
    }

    // Stage A: Strict declared-page verification
    const stageA = verifySingleQuote(item.quotedText, targetPage.text);
    if (stageA.verified) {
      return {
        page: item.page,
        section: item.section,
        quotedText: item.quotedText,
        rationale: item.rationale,
        verified: true,
        verificationMode: stageA.verificationMode || 'single_page',
      };
    }

    // Stage B: Conservative adjacent-page boundary verification
    // 1. Forward cross-page check (Declared Page N + Page N+1)
    const nextPage = pages.find((p) => p.pageNumber === declaredPageNumber + 1);
    if (nextPage) {
      const forwardCheck = verifyCrossPageSequence(
        item.quotedText,
        targetPage,
        nextPage,
        declaredPageNumber
      );
      if (forwardCheck.verified) {
        return {
          page: item.page,
          section: item.section,
          quotedText: item.quotedText,
          rationale: item.rationale,
          verified: true,
          verificationMode: forwardCheck.verificationMode,
        };
      }
    }

    // 2. Backward cross-page check (Page N-1 + Declared Page N)
    const prevPage = pages.find((p) => p.pageNumber === declaredPageNumber - 1);
    if (prevPage) {
      const backwardCheck = verifyCrossPageSequence(
        item.quotedText,
        prevPage,
        targetPage,
        declaredPageNumber
      );
      if (backwardCheck.verified) {
        return {
          page: item.page,
          section: item.section,
          quotedText: item.quotedText,
          rationale: item.rationale,
          verified: true,
          verificationMode: backwardCheck.verificationMode,
        };
      }
    }

    return {
      page: item.page,
      section: item.section,
      quotedText: item.quotedText,
      rationale: item.rationale,
      verified: false,
      verificationMode: 'unverified',
    };
  });
}
