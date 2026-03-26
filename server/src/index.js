import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import paymentRoutes from './routes/payment.js'
import registrationRoutes from './routes/registration.js'
import webhookRoutes from './routes/webhook.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'

const app = express()
const PORT = process.env.PORT ?? 3001

// ─── Shared in-memory store ────────────────────────────────────────────────
// Both registration.js and admin.js access registrations via app.locals.
// Replace with a real DB (Supabase, Postgres, MongoDB) in production.
app.locals.registrations = []

// ─── Stripe webhooks (need raw body — mount BEFORE json middleware) ─────────
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes)

// ─── Standard middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/payment',      paymentRoutes)
app.use('/api/registration', registrationRoutes)
app.use('/api/admin',        adminRoutes)

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
)

app.listen(PORT, () => {
  console.log(`\n🏔️  Vencedores API  →  http://localhost:${PORT}`)
  console.log(`   Stripe:  ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? '🔴 LIVE' : '🟡 TEST'}`)
  console.log(`   Admin:   ${process.env.ADMIN_USERNAME ?? 'admin'} / [password in .env]\n`)
})
