/// <reference types="chrome"/>

import { defaultSettings, type Settings, type StorageChanges } from './types';
import { DEBOUNCE_DELAY, TAB_COUNT_RESET_TIME } from './utils/constants';
import {
  showLoader,
  showPrediction,
  removePrediction,
  acceptPrediction,
  ensureLoaderStyles,
  showSiteIndicator,
  removeSiteIndicator,
} from './utils/ui';
import { isSensitiveField, extractFieldSignals } from './services/fieldFilter';
import type { PageSignals } from './services/contextDetection';

// Ensure we're in a Chrome extension context
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
  throw new Error('Chrome extension APIs not available');
}

let settings: Settings = defaultSettings;
let siteActive = false;
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

  // Reset count after the configured interval
  setTimeout(() => resetTabCount(element), TAB_COUNT_RESET_TIME);
}

// Initialize loader styles
ensureLoaderStyles();

function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    settings = { ...defaultSettings, ...(result.settings ?? {}) };
  });
}

/**
 * Collects page signals (host, title, meta, field labels) for legal-context
 * detection. Text from form FIELDS is never included — only labels and
 * placeholders, and nothing is logged.
 */
function collectPageSignals(): PageSignals {
  const fieldLabels: string[] = [];
  const nodes = document.querySelectorAll('label, [placeholder], [aria-label]');
  for (const node of Array.from(nodes).slice(0, 80)) {
    const raw =
      node instanceof HTMLLabelElement
        ? node.textContent
        : node.getAttribute('placeholder') ?? node.getAttribute('aria-label');
    const text = raw?.trim();
    if (text && text.length > 0 && text.length <= 120 && !fieldLabels.includes(text)) {
      fieldLabels.push(text);
    }
    if (fieldLabels.length >= 40) break;
  }

  return {
    host: window.location.host,
    path: window.location.pathname,
    title: document.title,
    metaDescription:
      document.querySelector('meta[name="description"]')?.getAttribute('content') ?? undefined,
    fieldLabels,
  };
}

function refreshSiteStatus() {
  chrome.runtime.sendMessage({ type: 'GET_SITE_STATUS', pageSignals: collectPageSignals() }, (resp) => {
    if (!resp) return;
    siteActive = resp.active === true;
    if (siteActive) {
      showSiteIndicator(resp.category);
    } else {
      removeSiteIndicator();
    }
  });
}

// Send page context (title / meta / path — never form content) to background
function sendPageContext() {
  const signals = collectPageSignals();
  const pageContext = [
    signals.title,
    signals.metaDescription,
    document.querySelector('main h1, article h1')?.textContent,
    signals.path?.split('/').filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .map((text) => text?.trim())
    .filter((text): text is string => typeof text === 'string' && text.length > 0)
    .join(' | ')
    .slice(0, 500);

  chrome.runtime.sendMessage({
    type: 'PAGE_READY',
    pageContext,
  });
}

loadSettings();
sendPageContext();
refreshSiteStatus();

// React to settings or per-site preference changes
chrome.storage.onChanged.addListener((changes: StorageChanges, area) => {
  if (area !== 'local') return;
  if (changes.settings) {
    settings = { ...defaultSettings, ...changes.settings.newValue };
  }
  if (changes.settings || changes.sitePrefs) {
    refreshSiteStatus();
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

    // Check for placeholder
    if (element.placeholder) return element.placeholder;

    // Check for aria-label
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
  if (!target || !isEditableElement(target)) return;

  // Sensitive-field gate runs FIRST: password, credit-card, OTP, hidden and
  // autofill-disabled fields are never read, never stored, never sent.
  if (isSensitiveField(extractFieldSignals(target))) {
    removePrediction(target);
    return;
  }

  // Esc-rejected suggestions stay suppressed until the field is re-focused.
  if (target.dataset.predictionRejected) {
    removePrediction(target);
    return;
  }

  if (!siteActive || !settings.enabled) return;

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

      // The field may have been Esc-rejected while the request was in flight.
      if (target.dataset.predictionRejected) return;

      if (response?.prediction) {
        showPrediction(target, cursorPos, response.prediction);
      }
    } catch (error) {
      console.error('Prediction request failed:', error instanceof Error ? error.message : 'unknown');
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

  // Sensitive fields: never hold or accept predictions
  if (isSensitiveField(extractFieldSignals(target))) {
    return;
  }

  // Accept prediction on Tab
  if (event.key === 'Tab' && target.dataset.prediction) {
    event.preventDefault();
    event.stopPropagation();
    acceptPrediction(target);
    incrementTabCount(target);
  }
  // Reject prediction on Escape; it will not re-fire until refocus. Escape
  // is honored even when it lands during the debounce window — a pending
  // prediction is cancelled, an in-flight one is discarded on arrival.
  else if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    removePrediction(target);
    target.dataset.predictionRejected = 'true';
    target.addEventListener('focus', () => {
      delete target.dataset.predictionRejected;
    }, { once: true });
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
  } catch {
    // Cross-origin iframes are not accessible; their own frames get their
    // own content script injection when the origin is granted.
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
  removeSiteIndicator();
  if (currentLoader) {
    currentLoader.remove();
  }
});
