import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import axios from 'axios'

// Replace with your Stripe publishable key
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

function PaymentForm() {
  const stripe = useStripe()
  const elements = useElements()
  const { t } = useTranslation()
  const { selectedEvent, formData, disclosureAcceptances, setCurrentStep, setConfirmationId, setPaymentInfo } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full')

  const hasDeposit = selectedEvent && (selectedEvent.deposit ?? 0) > 0

  // Base amounts
  const fullPrice = selectedEvent?.price ?? 0
  const depositPrice = selectedEvent?.deposit ?? 0
  const baseAmount = paymentType === 'deposit' && hasDeposit ? depositPrice : fullPrice

  // Processing fee on what they're paying now
  const processing = Math.round((baseAmount * 0.029 + 0.30) * 100) / 100
  const chargeTotal = baseAmount + processing

  // Full total owed (for reference)
  const fullProcessing = Math.round((fullPrice * 0.029 + 0.30) * 100) / 100
  const fullTotal = fullPrice + fullProcessing

  const remaining = paymentType === 'deposit' && hasDeposit ? fullTotal - chargeTotal : 0

  const handleSubmit = async () => {
    if (!stripe || !elements || !selectedEvent) return
    setLoading(true)
    setError('')

    try {
      // Create payment intent on server
      const { data } = await axios.post('/api/payment/create-intent', {
        eventId: selectedEvent.id,
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        partialPayment: paymentType === 'deposit',
      })

      const cardEl = elements.getElement(CardElement)
      if (!cardEl) return

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: cardEl,
            billing_details: {
              name: `${formData.firstName} ${formData.lastName}`,
              email: formData.email,
            },
          },
        }
      )

      if (stripeError) {
        setError(stripeError.message ?? 'Payment failed')
        setLoading(false)
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        // Submit registration to server
        await axios.post('/api/registration/submit', {
          ...formData,
          eventId: selectedEvent.id,
          paymentIntentId: paymentIntent.id,
          totalPaid: data.chargeAmount,
          totalOwed: data.totalOwed,
          disclosureAcceptances,
        })

        setConfirmationId(paymentIntent.id.slice(-8).toUpperCase())
        setPaymentInfo({ totalPaid: data.chargeAmount, totalOwed: data.totalOwed })
        setCurrentStep(7)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  if (!selectedEvent) return null

  return (
    <div className="flex flex-col gap-5">
      <div className="card-verse">{t.s6Verse}</div>

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
      </div>

      {/* Card Input */}
      <div>
        <label className="form-label">{t.cardLabel}</label>
        <div className="form-input py-3.5">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
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
        onClick={handleSubmit}
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

      <p className="text-center text-[11px] text-slate-400 italic">{t.testMode}</p>
    </div>
  )
}

export default function Step6Payment() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  )
}
