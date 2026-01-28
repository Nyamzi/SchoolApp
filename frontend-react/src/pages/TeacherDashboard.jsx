import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest, authHeaders } from '../api'

export default function TeacherDashboard({ token, setOutput }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [answerForm, setAnswerForm] = useState({ question_id: '', student_name: '', answer_text: '' })
  const [aiAnswerId, setAiAnswerId] = useState('')
  const [finalForm, setFinalForm] = useState({ answer_id: '', awarded_marks: '', feedback: '' })
  const [detailsId, setDetailsId] = useState('')
  const [examId, setExamId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('submit')
  useEffect(() => {
    const section = searchParams.get('section')
    if (section) {
      setActiveSection(section)
    }
  }, [searchParams])

  useEffect(() => {
    if (activeSection === 'subjects') {
      loadSubjects().catch(() => {})
    }
  }, [activeSection])

  const updateSection = (section) => {
    setActiveSection(section)
    setSearchParams({ section })
  }
  const [subjects, setSubjects] = useState([])
  const [assignedSubjects, setAssignedSubjects] = useState([])
  const [studentsBySubject, setStudentsBySubject] = useState([])
  const [subjectIdForStudents, setSubjectIdForStudents] = useState('')
  const [classes, setClasses] = useState([])
  const [examForm, setExamForm] = useState({ class_id: '', subject_id: '', name: '', exam_code: '', file: null })
  const [questionForm, setQuestionForm] = useState({
    exam_id: '',
    question_text: '',
    model_answer: '',
    key_points: '',
    total_marks: '',
    rubric: '{"5":"Full","3":"Partial","1":"Minimal"}',
  })
  const [notesForm, setNotesForm] = useState({ subject_id: '', file: null })

  const withErrors = async (fn) => {
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Request failed')
    }
  }

  const submitAnswer = async () => {
    const payload = {
      ...answerForm,
      question_id: Number(answerForm.question_id),
    }
    const data = await apiRequest('/teacher/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(payload),
    })
    setOutput(data)
  }

  const requestAiGrade = async () => {
    const data = await apiRequest(`/teacher/answers/${Number(aiAnswerId)}/ai-grade`, {
      method: 'POST',
      headers: { ...authHeaders(token) },
    })
    setOutput(data)
  }

  const approveFinal = async () => {
    const payload = {
      awarded_marks: Number(finalForm.awarded_marks),
      feedback: finalForm.feedback,
    }
    const data = await apiRequest(`/teacher/answers/${Number(finalForm.answer_id)}/final-grade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(payload),
    })
    setOutput(data)
  }

  const getAnswerDetails = async () => {
    const data = await apiRequest(`/teacher/answers/${Number(detailsId)}`, {
      headers: { ...authHeaders(token) },
    })
    setOutput(data)
  }

  const getExamResults = async () => {
    const data = await apiRequest(`/teacher/exams/${Number(examId)}/results`, {
      headers: { ...authHeaders(token) },
    })
    setOutput(data)
  }

  const getStudentResults = async () => {
    const data = await apiRequest(`/results/student/${encodeURIComponent(studentName)}`, {
      headers: { ...authHeaders(token) },
    })
    setOutput(data)
  }

  const loadSubjects = async () => {
    const data = await apiRequest('/teacher/subjects', {
      headers: { ...authHeaders(token) },
    })
    setSubjects(data.subjects || [])
    setAssignedSubjects(data.assigned_subjects || [])
  }

  const isAssigned = (subjectId) => assignedSubjects.some((subject) => subject.id === subjectId)

  const assignSubject = async (subjectId) => {
    await apiRequest(`/teacher/subjects/${subjectId}/assign`, {
      method: 'POST',
      headers: { ...authHeaders(token) },
    })
    await loadSubjects()
  }

  const verifySubject = async (subjectId, subjectLabel) => {
    const confirmed = window.confirm(`Confirm you will teach ${subjectLabel}?`)
    if (!confirmed) return
    await assignSubject(subjectId)
  }

  const loadStudentsForSubject = async () => {
    const data = await apiRequest(`/teacher/subjects/${Number(subjectIdForStudents)}/students`, {
      headers: { ...authHeaders(token) },
    })
    setStudentsBySubject(data.items || [])
  }

  const loadClasses = async () => {
    const data = await apiRequest('/teacher/classes', {
      headers: { ...authHeaders(token) },
    })
    setClasses(data || [])
  }

  const uploadNotes = async () => {
    const subjectId = Number(notesForm.subject_id)
    if (!notesForm.file) {
      setError('Please select a PDF file')
      return
    }
    const formData = new FormData()
    formData.append('file', notesForm.file)
    const data = await apiRequest(`/teacher/subjects/${subjectId}/notes`, {
      method: 'POST',
      headers: { ...authHeaders(token) },
      body: formData,
    })
    setOutput(data)
    await loadSubjects()
  }

  const createExam = async (examType = 'exam') => {
    if (examForm.file) {
      const formData = new FormData()
      formData.append('class_id', examForm.class_id)
      formData.append('subject_id', examForm.subject_id)
      formData.append('name', examForm.name)
      formData.append('exam_code', examForm.exam_code)
      formData.append('exam_type', examType)
      formData.append('file', examForm.file)
      const data = await apiRequest('/teacher/exams/upload', {
        method: 'POST',
        headers: { ...authHeaders(token) },
        body: formData,
      })
      setOutput(data)
      return
    }
    const payload = {
      class_id: Number(examForm.class_id),
      subject_id: Number(examForm.subject_id),
      name: examForm.name,
      exam_code: examForm.exam_code,
      exam_type: examType,
    }
    const data = await apiRequest('/teacher/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(payload),
    })
    setOutput(data)
  }

  const createQuestion = async () => {
    let rubric = {}
    try {
      rubric = JSON.parse(questionForm.rubric || '{}')
    } catch (err) {
      setError('Invalid rubric JSON')
      return
    }
    const payload = {
      exam_id: Number(questionForm.exam_id),
      question_text: questionForm.question_text,
      model_answer: questionForm.model_answer,
      key_points: questionForm.key_points
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      total_marks: Number(questionForm.total_marks),
      rubric,
    }
    const data = await apiRequest('/teacher/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(payload),
    })
    setOutput(data)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Teacher Dashboard</h2>
          <p className="subtitle">Submit answers, review AI grades, and finalize marks.</p>
        </div>
      </div>

      <div className="teacher-layout single-panel">
        <div className="card teacher-panel">
          {activeSection === 'subjects' && (
            <>
              <h2>Subjects I Teach</h2>
              <button className="secondary" onClick={() => withErrors(loadSubjects)}>
                Load Subjects
              </button>
              <div style={{ marginTop: '10px' }}>
                <strong>Available Subjects</strong>
                {subjects.length === 0 && <div className="subtitle">No subjects yet.</div>}
                {subjects.map((subject) => (
                  <div key={subject.id} style={{ marginTop: '8px' }}>
                    {subject.name} ({subject.code})
                    <button
                      className={isAssigned(subject.id) ? 'success' : ''}
                      onClick={() =>
                        withErrors(() => verifySubject(subject.id, `${subject.name} (${subject.code})`))
                      }
                      disabled={isAssigned(subject.id)}
                    >
                      {isAssigned(subject.id) ? "You're teaching this" : 'Verify Teaching'}
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '14px' }}>
                <strong>Assigned Subjects</strong>
                {assignedSubjects.length === 0 && <div className="subtitle">None assigned.</div>}
                {assignedSubjects.map((subject) => (
                  <div key={subject.id}>
                    {subject.name} ({subject.code})
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'guide' && (
            <>
              <h2>Teaching Notes (PDF)</h2>
              <label>Subject</label>
              <select
                value={notesForm.subject_id}
                onChange={(e) => setNotesForm({ ...notesForm, subject_id: e.target.value })}
              >
                <option value="">Select subject</option>
                {assignedSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
              <label>Notes PDF</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setNotesForm({ ...notesForm, file: e.target.files?.[0] || null })}
              />
              <button onClick={() => withErrors(uploadNotes)} disabled={!notesForm.subject_id}>
                Upload Notes
              </button>
              <div className="subtitle" style={{ marginTop: '8px' }}>
                {assignedSubjects.find((s) => String(s.id) === notesForm.subject_id)?.notes_file_name
                  ? `Uploaded: ${
                      assignedSubjects.find((s) => String(s.id) === notesForm.subject_id)?.notes_file_name
                    }`
                  : 'No notes uploaded yet'}
              </div>
            </>
          )}

          {activeSection === 'create-question' && (
            <>
              <h2>Exams</h2>
              <button className="secondary" onClick={() => withErrors(loadClasses)}>
                Load Classes
              </button>
              <label>Class</label>
              <select
                value={examForm.class_id}
                onChange={(e) => setExamForm({ ...examForm, class_id: e.target.value })}
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.academic_year})
                  </option>
                ))}
              </select>
              <label>Subject</label>
              <select
                value={examForm.subject_id}
                onChange={(e) => setExamForm({ ...examForm, subject_id: e.target.value })}
              >
                <option value="">Select subject</option>
                {assignedSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
              <label>Exam Name</label>
              <input value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} />
              <label>Exam Number</label>
              <input value={examForm.exam_code} onChange={(e) => setExamForm({ ...examForm, exam_code: e.target.value })} />
              <label>Exam PDF (optional)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setExamForm({ ...examForm, file: e.target.files?.[0] || null })}
              />
              <button onClick={() => withErrors(() => createExam('exam'))}>Create Exam</button>
            </>
          )}

          {activeSection === 'tests' && (
            <>
              <h2>Tests</h2>
              <button className="secondary" onClick={() => withErrors(loadClasses)}>
                Load Classes
              </button>
              <label>Class</label>
              <select
                value={examForm.class_id}
                onChange={(e) => setExamForm({ ...examForm, class_id: e.target.value })}
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.academic_year})
                  </option>
                ))}
              </select>
              <label>Subject</label>
              <select
                value={examForm.subject_id}
                onChange={(e) => setExamForm({ ...examForm, subject_id: e.target.value })}
              >
                <option value="">Select subject</option>
                {assignedSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
              <label>Test Name</label>
              <input value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} />
              <label>Test Number</label>
              <input value={examForm.exam_code} onChange={(e) => setExamForm({ ...examForm, exam_code: e.target.value })} />
              <label>Test PDF (optional)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setExamForm({ ...examForm, file: e.target.files?.[0] || null })}
              />
              <button onClick={() => withErrors(() => createExam('test'))}>Create Test</button>
            </>
          )}

          {activeSection === 'students' && (
            <>
              <h2>Students by Subject</h2>
              <label>Subject</label>
              <select value={subjectIdForStudents} onChange={(e) => setSubjectIdForStudents(e.target.value)}>
                <option value="">Select subject</option>
                {assignedSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
              <button onClick={() => withErrors(loadStudentsForSubject)} disabled={!subjectIdForStudents}>
                Load Students
              </button>
              <div style={{ marginTop: '10px' }}>
                {studentsBySubject.length > 0 && (
                  <div className="subtitle">Total: {studentsBySubject.length} students</div>
                )}
                {studentsBySubject.length === 0 && <div className="subtitle">No students found.</div>}
                {studentsBySubject.map((student) => (
                  <div key={student.id}>
                    {student.full_name} ({student.email})
                  </div>
                ))}
              </div>
            </>
          )}
          {activeSection === 'submit' && (
            <>
              <h2>Submit Student Answer</h2>
              <label>Question ID</label>
              <input value={answerForm.question_id} onChange={(e) => setAnswerForm({ ...answerForm, question_id: e.target.value })} />
              <label>Student Name</label>
              <input value={answerForm.student_name} onChange={(e) => setAnswerForm({ ...answerForm, student_name: e.target.value })} />
              <label>Answer</label>
              <textarea rows="3" value={answerForm.answer_text} onChange={(e) => setAnswerForm({ ...answerForm, answer_text: e.target.value })} />
              <button onClick={() => withErrors(submitAnswer)}>Submit Answer</button>
            </>
          )}

          {activeSection === 'ai' && (
            <>
              <h2>Request AI Grade</h2>
              <label>Answer ID</label>
              <input value={aiAnswerId} onChange={(e) => setAiAnswerId(e.target.value)} />
              <button onClick={() => withErrors(requestAiGrade)}>Get AI Grade</button>
            </>
          )}

          {activeSection === 'final' && (
            <>
              <h2>Approve Final Grade</h2>
              <label>Answer ID</label>
              <input value={finalForm.answer_id} onChange={(e) => setFinalForm({ ...finalForm, answer_id: e.target.value })} />
              <label>Awarded Marks</label>
              <input value={finalForm.awarded_marks} onChange={(e) => setFinalForm({ ...finalForm, awarded_marks: e.target.value })} />
              <label>Feedback</label>
              <textarea rows="2" value={finalForm.feedback} onChange={(e) => setFinalForm({ ...finalForm, feedback: e.target.value })} />
              <button onClick={() => withErrors(approveFinal)}>Approve</button>
            </>
          )}

          {activeSection === 'details' && (
            <>
              <h2>Answer Details</h2>
              <label>Answer ID</label>
              <input value={detailsId} onChange={(e) => setDetailsId(e.target.value)} />
              <button onClick={() => withErrors(getAnswerDetails)}>Fetch Details</button>
            </>
          )}

          {activeSection === 'exam' && (
            <>
              <h2>Exam Results</h2>
              <label>Exam ID</label>
              <input value={examId} onChange={(e) => setExamId(e.target.value)} />
              <button onClick={() => withErrors(getExamResults)}>Fetch Results</button>
            </>
          )}

          {activeSection === 'student' && (
            <>
              <h2>Student Results</h2>
              <label>Student Name</label>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
              <button onClick={() => withErrors(getStudentResults)}>Fetch Results</button>
            </>
          )}

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </div>
  )
}
