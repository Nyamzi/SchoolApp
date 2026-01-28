import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import teacherRoutes from './routes/teacher.js'
import resultsRoutes from './routes/results.js'
import { requireAuth, requireRole } from './middleware/auth.js'
import fs from 'fs'
import path from 'path'

dotenv.config()

const app = express()
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())

const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management API',
      version: '1.0.0',
      description: 'Node.js API for School Management System',
    },
    servers: [{ url: 'http://127.0.0.1:3001' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/auth/bootstrap-admin': {
        post: {
          summary: 'Bootstrap first admin',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'full_name', 'password', 'role'],
                  properties: {
                    email: { type: 'string' },
                    full_name: { type: 'string' },
                    password: { type: 'string' },
                    role: { type: 'string', example: 'admin' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Admin user created' } },
        },
      },
      '/auth/signup': {
        post: {
          summary: 'Signup (teacher/student)',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'full_name', 'password', 'role'],
                  properties: {
                    email: { type: 'string' },
                    full_name: { type: 'string' },
                    password: { type: 'string' },
                    role: { type: 'string', enum: ['teacher', 'student'] },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'User created, pending approval' } },
        },
      },
      '/auth/login': {
        post: {
          summary: 'Login',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Access token' } },
        },
      },
      '/auth/me': {
        get: {
          summary: 'Get current user',
          responses: { 200: { description: 'User profile' } },
        },
      },
      '/admin/users/pending': {
        get: { summary: 'List pending users', responses: { 200: { description: 'Users' } } },
      },
      '/admin/users/{id}/approve': {
        put: {
          summary: 'Approve user',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'User approved' } },
        },
      },
      '/teacher/answers': {
        post: {
          summary: 'Submit student answer',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['question_id', 'student_name', 'answer_text'],
                  properties: {
                    question_id: { type: 'integer' },
                    student_name: { type: 'string' },
                    answer_text: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Answer stored' } },
        },
      },
      '/teacher/answers/{id}/ai-grade': {
        post: {
          summary: 'Request AI grade',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'AI grade' } },
        },
      },
      '/teacher/answers/{id}/final-grade': {
        put: {
          summary: 'Approve final grade',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['awarded_marks'],
                  properties: {
                    awarded_marks: { type: 'number' },
                    feedback: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Final grade' } },
        },
      },
      '/results/student/{name}': {
        get: {
          summary: 'Get student results',
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Results' } },
        },
      },
    },
  },
  apis: [],
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/openapi.json', (req, res) => res.json(swaggerSpec))

app.get('/', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authRoutes)
app.use('/admin', requireAuth(), requireRole('admin'), adminRoutes)
app.use('/teacher', requireAuth(), requireRole('teacher', 'admin'), teacherRoutes)
app.use('/results', requireAuth(), resultsRoutes)

const port = Number(process.env.PORT || 3001)
app.listen(port, () => {
  console.log(`Node API running on http://127.0.0.1:${port}`)
})
