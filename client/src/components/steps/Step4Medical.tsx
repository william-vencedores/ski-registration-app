import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import type { Minor } from '../../lib/events'
import MedicalQuestions from './MedicalQuestions'

interface Props {
  errors: Record<string, string>
}

export default function Step4Medical({ errors }: Props) {
  const { formData, setFormData } = useAppStore()
  const { t } = useTranslation()

  const updateMinor = (index: number, patch: Partial<Minor>) =>
    setFormData({
      minors: formData.minors.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    })

  return (
    <div className="flex flex-col gap-5">
      <div className="card-verse">{t.s4Verse}</div>

      {/* Registrant's own medical info */}
      <MedicalQuestions values={formData} onChange={(patch) => setFormData(patch)} errors={errors} />

      {/* One medical section per minor the guardian is bringing */}
      {formData.minors.map((minor, i) => (
        <div key={i} className="pt-4 border-t border-black/8">
          <p className="text-xs font-semibold uppercase tracking-wider text-glacier mb-3">
            {t.minorLabel} {i + 1}
            {minor.firstName.trim() ? ` · ${minor.firstName.trim()}` : ''}
          </p>
          <MedicalQuestions
            values={minor}
            onChange={(patch) => updateMinor(i, patch)}
            errors={errors}
            errorPrefix={`minor${i}.`}
          />
        </div>
      ))}
    </div>
  )
}
