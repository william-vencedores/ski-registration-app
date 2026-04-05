import logo from '../../assets/logo.jpeg'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'

export default function SuccessScreen() {
  const { formData, selectedEvent, confirmationId, paymentInfo } = useAppStore()
  const { t } = useTranslation()

  const totalPaid = paymentInfo?.totalPaid ?? 0
  const totalOwed = paymentInfo?.totalOwed ?? 0
  const isPartial = totalOwed > 0 && totalPaid < totalOwed
  const remaining = isPartial ? totalOwed - totalPaid : 0

  const eventName = selectedEvent ? selectedEvent.name : ''

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
          { label: isPartial ? 'Deposit Paid' : t.confAmount, value: `$${totalPaid.toFixed(2)} USD` },
          ...(isPartial ? [{ label: 'Remaining Balance', value: `$${remaining.toFixed(2)} USD` }] : []),
          { label: t.confDate, value: new Date().toLocaleDateString() },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center px-5 py-3 border-b border-black/6 last:border-0">
            <span className="text-[11px] tracking-widest uppercase text-slate-500">{label}</span>
            <span className="font-medium text-sm text-slate-900 text-right max-w-[60%]">{value}</span>
          </div>
        ))}
      </div>

      {isPartial && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-6 text-left">
          Your spot is reserved with a deposit. The remaining balance of <strong>${remaining.toFixed(2)}</strong> is due before the event.
        </div>
      )}

      <p className="font-playfair italic text-slate-500 text-sm leading-relaxed">
        {t.closingWord}
      </p>
    </div>
  )
}
