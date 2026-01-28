import express from 'express'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import { prisma } from '../db.js'

const router = express.Router()

const safeJsonParse = (value, fallback) => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (err) {
      return fallback
    }
  }
  return value
}

const examStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`
    cb(null, unique)
  },
})
const uploadExam = multer({ storage: examStorage })
const uploadNotes = multer({ storage: examStorage })

router.post('/answers', async (req, res) => {
  const { question_id, student_name, student_user_id, answer_text } = req.body
  const item = await prisma.studentAnswer.create({
    data: {
      question_id: Number(question_id),
      student_name,
      student_user_id: student_user_id ? Number(student_user_id) : null,
      answer_text,
    },
  })
  res.json(item)
})

router.post('/answers/:id/ai-grade', async (req, res) => {
  const answerId = Number(req.params.id)
  const answer = await prisma.studentAnswer.findUnique({ where: { id: answerId } })
  if (!answer) {
    return res.status(404).json({ detail: 'Answer not found' })
  }
  const question = await prisma.question.findUnique({
    where: { id: answer.question_id },
    include: { exam: true },
  })
  if (!question) {
    return res.status(404).json({ detail: 'Question not found' })
  }

  const teacherSubject = await prisma.teacherSubject.findUnique({
    where: { teacher_id_subject_id: { teacher_id: req.user.id, subject_id: question.exam.subject_id } },
  })
  if (!teacherSubject) {
    return res.status(403).json({ detail: 'Teacher is not assigned to this subject' })
  }

  let answerImageBase64 = null
  if (!answer.answer_text && answer.answer_file_path) {
    const filePath = path.join(process.cwd(), answer.answer_file_path)
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
      answerImageBase64 = `data:${mime};base64,${fileBuffer.toString('base64')}`
    }
  }

  const aiPayload = {
    question_text: question.question_text,
    model_answer: question.model_answer,
    key_points: safeJsonParse(question.key_points, []),
    rubric: safeJsonParse(question.rubric, {}),
    total_marks: question.total_marks,
    student_answer: answer.answer_text || '',
    answer_image_base64: answerImageBase64,
    study_notes: teacherSubject.study_notes || '',
  }

  let aiResult
  try {
    const response = await fetch(`${process.env.AI_SERVICE_URL}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayload),
    })
    aiResult = await response.json()
    if (!response.ok) {
      return res.status(502).json({ detail: aiResult.detail || 'AI service error' })
    }
  } catch (err) {
    return res.status(502).json({ detail: 'AI service unreachable' })
  }

  const existing = await prisma.aIGrade.findUnique({ where: { student_answer_id: answerId } })
  if (existing) {
    const updated = await prisma.aIGrade.update({
      where: { student_answer_id: answerId },
      data: {
        awarded_marks: aiResult.awarded_marks,
        max_marks: aiResult.max_marks,
        matched_key_points: JSON.stringify(aiResult.matched_key_points ?? []),
        missing_key_points: JSON.stringify(aiResult.missing_key_points ?? []),
        feedback: aiResult.feedback,
        confidence: aiResult.confidence,
        raw_response: JSON.stringify(aiResult),
      },
    })
    return res.json({
      ...updated,
      matched_key_points: safeJsonParse(updated.matched_key_points, []),
      missing_key_points: safeJsonParse(updated.missing_key_points, []),
      raw_response: safeJsonParse(updated.raw_response, {}),
    })
  }

  const created = await prisma.aIGrade.create({
    data: {
      student_answer_id: answerId,
      awarded_marks: aiResult.awarded_marks,
      max_marks: aiResult.max_marks,
      matched_key_points: JSON.stringify(aiResult.matched_key_points ?? []),
      missing_key_points: JSON.stringify(aiResult.missing_key_points ?? []),
      feedback: aiResult.feedback,
      confidence: aiResult.confidence,
      raw_response: JSON.stringify(aiResult),
    },
  })
  res.json({
    ...created,
    matched_key_points: safeJsonParse(created.matched_key_points, []),
    missing_key_points: safeJsonParse(created.missing_key_points, []),
    raw_response: safeJsonParse(created.raw_response, {}),
  })
})

router.put('/answers/:id/final-grade', async (req, res) => {
  const answerId = Number(req.params.id)
  const { awarded_marks, feedback } = req.body
  const answer = await prisma.studentAnswer.findUnique({ where: { id: answerId } })
  if (!answer) {
    return res.status(404).json({ detail: 'Answer not found' })
  }

  const existing = await prisma.finalGrade.findUnique({ where: { student_answer_id: answerId } })
  let finalGrade
  let action = 'created'
  let oldValue = null
  if (existing) {
    oldValue = { awarded_marks: existing.awarded_marks, feedback: existing.feedback }
    finalGrade = await prisma.finalGrade.update({
      where: { student_answer_id: answerId },
      data: {
        awarded_marks: Number(awarded_marks),
        feedback,
        teacher_id: req.user.id,
      },
    })
    action = 'updated'
  } else {
    finalGrade = await prisma.finalGrade.create({
      data: {
        student_answer_id: answerId,
        teacher_id: req.user.id,
        awarded_marks: Number(awarded_marks),
        feedback,
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      entity_type: 'FinalGrade',
      entity_id: finalGrade.id,
      action,
      actor_id: req.user.id,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: JSON.stringify({ awarded_marks: finalGrade.awarded_marks, feedback: finalGrade.feedback }),
    },
  })
  res.json(finalGrade)
})

router.get('/answers/:id', async (req, res) => {
  const answerId = Number(req.params.id)
  const answer = await prisma.studentAnswer.findUnique({ where: { id: answerId } })
  if (!answer) {
    return res.status(404).json({ detail: 'Answer not found' })
  }
  const aiGrade = await prisma.aIGrade.findUnique({ where: { student_answer_id: answerId } })
  const finalGrade = await prisma.finalGrade.findUnique({ where: { student_answer_id: answerId } })
  const normalizedAi = aiGrade
    ? {
        ...aiGrade,
        matched_key_points: safeJsonParse(aiGrade.matched_key_points, []),
        missing_key_points: safeJsonParse(aiGrade.missing_key_points, []),
        raw_response: safeJsonParse(aiGrade.raw_response, {}),
      }
    : null
  res.json({ answer, ai_grade: normalizedAi, final_grade: finalGrade })
})

router.get('/exams/:id/results', async (req, res) => {
  const examId = Number(req.params.id)
  const answers = await prisma.studentAnswer.findMany({
    where: {
      question: {
        exam_id: examId,
      },
    },
  })
  const results = []
  for (const answer of answers) {
    const aiGrade = await prisma.aIGrade.findUnique({ where: { student_answer_id: answer.id } })
    const finalGrade = await prisma.finalGrade.findUnique({ where: { student_answer_id: answer.id } })
    results.push({
      answer,
      ai_grade: aiGrade
        ? {
            ...aiGrade,
            matched_key_points: safeJsonParse(aiGrade.matched_key_points, []),
            missing_key_points: safeJsonParse(aiGrade.missing_key_points, []),
            raw_response: safeJsonParse(aiGrade.raw_response, {}),
          }
        : null,
      final_grade: finalGrade,
    })
  }
  res.json({ items: results })
})

router.get('/subjects', async (req, res) => {
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } })
  const assigned = await prisma.teacherSubject.findMany({
    where: { teacher_id: req.user.id },
    include: { subject: true },
  })
  res.json({
    subjects,
    assigned_subjects: assigned.map((item) => ({
      ...item.subject,
      study_notes: item.study_notes,
      notes_file_name: item.notes_file_name,
    })),
  })
})

router.get('/classes', async (req, res) => {
  const classes = await prisma.class.findMany({ orderBy: { name: 'asc' } })
  res.json(classes)
})

router.post('/subjects/:id/assign', async (req, res) => {
  const subjectId = Number(req.params.id)
  await prisma.teacherSubject.upsert({
    where: { teacher_id_subject_id: { teacher_id: req.user.id, subject_id: subjectId } },
    update: {},
    create: { teacher_id: req.user.id, subject_id: subjectId },
  })
  res.json({ status: 'assigned' })
})

router.post('/subjects/:id/notes', uploadNotes.single('file'), async (req, res) => {
  const subjectId = Number(req.params.id)
  const record = await prisma.teacherSubject.findUnique({
    where: { teacher_id_subject_id: { teacher_id: req.user.id, subject_id: subjectId } },
  })
  if (!record) {
    return res.status(404).json({ detail: 'Subject not assigned to teacher' })
  }
  if (!req.file) {
    return res.status(400).json({ detail: 'PDF notes file is required' })
  }
  const filePath = path.join('uploads', req.file.filename)
  const buffer = fs.readFileSync(filePath)
  const parsed = await pdfParse(buffer)
  const updated = await prisma.teacherSubject.update({
    where: { teacher_id_subject_id: { teacher_id: req.user.id, subject_id: subjectId } },
    data: {
      study_notes: parsed.text || '',
      notes_file_path: filePath,
      notes_file_name: req.file.originalname,
    },
  })
  res.json(updated)
})

router.get('/subjects/:id/students', async (req, res) => {
  const subjectId = Number(req.params.id)
  const students = await prisma.studentSubject.findMany({
    where: { subject_id: subjectId },
    include: { student: true },
  })
  res.json({ items: students.map((item) => item.student) })
})

router.post('/exams', async (req, res) => {
  const { class_id, subject_id, name, exam_type, exam_code } = req.body
  if (!exam_code) {
    return res.status(400).json({ detail: 'exam_code is required' })
  }
  const assignment = await prisma.teacherSubject.findUnique({
    where: { teacher_id_subject_id: { teacher_id: req.user.id, subject_id: Number(subject_id) } },
  })
  if (!assignment) {
    return res.status(403).json({ detail: 'Teacher is not assigned to this subject' })
  }
  const item = await prisma.exam.create({
    data: {
      class_id: Number(class_id),
      subject_id: Number(subject_id),
      name,
      exam_type: exam_type || 'exam',
      exam_code,
    },
  })
  res.json(item)
})

router.post('/exams/upload', uploadExam.single('file'), async (req, res) => {
  const { class_id, subject_id, name, exam_type, exam_code } = req.body
  if (!req.file) {
    return res.status(400).json({ detail: 'PDF file is required' })
  }
  if (!exam_code) {
    return res.status(400).json({ detail: 'exam_code is required' })
  }
  const assignment = await prisma.teacherSubject.findUnique({
    where: { teacher_id_subject_id: { teacher_id: req.user.id, subject_id: Number(subject_id) } },
  })
  if (!assignment) {
    return res.status(403).json({ detail: 'Teacher is not assigned to this subject' })
  }
  const item = await prisma.exam.create({
    data: {
      class_id: Number(class_id),
      subject_id: Number(subject_id),
      name,
      exam_type: exam_type || 'exam',
      exam_code,
      exam_file_path: path.join('uploads', req.file.filename),
      exam_file_name: req.file.originalname,
    },
  })
  res.json(item)
})

router.post('/questions', async (req, res) => {
  const { exam_id, question_text, model_answer, key_points, total_marks, rubric } = req.body
  const exam = await prisma.exam.findUnique({ where: { id: Number(exam_id) } })
  if (!exam) {
    return res.status(404).json({ detail: 'Exam not found' })
  }
  const assignment = await prisma.teacherSubject.findUnique({
    where: { teacher_id_subject_id: { teacher_id: req.user.id, subject_id: exam.subject_id } },
  })
  if (!assignment) {
    return res.status(403).json({ detail: 'Teacher is not assigned to this subject' })
  }
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
