from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

OUT = 'output/pdf/creativityai_app_summary.pdf'

c = canvas.Canvas(OUT, pagesize=letter)
width, height = letter

left = 0.7 * inch
right = width - 0.7 * inch
text_w = right - left

y = height - 0.7 * inch

c.setFillColor(colors.HexColor('#0f172a'))
c.setFont('Helvetica-Bold', 17)
c.drawString(left, y, 'CreativityAI - App Summary (Repo Evidence)')
y -= 0.23 * inch

c.setFont('Helvetica', 9)
c.setFillColor(colors.HexColor('#475569'))
c.drawString(left, y, 'Evidence sources: src/App.jsx, src/lib/openai.js, server.js, package.json, vite.config.js, README.md')
y -= 0.30 * inch


def section(title, lines, bullet=False):
    global y
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont('Helvetica-Bold', 11)
    c.drawString(left, y, title)
    y -= 0.16 * inch

    c.setFillColor(colors.HexColor('#1f2937'))
    c.setFont('Helvetica', 9.6)

    for line in lines:
        if bullet:
            indent = left + 0.14 * inch
            c.circle(left + 0.05 * inch, y + 2, 1.4, fill=1)
            c.drawString(indent, y, line)
        else:
            c.drawString(left, y, line)
        y -= 0.16 * inch
    y -= 0.07 * inch

section('What it is', [
    'A React + Vite web app (named CreFlux in UI) that generates and ranks creative ideas using LLM APIs.',
    'It lets users configure provider/model/API key, generate 100 ideas, and view the top 10 with scores.',
])

section("Who it's for", [
    'Primary persona inferred from UI/workflow: creators, startup builders, or marketers exploring many idea options fast.',
    'Official target user statement: Not found in repo.',
])

section('What it does', [
    'Supports multiple AI providers: OpenAI, Gemini, Grok, OpenRouter, and custom endpoint.',
    'Enhances a user prompt, generates 100 short ideas, then evaluates/expands top 10 ideas.',
    'Shows per-idea metrics: syntax, feasibility, relevance, novelty, plus short reasoning text.',
    'Offers randomness controls: hallucination slider and random prompt generator.',
    'Provides copy features with editable templates, presets, preview, and clipboard copy.',
    'Translates idea title/content to Korean via /api/translate backend endpoint.',
    'Includes generation progress states and completion sound with persisted volume setting.',
], bullet=True)

section('How it works (compact architecture)', [
    'Frontend: React app in src/App.jsx rendered by src/main.jsx; styling via Stitches config.',
    'LLM client flow: src/lib/openai.js uses OpenAI SDK in browser mode and Gemini native REST.',
    'Pipeline: user prompt -> enhancePrompt() -> generateIdeas() -> evaluateIdeasBatch() -> UI cards.',
    'Parsing layer normalizes JSON/plain text model outputs and applies fallback scoring when needed.',
    'Backend: Express server.js serves dist and exposes POST /api/translate with DDG attempt + Google fallback.',
    'Data storage: browser localStorage for copy format and sound volume; no database found.',
], bullet=True)

section('How to run (minimal)', [
    '1. Install deps: npm install',
    '2. Build frontend: npm run build',
    '3. Start server: npm start (serves dist + /api/translate on PORT or 3000)',
    '4. Open http://localhost:3000 and enter an API key in the configuration panel.',
    'Dev proxy setup for Vite to backend: Not found in repo.',
])

c.setStrokeColor(colors.HexColor('#cbd5e1'))
c.setLineWidth(0.6)
c.line(left, 0.62 * inch, right, 0.62 * inch)
c.setFont('Helvetica', 8.5)
c.setFillColor(colors.HexColor('#64748b'))
c.drawString(left, 0.45 * inch, 'Generated from repository evidence only.')

c.showPage()
c.save()
print(OUT)
