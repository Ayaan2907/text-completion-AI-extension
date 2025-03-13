/// <reference types="chrome"/>

import { defaultSettings, type Settings, type StorageChanges } from './types';
import { DEBOUNCE_DELAY } from './utils/constants';
import { showLoader, showPrediction, removePrediction, acceptPrediction, ensureLoaderStyles } from './utils/ui';

// Ensure we're in a Chrome extension context
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
  console.error('Chrome extension APIs not available');
  throw new Error('Chrome extension APIs not available');
}

let settings: Settings = defaultSettings;
let debounceTimer: number | null = null;
let currentLoader: HTMLElement | null = null;

// Initialize loader styles
ensureLoaderStyles();

// Initialize settings and notify background with page context
function getPageMetadata(): string {
  const metadata = [
    document.title,
    document.querySelector('meta[name="description"]')?.getAttribute('content'),
    ...Array.from(document.querySelectorAll('h1')).map(h => h.textContent),
  ].filter(Boolean).join(' ').slice(0, 500); // Limit context size
  return metadata;
}

// Initialize settings and notify background
chrome.storage.sync.get(['settings'], (result) => {
  settings = result.settings || defaultSettings;
  // Send page context with ready message
  chrome.runtime.sendMessage({ 
    type: 'PAGE_READY',
    pageContext: getPageMetadata()
  });
});

// Update settings when changed
chrome.storage.onChanged.addListener((changes: StorageChanges) => {
  if (changes.settings) {
    settings = changes.settings.newValue;
  }
});

function isEditableElement(element: HTMLElement): boolean {
  return element instanceof HTMLInputElement || 
         element instanceof HTMLTextAreaElement ||
         element.isContentEditable ||
         element.getAttribute('contenteditable') === 'true' ||
         element.getAttribute('role') === 'textbox' ||
         element.classList.contains('notranslate') || // Gmail support
         element.closest('[contenteditable="true"]') !== null;
}

function getElementText(element: HTMLElement): string {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement 
    ? element.value 
    : element.textContent || '';
}

function getCursorPosition(element: HTMLElement): number {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.selectionStart || 0;
  }
  const selection = window.getSelection();
  return selection?.anchorOffset || 0;
}

async function handleInput(event: Event) {
  const target = event.target as HTMLElement;
  if (!target || !isEditableElement(target) || !settings.enabled) return;

  removePrediction(target);
  if (currentLoader) {
    currentLoader.remove();
    currentLoader = null;
  }
  if (debounceTimer) clearTimeout(debounceTimer);

  const cursorPos = getCursorPosition(target);
  debounceTimer = window.setTimeout(async () => {
    const text = getElementText(target);
    if (!text) return;

    currentLoader = showLoader(target, cursorPos);
    try {
      // Ensure chrome.runtime is available
      if (!chrome.runtime) {
        throw new Error('Chrome runtime not available');
      }

      const response = await chrome.runtime.sendMessage({
        type: 'GET_PREDICTION',
        text,
        cursorPos
      });

      if (response?.prediction) {
        showPrediction(target, cursorPos, response.prediction);
      }
    } catch (error) {
      console.error('Error getting prediction:', error);
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        // Extension was reloaded/updated
        window.location.reload();
      }
    } finally {
      if (currentLoader) {
        currentLoader.remove();
        currentLoader = null;
      }
    }
  }, DEBOUNCE_DELAY);
}

function handleKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (!target || !isEditableElement(target)) return;

  if (event.key === 'Tab' && target.dataset.prediction) {
    event.preventDefault();
    event.stopPropagation();
    acceptPrediction(target);
  } else if (event.key !== 'Tab') {
    removePrediction(target);
  }
}

// Add listeners to document and iframes
function addListeners(doc: Document) {
  doc.addEventListener('input', handleInput);
  doc.addEventListener('keydown', handleKeydown, true);
}

// Handle iframes
function setupIframe(iframe: HTMLIFrameElement) {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) addListeners(doc);
  } catch (e) {
    console.error('Error setting up iframe:', e);
  }
}

// Initial setup
addListeners(document);
document.querySelectorAll('iframe').forEach(setupIframe);

// Watch for new iframes
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node instanceof HTMLIFrameElement) {
        setupIframe(node);
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Cleanup
window.addEventListener('unload', () => {
  observer.disconnect();
  document.removeEventListener('input', handleInput);
  document.removeEventListener('keydown', handleKeydown);
  if (currentLoader) {
    currentLoader.remove();
  }
});