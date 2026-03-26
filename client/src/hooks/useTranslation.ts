import { useAppStore } from '../lib/store'
import { translations } from '../lib/i18n'

export function useTranslation() {
  const lang = useAppStore((s) => s.lang)
  const t = translations[lang]
  return { t, lang }
}
