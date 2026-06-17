import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import type { Minor } from '../../lib/events'
import { formatPhone } from '../../lib/phone'

interface Props {
  errors: Record<string, string>
}

export default function Step1Personal({ errors }: Props) {
  const { formData, setFormData } = useAppStore()
  const { t } = useTranslation()

  const field = (
    key: keyof typeof formData,
    label: string,
    type = 'text',
    placeholder = '',
    format?: (v: string) => string
  ) => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type}
        value={formData[key] as string}
        onChange={(e) => setFormData({ [key]: format ? format(e.target.value) : e.target.value })}
        placeholder={placeholder}
        className={`form-input ${errors[key] ? 'invalid' : ''}`}
      />
      {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
    </div>
  )

  const addMinor = () =>
    setFormData({ minors: [...formData.minors, { firstName: '', lastName: '', dob: '' }] })

  const removeMinor = (index: number) =>
    setFormData({ minors: formData.minors.filter((_, i) => i !== index) })

  const updateMinor = (index: number, patch: Partial<Minor>) =>
    setFormData({
      minors: formData.minors.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    })

  const minorField = (
    index: number,
    key: keyof Minor,
    label: string,
    type = 'text'
  ) => {
    const errKey = `minor${index}${key.charAt(0).toUpperCase()}${key.slice(1)}`
    return (
      <div>
        <label className="form-label">{label}</label>
        <input
          type={type}
          value={formData.minors[index][key]}
          onChange={(e) => updateMinor(index, { [key]: e.target.value })}
          className={`form-input ${errors[errKey] ? 'invalid' : ''}`}
        />
        {errors[errKey] && <p className="text-red-500 text-xs mt-1">{errors[errKey]}</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="card-verse">{t.s1Verse}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('firstName', t.firstName)}
        {field('lastName', t.lastName)}
        {field('email', t.email, 'email', 'you@example.com')}
        {field('phone', t.phone, 'tel', '(555) 123-4567', formatPhone)}
        {field('dob', t.dob, 'date')}
      </div>

      {/* Minors — register and pay for children as their guardian */}
      <div className="mt-6 pt-5 border-t border-black/8">
        <h3 className="font-semibold text-sm text-slate-900">{t.minorsTitle}</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.minorsHint}</p>

        {formData.minors.map((_, i) => (
          <div key={i} className="mt-4 rounded-xl border border-black/8 bg-[#f8fbfe] px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-glacier">
                {t.minorLabel} {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeMinor(i)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                ✕ {t.removeMinor}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {minorField(i, 'firstName', t.minorFirstName)}
              {minorField(i, 'lastName', t.minorLastName)}
              <div className="sm:col-span-2">
                {minorField(i, 'dob', t.minorDob, 'date')}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addMinor}
          className="mt-4 text-sm font-semibold text-deep-sky hover:text-alpine transition-colors"
        >
          {t.addMinor}
        </button>
      </div>
    </div>
  )
}
