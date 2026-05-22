import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Warning: GEMINI_API_KEY is not defined in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// API 1: Grounded Smart Social Scraper / Harvester
// Uses Google Search grounding to fetch real-world discussions and posts!
// ----------------------------------------------------
app.post("/api/simulate-scrape", async (req, res) => {
  const { keyword, platforms } = req.body;
  
  if (!keyword) {
    return res.status(400).json({ error: "Keyword parameter is required." });
  }

  try {
    const ai = getGeminiClient();
    const platformList = platforms && platforms.length > 0 ? platforms : ["Twitter", "LinkedIn", "Reddit", "GitHub"];
    
    const prompt = `Search for recent hot discussions, news, developments, or social media posts regarding "${keyword}" on these platforms: ${platformList.join(", ")}.
Using Google Search facts and grounding information, formulate a list of 5 simulated or actual social media posts that represent current discussions.
For each post, provide:
1. "platform": One of either "X/Twitter", "LinkedIn", "Reddit", or "GitHub"
2. "author": A realistic username or display name (e.g., @dev_pioneer or "TechInsights")
3. "content": The body of the post or discussion snippet (under 280 chars)
4. "likes": A realistic number of reactions/likes (integer between 5 and 5000)
5. "shares": A realistic number of retweets/shares (integer between 0 and 1200)
6. "timestamp": A realistic relative time or timestamp (e.g., "2 hours ago" or "Yesterday")
7. "link": A relevant source grounding web link (from search results) or a placeholder link.

Be accurate and use real developments where possible!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platform: { type: Type.STRING },
              author: { type: Type.STRING },
              content: { type: Type.STRING },
              likes: { type: Type.INTEGER },
              shares: { type: Type.INTEGER },
              timestamp: { type: Type.STRING },
              link: { type: Type.STRING }
            },
            required: ["platform", "author", "content", "likes", "shares", "timestamp"]
          }
        }
      }
    });

    const bodyText = response.text || "[]";
    const posts = JSON.parse(bodyText.trim());
    
    // Extract grounding chunks for citations in the UI
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const citations = groundingChunks.map((chunk: any) => ({
      title: chunk.web?.title || "Search Reference",
      url: chunk.web?.uri || ""
    })).filter((c: any) => c.url);

    res.json({ posts, citations });
  } catch (error: any) {
    console.error("Scraper API Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred." });
  }
});

// ----------------------------------------------------
// API 2: Social Omnipost Content Generator & Formatter
// Adapts seed text to specified social media guidelines
// ----------------------------------------------------
app.post("/api/generate-posts", async (req, res) => {
  const { seedText, tone } = req.body;

  if (!seedText) {
    return res.status(400).json({ error: "Seed text parameter is required." });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `Based on this draft seed announcement: "${seedText}", target a "${tone || "innovative"}" tone.
Generate custom, highly tailored API request body definitions and finalized formats for writing to multiple social network publishing APIs:
1. X/Twitter API format (strictly under 280 characters, punchy, handles hashtags, short-links)
2. LinkedIn Page Share API format (professional, starts with standard Hook, lists key bullet points, contains professional hashtags, call-to-action link placeholder)
3. Reddit Subreddit Post API format (requires Markdown formatted body, descriptive title, formatted links and bullets)
4. GitHub Release/Gist API format (highly technical, markdown codeblock placeholders, technical logs representation)

Provide the output as a clean JSON structure containing objects for each platform. Define both the final human-readable "message" and the parsed simulated "apiPayload" representing what the JSON payload sent to their REST API looks like.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            twitter: {
              type: Type.OBJECT,
              properties: {
                message: { type: Type.STRING },
                apiPayload: { type: Type.STRING }
              },
              required: ["message", "apiPayload"]
            },
            linkedin: {
              type: Type.OBJECT,
              properties: {
                message: { type: Type.STRING },
                apiPayload: { type: Type.STRING }
              },
              required: ["message", "apiPayload"]
            },
            reddit: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                message: { type: Type.STRING },
                apiPayload: { type: Type.STRING }
              },
              required: ["title", "message", "apiPayload"]
            },
            github: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                message: { type: Type.STRING },
                apiPayload: { type: Type.STRING }
              },
              required: ["title", "message", "apiPayload"]
            }
          },
          required: ["twitter", "linkedin", "reddit", "github"]
        }
      }
    });

    const bodyText = response.text || "{}";
    const formats = JSON.parse(bodyText.trim());
    res.json(formats);
  } catch (error: any) {
    console.error("Omnipost Generator API Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred." });
  }
});

// ----------------------------------------------------
// API 3: Smart Social API Automator Support / Copilot
// Explains rules/limitations & builds custom automation scrapers on demand
// ----------------------------------------------------
app.post("/api/ai-copilot", async (req, res) => {
  const { isSystemExplanation, message, queryType } = req.body;

  try {
    const ai = getGeminiClient();
    
    let prompt = "";
    if (isSystemExplanation) {
      prompt = `Provide a professional, clear, and comprehensive explanation (in both English and Hebrew!) answering:
"How can someone legally and technically connect or subscribe to social media network APIs autonomously?
Is there a legal/technical blocker to fully-automated zero-click registration, and how do setups like OAuth, API key stores, or server-side headless scrapers (e.g., Puppeteer, Playwright) bypass developer registration manually?"
Outline how our Social API Dashboard bridges this gap through automated search grounding and local API key storage.
Format your answer with elegant Markdown markdown lists and structured blocks.`;
    } else {
      prompt = `The user is asking: "${message}".
This query is of type: "${queryType || "general_automation"}".
If the user is asking to build an automated node.js script, server, or custom bot to auto-register or post to their social accounts, write a fully functional, complete, production-ready TypeScript/Node.js script demonstrating exactly how to utilize standard SDKs (like @octokit/rest for GitHub, and simple REST calls or common SDK wrappers for Twitter/X / LinkedIn) with OAuth or environment API keys.
If they are asking about bypassing restrictions or automatic credentials gathering, explain modern developer token configuration step-by-step.
Keep your response professional, helpful, and highly detailed. Use elegant Markdown.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        // Fallback or custom configuration
      }
    });

    res.json({ answer: response.text || "" });
  } catch (error: any) {
    console.error("AI Copilot API Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred." });
  }
});

// ----------------------------------------------------
// Serve static client assets and configure Vite middleware
// ----------------------------------------------------
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Social Hub Server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal Server Startup Error:", err);
});
