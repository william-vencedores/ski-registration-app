import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { sendConfirmationEmail } from '../lib/email.js'

const router = Router()

// All admin routes require a valid JWT
router.use(requireAuth)

/**
 * GET /api/admin/registrations
 * Returns all registrations, optionally filtered by eventId.
 * Query: ?eventId=venc2027
 *
 * NOTE: `registrations` is imported from the registration module's
 * shared in-memory store. In production, replace with a DB query.
 */
router.get('/registrations', (req, res) => {
  // Import shared store (same array the registration route pushes to)
  const store = req.app.locals.registrations ?? []
  const { eventId } = req.query

  const filtered = eventId
    ? store.filter((r) => r.eventId === eventId)
    : store

  // Never expose raw paymentIntentId in listing
  const sanitized = filtered.map(({ paymentIntentId: _pi, ...r }) => r)

  res.json({
    total: sanitized.length,
    registrations: sanitized,
  })
})

/**
 * GET /api/admin/registrations/:id
 * Full detail for a single registration.
 */
router.get('/registrations/:id', (req, res) => {
  const store = req.app.locals.registrations ?? []
  const reg = store.find((r) => r.id === req.params.id)
  if (!reg) return res.status(404).json({ error: 'Registration not found' })
  const { paymentIntentId: _pi, ...safe } = reg
  res.json(safe)
})

/**
 * PATCH /api/admin/registrations/:id/attendance
 * Toggles attendance for a registration.
 * Body: { attended: true | false }
 */
router.patch('/registrations/:id/attendance', (req, res) => {
  const store = req.app.locals.registrations ?? []
  const reg = store.find((r) => r.id === req.params.id)
  if (!reg) return res.status(404).json({ error: 'Registration not found' })

  const { attended } = req.body
  if (typeof attended !== 'boolean') {
    return res.status(400).json({ error: '`attended` must be a boolean' })
  }

  reg.attended = attended
  reg.attendanceMarkedAt = attended ? new Date().toISOString() : null
  reg.attendanceMarkedBy = req.admin.username

  console.log(`[Admin] Attendance for #${reg.id} set to ${attended} by ${req.admin.username}`)
  res.json({ id: reg.id, attended: reg.attended, attendanceMarkedAt: reg.attendanceMarkedAt })
})

/**
 * POST /api/admin/registrations/:id/email
 * Re-sends the confirmation email for a registration.
 */
router.post('/registrations/:id/email', async (req, res) => {
  const store = req.app.locals.registrations ?? []
  const reg = store.find((r) => r.id === req.params.id)
  if (!reg) return res.status(404).json({ error: 'Registration not found' })

  try {
    await sendConfirmationEmail({
      to: reg.email,
      name: `${reg.firstName} ${reg.lastName}`,
      eventName: reg.eventName,
      confirmationId: reg.id,
      total: reg.totalPaid,
    })
    console.log(`[Admin] Resent email for #${reg.id} to ${reg.email} by ${req.admin.username}`)
    res.json({ success: true, sentTo: reg.email })
  } catch (err) {
    console.error('[Admin] Email send failed:', err)
    res.status(500).json({ error: 'Failed to send email: ' + err.message })
  }
})

/**
 * GET /api/admin/stats
 * Summary stats per event.
 */
router.get('/stats', (req, res) => {
  const store = req.app.locals.registrations ?? []

  const byEvent = {}
  for (const r of store) {
    if (!byEvent[r.eventId]) {
      byEvent[r.eventId] = {
        eventId: r.eventId,
        eventName: r.eventName,
        count: 0,
        attended: 0,
        revenue: 0,
      }
    }
    byEvent[r.eventId].count++
    if (r.attended) byEvent[r.eventId].attended++
    byEvent[r.eventId].revenue += r.totalPaid ?? 0
  }

  res.json({
    totalRegistrations: store.length,
    totalRevenue: store.reduce((s, r) => s + (r.totalPaid ?? 0), 0),
    events: Object.values(byEvent),
  })
})

export default router
