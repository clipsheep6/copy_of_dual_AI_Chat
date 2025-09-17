import { GoogleGenAI } from '@google/genai';
import type { AppSettings } from '../types';

const generateGeminiResponse = async (prompt: string, settings: AppSettings, signal: AbortSignal): Promise<string> => {
    const { apiKey: userApiKey, baseUrl, model, thinkingConfig } = settings.geminiConfig;
    const apiKeyToUse = userApiKey || process.env.API_KEY;
    const modelToUse = model || 'gemini-2.5-flash';

    if (!apiKeyToUse && !baseUrl) { // Need a key unless using a key-less proxy
        throw new Error("Gemini API Key not found. Please set it in settings or as an environment variable.");
    }

    let apiThinkingConfig: { thinkingBudget: number } | undefined = undefined;
    if (thinkingConfig) {
        let budget: number | undefined;
        if (thinkingConfig.mode === 'disabled') {
            budget = 0;
        } else if (thinkingConfig.mode === 'custom' && typeof thinkingConfig.customBudget === 'number') {
            budget = thinkingConfig.customBudget;
        }
        
        if (typeof budget === 'number') {
            apiThinkingConfig = { thinkingBudget: budget };
        }
    }

    if (baseUrl) {
        // Use fetch for custom base URL
        let url = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/v1beta/models/${modelToUse}:generateContent`;
        if (apiKeyToUse) {
            url += (url.includes('?') ? '&' : '?') + `key=${apiKeyToUse}`;
        }
        
        const body: any = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        if (apiThinkingConfig) {
            body.thinkingConfig = apiThinkingConfig;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: 'Could not parse error JSON.' } }));
            throw new Error(`Gemini API Error (via custom URL): ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        // The .text accessor from the SDK is a helper. The actual path is this.
        const text = data.candidates?.[0]?.content?.parts?.map((p: {text?: string}) => p.text).join('') ?? "";
        if (!text && data.promptFeedback?.blockReason) {
             throw new Error(`Response blocked due to: ${data.promptFeedback.blockReason}`);
        }
        if (!text && data.candidates?.[0]?.finishReason === 'SAFETY') {
            throw new Error('Response blocked due to safety settings.');
        }
        return text;
    } else {
        // Use official SDK
        if (!apiKeyToUse) {
            throw new Error("Gemini API Key not found. Please set it in settings or as an environment variable.");
        }
        const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
        // FIX: The `generateContent` method does not accept an AbortSignal.
        // Cancellation is implemented by racing the API call against a promise that rejects on abort.
        const abortPromise = new Promise<never>((_, reject) => {
            if (signal.aborted) {
                return reject(new DOMException('Aborted by user', 'AbortError'));
            }
            signal.addEventListener('abort', () => {
                reject(new DOMException('Aborted by user', 'AbortError'));
            });
        });

        const responsePromise = ai.models.generateContent({
            model: modelToUse,
            contents: prompt,
            config: apiThinkingConfig ? { thinkingConfig: apiThinkingConfig } : undefined,
        });

        const response = await Promise.race([responsePromise, abortPromise]);

        return response.text;
    }
};

const generateOpenAIResponse = async (prompt: string, settings: AppSettings, signal: AbortSignal): Promise<string> => {
    const { apiKey, baseUrl, model } = settings.openAIConfig;
    if (!apiKey || !baseUrl || !model) {
        throw new Error("OpenAI API Key, Base URL, and Model must be configured.");
    }
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
        }),
        signal,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
};

const generateOllamaResponse = async (prompt: string, settings: AppSettings, signal: AbortSignal): Promise<string> => {
    const { baseUrl, model } = settings.ollamaConfig;
     if (!baseUrl || !model) {
        throw new Error("Ollama Base URL and Model must be configured.");
    }

    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
        }),
        signal,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Ollama API Error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.response || "";
};

export const generateResponse = async (prompt: string, settings: AppSettings, signal: AbortSignal): Promise<string> => {
    try {
        switch (settings.currentProvider) {
            case 'gemini':
                return await generateGeminiResponse(prompt, settings, signal);
            case 'openai':
                return await generateOpenAIResponse(prompt, settings, signal);
            case 'ollama':
                return await generateOllamaResponse(prompt, settings, signal);
            default:
                throw new Error(`Unsupported API provider: ${settings.currentProvider}`);
        }
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            console.log("API request was aborted.");
            // Re-throw so the calling function knows it was an abort
            throw error;
        }
         console.error("Error calling API:", error);
        if (error instanceof Error) {
            throw new Error(`API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the API.");
    }
};

export const fetchAvailableModels = async (settings: AppSettings): Promise<string[]> => {
    try {
        switch (settings.currentProvider) {
            case 'gemini': {
                const { apiKey: userApiKey, baseUrl } = settings.geminiConfig;
                const apiKeyToUse = userApiKey || process.env.API_KEY;

                if (!baseUrl && !apiKeyToUse) {
                    throw new Error("A Gemini API Key is required when not using a custom Base URL. Please provide one in settings.");
                }

                let url = baseUrl 
                    ? `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/v1beta/models`
                    : `https://generativelanguage.googleapis.com/v1beta/models`;

                if (apiKeyToUse && apiKeyToUse !== 'GEMINI_API_KEY') {
                    url += (url.includes('?') ? '&' : '?') + `key=${apiKeyToUse}`;
                }
                
                const response = await fetch(url);

                if (!response.ok) {
                    const errorBody = await response.text().catch(() => "Could not read error body.");
                    if (response.status === 400) {
                        throw new Error(`Invalid API Key or malformed request. Please check your key and Base URL. (Details: ${errorBody})`);
                    }
                    throw new Error(`Failed to fetch models (HTTP ${response.status}): ${errorBody}`);
                }
                
                const data = await response.json();
                return data.models
                   .filter((m: any) => 
                        m.name?.includes('gemini') &&
                        m.supportedGenerationMethods?.includes('generateContent')
                   )
                   .map((m: any) => m.name.replace('models/', ''))
                   .sort();
            }
            case 'openai': {
                const { apiKey, baseUrl } = settings.openAIConfig;
                if (!apiKey || !baseUrl) throw new Error("API Key and Base URL are required.");
                const response = await fetch(`${baseUrl}/v1/models`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch models: ${response.statusText} - ${errorText}`);
                }
                const data = await response.json();
                return data.data.map((model: any) => model.id).sort();
            }
            case 'ollama': {
                const { baseUrl } = settings.ollamaConfig;
                if (!baseUrl) throw new Error("Base URL is required.");
                const response = await fetch(`${baseUrl}/api/tags`);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch models: ${response.statusText} - ${errorText}`);
                }
                const data = await response.json();
                return data.models.map((model: any) => model.name).sort();
            }
            default:
                return [];
        }
    } catch (e) {
        console.error("Fetch models error:", e);
        // Re-throw to be caught by the UI
        throw e;
    }
};