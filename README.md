---

## 📌 Overview
UpLift is a Manifest V3 Chrome extension for LeetCode guidance.  
It now supports a production-style architecture where AI calls are routed through a secure Node.js backend so API keys are never exposed in extension code.

---

## ✨ Features
- ✅ Context-aware LeetCode sidebar UI.
- ✅ Backend API proxy for AI inference (`POST /api/ai`).
- ✅ Multi-provider support via pluggable service layer (OpenAI, Gemini, Grok).
- ✅ Environment-variable secret management with `.env`.
- ✅ Modular backend structure for growth (routes, controllers, services, providers, middleware).

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Extension | JavaScript, HTML, CSS, Chrome Extensions MV3 |
| Backend | Node.js, Express, Zod, Helmet, CORS, dotenv |
| AI Providers | OpenAI, Google Gemini, Grok (xAI API) |

---

## 🧠 Architecture
Flow:
1. Chrome Extension sends payload to backend.
2. Backend validates input and selects provider.
3. Backend calls provider API using server-side env keys.
4. Backend returns normalized response:

```json
{
  "success": true,
  "data": "AI response..."
}
```

No API key should be stored in Chrome storage or frontend code.

---

## 📁 Backend Structure

```text
backend/
  src/
    app.js
    server.js
    config/
      env.js
    controllers/
      aiController.js
    middleware/
      errorHandler.js
      rateLimiter.js
      requestLogger.js
      validateRequest.js
    providers/
      openaiProvider.js
      geminiProvider.js
      grokProvider.js
    routes/
      aiRoutes.js
      healthRoutes.js
    services/
      aiService.js
    utils/
      appError.js
      buildSolvePrompt.js
      logger.js
  .env.example
  package.json
```

---

## ⚙️ Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Set your environment variables in `.env`:

```env
NODE_ENV=development
PORT=8080
CORS_ORIGIN=chrome-extension://<your-extension-id>
AI_PROVIDER=gemini
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
AI_REQUEST_TIMEOUT_MS=20000
AI_RETRY_ATTEMPTS=2
AI_RETRY_BASE_DELAY_MS=400

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini

GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash

GROK_API_KEY=...
GROK_MODEL=grok-beta
```

Run backend:

```bash
npm run dev
```

Health check:

```bash
GET http://localhost:8080/health
```

Solve endpoint:

```bash
POST http://localhost:8080/api/ai
Content-Type: application/json
```

Backward compatibility route also works:

```bash
POST http://localhost:8080/api/ai/solve
```

Body:

```json
{
  "problem": "Two Sum...",
  "code": "function twoSum(nums, target) {}",
  "language": "javascript"
}
```

Optional provider override:
- Header: `x-ai-provider: gemini` (or `openai`, `grok`)

---

## 🔌 Provider Switching
Two ways:
- Global default via `AI_PROVIDER` in `.env`
- Per-request override via `x-ai-provider` header

To add another provider:
1. Create `src/providers/<provider>Provider.js`
2. Export a `solveWith<Provider>(prompt)` function
3. Register it in `src/services/aiService.js`
4. Add env keys in `src/config/env.js` and `.env.example`

---

## ☁️ Moving from Local to Cloud
- Deploy `backend/` to Render or Vercel.
- Set all API keys and config in platform environment variables.
- Set `CORS_ORIGIN` to your extension origin (or controlled list).
- Update extension backend base URL to deployed HTTPS API.
- Add managed rate limiting and logging/monitoring as scale grows.

---

## 📄 License
MIT

---
