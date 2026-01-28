import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest, authHeaders, getApiBase } from '../api'

export default function StudentDashboard({ token, setOutput }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [studentName, setStudentName] = useState('')
  const [error, setError] = useState('')
  const [subjects, setSubjects] = useState([])
  const [enrolledSubjects, setEnrolledSubjects] = useState([])
  const [subjectIdForTeachers, setSubjectIdForTeachers] = useState('')
  const [teachersBySubject, setTeachersBySubject] = useState([])
  const [teachersBySubjectId, setTeachersBySubjectId] = useState({})
  const [activeSection, setActiveSection] = useState('subjects')
  const [uploadForm, setUploadForm] = useState({
    assessment_type: 'exam',
    assessment_id: '',
    file: null,
  })
  const [assessmentOptions, setAssessmentOptions] = useState([])
  const [exams, setExams] = useState([])
  const [tests, setTests] = useState([])
  const [notes, setNotes] = useState([])
  const withErrors = async (fn) => {
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Request failed')
    }
  }
  useEffect(() => {
    const section = searchParams.get('section')
    if (section) {
      setActiveSection(section)
    }
  }, [searchParams])

  const updateSection = (section) => {
    setActiveSection(section)
    setSearchParams({ section })
  }


  const fetchResults = async () => {
    setError('')
    try {
      const data = await apiRequest(`/results/student/${encodeURIComponent(studentName)}`, {
        headers: { ...authHeaders(token) },
      })
      setOutput(data)
    } catch (err) {
      setError(err.message || 'Request failed')
    }
  }

  const loadSubjects = async () => {
    const data = await apiRequest('/results/subjects', {
      headers: { ...authHeaders(token) },
    })
    setSubjects(data.subjects || [])
    setEnrolledSubjects(data.enrolled_subjects || [])
    await loadTeachersForEnrolled(data.enrolled_subjects || [])
  }

  const enrollSubject = async (subjectId) => {
    await apiRequest(`/results/subjects/${subjectId}/enroll`, {
      method: 'POST',
      headers: { ...authHeaders(token) },
    })
    setSubjectIdForTeachers(String(subjectId))
    await loadSubjects()
  }

  const isEnrolled = (subjectId) => enrolledSubjects.some((subject) => subject.id === subjectId)

  const loadTeachersForSubject = async () => {
    const data = await apiRequest(`/results/subjects/${Number(subjectIdForTeachers)}/teachers`, {
      headers: { ...authHeaders(token) },
    })
    setTeachersBySubject(data.items || [])
  }

  useEffect(() => {
    if (activeSection === 'teachers' && subjectIdForTeachers) {
      loadTeachersForSubject().catch(() => {})
    }
  }, [activeSection, subjectIdForTeachers])

  const loadTeachersForEnrolled = async (enrolled) => {
    const entries = await Promise.all(
      enrolled.map(async (subject) => {
        const data = await apiRequest(`/results/subjects/${subject.id}/teachers`, {
          headers: { ...authHeaders(token) },
        })
        return [subject.id, data.items || []]
      }),
    )
    setTeachersBySubjectId(Object.fromEntries(entries))
  }

  const loadExams = async () => {
    const data = await apiRequest('/results/exams', {
      headers: { ...authHeaders(token) },
    })
    setExams(data.items || [])
  }

  const loadTests = async () => {
    const data = await apiRequest('/results/tests', {
      headers: { ...authHeaders(token) },
    })
    setTests(data.items || [])
  }

  const loadNotes = async () => {
    const data = await apiRequest('/results/notes', {
      headers: { ...authHeaders(token) },
    })
    setNotes(data.items || [])
  }

  const downloadExam = async (examId, filename) => {
    const response = await fetch(`${getApiBase()}/results/exams/${examId}/file`, {
      headers: { ...authHeaders(token) },
    })
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const payload = await response.json()
        throw new Error(payload.detail || JSON.stringify(payload))
      }
      const message = await response.text()
      throw new Error(message || 'Failed to download exam')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'exam.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const downloadTest = async (testId, filename) => {
    const response = await fetch(`${getApiBase()}/results/tests/${testId}/file`, {
      headers: { ...authHeaders(token) },
    })
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const payload = await response.json()
        throw new Error(payload.detail || JSON.stringify(payload))
      }
      const message = await response.text()
      throw new Error(message || 'Failed to download test')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'test.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const downloadNotes = async (notesId, filename) => {
    const response = await fetch(`${getApiBase()}/results/notes/${notesId}/file`, {
      headers: { ...authHeaders(token) },
    })
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const payload = await response.json()
        throw new Error(payload.detail || JSON.stringify(payload))
      }
      const message = await response.text()
      throw new Error(message || 'Failed to download notes')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'notes.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const uploadAnswer = async () => {
    if (!uploadForm.assessment_id || !uploadForm.file) {
      setError('Assessment and file are required')
      return
    }
    const formData = new FormData()
    formData.append('assessment_id', uploadForm.assessment_id)
    formData.append('file', uploadForm.file)
    const data = await apiRequest('/results/answers/upload', {
      method: 'POST',
      headers: { ...authHeaders(token) },
      body: formData,
    })
    setOutput(data)
  }

  const loadAssessmentsForUpload = async (assessmentType) => {
    const data = await apiRequest(`/results/assessments?type=${assessmentType}`, {
      headers: { ...authHeaders(token) },
    })
    setAssessmentOptions(data.items || [])
  }


  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Student Dashboard</h2>
          <p className="subtitle">Check your approved results.</p>
        </div>
      </div>

      <div className="teacher-layout single-panel">
        <div className="card teacher-panel">
          {activeSection === 'subjects' && (
            <>
              <h2>Subjects I Take</h2>
              <button className="secondary" onClick={loadSubjects}>
                Load Subjects
              </button>
              <div style={{ marginTop: '10px' }}>
                <strong>Available Subjects</strong>
                {subjects.length === 0 && <div className="subtitle">No subjects yet.</div>}
                {subjects.map((subject) => (
                  <div key={subject.id} style={{ marginTop: '8px' }}>
                    {subject.name} ({subject.code})
                    <button
                      className={isEnrolled(subject.id) ? 'success' : ''}
                      onClick={() => enrollSubject(subject.id)}
                      disabled={isEnrolled(subject.id)}
                    >
                      {isEnrolled(subject.id) ? 'Enrolled' : 'Enroll'}
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '14px' }}>
                <strong>Enrolled Subjects</strong>
                {enrolledSubjects.length === 0 && <div className="subtitle">None enrolled.</div>}
                {enrolledSubjects.map((subject) => (
                  <div key={subject.id}>
                    {subject.name} ({subject.code})
                    <div className="subtitle">
                      {teachersBySubjectId[subject.id]?.length
                        ? `Teacher: ${teachersBySubjectId[subject.id]
                            .map((t) => `${t.full_name} (${t.email})`)
                            .join(', ')}`
                        : 'Teacher: not assigned yet'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'teachers' && (
            <>
              <h2>Teachers by Subject</h2>
              <label>Subject</label>
              <select value={subjectIdForTeachers} onChange={(e) => setSubjectIdForTeachers(e.target.value)}>
                <option value="">Select subject</option>
                {enrolledSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
              <button onClick={loadTeachersForSubject} disabled={!subjectIdForTeachers}>
                Load Teachers
              </button>
              <div style={{ marginTop: '10px' }}>
                {teachersBySubject.length === 0 && <div className="subtitle">No teachers found.</div>}
                {teachersBySubject.map((teacher) => (
                  <div key={teacher.id}>
                    {teacher.full_name} ({teacher.email})
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'results' && (
            <>
              <h2>View My Results</h2>
              <label>Student Name</label>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
              <button onClick={fetchResults}>Fetch Results</button>
              {error && <div className="error">{error}</div>}
            </>
          )}

          {activeSection === 'exams' && (
            <>
              <h2>Exams</h2>
              <button className="secondary" onClick={loadExams}>
                Load Exams
              </button>
              <div style={{ marginTop: '10px' }}>
                {exams.length === 0 && <div className="subtitle">No exams available yet.</div>}
                {exams.map((exam) => (
                  <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span>
                      {exam.name} (Subject ID: {exam.subject_id})
                    </span>
                    <button onClick={() => withErrors(() => downloadExam(exam.id, exam.exam_file_name))}>
                      Download PDF
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'tests' && (
            <>
              <h2>Tests</h2>
              <button className="secondary" onClick={loadTests}>
                Load Tests
              </button>
              <div style={{ marginTop: '10px' }}>
                {tests.length === 0 && <div className="subtitle">No tests available yet.</div>}
                {tests.map((test) => (
                  <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span>
                      {test.name} (Subject ID: {test.subject_id})
                    </span>
                    <button onClick={() => withErrors(() => downloadTest(test.id, test.exam_file_name))}>
                      Download PDF
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'notes' && (
            <>
              <h2>Notes</h2>
              <button className="secondary" onClick={loadNotes}>
                Load Notes
              </button>
              <div style={{ marginTop: '10px' }}>
                {notes.length === 0 && <div className="subtitle">No notes uploaded yet.</div>}
                {notes.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span>
                      {item.subject?.name} ({item.subject?.code}) - {item.teacher?.full_name}
                    </span>
                    <button onClick={() => withErrors(() => downloadNotes(item.id, item.notes_file_name))}>
                      Download PDF
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'upload' && (
            <>
              <h2>Upload Answer (Scan)</h2>
              <label>Assessment Type</label>
              <select
                value={uploadForm.assessment_type}
                onChange={(e) => {
                  const nextType = e.target.value
                  setUploadForm({
                    ...uploadForm,
                    assessment_type: nextType,
                    assessment_id: '',
                  })
                  setAssessmentOptions([])
                }}
              >
                <option value="exam">Exam</option>
                <option value="test">Test</option>
              </select>
              <button
                className="secondary"
                onClick={() => withErrors(() => loadAssessmentsForUpload(uploadForm.assessment_type))}
              >
                Load {uploadForm.assessment_type === 'test' ? 'Tests' : 'Exams'}
              </button>
              <label style={{ marginTop: '8px' }}>Assessment</label>
              <select
                value={uploadForm.assessment_id}
                onChange={(e) => setUploadForm({ ...uploadForm, assessment_id: e.target.value })}
              >
                <option value="">Select assessment</option>
                {assessmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.subject?.name} - {item.name} ({item.exam_code})
                  </option>
                ))}
              </select>
              <label>Answer File (image)</label>
              <input type="file" accept="image/*" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} />
              <button onClick={uploadAnswer}>Upload Answer</button>
            </>
          )}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </div>
  )
}
