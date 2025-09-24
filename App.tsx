
import React, { useMemo, useState, useEffect } from 'react';
import { Settings, BotMessageSquare, BrainCircuit, MessageSquareQuote, FileText, Languages, FilePlus2, Square } from 'lucide-react';

import { ChatInput } from './components/ChatInput';
import { MessageBubble } from './components/MessageBubble';
import { Notepad } from './components/Notepad';
import { SettingsModal } from './components/SettingsModal';
import { InfoSecurityModal } from './components/InfoSecurityModal';
import { useAppUI } from './hooks/useAppUI';
import { useNotepadLogic } from './hooks/useNotepadLogic';
import { useChatLogic } from './hooks/useChatLogic';
import { useLocalization } from './hooks/useLocalization';

const App: React.FC = () => {
    const { t, language, setLanguage } = useLocalization();
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [hasAgreedToSecurity, setHasAgreedToSecurity] = useState(false);

    const handleAgreeToSecurity = () => {
        setShowSecurityModal(false);
        setHasAgreedToSecurity(true);
    };

    const {
        isSettingsOpen,
        setIsSettingsOpen,
        panelWidth,
        isResizing,
        handleMouseDown,
        isNotepadFullScreen,
        toggleNotepadFullScreen,
    } = useAppUI();

    const initialNotepadContent = useMemo(() => t('initialNotepadContent'), [t]);

    const chat = useChatLogic({ initialNotepadContent });

    const notepad = useNotepadLogic(chat.notepadContent, chat.updateCurrentNotepadContent);

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'zh' : 'en');
    };

    return (
        <div className="flex flex-col h-screen bg-[#1a1a1a] text-gray-200 font-sans">
            {showSecurityModal && <InfoSecurityModal onAgree={handleAgreeToSecurity} />}
            <header className="flex items-center justify-between p-3 border-b border-gray-700 shadow-md flex-shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <BotMessageSquare className="text-indigo-400" size={32} />
                     {language === 'zh' ? (
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-xl font-bold text-gray-100">{t('appName')}</h1>
                            <span className="text-sm text-gray-400 font-medium">Dual AI Chat</span>
                        </div>
                    ) : (
                        <h1 className="text-xl font-bold text-gray-100">{t('appName')}</h1>
                    )}
                </div>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{t('apiStatus')}</span>
                        {chat.isApiReady ? (
                             <div className="flex items-center gap-2 px-2 py-1 bg-green-900/50 border border-green-500/30 rounded-full" title={t('apiKeySet')}>
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-semibold capitalize">{chat.activeProvider}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-2 py-1 bg-red-900/50 border border-red-500/30 rounded-full" title={t('apiKeyMissing')}>
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                                <span className="text-xs font-semibold">{t('apiKeyMissing')}</span>
                            </div>
                        )}
                     </div>
                     <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-1.5 p-2 rounded-md hover:bg-gray-700 transition-colors"
                        aria-label="Toggle language"
                    >
                        <Languages size={20} />
                        <span className="text-sm font-semibold uppercase">{language === 'en' ? 'ZH' : 'EN'}</span>
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-md hover:bg-gray-700 transition-colors"
                        aria-label={t('settings')}
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </header>
            
            <div className="flex flex-grow overflow-hidden">
                <main className={`flex-grow flex ${isNotepadFullScreen ? 'flex-col' : 'flex-row'} overflow-hidden`}>
                    <div 
                        className={`flex flex-col ${isNotepadFullScreen ? 'hidden' : ''}`} 
                        style={{ width: `${panelWidth}px`}}
                    >
                        <div className="flex items-center gap-3 p-3 border-b border-gray-700 bg-gray-800/50">
                            <BrainCircuit size={20} className="text-blue-400" />
                            {language === 'zh' ? (
                                <div className="flex items-baseline gap-1.5">
                                    <h2 className="text-lg font-semibold">{t('cognito')}</h2>
                                    <span className="text-xs text-gray-400 font-medium">(Cognito)</span>
                                </div>
                            ) : (
                                <h2 className="text-lg font-semibold">{t('cognito')}</h2>
                            )}
                            <span className="text-gray-400 font-mono text-sm">&lt;=&gt;</span>
                            <MessageSquareQuote size={20} className="text-purple-400" />
                             {language === 'zh' ? (
                                <div className="flex items-baseline gap-1.5">
                                    <h2 className="text-lg font-semibold">{t('muse')}</h2>
                                    <span className="text-xs text-gray-400 font-medium">(Muse)</span>
                                </div>
                            ) : (
                                <h2 className="text-lg font-semibold">{t('muse')}</h2>
                            )}
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {chat.discussionLog.map((msg) => (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    onRetry={
                                      chat.failedStepInfo && chat.failedStepInfo.id === msg.id 
                                      ? chat.handleRetryFailedStep 
                                      : undefined
                                    }
                                />
                            ))}
                        </div>
                        
                        <div className="p-4 border-t border-gray-700">
                           {chat.isLoading ? (
                                <div className="flex justify-center mb-2">
                                    <button
                                        onClick={chat.cancelGeneration}
                                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 hover:bg-red-700/80 rounded-md transition-colors"
                                    >
                                        <Square size={16} />
                                        {t('stopGeneration')}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex justify-center mb-2">
                                    <button
                                        onClick={chat.startNewConversation}
                                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 hover:bg-indigo-600/80 rounded-md transition-colors"
                                        aria-label={t('newChat')}
                                    >
                                        <FilePlus2 size={16}/>
                                        <span>{t('newChat')}</span>
                                    </button>
                                </div>
                            )}
                            <ChatInput
                                onSubmit={chat.handleUserSubmit}
                                isLoading={chat.isLoading}
                                isApiReady={chat.isApiReady}
                                disabled={!hasAgreedToSecurity}
                            />
                            <div className="text-center text-xs text-gray-400 mt-2">
                                <label className={`flex items-center justify-center gap-2 group ${hasAgreedToSecurity ? 'cursor-default' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={hasAgreedToSecurity}
                                        disabled={hasAgreedToSecurity}
                                        onChange={() => {
                                            if (!hasAgreedToSecurity) {
                                                setShowSecurityModal(true);
                                            }
                                        }}
                                        className="form-checkbox h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
                                    />
                                    <span className={!hasAgreedToSecurity ? 'group-hover:underline' : ''}>
                                        {hasAgreedToSecurity ? t('securityCheckboxLabelAgreed') : t('securityCheckboxLabel')}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    {!isNotepadFullScreen && (
                        <div
                            className="w-1.5 cursor-col-resize bg-gray-700 hover:bg-indigo-500 transition-colors"
                            onMouseDown={handleMouseDown}
                        />
                    )}

                    <div className={`flex flex-col flex-grow ${isResizing ? 'pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-3 p-3 border-b border-gray-700 bg-gray-800/50">
                           <FileText size={20} className="text-green-400" />
                           <h2 className="text-lg font-semibold">{t('notepadPanelTitle')}</h2>
                        </div>
                        <Notepad 
                            content={chat.notepadContent}
                            onContentChange={notepad.updateNotepadContent}
                            undo={notepad.undo}
                            redo={notepad.redo}
                            canUndo={notepad.canUndo}
                            canRedo={notepad.canRedo}
                            isFullScreen={isNotepadFullScreen}
                            onToggleFullScreen={toggleNotepadFullScreen}
                        />
                    </div>
                </main>
            </div>


            {isSettingsOpen && (
                <SettingsModal
                    onClose={() => setIsSettingsOpen(false)}
                    settings={chat.settings}
                    onSettingsChange={chat.setSettings}
                />
            )}
        </div>
    );
};

export default App;
