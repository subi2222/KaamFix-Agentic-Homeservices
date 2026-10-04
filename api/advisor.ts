import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
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

// Fallback rule-based analyzer in case Gemini API returns 429, 400, or is unconfigured
function generateFallbackAdvice(problem: string) {
  const p = problem.toLowerCase();
  let recommendedService = "General Technician";
  let urgencyLevel = "Medium";
  let possibleCause = "Issue requires on-site trade diagnostic and assessment.";
  let estimatedCost = "Rs. 1,000 - 2,500";
  let safetyAdvice = "Keep area clear and isolate power/water supplies if needed.";

  if (p.includes("electric") || p.includes("wire") || p.includes("spark") || p.includes("short") || p.includes("breaker") || p.includes("power") || p.includes("light") || p.includes("socket")) {
    recommendedService = "Electrician";
    urgencyLevel = p.includes("spark") || p.includes("fire") || p.includes("smoke") ? "High" : "Medium";
    possibleCause = "Faulty wiring, overloaded circuit breaker, or loose contact terminal.";
    estimatedCost = "Rs. 1,200 - 3,500";
    safetyAdvice = "Turn off main DB circuit breaker immediately before touching switches or wires.";
  } else if (p.includes("water") || p.includes("pipe") || p.includes("leak") || p.includes("drain") || p.includes("tap") || p.includes("tank") || p.includes("plumb")) {
    recommendedService = "Plumber";
    urgencyLevel = p.includes("burst") || p.includes("flood") || p.includes("heavy leak") ? "High" : "Low";
    possibleCause = "Damaged pipe seal, rusted fitting, high pressure joint rupture, or clog.";
    estimatedCost = "Rs. 1,000 - 3,000";
    safetyAdvice = "Close the main water inlet control valve to prevent water damage.";
  } else if (p.includes("ac") || p.includes("cool") || p.includes("compressor") || p.includes("air condition") || p.includes("gas") || p.includes("filter")) {
    recommendedService = "AC Technician";
    urgencyLevel = "Medium";
    possibleCause = "Low refrigerant gas level, dirty indoor filters, or capacitor/PCB fault.";
    estimatedCost = "Rs. 1,500 - 4,500";
    safetyAdvice = "Turn off the AC unit to protect the compressor from burnout.";
  } else if (p.includes("door") || p.includes("wood") || p.includes("lock") || p.includes("cabinet") || p.includes("furniture") || p.includes("table") || p.includes("chair")) {
    recommendedService = "Carpenter";
    urgencyLevel = "Low";
    possibleCause = "Wood expansion due to humidity, worn hinges, or misaligned latch.";
    estimatedCost = "Rs. 1,000 - 2,500";
    safetyAdvice = "Do not force jammed doors or drawers to prevent splitting wood.";
  } else if (p.includes("paint") || p.includes("wall") || p.includes("damp") || p.includes("color") || p.includes("seep")) {
    recommendedService = "Painter";
    urgencyLevel = "Low";
    possibleCause = "Moisture seepage behind plaster or aged paint coat layer decay.";
    estimatedCost = "Rs. 2,000 - 6,000";
    safetyAdvice = "Ensure adequate room ventilation during surface scraping and painting.";
  } else if (p.includes("fridge") || p.includes("washing") || p.includes("oven") || p.includes("microwave") || p.includes("appliance")) {
    recommendedService = "Appliance Repair";
    urgencyLevel = "Medium";
    possibleCause = "Defective motor coil, thermostat failure, or blown internal fuse.";
    estimatedCost = "Rs. 1,200 - 3,800";
    safetyAdvice = "Unplug appliance from power socket before attempting inspection.";
  }

  return {
    recommendedService,
    urgencyLevel,
    possibleCause,
    estimatedCost,
    safetyAdvice,
    confidenceScore: "88%"
  };
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { problem } = body;

  if (!problem || typeof problem !== "string") {
    return res.status(400).json({ error: "Problem description is required." });
  }

  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are KaamFix AI Service Advisor.
Analyze home maintenance and local service problems in Pakistan.
Return a valid JSON object matching the requested schema. Use realistic Pakistani pricing in PKR.`;

    let text = "";
    // Try primary model gemini-2.0-flash first, then fallback to gemini-1.5-flash
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: `Problem description: ${problem}`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendedService: { type: Type.STRING },
                urgencyLevel: { type: Type.STRING },
                possibleCause: { type: Type.STRING },
                estimatedCost: { type: Type.STRING },
                safetyAdvice: { type: Type.STRING },
                confidenceScore: { type: Type.STRING }
              },
              required: ["recommendedService", "urgencyLevel", "possibleCause", "estimatedCost", "safetyAdvice", "confidenceScore"]
            }
          }
        });
        text = result.text || "";
        if (text) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Advisor Serverless] Model ${modelName} failed:`, err?.message || err);
      }
    }

    if (text) {
      const parsed = JSON.parse(text.trim());
      return res.status(200).json(parsed);
    } else {
      throw lastError || new Error("No response generated from Gemini API");
    }
  } catch (err: any) {
    console.error("[Advisor Serverless Error]:", err?.message || err);
    // Graceful fallback response so customer UI never breaks or returns HTTP 500
    const fallbackAdvice = generateFallbackAdvice(problem);
    return res.status(200).json(fallbackAdvice);
  }
}

