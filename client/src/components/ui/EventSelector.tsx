import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useAppStore } from '../../lib/store'
import { useEvents, type SkiEvent } from '../../lib/events'

function badgeClasses(text?: string): string {
  if (text === 'Lleno') return 'bg-red-500/20 text-red-400 border border-red-500/30'
  if (text === 'Últimos Cupos') return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
  return 'bg-pine/50 text-[#7ddc9a] border border-[rgba(125,220,154,0.3)]'
}

function formatDate(date: string): string {
  if (!date) return ''
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', year: 'numeric',
    })
  } catch {
    return date
  }
}

export default function EventSelector() {
  const { t } = useTranslation()
  const { selectedEvent, setSelectedEvent, setCurrentStep } = useAppStore()
  const { events, loading } = useEvents()
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

  const name = selectedEvent ? selectedEvent.name : t.evChoose
  const detail = selectedEvent
    ? [formatDate(selectedEvent.date), selectedEvent.location].filter(Boolean).join(' · ')
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
          disabled={loading}
          className={`w-full flex items-center gap-3.5 px-5 py-4 text-left
            rounded-2xl border-[1.5px] transition-all duration-200
            bg-midnight/78 backdrop-blur-xl text-white
            shadow-[0_8px_30px_rgba(0,0,0,0.3)]
            ${open
              ? 'border-glacier rounded-b-none'
              : 'border-glacier/40 hover:border-glacier hover:shadow-[0_8px_30px_rgba(122,184,217,0.2)]'
            }`}
        >
          <span className="text-2xl flex-shrink-0">🎿</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px] truncate">
              {loading ? 'Loading...' : name}
            </div>
            <div className="text-xs text-glacier mt-0.5 truncate">{loading ? '' : detail}</div>
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
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => !(ev.capacity && ev.spotsLeft === 0) && handleSelect(ev)}
                disabled={!!(ev.capacity && ev.spotsLeft === 0)}
                className={`w-full flex items-center gap-3.5 px-5 py-4 text-left
                  border-b border-white/6 last:border-0 transition-colors duration-150
                  ${ev.capacity && ev.spotsLeft === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                  ${selectedEvent?.id === ev.id ? 'bg-glacier/15' : 'hover:bg-glacier/12'}`}
              >
                <span className="text-xl flex-shrink-0">🎿</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    {ev.name}
                    {ev.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeClasses(ev.badgeText)}`}>
                        {ev.badgeText}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-glacier mt-0.5">
                    {[formatDate(ev.date), ev.location].filter(Boolean).join(' · ')}
                  </div>
                  {ev.capacity ? (
                    <div className={`text-[10px] mt-0.5 ${ev.spotsLeft === 0 ? 'text-red-400' : ev.spotsLeft! <= 5 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {ev.spotsLeft === 0 ? 'Sold out' : `${ev.spotsLeft} spots left`}
                    </div>
                  ) : null}
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
