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
    console.log('📝 Updating AI service page context:', newContext)
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

    if (this.settings.debug) {
      console.log('📄 Page Context:', this.pageContext);
      console.log('👤 User Context:', this.settings.userContext);
      console.log('🏷️ Input Context:', inputContext);
      console.log('✍️ Input:', beforeText + '|' + afterText);
    }

    try {
      // TEMP MOCK API RESPONSE - REMOVE FOR PRODUCTION
      console.log('🤖 MOCK API CALL (TEMP) - Remove for production')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
      const mockResponses = {
        'gpt-4': 'This is a mock completion from GPT-4. The page context was: ' + this.pageContext,
        'claude': 'This is a mock completion from Claude. The input context was: ' + inputContext,
        'default': 'This is a default mock completion. User context: ' + this.settings.userContext
      }
      const mockPrediction = mockResponses[this.settings.model.value as keyof typeof mockResponses] || mockResponses.default
      console.log('💡 MOCK Completion:', mockPrediction)
      return mockPrediction
      // END TEMP MOCK - Remove above and uncomment below for production

      /* Original API call - Commented out for testing
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
              content: `You are a text completion AI. Based on these contexts:
              - About the user: ${this.settings.userContext}
              - Current page: ${this.pageContext}
              - Input field: ${inputContext || 'None'}
              
              The user has typed: "${beforeText}"
              
              Continue this text naturally. IMPORTANT:
              - ONLY provide the continuation text that comes AFTER the user's input
              - DO NOT repeat any part of the input text
              - DO NOT add quotes or explanations
              - Keep the style and context consistent
              - Take care of word end, spaces, if the word ended start with a space`
            }
          ]
        })
      });

      //  openrouter
      // const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${this.settings.apiKey}`,
      //   },
      //   body: JSON.stringify({
      //     model: "gpt-4o-mini",
      //     messages: [
      //       {
      //         role: 'system',
      //         content: `You are a text COMPLETION AI. Complete text naturally based on context. About the user: ${this.settings.userContext}. Current page context: ${this.pageContext}.Input field context: ${inputContext || 'None'}. ONLY respond with the completion text, no explanations or formatting.`
      //       },
      //       {
      //         role: 'user',
      //         content: `Complete this text naturally: "${beforeText} ". Respond ONLY with the completion text that may fit next in the text.`
      //       }
      //     ],
      //     max_tokens: 230,
      //     temperature: 0.4,
      //     presence_penalty: 0.1,
      //     frequency_penalty: 0.1,
      //     stop: ["\n"],
      //   }),
      // });
      

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (this.settings.debug) {
          console.error('API Error Response:', errorData);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const prediction = data.content?.[0]?.text?.trim() || '';

      if (this.settings.debug && prediction) {
        console.log('💡 Completion:', prediction);
      }

      return prediction;
      */
    } catch (error) {
      if (this.settings.debug) {
        console.error('❌ API Error:', error);
      }
      return '';
    }
  }
} 