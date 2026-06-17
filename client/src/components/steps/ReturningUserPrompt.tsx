import { useState } from 'react'
import { loadStripe, type Appearance, type StripeElementsOptions } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import { sendVerificationCode, verifyCode, createBalancePaymentIntent, payBalance } from '../../lib/returningApi'
import type { RegistrationInfo } from '../../lib/returningApi'
import AddMinorFlow from './AddMinorFlow'
import { isValidEmail } from '../../lib/email'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_REPLACE_ME')

// Payment Element theme — mirrors the registration form's palette.
const appearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#1e5b8a',
    colorText: '#1e293b',
    colorTextSecondary: '#64748b',
    colorDanger: '#ef4444',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    fontSizeBase: '15px',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'none', padding: '12px 14px' },
    '.Input:focus': { border: '1px solid #7ab8d9', boxShadow: '0 0 0 3px rgba(122,184,217,0.25)' },
    '.Label': { fontWeight: '600', fontSize: '12px' },
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
  const chargeTotal = remaining

  const handlePay = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    try {
      // Validate the Payment Element before creating the intent (deferred flow)
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message ?? 'Please check your payment details.')
        setLoading(false)
        return
      }

      const intentData = await createBalancePaymentIntent(registration.confirmationId, email, name)

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: intentData.clientSecret,
        // Required by Stripe's client validation even though allow_redirects is
        // 'never' server-side; redirect: 'if_required' keeps card/wallet payments
        // on this page.
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })

      if (confirmError) {
        setError(confirmError.message ?? 'Payment failed')
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
          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-black/8">
            <span className="text-xs tracking-widest uppercase">{t.balanceTotal}</span>
            <span className="font-cinzel text-lg text-deep-sky">${chargeTotal.toFixed(2)} USD</span>
          </div>
        </div>
      </div>

      <div className="text-left">
        <PaymentElement options={{ layout: 'tabs' }} />
        <div className="flex items-center gap-1.5 mt-2 justify-end">
          <span className="text-[11px] text-slate-400">{t.stripeNote}</span>
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
  const [currentRegistration, setCurrentRegistration] = useState<RegistrationInfo | null>(null)
  const [balancePaid, setBalancePaid] = useState(false)
  const [addingMinor, setAddingMinor] = useState(false)
  const [minorAdded, setMinorAdded] = useState(false)

  const handleNew = () => {
    setIsReturningUser(false)
    setCurrentStep(1)
  }

  const handleSendCode = async () => {
    if (!email.trim()) return
    if (!isValidEmail(email.trim())) { setError(t.invalidEmail); return }
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
          if (reg) setCurrentRegistration(reg)
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
    setCurrentRegistration(null)
    setBalancePaid(false)
    setAddingMinor(false)
    setMinorAdded(false)
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
        {currentRegistration && (
          <button type="button" onClick={() => { setBalancePaid(false); setAddingMinor(true) }} className="btn-primary w-full">
            {t.addMinorCta}
          </button>
        )}
        <button type="button" onClick={handleReset} className="btn-ghost mx-auto">
          {t.back}
        </button>
      </div>
    )
  }

  // Minor added success screen
  if (minorAdded) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <div className="mb-2">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="card-title">{t.addMinorSuccessTitle}</h2>
          <p className="card-subtitle mt-2">{t.addMinorSuccess}</p>
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

  // Add-a-minor flow for an already-registered parent
  if (addingMinor && currentRegistration) {
    return (
      <AddMinorFlow
        guardianRegId={currentRegistration.confirmationId}
        onBack={() => setAddingMinor(false)}
        onSuccess={() => { setAddingMinor(false); setMinorAdded(true) }}
      />
    )
  }

  // Show balance payment form
  if (alreadyRegistered && pendingRegistration) {
    const remaining = pendingRegistration.totalOwed - pendingRegistration.totalPaid
    const elementsOptions: StripeElementsOptions = {
      mode: 'payment',
      amount: Math.round(remaining * 100),
      currency: 'usd',
      appearance,
    }
    return (
      <Elements stripe={stripePromise} options={elementsOptions}>
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
        {currentRegistration && (
          <button type="button" onClick={() => setAddingMinor(true)} className="btn-primary w-full">
            {t.addMinorCta}
          </button>
        )}
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
