export interface Locale {
    // App Header
    appName: string;
    apiStatus: string;
    apiKeySet: string;
    apiKeyMissing: string;
    settings: string;
    newChat: string;
    // Panels
    discussionPanelTitle: string;
    notepadPanelTitle: string;
    chatHistory: string;
    // Chat Input
    chatPlaceholderApiKeyMissing: string;
    chatPlaceholder: string;
    stopGeneration: string;
    generationStopped: string;
    // Message Bubble
    errorMessage: string;
    retry: string;
    generationTime: string;
    // Senders
    cognito: string;
    muse: string;
    user: string;
    system: string;
    // Notepad
    preview: string;
    source: string;
    undo: string;
    redo: string;
    copy: string;
    copied: string;
    copyFailed: string;
    fullscreen: string;
    exitFullscreen: string;
    initialNotepadContent: string;
    // Settings Modal
    settingsTitle: string;
    apiProvider: string;
    geminiSettings: string;
    openaiSettings: string;
    ollamaSettings: string;
    apiKey: string;
    apiKeyLoaded: string;
    baseUrl: string;
    baseUrlOptional: string;
    model: string;
    fetchModels: string;
    fetchingModels: string;
    modelInputPlaceholder: string;
    thinkingBudget: string;
    thinkingBudgetDescription: string;
    thinkingDefault: string;
    thinkingDisabled: string;
    thinkingCustom: string;
    thinkingCustomPlaceholder: string;
    thinkingBudgetProInfo: string;
    thinkingBudgetFlashInfo: string;
    thinkingBudgetGeneralInfo: string;
    discussionMode: string;
    aiDriven: string;
    fixedTurns: string;
    maxTurns: string;
    systemPrompts: string;
    cognitoPrompt: string;
    musePrompt: string;
    reset: string;
    cancel: string;
    saveChanges: string;
    // History Sidebar
    rename: string;
    delete: string;
    deleteConfirmation: string;
}

export const locales: { [key: string]: Locale } = {
    en: {
        appName: "Dual AI Chat",
        apiStatus: "API Status:",
        apiKeySet: "API Key is set",
        apiKeyMissing: "API Key is missing",
        settings: "Open settings",
        newChat: "New Chat",
        discussionPanelTitle: "Cognito <=> Muse",
        notepadPanelTitle: "Shared Notepad",
        chatHistory: "Chat History",
        chatPlaceholderApiKeyMissing: "Please set your API key in settings.",
        chatPlaceholder: "Type your message or drop an image...",
        stopGeneration: "Stop Generation",
        generationStopped: "Generation stopped by user.",
        errorMessage: "An error occurred.",
        retry: "Retry",
        generationTime: "{seconds}s",
        cognito: "Cognito",
        muse: "Muse",
        user: "User",
        system: "System",
        preview: "Preview",
        source: "Source",
        undo: "Undo",
        redo: "Redo",
        copy: "Copy",
        copied: "Copied!",
        copyFailed: "Failed!",
        fullscreen: "Fullscreen",
        exitFullscreen: "Exit Fullscreen",
        initialNotepadContent: "### Welcome to the Shared Notepad!\n\nThis is a dynamic workspace where your answer is forged through a debate between two specialized AIs. Here's how they work together:\n\n1.  You pose a question or task.\n2.  **Cognito (The Analyst)** starts by building a logical, structured response based on facts.\n3.  **Muse (The Skeptic)** then challenges Cognito's points, asking critical questions and proposing creative alternatives to ensure no detail is overlooked.\n4.  They debate back and forth, editing and refining the content in this notepad.\n\nThe final text you see here is the product of their collaborative critical thinking—a more thorough and well-rounded answer.",
        settingsTitle: "Settings",
        apiProvider: "API Provider",
        geminiSettings: "Gemini Settings",
        openaiSettings: "OpenAI Compatible Settings",
        ollamaSettings: "Ollama Settings",
        apiKey: "API Key",
        apiKeyLoaded: "Loaded from environment variable",
        baseUrl: "Base URL",
        baseUrlOptional: "Base URL (Optional)",
        model: "Model",
        fetchModels: "Fetch Models",
        fetchingModels: "Fetching...",
        modelInputPlaceholder: "Enter model name",
        thinkingBudget: "Thinking Budget",
        thinkingBudgetDescription: "Controls how much the AI can 'think' before answering. (Gemini 2.5 models only)",
        thinkingDefault: "Default (Dynamic)",
        thinkingDisabled: "Disabled (Faster)",
        thinkingCustom: "Custom Budget",
        thinkingCustomPlaceholder: "e.g., 1024",
        thinkingBudgetProInfo: "For Pro models, the valid range is typically 128-32768. Thinking cannot be disabled.",
        thinkingBudgetFlashInfo: "For Flash models, the valid range is typically 0-24576.",
        thinkingBudgetGeneralInfo: "The valid range for the custom budget depends on the selected model.",
        discussionMode: "Discussion Mode",
        aiDriven: "AI-Driven (ends when AIs agree)",
        fixedTurns: "Fixed Turns",
        maxTurns: "Max turns per AI (e.g., 2 = 4 total)",
        systemPrompts: "System Prompts",
        cognitoPrompt: "Cognito System Prompt",
        musePrompt: "Muse System Prompt",
        reset: "Reset",
        cancel: "Cancel",
        saveChanges: "Save Changes",
        rename: "Rename chat",
        delete: "Delete chat",
        deleteConfirmation: "Are you sure you want to delete '{title}'? This action cannot be undone.",
    },
    zh: {
        appName: "两小儿辩日",
        apiStatus: "API状态:",
        apiKeySet: "API密钥已设置",
        apiKeyMissing: "API密钥缺失",
        settings: "打开设置",
        newChat: "新建聊天",
        discussionPanelTitle: "求是 <=> 诘问",
        notepadPanelTitle: "共享记事本",
        chatHistory: "聊天历史",
        chatPlaceholderApiKeyMissing: "请在设置中填写您的API密钥。",
        chatPlaceholder: "输入消息或拖入图片...",
        stopGeneration: "停止生成",
        generationStopped: "已由用户停止生成。",
        errorMessage: "发生错误。",
        retry: "重试",
        generationTime: "耗时 {seconds}s",
        cognito: "求是",
        muse: "诘问",
        user: "用户",
        system: "系统",
        preview: "预览",
        source: "源码",
        undo: "撤销",
        redo: "重做",
        copy: "复制",
        copied: "已复制!",
        copyFailed: "失败!",
        fullscreen: "全屏",
        exitFullscreen: "退出全屏",
        initialNotepadContent: "### 欢迎来到共享记事本！\n\n这是一个动态的工作空间，您的答案将通过两位专业AI的辩论在此形成。它们的工作流程如下：\n\n1.  您提出一个问题或任务。\n2.  **求是 (The Analyst)** 会首先基于事实构建一个逻辑清晰、结构严谨的回复。\n3.  **诘问 (The Skeptic)** 接着会挑战“求是”的观点，提出批判性问题和创造性想法，确保不遗漏任何细节。\n4.  它们会反复辩论，并在此记事本中共同编辑和完善内容。\n\n您最终看到的文本，就是它们协作式批判性思维的结晶——一个更全面、更周详的答案。",
        settingsTitle: "设置",
        apiProvider: "API 提供商",
        geminiSettings: "Gemini 设置",
        openaiSettings: "OpenAI 兼容设置",
        ollamaSettings: "Ollama 设置",
        apiKey: "API 密钥",
        apiKeyLoaded: "从环境变量加载",
        baseUrl: "基础 URL",
        baseUrlOptional: "基础 URL (可选)",
        model: "模型",
        fetchModels: "获取模型",
        fetchingModels: "获取中...",
        modelInputPlaceholder: "输入模型名称",
        thinkingBudget: "思考预算",
        thinkingBudgetDescription: "控制AI在回答前可以“思考”的程度。（仅限 Gemini 2.5 系列模型）",
        thinkingDefault: "默认 (动态)",
        thinkingDisabled: "禁用 (更快)",
        thinkingCustom: "自定义预算",
        thinkingCustomPlaceholder: "例如 1024",
        thinkingBudgetProInfo: "对于 Pro 模型，有效范围通常是 128-32768。思考功能无法被禁用。",
        thinkingBudgetFlashInfo: "对于 Flash 模型，有效范围通常是 0-24576。",
        thinkingBudgetGeneralInfo: "自定义预算的有效范围取决于所选的模型。",
        discussionMode: "讨论模式",
        aiDriven: "AI驱动 (AI同意后结束)",
        fixedTurns: "固定轮次",
        maxTurns: "每AI最大轮次 (例如 2 = 总共4轮)",
        systemPrompts: "系统提示词",
        cognitoPrompt: "求是 系统提示词",
        musePrompt: "诘问 系统提示词",
        reset: "重置",
        cancel: "取消",
        saveChanges: "保存更改",
        rename: "重命名对话",
        delete: "删除对话",
        deleteConfirmation: "您确定要删除“{title}”吗？此操作无法撤销。",
    }
};