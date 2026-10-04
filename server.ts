import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization of Gemini API Client to prevent crashes on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Advisor Endpoint
  app.post("/api/advisor", async (req, res) => {
    try {
      const { problem } = req.body;
      if (!problem || typeof problem !== "string") {
        return res.status(400).json({ error: "Problem description is required." });
      }

      const ai = getGeminiClient();

      const systemPrompt = `You are KaamFix AI Service Advisor.
Analyze home maintenance and local service problems.
ALWAYS respond with a valid JSON object (no markdown, no code fences) with these exact fields:
- recommendedService (string): one of (Electrician, Plumber, Carpenter, Painter, AC Technician, Mason, Welder, Labor Worker, CCTV Installer, Solar Technician, Home Cleaning, Appliance Repair)
- urgencyLevel (string): Low, Medium, or High
- possibleCause (string): a brief single-sentence explanation of what caused the issue
- estimatedCost (string): estimated cost range in PKR, e.g. "Rs. 1,500 - 3,000". Use realistic, affordable Pakistani pricing.
- safetyAdvice (string): simple actionable safety precaution to take immediately
- confidenceScore (string): a confidence percentage like "90%" or "95%"

Example valid response:
{"recommendedService":"Plumber","urgencyLevel":"High","possibleCause":"A broken pipe joint under the sink is causing the leak.","estimatedCost":"Rs. 1,500 - 3,000","safetyAdvice":"Turn off the main water supply immediately to prevent flooding.","confidenceScore":"92%"}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Problem description: ${problem}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
        },
      });

      const rawText = result.text;
      if (!rawText) {
        throw new Error("Received empty response from Gemini API");
      }

      // Parse the JSON response — handle markdown code fences if present
      let cleaned = rawText.trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
      }

      try {
        const parsed = JSON.parse(cleaned);
        return res.json(parsed);
      } catch (parseError) {
        console.error("Failed to parse Gemini JSON output. Raw text:", rawText);
        // Fallback if parsing failed
        return res.json({
          recommendedService: "Plumber",
          urgencyLevel: "Medium",
          possibleCause: "Unable to diagnose — please describe the issue in more detail.",
          estimatedCost: "Rs. 1,000 - 2,500",
          safetyAdvice: "Turn off water/gas/electricity to the affected area and wait for a professional.",
          confidenceScore: "85%"
        });
      }
    } catch (err: any) {
      console.error("Advisor proxy error:", err);
      return res.status(500).json({ error: err.message || "Failed to analyze service issue." });
    }
  });

  // Setup Asset Routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server startup failed:", err);
});
