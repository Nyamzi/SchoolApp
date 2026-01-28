🏫 AI School Management System

A web-based system for AI-assisted grading where teachers remain in control. Teachers can create exams/tests and questions, upload notes and PDFs, and request AI-generated marks. Students can enroll in subjects, download materials, and upload answers.

✨ Features

🔑 Role-based access: Admin, Teacher, Student

📝 Teacher-controlled exams/tests: Upload PDFs and create questions

📚 Teacher notes per subject: PDFs used by AI as grading context

🧑‍🎓 Student management: Enrollment in subjects

📥 Downloadable materials: Exams, tests, and notes for students

🤖 AI-assisted grading: Teachers approve suggested marks

📜 Audit logs: Track changes to grades

🛠 Tech Stack

Backend API: Node.js (Express + Prisma)

AI Service: Python (FastAPI)

Database: SQLite (default), PostgreSQL-ready

Frontend: React (Vite)

📁 Project Structure
School_Management/
  frontend-react/
    src/
    package.json
  backend-node/
    src/
    prisma/
  ai-service/
    main.py
    requirements.txt
    data/
      papers/

🚀 Getting Started
1) Backend API (Node.js)
cd School_Management/backend-node
npm install


Create .env:

PORT=3001
JWT_SECRET=change-me
DATABASE_URL="file:./school.db"
AI_SERVICE_URL=http://127.0.0.1:8001
ADMIN_RESET_TOKEN=change-me


Generate Prisma client and run migrations:

npm run prisma:generate
npm run prisma:migrate


Start the backend:

npm run dev

2) AI Grading Service (Python)
cd School_Management/ai-service
python -m venv .venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt


Create .env:

OPENAI_API_KEY=your_key_here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
AI_MOCK=false


Run the service:

uvicorn main:app --host 127.0.0.1 --port 8001

3) Frontend (React)
cd School_Management/frontend-react
npm install
npm run dev


Open the Vite URL (usually http://localhost:5173). The frontend communicates with the backend at http://127.0.0.1:3001.

🔐 Login Flow

👑 Admin creates subjects and classes.

🧑‍🏫 / 🎓 Teachers/Students sign up and wait for admin approval.

🧑‍🏫 Teachers assign subjects, upload notes and exams/tests, and create questions.

🎓 Students enroll in subjects, download materials, and upload answers.

🧑‍🏫 Teachers request AI grading and approve final marks.

🌐 API Overview

Base URL: http://localhost:3001

Auth

POST /auth/bootstrap-admin

POST /auth/signup

POST /auth/login

GET /auth/me

Admin

GET /admin/users/pending

POST /admin/users/:id/approve

POST /admin/classes

POST /admin/subjects

Teacher

GET /teacher/subjects

POST /teacher/subjects/:id/assign

POST /teacher/subjects/:id/notes

GET /teacher/subjects/:id/students

POST /teacher/exams

POST /teacher/exams/upload

POST /teacher/questions

POST /teacher/answers

POST /teacher/answers/:id/ai-grade

PUT /teacher/answers/:id/final-grade

Student / Results

GET /results/subjects

POST /results/subjects/:id/enroll

GET /results/subjects/:id/teachers

GET /results/notes

GET /results/notes/:id/file

GET /results/exams

GET /results/exams/:id/file

GET /results/tests

GET /results/tests/:id/file

POST /results/answers/upload

GET /results/student/:name

🤖 AI Grading

AI only suggests marks and feedback.

🧑‍🏫 Teachers always approve final grades.

Prompt logic is located in ai-service/ai_grading.py.

Set AI_MOCK=true for testing without calling the AI model.

🗂 Dataset

Place exam/test JSON files in:

ai-service/data/papers/

💾 Database Schema (Core)

Users

Classes

Subjects

Exams (with exam_type and exam_code)

Questions

StudentAnswers

AIGrades

FinalGrades

AuditLogs"# SchoolApp" 
