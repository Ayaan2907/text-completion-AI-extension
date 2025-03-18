/// <reference types="chrome"/>

export interface Settings {
  apiKey: string;
  enabled: boolean;
  debug: boolean;
  userContext: string;
  wordMode: boolean;
  model: any;
}

export type StorageChange = {
  oldValue?: any;
  newValue?: any;
};

export interface StorageChanges {
  settings?: {
    newValue: Settings;
    oldValue?: Settings;
  };
}

export const LLM_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o-mini', api_url: 'https://api.openai.com/v1/chat/completions' },
  { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3', api_url: 'https://api.anthropic.com/v1/messages' },
  { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek-r1-free', api_url: 'https://openrouter.ai/api/v1/chat/completions' },
]; 

export const defaultSettings: Settings = {
  apiKey: '',
  enabled: true,
  debug: false,
  userContext: 'I am a professional who writes clear and concise text.',
  wordMode: false,
  model: LLM_MODELS[0].value,
}; 