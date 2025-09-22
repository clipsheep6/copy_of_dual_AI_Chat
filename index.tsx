import React, { useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LocalizationContext, type Language } from './hooks/useLocalization';
import { locales, type Locale } from './i18n/locales';

const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('zh'); // Default to Chinese

    const t = useCallback((key: keyof Locale, replacements?: Record<string, string | number>): string => {
        let translation = locales[language][key] || locales['en'][key] || key;
        if (replacements) {
            Object.entries(replacements).forEach(([placeholder, value]) => {
                translation = translation.replace(`{${placeholder}}`, String(value));
            });
        }
        return translation;
    }, [language]);

    const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

    return (
        <LocalizationContext.Provider value={value}>
            {children}
        </LocalizationContext.Provider>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <LocalizationProvider>
            <App />
        </LocalizationProvider>
    </React.StrictMode>
);
