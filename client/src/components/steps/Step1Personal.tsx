import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'

interface Props {
  errors: Record<string, string>
}

export default function Step1Personal({ errors }: Props) {
  const { formData, setFormData } = useAppStore()
  const { t } = useTranslation()

  const field = (key: keyof typeof formData, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type}
        value={formData[key] as string}
        onChange={(e) => setFormData({ [key]: e.target.value })}
        placeholder={placeholder}
        className={`form-input ${errors[key] ? 'invalid' : ''}`}
      />
      {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <div>
      <div className="card-verse">{t.s1Verse}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('firstName', t.firstName)}
        {field('lastName', t.lastName)}
        {field('email', t.email, 'email', 'you@example.com')}
        {field('phone', t.phone, 'tel', '+1 (555) 000-0000')}
        {field('dob', t.dob, 'date')}
        {field('city', t.city)}
        <div className="sm:col-span-2">
          {field('state', t.state)}
        </div>
      </div>
    </div>
  )
}
