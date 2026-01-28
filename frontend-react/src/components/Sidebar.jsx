import { NavLink } from 'react-router-dom'

const ROLE_LINKS = {
  admin: [
    { to: '/admin?section=pending', label: 'Pending Approvals' },
    { to: '/admin?section=create-user', label: 'Create User' },
    { to: '/admin?section=class', label: 'Create Class' },
    { to: '/admin?section=subject', label: 'Create Subject' },
    { to: '/teacher', label: 'Teacher View' },
  ],
  teacher: [
    { to: '/teacher?section=subjects', label: 'Subjects I Teach' },
    { to: '/teacher?section=guide', label: 'Notes' },
    { to: '/teacher?section=create-question', label: 'Exams' },
    { to: '/teacher?section=tests', label: 'Tests' },
    { to: '/teacher?section=students', label: 'Students by Subject' },
    { to: '/teacher?section=submit', label: 'Submit Answer' },
    { to: '/teacher?section=ai', label: 'Request AI Grade' },
    { to: '/teacher?section=final', label: 'Approve Final Grade' },
    { to: '/teacher?section=details', label: 'Answer Details' },
    { to: '/teacher?section=exam', label: 'Exam Results' },
    { to: '/teacher?section=student', label: 'Student Results' },
  ],
  student: [
    { to: '/student?section=subjects', label: 'Subjects I Take' },
    { to: '/student?section=teachers', label: 'Teachers by Subject' },
    { to: '/student?section=notes', label: 'Notes' },
    { to: '/student?section=exams', label: 'Exams' },
    { to: '/student?section=tests', label: 'Tests' },
    { to: '/student?section=results', label: 'My Results' },
    { to: '/student?section=upload', label: 'Upload Answers' },
  ],
}

export default function Sidebar({ user, onLogout }) {
  const links = ROLE_LINKS[user?.role] || []
  const navClass = ({ isActive }) => (isActive ? 'active' : undefined)

  return (
    <aside className="sidebar">
      <div className="brand">AI School Management</div>
      <div className="nav-links">
        {links.map((item) => (
          <NavLink key={item.to} to={item.to} className={navClass}>
            {item.label}
          </NavLink>
        ))}
      </div>
      {user && (
        <div className="meta">
          <div className="badge">{user.role}</div>
          <div>{user.full_name}</div>
        </div>
      )}
      {onLogout && (
        <button className="secondary" onClick={onLogout}>
          Logout
        </button>
      )}
    </aside>
  )
}
