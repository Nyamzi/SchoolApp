import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <div className="landing-badge">AI School Management</div>
        <h1>Grade faster, keep teachers in control.</h1>
        <p>
          A modern platform for AI-assisted grading with human approval, audit trails, and role-based dashboards for
          admins, teachers, and students.
        </p>
        <div className="landing-actions">
          <Link className="primary-link" to="/signup">
            Create an Account
          </Link>
          <Link className="secondary-link" to="/login">
            Sign In
          </Link>
        </div>
      </header>

      <section className="landing-section">
        <h2>Why schools choose this system</h2>
        <div className="landing-grid">
          <div className="landing-card">
            <h3>Teacher-approved grading</h3>
            <p>AI suggests marks, but teachers review, edit, and approve every final grade.</p>
          </div>
          <div className="landing-card">
            <h3>Clear feedback</h3>
            <p>Auto-generated feedback highlights matched and missing key points for transparency.</p>
          </div>
          <div className="landing-card">
            <h3>Audit-ready</h3>
            <p>Every grade change is tracked so schools stay compliant and accountable.</p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2>How it works</h2>
        <div className="landing-steps">
          <div>
            <span>1</span>
            <p>Admin sets up classes, subjects, exams, and rubrics.</p>
          </div>
          <div>
            <span>2</span>
            <p>Teachers submit answers and request AI grading.</p>
          </div>
          <div>
            <span>3</span>
            <p>Teachers approve final marks and students view results.</p>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Ready to get started?</h2>
        <p>Sign up to request access or sign in if your school already uses the platform.</p>
        <div className="landing-actions">
          <Link className="primary-link" to="/signup">
            Sign Up
          </Link>
          <Link className="secondary-link" to="/login">
            Sign In
          </Link>
        </div>
      </section>
    </div>
  )
}
