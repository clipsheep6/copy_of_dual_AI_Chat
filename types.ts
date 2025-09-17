export enum MessageSender {
    User = 'User',
    Cognito = 'Cognito',
    Muse = 'Muse',
    System = 'System',
}

export enum MessagePurpose {
    UserInput = 'user-input',
    SystemNotification = 'system-notification',
    CognitoToMuse = 'cognito-to-muse',
    MuseToCognito = 'muse-to-cognito',
    FinalAnswer = 'final-answer',
    Error = 'error',
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: MessageSender;
    purpose: MessagePurpose;
    timestamp: string;
    durationMs?: number;
    image?: string; // base64 data URL
}

export interface Conversation {
    id: string;
    title: string;
    createdAt: string;
    discussionLog: ChatMessage[];
    notepadContent: string;
}

export type NotepadAction =
    | { action: 'replace_all'; content: string }
    | { action: 'append'; content: string }
    | { action: 'prepend'; content: string }
    | { action: 'insert'; line: number; content: string }
    | { action: 'replace'; line: number; content: string }
    | { action: 'delete'; line: number }
    | { action: 'search_replace'; find: string; with: string; all: boolean };

export interface FailedStepPayload {
    id: string; // id of the message that failed to generate
    prompt: string;
    speaker: MessageSender.Cognito | MessageSender.Muse;
}

export enum DiscussionMode {
    Fixed = 'fixed',
    AIDriven = 'ai-driven',
}

// New types for multi-provider support
export enum ApiProvider {
    Gemini = 'gemini',
    OpenAI = 'openai',
    Ollama = 'ollama',
}

export interface GeminiThinkingConfig {
  mode: 'default' | 'disabled' | 'custom';
  customBudget?: number;
}

export interface GeminiConfig {
    apiKey: string; // Custom key, fallback to env
    baseUrl: string; // Custom base url
    model: string;
    thinkingConfig?: GeminiThinkingConfig;
}

export interface OpenAIConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
}

export interface OllamaConfig {
    baseUrl: string;
    model: string;
}

export interface ModelConfig { // This is now a generic model definition, not tied to Gemini
    id: string;
    apiName: string;
    displayName: string;
    supportsThinkingConfig?: boolean;
}

export interface AppSettings {
    currentProvider: ApiProvider;
    geminiConfig: GeminiConfig;
    openAIConfig: OpenAIConfig;
    ollamaConfig: OllamaConfig;
    discussionMode: DiscussionMode;
    maxTurns: number;
    cognitoSystemPrompt: string;
    museSystemPrompt: string;
}