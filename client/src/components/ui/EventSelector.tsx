import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useAppStore } from '../../lib/store'
import { EVENTS, type SkiEvent } from '../../lib/events'

export default function EventSelector() {
  const { t, lang } = useTranslation()
  const { selectedEvent, setSelectedEvent, setCurrentStep } = useAppStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (ev: SkiEvent) => {
    setSelectedEvent(ev)
    setOpen(false)
    setCurrentStep(0)
    // Scroll to form
    setTimeout(() => {
      document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const name = selectedEvent
    ? (lang === 'es' ? selectedEvent.nameEs : selectedEvent.nameEn)
    : t.evChoose
  const meta = selectedEvent
    ? (lang === 'es' ? selectedEvent.metaEs : selectedEvent.metaEn)
    : t.evChooseMeta

  return (
    <div className="px-8 pb-9 max-w-3xl mx-auto w-full animate-fade-up" style={{ animationDelay: '0.15s' }}>
      <p className="text-center text-[11px] tracking-[3px] uppercase text-glacier mb-3">
        {t.evSelectorLabel}
      </p>
      <div ref={ref} className="relative max-w-xl mx-auto">
        {/* Trigger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`w-full flex items-center gap-3.5 px-5 py-4 text-left
            rounded-2xl border-[1.5px] transition-all duration-200
            bg-midnight/78 backdrop-blur-xl text-white
            shadow-[0_8px_30px_rgba(0,0,0,0.3)]
            ${open
              ? 'border-glacier rounded-b-none'
              : 'border-glacier/40 hover:border-glacier hover:shadow-[0_8px_30px_rgba(122,184,217,0.2)]'
            }`}
        >
          <span className="text-2xl flex-shrink-0">
            {selectedEvent ? selectedEvent.icon : '🎿'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px] truncate">{name}</div>
            <div className="text-xs text-glacier mt-0.5 truncate">{meta}</div>
          </div>
          {selectedEvent && (
            <span className="font-cinzel text-base font-semibold text-gold-light flex-shrink-0">
              ${selectedEvent.price}
            </span>
          )}
          <span className={`text-glacier text-xs transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 right-0 z-50 animate-slide-down
            bg-[rgba(8,20,38,0.97)] backdrop-blur-2xl
            border-[1.5px] border-t-0 border-glacier/40
            rounded-b-2xl overflow-hidden
            shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
            {EVENTS.map((ev) => (
              <button
                key={ev.id}
                onClick={() => handleSelect(ev)}
                className={`w-full flex items-center gap-3.5 px-5 py-4 text-left
                  border-b border-white/6 last:border-0 transition-colors duration-150
                  ${selectedEvent?.id === ev.id ? 'bg-glacier/15' : 'hover:bg-glacier/12'}`}
              >
                <span className="text-xl flex-shrink-0">{ev.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    {lang === 'es' ? ev.nameEs : ev.nameEn}
                    {ev.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full
                        bg-pine/50 text-[#7ddc9a] border border-[rgba(125,220,154,0.3)]">
                        {lang === 'es' ? ev.badgeEs : ev.badgeEn}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-glacier mt-0.5">
                    {lang === 'es' ? ev.metaEs : ev.metaEn}
                  </div>
                </div>
                <span className="font-cinzel text-sm text-gold-light flex-shrink-0">
                  ${ev.price}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
