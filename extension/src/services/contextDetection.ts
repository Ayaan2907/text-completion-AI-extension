/**
 * Conservative legal-context detection. Decides whether a page looks like a
 * legal-practice drafting surface: court e-filing portals, bar-association
 * forms, known legal SaaS, or generic legal form vocabulary.
 *
 * Detection is deliberately conservative: anything it cannot recognize
 * resolves to 'unknown', and the UI must treat 'unknown' as a user decision —
 * never as silent activation.
 */

export type DetectionCategory = 'legal' | 'unknown';

export interface PageSignals {
  host: string
  path?: string
  title?: string
  metaDescription?: string
  /** Label / placeholder / aria-label text of form fields on the page. */
  fieldLabels: string[]
}

export interface LegalDetection {
  category: DetectionCategory
  /** Human-readable matched signals; safe to render in the UI. */
  signals: string[]
}

/** Host patterns for known legal-practice surfaces. First match wins. */
const LEGAL_HOST_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(^|\.)(efile|efiling|e-file|e-filing)/, label: 'e-filing portal' },
  { pattern: /cmecf/, label: 'CM/ECF court system' },
  { pattern: /(^|\.)(court|courts|mycourts)/, label: 'court site' },
  { pattern: /uscourts\.gov$/, label: 'US courts' },
  { pattern: /tylerhost\.net$/, label: 'Odyssey e-filing' },
  { pattern: /(^|\.)americanbar\.org$/, label: 'bar association' },
  { pattern: /barassociation/, label: 'bar association' },
  {
    pattern: /(^|\.)(clio|mycase|practicepanther|smokeball|filevine|cosmolex|tabs3)\./,
    label: 'legal practice software',
  },
  { pattern: /(^|\.)(legalzoom|rocketlawyer)\./, label: 'legal documents site' },
];

/** Legal-practice vocabulary looked for in individual field labels. */
const LEGAL_LABEL_TERMS: Array<[RegExp, string]> = [
  [/\bcase (no|number)\b/i, 'case number field'],
  [/\bdocket\b/i, 'docket reference'],
  [/\bcaption\b/i, 'caption block'],
  [/\bplaintiff\b/i, 'plaintiff field'],
  [/\bdefendant\b/i, 'defendant field'],
  [/\bpetitioner\b/i, 'petitioner field'],
  [/\brespondent\b/i, 'respondent field'],
  [/\bcause of action\b/i, 'cause of action'],
  [/\bjurisdiction\b/i, 'jurisdiction field'],
  [/\bcounsel\b/i, 'counsel field'],
  [/\battorney\b/i, 'attorney field'],
  [/\bbar (no|number)\b/i, 'bar number field'],
  [/\b(pro hac vice|prayer for relief|declarant|notary)\b/i, 'filing vocabulary'],
];

/** Legal-practice vocabulary looked for in page title / meta description. */
const LEGAL_PAGE_TERMS: Array<[RegExp, string]> = [
  [/\be-?fil(e|ing)\b/i, 'e-filing page'],
  [/\bfil(e|ing)\b/i, 'filing page'],
  [/\bcourt\b/i, 'court page'],
  [/\bbar association\b/i, 'bar association page'],
  [/\b(law firm|practitioner|legal drafting)\b/i, 'legal practice page'],
  [/\bfile (a|the) (case|motion|petition|brief|complaint|answer|pleading)\b/i, 'filing workflow'],
];

export function detectLegalContext(page: PageSignals): LegalDetection {
  const host = page.host.toLowerCase();
  const signals: string[] = [];

  // A known host is strong evidence on its own.
  for (const { pattern, label } of LEGAL_HOST_PATTERNS) {
    if (pattern.test(host)) {
      signals.push(label);
      break;
    }
  }
  if (signals.length > 0) {
    return { category: 'legal', signals };
  }

  // Generic vocabulary: require two distinct signals before calling a page
  // legal — one ambiguous term (e.g. "court" in a news headline) is not enough.
  const pageText = [page.title, page.metaDescription].filter(Boolean).join(' ');
  for (const [pattern, label] of LEGAL_PAGE_TERMS) {
    if (pattern.test(pageText) && !signals.includes(label)) signals.push(label);
  }
  for (const rawLabel of page.fieldLabels) {
    for (const [pattern, label] of LEGAL_LABEL_TERMS) {
      if (pattern.test(rawLabel) && !signals.includes(label)) signals.push(label);
    }
  }

  if (signals.length >= 2) {
    return { category: 'legal', signals };
  }
  return { category: 'unknown', signals };
}
