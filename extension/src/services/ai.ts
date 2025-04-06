import type { Settings } from '../types';

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

  public getPageContext(): string {
    return this.pageContext;
  }

  public async getPrediction(text: string, cursorPos: number, inputContext?: string): Promise<string> {
    if (!this.settings.apiKey || !this.settings.enabled) return '';

    // Get text around cursor (up to 100 chars each side for faster context)
    const beforeText = text.substring(Math.max(0, cursorPos - 100), cursorPos);
    const afterText = text.substring(cursorPos, Math.min(text.length, cursorPos + 100));

    try {
      const prompt = `You are a text completion AI, focused on providing *only* the continuation of a user's text.  Your goal is to complete the sentence or phrase, maintaining the original context and style.

Here's the context:
*   **User Information:** ${this.settings.userContext}
*   **Current Page Context:** ${this.pageContext}
*   **Input Field Context:** ${inputContext || 'None'}

The user has typed: "${beforeText}"

**Your Task & Constraints:**
*   **Output ONLY the continuation text.** Do not include any part of the user's original input ("${beforeText}") in your response.
*   **No introductory phrases.** Avoid starting your response with phrases like "The continuation is..." or similar.
*   **Maintain consistency.** Ensure your continuation aligns with the user's context, style, and tone.
*   **Grammatical correctness.** Provide a grammatically correct completion.
*   **Respect formatting.**  Pay attention to capitalization, spacing, and word boundaries. If the last word in the input is incomplete, complete that word for the output. If the input ends with a space, start the response with a space.
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.settings.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const prediction = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      return prediction;

      /* Previous API implementations - Commented out
      // OpenAI/Claude implementation
      const response = await fetch(this.settings.model.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`,
          ...(this.settings.model.value.includes('claude') ? {
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          } : {})
        },
        body: JSON.stringify({
          model: this.settings.model.value,
          max_tokens: 230,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      // OpenRouter implementation
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: `Complete this text naturally: "${beforeText} ". Respond ONLY with the completion text that may fit next in the text.`
            }
          ],
          max_tokens: 230,
          temperature: 0.4,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
          stop: ["\n"],
        }),
      });
      */
    } catch (error) {
      console.error('AI Service Error:', error);
      return '';
    }
  }
} 