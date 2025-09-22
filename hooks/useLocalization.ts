import { createContext, useContext } from 'react';
import type { Locale } from '../i18n/locales';

export type Language = 'en' | 'zh';

export interface LocalizationContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof Locale, replacements?: Record<string, string | number>) => string;
}

export const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const useLocalization = () => {
    const context = useContext(LocalizationContext);
    if (!context) {
        throw new Error('useLocalization must be used within a LocalizationProvider');
    }
    return context;
};
