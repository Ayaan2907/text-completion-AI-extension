/// <reference types="chrome"/>

export interface Settings {
  apiKey: string;
  enabled: boolean;
  debug: boolean;
  userContext: string;
}

export type StorageChange = {
  oldValue?: any;
  newValue?: any;
};

export type StorageChanges = {
  [key: string]: StorageChange;
};

export const defaultSettings: Settings = {
  apiKey: '',
  enabled: true,
  debug: false,
  userContext: 'I am a professional who writes clear and concise text.',
}; 