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
import { defaultSettings, type Settings, type SitePrefs, type SitePref } from './types';

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

type GrantState = 'unknown' | 'granted' | 'not-granted' | 'no-tab';

function Popup() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [sitePrefs, setSitePrefs] = useState<SitePrefs>({});
  const [siteHost, setSiteHost] = useState<string | null>(null);
  const [grantState, setGrantState] = useState<GrantState>('no-tab');
  const [testState, setTestState] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['settings', 'sitePrefs'], (result) => {
      if (result.settings) {
        setSettings({ ...defaultSettings, ...result.settings });
      }
      if (result.sitePrefs) {
        setSitePrefs(result.sitePrefs);
      }
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (!url || !url.startsWith('http')) {
        setGrantState('no-tab');
        setSiteHost(null);
        return;
      }
      const origin = new URL(url).origin;
      setSiteHost(new URL(url).host);
      chrome.permissions.getAll((granted) => {
        const hasGrant = (granted.origins ?? []).some(
          (pattern) => pattern.replace(/\/\*$/, '') === origin,
        );
        setGrantState(hasGrant ? 'granted' : 'not-granted');
      });
    });
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    chrome.storage.local.set({ settings: updatedSettings });
  };

  const updateSitePref = (pref: SitePref | 'default') => {
    if (!siteHost) return;
    const next: SitePrefs = { ...sitePrefs };
    if (pref === 'default') {
      delete next[siteHost];
    } else {
      next[siteHost] = pref;
    }
    setSitePrefs(next);
    chrome.storage.local.set({ sitePrefs: next });
  };

  const grantSiteAccess = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url;
    if (!url || !url.startsWith('http')) return;
    const origin = new URL(url).origin;
    const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
    setGrantState(granted ? 'granted' : 'not-granted');
  };

  const testProvider = () => {
    setTesting(true);
    setTestState(null);
    chrome.runtime.sendMessage(
      {
        type: 'TEST_PROVIDER',
        endpoint: settings.apiEndpoint,
        model: settings.model,
        apiKey: settings.apiKey,
      },
      (resp) => {
        setTesting(false);
        setTestState(resp ?? { ok: false, message: 'No response from the extension.' });
      },
    );
  };

  const currentSitePref: SitePref | 'default' = (siteHost && sitePrefs[siteHost]) || 'default';

  return (
    <MantineProvider theme={theme}>
      <Box style={{ width: 280, maxHeight: 480, overflow: 'auto' }}>
        <Paper>
          <Stack gap={20}>
            {/* Enable Extension Section */}
            <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Button
                variant={settings.enabled ? 'filled' : 'light'}
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
                  },
                }}
              />
            </Box>

            <Divider />

            {/* This Site Section */}
            <Box>
              <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: rem(8), marginBottom: rem(12) }}>
                <Title order={6}>This Site</Title>
              </Box>
              {siteHost ? (
                <Stack gap={10}>
                  <Text size="sm" fw={500}>{siteHost}</Text>
                  <Select
                    size="sm"
                    data={[
                      { value: 'default', label: 'Default (auto: legal forms only)' },
                      { value: 'enabled', label: 'Always on' },
                      { value: 'disabled', label: 'Always off' },
                    ]}
                    value={currentSitePref}
                    onChange={(value) => updateSitePref((value as SitePref | 'default') ?? 'default')}
                  />
                  {grantState === 'not-granted' && (
                    <Button size="xs" variant="light" onClick={grantSiteAccess}>
                      Grant access to this site
                    </Button>
                  )}
                  {grantState === 'granted' && (
                    <Text size="xs" c="dimmed">
                      Access granted. Reload the page to apply changes.
                    </Text>
                  )}
                </Stack>
              ) : (
                <Text size="xs" c="dimmed">Open a website to manage drafting assist for it.</Text>
              )}
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
                  <Text fw={500}>Word Mode</Text>
                  <Switch
                    size="sm"
                    checked={settings.wordMode}
                    onChange={(e) => updateSettings({ wordMode: e.target.checked })}
                    color="violet"
                  />
                </Group>

                <Box>
                  <Text fw={500} mb={6}>API Key</Text>
                  <TextInput
                    size="sm"
                    type="password"
                    placeholder="Enter your Gemini API key"
                    value={settings.apiKey}
                    onChange={(e) => updateSettings({ apiKey: e.target.value })}
                    styles={{
                      input: {
                        border: '1px solid #e9ecef',
                        borderRadius: rem(4),
                      },
                    }}
                  />
                  <Text size="xs" c="dimmed" mt={4}>
                    Stored only in this browser (chrome.storage.local) and sent in request headers — never in URLs.
                  </Text>
                </Box>

                <Box>
                  <Text fw={500} mb={6}>API Endpoint</Text>
                  <TextInput
                    size="sm"
                    placeholder="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
                    value={settings.apiEndpoint}
                    onChange={(e) => updateSettings({ apiEndpoint: e.target.value })}
                    styles={{
                      input: {
                        border: '1px solid #e9ecef',
                        borderRadius: rem(4),
                      },
                    }}
                  />
                  <Text size="xs" c="dimmed" mt={4}>
                    Any OpenAI-compatible endpoint works too (e.g. a local server).
                  </Text>
                </Box>

                <Box>
                  <Text fw={500} mb={6}>Model (OpenAI-compatible endpoints)</Text>
                  <TextInput
                    size="sm"
                    placeholder="gemini-3.8-flash"
                    value={settings.model}
                    onChange={(e) => updateSettings({ model: e.target.value })}
                    styles={{
                      input: {
                        border: '1px solid #e9ecef',
                        borderRadius: rem(4),
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Button size="xs" variant="light" loading={testing} onClick={testProvider}>
                    Test connection
                  </Button>
                  {testState && (
                    <Text size="xs" mt={6} c={testState.ok ? 'teal' : 'red'}>
                      {testState.message}
                    </Text>
                  )}
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
