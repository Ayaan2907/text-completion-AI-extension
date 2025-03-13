import { defaultSettings, type Settings } from './types';
import { AIService } from './services/ai';

// Ensure service worker stays active
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

let settings: Settings = defaultSettings;
const aiService = new AIService(settings);

// Initialize settings
chrome.storage.sync.get(['settings'], (result) => {
  settings = result.settings || defaultSettings;
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
  if (request.type === 'PAGE_READY') {
    // Update AI service with page context
    aiService.updatePageContext(request.pageContext || '');
    return;
  }
  
  if (request.type === 'GET_PREDICTION') {
    const { text, cursorPos, inputContext } = request;
    
    if (!settings.apiKey || !settings.enabled) {
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