import { useState } from 'react'
import { apiRequest } from '../api'

const defaultCredentials = {
  email: '',
  password: '',
}

export default function Login({ onLoginSuccess, setOutput }) {
  const [form, setForm] = useState(defaultCredentials)
  const [error, setError] = useState('')

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const tokenData = await apiRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const token = tokenData.access_token
      const me = await apiRequest('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      onLoginSuccess({ token, user: me })
      setOutput(tokenData)
    } catch (err) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Welcome Back</h2>
          <p className="subtitle">Sign in to access your dashboard.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            required
          />
          <button type="submit">Login</button>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  )
}
