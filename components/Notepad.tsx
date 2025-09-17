import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Eye, Code, Maximize, Minimize, Clipboard, Undo2, Redo2 } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';

interface NotepadProps {
    content: string;
    onContentChange: (newContent: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isFullScreen: boolean;
    onToggleFullScreen: () => void;
}

export const Notepad: React.FC<NotepadProps> = ({
    content,
    onContentChange,
    undo,
    redo,
    canUndo,
    canRedo,
    isFullScreen,
    onToggleFullScreen,
}) => {
    const { t } = useLocalization();
    const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
    const [copyStatus, setCopyStatus] = useState<'copy' | 'copied' | 'failed'>('copy');

    const renderedHtml = useMemo(() => {
        const rawHtml = marked.parse(content, { gfm: true, breaks: true });
        return DOMPurify.sanitize(rawHtml as string);
    }, [content]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('copy'), 2000);
        }).catch(err => {
            setCopyStatus('failed');
            setTimeout(() => setCopyStatus('copy'), 2000);
        });
    };
    
    const copyButtonText = {
        copy: t('copy'),
        copied: t('copied'),
        failed: t('copyFailed')
    }

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="flex items-center justify-between p-2 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-md">
                    <button
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1 text-sm rounded ${viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}
                    >
                        <Eye size={16} className="inline-block mr-1" /> {t('preview')}
                    </button>
                    <button
                        onClick={() => setViewMode('source')}
                        className={`px-3 py-1 text-sm rounded ${viewMode === 'source' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}
                    >
                        <Code size={16} className="inline-block mr-1" /> {t('source')}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={undo} disabled={!canUndo} className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" title={t('undo')}>
                        <Undo2 size={16} />
                    </button>
                    <button onClick={redo} disabled={!canRedo} className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" title={t('redo')}>
                        <Redo2 size={16} />
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 p-2 rounded hover:bg-gray-700" title={t('copy')}>
                        <Clipboard size={16} />
                        <span className="text-sm">{copyButtonText[copyStatus]}</span>
                    </button>
                    <button onClick={onToggleFullScreen} className="p-2 rounded hover:bg-gray-700" title={isFullScreen ? t('exitFullscreen') : t('fullscreen')}>
                        {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                </div>
            </div>
            <div className="flex-grow overflow-auto">
                {viewMode === 'preview' ? (
                    <div
                        className="p-4 markdown-preview prose prose-sm max-w-none prose-invert"
                        dangerouslySetInnerHTML={{ __html: renderedHtml }}
                    />
                ) : (
                    <textarea
                        value={content}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="w-full h-full p-4 bg-transparent resize-none focus:outline-none font-mono text-sm"
                        spellCheck="false"
                    />
                )}
            </div>
        </div>
    );
};