import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import pdfParse from 'pdf-parse'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx >= 0 ? args[idx + 1] : null
}

const inputPath = getArg('--input')
const notesPath = getArg('--notes')

if (!inputPath) {
  console.error('Usage: node scripts/test-ai.js --input "scripts/sample-grade.json" [--notes "path/to/notes.pdf"]')
  process.exit(1)
}

const resolvedInput = path.resolve(process.cwd(), inputPath)
const payload = JSON.parse(fs.readFileSync(resolvedInput, 'utf-8'))

if (notesPath) {
  const resolvedNotes = path.resolve(process.cwd(), notesPath)
  const buffer = fs.readFileSync(resolvedNotes)
  const parsed = await pdfParse(buffer)
  payload.study_notes = parsed.text || ''
}

const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001'

const response = await fetch(`${aiServiceUrl}/grade`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const contentType = response.headers.get('content-type') || ''
const data = contentType.includes('application/json') ? await response.json() : await response.text()

if (!response.ok) {
  console.error('AI service error:', data)
  process.exit(1)
}

console.log('AI grade result:')
console.log(JSON.stringify(data, null, 2))
