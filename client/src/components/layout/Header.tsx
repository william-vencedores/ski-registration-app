import logo from '../../assets/logo.jpeg'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import type { Lang } from '../../lib/i18n'

export default function Header() {
  const { t } = useTranslation()
  const { lang, setLang } = useAppStore()

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-8 py-4 border-b border-white/10 backdrop-blur-xl bg-midnight/55">
      <div className="flex items-center gap-3.5">
        <img
          src={logo}
          alt="Vencedores"
          className="w-12 h-12 rounded-full object-cover shadow-[0_0_20px_rgba(232,184,75,0.4)] flex-shrink-0"
        />
        <div className="leading-none">
          <div className="font-cinzel text-xl tracking-[3px] font-bold text-white">
            VENCEDORES
          </div>
          <div className="text-[10px] tracking-[2px] uppercase text-glacier mt-0.5">
            {t.headerSub}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-white/8 rounded-lg p-1">
        {(['es', 'en'] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
              lang === l
                ? 'bg-glacier text-midnight shadow-[0_2px_8px_rgba(122,184,217,0.4)]'
                : 'text-white/45 hover:text-white/70'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  )
}
