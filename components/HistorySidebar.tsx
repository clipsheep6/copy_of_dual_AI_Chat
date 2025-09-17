import React, { useState, useRef, useEffect } from 'react';
import { FilePlus2, MessageSquareText, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Conversation } from '../types';
import { useLocalization } from '../hooks/useLocalization';

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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    const handleStartEditing = (convo: Conversation) => {
        setEditingId(convo.id);
        setTempTitle(convo.title);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setTempTitle('');
    };

    const handleConfirmEdit = () => {
        if (editingId && tempTitle.trim()) {
            onRenameConversation(editingId, tempTitle.trim());
        }
        handleCancelEdit();
    };

    const handleDelete = (id: string, title: string) => {
        if (window.confirm(t('deleteConfirmation', { title }))) {
            onDeleteConversation(id);
        }
    };

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
                    {conversations.map((convo) => {
                        const isEditing = editingId === convo.id;
                        const isCurrent = currentConversationId === convo.id;

                        return (
                            <li key={convo.id} className={`relative group ${isLoading ? 'opacity-70' : ''}`}>
                                <div
                                    onClick={() => !isEditing && !isLoading && onSwitchConversation(convo.id)}
                                    className={`w-full text-left flex items-center gap-3 p-2 rounded-md transition-colors text-sm truncate ${isCurrent && !isEditing ? 'bg-indigo-600/50 text-white' : 'hover:bg-gray-700/50 text-gray-300'} ${isEditing ? 'bg-gray-700/50' : ''} ${isLoading || isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                    <MessageSquareText size={16} className="flex-shrink-0" />
                                    {isEditing ? (
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={tempTitle}
                                            onChange={(e) => setTempTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleConfirmEdit();
                                                if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                            onBlur={handleConfirmEdit}
                                            className="flex-grow bg-transparent focus:outline-none ring-1 ring-indigo-500 rounded px-1 -my-0.5"
                                        />
                                    ) : (
                                        <span className="truncate flex-grow">{convo.title}</span>
                                    )}
                                </div>
                                {!isEditing && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-gray-800 rounded-md shadow-lg">
                                        <button onClick={() => handleStartEditing(convo)} disabled={isLoading} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" title={t('rename')}>
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(convo.id, convo.title)} disabled={isLoading} className="p-1.5 text-gray-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed" title={t('delete')}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center bg-gray-800 rounded-md">
                                        <button onClick={handleConfirmEdit} className="p-1.5 text-gray-400 hover:text-green-400" title="Confirm">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={handleCancelEdit} className="p-1.5 text-gray-400 hover:text-red-400" title="Cancel">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </aside>
    );
};