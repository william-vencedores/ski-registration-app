import { useState } from 'react'
import { loadStripe, type Appearance, type StripeElementsOptions } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import { zelleConfig } from '../../lib/config'
import axios from 'axios'

// Replace with your Stripe publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_REPLACE_ME')

// Payment Element theme — tuned to match the registration form's palette.
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
    '.Input': {
      border: '1px solid rgba(0,0,0,0.1)',
      boxShadow: 'none',
      padding: '12px 14px',
    },
    '.Input:focus': {
      border: '1px solid #7ab8d9',
      boxShadow: '0 0 0 3px rgba(122,184,217,0.25)',
    },
    '.Label': {
      fontWeight: '600',
      fontSize: '12px',
    },
  },
}

interface CardCheckoutProps {
  paymentType: 'full' | 'deposit'
  hasDeposit: boolean
  chargeTotal: number
}

function CardCheckout({ paymentType, hasDeposit, chargeTotal }: CardCheckoutProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { t } = useTranslation()
  const { selectedEvent, formData, disclosureAcceptances, setCurrentStep, setConfirmationId, setPaymentInfo } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    if (!stripe || !elements || !selectedEvent) return
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

      // Create the PaymentIntent on the server
      const { data } = await axios.post('/api/payment/create-intent', {
        eventId: selectedEvent.id,
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        partialPayment: paymentType === 'deposit',
      })

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        redirect: 'if_required',
      })

      if (confirmError) {
        setError(confirmError.message ?? 'Payment failed')
        setLoading(false)
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        await axios.post('/api/registration/submit', {
          ...formData,
          eventId: selectedEvent.id,
          paymentMethod: 'stripe',
          paymentIntentId: paymentIntent.id,
          totalPaid: data.chargeAmount,
          totalOwed: data.totalOwed,
          disclosureAcceptances,
        })

        setConfirmationId(paymentIntent.id.slice(-8).toUpperCase())
        setPaymentInfo({ totalPaid: data.chargeAmount, totalOwed: data.totalOwed, method: 'stripe' })
        setCurrentStep(7)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'An error occurred. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <>
      <div>
        <PaymentElement options={{ layout: 'tabs' }} />
        <div className="flex items-center gap-1.5 mt-2 justify-end">
          <span className="text-[11px] text-slate-400">{t.stripeNote}</span>
          <span className="font-bold text-[11px] text-[#635bff]">Stripe</span>
          <span className="text-slate-300">🔒</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ⚠️ {error}
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
            {t.processing}
          </span>
        ) : paymentType === 'deposit' && hasDeposit ? (
          `Pay Deposit — $${chargeTotal.toFixed(2)}`
        ) : (
          t.payBtn
        )}
      </button>
    </>
  )
}

export default function Step6Payment() {
  const { t } = useTranslation()
  const { selectedEvent, formData, disclosureAcceptances, setCurrentStep, setConfirmationId, setPaymentInfo } = useAppStore()
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full')
  const [method, setMethod] = useState<'card' | 'zelle'>('card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasDeposit = !!selectedEvent && (selectedEvent.deposit ?? 0) > 0

  // Base amounts
  const fullPrice = selectedEvent?.price ?? 0
  const depositPrice = selectedEvent?.deposit ?? 0
  const baseAmount = paymentType === 'deposit' && hasDeposit ? depositPrice : fullPrice

  // Processing fee on what they're paying now — must mirror the server calculation.
  const processing = Math.round((baseAmount * 0.029 + 0.30) * 100) / 100
  const chargeTotal = baseAmount + processing
  const amountCents = Math.round(chargeTotal * 100)

  // Full total owed (for reference)
  const fullProcessing = Math.round((fullPrice * 0.029 + 0.30) * 100) / 100
  const fullTotal = fullPrice + fullProcessing
  const remaining = paymentType === 'deposit' && hasDeposit ? fullTotal - chargeTotal : 0

  // Zelle: participant can send any amount; default to the full event price.
  const [zelleAmount, setZelleAmount] = useState<string>(fullPrice ? fullPrice.toFixed(2) : '')

  const elementsOptions: StripeElementsOptions = {
    mode: 'payment',
    amount: amountCents,
    currency: 'usd',
    appearance,
  }

  const handleZelleSubmit = async () => {
    if (!selectedEvent) return
    const amt = Math.round(parseFloat(zelleAmount) * 100) / 100
    if (!amt || amt <= 0 || Number.isNaN(amt)) {
      setError(t.zelleAmountRequired)
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data } = await axios.post('/api/registration/submit', {
        ...formData,
        eventId: selectedEvent.id,
        paymentMethod: 'zelle',
        totalOwed: fullPrice,
        zelleAmount: amt,
        disclosureAcceptances,
      })

      setConfirmationId(data.confirmationId)
      setPaymentInfo({ totalPaid: 0, totalOwed: fullPrice, method: 'zelle', zelleAmount: amt })
      setCurrentStep(7)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'An error occurred. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  if (!selectedEvent) return null

  return (
    <div className="flex flex-col gap-5">
      <div className="card-verse">{t.s6Verse}</div>

      {/* Payment method selector */}
      <div>
        <label className="form-label">{t.payMethodLabel}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMethod('card'); setError('') }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all
              ${method === 'card'
                ? 'bg-white text-slate-900 border-glacier shadow-sm'
                : 'bg-transparent text-slate-500 border-black/10 hover:text-slate-700'}`}
          >
            {t.payCard}
          </button>
          <button
            type="button"
            onClick={() => { setMethod('zelle'); setError('') }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all
              ${method === 'zelle'
                ? 'bg-white text-slate-900 border-glacier shadow-sm'
                : 'bg-transparent text-slate-500 border-black/10 hover:text-slate-700'}`}
          >
            🏦 {t.payZelle}
          </button>
        </div>
      </div>

      {/* Event Summary Banner */}
      <div className="rounded-xl overflow-hidden border border-black/8">
        <div className="bg-gradient-to-br from-slate-900 to-alpine px-5 py-3 flex items-center gap-2">
          <div>
            <div className="font-semibold text-sm text-white">
              {selectedEvent.name}
            </div>
            <div className="text-xs text-glacier">{selectedEvent.location}</div>
          </div>
        </div>

        {method === 'card' ? (
          <>
            {/* Payment type selector */}
            {hasDeposit && (
              <div className="bg-[#f0f5fa] px-5 py-3 flex gap-2 border-b border-black/8">
                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all
                    ${paymentType === 'full'
                      ? 'bg-white text-slate-900 border-glacier shadow-sm'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'}`}
                >
                  Pay Full Amount
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('deposit')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all
                    ${paymentType === 'deposit'
                      ? 'bg-white text-slate-900 border-glacier shadow-sm'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'}`}
                >
                  Pay Deposit
                </button>
              </div>
            )}

            <div className="bg-[#f8fbfe] px-5 py-3 flex flex-col gap-1.5">
              {paymentType === 'deposit' && hasDeposit ? (
                <>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Deposit</span>
                    <span>${depositPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{t.feeProcessing}</span>
                    <span>${processing.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-black/8">
                    <span className="text-xs tracking-widest uppercase">Due Now</span>
                    <span className="font-cinzel text-lg text-deep-sky">${chargeTotal.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-xs text-amber-600 pt-1">
                    <span>Remaining balance</span>
                    <span>${remaining.toFixed(2)} USD</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{t.feeSkier}</span>
                    <span>${fullPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{t.feeProcessing}</span>
                    <span>${processing.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-black/8">
                    <span className="text-xs tracking-widest uppercase">{t.feeTotal}</span>
                    <span className="font-cinzel text-lg text-deep-sky">${chargeTotal.toFixed(2)} USD</span>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="bg-[#f8fbfe] px-5 py-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{t.feeSkier}</span>
              <span>${fullPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-pine pt-1">
              <span>{t.zelleNoFee}</span>
              <span>$0.00</span>
            </div>
          </div>
        )}
      </div>

      {method === 'card' ? (
        amountCents >= 50 ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CardCheckout paymentType={paymentType} hasDeposit={hasDeposit} chargeTotal={chargeTotal} />
          </Elements>
        ) : (
          <div className="bg-[#f0f5fa] border border-black/8 rounded-xl px-4 py-3 text-sm text-slate-500">
            Payment is not available for this event.
          </div>
        )
      ) : (
        <>
          {/* Zelle instructions */}
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

          {/* Amount input */}
          <div>
            <label className="form-label">{t.zelleAmountLabel}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={zelleAmount}
                onChange={(e) => setZelleAmount(e.target.value)}
                className="form-input pl-8"
                placeholder={fullPrice.toFixed(2)}
              />
            </div>
          </div>

          <div className="bg-[#f0f5fa] border border-black/8 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed">
            ⏳ {t.zelleNote}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleZelleSubmit}
            disabled={loading}
            className="btn-success w-full text-center justify-center py-4"
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
    </div>
  )
}
