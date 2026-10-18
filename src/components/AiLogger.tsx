import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  KeyRound,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import type { MealType } from "../types";
import { MEALS, sumEntries, sumExerciseKcal } from "../lib/nutrition";
import {
  aiItemToFood,
  analyzeMeal,
  compressImage,
  GeminiError,
  suggestMeal,
  type AiFoodItem,
  type AiResult,
} from "../lib/gemini";
import { fmt } from "../lib/format";
import { useStore } from "../store";
import { Button, CheckPill, Segment, Sheet } from "./ui";
import { dateKey } from "../lib/date";

type Mode = "input" | "review";

interface DraftItem extends AiFoodItem {
  key: string;
  checked: boolean;
  /** Current portion, editable by the user. */
  grams: number;
  /** Portion Gemini originally estimated, used to scale macros. */
  baseGrams: number;
}

function draftNutrition(d: DraftItem) {
  const f = d.grams / Math.max(1, d.baseGrams);
  return {
    calories: d.calories * f,
    protein: d.protein * f,
    carbs: d.carbs * f,
    fat: d.fat * f,
  };
}

const HINTS = [
  "Reading your plate…",
  "Separating foods…",
  "Estimating portion sizes…",
  "Counting macros…",
  "Almost there…",
];

const EXAMPLES = [
  "2 eggs, toast with butter and a latte",
  "Chicken burrito bowl with extra guac",
  "A bowl of ramen with soft-boiled egg",
  "3 slices pepperoni pizza and a coke",
];

export function AiLogger({
  open,
  onClose,
  date,
  initialMeal,
  onOpenSettings,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  initialMeal: MealType;
  onOpenSettings: () => void;
}) {
  const { data, targets, addEntry, notify } = useStore();
  const [mode, setMode] = useState<Mode>("input");
  const [text, setText] = useState("");
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [image, setImage] = useState<{ dataUrl: string; mimeType: string; data: string } | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [note, setNote] = useState("");
  const [usedModel, setUsedModel] = useState("");
  const [loading, setLoading] = useState<"analyze" | "suggest" | null>(null);
  const [hint, setHint] = useState(0);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("input");
    setText("");
    setImage(null);
    setDrafts([]);
    setNote("");
    setError(null);
    setLoading(null);
    setMeal(initialMeal);
  }, [open, initialMeal]);

  useEffect(() => {
    if (!loading) return;
    setHint(0);
    const t = window.setInterval(() => setHint((h) => (h + 1) % HINTS.length), 1800);
    return () => window.clearInterval(t);
  }, [loading]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  const dayTotals = useMemo(() => {
    const entries = data.entries.filter((e) => e.date === date);
    const eaten = sumEntries(entries);
    const burned = sumExerciseKcal(data.exercises.filter((e) => e.date === date));
    return { eaten, burned };
  }, [data.entries, data.exercises, date]);

  const remaining = useMemo(() => {
    const t = targets ?? { calories: 2000, protein: 120, carbs: 220, fat: 65, fiber: 28 };
    return {
      calories: Math.max(150, t.calories - dayTotals.eaten.calories + dayTotals.burned),
      protein: Math.max(0, t.protein - dayTotals.eaten.protein),
      carbs: Math.max(0, t.carbs - dayTotals.eaten.carbs),
      fat: Math.max(0, t.fat - dayTotals.eaten.fat),
      fiber: 0,
    };
  }, [targets, dayTotals]);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError({ message: "That file isn't an image." });
      return;
    }
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
      setError(null);
    } catch {
      setError({ message: "Couldn't read that image. Try a different one." });
    }
  };

  const run = async (kind: "analyze" | "suggest") => {
    if (!data.settings.geminiKey) {
      setError({
        message: "Add your Gemini API key first — it's free from Google AI Studio.",
        code: "no-key",
      });
      return;
    }
    if (kind === "analyze" && !text.trim() && !image) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(kind);
    setError(null);
    try {
      const result: AiResult =
        kind === "analyze"
          ? await analyzeMeal({
              apiKey: data.settings.geminiKey,
              model: data.settings.model,
              text,
              image: image ? { mimeType: image.mimeType, data: image.data } : undefined,
              meal: MEALS.find((m) => m.value === meal)?.label ?? "meal",
              targets: remaining,
              signal: controller.signal,
            })
          : await suggestMeal({
              apiKey: data.settings.geminiKey,
              model: data.settings.model,
              remaining,
              meal: MEALS.find((m) => m.value === meal)?.label ?? "meal",
              signal: controller.signal,
            });
      setDrafts(
        result.items.map((item, i) => ({
          ...item,
          key: `${Date.now()}-${i}`,
          checked: true,
          grams: item.grams,
          baseGrams: item.grams,
        })),
      );
      setNote(result.note);
      setUsedModel(result.model);
      setMode("review");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const g = err instanceof GeminiError ? err : null;
      setError({ message: g?.message ?? (err as Error).message, code: g?.code });
    } finally {
      abortRef.current = null;
      setLoading(null);
    }
  };

  const patchDraft = (key: string, patch: Partial<DraftItem>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const selected = drafts.filter((d) => d.checked);
  const totals = selected.reduce(
    (acc, d) => {
      const n = draftNutrition(d);
      acc.calories += n.calories;
      acc.protein += n.protein;
      acc.carbs += n.carbs;
      acc.fat += n.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const commit = () => {
    if (selected.length === 0) return;
    selected.forEach((d) => {
      const f = d.grams / Math.max(1, d.baseGrams);
      const food = aiItemToFood({
        ...d,
        grams: d.grams,
        calories: d.calories * f,
        protein: d.protein * f,
        carbs: d.carbs * f,
        fat: d.fat * f,
        fiber: d.fiber * f,
      });
      addEntry(food, d.grams, meal, date);
    });
    notify(
      `Logged ${selected.length} item${selected.length > 1 ? "s" : ""} · ${Math.round(totals.calories)} kcal`,
      "success",
    );
    onClose();
  };

  const loadingView = (
    <div className="py-2">
      <div className="card relative overflow-hidden p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400/15 text-lime-300">
            <Sparkles size={20} />
            <span className="absolute inset-0 animate-ping rounded-xl bg-lime-400/10" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-white">{HINTS[hint]}</p>
            <p className="text-[11.5px] text-mist-500">Gemini is estimating portions from {image ? "your photo" : "your description"}.</p>
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          {[92, 70, 82].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-2.5 rounded-full" style={{ width: `${w}%` }} />
                <div className="skeleton h-2 w-1/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => {
          abortRef.current?.abort();
          setLoading(null);
        }}
        className="mt-4 w-full text-center text-[12px] text-mist-500 hover:text-mist-300"
      >
        Cancel
      </button>
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={
        mode === "review" ? (
          <span>AI estimate</span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-lime-400 text-ink-950">
              <Sparkles size={13} />
            </span>
            AI food tracking
          </span>
        )
      }
      subtitle={mode === "review" ? "Review, adjust portions, then log it." : "Describe a meal or snap a photo — Gemini does the math."}
    >
      {loading ? (
        loadingView
      ) : mode === "review" ? (
        <div className="animate-fade">
          <button
            onClick={() => {
              setMode("input");
              setDrafts([]);
              setError(null);
            }}
            className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-mist-400 hover:text-white"
          >
            <ArrowLeft size={14} /> Try again
          </button>

          {note && (
            <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-mist-400">
              {note}
            </div>
          )}

          <div className="space-y-2.5">
            {drafts.map((d) => {
              const n = draftNutrition(d);
              return (
                <div
                  key={d.key}
                  className={`card-tight p-3.5 transition-opacity ${d.checked ? "" : "opacity-45"}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => patchDraft(d.key, { checked: !d.checked })}
                      className="mt-0.5"
                      aria-label={d.checked ? "Exclude item" : "Include item"}
                    >
                      <CheckPill checked={d.checked} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-white">{d.name}</p>
                      <p className="mt-0.5 text-[11px] text-mist-500">
                        {d.quantity} {d.unit}
                        {d.brand ? ` · ${d.brand}` : ""} ·{" "}
                        <span
                          className={
                            d.confidence > 0.7
                              ? "text-lime-400/80"
                              : d.confidence > 0.4
                                ? "text-amber-400/80"
                                : "text-red-400/80"
                          }
                        >
                          {Math.round(d.confidence * 100)}% sure
                        </span>
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="relative w-[96px]">
                          <input
                            type="number"
                            value={Math.round(d.grams)}
                            onChange={(e) =>
                              patchDraft(d.key, { grams: Math.max(1, Number(e.target.value) || 1) })
                            }
                            className="h-8 w-full rounded-lg border border-white/10 bg-ink-900 px-2.5 pr-7 text-center font-mono text-[12px] text-white outline-none focus:border-lime-400/50"
                          />
                          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] text-mist-500">
                            g
                          </span>
                        </div>
                        <span className="text-[11px] text-mist-500">
                          P {fmt(n.protein, 1)} · C {fmt(n.carbs, 1)} · F {fmt(n.fat, 1)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-[15px] font-semibold text-white">{Math.round(n.calories)}</p>
                      <p className="text-[10px] text-mist-500">kcal</p>
                    </div>
                    <button
                      onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                      className="ml-0.5 text-mist-500 hover:text-red-400"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card mt-4 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="section-title">Selected total</p>
                <p className="num mt-1 text-2xl font-semibold text-white">
                  {Math.round(totals.calories)}
                  <span className="ml-1 text-[12px] font-normal text-mist-500">kcal</span>
                </p>
              </div>
              <div className="flex gap-3 text-right">
                {[
                  { label: "P", value: totals.protein, color: "#7dd3fc" },
                  { label: "C", value: totals.carbs, color: "#fbbf24" },
                  { label: "F", value: totals.fat, color: "#f472b6" },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="num text-[13px] font-semibold" style={{ color: m.color }}>
                      {fmt(m.value, 0)}g
                    </p>
                    <p className="text-[9.5px] text-mist-500">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <span className="label">Add to</span>
            <Segment
              options={MEALS.map((m) => ({ value: m.value, label: m.label.split(" ")[0] }))}
              value={meal}
              onChange={setMeal}
            />
          </div>

          <Button size="lg" className="mt-4 w-full" onClick={commit} disabled={selected.length === 0}>
            <Check size={17} /> Log {selected.length} item{selected.length === 1 ? "" : "s"} ·{" "}
            {Math.round(totals.calories)} kcal
          </Button>
          <p className="mt-2.5 text-center text-[10.5px] text-mist-500">
            AI estimates are approximations. Adjust portions when you know better.
            {usedModel ? ` · ${usedModel}` : ""}
          </p>
        </div>
      ) : (
        <div className="animate-fade">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-mist-500 uppercase">
              Logging to
            </span>
            <span className="text-[11px] font-medium text-mist-300">
              {MEALS.find((m) => m.value === meal)?.label} · {date === dateKey() ? "today" : date}
            </span>
          </div>
          <Segment
            options={MEALS.map((m) => ({ value: m.value, label: m.label.split(" ")[0] }))}
            value={meal}
            onChange={setMeal}
          />

          {!data.settings.geminiKey && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3.5">
              <KeyRound size={16} className="mt-0.5 shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-amber-200">Gemini key needed</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-amber-100/60">
                  Add your free API key from Google AI Studio. It stays in this browser.
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={onOpenSettings}>
                Open
              </Button>
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void pickImage(e.dataTransfer.files?.[0]);
            }}
            className={`relative mt-4 overflow-hidden rounded-2xl border border-dashed transition-colors ${
              dragging ? "border-lime-400/60 bg-lime-400/[0.06]" : "border-white/15 bg-ink-850/60"
            }`}
          >
            {image ? (
              <div className="relative">
                <img src={image.dataUrl} alt="Meal to analyse" className="max-h-[260px] w-full object-cover" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                  aria-label="Remove photo"
                >
                  <Trash2 size={14} />
                </button>
                <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[10.5px] font-medium text-white backdrop-blur">
                  Photo attached
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2.5 px-6 py-8 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300">
                  <Camera size={22} />
                </span>
                <span className="text-[13px] font-medium text-mist-200">Snap or drop a meal photo</span>
                <span className="text-[11.5px] text-mist-500">
                  Works with plates, packaging, menus — optional but more accurate.
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-lime-300">
                  <ImagePlus size={13} /> Choose image
                </span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void pickImage(e.target.files?.[0])}
            />
          </div>

          <div className="mt-4">
            <span className="label">Or describe it</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Two scrambled eggs, sourdough toast with butter, and a flat white."
              className="field resize-none leading-relaxed"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.slice(0, 3).map((ex) => (
                <button key={ex} onClick={() => setText(ex)} className="chip text-left">
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/[0.07] p-3.5">
              <p className="text-[12px] leading-relaxed text-red-200">{error.message}</p>
              {(error.code === "no-key" || error.code === "bad-key") && (
                <button
                  onClick={onOpenSettings}
                  className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-red-100 underline underline-offset-2"
                >
                  <KeyRound size={12} /> Open AI settings
                </button>
              )}
            </div>
          )}

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={() => void run("analyze")}
            disabled={(!text.trim() && !image) || loading !== null}
          >
            <Sparkles size={17} />
            Analyze {image && text.trim() ? "photo + text" : image ? "photo" : "meal"}
          </Button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[10px] tracking-[0.15em] text-mist-500 uppercase">or</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => void run("suggest")}
            disabled={loading !== null}
          >
            <Wand2 size={15} /> Suggest a meal for my remaining macros
          </Button>
          <p className="mt-2.5 text-center text-[10.5px] leading-relaxed text-mist-500">
            Remaining today: {Math.round(remaining.calories)} kcal · {Math.round(remaining.protein)} g protein
          </p>

          <p className="mt-5 text-center text-[10.5px] leading-relaxed text-mist-500">
            Your photo and text are sent to Google Gemini using your own API key. Nothing else is
            uploaded — this diary lives on your device.
          </p>
        </div>
      )}
    </Sheet>
  );
}
