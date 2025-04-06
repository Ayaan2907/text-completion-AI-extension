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
}

export type StorageChange = {
  oldValue?: any
  newValue?: any
}

export interface StorageChanges {
  settings?: {
    newValue: Settings
    oldValue?: Settings
  }
}

export const LLM_MODELS: LLMModel[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o-mini', api_url: 'https://api.openai.com/v1/chat/completions' },
  { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3', api_url: 'https://api.anthropic.com/v1/messages' },
  { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek-r1-free', api_url: 'https://openrouter.ai/api/v1/chat/completions' }
]

export const defaultSettings: Settings = {
  apiKey: '',
  enabled: true,
  userContext: 'I am a professional who writes clear and concise text.',
  wordMode: false
}