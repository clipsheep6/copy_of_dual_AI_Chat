import React, { useState, useCallback, useEffect } from 'react';

export const useAppUI = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // Calculate initial panel width once, assuming sidebar is open (256px).
    const [panelWidth, setPanelWidth] = useState(() => {
        const sidebarWidth = 256;
        const containerWidth = window.innerWidth - sidebarWidth;
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
            const sidebarWidth = isSidebarOpen ? 256 : 0; // w-64 is 16rem, assuming 1rem = 16px
            const newWidth = e.clientX - sidebarWidth;
            
            const minWidth = 300;
            const containerWidth = window.innerWidth - sidebarWidth;
            const maxWidth = containerWidth - 300; // Leave 300px for the other panel
            
            if (newWidth > minWidth && newWidth < maxWidth) {
                 setPanelWidth(newWidth);
            }
        }
    }, [isResizing, isSidebarOpen]);

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

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    return {
        isSettingsOpen,
        setIsSettingsOpen,
        panelWidth,
        isResizing,
        handleMouseDown,
        isNotepadFullScreen,
        toggleNotepadFullScreen,
        isSidebarOpen,
        toggleSidebar,
    };
};