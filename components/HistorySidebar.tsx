import React, { useCallback } from 'react';
import { FilePlus2 } from 'lucide-react';
import type { Conversation } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { ConversationItem } from './ConversationItem';

interface HistorySidebarProps {
    isOpen: boolean;
    conversations: Conversation[];
    currentConversationId: string | null;
    isLoading: boolean;
    onNewConversation: () => void;
    onSwitchConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    onRenameConversation: (id: string, newTitle: string) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
    isOpen,
    conversations,
    currentConversationId,
    isLoading,
    onNewConversation,
    onSwitchConversation,
    onDeleteConversation,
    onRenameConversation,
}) => {
    const { t } = useLocalization();

    const handleDelete = useCallback((id: string, title: string) => {
        if (window.confirm(t('deleteConfirmation', { title }))) {
            onDeleteConversation(id);
        }
    }, [t, onDeleteConversation]);

    return (
        <aside className={`bg-gray-900/70 border-r border-gray-700 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-0'
            } overflow-hidden`}>
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
                <h2 className="text-lg font-semibold whitespace-nowrap">{t('chatHistory')}</h2>
                <button
                    onClick={onNewConversation}
                    className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('newChat')}
                    disabled={isLoading}
                >
                    <FilePlus2 size={20} />
                </button>
            </div>
            <div className="flex-grow overflow-y-auto">
                <ul className="p-2 space-y-1">
                    {conversations.map((convo) => (
                       <ConversationItem
                            key={convo.id}
                            convo={convo}
                            isCurrent={currentConversationId === convo.id}
                            isLoading={isLoading}
                            onSwitch={onSwitchConversation}
                            onDelete={handleDelete}
                            onRename={onRenameConversation}
                       />
                    ))}
                </ul>
            </div>
        </aside>
    );
};