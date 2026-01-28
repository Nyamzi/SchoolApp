import bcrypt from 'bcryptjs'
import express from 'express'
import { prisma } from '../db.js'

const router = express.Router()

router.post('/users', async (req, res) => {
  const { email, full_name, password, role } = req.body
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(400).json({ detail: 'Email already registered' })
  }
  const hashed_password = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, full_name, hashed_password, role, is_approved: true },
  })
  res.json(user)
})

router.get('/users/pending', async (req, res) => {
  const items = await prisma.user.findMany({ where: { is_approved: false } })
  res.json(items)
})

router.put('/users/:id/approve', async (req, res) => {
  const userId = Number(req.params.id)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return res.status(404).json({ detail: 'User not found' })
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { is_approved: true },
  })
  await prisma.auditLog.create({
    data: {
      entity_type: 'User',
      entity_id: userId,
      action: 'approved',
      actor_id: req.user.id,
      old_value: JSON.stringify({ is_approved: user.is_approved }),
      new_value: JSON.stringify({ is_approved: true }),
    },
  })
  res.json(updated)
})

router.post('/classes', async (req, res) => {
  const { name, academic_year } = req.body
  const item = await prisma.class.create({ data: { name, academic_year } })
  res.json(item)
})

router.post('/subjects', async (req, res) => {
  const { name, code } = req.body
  const existing = await prisma.subject.findUnique({ where: { code } })
  if (existing) {
    return res.status(400).json({ detail: 'Subject code already exists' })
  }
  const item = await prisma.subject.create({ data: { name, code } })
  res.json(item)
})

router.get('/subjects', async (req, res) => {
  const items = await prisma.subject.findMany({ orderBy: { name: 'asc' } })
  res.json(items)
})

router.delete('/subjects/:id', async (req, res) => {
  const subjectId = Number(req.params.id)
  const existing = await prisma.subject.findUnique({ where: { id: subjectId } })
  if (!existing) {
    return res.status(404).json({ detail: 'Subject not found' })
  }
  try {
    await prisma.subject.delete({ where: { id: subjectId } })
    return res.json({ status: 'deleted' })
  } catch (err) {
    if (err.code === 'P2003') {
      return res.status(409).json({ detail: 'Subject is in use and cannot be deleted' })
    }
    return res.status(500).json({ detail: 'Failed to delete subject' })
  }
})

router.put('/subjects/:id', async (req, res) => {
  const subjectId = Number(req.params.id)
  const { name, code } = req.body
  const existing = await prisma.subject.findUnique({ where: { id: subjectId } })
  if (!existing) {
    return res.status(404).json({ detail: 'Subject not found' })
  }
  if (code && code !== existing.code) {
    const codeExists = await prisma.subject.findUnique({ where: { code } })
    if (codeExists) {
      return res.status(400).json({ detail: 'Subject code already exists' })
    }
  }
  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data: { name: name ?? existing.name, code: code ?? existing.code },
  })
  res.json(updated)
})

router.post('/exams', async (req, res) => {
  const { class_id, subject_id, name } = req.body
  const item = await prisma.exam.create({
    data: { class_id: Number(class_id), subject_id: Number(subject_id), name },
  })
  res.json(item)
})

router.post('/questions', async (req, res) => {
  const { exam_id, question_text, model_answer, key_points, total_marks, rubric } = req.body
  const item = await prisma.question.create({
    data: {
      exam_id: Number(exam_id),
      question_text,
      model_answer,
      key_points: JSON.stringify(key_points ?? []),
      total_marks: Number(total_marks),
      rubric: JSON.stringify(rubric ?? {}),
    },
  })
  res.json(item)
})

export default router
