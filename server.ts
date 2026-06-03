import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

interface DeltaEvent {
  type: string;
  message?: string;
  [key: string]: unknown;
}

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DELTA_TIMEOUT_MS = Number(process.env.DELTA_TIMEOUT_MS || 120000);
const HEARTBEAT_INTERVAL_MS = 15000;

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

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

function writeSse(res: Response, event: DeltaEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function safeKill(processRef: ChildProcessWithoutNullStreams): void {
  if (!processRef.killed) {
    processRef.kill("SIGTERM");
    setTimeout(() => {
      if (!processRef.killed) processRef.kill("SIGKILL");
    }, 3000).unref();
  }
}

// SSE Endpoint for Delta Agent
app.get("/api/run-delta", (req: Request, res: Response) => {
  const topic = String(req.query.topic || "AI Agents").slice(0, 200);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const pythonProcess = spawn("python3", ["backend_delta_agent.py", topic], {
    cwd: process.cwd(),
    env: process.env,
  });

  let buffer = "";
  let completed = false;

  const heartbeat = setInterval(() => {
    writeSse(res, { type: "heartbeat", message: "running", timestamp: new Date().toISOString() });
  }, HEARTBEAT_INTERVAL_MS);

  const timeout = setTimeout(() => {
    writeSse(res, { type: "error", message: "Delta process timed out" });
    safeKill(pythonProcess);
  }, DELTA_TIMEOUT_MS);

  function cleanup(): void {
    clearInterval(heartbeat);
    clearTimeout(timeout);
  }

  function handleLine(rawLine: string): void {
    const line = rawLine.trim();
    if (!line) return;
    try {
      const parsed = JSON.parse(line) as DeltaEvent;
      writeSse(res, parsed);
    } catch {
      writeSse(res, { type: "log", message: line });
    }
  }

  pythonProcess.stdout.on("data", (data: Buffer) => {
    buffer += data.toString("utf8");
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) handleLine(line);
  });

  pythonProcess.stderr.on("data", (data: Buffer) => {
    const errorMsg = data.toString("utf8").trim();
    if (errorMsg) writeSse(res, { type: "error", message: errorMsg });
  });

  pythonProcess.on("error", (error: Error) => {
    writeSse(res, { type: "error", message: error.message });
  });

  pythonProcess.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
    if (completed) return;
    completed = true;
    cleanup();

    if (buffer.trim()) handleLine(buffer);
    if (code && code !== 0) {
      writeSse(res, { type: "error", message: `Python process exited with code ${code}` });
    }
    if (signal) {
      writeSse(res, { type: "error", message: `Python process terminated by signal ${signal}` });
    }
    writeSse(res, { type: "done", message: "Process completed" });
    res.end();
  });

  req.on("close", () => {
    cleanup();
    safeKill(pythonProcess);
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "social-api-hub" });
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
  const { isSystemExplanation, message } = req.body;
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
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Social Hub Server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal Server Startup Error:", err);
  process.exitCode = 1;
});
