import type { FoodItem } from "../types";
import { round } from "./format";

/**
 * Product lookups for scanned EAN/UPC codes come from Open Food Facts — a free,
 * open, crowd-sourced food database (ODbL licence). No API key, CORS enabled.
 * Values in the API are already normalised "per 100 g", which is exactly how
 * NutriScan stores foods.
 */
const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";

const OFF_FIELDS = [
  "code",
  "product_name",
  "generic_name",
  "brands",
  "quantity",
  "serving_size",
  "serving_quantity",
  "nutriments",
  "image_front_small_url",
  "nutriscore_grade",
  "categories",
].join(",");

export class BarcodeLookupError extends Error {
  code: "invalid" | "not-found" | "no-nutrition" | "network" | "rate-limit" | "server";
  constructor(message: string, code: BarcodeLookupError["code"]) {
    super(message);
    this.name = "BarcodeLookupError";
    this.code = code;
  }
}

export interface BarcodeProduct {
  barcode: string;
  food: FoodItem;
  imageUrl?: string;
  quantity?: string;
  nutriscore?: string;
  /** true when Open Food Facts has no complete macro data for the product. */
  partial: boolean;
}

/** EAN-8, UPC-E, UPC-A, EAN-13 and GTIN-14 all fall in this range. */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function num(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function servingGramsFrom(servingQuantity: unknown, servingSize: unknown): number | undefined {
  const direct = num(servingQuantity);
  if (direct && direct > 0) return round(direct, 1);
  if (typeof servingSize === "string") {
    const match = servingSize.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
    if (match) {
      const value = Number(match[1].replace(",", "."));
      if (Number.isFinite(value) && value > 0) return round(value, 1);
    }
  }
  return undefined;
}

export async function lookupBarcode(raw: string, signal?: AbortSignal): Promise<BarcodeProduct> {
  const barcode = normalizeBarcode(raw);
  if (!barcode) {
    throw new BarcodeLookupError(
      "That doesn't look like a product barcode — it needs 8 to 14 digits.",
      "invalid",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${OFF_BASE}/${barcode}.json?fields=${OFF_FIELDS}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new BarcodeLookupError(
      "Couldn't reach Open Food Facts. Check your connection and try again.",
      "network",
    );
  }

  if (res.status === 404) {
    throw new BarcodeLookupError(`Barcode ${barcode} isn't in Open Food Facts yet.`, "not-found");
  }
  if (res.status === 429) {
    throw new BarcodeLookupError(
      "Open Food Facts is rate-limiting lookups right now. Try again in a minute.",
      "rate-limit",
    );
  }
  if (!res.ok) {
    throw new BarcodeLookupError(`Open Food Facts returned an error (${res.status}).`, "server");
  }

  const data = (await res.json()) as {
    status?: number | string;
    product?: Record<string, unknown>;
  };
  const product = data.product;
  const found = data.status === 1 || data.status === "success" || (data.status === undefined && !!product);
  if (!found || !product) {
    throw new BarcodeLookupError(`Barcode ${barcode} isn't in Open Food Facts yet.`, "not-found");
  }

  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const servingGrams = servingGramsFrom(product.serving_quantity, product.serving_size);

  // Prefer per-100 g values; fall back to per-serving values scaled up.
  const per100 = (key: string): number | undefined => {
    const direct = num(nutriments[`${key}_100g`]);
    if (direct !== undefined) return direct;
    const perServing = num(nutriments[`${key}_serving`]);
    if (perServing !== undefined && servingGrams) return (perServing * 100) / servingGrams;
    return undefined;
  };

  const rawBrand = typeof product.brands === "string" ? product.brands.split(",")[0].trim() : "";
  const productName = typeof product.product_name === "string" ? product.product_name.trim() : "";
  const genericName = typeof product.generic_name === "string" ? product.generic_name.trim() : "";
  const name = productName || genericName || (rawBrand ? `${rawBrand} product` : `Product ${barcode}`);
  // Avoid rendering the same word twice (e.g. brand "Nutella", name "Nutella").
  const brand = rawBrand && rawBrand.toLowerCase() !== name.toLowerCase() ? rawBrand : undefined;

  let calories = per100("energy-kcal");
  if (calories === undefined) {
    const kj = per100("energy");
    if (kj !== undefined) calories = kj / 4.184;
  }
  const protein = per100("proteins");
  const carbs = per100("carbohydrates");
  const fat = per100("fat");
  const fiber = per100("fiber");

  if (calories === undefined && protein === undefined && carbs === undefined && fat === undefined) {
    throw new BarcodeLookupError(
      `${name} is in Open Food Facts but has no nutrition data yet. Add it as a custom food, or ask Gemini to estimate it.`,
      "no-nutrition",
    );
  }

  const partial = protein === undefined || carbs === undefined || fat === undefined;
  const derivedCalories =
    calories ??
    (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9;

  const servingLabel =
    (typeof product.serving_size === "string" && product.serving_size.trim()) ||
    (servingGrams ? `${servingGrams} g` : undefined);

  const food: FoodItem = {
    id: `off-${barcode}`,
    name: name.slice(0, 70),
    brand,
    per100: true,
    calories: round(derivedCalories),
    protein: round(protein ?? 0, 1),
    carbs: round(carbs ?? 0, 1),
    fat: round(fat ?? 0, 1),
    fiber: round(fiber ?? 0, 1),
    servingLabel,
    servingGrams,
    source: "off",
    barcode,
  };

  return {
    barcode,
    food,
    imageUrl:
      typeof product.image_front_small_url === "string" ? product.image_front_small_url : undefined,
    quantity: typeof product.quantity === "string" ? product.quantity : undefined,
    nutriscore:
      typeof product.nutriscore_grade === "string" ? product.nutriscore_grade.toLowerCase() : undefined,
    partial,
  };
}
