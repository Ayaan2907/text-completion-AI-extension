import { LOADER_COLOR } from './constants';

// Helper to measure text width
function measureText(text: string, element: HTMLElement): number {
  const span = document.createElement('span');
  span.style.cssText = `
    position: absolute;
    visibility: hidden;
    font: ${getComputedStyle(element).font};
    letter-spacing: ${getComputedStyle(element).letterSpacing};
    white-space: pre;
  `;
  span.textContent = text;
  document.body.appendChild(span);
  const width = span.offsetWidth;
  document.body.removeChild(span);
  return width;
}

export function createSuggestionElement(text: string): HTMLElement {
  const element = document.createElement('span');
  element.textContent = text;
  element.style.cssText = `
    position: fixed;
    color: #8c8c8c;
    pointer-events: none;
    white-space: pre;
    font: inherit;
    opacity: 0.8;
    z-index: 10000;
  `;
  element.dataset.type = 'suggestion';
  return element;
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