import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';

interface ChatInputProps {
    onSubmit: (text: string, image?: string) => void;
    isLoading: boolean;
    isApiKeySet: boolean;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isLoading, isApiKeySet, disabled = false }) => {
    const { t } = useLocalization();
    const [text, setText] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const finalDisabled = isLoading || !isApiKeySet || disabled;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((text.trim() || image) && !finalDisabled) {
            onSubmit(text.trim(), image || undefined);
            setText('');
            setImage(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        if(e.target) e.target.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
             const file = e.dataTransfer.files[0];
             if (file.type.startsWith('image/')) {
                 const reader = new FileReader();
                 reader.onloadend = () => setImage(reader.result as string);
                 reader.readAsDataURL(file);
             }
        }
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const placeholderText = !isApiKeySet 
        ? t('chatPlaceholderApiKeyMissing') 
        : disabled
        ? t('chatPlaceholderAgreementMissing')
        : t('chatPlaceholder');

    return (
        <form onSubmit={handleSubmit} className="relative" onDrop={onDrop} onDragOver={onDragOver}>
            <div className={`flex flex-col border border-gray-600 rounded-lg bg-gray-700/50 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow ${finalDisabled ? 'opacity-60' : ''}`}>
                {image && (
                    <div className="relative p-2">
                        <img src={image} alt="Preview" className="max-h-32 rounded-md object-contain" />
                        <button
                            type="button"
                            onClick={() => setImage(null)}
                            className="absolute top-3 right-3 bg-black/50 p-1 rounded-full text-white hover:bg-black/80"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={placeholderText}
                    className="w-full bg-transparent p-3 resize-none focus:outline-none placeholder-gray-400 disabled:opacity-50"
                    rows={Math.min(10, text.split('\n').length + 1)}
                    disabled={finalDisabled}
                />
            </div>
            <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={finalDisabled}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
                    aria-label="Attach file"
                >
                    <Paperclip size={20} />
                </button>
                <button
                    type="submit"
                    disabled={finalDisabled || (!text.trim() && !image)}
                    className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                    aria-label="Send message"
                >
                    <Send size={20} />
                </button>
            </div>
        </form>
    );
};
