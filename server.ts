import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Warning: GEMINI_API_KEY is not defined in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

// SSE Endpoint for Delta Agent
app.get("/api/run-delta", (req: Request, res: Response) => {
  const topic = (req.query.topic as string) || "AI Agents";
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const pythonProcess = spawn("python3", ["backend_delta_agent.py", topic]);

  let buffer = "";

  pythonProcess.stdout.on("data", (data: Buffer) => {
    buffer += data.toString();
    let lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          // Verify it's valid JSON before sending
          JSON.parse(line);
          res.write(`data: ${line}\n\n`);
        } catch (e) {
          res.write(`data: {"type": "error", "message": "Failed to parse python output: ${line}"}\n\n`);
        }
      }
    }
  });

  pythonProcess.stderr.on("data", (data: Buffer) => {
    const errorMsg = data.toString().trim();
    if (errorMsg) {
      res.write(`data: {"type": "error", "message": ${JSON.stringify(errorMsg)}}\n\n`);
    }
  });

  pythonProcess.on("close", (code: number) => {
    if (buffer.trim()) {
      try {
        JSON.parse(buffer);
        res.write(`data: ${buffer}\n\n`);
      } catch (e) {
        // Ignore final buffer if not JSON
      }
    }
    if (code !== 0) {
      res.write(`data: {"type": "error", "message": "Python process exited with code ${code}"}\n\n`);
    }
    res.write(`data: {"type": "done", "message": "Process completed"}\n\n`);
    res.end();
  });
  
  req.on("close", () => {
    pythonProcess.kill();
  });
});

// Keep existing endpoints
app.post("/api/simulate-scrape", async (req: Request, res: Response): Promise<void> => {
  const { keyword, platforms } = req.body;
  if (!keyword) {
    res.status(400).json({ error: "Keyword parameter is required." });
    return;
  }
  try {
    const ai = getGeminiClient();
    const platformList = platforms && platforms.length > 0 ? platforms : ["Twitter", "LinkedIn", "Reddit", "GitHub"];
    const prompt = `Search for recent hot discussions regarding "${keyword}" on: ${platformList.join(", ")}. Return JSON array of posts.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
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
    const posts = JSON.parse(response.text || "[]");
    res.json({ posts, citations: [] });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
});

app.post("/api/generate-posts", async (req: Request, res: Response): Promise<void> => {
  const { seedText, tone } = req.body;
  if (!seedText) {
    res.status(400).json({ error: "Seed text parameter is required." });
    return;
  }
  try {
    const ai = getGeminiClient();
    const prompt = `Based on: "${seedText}", tone: "${tone}". Generate JSON for twitter, linkedin, reddit, github.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
});

app.post("/api/ai-copilot", async (req: Request, res: Response): Promise<void> => {
  const { isSystemExplanation, message, queryType } = req.body;
  try {
    const ai = getGeminiClient();
    const prompt = isSystemExplanation ? "Explain API automation." : `Answer: ${message}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    res.json({ answer: response.text || "" });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message || "An unexpected error occurred." });
  }
});

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
    app.get("*", (req: Request, res: Response) => {
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
