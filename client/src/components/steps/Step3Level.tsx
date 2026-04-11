import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'

interface Props {
  errors: Record<string, string>
}

export default function Step3Level({ errors }: Props) {
  const { formData, setFormData, isReturningUser } = useAppStore()
  const { t } = useTranslation()

  const previousSkillName = isReturningUser && formData.skillLevel
    ? t.skills.find(s => s.value === formData.skillLevel)?.name
    : null

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="form-label">{t.skillLabel}</label>
        {previousSkillName && (
          <p className="text-glacier text-xs mb-2">
            {t.returningSkillNote} <strong>{previousSkillName}</strong>. {t.returningSkillUpdate}
          </p>
        )}
        {errors.skillLevel && <p className="text-red-500 text-xs mb-2">{errors.skillLevel}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {t.skills.map((skill) => (
            <button
              key={skill.value}
              type="button"
              onClick={() => setFormData({ skillLevel: skill.value })}
              className={`skill-card ${formData.skillLevel === skill.value ? 'selected' : ''}`}
            >
              <div className="text-2xl mb-1">{skill.icon}</div>
              <div className="font-semibold text-[13px] text-slate-900">{skill.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{skill.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">{t.dietaryLabel}</label>
        <textarea
          value={formData.dietary}
          onChange={(e) => setFormData({ dietary: e.target.value })}
          placeholder={t.dietaryPh}
          rows={3}
          className="form-input resize-none"
        />
      </div>
    </div>
  )
}
