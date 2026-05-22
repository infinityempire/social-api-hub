# 🌐 Social Media API Automator Hub

Advanced real-time dashboard for automated social media API simulations, search-grounded public scraping, and multi-network post formulation powered by **Gemini 3.5-Flash**.

This full-stack application provides an elegant solution to social media monitoring, feed curation, and publishing automation without the immediate need for complex developer keys, using Google Search grounding to retrieve real-time discussions.

## 🚀 Key Features

*   **🔍 Live Public Scraper (Google Grounded):** Fetches real-world trending topics, public sentiment, and real posts on **X (Twitter)**, **LinkedIn**, **Reddit**, and **GitHub** directly using Google Search live metadata.
*   **✍️ Omnipost Formulator:** Adapts any input announcement to the exact REST API standards and formatting limits of multiple platforms simultaneously.
*   **💻 REST AI Payload Generator & simulated Publisher:** Explores the true underlying JSON payloads sent to standard REST endpoints.
*   **🔐 Local Credentials Vault:** Safe browser-side storage (`localStorage`) for developer keys, access tokens, and API credentials.
*   **🤖 Developer AI Copilot:** Instantly generates complete, production-ready TypeScript/Node.js scrapers and integration scripts.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React, Tailwind CSS, Motion, Lucide Icons
- **Backend:** Node.js Express Server, tsx engine, bundler esbuild
- **AI/LLM Support:** Google Gen AI SDK (`@google/genai`) with active Google Search Grounding for fresh, authentic results.

---

## 💻 How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A **Gemini API Key** (Get yours from Google AI Studio)

### Installation

1. **Clone or Download the Zip file** from AI Studio dashboard.
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (using `.env.example` as a template):
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key"
   PORT=3000
   ```
4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:3000`.

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

*This application was developed in Google AI Studio.*
