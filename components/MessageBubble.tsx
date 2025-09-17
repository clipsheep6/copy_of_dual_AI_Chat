import React, { useMemo, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { User, BrainCircuit, MessageSquareQuote, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

import type { ChatMessage } from '../types';
import { MessageSender } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface MessageBubbleProps {
    message: ChatMessage;
    onRetry?: () => void;
}

const senderInfo = {
    [MessageSender.User]: { icon: User, color: 'text-white', bgColor: 'bg-indigo-600', align: 'items-end' },
    [MessageSender.Cognito]: { icon: BrainCircuit, color: 'text-blue-300', bgColor: 'bg-blue-900/40', align: 'items-start' },
    [MessageSender.Muse]: { icon: MessageSquareQuote, color: 'text-purple-300', bgColor: 'bg-purple-900/40', align: 'items-start' },
    [MessageSender.System]: { icon: AlertTriangle, color: 'text-red-300', bgColor: 'bg-red-900/50', align: 'items-start' },
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry }) => {
    const { t } = useLocalization();
    const { icon: Icon, color, bgColor, align } = senderInfo[message.sender];

    const isUser = message.sender === MessageSender.User;
    const isLoading = message.text === '...' && !onRetry;
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        if (isLoading) {
            const timer = setInterval(() => {
                const elapsed = (Date.now() - new Date(message.timestamp).getTime()) / 1000;
                setElapsedTime(elapsed);
            }, 100);
            return () => clearInterval(timer);
        }
    }, [isLoading, message.timestamp]);


    const sanitizedHtml = useMemo(() => {
        if (message.text && !isLoading) {
            const rawHtml = marked.parse(message.text, { gfm: true, breaks: true });
            return DOMPurify.sanitize(rawHtml as string);
        }
        return '';
    }, [message.text, isLoading]);

    const senderName = useMemo(() => {
        switch (message.sender) {
            case MessageSender.User: return t('user');
            case MessageSender.Cognito: return t('cognito');
            case MessageSender.Muse: return t('muse');
            case MessageSender.System: return t('system');
            default: return message.sender;
        }
    }, [message.sender, t]);

    return (
        <div className={`flex flex-col ${align}`}>
            <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`p-1.5 rounded-full ${bgColor}`}>
                    <Icon size={16} className={color} />
                </div>
                <span className="font-semibold text-sm">{senderName}</span>
                <span className="text-xs text-gray-400">{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className={`max-w-[85%] md:max-w-[75%] lg:max-w-[70%] p-3 rounded-lg ${bgColor}`}>
                {message.image && (
                     <img src={message.image} alt="User upload" className="max-w-xs max-h-64 rounded-md mb-2 object-contain"/>
                )}
                {isLoading ? (
                    <div className="flex items-center gap-2 text-gray-400 italic">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
                        Thinking... {elapsedTime.toFixed(1)}s
                    </div>
                ) : message.text && (
                    <div
                        className="chat-markdown-content text-white prose prose-sm max-w-none prose-invert"
                        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                    />
                )}
                {message.durationMs !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                        <Clock size={12} />
                        <span>{t('generationTime', { seconds: (message.durationMs / 1000).toFixed(2) })}</span>
                    </div>
                )}
                {onRetry && (
                    <div className="mt-2 pt-2 border-t border-gray-600 flex items-center gap-2">
                        <p className="text-red-400 text-sm">{t('errorMessage')}</p>
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-1.5 px-2 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 rounded-md"
                        >
                            <RefreshCw size={14} />
                            {t('retry')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};