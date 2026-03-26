import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'

interface Props {
  errors: Record<string, string>
}

export default function Step5Documents({ errors }: Props) {
  const { formData, setFormData } = useAppStore()
  const { t } = useTranslation()

  const documents = [
    {
      title: t.liabTitle,
      html: t.liabText,
      accepted: formData.liabilityAccepted,
      acceptLabel: t.liabAccept,
      onToggle: () => setFormData({ liabilityAccepted: !formData.liabilityAccepted }),
    },
    {
      title: t.medTitle,
      html: t.medText,
      accepted: formData.medicalAccepted,
      acceptLabel: t.medAccept,
      onToggle: () => setFormData({ medicalAccepted: !formData.medicalAccepted }),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {errors.waivers && (
        <p className="text-red-500 text-xs font-medium">{errors.waivers}</p>
      )}

      {documents.map((doc, i) => (
        <div key={i} className="waiver-box">
          <div className="waiver-header">
            <span>{doc.title}</span>
          </div>
          <div
            className="waiver-body"
            dangerouslySetInnerHTML={{ __html: doc.html }}
          />
          <label className="waiver-accept cursor-pointer">
            <input
              type="checkbox"
              checked={doc.accepted}
              onChange={doc.onToggle}
              className="w-4 h-4 rounded accent-deep-sky cursor-pointer"
            />
            <span className="text-xs text-slate-600">{doc.acceptLabel}</span>
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
