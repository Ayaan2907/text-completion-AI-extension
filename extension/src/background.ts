import { defaultSettings, type Settings, type SitePrefs } from './types';
import { AIService } from './services/ai';
import { detectLegalContext, type PageSignals } from './services/contextDetection';
import { decideSiteActivation, originIsGranted } from './services/siteActivation';

// The settings object (which contains the API key) lives in
// chrome.storage.local only — sync storage replicates to the user's
// Google account and is never acceptable for key material.

let settings: Settings = defaultSettings;
const aiService = new AIService(settings);

function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    settings = { ...defaultSettings, ...(result.settings ?? {}) };
    aiService.updateSettings(settings);
  });
}

// One-time migration: move a pre-hardening sync.settings blob into local
// storage, then delete it from sync so the key leaves the Google account.
function migrateSyncSettingsToLocal() {
  chrome.storage.local.get(['settings'], (local) => {
    if (local.settings) return;
    chrome.storage.sync.get(['settings'], (sync) => {
      if (!sync.settings) return;
      chrome.storage.local.set({ settings: sync.settings }, () => {
        chrome.storage.sync.remove('settings');
      });
    });
  });
}

loadSettings();
migrateSyncSettingsToLocal();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    settings = { ...defaultSettings, ...changes.settings.newValue };
    aiService.updateSettings(settings);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  syncContentScriptRegistration();
});

// Content scripts are injected only into origins the user granted at
// runtime. There is no static <all_urls> content script in the manifest.
const CONTENT_SCRIPT_ID = 'draft-assist-content';

// Serialized so concurrent callers (startup + onInstalled) cannot both pass
// the already-registered check and collide on the same script ID.
let syncChain: Promise<void> = Promise.resolve();

function syncContentScriptRegistration(): Promise<void> {
  const run = syncChain.then(async () => {
    try {
      const granted = await chrome.permissions.getAll();
      const origins = granted.origins ?? [];
      const registered = await chrome.scripting.getRegisteredContentScripts();
      const existing = registered.find((script) => script.id === CONTENT_SCRIPT_ID);

      if (origins.length === 0) {
        if (existing) {
          await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
        }
        return;
      }

      if (existing) {
        await chrome.scripting.updateContentScripts([{ id: CONTENT_SCRIPT_ID, matches: origins }]);
      } else {
        await chrome.scripting.registerContentScripts([
          { id: CONTENT_SCRIPT_ID, js: ['content.js'], matches: origins, runAt: 'document_idle' },
        ]);
      }
    } catch (error) {
      console.error('Content script registration failed:', error instanceof Error ? error.message : error);
    }
  });
  syncChain = run.catch(() => undefined);
  return run;
}

chrome.permissions.onAdded.addListener(() => {
  syncContentScriptRegistration();
});
chrome.permissions.onRemoved.addListener(() => {
  syncContentScriptRegistration();
});
syncContentScriptRegistration();

interface SiteStatusResponse {
  active: boolean
  category: 'legal' | 'unknown'
  reason: string
}

async function handleSiteStatus(
  pageSignals: PageSignals | undefined,
  origin: string,
): Promise<SiteStatusResponse> {
  const granted = await chrome.permissions.getAll();
  const hasGrant = originIsGranted(granted.origins ?? [], origin);
  const detection = detectLegalContext(pageSignals ?? { host: '', fieldLabels: [] });
  const store = await chrome.storage.local.get(['sitePrefs']);
  const sitePrefs: SitePrefs = store.sitePrefs ?? {};
  const host = pageSignals?.host ?? '';

  const decision = decideSiteActivation({
    masterEnabled: settings.enabled && settings.apiKey.length > 0,
    category: detection.category,
    pref: sitePrefs[host],
    hasOriginGrant: hasGrant,
  });

  return { active: decision.active, category: detection.category, reason: decision.reason };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PAGE_READY') {
    aiService.updatePageContext(request.pageContext || '');
    return;
  }

  if (request.type === 'GET_SITE_STATUS') {
    const origin = sender.origin || (sender.url ? new URL(sender.url).origin : '');
    handleSiteStatus(request.pageSignals, origin).then(sendResponse).catch(() => {
      sendResponse({ active: false, category: 'unknown', reason: 'status-check-failed' });
    });
    return true;
  }

  if (request.type === 'GET_PREDICTION') {
    const { text, cursorPos, inputContext, tabCount } = request;

    if (!settings.apiKey || !settings.enabled) {
      sendResponse({ prediction: '' });
      return true;
    }

    aiService.getPrediction(text, cursorPos, inputContext, tabCount)
      .then((prediction) => {
        sendResponse({ prediction });
      })
      .catch((error) => {
        // Error messages are pre-mapped user-facing strings — no key or
        // form content ever reaches the console.
        console.error('Prediction failed:', error instanceof Error ? error.message : 'unknown');
        sendResponse({
          prediction: '',
          error: error instanceof Error ? error.message : 'Prediction failed.',
        });
      });

    return true;
  }

  if (request.type === 'TEST_PROVIDER') {
    aiService.updateSettings({
      ...settings,
      apiKey: request.apiKey ?? settings.apiKey,
      apiEndpoint: request.endpoint ?? settings.apiEndpoint,
      model: request.model ?? settings.model,
    });
    aiService.testConnection().then(sendResponse);
    return true;
  }
});
