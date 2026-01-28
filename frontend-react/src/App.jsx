import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest, getApiBase, setApiBase } from './api'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminDashboard from './pages/AdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import BootstrapAdmin from './pages/BootstrapAdmin'
import Landing from './pages/Landing'
import Sidebar from './components/Sidebar'

const ROLE_PATHS = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
}

function RequireAuth({ token, role, allowed, children }) {
  if (!token || !role) {
    return <Navigate to="/login" replace />
  }
  if (allowed && !allowed.includes(role)) {
    return <Navigate to={ROLE_PATHS[role] || '/login'} replace />
  }
  return children
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [apiBaseValue, setApiBaseValue] = useState(getApiBase())
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [output, setOutput] = useState({ message: 'Ready' })
  const [status, setStatus] = useState('')

  const role = user?.role
  const initialRoute = useMemo(() => ROLE_PATHS[role] || '/login', [role])

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null)
        return
      }
      try {
        const me = await apiRequest('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUser(me)
      } catch (err) {
        setUser(null)
      }
    }
    loadUser()
  }, [token])

  useEffect(() => {
    const redirectPaths = ['/login', '/signup', '/admin-setup', '/']
    if (role && redirectPaths.includes(location.pathname)) {
      navigate(initialRoute, { replace: true })
    }
  }, [role, initialRoute, location.pathname, navigate])

  const handleLoginSuccess = ({ token: newToken, user: newUser }) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(newUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    setOutput({ message: 'Logged out' })
    navigate('/', { replace: true })
  }

  const saveApiBase = () => {
    setApiBase(apiBaseValue)
    setStatus(`Using ${apiBaseValue}`)
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} setOutput={setOutput} />} />
      <Route path="/signup" element={<Signup setOutput={setOutput} />} />
      <Route path="/admin-setup" element={<BootstrapAdmin setOutput={setOutput} />} />
      <Route
        path="/admin"
        element={
          <RequireAuth token={token} role={role} allowed={['admin']}>
            <div className="app-shell">
              <Sidebar user={user} onLogout={handleLogout} />
              <main className="main">
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="subtitle">Manage onboarding, grading, and results in one place.</p>
                  </div>
                </div>

                <AdminDashboard token={token} setOutput={setOutput} />
              </main>
            </div>
          </RequireAuth>
        }
      />
      <Route
        path="/teacher"
        element={
          <RequireAuth token={token} role={role} allowed={['teacher', 'admin']}>
            <div className="app-shell">
              <Sidebar user={user} onLogout={handleLogout} />
              <main className="main">
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="subtitle">Manage onboarding, grading, and results in one place.</p>
                  </div>
                </div>

                <TeacherDashboard token={token} setOutput={setOutput} />
              </main>
            </div>
          </RequireAuth>
        }
      />
      <Route
        path="/student"
        element={
          <RequireAuth token={token} role={role} allowed={['student', 'teacher', 'admin']}>
            <div className="app-shell">
              <Sidebar user={user} onLogout={handleLogout} />
              <main className="main">
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="subtitle">Manage onboarding, grading, and results in one place.</p>
                  </div>
                </div>

                <StudentDashboard token={token} setOutput={setOutput} />
              </main>
            </div>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
