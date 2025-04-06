import type { Settings } from "../types";

export class AIService {
    private settings: Settings;
    private pageContext: string = "";

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

    public async getPrediction(
        text: string,
        cursorPos: number,
        inputContext?: string,
        tabCount?: number
    ): Promise<string> {
        if (!this.settings.apiKey || !this.settings.enabled) return "";

        // Get text around cursor (up to 100 chars each side for faster context)
        const beforeText = text.substring(
            Math.max(0, cursorPos - 100),
            cursorPos
        );
        const afterText = text.substring(
            cursorPos,
            Math.min(text.length, cursorPos + 100)
        );

        // Determine answer length based on tab count
        let answerLength = "single line";
        if (tabCount) {
            if (tabCount >= 4) {
                answerLength = "paragraph";
            } else if (tabCount >= 2) {
                answerLength = "multi line";
            }
        }

        try {
          const prompt = `You are a text completion AI focused exclusively on continuing the user's text naturally. Provide ONLY the continuation text.

          Context:
          * User Background: ${this.settings.userContext}
          * Page Content: ${this.pageContext}
          * Input Field Type: ${inputContext || "None"}
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

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.settings.apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt,
                                    },
                                ],
                            },
                        ],
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Gemini API Error:", {
                    status: response.status,
                    statusText: response.statusText,
                    errorData,
                });
                throw new Error(
                    `API request failed: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json();
            const prediction =
                data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

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
            console.error("AI Service Error:", error);
            return "";
        }
    }
}
