/// <reference types="chrome"/>

export interface LLMModel {
  value: string
  label: string
  api_url: string
}

export interface Settings {
  apiKey: string
  enabled: boolean
  userContext: string
  wordMode: boolean
  /** Full prediction endpoint URL. BYOK users may point this at any provider. */
  apiEndpoint: string
  /** Model id for OpenAI-compatible endpoints (Google model is part of the endpoint URL). */
  model: string
}

// gemini-3.8-flash re-verified against Google's model lifecycle docs on
// 2026-09-25:
// ai.google.dev/gemini-api/docs/deprecations (GA 2026-09-02, no shutdown
// announced) and ai.google.dev/api (API keys travel in the x-goog-api-key
// header, never the URL). Re-verify before changing; the previously hardcoded
// gemini-2.0-flash shut down 2026-06-01.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`;

export type SitePref = 'enabled' | 'disabled';

/** Per-host drafting-assist preference keyed by hostname. */
export type SitePrefs = Record<string, SitePref>;

export type StorageChange = {
  oldValue?: unknown
  newValue?: unknown
}

export interface StorageChanges {
  settings?: {
    newValue: Settings
    oldValue?: Settings
  }
  sitePrefs?: {
    newValue: SitePrefs
    oldValue?: SitePrefs
  }
}

export const defaultSettings: Settings = {
  apiKey: '',
  enabled: true,
  userContext: 'I am a professional who writes clear and concise text.',
  wordMode: false,
  apiEndpoint: DEFAULT_API_ENDPOINT,
  model: DEFAULT_GEMINI_MODEL,
}
