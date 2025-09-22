import { useState, useCallback, useEffect, useRef } from 'react';
import type { AppSettings, ChatMessage, FailedStepPayload, Conversation } from '../types';
import { MessageSender, MessagePurpose, DiscussionMode, ApiProvider } from '../types';
import { generateResponse } from '../services/apiService';
import { applyNotepadModifications, parseAIResponse, generateUUID } from '../utils/appUtils';
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

export const useChatLogic = ({ initialNotepadContent }: ChatLogicProps) => {
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [failedStepInfo, setFailedStepInfo] = useState<FailedStepPayload | null>(null);
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const abortControllerRef = useRef<AbortController | null>(null);
    const prevInitialNotepadContent = useRef<string>(initialNotepadContent);
    
    const createNewConversation = useCallback((): Conversation => ({
        id: generateUUID(),
        title: "New Chat",
        createdAt: new Date().toISOString(),
        discussionLog: [],
        notepadContent: initialNotepadContent,
    }), [initialNotepadContent]);

    // Effect for initial load
    useEffect(() => {
        if (!currentConversation) {
            setCurrentConversation(createNewConversation());
        }
    }, [createNewConversation, currentConversation]);

    // Effect to handle language changes for the initial notepad content
    useEffect(() => {
        // If the notepad content matches the *previous* default text, it means it's unmodified.
        // In this case, we can safely update it to the new default text for the new language.
        if (
            currentConversation &&
            currentConversation.notepadContent === prevInitialNotepadContent.current &&
            currentConversation.notepadContent !== initialNotepadContent // Avoids redundant updates
        ) {
            setCurrentConversation(c => c ? { ...c, notepadContent: initialNotepadContent } : null);
        }
        // Update the ref for the next comparison.
        prevInitialNotepadContent.current = initialNotepadContent;
    }, [initialNotepadContent, currentConversation]);

    const discussionLog = currentConversation?.discussionLog || [];
    const notepadContent = currentConversation?.notepadContent || '';

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
            id: generateUUID(),
            timestamp: new Date().toISOString(),
        };

        setCurrentConversation(convo => {
            if (!convo) return null;
            
            const isFirstUserMessage = convo.discussionLog.length === 0 && message.sender === MessageSender.User;
            const newTitle = isFirstUserMessage ? message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '') : convo.title;

            const updatedConvo = {
                ...convo,
                discussionLog: [...convo.discussionLog.filter(m => m.text !== '...'), newMessage],
                title: newTitle
            };
            return updatedConvo;
        });

        return newMessage;
    }, []);

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
        
        setCurrentConversation(convo => {
            if (!convo) return null;
            return {
                ...convo,
                notepadContent: newNotepadContent,
                discussionLog: convo.discussionLog.map(msg => 
                    msg.id === messageId 
                    ? { ...msg, text: finalSpokenResponse, durationMs } 
                    : msg
                )
            }
        });

        return { spokenResponse: finalSpokenResponse, newNotepadContent, durationMs, hasFinishTag };
    }, [settings]);


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
                debateLog.push( cognitoMsg );
                
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
                    setCurrentConversation(c => c ? {...c, discussionLog: c.discussionLog.map(m => m.id === cognitoMsg.id ? {...m, text: `Error: ${errorMessage}`, purpose: MessagePurpose.Error } : m)} : null);
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
                    setCurrentConversation(c => c ? {...c, discussionLog: c.discussionLog.map(m => m.id === museMsg.id ? {...m, text: `Error: ${errorMessage}`, purpose: MessagePurpose.Error } : m)} : null);
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
            setCurrentConversation(convo => {
                if (!convo) return null;
                return {
                    ...convo,
                    discussionLog: convo.discussionLog.filter(m => m.text !== '...')
                }
            });
        }
    }, [discussionLog, notepadContent, settings, addMessage, commonAIStepExecution]);
    
    const handleUserSubmit = useCallback((text: string, image?: string) => {
        if (!currentConversation || isLoading) return;
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
    }, [runDebate, isApiKeySet, addMessage, currentConversation, isLoading]);

    const handleRetryFailedStep = useCallback(async () => {
        if (!failedStepInfo) return;
        setIsLoading(true);
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        const { id, prompt, speaker } = failedStepInfo;

        setCurrentConversation(c => c ? {...c, discussionLog: c.discussionLog.map(m => m.id === id ? {...m, text: '...', purpose: speaker === MessageSender.Cognito ? MessagePurpose.CognitoToMuse : MessagePurpose.MuseToCognito } : m)} : null);
        
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
    }, [failedStepInfo, commonAIStepExecution, addMessage, notepadContent]);

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
        setCurrentConversation(createNewConversation());
        setFailedStepInfo(null);
    };



    const updateCurrentNotepadContent = (content: string) => {
        setCurrentConversation(c => c ? { ...c, notepadContent: content } : null);
    };

    return {
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
        updateCurrentNotepadContent,
        cancelGeneration,
    };
};