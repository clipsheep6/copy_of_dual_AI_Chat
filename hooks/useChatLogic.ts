import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { AppSettings, ChatMessage, FailedStepPayload, Conversation } from '../types';
import { MessageSender, MessagePurpose, DiscussionMode, ApiProvider } from '../types';
import { generateResponse } from '../services/apiService';
import { applyNotepadModifications, parseAIResponse } from '../utils/appUtils';
import { COGNITO_SYSTEM_PROMPT_HEADER, MUSE_SYSTEM_PROMPT_HEADER, DISCUSSION_COMPLETE_TAG, NOTEPAD_INSTRUCTION_PROMPT_PART, AI_DRIVEN_DISCUSSION_INSTRUCTION_PROMPT_PART } from '../constants';

interface ChatLogicProps {
    initialNotepadContent: string;
}

const defaultSettings: AppSettings = {
    currentProvider: ApiProvider.Gemini,
    geminiConfig: {
        apiKey: '', // Will fallback to process.env.API_KEY
        baseUrl: '',
        model: 'gemini-2.5-flash',
        thinkingConfig: {
            mode: 'default',
        }
    },
    openAIConfig: {
        apiKey: '',
        baseUrl: '',
        model: 'gpt-4o',
    },
    ollamaConfig: {
        baseUrl: 'http://localhost:11434',
        model: 'llama3',
    },
    discussionMode: DiscussionMode.AIDriven,
    maxTurns: 2,
    cognitoSystemPrompt: COGNITO_SYSTEM_PROMPT_HEADER,
    museSystemPrompt: MUSE_SYSTEM_PROMPT_HEADER,
};

const CONVERSATIONS_KEY = 'dual-ai-chat-conversations';


export const useChatLogic = ({ initialNotepadContent }: ChatLogicProps) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [failedStepInfo, setFailedStepInfo] = useState<FailedStepPayload | null>(null);
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    const createNewConversation = useCallback((title: string = "New Chat"): Conversation => ({
        id: self.crypto.randomUUID(),
        title,
        createdAt: new Date().toISOString(),
        discussionLog: [],
        notepadContent: initialNotepadContent,
    }), [initialNotepadContent]);

    // Effect for initial load from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CONVERSATIONS_KEY);
            if (saved) {
                const savedConvos: Conversation[] = JSON.parse(saved);
                if (savedConvos.length > 0) {
                    setConversations(savedConvos);
                    setCurrentConversationId(savedConvos[0].id); // Select the most recent one
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to load conversations from localStorage", error);
        }
        // If nothing loaded, start fresh
        const newConvo = createNewConversation();
        setConversations([newConvo]);
        setCurrentConversationId(newConvo.id);
    }, [createNewConversation]);

    // Effect for saving changes to localStorage
    useEffect(() => {
        if (conversations.length > 0) {
            // Sort conversations by date before saving, so the newest is always first
            const sortedConvos = [...conversations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(sortedConvos));
        } else {
             // If all conversations are deleted, we clear the storage.
             // A new one will be created by the state guardian useEffect.
            localStorage.removeItem(CONVERSATIONS_KEY);
        }
    }, [conversations]);

    // State Guardian Effect: Ensures the application is always in a valid state.
    useEffect(() => {
        // Guard 1: If conversations list is empty, create a new one.
        if (conversations.length === 0 && !isLoading) { // Check !isLoading to avoid race conditions during initial load
            const newConvo = createNewConversation();
            setConversations([newConvo]);
            setCurrentConversationId(newConvo.id);
            return; // Exit early
        }

        // Guard 2: If the active conversation ID is invalid or doesn't exist, select a new one.
        const activeConvoExists = conversations.some(c => c.id === currentConversationId);
        if (!activeConvoExists && conversations.length > 0) {
            const sortedConvos = [...conversations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setCurrentConversationId(sortedConvos[0].id);
        }
    }, [conversations, currentConversationId, isLoading, createNewConversation]);

    const currentConversation = useMemo(() => {
        return conversations.find(c => c.id === currentConversationId);
    }, [conversations, currentConversationId]);

    const discussionLog = currentConversation?.discussionLog || [];
    const notepadContent = currentConversation?.notepadContent || '';

    const updateCurrentConversation = useCallback((updater: (convo: Conversation) => Conversation) => {
        setConversations(prev =>
            prev.map(c =>
                c.id === currentConversationId ? updater(c) : c
            )
        );
    }, [currentConversationId]);

    const isApiKeySet = useCallback(() => {
        switch(settings.currentProvider) {
            case ApiProvider.Gemini:
                return !!(settings.geminiConfig.apiKey || process.env.API_KEY);
            case ApiProvider.OpenAI:
                return !!settings.openAIConfig.apiKey;
            case ApiProvider.Ollama:
                return true; // No key needed
            default:
                return false;
        }
    }, [settings]);

    const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
        const newMessage: ChatMessage = {
            ...message,
            id: self.crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };

        const isFirstUserMessage = discussionLog.length === 0 && message.sender === MessageSender.User;
        const newTitle = isFirstUserMessage ? message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '') : currentConversation?.title;

        updateCurrentConversation(convo => {
            const updatedConvo = {
                ...convo,
                // Remove any leftover loading messages before adding the new one
                discussionLog: [...convo.discussionLog.filter(m => m.text !== '...'), newMessage],
                createdAt: new Date().toISOString() // Bump timestamp to move to top
            };
            if (isFirstUserMessage && newTitle) {
                updatedConvo.title = newTitle;
            }
            return updatedConvo;
        });

        return newMessage;
    }, [discussionLog.length, currentConversation?.title, updateCurrentConversation]);

    const commonAIStepExecution = useCallback(async (
        prompt: string, 
        messageId: string,
        currentNotepad: string,
        signal: AbortSignal,
        speaker: MessageSender.Cognito | MessageSender.Muse
    ): Promise<{ spokenResponse: string; newNotepadContent: string; durationMs: number; hasFinishTag: boolean }> => {
        const startTime = Date.now();
        let newNotepadContent = currentNotepad;
        const responseText = await generateResponse(prompt, settings, signal);
        if (signal.aborted) throw new DOMException('Aborted by user', 'AbortError');
        if (!responseText) throw new Error("Empty response from API.");

        const { spokenResponse, notepadActions } = parseAIResponse(responseText);
        const hasFinishTag = responseText.includes(DISCUSSION_COMPLETE_TAG);
        
        let finalSpokenResponse = spokenResponse;
        if (hasFinishTag && !spokenResponse) {
             finalSpokenResponse = `[${speaker} agrees the discussion is complete.]`;
        }


        if (notepadActions.length > 0) {
            newNotepadContent = applyNotepadModifications(currentNotepad, notepadActions);
        }
        
        const durationMs = Date.now() - startTime;
        
        updateCurrentConversation(convo => ({
            ...convo,
            notepadContent: newNotepadContent,
            discussionLog: convo.discussionLog.map(msg => 
                msg.id === messageId 
                ? { ...msg, text: finalSpokenResponse, durationMs } 
                : msg
            )
        }));

        return { spokenResponse: finalSpokenResponse, newNotepadContent, durationMs, hasFinishTag };
    }, [settings, updateCurrentConversation]);


    const runDebate = useCallback(async (userMessage: ChatMessage) => {
        setIsLoading(true);
        setFailedStepInfo(null);
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        let debateLog = [...discussionLog, userMessage];
        let currentNotepad = notepadContent;

        try {
            const totalTurns = settings.discussionMode === DiscussionMode.Fixed ? settings.maxTurns : 10;
            let cognitoSaidFinish = false;
            let museSaidFinish = false;

            for (let i = 0; i < totalTurns; i++) {
                if (signal.aborted) break;

                // --- Cognito's Turn ---
                const cognitoMsg = addMessage({ sender: MessageSender.Cognito, text: '...', purpose: MessagePurpose.CognitoToMuse });
                debateLog.push(cognitoMsg);
                
                const historyForCognito = debateLog.slice(0, -1).map(m => `${m.sender}: ${m.text}`).join('\n');
                let promptCognito = `${settings.cognitoSystemPrompt}\n\n[DISCUSSION HISTORY]\n${historyForCognito}\n\n[USER QUERY]\n${userMessage.text}\n\n${NOTEPAD_INSTRUCTION_PROMPT_PART.replace('{notepadContent}', currentNotepad)}`;
                if(settings.discussionMode === DiscussionMode.AIDriven) promptCognito += `\n${AI_DRIVEN_DISCUSSION_INSTRUCTION_PROMPT_PART}`;
                promptCognito += `\n\nCognito, it's your turn. Address Muse's last point (if any) and continue the analysis. Your Response:`;
                
                try {
                    const { spokenResponse, newNotepadContent, durationMs, hasFinishTag } = await commonAIStepExecution(promptCognito, cognitoMsg.id, currentNotepad, signal, MessageSender.Cognito);
                    currentNotepad = newNotepadContent;
                    debateLog = debateLog.map(m => m.id === cognitoMsg.id ? { ...m, text: spokenResponse, durationMs } : m);
                    if (hasFinishTag) cognitoSaidFinish = true;
                } catch (error) {
                    if ((error as Error).name === 'AbortError') throw error;
                    const speaker = MessageSender.Cognito;
                    console.error(`Error during ${speaker}'s turn:`, error);
                    const errorMessage = error instanceof Error ? error.message : "An unknown API error occurred.";
                    updateCurrentConversation(c => ({...c, discussionLog: c.discussionLog.map(m => m.id === cognitoMsg.id ? {...m, text: `Error: ${errorMessage}`, purpose: MessagePurpose.Error } : m)}));
                    setFailedStepInfo({ id: cognitoMsg.id, prompt: promptCognito, speaker });
                    throw error;
                }

                if (signal.aborted) break;

                // --- Muse's Turn ---
                const museMsg = addMessage({ sender: MessageSender.Muse, text: '...', purpose: MessagePurpose.MuseToCognito });
                debateLog.push(museMsg);
                
                const historyForMuse = debateLog.slice(0, -1).map(m => `${m.sender}: ${m.text}`).join('\n');
                let promptMuse = `${settings.museSystemPrompt}\n\n[DISCUSSION HISTORY]\n${historyForMuse}\n\n[USER QUERY]\n${userMessage.text}\n\n${NOTEPAD_INSTRUCTION_PROMPT_PART.replace('{notepadContent}', currentNotepad)}`;
                if(settings.discussionMode === DiscussionMode.AIDriven) promptMuse += `\n${AI_DRIVEN_DISCUSSION_INSTRUCTION_PROMPT_PART}`;
                promptMuse += `\n\nMuse, it's your turn. Challenge Cognito's last statement. Your Response:`;
                
                 try {
                    const { spokenResponse, newNotepadContent, durationMs, hasFinishTag } = await commonAIStepExecution(promptMuse, museMsg.id, currentNotepad, signal, MessageSender.Muse);
                    currentNotepad = newNotepadContent;
                    debateLog = debateLog.map(m => m.id === museMsg.id ? { ...m, text: spokenResponse, durationMs } : m);
                    if(hasFinishTag) museSaidFinish = true;
                } catch (error) {
                    if ((error as Error).name === 'AbortError') throw error;
                    const speaker = MessageSender.Muse;
                    console.error(`Error during ${speaker}'s turn:`, error);
                    const errorMessage = error instanceof Error ? error.message : "An unknown API error occurred.";
                    updateCurrentConversation(c => ({...c, discussionLog: c.discussionLog.map(m => m.id === museMsg.id ? {...m, text: `Error: ${errorMessage}`, purpose: MessagePurpose.Error } : m)}));
                    setFailedStepInfo({ id: museMsg.id, prompt: promptMuse, speaker });
                    throw error;
                }
                
                if (settings.discussionMode === DiscussionMode.AIDriven && cognitoSaidFinish && museSaidFinish) {
                    addMessage({sender: MessageSender.System, text: "Both AIs have signaled to end the discussion.", purpose: MessagePurpose.SystemNotification});
                    break;
                }
            }
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log("Debate loop aborted by user.");
            } else {
                console.error("Debate loop terminated due to an error.");
                addMessage({ sender: MessageSender.System, text: "The debate was stopped due to an error. You can try to fix it and retry.", purpose: MessagePurpose.Error });
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
            // Clean up any remaining loading messages if the process was stopped
            updateCurrentConversation(convo => ({
                ...convo,
                discussionLog: convo.discussionLog.filter(m => m.text !== '...')
            }));
        }
    }, [discussionLog, notepadContent, settings, addMessage, commonAIStepExecution, updateCurrentConversation]);
    
    const handleUserSubmit = useCallback((text: string, image?: string) => {
        if (!currentConversationId || isLoading) return;
        if (!isApiKeySet()) {
            addMessage({
                sender: MessageSender.System,
                purpose: MessagePurpose.Error,
                text: "API credentials for the current provider are not set. Please check the settings."
            });
            return;
        }
        const userMessage = addMessage({
            text,
            sender: MessageSender.User,
            purpose: MessagePurpose.UserInput,
            image,
        });
        runDebate(userMessage);
    }, [runDebate, isApiKeySet, addMessage, currentConversationId, isLoading]);

    const handleRetryFailedStep = useCallback(async () => {
        if (!failedStepInfo) return;
        setIsLoading(true);
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        const { id, prompt, speaker } = failedStepInfo;

        updateCurrentConversation(c => ({...c, discussionLog: c.discussionLog.map(m => m.id === id ? {...m, text: '...', purpose: speaker === MessageSender.Cognito ? MessagePurpose.CognitoToMuse : MessagePurpose.MuseToCognito } : m)}));
        
        try {
            await commonAIStepExecution(prompt, id, notepadContent, signal, speaker);
            addMessage({ sender: MessageSender.System, text: "Retry successful. The debate may now continue from where it left off, or you can guide it.", purpose: MessagePurpose.SystemNotification });
        } catch (error) {
             if ((error as Error).name !== 'AbortError') {
                addMessage({ sender: MessageSender.System, text: "Retry failed.", purpose: MessagePurpose.Error });
             }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [failedStepInfo, commonAIStepExecution, addMessage, notepadContent, updateCurrentConversation]);

    const cancelGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsLoading(false);
            addMessage({
                sender: MessageSender.System,
                text: "Generation stopped by user.",
                purpose: MessagePurpose.SystemNotification,
            });
        }
    }, [addMessage]);

    const startNewConversation = () => {
        cancelGeneration();
        const newConvo = createNewConversation();
        setConversations(prev => [newConvo, ...prev]);
        setCurrentConversationId(newConvo.id);
        setFailedStepInfo(null);
    };

    const switchConversation = (id: string) => {
        if (id !== currentConversationId) {
            cancelGeneration();
            setCurrentConversationId(id);
            setFailedStepInfo(null);
        }
    };

    const deleteConversation = useCallback((id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
    }, []);

    const renameConversation = (id: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        setConversations(prev =>
            prev.map(c => c.id === id ? { ...c, title: newTitle.trim() } : c)
        );
    };
    
    const updateCurrentNotepadContent = (content: string) => {
        updateCurrentConversation(c => ({ ...c, notepadContent: content }));
    };

    return {
        conversations,
        currentConversationId,
        discussionLog,
        notepadContent,
        isLoading,
        failedStepInfo,
        isApiKeySet: isApiKeySet(),
        settings,
        setSettings,
        handleUserSubmit,
        handleRetryFailedStep,
        startNewConversation,
        switchConversation,
        deleteConversation,
        renameConversation,
        updateCurrentNotepadContent,
        cancelGeneration,
    };
};