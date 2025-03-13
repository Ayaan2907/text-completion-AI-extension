import type { Settings } from '../types';

export class AIService {
  private settings: Settings;
  private pageContext: string = '';

  constructor(settings: Settings) {
    this.settings = settings;
    // this.pageContext = pageContext;
  }

  public updateSettings(newSettings: Settings) {
    this.settings = newSettings;
  }

  public updatePageContext(newContext: string) {
    this.pageContext = newContext;
  }

  public async getPrediction(text: string, cursorPos: number, inputContext?: string): Promise<string> {
    if (!this.settings.apiKey || !this.settings.enabled) return '';

    // Get text around cursor (up to 100 chars each side for faster context)
    const beforeText = text.substring(Math.max(0, cursorPos - 100), cursorPos);
    const afterText = text.substring(cursorPos, Math.min(text.length, cursorPos + 100));

    if (this.settings.debug) {
      console.log('📄 Page Context:', this.pageContext);
      console.log('👤 User Context:', this.settings.userContext);
      console.log('🏷️ Input Context:', inputContext);
      console.log('✍️ Input:', beforeText + '|' + afterText);
    }

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-r1:free",
            messages: [
              {
                role: 'system',
                content: `You are a text COMPLETION AI. Complete text naturally based on context. About the user: ${this.settings.userContext}. Current page context: ${this.pageContext}.Input field context: ${inputContext || 'None'}. ONLY respond with the completion text, no explanations or formatting.`
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

      // const response = new Response(JSON.stringify({
      //   choices: [{
      //     message: {
      //       content: "mock prediction"
      //     }
      //   }]
      // }), { 
      //   status: 200,
      //   statusText: 'OK',
      //   headers: { 'Content-Type': 'application/json' }
      // });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (this.settings.debug) {
          console.error('API Error Response:', errorData);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const prediction = data.choices?.[0]?.message?.content?.trim() || '';

      if (this.settings.debug && prediction) {
        console.log('💡 Completion:', prediction);
      }

      return prediction;
    } catch (error) {
      if (this.settings.debug) {
        console.error('❌ API Error:', error);
      }
      return '';
    }
  }
} 