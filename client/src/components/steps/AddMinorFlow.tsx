import { useState } from 'react'
import { loadStripe, type Appearance, type StripeElementsOptions } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import { zelleConfig } from '../../lib/config'
import { createMinorsPaymentIntent, addMinors } from '../../lib/returningApi'
import type { Minor } from '../../lib/events'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_REPLACE_ME')

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

const minorsValid = (minors: Minor[]) =>
  minors.length > 0 && minors.every((m) => m.firstName.trim() && m.lastName.trim() && m.dob)

interface Props {
  guardianRegId: string
  onBack: () => void
  onSuccess: () => void
}

function MinorCardCheckout({
  guardianRegId,
  minors,
  partialPayment,
  chargeTotal,
  onSuccess,
}: {
  guardianRegId: string
  minors: Minor[]
  partialPayment: boolean
  chargeTotal: number
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    if (!stripe || !elements) return
    if (!minorsValid(minors)) { setError(t.addMinorNeedOne); return }
    setLoading(true)
    setError('')

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message ?? 'Please check your payment details.')
        setLoading(false)
        return
      }

      const data = await createMinorsPaymentIntent(guardianRegId, minors.length, partialPayment)

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })

      if (confirmError) {
        setError(confirmError.message ?? 'Payment failed')
        setLoading(false)
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        await addMinors({
          guardianRegId,
          minors,
          paymentMethod: 'stripe',
          paymentIntentId: paymentIntent.id,
          partialPayment,
        })
        onSuccess()
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'An error occurred. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="text-left">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mt-3">
          ⚠️ {error}
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={loading || !stripe || !minorsValid(minors)}
        className="btn-success w-full text-center justify-center py-4 mt-4 disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t.processing}
          </span>
        ) : (
          `${t.addMinorPayBtn} — $${chargeTotal.toFixed(2)}`
        )}
      </button>
    </div>
  )
}

export default function AddMinorFlow({ guardianRegId, onBack, onSuccess }: Props) {
  const { t } = useTranslation()
  const { selectedEvent } = useAppStore()
  const [minors, setMinors] = useState<Minor[]>([{ firstName: '', lastName: '', dob: '' }])
  const [method, setMethod] = useState<'card' | 'zelle'>('card')
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!selectedEvent) return null

  const hasDeposit = (selectedEvent.deposit ?? 0) > 0
  const fullPrice = selectedEvent.price ?? 0
  const depositPrice = selectedEvent.deposit ?? 0
  const baseAmount = paymentType === 'deposit' && hasDeposit ? depositPrice : fullPrice
  const count = minors.length
  const chargeTotal = baseAmount * count
  const amountCents = Math.round(chargeTotal * 100)
  const remaining = paymentType === 'deposit' && hasDeposit ? (fullPrice - baseAmount) * count : 0

  const addMinor = () => setMinors([...minors, { firstName: '', lastName: '', dob: '' }])
  const removeMinor = (i: number) => setMinors(minors.filter((_, idx) => idx !== i))
  const updateMinor = (i: number, patch: Partial<Minor>) =>
    setMinors(minors.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))

  const handleZelleSubmit = async () => {
    if (!minorsValid(minors)) { setError(t.addMinorNeedOne); return }
    setLoading(true)
    setError('')
    try {
      await addMinors({
        guardianRegId,
        minors,
        paymentMethod: 'zelle',
        partialPayment: paymentType === 'deposit',
        zelleAmount: chargeTotal,
      })
      onSuccess()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'An error occurred. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  const elementsOptions: StripeElementsOptions = {
    mode: 'payment',
    amount: Math.max(amountCents, 50),
    currency: 'usd',
    appearance,
  }

  const minorInput = (i: number, key: keyof Minor, label: string, type = 'text') => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type}
        value={minors[i][key]}
        onChange={(e) => updateMinor(i, { [key]: e.target.value })}
        className="form-input"
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-1">
        <h2 className="card-title">{t.addMinorTitle}</h2>
        <p className="card-subtitle mt-1">{t.addMinorSub}</p>
      </div>

      {/* Minor list */}
      <div className="flex flex-col gap-3">
        {minors.map((_, i) => (
          <div key={i} className="rounded-xl border border-black/8 bg-[#f8fbfe] px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-glacier">
                {t.minorLabel} {i + 1}
              </span>
              {minors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMinor(i)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  ✕ {t.removeMinor}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {minorInput(i, 'firstName', t.minorFirstName)}
              {minorInput(i, 'lastName', t.minorLastName)}
              <div className="sm:col-span-2">
                {minorInput(i, 'dob', t.minorDob, 'date')}
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addMinor}
          className="text-sm font-semibold text-deep-sky hover:text-alpine transition-colors self-start"
        >
          {t.addMinor}
        </button>
      </div>

      {/* Payment method selector */}
      <div>
        <label className="form-label">{t.payMethodLabel}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMethod('card'); setError('') }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all
              ${method === 'card' ? 'bg-white text-slate-900 border-glacier shadow-sm' : 'bg-transparent text-slate-500 border-black/10 hover:text-slate-700'}`}
          >
            {t.payCard}
          </button>
          <button
            type="button"
            onClick={() => { setMethod('zelle'); setError('') }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all
              ${method === 'zelle' ? 'bg-white text-slate-900 border-glacier shadow-sm' : 'bg-transparent text-slate-500 border-black/10 hover:text-slate-700'}`}
          >
            🏦 {t.payZelle}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl overflow-hidden border border-black/8">
        <div className="bg-gradient-to-br from-slate-900 to-alpine px-5 py-3">
          <div className="font-semibold text-sm text-white">{selectedEvent.name}</div>
          <div className="text-xs text-glacier">{selectedEvent.location}</div>
        </div>

        {hasDeposit && (
          <div className="bg-[#f0f5fa] px-5 py-3 flex gap-2 border-b border-black/8">
            <button
              type="button"
              onClick={() => setPaymentType('full')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all
                ${paymentType === 'full' ? 'bg-white text-slate-900 border-glacier shadow-sm' : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'}`}
            >
              {t.payFull}
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('deposit')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all
                ${paymentType === 'deposit' ? 'bg-white text-slate-900 border-glacier shadow-sm' : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'}`}
            >
              {t.payDeposit}
            </button>
          </div>
        )}

        <div className="bg-[#f8fbfe] px-5 py-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t.participants}</span>
            <span>{count}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{(paymentType === 'deposit' && hasDeposit ? t.deposit : t.feeSkier)}{count > 1 ? ` × ${count}` : ''}</span>
            <span>${chargeTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-black/8">
            <span className="text-xs tracking-widest uppercase">{paymentType === 'deposit' && hasDeposit ? (method === 'zelle' ? t.sendNow : t.dueNow) : t.feeTotal}</span>
            <span className="font-cinzel text-lg text-deep-sky">${chargeTotal.toFixed(2)} USD</span>
          </div>
          {paymentType === 'deposit' && hasDeposit && (
            <div className="flex justify-between text-xs text-amber-600 pt-1">
              <span>{t.remainingBalance}</span>
              <span>${remaining.toFixed(2)} USD</span>
            </div>
          )}
        </div>
      </div>

      {method === 'card' ? (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <MinorCardCheckout
            guardianRegId={guardianRegId}
            minors={minors}
            partialPayment={paymentType === 'deposit'}
            chargeTotal={chargeTotal}
            onSuccess={onSuccess}
          />
        </Elements>
      ) : (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex flex-col gap-3">
            <div className="font-semibold text-sm text-amber-800">{t.zelleTitle}</div>
            <p className="text-xs text-amber-700 leading-relaxed">{t.zelleIntro}</p>
            <div className="flex flex-col gap-2 bg-white/60 rounded-lg px-4 py-3 border border-amber-200">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[11px] uppercase tracking-wider text-amber-700">{t.zelleSendTo}</span>
                <span className="text-sm font-semibold text-slate-900 select-all text-right break-all">{zelleConfig.email}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[11px] uppercase tracking-wider text-amber-700">{t.zelleRecipient}</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{zelleConfig.recipientName}</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-700">{t.zelleMemoNote}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleZelleSubmit}
            disabled={loading || !minorsValid(minors)}
            className="btn-success w-full text-center justify-center py-4 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.processing}
              </span>
            ) : (
              t.zelleSubmitBtn
            )}
          </button>
        </>
      )}

      <button type="button" onClick={onBack} className="btn-ghost mx-auto">
        {t.back}
      </button>
    </div>
  )
}
