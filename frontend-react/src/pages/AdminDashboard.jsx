import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest, authHeaders } from '../api'

const emptyQuestion = {
  exam_id: '',
  question_text: '',
  model_answer: '',
  key_points: '',
  total_marks: '',
  rubric: '{"5":"Full","3":"Partial","1":"Minimal"}',
}

export default function AdminDashboard({ token, setOutput }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [bootstrap, setBootstrap] = useState({ email: '', full_name: '', password: '' })
  const [userForm, setUserForm] = useState({ email: '', full_name: '', role: 'teacher', password: '' })
  const [classForm, setClassForm] = useState({ name: '', academic_year: '' })
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' })
  const [examForm, setExamForm] = useState({ class_id: '', subject_id: '', name: '' })
  const [questionForm, setQuestionForm] = useState(emptyQuestion)
  const [pendingUsers, setPendingUsers] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [subjectQuery, setSubjectQuery] = useState('')
  const [editingSubjectId, setEditingSubjectId] = useState(null)
  const [editingSubject, setEditingSubject] = useState({ name: '', code: '' })
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('pending')

  const handle = (setter) => (field) => (event) => {
    setter((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const withErrors = async (fn) => {
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Request failed')
    }
  }

  const submitBootstrap = async () => {
    const payload = { ...bootstrap, role: 'admin' }
    const data = await apiRequest('/auth/bootstrap-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setOutput(data)
  }

  const createUser = async () => {
    const data = await apiRequest('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(userForm),
    })
    setOutput(data)
  }

  const createClass = async () => {
    const data = await apiRequest('/admin/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(classForm),
    })
    setOutput(data)
  }

  const createSubject = async () => {
    const data = await apiRequest('/admin/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(subjectForm),
    })
    setOutput(data)
    await loadSubjects()
  }

  const createExam = async () => {
    const payload = {
      ...examForm,
      class_id: Number(examForm.class_id),
      subject_id: Number(examForm.subject_id),
    }
    const data = await apiRequest('/admin/exams', {
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
    const data = await apiRequest('/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(payload),
    })
    setOutput(data)
  }

  const loadPendingUsers = async () => {
    setPendingLoading(true)
    try {
      const data = await apiRequest('/admin/users/pending', {
        headers: { ...authHeaders(token) },
      })
      setPendingUsers(data)
    } finally {
      setPendingLoading(false)
    }
  }

  const loadSubjects = async () => {
    const data = await apiRequest('/admin/subjects', {
      headers: { ...authHeaders(token) },
    })
    setSubjects(data || [])
  }

  const deleteSubject = async (subjectId) => {
    await apiRequest(`/admin/subjects/${subjectId}`, {
      method: 'DELETE',
      headers: { ...authHeaders(token) },
    })
    await loadSubjects()
  }

  const startEditSubject = (subject) => {
    setEditingSubjectId(subject.id)
    setEditingSubject({ name: subject.name, code: subject.code })
  }

  const cancelEditSubject = () => {
    setEditingSubjectId(null)
    setEditingSubject({ name: '', code: '' })
  }

  const saveSubject = async () => {
    await apiRequest(`/admin/subjects/${editingSubjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(editingSubject),
    })
    cancelEditSubject()
    await loadSubjects()
  }

  const approveUser = async (userId) => {
    const data = await apiRequest(`/admin/users/${userId}/approve`, {
      method: 'PUT',
      headers: { ...authHeaders(token) },
    })
    setOutput(data)
    await loadPendingUsers()
  }

  useEffect(() => {
    if (token) {
      loadPendingUsers()
      loadSubjects()
    }
  }, [token])

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

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Admin Dashboard</h2>
          <p className="subtitle">Approve users and manage academic setup.</p>
        </div>
      </div>

      <div className="teacher-layout single-panel">
        <div className="card teacher-panel">
          {activeSection === 'pending' && (
            <>
              <h2>Pending Approvals</h2>
              {pendingLoading && <div className="subtitle">Loading...</div>}
              {!pendingLoading && pendingUsers.length === 0 && <div className="subtitle">No pending users.</div>}
              {!pendingLoading &&
                pendingUsers.map((user) => (
                  <div key={user.id} style={{ marginBottom: '10px' }}>
                    <div>
                      <strong>{user.full_name}</strong> ({user.role})
                    </div>
                    <div className="subtitle">{user.email}</div>
                    <button className="secondary" onClick={() => withErrors(() => approveUser(user.id))}>
                      Approve
                    </button>
                  </div>
                ))}
            </>
          )}

          {activeSection === 'create-user' && (
            <>
              <h2>Create User</h2>
              <label>Email</label>
              <input value={userForm.email} onChange={handle(setUserForm)('email')} />
              <label>Full Name</label>
              <input value={userForm.full_name} onChange={handle(setUserForm)('full_name')} />
              <label>Role</label>
              <input value={userForm.role} onChange={handle(setUserForm)('role')} placeholder="admin/teacher/student" />
              <label>Password</label>
              <input type="password" value={userForm.password} onChange={handle(setUserForm)('password')} />
              <button onClick={() => withErrors(createUser)}>Create User</button>
            </>
          )}

          {activeSection === 'class' && (
            <>
              <h2>Create Class</h2>
              <label>Name</label>
              <input value={classForm.name} onChange={handle(setClassForm)('name')} />
              <label>Academic Year</label>
              <input value={classForm.academic_year} onChange={handle(setClassForm)('academic_year')} />
              <button onClick={() => withErrors(createClass)}>Create Class</button>
            </>
          )}

          {activeSection === 'subject' && (
            <>
              <h2>Create Subject</h2>
              <label>Name</label>
              <input value={subjectForm.name} onChange={handle(setSubjectForm)('name')} />
              <label>Code</label>
              <input value={subjectForm.code} onChange={handle(setSubjectForm)('code')} />
              <button onClick={() => withErrors(createSubject)}>Create Subject</button>
              <div style={{ marginTop: '12px' }}>
                <strong>Existing Subjects</strong>
                <label>Search</label>
                <input value={subjectQuery} onChange={(e) => setSubjectQuery(e.target.value)} placeholder="Search by name or code" />
                {subjects.length === 0 && <div className="subtitle">No subjects yet.</div>}
                {subjects
                  .filter((subject) => {
                    const q = subjectQuery.trim().toLowerCase()
                    if (!q) return true
                    return subject.name.toLowerCase().includes(q) || subject.code.toLowerCase().includes(q)
                  })
                  .map((subject) => (
                    <div key={subject.id} style={{ marginTop: '10px' }}>
                      {editingSubjectId === subject.id ? (
                        <div style={{ display: 'grid', gap: '6px' }}>
                          <input
                            value={editingSubject.name}
                            onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                          />
                          <input
                            value={editingSubject.code}
                            onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => withErrors(saveSubject)}>Save</button>
                            <button className="secondary" onClick={cancelEditSubject}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {subject.name} ({subject.code})
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="secondary" onClick={() => startEditSubject(subject)}>
                              Edit
                            </button>
                            <button className="secondary" onClick={() => withErrors(() => deleteSubject(subject.id))}>
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </div>
  )
}
