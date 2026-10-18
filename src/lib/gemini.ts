import type { FoodItem, Nutrition } from "../types";
import { round } from "./format";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export const DEFAULT_MODEL = "gemini-3.8-flash";

export const MODEL_OPTIONS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", hint: "Recommended — fast and accurate" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", hint: "Previous generation" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", hint: "Cheapest" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (preview)", hint: "Preview access" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Legacy accounts only" },
];

const FALLBACKS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-2.5-flash"];

export interface AiFoodItem {
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
}

export interface AiResult {
  items: AiFoodItem[];
  note: string;
  model: string;
}

export class GeminiError extends Error {
  code: "no-key" | "bad-key" | "quota" | "model" | "blocked" | "network" | "parse" | "unknown";
  constructor(message: string, code: GeminiError["code"]) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
  }
}

const schema = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          brand: { type: "STRING" },
          quantity: { type: "NUMBER" },
          unit: { type: "STRING" },
          grams: { type: "NUMBER" },
          calories: { type: "NUMBER" },
          protein: { type: "NUMBER" },
          carbs: { type: "NUMBER" },
          fat: { type: "NUMBER" },
          fiber: { type: "NUMBER" },
          confidence: { type: "NUMBER" },
        },
        required: ["name", "grams", "calories", "protein", "carbs", "fat"],
      },
    },
    note: { type: "STRING" },
  },
  required: ["items"],
};

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

interface CallOptions {
  apiKey: string;
  model: string;
  parts: Part[];
  temperature?: number;
  signal?: AbortSignal;
}

async function requestModel(
  { apiKey, model, parts, temperature = 0.2, signal }: CallOptions,
  withSchema = true,
) {
  return fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
        ...(withSchema ? { responseSchema: schema } : {}),
      },
    }),
    signal,
  });
}

async function generate({ apiKey, model, parts, temperature, signal }: CallOptions): Promise<{ text: string; model: string }> {
  if (!apiKey.trim()) {
    throw new GeminiError(
      "Add your Gemini API key in Settings to use AI tracking. You can create one for free in Google AI Studio.",
      "no-key",
    );
  }

  const candidates = [model, ...FALLBACKS.filter((m) => m !== model)];
  let lastError: GeminiError | null = null;

  for (const candidate of candidates) {
    let res: Response;
    try {
      res = await requestModel({ apiKey, model: candidate, parts, temperature, signal });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new GeminiError("The request timed out. Check your connection and try again.", "network");
      }
      throw new GeminiError("Couldn't reach Gemini. Check your internet connection.", "network");
    }

    // Some model versions reject the legacy responseSchema shape — retry once
    // with JSON mime type only and parse the text ourselves.
    if (res.status === 400) {
      const peek = await res.clone().text();
      if (/schema|response.?mime|json/i.test(peek)) {
        try {
          res = await requestModel(
            { apiKey, model: candidate, parts, temperature, signal },
            false,
          );
        } catch {
          throw new GeminiError("Couldn't reach Gemini. Check your internet connection.", "network");
        }
      }
    }

    if (res.ok) {
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        promptFeedback?: { blockReason?: string };
      };
      const blocked = json.promptFeedback?.blockReason;
      if (blocked) {
        throw new GeminiError(`Gemini blocked this request (${blocked.toLowerCase()}).`, "blocked");
      }
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) {
        throw new GeminiError("Gemini returned an empty answer. Try describing the food differently.", "parse");
      }
      return { text, model: candidate };
    }

    const body = await res.text();
    const detail = extractError(body);

    if (res.status === 401 || res.status === 403) {
      throw new GeminiError(
        detail || "That API key was rejected by Gemini. Check the key in Settings.",
        "bad-key",
      );
    }
    if (res.status === 429) {
      throw new GeminiError(
        detail || "Gemini rate limit reached. Wait a moment, or try a lighter model in Settings.",
        "quota",
      );
    }
    if (res.status === 404) {
      lastError = new GeminiError(
        detail || `The model ${candidate} isn't available for this key.`,
        "model",
      );
      continue;
    }
    if (res.status === 400 && /model|not found|not supported/i.test(detail) && !/schema/i.test(detail)) {
      lastError = new GeminiError(detail, "model");
      continue;
    }
    if (res.status >= 500) {
      lastError = new GeminiError("Gemini is having trouble right now. Try again shortly.", "unknown");
      continue;
    }
    throw new GeminiError(detail || `Gemini request failed (${res.status}).`, "unknown");
  }

  throw (
    lastError ??
    new GeminiError("No available Gemini model accepted the request. Pick another model in Settings.", "model")
  );
}

function extractError(body: string): string {
  try {
    const json = JSON.parse(body) as { error?: { message?: string; status?: string } };
    return json.error?.message ?? "";
  } catch {
    return body.slice(0, 200);
  }
}

function parseJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new GeminiError("Gemini's answer wasn't valid JSON. Try again.", "parse");
  }
}

function normalize(raw: unknown): AiResult["items"] {
  const obj = raw as { items?: unknown[] };
  const list = Array.isArray(obj?.items) ? obj.items : [];
  const num = (v: unknown, fallback = 0) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const items: AiFoodItem[] = [];
  for (const entry of list) {
    const item = entry as Record<string, unknown>;
    const name = String(item.name ?? "").trim();
    if (!name) continue;
    const grams = Math.max(1, Math.round(num(item.grams, 100)));
    let calories = num(item.calories);
    let protein = num(item.protein);
    let carbs = num(item.carbs);
    let fat = num(item.fat);
    if (calories === 0 && (protein || carbs || fat)) {
      calories = protein * 4 + carbs * 4 + fat * 9;
    }
    if (protein + carbs + fat === 0 && calories > 0) {
      protein = (calories * 0.2) / 4;
      carbs = (calories * 0.45) / 4;
      fat = (calories * 0.35) / 9;
    }
    items.push({
      name: name.slice(0, 70),
      brand: item.brand ? String(item.brand).slice(0, 40) : undefined,
      quantity: num(item.quantity, 1) || 1,
      unit: String(item.unit ?? "serving").slice(0, 20),
      grams,
      calories: round(calories),
      protein: round(protein, 1),
      carbs: round(carbs, 1),
      fat: round(fat, 1),
      fiber: round(num(item.fiber), 1),
      confidence: Math.min(1, Math.max(0, num(item.confidence, 0.7) || 0.7)),
    });
  }
  return items;
}

const SYSTEM_RULES = `You are NutriScan's nutrition analyst. Identify food and drink from the user's input and estimate nutrition.

Rules:
- Return one item per distinct food or drink, including sauces, oils and drinks.
- Nutrition values must be for the entire portion described or visible, NOT per 100 g.
- Estimate realistic portions in grams. Use plate, cutlery, hand and packaging cues in photos. A typical plate is 26 cm, a fork 19 cm.
- Use as-served (cooked/prepared) values. If a brand is recognisable, include it.
- If an item is ambiguous, pick the most likely interpretation — never ask questions.
- "quantity" and "unit" describe the portion in human terms (e.g. 2 slices, 1 bowl, 250 ml).
- confidence is 0-1 for your portion estimate.
- Keep names short (2-6 words), title case, without quantities.
- If nothing edible is visible, return an empty items array and explain in note.

Respond with strict JSON only, no markdown:
{"items":[{"name":"Grilled chicken breast","brand":"","quantity":1,"unit":"fillet","grams":170,"calories":281,"protein":52.7,"carbs":0,"fat":6.1,"fiber":0,"confidence":0.8}],"note":"one short sentence about assumptions"}`;

export async function analyzeMeal(opts: {
  apiKey: string;
  model: string;
  text: string;
  image?: { mimeType: string; data: string };
  meal: string;
  targets?: Nutrition;
  signal?: AbortSignal;
}): Promise<AiResult> {
  const context = opts.targets
    ? `\nContext: this is ${opts.meal}. Remaining daily budget after earlier meals: ${Math.round(opts.targets.calories)} kcal, ${Math.round(opts.targets.protein)} g protein.`
    : `\nContext: this is ${opts.meal}.`;
  const text = `${SYSTEM_RULES}${context}\n\nUser input: ${opts.text.trim() || "(photo only)"}`;
  const parts: Part[] = [{ text }];
  if (opts.image) {
    parts.push({ inline_data: { mime_type: opts.image.mimeType, data: opts.image.data } });
  }
  const { text: output, model } = await generate({
    apiKey: opts.apiKey,
    model: opts.model,
    parts,
    signal: opts.signal,
    temperature: 0.15,
  });
  const parsed = parseJson(output) as { note?: string };
  const items = normalize(parsed);
  if (items.length === 0) {
    throw new GeminiError(
      typeof parsed.note === "string" && parsed.note
        ? parsed.note
        : "I couldn't find any food in that. Try adding a short description.",
      "parse",
    );
  }
  return {
    items,
    note: typeof parsed.note === "string" ? parsed.note : "",
    model,
  };
}

export async function suggestMeal(opts: {
  apiKey: string;
  model: string;
  remaining: Nutrition;
  meal: string;
  preference?: string;
  signal?: AbortSignal;
}): Promise<AiResult> {
  const r = opts.remaining;
  const prompt = `${SYSTEM_RULES}

The user has ${Math.round(r.calories)} kcal, ${Math.round(r.protein)} g protein, ${Math.round(r.carbs)} g carbs and ${Math.round(r.fat)} g fat left today and wants ${opts.meal} ideas.${
    opts.preference ? ` Their preference: ${opts.preference}.` : ""
  }
Suggest ONE realistic, satisfying meal made of 2-5 component items that lands within those remaining numbers (aim 85-105% of calories, at least the remaining protein if possible). Use common ingredients. Nutrition values must be for the whole suggested portion.`;

  const { text, model } = await generate({
    apiKey: opts.apiKey,
    model: opts.model,
    parts: [{ text: prompt }],
    temperature: 0.7,
    signal: opts.signal,
  });
  const parsed = parseJson(text) as { note?: string };
  const items = normalize(parsed);
  if (items.length === 0) {
    throw new GeminiError("Gemini didn't return a meal. Try again.", "parse");
  }
  return { items, note: typeof parsed.note === "string" ? parsed.note : "", model };
}

/** Validate a key/model pair with a tiny request. Returns the model that answered. */
export async function testConnection(apiKey: string, model: string): Promise<string> {
  const { model: used } = await generate({
    apiKey,
    model,
    parts: [{ text: 'This is a connection test. Return JSON with an empty "items" array and note "ok".' }],
    temperature: 0,
  });
  return used;
}

/** Convert a whole-portion AI result into a per-100 g food item for the log. */
export function aiItemToFood(item: AiFoodItem): FoodItem {
  const factor = 100 / item.grams;
  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: item.name,
    brand: item.brand,
    per100: true,
    calories: round(item.calories * factor),
    protein: round(item.protein * factor, 1),
    carbs: round(item.carbs * factor, 1),
    fat: round(item.fat * factor, 1),
    fiber: round(item.fiber * factor, 1),
    servingLabel: `${item.quantity} ${item.unit}`.trim(),
    servingGrams: item.grams,
    source: "ai",
  };
}

export function aiTotals(items: AiFoodItem[]): Nutrition {
  return items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
      fiber: acc.fiber + i.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

/** Downscale a photo before upload so requests stay small and fast. */
export async function compressImage(
  file: File,
  maxDim = 1024,
  quality = 0.82,
): Promise<{ dataUrl: string; mimeType: string; data: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't decode that image."));
    image.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl, mimeType: "image/jpeg", data: dataUrl.split(",")[1] ?? "" };
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl: out, mimeType: "image/jpeg", data: out.split(",")[1] ?? "" };
}
