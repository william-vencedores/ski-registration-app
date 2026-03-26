import { Router } from 'express'
import Stripe from 'stripe'
import { EVENTS } from '../lib/events.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

/**
 * POST /api/payment/create-intent
 * Creates a Stripe PaymentIntent for a registration.
 */
router.post('/create-intent', async (req, res) => {
  try {
    const { eventId, email, name } = req.body

    const event = EVENTS[eventId]
    if (!event) {
      return res.status(400).json({ error: 'Invalid event ID' })
    }

    const amount = Math.round((event.price + event.processing) * 100) // in cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      receipt_email: email,
      metadata: { eventId, name, email },
      description: `Vencedores Ski — ${event.nameEs}`,
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[Payment] Error creating intent:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
