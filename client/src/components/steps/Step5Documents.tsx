import { useState, useEffect } from 'react'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import { useEventDisclosures, type Disclosure } from '../../lib/events'

interface Props {
  errors: Record<string, string>
}

export default function Step5Documents({ errors }: Props) {
  const { formData, setFormData, selectedEvent, disclosureAcceptances, setDisclosureAcceptances } = useAppStore()
  const { t, lang } = useTranslation()
  const { disclosures: allDisclosures, loading } = useEventDisclosures(selectedEvent?.id)

  // Minor-audience disclosures only apply when the registrant is bringing a minor.
  const hasMinors = formData.minors.length > 0
  const disclosures = allDisclosures.filter((d) => d.audience !== 'minors' || hasMinors)

  // Track which disclosures are accepted locally
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  // Reset accepted state when disclosures change
  useEffect(() => {
    const initial: Record<string, boolean> = {}
    disclosures.forEach((d) => {
      const existing = disclosureAcceptances.find((a) => a.disclosureId === d.id)
      initial[d.id] = !!existing
    })
    setAccepted(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDisclosures, hasMinors, disclosureAcceptances])

  const toggleAcceptance = (disclosure: Disclosure) => {
    const isNowAccepted = !accepted[disclosure.id]
    setAccepted((prev) => ({ ...prev, [disclosure.id]: isNowAccepted }))

    // Update store
    if (isNowAccepted) {
      setDisclosureAcceptances([
        ...disclosureAcceptances.filter((a) => a.disclosureId !== disclosure.id),
        { disclosureId: disclosure.id, version: disclosure.version },
      ])
    } else {
      setDisclosureAcceptances(
        disclosureAcceptances.filter((a) => a.disclosureId !== disclosure.id)
      )
    }

    // Update legacy formData flags for validation compatibility
    // If all required disclosures are accepted, mark both as true
    const allRequired = disclosures.filter((d) => d.required)
    const updatedAccepted = { ...accepted, [disclosure.id]: isNowAccepted }
    const allAccepted = allRequired.every((d) => updatedAccepted[d.id])
    setFormData({ liabilityAccepted: allAccepted, medicalAccepted: allAccepted })
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center py-8 text-slate-400 text-sm">
          {lang === 'es' ? 'Cargando documentos...' : 'Loading documents...'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {errors.waivers && (
        <p className="text-red-500 text-xs font-medium">{errors.waivers}</p>
      )}

      {disclosures.map((disclosure) => (
        <div key={disclosure.id} className="waiver-box">
          <div className="waiver-header">
            <span>{lang === 'es' ? disclosure.titleEs : disclosure.titleEn}</span>
          </div>
          {disclosure.audience === 'minors' && (
            <p className="px-3 pt-2 text-[11px] font-medium text-deep-sky">
              {t.minorWaiverHint}
            </p>
          )}
          <div
            className="waiver-body"
            dangerouslySetInnerHTML={{
              __html: lang === 'es' ? disclosure.contentEs : disclosure.contentEn,
            }}
          />
          <label className="waiver-accept cursor-pointer">
            <input
              type="checkbox"
              checked={!!accepted[disclosure.id]}
              onChange={() => toggleAcceptance(disclosure)}
              className="w-4 h-4 rounded accent-deep-sky cursor-pointer"
            />
            <span className="text-xs text-slate-600">
              {lang === 'es' ? 'He leído y acepto' : 'I have read and accept'}
            </span>
          </label>
        </div>
      ))}

      <div>
        <label className="form-label">{t.sigLabel}</label>
        <input
          type="text"
          value={formData.signature}
          onChange={(e) => setFormData({ signature: e.target.value })}
          placeholder={t.sigPh}
          className={`form-input font-playfair italic text-lg ${errors.signature ? 'invalid' : ''}`}
        />
        {errors.signature && <p className="text-red-500 text-xs mt-1">{errors.signature}</p>}
      </div>
    </div>
  )
}
