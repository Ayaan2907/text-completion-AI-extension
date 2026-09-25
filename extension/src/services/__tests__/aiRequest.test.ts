import { describe, expect, it } from 'vitest';
import {
  buildPredictionRequest,
  describeApiFailure,
  extractPrediction,
  providerKindForEndpoint,
} from '../ai';

const KEY = 'test-key-abcdef';

describe('buildPredictionRequest', () => {
  it('sends the Google key in the x-goog-api-key header, never in the URL', () => {
    const plan = buildPredictionRequest({
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      apiKey: KEY,
      model: 'gemini-3.8-flash',
      prompt: 'draft a clause',
    });
    expect(plan.kind).toBe('google');
    expect(plan.url).not.toContain(KEY);
    expect(plan.url).not.toContain('key=');
    expect(plan.headers['x-goog-api-key']).toBe(KEY);
    expect(plan.headers['Authorization']).toBeUndefined();
  });

  it('sends the Authorization header for OpenAI-compatible endpoints', () => {
    const plan = buildPredictionRequest({
      endpoint: 'http://127.0.0.1:8788/v1/chat/completions',
      apiKey: KEY,
      model: 'test-model',
      prompt: 'draft a clause',
    });
    expect(plan.kind).toBe('openai-compatible');
    expect(plan.url).not.toContain(KEY);
    expect(plan.headers['Authorization']).toBe(`Bearer ${KEY}`);
    expect(plan.headers['x-goog-api-key']).toBeUndefined();
  });

  it('strips a key a user pasted into the endpoint URL', () => {
    const plan = buildPredictionRequest({
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${KEY}`,
      apiKey: KEY,
      model: 'gemini-3.8-flash',
      prompt: 'x',
    });
    expect(plan.url).not.toContain(KEY);
    expect(plan.url).not.toContain('key=');
    expect(plan.headers['x-goog-api-key']).toBe(KEY);
  });

  it('uses the generateContent body shape for Google', () => {
    const plan = buildPredictionRequest({
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      apiKey: KEY,
      model: 'gemini-3.8-flash',
      prompt: 'x',
    });
    const parsed = JSON.parse(plan.body) as { contents: Array<{ parts: Array<{ text: string }> }> };
    expect(parsed.contents[0].parts[0].text).toBe('x');
  });

  it('uses the chat-completions body shape for OpenAI-compatible endpoints', () => {
    const plan = buildPredictionRequest({
      endpoint: 'http://127.0.0.1:8788/v1/chat/completions',
      apiKey: KEY,
      model: 'test-model',
      prompt: 'x',
    });
    const parsed = JSON.parse(plan.body) as { model: string; messages: Array<{ role: string }> };
    expect(parsed.model).toBe('test-model');
    expect(parsed.messages[0].role).toBe('user');
  });
});

describe('providerKindForEndpoint', () => {
  it('classifies google endpoints', () => {
    expect(providerKindForEndpoint('https://generativelanguage.googleapis.com/v1beta/x')).toBe('google');
  });

  it('classifies openai-compatible endpoints', () => {
    expect(providerKindForEndpoint('https://api.openai.com/v1/chat/completions')).toBe('openai-compatible');
  });

  it('falls back to openai-compatible on a malformed URL', () => {
    expect(providerKindForEndpoint('not-a-url')).toBe('openai-compatible');
  });
});

describe('extractPrediction', () => {
  it('reads the google candidates shape', () => {
    const data = { candidates: [{ content: { parts: [{ text: '  a clause  ' }] } }] };
    expect(extractPrediction(data, 'google')).toBe('a clause');
  });

  it('reads the openai choices shape', () => {
    const data = { choices: [{ message: { content: ' a clause ' } }] };
    expect(extractPrediction(data, 'openai-compatible')).toBe('a clause');
  });

  it('returns empty on unexpected payloads', () => {
    expect(extractPrediction({}, 'google')).toBe('');
    expect(extractPrediction(null, 'openai-compatible')).toBe('');
  });
});

describe('describeApiFailure', () => {
  it('maps auth failures to a key message', () => {
    expect(describeApiFailure(401, 'google')).toMatch(/API key/i);
    expect(describeApiFailure(403, 'openai-compatible')).toMatch(/API key/i);
  });

  it('maps quota failures', () => {
    expect(describeApiFailure(429, 'google')).toMatch(/quota/i);
  });

  it('maps endpoint-not-found for google', () => {
    expect(describeApiFailure(404, 'google')).toMatch(/endpoint/i);
  });

  it('never includes key or content material', () => {
    expect(describeApiFailure(500, 'google')).not.toContain(KEY);
  });
});
