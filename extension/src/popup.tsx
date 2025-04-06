import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  MantineProvider,
  Stack,
  TextInput,
  Textarea,
  Switch,
  Title,
  Paper,
  Text,
  Select,
  Box,
  createTheme,
  rem,
  Divider,
  Button,
  Group,
} from '@mantine/core';
import { MessageSquare, Settings as SettingsIcon, Power } from 'lucide-react';
import { defaultSettings, type Settings, LLM_MODELS } from './types';

const theme = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'sm',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  components: {
    Paper: {
      defaultProps: {
        p: 'md',
        radius: 'sm',
        withBorder: false,
      },
    },
    Title: {
      defaultProps: {
        fw: 500,
      },
    },
    Text: {
      defaultProps: {
        size: 'sm',
      },
    },
  },
});

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
    <MantineProvider theme={theme}>
      <Box style={{ width: 260, maxHeight: 400, overflow: 'auto' }}>
        <Paper>
          <Stack gap={20}>
            {/* Enable Extension Section */}
            <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Button
                variant={settings.enabled ? "filled" : "light"}
                color="violet"
                size="md"
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                leftSection={<Power size={18} />}
                style={{ width: '100%' }}
              >
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </Box>

            <Divider />

            {/* Custom Prompt Section */}
            <Box>
              <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: rem(8), marginBottom: rem(12) }}>
                <Group justify="space-between" align="center">
                  <MessageSquare size={16} strokeWidth={1.5} />
                  <Title order={6}>Custom Prompt</Title>
                </Group>
              </Box>
              <Textarea
                placeholder="Enter your custom prompt here..."
                value={settings.userContext}
                onChange={(e) => updateSettings({ userContext: e.target.value })}
                minRows={3}
                maxRows={3}
                styles={{
                  root: { width: '100%' },
                  wrapper: { width: '100%' },
                  input: {
                    width: '100%',
                    border: '1px solid #e9ecef',
                    borderRadius: rem(4),
                    padding: rem(8),
                    fontSize: rem(13),
                  }
                }}
              />
            </Box>

            <Divider />

            {/* Advanced Settings Section */}
            <Box>
              <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: rem(8), 
                marginBottom: rem(16)
              }}>
                <Group justify="space-between" align="center">
                <SettingsIcon size={16} strokeWidth={1.5} />
                <Title order={6}>Advanced Settings</Title>
                </Group>
              </Box>
              <Stack gap={16}>
                <Group justify="space-between" align="center">
                  <Text fw={500}>Debug Mode</Text>
                  <Switch
                    size="sm"
                    checked={settings.debug}
                    onChange={(e) => updateSettings({ debug: e.target.checked })}
                    color="violet"
                  />
                </Group>
                
                <Group justify="space-between" align="center">
                  <Text fw={500}>Word Mode</Text>
                  <Switch
                    size="sm"
                    checked={settings.wordMode}
                    onChange={(e) => updateSettings({ wordMode: e.target.checked })}
                    color="violet"
                  />
                </Group>

                <Box>
                  <Text fw={500} mb={6}>LLM Model</Text>
                  <Select
                    size="sm"
                    data={LLM_MODELS}
                    value={settings.model.value}
                    onChange={(value) => {
                      const selectedModel = LLM_MODELS.find(m => m.value === value);
                      if (selectedModel) {
                        updateSettings({ model: selectedModel });
                      }
                    }}
                    styles={{
                      input: {
                        border: '1px solid #e9ecef',
                        borderRadius: rem(4),
                      }
                    }}
                  />
                </Box>

                <Box>
                  <Text fw={500} mb={6}>API Key</Text>
                  <TextInput
                    size="sm"
                    type="password"
                    placeholder="••••••••••••"
                    value={settings.apiKey}
                    onChange={(e) => updateSettings({ apiKey: e.target.value })}
                    styles={{
                      input: {
                        border: '1px solid #e9ecef',
                        borderRadius: rem(4),
                      }
                    }}
                  />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </MantineProvider>
  );
}

ReactDOM.render(<Popup />, document.getElementById('root')); 