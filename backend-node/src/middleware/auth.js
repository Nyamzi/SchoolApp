import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'

export function requireAuth() {
  return async (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      return res.status(401).json({ detail: 'Missing token' })
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const user = await prisma.user.findUnique({ where: { email: payload.sub } })
      if (!user || !user.is_active) {
        return res.status(401).json({ detail: 'Inactive user' })
      }
      if (!user.is_approved) {
        return res.status(403).json({ detail: 'Account pending approval' })
      }
      req.user = user
      next()
    } catch (err) {
      return res.status(401).json({ detail: 'Invalid token' })
    }
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ detail: 'Insufficient role' })
    }
    next()
  }
}
