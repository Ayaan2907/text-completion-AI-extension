/// <reference types="chrome"/>

import { defaultSettings, type Settings, type StorageChanges } from './types';
import { AIService } from './services/ai';
import { DEBOUNCE_DELAY } from './utils/constants';
import { createSuggestionElement, createLoaderElement } from './utils/ui';

let settings: Settings = defaultSettings;
let currentSuggestion: HTMLElement | null = null;
let currentLoader: HTMLElement | null = null;
let debounceTimer: number | null = null;
let aiService: AIService;

// Get page context once when script loads
const pageContext = (() => {
  const relevantElements = [
    ...document.getElementsByTagName('h1'),
    ...document.getElementsByTagName('h2'),
    document.getElementsByTagName('title')[0],
    document.querySelector('meta[name="description"]'),
  ];

  return relevantElements
    .map(el => el?.textContent || el?.getAttribute('content'))
    .filter(Boolean)
    .join(' ');
})();

// Initialize settings and AI service
chrome.storage.sync.get(['settings'], (result) => {
  settings = result.settings || defaultSettings;
  aiService = new AIService(settings, pageContext);
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes: StorageChanges) => {
  if (changes.settings) {
    settings = changes.settings.newValue;
    aiService.updateSettings(settings);
    if (!settings.enabled) {
      removeSuggestion();
      removeLoader();
    }
  }
});

function isInputElement(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

function isEditableElement(element: HTMLElement): boolean {
  return element.isContentEditable || 
         element.getAttribute('role') === 'textbox' ||
         element.getAttribute('contenteditable') === 'true';
}

function getElementText(element: HTMLElement): string {
  if (isInputElement(element)) {
    return element.value;
  }
  return element.textContent || '';
}

function setElementText(element: HTMLElement, text: string, cursorPos: number): void {
  if (isInputElement(element)) {
    element.value = text;
    element.selectionStart = element.selectionEnd = cursorPos;
  } else {
    element.textContent = text;
    // Set cursor position for contenteditable
    const selection = window.getSelection();
    const range = document.createRange();
    const textNode = element.firstChild || element;
    range.setStart(textNode, cursorPos);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

function getCursorPosition(element: HTMLElement): number {
  if (isInputElement(element)) {
    return element.selectionStart || 0;
  }
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return 0;
  
  const range = selection.getRangeAt(0);
  return range.startOffset;
}

function removeSuggestion() {
  if (currentSuggestion) {
    if (settings.debug) {
      console.log('❌ Suggestion dismissed');
    }
    currentSuggestion.remove();
    currentSuggestion = null;
  }
}

function removeLoader() {
  if (currentLoader) {
    currentLoader.remove();
    currentLoader = null;
  }
}

function positionElement(element: HTMLElement, target: HTMLElement, cursorPos: number) {
  const rect = target.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(target);
  const fontSize = parseInt(computedStyle.fontSize) || 14;
  const lineHeight = parseInt(computedStyle.lineHeight) || fontSize * 1.2;

  let text = getElementText(target);
  const textBeforeCursor = text.substring(0, cursorPos);
  const lines = textBeforeCursor.split('\n');
  const currentLineNumber = lines.length - 1;
  const currentLineText = lines[currentLineNumber];

  // Create a temporary span to measure text width
  const measureSpan = document.createElement('span');
  measureSpan.style.visibility = 'hidden';
  measureSpan.style.position = 'absolute';
  measureSpan.style.fontSize = computedStyle.fontSize;
  measureSpan.style.fontFamily = computedStyle.fontFamily;
  measureSpan.style.whiteSpace = 'pre';
  measureSpan.textContent = currentLineText;
  document.body.appendChild(measureSpan);
  const textWidth = measureSpan.getBoundingClientRect().width;
  measureSpan.remove();

  // Calculate position
  const scrollTop = isInputElement(target) ? target.scrollTop : target.scrollTop || 0;
  const scrollLeft = isInputElement(target) ? target.scrollLeft : target.scrollLeft || 0;

  element.style.top = `${rect.top + (currentLineNumber * lineHeight) - scrollTop}px`;
  element.style.left = `${rect.left + textWidth - scrollLeft}px`;
  if (element === currentSuggestion) {
    element.style.maxWidth = `${rect.width - textWidth}px`;
  }
}

async function handleInput(event: Event) {
  const target = event.target as HTMLElement;
  if (!target || (!isInputElement(target) && !isEditableElement(target)) || !settings.enabled) return;

  // Clear existing suggestion and timer
  removeSuggestion();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Show loader immediately
  removeLoader();
  currentLoader = createLoaderElement();
  positionElement(currentLoader, target, getCursorPosition(target));
  document.body.appendChild(currentLoader);

  // Debounce the prediction request
  debounceTimer = window.setTimeout(async () => {
    const text = getElementText(target);
    const cursorPos = getCursorPosition(target);
    if (!text) {
      removeLoader();
      return;
    }

    const prediction = await aiService.getPrediction(text, cursorPos);
    removeLoader();
    
    if (!prediction) return;

    const suggestion = createSuggestionElement(prediction);
    positionElement(suggestion, target, cursorPos);
    document.body.appendChild(suggestion);
    currentSuggestion = suggestion;
  }, DEBOUNCE_DELAY);
}

function handleKeydown(event: KeyboardEvent) {
  if (!currentSuggestion) return;

  const target = event.target as HTMLElement;
  if (!target || (!isInputElement(target) && !isEditableElement(target))) return;

  if (event.key === 'Tab') {
    event.preventDefault();
    const suggestion = currentSuggestion.textContent || '';
    const cursorPos = getCursorPosition(target);
    const text = getElementText(target);
    
    const newText = text.substring(0, cursorPos) + suggestion + text.substring(cursorPos);
    const newCursorPos = cursorPos + suggestion.length;
    
    setElementText(target, newText, newCursorPos);
    
    if (settings.debug) {
      console.log('✅ Suggestion accepted');
    }
    removeSuggestion();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    removeSuggestion();
  }
}

// Add event listeners for all input types
document.addEventListener('input', handleInput);
document.addEventListener('keydown', handleKeydown);

// Handle dynamically added elements
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of Array.from(mutation.addedNodes)) {
      if (node instanceof HTMLElement) {
        if (isInputElement(node) || isEditableElement(node)) {
          node.addEventListener('input', handleInput);
          node.addEventListener('keydown', handleKeydown);
        }
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
}); 