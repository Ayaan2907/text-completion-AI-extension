/// <reference types="chrome"/>

import { defaultSettings, type Settings, type StorageChanges } from './types';
import { DEBOUNCE_DELAY, TAB_COUNT_RESET_TIME } from './utils/constants';
import { showLoader, showPrediction, removePrediction, acceptPrediction, ensureLoaderStyles } from './utils/ui';

// Ensure we're in a Chrome extension context
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
  console.error('Chrome extension APIs not available');
  throw new Error('Chrome extension APIs not available');
}

let settings: Settings = defaultSettings;
let debounceTimer: number | null = null;
let currentLoader: HTMLElement | null = null;
let lastElement: HTMLElement | null = null;
let lastInputContext: string = '';
// Track tab press count per element
const tabPressCounts = new WeakMap<HTMLElement, number>();


function resetTabCount(element: HTMLElement) {
  tabPressCounts.delete(element);
}

function getTabCount(element: HTMLElement): number {
  return tabPressCounts.get(element) || 0;
}

function incrementTabCount(element: HTMLElement) {
  const currentCount = getTabCount(element);
  tabPressCounts.set(element, currentCount + 1);
  
  // Reset count after 10 minutes
  setTimeout(() => resetTabCount(element), TAB_COUNT_RESET_TIME);
}

// Initialize loader styles
ensureLoaderStyles();

// Initialize settings and notify background with page context
function getPageMetadata(): string {
  console.log('🔍 Collecting page metadata...')
  const metadata = [
    document.title,
    document.querySelector('meta[name="description"]')?.getAttribute('content'),
    // Current section context (h1 or main heading)
    document.querySelector('main h1, article h1')?.textContent,
    // URL path for context
    new URL(window.location.href).pathname.split('/').filter(Boolean).join(' ')
  ]
  .filter(Boolean)
  .map(text => text?.trim())
  .filter((text): text is string => typeof text === 'string' && text.length > 0)
  .join(' | ')
  .slice(0, 500); 

  console.log('📄 Page metadata collected:', metadata)
  return metadata;
}

// Initialize settings and notify background
chrome.storage.sync.get(['settings'], (result) => {
  settings = result.settings || defaultSettings;
  const pageContext = getPageMetadata()
  console.log('🚀 Sending PAGE_READY with context:', pageContext)
  // Send page context with ready message
  chrome.runtime.sendMessage({ 
    type: 'PAGE_READY',
    pageContext
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

function getInputContext(element: HTMLElement): string {
  // For input/textarea, check label and placeholder
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // Check for associated label
    const id = element.id;
    const label = id ? document.querySelector(`label[for="${id}"]`)?.textContent : '';
    if (label) return label;
    
    // Check placeholder
    if (element.placeholder) return element.placeholder;
    
    // Check aria-label
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label') || '';
  }
  
  // For contenteditable, check parent's label-like elements
  const parent = element.closest('[role="textbox"]') || element.parentElement;
  if (parent) {
    const nearestLabel = parent.querySelector('label')?.textContent ||
                        parent.getAttribute('aria-label') ||
                        (parent instanceof HTMLElement ? parent.title : '') ||
                        '';
    if (nearestLabel) return nearestLabel;
  }
  
  return '';
}

async function handleInput(event: Event) {
  const target = event.target as HTMLElement;
  if (!target || !isEditableElement(target) || !settings.enabled) return;

  // Remove prediction if the active input element is changed
  if (target !== lastElement) {
    if (lastElement) {
      removePrediction(lastElement);
    }
    lastElement = target;
    lastInputContext = getInputContext(target);
  }

  removePrediction(target);
  if (currentLoader) {
    currentLoader.remove();
    currentLoader = null;
  }
  if (debounceTimer) clearTimeout(debounceTimer);

  const cursorPos = getCursorPosition(target);
  const text = getElementText(target);
  if (!text) return;

  if (settings.wordMode) {
    const lastChar = text[cursorPos - 1];
    if (lastChar !== ' ') return; 
  }

  debounceTimer = window.setTimeout(async () => {
    // Only get input context if element changed
    if (target !== lastElement) {
      lastElement = target;
      lastInputContext = getInputContext(target);
    }

    currentLoader = showLoader(target, cursorPos);
    try {
      // Ensure chrome.runtime is available
      if (!chrome.runtime) {
        throw new Error('Chrome runtime not available');
      }

      const response = await chrome.runtime.sendMessage({
        type: 'GET_PREDICTION',
        text,
        cursorPos,
        inputContext: lastInputContext, // Send cached context
        tabCount: getTabCount(target) // Send current tab count
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

  // Accept prediction on Tab
  if (event.key === 'Tab' && target.dataset.prediction) {
    event.preventDefault();
    event.stopPropagation();
    acceptPrediction(target);
    incrementTabCount(target);
  }
  // Only remove prediction on specific keys that would modify the text
  else if (['Backspace', 'Delete', 'Enter', 'Space'].includes(event.key)) {
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