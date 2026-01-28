import { useState } from 'react'
import { apiRequest } from '../api'

const defaultForm = {
  email: '',
  full_name: '',
  role: 'teacher',
  password: '',
}

export default function Signup({ setOutput }) {
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setOutput(data)
      setSuccess('Signup submitted. Wait for admin approval.')
      setForm(defaultForm)
    } catch (err) {
      setError(err.message || 'Signup failed')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Create Account</h2>
          <p className="subtitle">Submit your details for admin approval.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSignup}>
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          <label>Full Name</label>
          <input value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} required />
          <label>Role</label>
          <select value={form.role} onChange={(e) => updateField('role', e.target.value)}>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
          />
          <button type="submit">Submit Signup</button>
          {success && <div className="subtitle">{success}</div>}
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  )
}
