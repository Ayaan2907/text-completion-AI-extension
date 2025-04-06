/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/types.ts":
/*!**********************!*\
  !*** ./src/types.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LLM_MODELS: () => (/* binding */ LLM_MODELS),
/* harmony export */   defaultSettings: () => (/* binding */ defaultSettings)
/* harmony export */ });
/// <reference types="chrome"/>
const LLM_MODELS = [
    {
        value: 'claude',
        label: 'Puter-lclaude',
        api_url: 'https://api.puter.com/drivers/call',
        requires_api_key: false,
        uses_puter_token: true
    },
];
const defaultSettings = {
    apiKey: '',
    enabled: true,
    debug: false,
    userContext: 'I am a professional who writes clear and concise text.',
    wordMode: false,
    model: LLM_MODELS[0],
    puterAuthToken: '',
};


/***/ }),

/***/ "./src/utils/constants.ts":
/*!********************************!*\
  !*** ./src/utils/constants.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEBOUNCE_DELAY: () => (/* binding */ DEBOUNCE_DELAY),
/* harmony export */   LOADER_COLOR: () => (/* binding */ LOADER_COLOR)
/* harmony export */ });
const DEBOUNCE_DELAY = 800; // ms
const LOADER_COLOR = '#666666'; // Same as suggestion color for consistency 


/***/ }),

/***/ "./src/utils/ui.ts":
/*!*************************!*\
  !*** ./src/utils/ui.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   acceptPrediction: () => (/* binding */ acceptPrediction),
/* harmony export */   createLoaderElement: () => (/* binding */ createLoaderElement),
/* harmony export */   createSuggestionElement: () => (/* binding */ createSuggestionElement),
/* harmony export */   ensureLoaderStyles: () => (/* binding */ ensureLoaderStyles),
/* harmony export */   removePrediction: () => (/* binding */ removePrediction),
/* harmony export */   showLoader: () => (/* binding */ showLoader),
/* harmony export */   showPrediction: () => (/* binding */ showPrediction)
/* harmony export */ });
// Helper to measure text width
function measureText(text, element) {
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
function createSuggestionElement(text) {
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
function ensureLoaderStyles() {
    if (loaderStylesAdded)
        return;
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
function createLoaderElement() {
    ensureLoaderStyles();
    const loader = document.createElement('div');
    return loader;
}
function getCaretCoordinates(element, position) {
    const rect = element.getBoundingClientRect();
    const isInput = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
    if (isInput) {
        const input = element;
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
    }
    else {
        const selection = window.getSelection();
        const range = selection === null || selection === void 0 ? void 0 : selection.getRangeAt(0);
        if (!range)
            return { x: rect.left, y: rect.top };
        const rangeRect = range.getBoundingClientRect();
        return {
            x: rangeRect.right,
            y: rangeRect.top + (rangeRect.height / 2) - 6
        };
    }
}
function showLoader(target, cursorPos) {
    ensureLoaderStyles();
    const loader = document.createElement('div');
    loader.className = 'ai-loader';
    document.body.appendChild(loader);
    const coords = getCaretCoordinates(target, cursorPos);
    loader.style.left = `${coords.x + window.scrollX}px`;
    loader.style.top = `${coords.y + window.scrollY}px`;
    return loader;
}
function showPrediction(target, cursorPos, prediction) {
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
    }
    else {
        // For contenteditable elements
        target.textContent = beforeText + prediction + afterText;
        target.style.color = '#0066cc';
        const range = document.createRange();
        range.setStart(target.firstChild || target, cursorPos);
        range.setEnd(target.firstChild || target, cursorPos + prediction.length);
        const selection = window.getSelection();
        selection === null || selection === void 0 ? void 0 : selection.removeAllRanges();
        selection === null || selection === void 0 ? void 0 : selection.addRange(range);
    }
}
function removePrediction(target) {
    const originalText = target.dataset.originalText;
    if (!originalText)
        return;
    const cursorPos = parseInt(target.dataset.cursorPos || '0');
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.value = originalText;
        target.style.color = '';
        target.setSelectionRange(cursorPos, cursorPos);
    }
    else {
        target.textContent = originalText;
        target.style.color = '';
        const range = document.createRange();
        range.setStart(target.firstChild || target, cursorPos);
        range.collapse(true);
        const selection = window.getSelection();
        selection === null || selection === void 0 ? void 0 : selection.removeAllRanges();
        selection === null || selection === void 0 ? void 0 : selection.addRange(range);
    }
    delete target.dataset.originalText;
    delete target.dataset.cursorPos;
    delete target.dataset.prediction;
}
function acceptPrediction(target) {
    const originalText = target.dataset.originalText;
    const prediction = target.dataset.prediction;
    if (!originalText || !prediction)
        return;
    const cursorPos = parseInt(target.dataset.cursorPos || '0');
    const newText = originalText.substring(0, cursorPos) + prediction + originalText.substring(cursorPos);
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.value = newText;
        target.style.color = '';
        target.setSelectionRange(cursorPos + prediction.length, cursorPos + prediction.length);
    }
    else {
        target.textContent = newText;
        target.style.color = '';
        const range = document.createRange();
        range.setStart(target.firstChild || target, cursorPos + prediction.length);
        range.collapse(true);
        const selection = window.getSelection();
        selection === null || selection === void 0 ? void 0 : selection.removeAllRanges();
        selection === null || selection === void 0 ? void 0 : selection.addRange(range);
    }
    delete target.dataset.originalText;
    delete target.dataset.cursorPos;
    delete target.dataset.prediction;
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!************************!*\
  !*** ./src/content.ts ***!
  \************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./types */ "./src/types.ts");
/* harmony import */ var _utils_constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/constants */ "./src/utils/constants.ts");
/* harmony import */ var _utils_ui__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/ui */ "./src/utils/ui.ts");
/// <reference types="chrome"/>
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};



// Ensure we're in a Chrome extension context
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
    console.error('Chrome extension APIs not available');
    throw new Error('Chrome extension APIs not available');
}
let settings = _types__WEBPACK_IMPORTED_MODULE_0__.defaultSettings;
let debounceTimer = null;
let currentLoader = null;
let lastElement = null;
let lastInputContext = '';
// Initialize loader styles
(0,_utils_ui__WEBPACK_IMPORTED_MODULE_2__.ensureLoaderStyles)();
// Initialize settings and notify background with page context
function getPageMetadata() {
    var _a, _b;
    const metadata = [
        document.title,
        (_a = document.querySelector('meta[name="description"]')) === null || _a === void 0 ? void 0 : _a.getAttribute('content'),
        // Current section context (h1 or main heading)
        (_b = document.querySelector('main h1, article h1')) === null || _b === void 0 ? void 0 : _b.textContent,
        // URL path for context
        new URL(window.location.href).pathname.split('/').filter(Boolean).join(' ')
    ]
        .filter(Boolean)
        .map(text => text === null || text === void 0 ? void 0 : text.trim())
        .filter((text) => typeof text === 'string' && text.length > 0)
        .join(' | ')
        .slice(0, 500);
    return metadata;
}
// Function to extract Puter auth token from localStorage
function getPuterAuthToken() {
    try {
        return localStorage.getItem('puter.auth.token');
    }
    catch (error) {
        console.error('Error accessing localStorage for Puter token:', error);
        return null;
    }
}
// Initialize settings and notify background
chrome.storage.sync.get(['settings'], (result) => {
    settings = result.settings || _types__WEBPACK_IMPORTED_MODULE_0__.defaultSettings;
    // Check for Puter token and update settings if found
    const puterToken = getPuterAuthToken();
    if (puterToken && settings.puterAuthToken !== puterToken) {
        settings.puterAuthToken = puterToken;
        chrome.storage.sync.set({ settings });
    }
    // Send page context with ready message
    chrome.runtime.sendMessage({
        type: 'PAGE_READY',
        pageContext: getPageMetadata()
    });
});
// Check periodically for Puter token changes
setInterval(() => {
    const token = getPuterAuthToken();
    if (token && settings.puterAuthToken !== token) {
        settings.puterAuthToken = token;
        chrome.storage.sync.set({ settings });
    }
}, 60000); // Check every minute
// Update settings when changed
chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
        settings = changes.settings.newValue;
    }
});
function isEditableElement(element) {
    return element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element.isContentEditable ||
        element.getAttribute('contenteditable') === 'true' ||
        element.getAttribute('role') === 'textbox' ||
        element.classList.contains('notranslate') || // Gmail support
        element.closest('[contenteditable="true"]') !== null;
}
function getElementText(element) {
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.value
        : element.textContent || '';
}
function getCursorPosition(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.selectionStart || 0;
    }
    const selection = window.getSelection();
    return (selection === null || selection === void 0 ? void 0 : selection.anchorOffset) || 0;
}
function getInputContext(element) {
    var _a, _b;
    // For input/textarea, check label and placeholder
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        // Check for associated label
        const id = element.id;
        const label = id ? (_a = document.querySelector(`label[for="${id}"]`)) === null || _a === void 0 ? void 0 : _a.textContent : '';
        if (label)
            return label;
        // Check placeholder
        if (element.placeholder)
            return element.placeholder;
        // Check aria-label
        if (element.getAttribute('aria-label'))
            return element.getAttribute('aria-label') || '';
    }
    // For contenteditable, check parent's label-like elements
    const parent = element.closest('[role="textbox"]') || element.parentElement;
    if (parent) {
        const nearestLabel = ((_b = parent.querySelector('label')) === null || _b === void 0 ? void 0 : _b.textContent) ||
            parent.getAttribute('aria-label') ||
            (parent instanceof HTMLElement ? parent.title : '') ||
            '';
        if (nearestLabel)
            return nearestLabel;
    }
    return '';
}
function handleInput(event) {
    return __awaiter(this, void 0, void 0, function* () {
        const target = event.target;
        if (!target || !isEditableElement(target) || !settings.enabled)
            return;
        // Remove prediction if the active input element is changed
        if (target !== lastElement) {
            if (lastElement) {
                (0,_utils_ui__WEBPACK_IMPORTED_MODULE_2__.removePrediction)(lastElement);
            }
            lastElement = target;
        }
        (0,_utils_ui__WEBPACK_IMPORTED_MODULE_2__.removePrediction)(target);
        if (currentLoader) {
            currentLoader.remove();
            currentLoader = null;
        }
        if (debounceTimer)
            clearTimeout(debounceTimer);
        const cursorPos = getCursorPosition(target);
        const text = getElementText(target);
        if (!text)
            return;
        if (settings.wordMode) {
            const lastChar = text[cursorPos - 1];
            if (lastChar !== ' ')
                return;
        }
        debounceTimer = window.setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            // Only get input context if element changed
            if (target !== lastElement) {
                lastElement = target;
                lastInputContext = getInputContext(target);
            }
            currentLoader = (0,_utils_ui__WEBPACK_IMPORTED_MODULE_2__.showLoader)(target, cursorPos);
            try {
                // Ensure chrome.runtime is available
                if (!chrome.runtime) {
                    throw new Error('Chrome runtime not available');
                }
                const response = yield chrome.runtime.sendMessage({
                    type: 'GET_PREDICTION',
                    text,
                    cursorPos,
                    inputContext: lastInputContext // Send cached context
                });
                if (response === null || response === void 0 ? void 0 : response.prediction) {
                    (0,_utils_ui__WEBPACK_IMPORTED_MODULE_2__.showPrediction)(target, cursorPos, response.prediction);
                }
            }
            catch (error) {
                console.error('Error getting prediction:', error);
                if (error instanceof Error && error.message.includes('Extension context invalidated')) {
                    // Extension was reloaded/updated
                    window.location.reload();
                }
            }
            finally {
                if (currentLoader) {
                    currentLoader.remove();
                    currentLoader = null;
                }
            }
        }), _utils_constants__WEBPACK_IMPORTED_MODULE_1__.DEBOUNCE_DELAY);
    });
}
function handleKeydown(event) {
    const target = event.target;
    if (!target || !isEditableElement(target))
        return;
    if (event.key === 'Tab' && target.dataset.prediction) {
        event.preventDefault();
        event.stopPropagation();
        (0,_utils_ui__WEBPACK_IMPORTED_MODULE_2__.acceptPrediction)(target);
    }
    else if (event.key !== 'Tab') {
        (0,_utils_ui__WEBPACK_IMPORTED_MODULE_2__.removePrediction)(target);
    }
}
// Add listeners to document and iframes
function addListeners(doc) {
    doc.addEventListener('input', handleInput);
    doc.addEventListener('keydown', handleKeydown, true);
}
// Handle iframes
function setupIframe(iframe) {
    var _a;
    try {
        const doc = iframe.contentDocument || ((_a = iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.document);
        if (doc)
            addListeners(doc);
    }
    catch (e) {
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

})();

/******/ })()
;
//# sourceMappingURL=content.js.map