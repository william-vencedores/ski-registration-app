import { Router } from 'express'
import Stripe from 'stripe'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

/**
 * POST /api/webhook
 * Stripe webhook handler — verifies signature and handles events.
 * Set your webhook URL in the Stripe dashboard: https://dashboard.stripe.com/webhooks
 */
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.warn('[Webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification')
    return res.json({ received: true })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object
      console.log(`[Webhook] ✅ Payment succeeded: ${pi.id} — $${(pi.amount / 100).toFixed(2)}`)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object
      console.error(`[Webhook] ❌ Payment failed: ${pi.id} — ${pi.last_payment_error?.message}`)
      break
    }
    case 'charge.refunded': {
      const charge = event.data.object
      console.log(`[Webhook] 🔄 Charge refunded: ${charge.id}`)
      break
    }
    default:
      console.log(`[Webhook] Unhandled event: ${event.type}`)
  }

  res.json({ received: true })
})

export default router
