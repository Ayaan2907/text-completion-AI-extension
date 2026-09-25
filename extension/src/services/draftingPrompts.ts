/**
 * Drafting-specific prompt selection and construction (pure, table-tested).
 *
 * Four drafting prompt kinds drive suggestions on legal forms, per the
 * pivot spec:
 *  - expand_clause  — brief phrase → full contractual clause (continuation)
 *  - caption_block  — court/style-appropriate caption from the details the
 *                     drafter typed (continuation)
 *  - defined_terms  — continuation that stays consistent with defined terms
 *                     already used on the page
 *  - plain_english  — rewrite of the drafted text at a plainer reading level
 *                     (replaces the draft, not a continuation)
 * plus the generic 'continue' kind kept from the original completion flow.
 *
 * Page context is title/meta/labels only — field values other than the
 * text the user is actively drafting are never included (security posture).
 */

export type DraftKind =
  | 'expand_clause'
  | 'caption_block'
  | 'defined_terms'
  | 'plain_english'
  | 'continue';

export interface DraftSelectionInput {
  /** Label, placeholder, or aria-label of the active field. */
  fieldLabel: string
  /** The text the user has drafted so far (their own input, before cursor). */
  typedText: string
}

const CAPTION_LABEL = /caption|case\s+style|attorney\s+information/i;
/** "Smith v. Jones" / "Smith vs. Jones" — the seed of a case caption. */
const CAPTION_VS = /\s+v(?:s|\.)?\.?\s+\S/i;

/** Quoted defined terms: "the Agreement" / 'the Contractor' / “Contract Price”. */
const DEFINED_TERM = /(?:the\s+)?["“']([^"”']{3,40})["”']/g;

/** Legalese markers that signal the drafter wants plainer phrasing. */
const LEGALESE = /\b(hereinafter|aforementioned|pursuant to|theretofore|hereinbefore|notwithstanding the foregoing|in witness whereof)\b/gi;

/** Signals the text is a contractual clause worth expanding. */
const CLAUSE_SIGNAL = /\b(indemnif|shall|liabilit|warrant|governing law|termination|severab|arbitrat|confidential|force majeure|jurisdiction|obligation)\b/i;

const CLAUSE_LABEL = /motion|brief|clause|contract|agreement|pleading|memorandum|facts|argument|provision/i;

export const POPOVER_MIN_CHARS = 160;

/**
 * Conservative, ordered classification. Anything unrecognised falls through
 * to the generic continuation prompt — drafting prompts only take over on
 * real legal signals.
 */
export function selectDraftKind(input: DraftSelectionInput): DraftKind {
  const { fieldLabel, typedText } = input;

  if (CAPTION_LABEL.test(fieldLabel) || CAPTION_VS.test(typedText)) {
    return 'caption_block';
  }
  if (countMatches(DEFINED_TERM, typedText) >= 2) {
    return 'defined_terms';
  }
  const legaleseHits = countMatches(LEGALESE, typedText);
  if (legaleseHits >= 2 && typedText.length >= 80) {
    return 'plain_english';
  }
  if (CLAUSE_SIGNAL.test(typedText) || CLAUSE_LABEL.test(fieldLabel)) {
    return 'expand_clause';
  }
  return 'continue';
}

function countMatches(pattern: RegExp, text: string): number {
  return [...text.matchAll(pattern)].length;
}

export interface DraftPromptInput {
  kind: DraftKind
  /** Full field text; the drafted portion ends at cursorPos. */
  text: string
  cursorPos: number
  fieldLabel: string
  /** Page title/meta/labels — never captured field values. */
  pageContext: string
  userContext: string
  /** Desired answer length for the generic continuation ('single line' etc.). */
  answerLength?: string
}

const SHARED_RULES = `
          Requirements:
          * Return ONLY the drafted text itself - no introductions, no explanations, no quotation marks around the whole answer
          * Never repeat the user's drafted text back verbatim
          * Match formal legal register unless told otherwise
          * Use the page context for orientation only - never invent case numbers, party names, or dates that were not provided`;

/**
 * Builds the full prediction prompt for a draft kind. One home for prompt
 * construction so every kind is unit-testable and nothing logs.
 */
export function buildDraftingPrompt(input: DraftPromptInput): string {
  const { kind, text, cursorPos, fieldLabel, pageContext, userContext } = input;
  const beforeText = text.substring(Math.max(0, cursorPos - 1000), cursorPos);
  const afterText = text.substring(cursorPos, Math.min(text.length, cursorPos + 100));

  const contextBlock = `
          Context:
          * User Background: ${userContext}
          * Page Content: ${pageContext}
          * Field Label: ${fieldLabel || 'None'}`;

  switch (kind) {
    case 'expand_clause':
      return `You are a legal drafting assistant. The user has started a contractual or motion clause; expand it into a complete, contract-ready clause that continues from their cursor.

          ${contextBlock}
          * Desired Length: a complete clause (typically 40-120 words)

          Drafted text before cursor: "${beforeText}"
          [Cursor Position]
          Text after cursor: "${afterText}"
          ${SHARED_RULES}
          * Ground every obligation, condition, and exception in the phrase the user provided`;

    case 'caption_block':
      return `You are a legal drafting assistant. Draft a court-style caption block from the matter details the user provided (party names, court, case number) as it should continue from their cursor.

          ${contextBlock}
          * Desired Length: a full caption block (attorney line, court line, case number line, title of the filing)

          Drafted text before cursor: "${beforeText}"
          [Cursor Position]
          Text after cursor: "${afterText}"
          ${SHARED_RULES}
          * Use only party names, courts, and case numbers the user actually provided - leave a clearly marked blank (e.g. [CASE NUMBER]) for anything missing`;

    case 'defined_terms':
      return `You are a legal drafting assistant. Continue the user's drafted text while keeping defined terms consistent with the terms already used on this page and within the draft itself.

          ${contextBlock}
          * Desired Length: a natural continuation (typically 30-90 words)

          Drafted text before cursor: "${beforeText}"
          [Cursor Position]
          Text after cursor: "${afterText}"
          ${SHARED_RULES}
          * Reuse existing defined terms exactly as previously used; propose a definition only for genuinely new concepts`;

    case 'plain_english':
      return `You are a legal drafting assistant. The user has drafted text dense with legalese; rewrite the full drafted portion at a plainer reading level while preserving its legal meaning.

          ${contextBlock}
          * Desired Length: similar length to the drafted text

          Drafted text to rewrite (this replaces the drafted portion): "${beforeText}"
          Text after cursor: "${afterText}"
          ${SHARED_RULES}
          * Short sentences, everyday words, active voice - but never change the legal effect`;

    case 'continue':
      return `You are a text completion AI focused exclusively on continuing the user's text naturally. Provide ONLY the continuation text.

          ${contextBlock}
          * Input Field Type: ${fieldLabel || 'None'}
          * Desired Length: ${input.answerLength ?? 'single line'} words

          Text Before Cursor: "${beforeText}"
          [Cursor Position]
          Text After Cursor: "${afterText}"

          Requirements:
          * Return ONLY the predicted continuation - never repeat "Text before cursor" or "Text after cursor"
          * No introductions or explanations in your response
          * Match the user's style, tone, and context
          * Ensure grammatical correctness
          * Maintain proper formatting (capitalization, spacing)
          * Complete partial words first, then begin with a space for complete words or a new word after spaces
          * Keep completion concise and relevant`;
  }
}

/**
 * Whether a suggestion of this kind replaces the drafted portion (from the
 * start of the field text) instead of inserting at the cursor.
 */
export function replacesDraftedText(kind: DraftKind): boolean {
  return kind === 'plain_english';
}
