import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

import type { AppSettings, GeminiThinkingConfig } from '../types';
import { DiscussionMode, MessageSender, ApiProvider } from '../types';
import { COGNITO_SYSTEM_PROMPT_HEADER, MUSE_SYSTEM_PROMPT_HEADER } from '../constants';
import { fetchAvailableModels } from '../services/apiService';
import { useLocalization } from '../hooks/useLocalization';


interface SettingsModalProps {
    onClose: () => void;
    settings: AppSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, settings, onSettingsChange }) => {
    const { t } = useLocalization();
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);

    const handleSave = () => {
        onSettingsChange(localSettings);
        onClose();
    };
    
    const resetPrompt = (agent: MessageSender.Cognito | MessageSender.Muse) => {
      const defaultPrompt = agent === MessageSender.Cognito ? COGNITO_SYSTEM_PROMPT_HEADER : MUSE_SYSTEM_PROMPT_HEADER;
      const key = agent === MessageSender.Cognito ? 'cognitoSystemPrompt' : 'museSystemPrompt';
      setLocalSettings(prev => ({ ...prev, [key]: defaultPrompt }));
    };

    const handleFetchModels = async () => {
        if (isFetchingModels) return;
        setIsFetchingModels(true);
        setAvailableModels([]);
        try {
            const models = await fetchAvailableModels(localSettings);
            setAvailableModels(models);
        } catch (error) {
            console.error("Failed to fetch models:", error);
            alert(`Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsFetchingModels(false);
        }
    };

    // Effect to auto-fetch models when provider changes if config is ready
    useEffect(() => {
        setAvailableModels([]); // Clear previous models immediately on provider switch

        const provider = localSettings.currentProvider;
        const config = localSettings;

        // Determine if there's enough information to attempt an automatic fetch
        let canAttemptFetch = false;
        if (provider === ApiProvider.Gemini) {
            // Can fetch if using a proxy OR if a key is available for the official API
            canAttemptFetch = !!(config.geminiConfig.baseUrl || config.geminiConfig.apiKey || process.env.API_KEY);
        } else if (provider === ApiProvider.OpenAI) {
            canAttemptFetch = !!(config.openAIConfig.apiKey && config.openAIConfig.baseUrl);
        } else if (provider === ApiProvider.Ollama) {
            canAttemptFetch = !!config.ollamaConfig.baseUrl;
        }

        if (canAttemptFetch) {
            handleFetchModels();
        }
    }, [localSettings.currentProvider]); // Re-run only when the provider changes

    const handleThinkingConfigChange = (newConfig: Partial<GeminiThinkingConfig>) => {
        setLocalSettings(s => ({
            ...s,
            geminiConfig: {
                ...s.geminiConfig,
                thinkingConfig: {
                    ...(s.geminiConfig.thinkingConfig || { mode: 'default' }),
                    ...newConfig,
                }
            }
        }));
    };

    const renderThinkingBudgetDescription = () => {
        const model = localSettings.geminiConfig.model.toLowerCase();
        if (model.includes('pro')) {
            return t('thinkingBudgetProInfo');
        }
        if (model.includes('flash')) {
            return t('thinkingBudgetFlashInfo');
        }
        return t('thinkingBudgetGeneralInfo');
    };

    const renderProviderSettings = () => {
        switch (localSettings.currentProvider) {
            case ApiProvider.Gemini:
                const thinkingConfig = localSettings.geminiConfig.thinkingConfig || { mode: 'default' };
                return (
                    <>
                        <h3 className="text-lg font-semibold col-span-full">{t('geminiSettings')}</h3>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('apiKey')}</label>
                            <input type="password" placeholder="Uses environment variable if empty" value={localSettings.geminiConfig.apiKey} onChange={(e) => setLocalSettings(s => ({...s, geminiConfig: {...s.geminiConfig, apiKey: e.target.value }}))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('baseUrlOptional')}</label>
                            <input type="text" placeholder="Uses official URL if empty" value={localSettings.geminiConfig.baseUrl} onChange={(e) => setLocalSettings(s => ({...s, geminiConfig: {...s.geminiConfig, baseUrl: e.target.value }}))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                        </div>
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('model')}</label>
                            <div className="flex gap-2">
                                <input list="gemini-models" value={localSettings.geminiConfig.model} onChange={(e) => setLocalSettings(s => ({ ...s, geminiConfig: {...s.geminiConfig, model: e.target.value }}))} placeholder={t('modelInputPlaceholder')} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                                <datalist id="gemini-models">{availableModels.map(m => <option key={m} value={m} />)}</datalist>
                                <button onClick={handleFetchModels} disabled={isFetchingModels} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500 flex items-center gap-2">
                                    {isFetchingModels ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                                    {isFetchingModels ? t('fetchingModels') : t('fetchModels')}
                                </button>
                            </div>
                        </div>
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('thinkingBudget')}</label>
                            <p className="text-xs text-gray-400 mb-2">{t('thinkingBudgetDescription')}</p>
                            <p className="text-xs text-gray-400 mb-2 italic">{renderThinkingBudgetDescription()}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="default" checked={thinkingConfig.mode === 'default'} onChange={() => handleThinkingConfigChange({ mode: 'default' })} className="form-radio text-indigo-600 bg-gray-700 border-gray-600" />
                                    {t('thinkingDefault')}
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="disabled" checked={thinkingConfig.mode === 'disabled'} onChange={() => handleThinkingConfigChange({ mode: 'disabled' })} className="form-radio text-indigo-600 bg-gray-700 border-gray-600" />
                                    {t('thinkingDisabled')}
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="custom" checked={thinkingConfig.mode === 'custom'} onChange={() => handleThinkingConfigChange({ mode: 'custom' })} className="form-radio text-indigo-600 bg-gray-700 border-gray-600" />
                                    {t('thinkingCustom')}
                                </label>
                                {thinkingConfig.mode === 'custom' && (
                                    <input 
                                        type="number" 
                                        value={thinkingConfig.customBudget || ''}
                                        onChange={e => handleThinkingConfigChange({ customBudget: parseInt(e.target.value, 10) || 0 })}
                                        placeholder={t('thinkingCustomPlaceholder')}
                                        className="w-32 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                                        min="0"
                                    />
                                )}
                            </div>
                        </div>
                    </>
                )
            case ApiProvider.OpenAI:
                 return (
                    <>
                        <h3 className="text-lg font-semibold col-span-full">{t('openaiSettings')}</h3>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('apiKey')}</label>
                            <input type="password" placeholder="Enter your OpenAI-compatible key" value={localSettings.openAIConfig.apiKey} onChange={(e) => setLocalSettings(s => ({...s, openAIConfig: {...s.openAIConfig, apiKey: e.target.value }}))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('baseUrl')}</label>
                            <input type="text" placeholder="e.g., https://api.openai.com" value={localSettings.openAIConfig.baseUrl} onChange={(e) => setLocalSettings(s => ({...s, openAIConfig: {...s.openAIConfig, baseUrl: e.target.value }}))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                        </div>
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('model')}</label>
                            <div className="flex gap-2">
                                <input list="openai-models" value={localSettings.openAIConfig.model} onChange={(e) => setLocalSettings(s => ({ ...s, openAIConfig: {...s.openAIConfig, model: e.target.value }}))} placeholder={t('modelInputPlaceholder')} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                                <datalist id="openai-models">{availableModels.map(m => <option key={m} value={m} />)}</datalist>
                                <button onClick={handleFetchModels} disabled={isFetchingModels} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500 flex items-center gap-2">
                                    {isFetchingModels ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                                    {isFetchingModels ? t('fetchingModels') : t('fetchModels')}
                                </button>
                            </div>
                        </div>
                    </>
                )
             case ApiProvider.Ollama:
                 return (
                    <>
                        <h3 className="text-lg font-semibold col-span-full">{t('ollamaSettings')}</h3>
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('baseUrl')}</label>
                            <input type="text" placeholder="e.g., http://localhost:11434" value={localSettings.ollamaConfig.baseUrl} onChange={(e) => setLocalSettings(s => ({...s, ollamaConfig: {...s.ollamaConfig, baseUrl: e.target.value }}))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                        </div>
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('model')}</label>
                            <div className="flex gap-2">
                                <input list="ollama-models" value={localSettings.ollamaConfig.model} onChange={(e) => setLocalSettings(s => ({ ...s, ollamaConfig: {...s.ollamaConfig, model: e.target.value }}))} placeholder={t('modelInputPlaceholder')} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                                <datalist id="ollama-models">{availableModels.map(m => <option key={m} value={m} />)}</datalist>
                                <button onClick={handleFetchModels} disabled={isFetchingModels} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500 flex items-center gap-2">
                                     {isFetchingModels ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                                    {isFetchingModels ? t('fetchingModels') : t('fetchModels')}
                                </button>
                            </div>
                        </div>
                    </>
                )
            default:
                return null;
        }
    }


    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">{t('settingsTitle')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={24} />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-6">
                     {/* API Provider Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('apiProvider')}</label>
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-900 p-1">
                             {(Object.values(ApiProvider)).map(provider => (
                                <button key={provider} onClick={() => setLocalSettings(s => ({ ...s, currentProvider: provider }))} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${localSettings.currentProvider === provider ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                </button>
                             ))}
                        </div>
                    </div>

                    {/* API Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-gray-700 rounded-lg">
                       {renderProviderSettings()}
                    </div>
                    
                    {/* Discussion Mode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('discussionMode')}</label>
                        <div className="flex gap-4">
                             <label className="flex items-center gap-2">
                                <input type="radio" value={DiscussionMode.AIDriven} checked={localSettings.discussionMode === DiscussionMode.AIDriven} onChange={(e) => setLocalSettings(s => ({ ...s, discussionMode: e.target.value as DiscussionMode }))} className="form-radio text-indigo-600 bg-gray-700 border-gray-600"/>
                                {t('aiDriven')}
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" value={DiscussionMode.Fixed} checked={localSettings.discussionMode === DiscussionMode.Fixed} onChange={(e) => setLocalSettings(s => ({ ...s, discussionMode: e.target.value as DiscussionMode }))} className="form-radio text-indigo-600 bg-gray-700 border-gray-600"/>
                                {t('fixedTurns')}
                            </label>
                        </div>
                        {localSettings.discussionMode === DiscussionMode.Fixed && (
                             <div className="mt-3">
                                 <label htmlFor="max-turns" className="block text-sm font-medium text-gray-300 mb-1">{t('maxTurns')}</label>
                                 <input type="number" id="max-turns" min="1" max="10" value={localSettings.maxTurns} onChange={(e) => setLocalSettings(s => ({...s, maxTurns: parseInt(e.target.value, 10)}))} className="w-24 bg-gray-700 border border-gray-600 rounded-md p-2"/>
                             </div>
                        )}
                    </div>

                    {/* System Prompts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                             <div className="flex justify-between items-center mb-2">
                                <label htmlFor="cognito-prompt" className="block text-sm font-medium text-gray-300">{t('cognitoPrompt')}</label>
                                <button onClick={() => resetPrompt(MessageSender.Cognito)} className="text-xs text-indigo-400 hover:underline">{t('reset')}</button>
                             </div>
                             <textarea id="cognito-prompt" rows={8} value={localSettings.cognitoSystemPrompt} onChange={(e) => setLocalSettings(s => ({ ...s, cognitoSystemPrompt: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm font-mono"/>
                        </div>
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="muse-prompt" className="block text-sm font-medium text-gray-300">{t('musePrompt')}</label>
                                 <button onClick={() => resetPrompt(MessageSender.Muse)} className="text-xs text-indigo-400 hover:underline">{t('reset')}</button>
                             </div>
                             <textarea id="muse-prompt" rows={8} value={localSettings.museSystemPrompt} onChange={(e) => setLocalSettings(s => ({ ...s, museSystemPrompt: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm font-mono"/>
                        </div>
                    </div>
                </main>

                <footer className="flex justify-end p-4 border-t border-gray-700 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-gray-700 mr-2">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{t('saveChanges')}</button>
                </footer>
            </div>
        </div>
    );
};