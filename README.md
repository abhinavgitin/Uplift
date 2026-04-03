---

## 📌 Overview
AlgoLens is a Manifest V3 Chrome extension that sits beside LeetCode problems to guide your thinking without ever handing over solutions. It reads the live problem statement and your current editor content, then uses Google Gemini to surface hints, constraint insights, and lightweight code feedback. Built for learners who want structured guidance while keeping full ownership of their solution.

---

## ✨ Features
- ✅ Context-aware sidebar injected on LeetCode problem pages with toggleable sections.
- ✅ Guided hints, constraint analysis, and expected complexity powered by Gemini prompts.
- ✅ Code snapshots, compare view, and lightweight pattern scanning to reflect on your own changes.
- ✅ Local-first storage for API keys, snapshots, and revealed hints—no external backend.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Language | JavaScript (ESNext), HTML, CSS |
| Framework | None (Chrome Extensions MV3, vanilla DOM) |
| Tools | Chrome Storage API, Google Gemini API, MutationObserver, web-accessible iframe UI |

---

## ⚙️ Getting Started

### Prerequisites
- Google Chrome (or Chromium-based) with Extension Developer Mode enabled.
- Google Gemini API key (obtainable from https://aistudio.google.com/apikey).
- Node.js 18+ only if you want to regenerate the SVG icons before converting to PNG.

### Installation
```bash
# Clone the repository
git clone https://github.com/abhinavgitin/Uplift.git
cd Uplift

# (Optional) Regenerate SVG icons
node generate-icons.js

# Convert icons to PNGs for Chrome (use ImageMagick or any SVG→PNG tool)
magick convert icons/icon16.svg icons/icon16.png
magick convert icons/icon48.svg icons/icon48.png
magick convert icons/icon128.svg icons/icon128.png
```

### Run
```bash
# Load the extension
chrome://extensions
# Enable Developer mode, click "Load unpacked", and select the Uplift folder

# Use it
1) Open any https://leetcode.com/problems/... page
2) Open the sidebar settings (gear icon) and paste your Gemini API key
3) Ask for hints, constraint analysis, or code feedback as you iterate
```

---

## 📸 Screenshots / Demo
> _(Add screenshots here if available)_

---

## 🧠 How It Works
`content.js` detects LeetCode problem pages, extracts the problem statement and live editor code, and injects the sidebar iframe. The sidebar UI (`sidebar.html/js/css`) handles user interactions, hint requests, code snapshots, and comparison. All AI requests flow through the background service worker (`background.js`), which crafts Gemini prompts and returns responses; helpers in `utils/` parse constraints and scan code patterns. API keys and snapshots stay in Chrome storage—no external servers involved.

---

## 🤝 Contributing
Contributions are welcome!  
Fork → Branch → Commit → Pull Request

---

## 📄 License
This project is licensed under the MIT License.

---

## 👤 Author

**abhinavgitin**  
<a href="https://twitter.com/abhinavgitin">@abhinavgitin</a> • <a href="https://github.com/abhinavgitin">GitHub</a>

---
