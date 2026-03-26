import { Router } from 'express'
import { EVENTS } from '../lib/events.js'
import { sendConfirmationEmail } from '../lib/email.js'

const router = Router()

/**
 * POST /api/registration/submit
 * Saves registration and sends confirmation email.
 *
 * In production, replace the in-memory store with your database
 * (e.g. Supabase, MongoDB, PostgreSQL).
 */
router.post('/submit', async (req, res) => {
  // Use shared store from app.locals (also accessed by admin routes)
  const registrations = req.app.locals.registrations
  try {
    const {
      firstName, lastName, email, phone, dob, city, state,
      emergencyName, emergencyPhone, emergencyRelation,
      skillLevel, dietary,
      medConditions, conditionDetails,
      medAllergies, allergyDetails,
      medMedications, medicationDetails,
      liabilityAccepted, medicalAccepted, signature,
      eventId, paymentIntentId, totalPaid,
    } = req.body

    // Validate required fields
    if (!firstName || !lastName || !email || !eventId || !paymentIntentId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const event = EVENTS[eventId]
    if (!event) {
      return res.status(400).json({ error: 'Invalid event ID' })
    }

    const confirmationId = paymentIntentId.slice(-8).toUpperCase()
    const registrationRecord = {
      id: confirmationId,
      createdAt: new Date().toISOString(),
      eventId, eventName: event.nameEs,
      // Personal
      firstName, lastName, email, phone, dob, city, state,
      // Emergency
      emergencyName, emergencyPhone, emergencyRelation,
      // Level & diet
      skillLevel, dietary,
      // Medical
      medConditions, conditionDetails,
      medAllergies, allergyDetails,
      medMedications, medicationDetails,
      // Legal
      liabilityAccepted, medicalAccepted, signature,
      // Payment
      paymentIntentId, totalPaid,
    }

    // 💾 Save to in-memory store (replace with DB insert)
    registrations.push(registrationRecord)
    console.log(`[Registration] #${confirmationId} — ${firstName} ${lastName} — ${event.nameEs}`)
    console.log(`[Registration] Total registrations: ${registrations.length}`)

    // 📧 Send confirmation email (non-blocking)
    sendConfirmationEmail({
      to: email,
      name: `${firstName} ${lastName}`,
      eventName: event.nameEs,
      confirmationId,
      total: totalPaid,
    }).catch((err) => console.error('[Email] Failed:', err))

    res.json({
      success: true,
      confirmationId,
      message: 'Registration successful',
    })
  } catch (err) {
    console.error('[Registration] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/registration/list
 * Returns all registrations (protect this endpoint in production!)
 */
router.get('/list', (_req, res) => {
  const registrations = _req.app.locals.registrations ?? []
  res.json({
    count: registrations.length,
    registrations: registrations.map(({ paymentIntentId: _pi, ...r }) => r),
  })
})

export default router
