import logo from '../../assets/logo.jpeg'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'

export default function SuccessScreen() {
  const { formData, selectedEvent, confirmationId } = useAppStore()
  const { t, lang } = useTranslation()

  const total = selectedEvent ? selectedEvent.price + selectedEvent.processing : 0
  const eventName = selectedEvent
    ? (lang === 'es' ? selectedEvent.nameEs : selectedEvent.nameEn)
    : ''

  return (
    <div className="text-center py-4 animate-pop-in">
      <img
        src={logo}
        alt="Vencedores"
        className="w-24 h-24 rounded-full object-cover mx-auto mb-4
                   shadow-[0_0_40px_rgba(232,184,75,0.5)] animate-glow-pulse"
      />
      <div className="inline-flex items-center gap-2 bg-pine/10 border border-pine/30
                      rounded-full px-4 py-1.5 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#7ddc9a] shadow-[0_0_8px_rgba(125,220,154,0.8)]" />
        <span className="text-xs font-semibold text-pine-light tracking-wider uppercase">
          {t.successSub}
        </span>
      </div>

      <h2 className="font-cinzel text-3xl font-bold tracking-[5px] text-slate-900 mb-4">
        ✓ {t.successTitle}
      </h2>

      <div className="card-verse text-sm text-left mb-6">{t.successVerse}</div>

      {/* Confirmation details */}
      <div className="bg-[#f8fbfe] rounded-2xl border border-black/8 overflow-hidden mb-6 text-left">
        {[
          { label: t.confEvent, value: eventName },
          { label: t.confName, value: `${formData.firstName} ${formData.lastName}` },
          { label: t.confEmail, value: formData.email },
          { label: t.confConf, value: confirmationId },
          { label: t.confAmount, value: `$${total.toFixed(2)} USD` },
          { label: t.confDate, value: new Date().toLocaleDateString() },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center px-5 py-3 border-b border-black/6 last:border-0">
            <span className="text-[11px] tracking-widest uppercase text-slate-500">{label}</span>
            <span className="font-medium text-sm text-slate-900 text-right max-w-[60%]">{value}</span>
          </div>
        ))}
      </div>

      <p className="font-playfair italic text-slate-500 text-sm leading-relaxed">
        {t.closingWord}
      </p>
    </div>
  )
}
