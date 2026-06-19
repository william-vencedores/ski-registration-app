import { useTranslation } from '../../hooks/useTranslation'

// The medical subset shared by the guardian (FormData) and each minor.
export interface MedicalValues {
  medConditions: 'yes' | 'no'
  conditionDetails: string
  medAllergies: 'yes' | 'no'
  allergyDetails: string
  medMedications: 'yes' | 'no'
  medicationDetails: string
}

type YesNoKey = 'medConditions' | 'medAllergies' | 'medMedications'
type DetailKey = 'conditionDetails' | 'allergyDetails' | 'medicationDetails'

interface Props {
  values: MedicalValues
  onChange: (patch: Partial<MedicalValues>) => void
  // Flat error map shared with the surrounding form; the detail field's error is
  // looked up as `${errorPrefix}${detailKey}` (e.g. 'conditionDetails' for the
  // registrant, 'minor0.conditionDetails' for the first minor).
  errors?: Record<string, string>
  errorPrefix?: string
}

// Whenever a question is answered "yes", the matching detail field is required.
// Returns errors keyed by detail field (unprefixed); callers prefix as needed.
export function getMedicalErrors(
  values: MedicalValues,
  requiredMsg: string
): Partial<Record<DetailKey, string>> {
  const errs: Partial<Record<DetailKey, string>> = {}
  if (values.medConditions === 'yes' && !values.conditionDetails.trim()) errs.conditionDetails = requiredMsg
  if (values.medAllergies === 'yes' && !values.allergyDetails.trim()) errs.allergyDetails = requiredMsg
  if (values.medMedications === 'yes' && !values.medicationDetails.trim()) errs.medicationDetails = requiredMsg
  return errs
}

// The three yes/no medical questions plus their conditional detail fields.
// Reused for the main registrant (Step 4) and for each minor (Step 4 and the
// standalone add-a-minor flow) so the wording and behaviour stay identical.
export default function MedicalQuestions({ values, onChange, errors, errorPrefix = '' }: Props) {
  const { t } = useTranslation()

  const questions: { qKey: YesNoKey; detailKey: DetailKey; question: string; detailLabel: string }[] = [
    { qKey: 'medConditions', detailKey: 'conditionDetails', question: t.medQ1, detailLabel: t.medD1 },
    { qKey: 'medAllergies', detailKey: 'allergyDetails', question: t.medQ2, detailLabel: t.medD2 },
    { qKey: 'medMedications', detailKey: 'medicationDetails', question: t.medQ3, detailLabel: t.medD3 },
  ]

  return (
    <div className="flex flex-col gap-4">
      {questions.map(({ qKey, detailKey, question, detailLabel }) => (
        <div key={qKey} className="border border-black/8 rounded-xl p-4 bg-[#f8fbfe]">
          <p className="text-[13px] font-medium text-slate-700 mb-3">{question}</p>
          <div className="flex gap-2 mb-3">
            {(['yes', 'no'] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ [qKey]: val } as Partial<MedicalValues>)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                  values[qKey] === val
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

          {values[qKey] === 'yes' && (
            <div>
              <label className="form-label">{detailLabel}</label>
              <textarea
                value={values[detailKey]}
                onChange={(e) => onChange({ [detailKey]: e.target.value } as Partial<MedicalValues>)}
                rows={2}
                className={`form-input resize-none ${errors?.[`${errorPrefix}${detailKey}`] ? 'invalid' : ''}`}
              />
              {errors?.[`${errorPrefix}${detailKey}`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`${errorPrefix}${detailKey}`]}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
