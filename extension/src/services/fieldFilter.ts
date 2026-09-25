/**
 * Sensitive-field classification — the single decision point that keeps
 * password, payment, OTP, hidden, and autofill-disabled fields out of the
 * capture path. Pure and DOM-free so it is unit-testable in node; DOM
 * extraction lives in extractFieldSignals().
 *
 * The filter must run BEFORE any text is read from an element.
 */

export interface FieldSignals {
  /** Uppercase tag name: INPUT, TEXTAREA, DIV, ... */
  tagName: string
  /** Lowercased input type; '' when the element has no meaningful type. */
  inputType: string
  /** Lowercased autocomplete token; '' when absent. */
  autocomplete: string
  /** Element renders nothing: hidden attribute, display:none, visibility:hidden. */
  isHidden: boolean
}

export function isSensitiveField(signals: FieldSignals): boolean {
  // Invisible elements are never candidates, whatever they are.
  if (signals.isHidden) return true;

  if (signals.tagName !== 'INPUT' && signals.tagName !== 'TEXTAREA') {
    return false;
  }

  // Password and hidden input types hold secrets by definition.
  if (signals.inputType === 'password' || signals.inputType === 'hidden') {
    return true;
  }

  const autocomplete = signals.autocomplete;
  if (!autocomplete) return false;

  // The site opted out of autofill — respect that for ghost text too.
  if (autocomplete === 'off' || autocomplete === 'false') return true;
  // Credit-card data: cc-name, cc-number, cc-csc, cc-exp, ...
  if (autocomplete.startsWith('cc-')) return true;
  // One-time codes.
  if (autocomplete === 'one-time-code' || autocomplete === 'otp') return true;

  return false;
}

/** Reads the attributes and computed visibility needed by isSensitiveField. */
export function extractFieldSignals(el: Element): FieldSignals {
  let isHidden = false;
  if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') {
    isHidden = true;
  } else if (el.ownerDocument?.defaultView) {
    const style = el.ownerDocument.defaultView.getComputedStyle(el);
    isHidden = style.display === 'none' || style.visibility === 'hidden';
  }

  const typeAttr = (el.getAttribute('type') ?? '').toLowerCase();
  const inputType =
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      ? (el.type || typeAttr).toLowerCase()
      : typeAttr;

  return {
    tagName: el.tagName.toUpperCase(),
    inputType,
    autocomplete: (el.getAttribute('autocomplete') ?? '').toLowerCase().trim(),
    isHidden,
  };
}
