import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { en, TranslationKeys } from './translations/en'
import { te } from './translations/te'

export type Language = 'en' | 'te'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const LANGUAGE_KEY = 'catering_union_language'
const VALID_LANGUAGES: Language[] = ['en', 'te']

// Get translation from nested object using dot notation
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path
}

// Interpolate parameters into translation string
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  
  return Object.entries(params).reduce((result, [key, value]) => {
    // Handle plural forms: {{s}} becomes 's' if count !== 1, otherwise ''
    if (key === 's' && typeof params.count === 'number') {
      return result.replace(/\{\{s\}\}/g, params.count !== 1 ? 's' : '')
    }
    return result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
  }, text)
}

// Get saved language from localStorage with validation
function getSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (saved && VALID_LANGUAGES.includes(saved as Language)) {
      return saved as Language
    }
  } catch (error) {
    console.error('Error reading language preference:', error)
  }
  return 'en' // Default to English
}

// Save language to localStorage
function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang)
  } catch (error) {
    console.error('Error saving language preference:', error)
  }
}

const translations: Record<Language, TranslationKeys> = {
  en,
  te,
}

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(getSavedLanguage)

  const setLanguage = (lang: Language) => {
    if (VALID_LANGUAGES.includes(lang)) {
      setLanguageState(lang)
      saveLanguage(lang)
      // Update HTML lang attribute for accessibility
      document.documentElement.lang = lang
    }
  }

  // Set initial lang attribute
  useEffect(() => {
    document.documentElement.lang = language
  }, [])

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[language], key)
    return interpolate(translation, params)
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider')
  }
  return context
}
