import React, { useState, useCallback, useEffect } from 'react';

export const useAppUI = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    const [panelWidth, setPanelWidth] = useState(() => {
        const containerWidth = window.innerWidth;
        return Math.max(300, containerWidth / 2);
    });

    const [isResizing, setIsResizing] = useState(false);
    const [isNotepadFullScreen, setIsNotepadFullScreen] = useState(false);
    
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = e.clientX;
            
            const minWidth = 300;
            const containerWidth = window.innerWidth;
            const maxWidth = containerWidth - 300; // Leave 300px for the other panel
            
            if (newWidth > minWidth && newWidth < maxWidth) {
                 setPanelWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    const toggleNotepadFullScreen = () => {
        setIsNotepadFullScreen(prev => !prev);
    };

    return {
        isSettingsOpen,
        setIsSettingsOpen,
        panelWidth,
        isResizing,
        handleMouseDown,
        isNotepadFullScreen,
        toggleNotepadFullScreen,
    };
};