import express from 'express'
import multer from 'multer'
import path from 'path'
import { prisma } from '../db.js'

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`
    cb(null, unique)
  },
})
const upload = multer({ storage })

const router = express.Router()

router.get('/student/:name', async (req, res) => {
  const studentName = req.params.name
  const answers = await prisma.studentAnswer.findMany({ where: { student_name: studentName } })
  const items = []
  for (const answer of answers) {
    const finalGrade = await prisma.finalGrade.findUnique({ where: { student_answer_id: answer.id } })
    if (finalGrade) {
      items.push({ answer, final_grade: finalGrade })
    }
  }
  res.json({ items })
})

router.post('/answers/upload', upload.single('file'), async (req, res) => {
  const { assessment_id, answer_text } = req.body
  if (!assessment_id) {
    return res.status(400).json({ detail: 'assessment_id is required' })
  }
  const assessment = await prisma.exam.findUnique({
    where: { id: Number(assessment_id) },
  })
  if (!assessment) {
    return res.status(404).json({ detail: 'Assessment not found' })
  }
  const enrollment = await prisma.studentSubject.findUnique({
    where: { student_id_subject_id: { student_id: req.user.id, subject_id: assessment.subject_id } },
  })
  if (!enrollment) {
    return res.status(403).json({ detail: 'Not enrolled in this subject' })
  }
  const filePath = req.file ? path.join('uploads', req.file.filename) : null
  const item = await prisma.studentAnswer.create({
    data: {
      exam_id: Number(assessment_id),
      student_name: req.user.full_name,
      student_user_id: req.user.id,
      answer_text: answer_text || null,
      answer_file_path: filePath,
      answer_file_name: req.file?.originalname || null,
    },
  })
  res.json(item)
})

router.get('/subjects', async (req, res) => {
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } })
  const enrollments = await prisma.studentSubject.findMany({
    where: { student_id: req.user.id },
    include: { subject: true },
  })
  res.json({
    subjects,
    enrolled_subjects: enrollments.map((item) => item.subject),
  })
})

router.get('/assessments', async (req, res) => {
  const type = req.query.type === 'test' ? 'test' : 'exam'
  const enrollments = await prisma.studentSubject.findMany({
    where: { student_id: req.user.id },
  })
  const subjectIds = enrollments.map((item) => item.subject_id)
  if (subjectIds.length === 0) {
    return res.json({ items: [] })
  }
  const assessments = await prisma.exam.findMany({
    where: { subject_id: { in: subjectIds }, exam_type: type },
    include: { subject: true },
    orderBy: { date: 'desc' },
  })
  res.json({
    items: assessments.map((item) => ({
      id: item.id,
      name: item.name,
      exam_code: item.exam_code,
      subject: item.subject,
    })),
  })
})


router.get('/notes', async (req, res) => {
  const enrollments = await prisma.studentSubject.findMany({
    where: { student_id: req.user.id },
  })
  const subjectIds = enrollments.map((item) => item.subject_id)
  if (subjectIds.length === 0) {
    return res.json({ items: [] })
  }
  const notes = await prisma.teacherSubject.findMany({
    where: {
      subject_id: { in: subjectIds },
      notes_file_path: { not: null },
    },
    include: { subject: true, teacher: true },
    orderBy: { created_at: 'desc' },
  })
  res.json({
    items: notes.map((item) => ({
      id: item.id,
      subject: item.subject,
      teacher: item.teacher,
      notes_file_name: item.notes_file_name,
    })),
  })
})

router.get('/notes/:id/file', async (req, res) => {
  const notesId = Number(req.params.id)
  const notes = await prisma.teacherSubject.findUnique({
    where: { id: notesId },
    include: { subject: true },
  })
  if (!notes || !notes.notes_file_path) {
    return res.status(404).json({ detail: 'Notes file not found' })
  }
  const enrollment = await prisma.studentSubject.findUnique({
    where: { student_id_subject_id: { student_id: req.user.id, subject_id: notes.subject_id } },
  })
  if (!enrollment) {
    return res.status(403).json({ detail: 'Not enrolled in this subject' })
  }
  res.download(notes.notes_file_path, notes.notes_file_name || 'notes.pdf')
})

router.get('/exams', async (req, res) => {
  const enrollments = await prisma.studentSubject.findMany({
    where: { student_id: req.user.id },
  })
  const subjectIds = enrollments.map((item) => item.subject_id)
  if (subjectIds.length === 0) {
    return res.json({ items: [] })
  }
  const exams = await prisma.exam.findMany({
    where: { subject_id: { in: subjectIds }, exam_type: 'exam' },
    orderBy: { date: 'desc' },
  })
  res.json({ items: exams })
})

router.get('/exams/:id/file', async (req, res) => {
  const examId = Number(req.params.id)
  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam || !exam.exam_file_path) {
    return res.status(404).json({ detail: 'Exam file not found' })
  }
  const enrollment = await prisma.studentSubject.findUnique({
    where: { student_id_subject_id: { student_id: req.user.id, subject_id: exam.subject_id } },
  })
  if (!enrollment) {
    return res.status(403).json({ detail: 'Not enrolled in this subject' })
  }
  res.download(exam.exam_file_path, exam.exam_file_name || 'exam.pdf')
})

router.get('/tests', async (req, res) => {
  const enrollments = await prisma.studentSubject.findMany({
    where: { student_id: req.user.id },
  })
  const subjectIds = enrollments.map((item) => item.subject_id)
  if (subjectIds.length === 0) {
    return res.json({ items: [] })
  }
  const tests = await prisma.exam.findMany({
    where: { subject_id: { in: subjectIds }, exam_type: 'test' },
    orderBy: { date: 'desc' },
  })
  res.json({ items: tests })
})

router.get('/tests/:id/file', async (req, res) => {
  const testId = Number(req.params.id)
  const test = await prisma.exam.findUnique({ where: { id: testId } })
  if (!test || !test.exam_file_path) {
    return res.status(404).json({ detail: 'Test file not found' })
  }
  const enrollment = await prisma.studentSubject.findUnique({
    where: { student_id_subject_id: { student_id: req.user.id, subject_id: test.subject_id } },
  })
  if (!enrollment) {
    return res.status(403).json({ detail: 'Not enrolled in this subject' })
  }
  res.download(test.exam_file_path, test.exam_file_name || 'test.pdf')
})

router.post('/subjects/:id/enroll', async (req, res) => {
  const subjectId = Number(req.params.id)
  await prisma.studentSubject.upsert({
    where: { student_id_subject_id: { student_id: req.user.id, subject_id: subjectId } },
    update: {},
    create: { student_id: req.user.id, subject_id: subjectId },
  })
  res.json({ status: 'enrolled' })
})

router.get('/subjects/:id/teachers', async (req, res) => {
  const subjectId = Number(req.params.id)
  const teachers = await prisma.teacherSubject.findMany({
    where: { subject_id: subjectId },
    include: { teacher: true },
  })
  res.json({ items: teachers.map((item) => item.teacher) })
})

export default router
