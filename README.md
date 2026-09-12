# ⚡ Idea to SaaS — Autonomous Product Prototyping & GTM Engine

<div align="center">

[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Groq Fast Inference](https://img.shields.io/badge/LLM-Groq_Llama_3.3_70B-F54E00?style=for-the-badge&logoColor=white)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<h1>🚀 Idea to SaaS</h1>
<h3>From raw concept to interactive React prototype, technical PRD, and viral GTM blueprint in under 60 seconds.</h3>

<p><em>Not just an idea generator. Not a toy mockup tool. A full-pipeline autonomous SaaS factory running in your browser.</em></p>

</div>

---

> **Stop brainstorming. Start shipping.**  
> Every founder has ideas, but 99% die in the napkin phase because turning an idea into a testable, interactive product requires hours of spec writing, UI scaffolding, component wiring, and go-to-market planning.  
> **Idea to SaaS bridges this gap completely.** Give it a raw product thought, and it engineers a validated specification, renders a live, executable React 18 application in an isolated sandbox, and prepares an actionable launch strategy.

---

## 🎯 What Problem Does This Solve?

The journey from **"I have an idea"** to **"Here is a working prototype users can click"** is fragmented, slow, and full of friction:

1. **The Blank Canvas Paradox:** Writing a PRD, identifying target customer personas (ICP), scoping out v1 vs out-of-scope features, and defining monetization takes days before writing a single line of code.
2. **Fragile AI Code Generation:** Most AI code generators output disconnected snippets, require complex local bundlers, or crash silently due to missing CDN libraries or broken imports.
3. **Iterative Refinement Bottleneck:** Once code is generated, iterating on it with an AI usually causes regressions or requires manual copy-pasting back and forth.
4. **The Distribution Void:** Building a product without an immediate launch strategy and viral distribution hooks leads to ghost towns.

**Idea to SaaS solves all four stages in a continuous, automated 4-step pipeline.**

---

## 👥 Who This Is For

| Audience | Why Idea to SaaS Matters |
|---|---|
| **Indie Hackers & Solo Founders** | Validate market demand, generate full PRDs, and test working interactive prototypes in minutes rather than weeks. |
| **Product Managers (PMs)** | Turn stakeholder briefs into detailed specifications with explicit v1 scope boundaries and clickable interactive UI flows. |
| **Frontend Engineers** | Rapidly scaffold modern React 18 + Tailwind CSS web apps and export clean, production-ready code with zero lock-in. |
| **Startup Accelerators & Hackathons** | Ideate, prototype, refine via live AI copilot, and pitch with fully functioning browser demonstrations on the fly. |

---

## 🔥 The Hook: What Makes Idea to SaaS Different

| Feature | Generic Chatbots (ChatGPT / Claude) | Traditional No-Code Tools | ⚡ Idea to SaaS |
|---|---|---|---|
| **Execution Environment** | Static text / Markdown blocks | Heavy proprietary visual builders | **Live, isolated React 18 sandbox (`srcdoc` iframe)** |
| **Resilience & Offline Vendor** | None (user manually sets up bundler) | Vendor lock-in | **Zero-CDN single point of failure (bundled local fallbacks)** |
| **Scope Engineering** | Generic suggestions | None | **Structured PRD with In-Scope vs. Out-of-Scope boundaries** |
| **Iterative AI Refactoring** | Requires re-prompting from scratch | Slow drag-and-drop | **Context-aware AI Copilot with dynamic v1 roadmap chips** |
| **Launch Strategy Engine** | Generic marketing advice | None | **Viral distribution hooks, ICP analysis, and GTM playbooks** |
| **Exportability** | Copy-paste code fragments | Paid export or lock-in | **Instant ZIP download with full React project structure** |

---

## ⚡ The 4-Stage Autonomous Pipeline

```
  💡 Raw Concept
        │
        ▼
 ┌─────────────────────────────────────────┐
 │ Stage 1: Market Intelligence & PRD Spec │  ---> Reddit signals, ICP, Moat & Scope
 └─────────────────────────────────────────┘
        │
        ▼
 ┌─────────────────────────────────────────┐
 │ Stage 2: Sandboxed Interactive Engine   │  ---> Babel + React 18 live compiler
 └─────────────────────────────────────────┘
        │
        ▼
 ┌─────────────────────────────────────────┐
 │ Stage 3: AI Refactor & Evolution Copilot│  ---> Dynamic v1 expansion & live hot-reload
 └─────────────────────────────────────────┘
        │
        ▼
 ┌─────────────────────────────────────────┐
 │ Stage 4: Go-to-Market & ZIP Production  │  ---> Viral hooks, launch plan & code export
 └─────────────────────────────────────────┘
```

### 1. Market Intelligence & Architectural PRD
- Analyzes simulated market signals (Reddit communities, search trends, audience pain points).
- Generates a full product specification: Value Proposition, Target Audience (ICP), Core Features, Technical Architecture, and explicit **v1 Boundaries** (what's built now vs. what's out of scope).

### 2. Sandboxed Live Execution Engine
- Automatically writes a single-file, highly modular React 18 component styled with modern Tailwind CSS.
- Executes immediately inside an isolated browser iframe using in-browser Babel compilation.
- **Zero CDN Failure Guarantee:** Features local bundled script fallbacks for React, ReactDOM, Babel standalone, and Lucide Icons so the sandbox renders flawlessly regardless of network restrictions.
- Responsive preview toggles (Desktop, Tablet, Mobile) with real-time error boundary protection.

### 3. Context-Aware AI Refactor Copilot
- An integrated chat assistant that understands the current application code and the original PRD spec.
- Automatically parses the **v1 Out-of-Scope** roadmap and suggests instant, one-click upgrade chips to evolve the prototype.
- Real-time code patching with visual indicators and persistent conversation history.

### 4. Viral Go-to-Market (GTM) & Clean Export
- Formulates launch channels (Product Hunt, Hacker News, Reddit, Twitter/X, TikTok).
- Generates high-converting marketing copy, viral hook angles, and pricing models.
- One-click **ZIP Export** providing an organized React project (`package.json`, Vite configuration, and production component code) ready to deploy to Vercel or Netlify.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core:** React 18, Vite 5, Tailwind CSS, Lucide React Icons
- **AI Inference Engine:**
  - **Google Gemini 2.5 Flash / Pro** (native high-speed multi-stage reasoning)
  - **Groq SDK (LLaMA 3.3 70B Versatile)** (ultra-low latency fallback and BYOK support)
- **Compilation & Execution:** In-browser standalone Babel runtime (`@babel/standalone`), safe `srcdoc` iframe isolation, defensive DOM script escaping.
- **Persistence & Export:** `localStorage` state persistence for cross-session project management, `JSZip` client-side archive generator.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
- A [Google Gemini API Key](https://aistudio.google.com/) or a [Groq API Key](https://console.groq.com/)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/oguzemirtopuz/ideatosaas.git
   cd ideatosaas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env.local` file in the root directory (or use the built-in UI Settings modal):
   ```env
   VITE_GEMINI_API_KEY="your_gemini_api_key_here"
   # Optional: For Groq LLaMA 3.3 70B inference
   VITE_GROQ_API_KEY="your_groq_api_key_here"
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🛡️ Reliability & Fault Tolerance

- **Smart API Quota Management:** Seamless detection of rate limits (`429 Quota Exceeded`), guiding users to switch to custom Groq / Gemini keys without data loss.
- **Local Fallback Assets:** Embedded vendor backups for React and Lucide icons ensure zero blank screens caused by external CDN outages.
- **Dual-Layer Key Persistence:** User-provided API keys are encrypted in local storage and communicated securely across all AI generation pipelines.

---

## 👤 Author

**Oğuz Emir Topuz**  
*Autonomous AI Systems · Deployed SaaS · Developer Tools*  
- 🐙 GitHub: [@oguzemirtopuz](https://github.com/oguzemirtopuz)  
- 🌐 Portfolio: [oguzemirtopuz.github.io](https://oguzemirtopuz.github.io/)  
- 🎮 Steam: [Cropocalypse](https://store.steampowered.com/app/4259600/Cropocalypse/)  

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
