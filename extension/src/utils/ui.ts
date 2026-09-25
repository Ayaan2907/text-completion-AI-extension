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

export function showPrediction(target: HTMLElement, cursorPos: number, prediction: string): void {
  const text = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement 
    ? target.value 
    : target.textContent || '';

  const beforeText = text.substring(0, cursorPos);
  const afterText = text.substring(cursorPos);
  
  // Store original state
  target.dataset.originalText = text;
  target.dataset.cursorPos = cursorPos.toString();
  target.dataset.prediction = prediction;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    // For input/textarea elements
    const predictedText = beforeText + prediction + afterText;
    target.value = predictedText;
    target.style.color = '#0066cc';
    target.setSelectionRange(cursorPos, cursorPos + prediction.length);
  } else {
    // For contenteditable elements
    target.textContent = beforeText + prediction + afterText;
    target.style.color = '#0066cc';
    const range = document.createRange();
    range.setStart(target.firstChild || target, cursorPos);
    range.setEnd(target.firstChild || target, cursorPos + prediction.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

export function removePrediction(target: HTMLElement): void {
  const originalText = target.dataset.originalText;
  if (!originalText) return;

  const cursorPos = parseInt(target.dataset.cursorPos || '0');
  
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.value = originalText;
    target.style.color = '';
    target.setSelectionRange(cursorPos, cursorPos);
  } else {
    target.textContent = originalText;
    target.style.color = '';
    const range = document.createRange();
    range.setStart(target.firstChild || target, cursorPos);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  delete target.dataset.originalText;
  delete target.dataset.cursorPos;
  delete target.dataset.prediction;
}

export function acceptPrediction(target: HTMLElement): void {
  const originalText = target.dataset.originalText;
  const prediction = target.dataset.prediction;
  if (!originalText || !prediction) return;

  const cursorPos = parseInt(target.dataset.cursorPos || '0');
  const newText = originalText.substring(0, cursorPos) + prediction + originalText.substring(cursorPos);
  
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.value = newText;
    target.style.color = '';
    target.setSelectionRange(cursorPos + prediction.length, cursorPos + prediction.length);
  } else {
    target.textContent = newText;
    target.style.color = '';
    const range = document.createRange();
    range.setStart(target.firstChild || target, cursorPos + prediction.length);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  delete target.dataset.originalText;
  delete target.dataset.cursorPos;
  delete target.dataset.prediction;
}