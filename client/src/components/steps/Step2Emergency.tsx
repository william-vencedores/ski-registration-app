import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'

interface Props {
  errors: Record<string, string>
}

export default function Step2Emergency({ errors }: Props) {
  const { formData, setFormData } = useAppStore()
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="form-label">{t.emergencyName}</label>
        <input
          type="text"
          value={formData.emergencyName}
          onChange={(e) => setFormData({ emergencyName: e.target.value })}
          className={`form-input ${errors.emergencyName ? 'invalid' : ''}`}
        />
        {errors.emergencyName && <p className="text-red-500 text-xs mt-1">{errors.emergencyName}</p>}
      </div>

      <div>
        <label className="form-label">{t.emergencyPhone}</label>
        <input
          type="tel"
          value={formData.emergencyPhone}
          onChange={(e) => setFormData({ emergencyPhone: e.target.value })}
          placeholder="+1 (555) 000-0000"
          className={`form-input ${errors.emergencyPhone ? 'invalid' : ''}`}
        />
        {errors.emergencyPhone && <p className="text-red-500 text-xs mt-1">{errors.emergencyPhone}</p>}
      </div>

      <div>
        <label className="form-label">{t.emergencyRelation}</label>
        <select
          value={formData.emergencyRelation}
          onChange={(e) => setFormData({ emergencyRelation: e.target.value })}
          className={`form-input ${errors.emergencyRelation ? 'invalid' : ''}`}
        >
          {t.relations.map((r) => (
            <option key={r} value={r === '—' ? '' : r}>{r}</option>
          ))}
        </select>
        {errors.emergencyRelation && <p className="text-red-500 text-xs mt-1">{errors.emergencyRelation}</p>}
      </div>
    </div>
  )
}
