import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

router.post('/bootstrap-admin', async (req, res) => {
  const { email, full_name, password, role } = req.body
  if (role !== 'admin') {
    return res.status(400).json({ detail: 'Bootstrap requires admin role' })
  }
  const existing = await prisma.user.findFirst()
  if (existing) {
    return res.status(400).json({ detail: 'Bootstrap already completed' })
  }
  const hashed_password = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      full_name,
      hashed_password,
      role,
      is_approved: true,
    },
  })
  res.json(user)
})

router.post('/signup', async (req, res) => {
  const { email, full_name, password, role } = req.body
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ detail: 'Role must be teacher or student' })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(400).json({ detail: 'Email already registered' })
  }
  const hashed_password = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      full_name,
      hashed_password,
      role,
      is_approved: false,
    },
  })
  res.json(user)
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(401).json({ detail: 'Incorrect credentials' })
  }
  const ok = await bcrypt.compare(password, user.hashed_password)
  if (!ok) {
    return res.status(401).json({ detail: 'Incorrect credentials' })
  }
  if (!user.is_active) {
    return res.status(403).json({ detail: 'User is inactive' })
  }
  if (!user.is_approved) {
    return res.status(403).json({ detail: 'Account pending approval' })
  }
  const token = jwt.sign({ sub: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' })
  res.json({ access_token: token, token_type: 'bearer' })
})

router.post('/reset-admin', async (req, res) => {
  const resetToken = req.headers['x-reset-token']
  if (!process.env.ADMIN_RESET_TOKEN || resetToken !== process.env.ADMIN_RESET_TOKEN) {
    return res.status(403).json({ detail: 'Invalid reset token' })
  }
  const { email, full_name, password } = req.body
  const hashed_password = await bcrypt.hash(password, 10)
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (existingAdmin) {
    const updated = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        email,
        full_name,
        hashed_password,
        is_active: true,
        is_approved: true,
      },
    })
    return res.json(updated)
  }
  const created = await prisma.user.create({
    data: {
      email,
      full_name,
      hashed_password,
      role: 'admin',
      is_approved: true,
    },
  })
  res.json(created)
})

router.get('/me', async (req, res) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ detail: 'Missing token' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { email: payload.sub } })
    if (!user) {
      return res.status(401).json({ detail: 'Invalid token' })
    }
    res.json(user)
  } catch (err) {
    res.status(401).json({ detail: 'Invalid token' })
  }
})

export default router
