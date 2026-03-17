import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation, translations } from '@/lib/i18n';

export function useTranslation() {
  const { language } = useLanguage();

  return {
    t: (key: keyof typeof translations.en): string => {
      return getTranslation(language, key);
    },
    language,
  };
}
