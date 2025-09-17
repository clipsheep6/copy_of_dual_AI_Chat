import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import { locales, Locale } from '../i18n/locales';

export type Language = 'en' | 'zh';

interface LocalizationContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof Locale, replacements?: Record<string, string | number>) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

    // FIX: Replaced JSX with React.createElement to be compatible with a .ts file.
    // The original code used JSX syntax which is only valid in .tsx files, causing parsing errors.
    return React.createElement(LocalizationContext.Provider, { value }, children);
};

export const useLocalization = () => {
    const context = useContext(LocalizationContext);
    if (!context) {
        throw new Error('useLocalization must be used within a LocalizationProvider');
    }
    return context;
};
