import { useState } from 'react'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import { sendVerificationCode, verifyCode } from '../../lib/returningApi'

type Phase = 'choice' | 'email' | 'code'

export default function ReturningUserPrompt() {
  const { setFormData, setIsReturningUser, setCurrentStep } = useAppStore()
  const { t } = useTranslation()

  const [phase, setPhase] = useState<Phase>('choice')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNew = () => {
    setIsReturningUser(false)
    setCurrentStep(1)
  }

  const handleSendCode = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await sendVerificationCode(email.trim())
      setPhase('code')
    } catch {
      setError('Something went wrong, please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await verifyCode(email.trim(), code.trim())
      if (result.verified && result.profile) {
        setFormData(result.profile)
        setIsReturningUser(true)
        setCurrentStep(1)
      } else {
        const errorKey = result.error as string
        if (errorKey === 'code_expired') setError(t.returningExpiredCode)
        else if (errorKey === 'max_attempts') setError(t.returningMaxAttempts)
        else setError(t.returningInvalidCode)
      }
    } catch {
      setError(t.returningInvalidCode)
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'choice') {
    return (
      <div className="flex flex-col gap-5">
        <div className="mb-5">
          <h2 className="card-title">{t.returningTitle}</h2>
          <p className="card-subtitle">{t.returningSub}</p>
        </div>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={handleNew} className="btn-primary w-full">
            {t.newParticipant}
          </button>
          <button type="button" onClick={() => setPhase('email')} className="btn-ghost w-full">
            {t.returningParticipant}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'email') {
    return (
      <div className="flex flex-col gap-5">
        <div className="mb-5">
          <h2 className="card-title">{t.returningTitle}</h2>
          <p className="card-subtitle">{t.returningEmail}</p>
        </div>
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.returningEmailPh}
            className="form-input"
            onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
          />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-3 justify-between">
          <button type="button" onClick={() => setPhase('choice')} className="btn-ghost">
            {t.back}
          </button>
          <button type="button" onClick={handleSendCode} disabled={loading || !email.trim()} className="btn-primary">
            {loading ? t.returningSending : t.returningSendCode}
          </button>
        </div>
      </div>
    )
  }

  // phase === 'code'
  return (
    <div className="flex flex-col gap-5">
      <div className="mb-5">
        <h2 className="card-title">{t.returningTitle}</h2>
        <p className="card-subtitle">{t.returningCodeSent}</p>
      </div>
      <div>
        <label className="form-label">{t.returningCodeLabel}</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder={t.returningCodePh}
          className="form-input text-center text-2xl tracking-[0.5em] font-mono"
          maxLength={6}
          inputMode="numeric"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && handleVerify()}
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-3 justify-between">
        <button type="button" onClick={() => { setPhase('email'); setCode(''); setError('') }} className="btn-ghost">
          {t.back}
        </button>
        <button type="button" onClick={handleVerify} disabled={loading || code.length !== 6} className="btn-primary">
          {loading ? t.returningVerifying : t.returningVerify}
        </button>
      </div>
    </div>
  )
}
