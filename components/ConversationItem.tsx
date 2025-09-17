import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Conversation } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface ConversationItemProps {
    convo: Conversation;
    isCurrent: boolean;
    isLoading: boolean;
    onSwitch: (id: string) => void;
    onDelete: (id: string, title: string) => void;
    onRename: (id: string, newTitle: string) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
    convo,
    isCurrent,
    isLoading,
    onSwitch,
    onDelete,
    onRename,
}) => {
    const { t } = useLocalization();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(convo.title);
    const inputRef = useRef<HTMLInputElement>(null);

    // If the parent component's title for this convo changes (e.g., via AI), update the local state
    useEffect(() => {
        if (!isEditing) {
            setTitle(convo.title);
        }
    }, [convo.title, isEditing]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleStartEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLoading) return;
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setTitle(convo.title); // Reset to original title
    };

    const handleConfirmEdit = () => {
        if (isEditing && title.trim() && title.trim() !== convo.title) {
            onRename(convo.id, title.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirmEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit();
        }
    };
    
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the conversation from being switched
        if(isLoading) return;
        onDelete(convo.id, convo.title);
    };
    
    const handleSwitchClick = () => {
        if (isEditing || isLoading) return;
        onSwitch(convo.id);
    }

    return (
        <li className={`relative group ${isLoading ? 'opacity-70' : ''}`}>
            <div
                onClick={handleSwitchClick}
                className={`w-full text-left flex items-center gap-3 p-2 rounded-md transition-colors text-sm truncate ${isCurrent && !isEditing ? 'bg-indigo-600/50 text-white' : 'hover:bg-gray-700/50 text-gray-300'} ${isEditing ? 'bg-gray-700/50' : ''} ${isLoading || isEditing ? 'cursor-default' : 'cursor-pointer'}`}
            >
                <MessageSquareText size={16} className="flex-shrink-0" />
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleConfirmEdit}
                        className="flex-grow bg-transparent focus:outline-none ring-1 ring-indigo-500 rounded px-1 -my-0.5"
                    />
                ) : (
                    <span className="truncate flex-grow">{convo.title}</span>
                )}
            </div>
            {!isEditing && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-gray-800 rounded-md shadow-lg">
                    <button onClick={handleStartEditing} disabled={isLoading} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50" title={t('rename')}>
                        <Pencil size={14} />
                    </button>
                    <button onClick={handleDeleteClick} disabled={isLoading} className="p-1.5 text-gray-400 hover:text-red-400 disabled:opacity-50" title={t('delete')}>
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
};
