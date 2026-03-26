import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import type { FormData } from '../../lib/events'

interface Props {
  errors: Record<string, string>
}

type YesNoKey = 'medConditions' | 'medAllergies' | 'medMedications'
type DetailKey = 'conditionDetails' | 'allergyDetails' | 'medicationDetails'

interface MedQuestion {
  qKey: YesNoKey
  detailKey: DetailKey
  question: string
  detailLabel: string
}

export default function Step4Medical({ errors }: Props) {
  const { formData, setFormData } = useAppStore()
  const { t } = useTranslation()

  const questions: MedQuestion[] = [
    { qKey: 'medConditions', detailKey: 'conditionDetails', question: t.medQ1, detailLabel: t.medD1 },
    { qKey: 'medAllergies', detailKey: 'allergyDetails', question: t.medQ2, detailLabel: t.medD2 },
    { qKey: 'medMedications', detailKey: 'medicationDetails', question: t.medQ3, detailLabel: t.medD3 },
  ]

  const toggle = (qKey: YesNoKey, val: 'yes' | 'no') => {
    setFormData({ [qKey]: val } as Partial<FormData>)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card-verse">{t.s4Verse}</div>

      {questions.map(({ qKey, detailKey, question, detailLabel }) => (
        <div key={qKey} className="border border-black/8 rounded-xl p-4 bg-[#f8fbfe]">
          <p className="text-[13px] font-medium text-slate-700 mb-3">{question}</p>
          <div className="flex gap-2 mb-3">
            {(['yes', 'no'] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => toggle(qKey, val)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                  formData[qKey] === val
                    ? val === 'yes'
                      ? 'bg-deep-sky text-white border-deep-sky shadow-[0_4px_12px_rgba(30,91,138,0.3)]'
                      : 'bg-pine text-white border-pine shadow-[0_4px_12px_rgba(26,74,46,0.3)]'
                    : 'bg-white text-slate-500 border-black/10 hover:border-glacier'
                }`}
              >
                {val === 'yes' ? t.medYes : t.medNo}
              </button>
            ))}
          </div>

          {formData[qKey] === 'yes' && (
            <div>
              <label className="form-label">{detailLabel}</label>
              <textarea
                value={formData[detailKey] as string}
                onChange={(e) => setFormData({ [detailKey]: e.target.value })}
                rows={2}
                className="form-input resize-none"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
