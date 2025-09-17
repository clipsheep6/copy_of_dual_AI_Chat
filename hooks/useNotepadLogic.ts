import { useState, useCallback, useEffect } from 'react';

export const useNotepadLogic = (
    content: string,
    onContentChange: (newContent: string) => void,
) => {
    const [history, setHistory] = useState<string[]>([content]);
    const [historyIndex, setHistoryIndex] = useState<number>(0);

    // Effect to handle external content changes (from AI or conversation switch)
    useEffect(() => {
        // Only update history if the external content is different from the current state
        if (content !== history[historyIndex]) {
            // Add the new content as a new state, erasing the "redo" history
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(content);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    }, [content]);

    // This is called when the user types in the textarea
    const updateNotepadContent = useCallback((newContent: string) => {
        // This function is now only for user-initiated changes,
        // so we call the parent to update the main state.
        // The useEffect above will then handle updating the local history.
        onContentChange(newContent);
    }, [onContentChange]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            onContentChange(history[newIndex]);
        }
    }, [history, historyIndex, onContentChange]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            onContentChange(history[newIndex]);
        }
    }, [history, historyIndex, onContentChange]);

    return {
        updateNotepadContent,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
    };
};