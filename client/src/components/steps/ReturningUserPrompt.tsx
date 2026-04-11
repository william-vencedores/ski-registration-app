import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import { sendVerificationCode, verifyCode, createBalancePaymentIntent, payBalance } from '../../lib/returningApi'
import type { RegistrationInfo } from '../../lib/returningApi'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_REPLACE_ME')

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1e293b',
      fontFamily: '"DM Sans", sans-serif',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#ef4444' },
  },
}

type Phase = 'choice' | 'email' | 'code'

function BalancePaymentForm({ registration, email, name, onBack, onSuccess }: {
  registration: RegistrationInfo
  email: string
  name: string
  onBack: () => void
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { t } = useTranslation()
  const { selectedEvent } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const remaining = registration.totalOwed - registration.totalPaid
  const processing = Math.round((remaining * 0.029 + 0.30) * 100) / 100
  const chargeTotal = remaining + processing

  const handlePay = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    try {
      const intentData = await createBalancePaymentIntent(registration.confirmationId, email, name)

      const cardEl = elements.getElement(CardElement)
      if (!cardEl) return

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        {
          payment_method: {
            card: cardEl,
            billing_details: { name, email },
          },
        }
      )

      if (stripeError) {
        setError(stripeError.message ?? 'Payment failed')
        setLoading(false)
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        await payBalance(registration.confirmationId, intentData.chargeAmount)
        onSuccess()
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'An error occurred. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 text-center">
      <div className="mb-2">
        <div className="text-5xl mb-4">💳</div>
        <h2 className="card-title">{t.balanceTitle}</h2>
        <p className="card-subtitle mt-2">
          {name ? `${name}, ` : ''}{t.balanceSub}
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-black/8">
        <div className="bg-gradient-to-br from-slate-900 to-alpine px-5 py-3">
          <div className="font-semibold text-sm text-white">{selectedEvent?.name}</div>
          {selectedEvent?.location && (
            <div className="text-xs text-glacier">{selectedEvent.location}</div>
          )}
        </div>
        <div className="bg-[#f8fbfe] px-5 py-3 flex flex-col gap-1.5 text-left">
          <div className="flex justify-between text-sm text-slate-600">
            <span>{t.balanceRemaining}</span>
            <span>${remaining.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{t.balanceProcessing}</span>
            <span>${processing.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-black/8">
            <span className="text-xs tracking-widest uppercase">{t.balanceTotal}</span>
            <span className="font-cinzel text-lg text-deep-sky">${chargeTotal.toFixed(2)} USD</span>
          </div>
        </div>
      </div>

      <div className="text-left">
        <label className="form-label">Card Information</label>
        <div className="form-input py-3.5">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        <div className="flex items-center gap-1.5 mt-2 justify-end">
          <span className="text-[11px] text-slate-400">Secure SSL payment · Powered by</span>
          <span className="font-bold text-[11px] text-[#635bff]">Stripe</span>
          <span className="text-slate-300">🔒</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={loading || !stripe}
        className="btn-success w-full text-center justify-center py-4"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t.balanceProcessingPayment}
          </span>
        ) : (
          `${t.balancePayBtn} — $${chargeTotal.toFixed(2)}`
        )}
      </button>

      <button type="button" onClick={onBack} className="btn-ghost mx-auto">
        {t.back}
      </button>
    </div>
  )
}

export default function ReturningUserPrompt() {
  const { setFormData, setIsReturningUser, setCurrentStep, selectedEvent } = useAppStore()
  const { t } = useTranslation()

  const [phase, setPhase] = useState<Phase>('choice')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [returnedName, setReturnedName] = useState('')
  const [pendingRegistration, setPendingRegistration] = useState<RegistrationInfo | null>(null)
  const [balancePaid, setBalancePaid] = useState(false)

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
        // Check if already registered for this event
        if (selectedEvent && result.registeredEventIds?.includes(selectedEvent.id)) {
          setReturnedName(result.profile.firstName || '')
          // Check if there's a pending balance
          const reg = result.registrations?.find(r => r.eventId === selectedEvent.id)
          if (reg && reg.paymentStatus === 'partial' && reg.totalOwed > reg.totalPaid) {
            setPendingRegistration(reg)
          }
          setAlreadyRegistered(true)
          return
        }
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

  const handleReset = () => {
    setAlreadyRegistered(false)
    setPendingRegistration(null)
    setBalancePaid(false)
    setPhase('choice')
    setCode('')
    setEmail('')
    setError('')
  }

  // Balance payment success screen
  if (balancePaid) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <div className="mb-2">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="card-title">{t.balanceSuccessTitle}</h2>
          <p className="card-subtitle mt-2">{t.balanceSuccess}</p>
        </div>
        <div className="bg-glacier/10 border border-glacier/20 rounded-xl px-4 py-3">
          <p className="text-sm text-glacier font-semibold">{selectedEvent?.name}</p>
          {selectedEvent?.date && (
            <p className="text-xs text-slate-400 mt-1">{selectedEvent.location} · {selectedEvent.date}</p>
          )}
        </div>
        <button type="button" onClick={handleReset} className="btn-ghost mx-auto">
          {t.back}
        </button>
      </div>
    )
  }

  // Show balance payment form
  if (alreadyRegistered && pendingRegistration) {
    return (
      <Elements stripe={stripePromise}>
        <BalancePaymentForm
          registration={pendingRegistration}
          email={email}
          name={returnedName}
          onBack={handleReset}
          onSuccess={() => setBalancePaid(true)}
        />
      </Elements>
    )
  }

  // Already registered, fully paid
  if (alreadyRegistered) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <div className="mb-2">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="card-title">{t.returningAlreadyRegisteredTitle}</h2>
          <p className="card-subtitle mt-2">
            {returnedName ? `${returnedName}, ` : ''}{t.returningAlreadyRegisteredMsg}
          </p>
        </div>
        <div className="bg-glacier/10 border border-glacier/20 rounded-xl px-4 py-3">
          <p className="text-sm text-glacier font-semibold">{selectedEvent?.name}</p>
          {selectedEvent?.date && (
            <p className="text-xs text-slate-400 mt-1">{selectedEvent.location} · {selectedEvent.date}</p>
          )}
        </div>
        <button type="button" onClick={handleReset} className="btn-ghost mx-auto">
          {t.back}
        </button>
      </div>
    )
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
