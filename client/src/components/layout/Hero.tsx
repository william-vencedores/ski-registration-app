import logo from '../../assets/logo.jpeg'
import { useTranslation } from '../../hooks/useTranslation'

export default function Hero() {
  const { t } = useTranslation()

  return (
    <div className="text-center px-8 pt-16 pb-10 animate-fade-down">
      <img
        src={logo}
        alt="Vencedores"
        className="w-28 h-28 rounded-full object-cover mx-auto mb-4 animate-glow-pulse
                   shadow-[0_0_40px_rgba(232,184,75,0.5),0_0_0_3px_rgba(232,184,75,0.3)]"
      />
      <p className="font-playfair italic text-sm text-white/65 tracking-wide mb-4 max-w-md mx-auto leading-relaxed">
        {t.heroVerse}
      </p>
      <h1 className="font-cinzel font-bold tracking-[6px] text-white leading-none
                     text-[clamp(38px,7vw,78px)]
                     [text-shadow:0_2px_30px_rgba(74,138,181,0.5)]">
        VENCEDORES
        <br />
        <span className="text-gold-light">{t.heroTitle}</span>
      </h1>
      <p className="font-playfair italic text-base text-white/50 mt-3">
        {t.heroTagline}
      </p>
    </div>
  )
}
