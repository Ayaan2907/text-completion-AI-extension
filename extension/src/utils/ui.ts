const INDICATOR_ID = 'draft-assist-indicator';

/**
 * Visible indicator that drafting assist is active on this page. It is
 * non-interactive (pointer-events: none) so it can never block form use,
 * and it carries a data attribute for e2e selection.
 */
export function showSiteIndicator(category: 'legal' | 'unknown'): void {
  removeSiteIndicator();
  const indicator = document.createElement('div');
  indicator.id = INDICATOR_ID;
  indicator.dataset.draftAssistIndicator = 'active';
  indicator.setAttribute('role', 'status');
  indicator.textContent =
    category === 'legal'
      ? 'Draft Assist active — legal form detected'
      : 'Draft Assist active — enabled for this site';
  indicator.style.cssText = [
    'position: fixed',
    'bottom: 16px',
    'right: 16px',
    'z-index: 2147483000',
    'pointer-events: none',
    'font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'padding: 6px 12px',
    'background: #1f2937',
    'color: #f9fafb',
    'border-radius: 999px',
    'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25)',
    'opacity: 0.92',
  ].join(';');
  document.body.appendChild(indicator);
}

export function removeSiteIndicator(): void {
  document.getElementById(INDICATOR_ID)?.remove();
}

// Add loader styles to head once
let loaderStylesAdded = false;
export function ensureLoaderStyles() {
  if (loaderStylesAdded) return;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes aiLoaderSpin {
      to { transform: rotate(360deg); }
    }
    .ai-loader {
      position: fixed;
      width: 12px;
      height: 12px;
      border: 1.5px solid #8c8c8c;
      border-radius: 50%;
      border-top-color: transparent;
      animation: aiLoaderSpin 0.6s linear infinite;
      opacity: 0.6;
      margin-left: 2px;
      z-index: 10000;
    }
  `;
  document.head.appendChild(style);
  loaderStylesAdded = true;
}

export function createLoaderElement(): HTMLElement {
  ensureLoaderStyles();
  const loader = document.createElement('div');
  return loader;
}

function getCaretCoordinates(element: HTMLElement, position: number): { x: number, y: number } {
  const rect = element.getBoundingClientRect();
  const isInput = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
  
  if (isInput) {
    const input = element as HTMLInputElement;
    const textBeforeCursor = input.value.substring(0, position);
    const span = document.createElement('span');
    span.style.cssText = `
      position: absolute;
      visibility: hidden;
      font: ${getComputedStyle(input).font};
      letter-spacing: ${getComputedStyle(input).letterSpacing};
      white-space: pre;
    `;
    span.textContent = textBeforeCursor;
    document.body.appendChild(span);
    const width = span.offsetWidth;
    document.body.removeChild(span);
    
    return {
      x: rect.left + width,
      y: rect.top + (rect.height / 2) - 6
    };
  } else {
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    if (!range) return { x: rect.left, y: rect.top };
    const rangeRect = range.getBoundingClientRect();
    return {
      x: rangeRect.right,
      y: rangeRect.top + (rangeRect.height / 2) - 6
    };
  }
}

export function showLoader(target: HTMLElement, cursorPos: number): HTMLElement {
  ensureLoaderStyles();
  const loader = document.createElement('div');
  loader.className = 'ai-loader';
  document.body.appendChild(loader);
  
  const coords = getCaretCoordinates(target, cursorPos);
  loader.style.left = `${coords.x + window.scrollX}px`;
  loader.style.top = `${coords.y + window.scrollY}px`;
  
  return loader;
}

export function showPrediction(
  target: HTMLElement,
  cursorPos: number,
  prediction: string,
  replaceFrom: number = cursorPos,
): void {
  const text = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    ? target.value
    : target.textContent || '';

  // The suggestion replaces [replaceFrom, cursorPos) — for continuations
  // replaceFrom === cursorPos (nothing replaced); a plain-english rewrite
  // sets replaceFrom to 0 so it swaps out the whole drafted portion.
  const clampedFrom = Math.min(Math.max(0, replaceFrom), cursorPos);
  const beforeText = text.substring(0, clampedFrom);
  const afterText = text.substring(cursorPos);

  // Store original state
  target.dataset.originalText = text;
  target.dataset.cursorPos = cursorPos.toString();
  target.dataset.replaceFrom = clampedFrom.toString();
  target.dataset.prediction = prediction;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    // For input/textarea elements
    const predictedText = beforeText + prediction + afterText;
    target.value = predictedText;
    target.style.color = '#0066cc';
    target.setSelectionRange(clampedFrom, clampedFrom + prediction.length);
  } else {
    // For contenteditable elements
    target.textContent = beforeText + prediction + afterText;
    target.style.color = '#0066cc';
    const range = document.createRange();
    range.setStart(target.firstChild || target, clampedFrom);
    range.setEnd(target.firstChild || target, clampedFrom + prediction.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

export function removePrediction(target: HTMLElement): void {
  const originalText = target.dataset.originalText;
  if (!originalText) return;

  const cursorPos = parseInt(target.dataset.cursorPos || '0');
  const restoreCursor = cursorPos;
  
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.value = originalText;
    target.style.color = '';
    target.setSelectionRange(restoreCursor, restoreCursor);
  } else {
    target.textContent = originalText;
    target.style.color = '';
    const range = document.createRange();
    range.setStart(target.firstChild || target, restoreCursor);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  delete target.dataset.originalText;
  delete target.dataset.cursorPos;
  delete target.dataset.replaceFrom;
  delete target.dataset.prediction;
}

export function acceptPrediction(target: HTMLElement, overridePrediction?: string): void {
  const originalText = target.dataset.originalText;
  const storedPrediction = target.dataset.prediction;
  if (!originalText || !storedPrediction) return;

  const prediction = overridePrediction ?? storedPrediction;
  const cursorPos = parseInt(target.dataset.cursorPos || '0');
  const replaceFrom = parseInt(target.dataset.replaceFrom || cursorPos.toString());
  const newText =
    originalText.substring(0, replaceFrom) +
    prediction +
    originalText.substring(cursorPos);
  const finalCursor = replaceFrom + prediction.length;
  
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.value = newText;
    target.style.color = '';
    target.setSelectionRange(finalCursor, finalCursor);
  } else {
    target.textContent = newText;
    target.style.color = '';
    const range = document.createRange();
    range.setStart(target.firstChild || target, finalCursor);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  delete target.dataset.originalText;
  delete target.dataset.cursorPos;
  delete target.dataset.replaceFrom;
  delete target.dataset.prediction;
}
// ---- Suggestion popover for longer blocks (Accept / Edit / Regenerate) ----

const POPOVER_ID = 'draft-assist-popover';

export interface SuggestionPopoverCallbacks {
  /** Inserts the given text at the suggestion's position (user-initiated). */
  onAccept: (text: string) => void
  /** Requests a fresh suggestion for the same field and text. */
  onRegenerate: () => void
}

const POPOVER_CSS = [
  'position: absolute',
  'z-index: 2147483000',
  'font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'background: #ffffff',
  'border: 1px solid #d1d5db',
  'border-radius: 8px',
  'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18)',
  'padding: 8px',
  'display: flex',
  'gap: 6px',
  'align-items: center',
].join(';');

const BUTTON_CSS = [
  'font: 12px/1.2 inherit',
  'padding: 5px 10px',
  'border-radius: 6px',
  'border: 1px solid #d1d5db',
  'background: #f9fafb',
  'color: #1f2937',
  'cursor: pointer',
].join(';');

function actionButton(action: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.draftAction = action;
  button.textContent = label;
  button.style.cssText = BUTTON_CSS;
  // Keep focus in the form field so Esc/Tab semantics keep working.
  button.addEventListener('mousedown', (event) => event.preventDefault());
  return button;
}

/**
 * Small popover shown with longer suggestions (full clause, caption block).
 * The ghost text itself stays in the field; every action is user-initiated —
 * nothing inserts or submits automatically.
 */
export function showSuggestionPopover(
  target: HTMLElement,
  callbacks: SuggestionPopoverCallbacks,
): void {
  removeSuggestionPopover();

  const popover = document.createElement('div');
  popover.id = POPOVER_ID;
  popover.dataset.draftPopover = 'menu';
  popover.style.cssText = POPOVER_CSS;

  const prediction = target.dataset.prediction ?? '';

  const acceptButton = actionButton('accept', 'Accept');
  acceptButton.addEventListener('click', () => callbacks.onAccept(prediction));

  const editButton = actionButton('edit', 'Edit');
  editButton.addEventListener('click', () => showSuggestionEditMode(target, callbacks));

  const regenerateButton = actionButton('regenerate', 'Regenerate');
  regenerateButton.addEventListener('click', () => callbacks.onRegenerate());

  const hint = document.createElement('span');
  hint.textContent = 'Tab to accept · Esc to reject';
  hint.style.cssText = 'color: #6b7280; margin-left: 4px; white-space: nowrap;';

  popover.append(acceptButton, editButton, regenerateButton, hint);

  const rect = target.getBoundingClientRect();
  popover.style.left = `${rect.left + window.scrollX}px`;
  popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
  document.body.appendChild(popover);
}

/** Edit mode: the suggestion moves into an editable textarea; Apply inserts it. */
function showSuggestionEditMode(
  target: HTMLElement,
  callbacks: SuggestionPopoverCallbacks,
): void {
  const prediction = target.dataset.prediction ?? '';
  const popover = document.getElementById(POPOVER_ID);
  if (!popover) return;
  popover.dataset.draftPopover = 'edit';
  popover.textContent = '';

  const textarea = document.createElement('textarea');
  textarea.dataset.draftEditInput = 'active';
  textarea.value = prediction;
  textarea.rows = 4;
  textarea.style.cssText = [
    'width: 320px',
    'max-width: 60vw',
    'font: 12px/1.5 inherit',
    'border: 1px solid #d1d5db',
    'border-radius: 6px',
    'padding: 6px',
    'resize: vertical',
  ].join(';');

  const applyButton = actionButton('apply', 'Apply');
  applyButton.style.background = '#eef2ff';
  applyButton.addEventListener('click', () => callbacks.onAccept(textarea.value));

  const cancelButton = actionButton('cancel', 'Cancel');
  cancelButton.addEventListener('click', () => {
    removeSuggestionPopover();
    showSuggestionPopover(target, callbacks);
  });

  popover.append(textarea, applyButton, cancelButton);
  textarea.focus();
}

export function removeSuggestionPopover(): void {
  document.getElementById(POPOVER_ID)?.remove();
}
