# UpLift

**Your smart LeetCode sidekick, living right inside Chrome.**

UpLift is a clean, AI powered Chrome extension that reads the problem you are solving on LeetCode and helps you think better, not just code faster. It opens as a smooth sidebar, gives context-aware guidance, and keeps your API keys safely on a secure backend.

 **Why it feels good to use**
- Understands the current LeetCode problem context
- Keeps keys in the backend (not exposed in frontend code)
- Works with OpenAI, Gemini, Grok, DeepSeek, and OpenRouter
- Lightweight setup with a fast Node.js + Express backend

## Quick setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this project folder.

☁️ Want it online? Deploy `backend/`, set env variables, and point the extension to your HTTPS backend URL.

---
Made with ❤️ for leetcoders.
