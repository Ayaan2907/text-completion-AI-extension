import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  MantineProvider,
  Stack,
  TextInput,
  Textarea,
  Switch,
  Title,
  Space,
} from '@mantine/core';
import { defaultSettings, type Settings } from './types';

function Popup() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    chrome.storage.sync.get(['settings'], (result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
    });
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    chrome.storage.sync.set({ settings: updatedSettings });
    
    if (settings.debug) {
      console.log('Settings updated:', updatedSettings);
    }
  };

  return (
    <MantineProvider>
      <Stack p="md" style={{ width: 300 }}>
        <Title order={4}>AI Text Completion</Title>
        
        <TextInput
          label="OpenRouter API Key"
          placeholder="sk-or-v1-..."
          value={settings.apiKey}
          onChange={(e) => updateSettings({ apiKey: e.target.value })}
          type="password"
        />

        <Textarea
          label="About You (AI Context)"
          placeholder="Describe your writing style and preferences..."
          value={settings.userContext}
          onChange={(e) => updateSettings({ userContext: e.target.value })}
          autosize
          minRows={2}
          maxRows={4}
        />

        <Switch
          label="Enable Extension"
          checked={settings.enabled}
          onChange={(e) => updateSettings({ enabled: e.target.checked })}
        />

        <Switch
          label="Debug Mode"
          checked={settings.debug}
          onChange={(e) => updateSettings({ debug: e.target.checked })}
        />

        <Space h="md" />
      </Stack>
    </MantineProvider>
  );
}

ReactDOM.render(<Popup />, document.getElementById('root')); 