import { useState } from 'react'
import { apiRequest } from '../api'

export default function BootstrapAdmin({ setOutput }) {
  const [form, setForm] = useState({ email: '', full_name: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const data = await apiRequest('/auth/bootstrap-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'admin' }),
      })
      setOutput(data)
      setSuccess('Admin created. You can now log in.')
    } catch (err) {
      setError(err.message || 'Bootstrap failed')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Bootstrap Admin</h2>
          <p className="subtitle">Create the first admin account once.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          <label>Full Name</label>
          <input value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} required />
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
          />
          <button type="submit">Create Admin</button>
          {success && <div className="subtitle">{success}</div>}
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  )
}
