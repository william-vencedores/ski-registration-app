import { Router } from 'express'
import { signToken, verifyToken } from '../lib/auth.js'

const router = Router()

/**
 * POST /api/auth/login
 * Validates admin credentials from .env and returns a JWT.
 *
 * Set these in server/.env:
 *   ADMIN_USERNAME=admin
 *   ADMIN_PASSWORD=your_secure_password
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const validUser = process.env.ADMIN_USERNAME ?? 'admin'
  const validPass = process.env.ADMIN_PASSWORD ?? 'changeme'

  if (username !== validUser || password !== validPass) {
    return setTimeout(() => {
      res.status(401).json({ error: 'Invalid credentials' })
    }, 600)
  }

  const token = signToken({ username, role: 'admin' })
  res.json({ token, expiresIn: '8h', username })
})

/**
 * GET /api/auth/me
 * Returns current admin info (validates token).
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  try {
    const payload = verifyToken(authHeader.slice(7))
    res.json({ username: payload.username, role: payload.role })
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' })
  }
})

export default router
