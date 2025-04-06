/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/services/ai.ts":
/*!****************************!*\
  !*** ./src/services/ai.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AIService: () => (/* binding */ AIService)
/* harmony export */ });
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class AIService {
    constructor(settings) {
        this.pageContext = '';
        this.settings = settings;
        // this.pageContext = pageContext;
    }
    updateSettings(newSettings) {
        this.settings = newSettings;
    }
    updatePageContext(newContext) {
        this.pageContext = newContext;
    }
    getPrediction(text, cursorPos, inputContext) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!this.settings.apiKey || !this.settings.enabled)
                return '';
            // Get text around cursor (up to 100 chars each side for faster context)
            const beforeText = text.substring(Math.max(0, cursorPos - 100), cursorPos);
            const afterText = text.substring(cursorPos, Math.min(text.length, cursorPos + 100));
            if (this.settings.debug) {
                console.log('📄 Page Context:', this.pageContext);
                console.log('👤 User Context:', this.settings.userContext);
                console.log('🏷️ Input Context:', inputContext);
                console.log('✍️ Input:', beforeText + '|' + afterText);
            }
            try {
                const response = yield fetch(this.settings.model.api_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.settings.puterAuthToken}`
                        // 'x-api-key': this.settings.apiKey,
                        // 'anthropic-version': '2023-06-01',
                        // 'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        driver: this.settings.model,
                        model: this.settings.model.value,
                        // max_tokens: 230,
                        args: {
                            messages: [
                                {
                                    role: 'user',
                                    content: `You are a text completion AI. Based on these contexts:
              - About the user: ${this.settings.userContext}
              - Current page: ${this.pageContext}
              - Input field: ${inputContext || 'None'}
              
              The user has typed: "${beforeText}"
              
              Continue this text naturally. IMPORTANT:
              - ONLY provide the continuation text that comes AFTER the user's input
              - DO NOT repeat any part of the input text
              - DO NOT add quotes or explanations
              - Keep the style and context consistent
              - Take care of word end, spaces, if the word ended start with a space`
                                }
                            ]
                        }
                    })
                });
                if (!response.ok) {
                    const errorData = yield response.json().catch(() => ({}));
                    if (this.settings.debug) {
                        console.error('API Error Response:', errorData);
                    }
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }
                const data = yield response.json();
                // const prediction = data.choices?.[0]?.message?.content?.trim() || '';
                const prediction = ((_c = (_b = (_a = data.content) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) === null || _c === void 0 ? void 0 : _c.trim()) || '';
                if (this.settings.debug && prediction) {
                    console.log('💡 Completion:', prediction);
                }
                return prediction;
            }
            catch (error) {
                if (this.settings.debug) {
                    console.error('❌ API Error:', error);
                }
                return '';
            }
        });
    }
}


/***/ }),

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
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./types */ "./src/types.ts");
/* harmony import */ var _services_ai__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./services/ai */ "./src/services/ai.ts");


// Ensure service worker stays active
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});
let settings = _types__WEBPACK_IMPORTED_MODULE_0__.defaultSettings;
const aiService = new _services_ai__WEBPACK_IMPORTED_MODULE_1__.AIService(settings);
// Initialize settings
chrome.storage.sync.get(['settings'], (result) => {
    settings = result.settings || _types__WEBPACK_IMPORTED_MODULE_0__.defaultSettings;
    aiService.updateSettings(settings);
});
// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
        settings = changes.settings.newValue;
        aiService.updateSettings(settings);
    }
});
// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    var _a;
    if (request.type === 'PAGE_READY') {
        // Update AI service with page context
        aiService.updatePageContext(request.pageContext || '');
        return;
    }
    if (request.type === 'GET_PREDICTION') {
        const { text, cursorPos, inputContext } = request;
        if (!settings.enabled) {
            sendResponse({ prediction: '' });
            return true;
        }
        // For Puter model, we use the puterAuthToken instead of apiKey TOEDIT:
        const isPuterModel = ((_a = settings.model) === null || _a === void 0 ? void 0 : _a.value) === 'claude' ||
            (typeof settings.model === 'object' && settings.model.label === 'Puter-lclaude');
        if (!isPuterModel && !settings.apiKey) {
            sendResponse({ prediction: '' });
            return true;
        }
        if (isPuterModel && !settings.puterAuthToken) {
            sendResponse({ prediction: '' });
            return true;
        }
        // Handle API call in background
        aiService.getPrediction(text, cursorPos, inputContext)
            .then(prediction => {
            sendResponse({ prediction });
        })
            .catch(error => {
            console.error('Error:', error);
            sendResponse({ prediction: '' });
        });
        return true; // Keeping the message channel open for async response
    }
});

})();

/******/ })()
;
//# sourceMappingURL=background.js.map