import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const JWT_EXPIRES = '8h'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

/** Express middleware — protects any route it's applied to */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = authHeader.slice(7)
  try {
    req.admin = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' })
  }
}
