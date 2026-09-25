import type { Settings } from '../types';

/** Provider style implied by the endpoint host. */
export type ProviderKind = 'google' | 'openai-compatible';

export function providerKindForEndpoint(endpoint: string): ProviderKind {
  try {
    const host = new URL(endpoint).hostname;
    return host.endsWith('.googleapis.com') ? 'google' : 'openai-compatible';
  } catch {
    return 'openai-compatible';
  }
}

export interface PredictionRequestPlan {
  url: string
  headers: Record<string, string>
  body: string
  kind: ProviderKind
}

/**
 * Pure request construction. The API key NEVER appears in the URL:
 *  - Google native endpoints take `x-goog-api-key` — API keys are rejected
 *    when sent as Bearer tokens there (verified against ai.google.dev/api,
 *    2026-09-24);
 *  - OpenAI-compatible endpoints take `Authorization: Bearer`.
 * If a caller pasted a key into the endpoint URL it is stripped defensively.
 */
export function buildPredictionRequest(input: {
  endpoint: string
  apiKey: string
  model: string
  prompt: string
  maxOutputTokens?: number
}): PredictionRequestPlan {
  const parsed = new URL(input.endpoint);
  parsed.searchParams.delete('key');
  parsed.searchParams.delete('api_key');
  const kind = providerKindForEndpoint(input.endpoint);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (kind === 'google') {
    headers['x-goog-api-key'] = input.apiKey;
  } else {
    headers['Authorization'] = `Bearer ${input.apiKey}`;
  }

  const body =
    kind === 'google'
      ? JSON.stringify({
          contents: [{ parts: [{ text: input.prompt }] }],
          ...(input.maxOutputTokens
            ? { generationConfig: { maxOutputTokens: input.maxOutputTokens } }
            : {}),
        })
      : JSON.stringify({
          model: input.model,
          messages: [{ role: 'user', content: input.prompt }],
          max_tokens: input.maxOutputTokens ?? 256,
        });

  return { url: parsed.toString(), headers, body, kind };
}

interface GooglePredictionResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export function extractPrediction(data: unknown, kind: ProviderKind): string {
  if (typeof data !== 'object' || data === null) return '';
  if (kind === 'google') {
    const d = data as GooglePredictionResponse;
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }
  const d = data as OpenAIChatResponse;
  return d.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * Maps provider failures to user-facing messages. Deliberately excludes
 * response bodies so no key or form content can reach the console.
 */
export function describeApiFailure(status: number, kind: ProviderKind): string {
  if (status === 401 || status === 403) {
    return 'Invalid or unauthorized API key — check your key in settings.';
  }
  if (status === 429) {
    return 'Rate limit or quota exceeded for your API key.';
  }
  if (kind === 'google' && status === 404) {
    return 'Model or endpoint not found — check the API endpoint URL in settings.';
  }
  if (status >= 500) {
    return 'Provider is temporarily unavailable. Try again shortly.';
  }
  return `Provider request failed with status ${status}.`;
}

function describeAnswerLength(tabCount?: number): string {
  if (!tabCount) return 'single line';
  if (tabCount >= 4) return 'paragraph';
  if (tabCount >= 2) return 'multi line';
  return 'single line';
}

export class AIService {
  private settings: Settings;
  private pageContext: string = '';

  constructor(settings: Settings) {
    this.settings = settings;
  }

  public updateSettings(newSettings: Settings) {
    this.settings = newSettings;
  }

  public updatePageContext(newContext: string) {
    this.pageContext = newContext;
  }

  private buildPrompt(
    text: string,
    cursorPos: number,
    inputContext?: string,
    tabCount?: number,
  ): string {
    const beforeText = text.substring(Math.max(0, cursorPos - 100), cursorPos);
    const afterText = text.substring(cursorPos, Math.min(text.length, cursorPos + 100));
    const answerLength = describeAnswerLength(tabCount);

    return `You are a text completion AI focused exclusively on continuing the user's text naturally. Provide ONLY the continuation text.

          Context:
          * User Background: ${this.settings.userContext}
          * Page Content: ${this.pageContext}
          * Input Field Type: ${inputContext || 'None'}
          * Desired Length: ${answerLength} words

          Text Before Cursor: "${beforeText}"
          [Cursor Position]
          Text After Cursor: "${afterText}"

          Requirements:
          * Return ONLY the predicted continuation - never repeat "Text before cursor" or "Text after cursor"
          * No introductions or explanations in your response
          * Match the user's style, tone, and context
          * Ensure grammatical correctness
          * Maintain proper formatting (capitalization, spacing)
          * Complete partial words first, then begin with a space for complete words or a new word after spaces
          * Keep completion concise and relevant
          `;
  }

  public async getPrediction(
    text: string,
    cursorPos: number,
    inputContext?: string,
    tabCount?: number,
  ): Promise<string> {
    if (!this.settings.apiKey || !this.settings.enabled) return '';

    const plan = buildPredictionRequest({
      endpoint: this.settings.apiEndpoint,
      apiKey: this.settings.apiKey,
      model: this.settings.model,
      prompt: this.buildPrompt(text, cursorPos, inputContext, tabCount),
    });

    // Failures propagate to the background message handler, which responds
    // with the user-facing message — no silent empty predictions.
    const response = await fetch(plan.url, {
      method: 'POST',
      headers: plan.headers,
      body: plan.body,
    });
    if (!response.ok) {
      throw new Error(describeApiFailure(response.status, plan.kind));
    }
    const data: unknown = await response.json();
    return extractPrediction(data, plan.kind);
  }

  /** Connection test used by the popup. Returns a user-facing result. */
  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.settings.apiKey) {
      return { ok: false, message: 'Enter your API key first.' };
    }
    const plan = buildPredictionRequest({
      endpoint: this.settings.apiEndpoint,
      apiKey: this.settings.apiKey,
      model: this.settings.model,
      prompt: 'Reply with the word OK.',
      maxOutputTokens: 16,
    });
    try {
      const response = await fetch(plan.url, {
        method: 'POST',
        headers: plan.headers,
        body: plan.body,
      });
      if (!response.ok) {
        return { ok: false, message: describeApiFailure(response.status, plan.kind) };
      }
      const data: unknown = await response.json();
      const reply = extractPrediction(data, plan.kind);
      return reply
        ? { ok: true, message: 'Connection OK' }
        : { ok: false, message: 'Provider reachable but returned no content.' };
    } catch {
      return { ok: false, message: 'Could not reach the provider endpoint.' };
    }
  }
}
