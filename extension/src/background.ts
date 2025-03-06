import { defaultSettings, type Settings } from './types';
import { AIService } from './services/ai';

let settings: Settings = defaultSettings;
let aiService: AIService;

// Cache for page contexts to avoid re-processing
const pageContextCache = new Map<string, string>();

// Load settings when background script starts
chrome.storage.sync.get(['settings'], (result) => {
  settings = result.settings || defaultSettings;
  aiService = new AIService(settings, '');
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    settings = changes.settings.newValue;
    aiService?.updateSettings(settings);
  }
});

async function getPageContext(tabId: number): Promise<string> {
  try {
    const tab = await chrome.tabs.get(tabId);
    const url = tab.url || '';

    // Check cache first
    if (pageContextCache.has(url)) {
      return pageContextCache.get(url)!;
    }

    // Extract relevant text from the page
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const relevantElements = [
          ...document.getElementsByTagName('h1'),
          ...document.getElementsByTagName('h2'),
          ...document.getElementsByTagName('h3'),
          ...document.getElementsByTagName('title'),
          document.querySelector('meta[name="description"]'),
        ];

        return relevantElements
          .map(el => el?.textContent || el?.getAttribute('content'))
          .filter(Boolean)
          .join(' ');
      }
    });

    const pageContext = result || '';
    pageContextCache.set(url, pageContext);
    return pageContext;
  } catch (error) {
    console.error('Error getting page context:', error);
    return '';
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PREDICTION') {
    const { text, cursorPos } = request;
    
    if (!settings.apiKey || !settings.enabled) {
      sendResponse({ prediction: '' });
      return true;
    }

    (async () => {
      try {
        const tabId = sender.tab?.id;
        if (!tabId) {
          sendResponse({ prediction: '' });
          return;
        }

        // Get page context and update AI service
        const pageContext = await getPageContext(tabId);
        aiService.updatePageContext(pageContext);
        
        if (settings.debug) {
          console.log('📄 Page Context:', pageContext);
          console.log('✍️ Current Text:', text);
        }

        const prediction = await aiService.getPrediction(text, cursorPos);
        sendResponse({ prediction });
      } catch (error) {
        if (settings.debug) {
          console.error('❌ Error:', error);
        }
        sendResponse({ prediction: '' });
      }
    })();

    return true; // Keeping the message channel open for async response
  }
}); 