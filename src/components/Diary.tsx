import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  Copy,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Minus,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Timer,
  Trash2,
} from "lucide-react";
import type { MealType } from "../types";
import { MEALS, portion, sumEntries, sumExerciseKcal } from "../lib/nutrition";
import { fmt } from "../lib/format";
import { clock, dayLabel, shiftKey, timeOfDay, todayKey } from "../lib/date";
import { useStore } from "../store";
import { Button, IconButton, MacroBar, NumberStepper, Ring, Segment, Sheet } from "./ui";
import { FoodPicker } from "./FoodPicker";
import { ExerciseSheet } from "./ExerciseSheet";

const MEAL_ICONS: Record<MealType, ReactNode> = {
  breakfast: <Coffee size={16} />,
  lunch: <Sun size={16} />,
  dinner: <Moon size={16} />,
  snack: <Cookie size={16} />,
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "#fbbf24",
  lunch: "#7dd3fc",
  dinner: "#a78bfa",
  snack: "#f472b6",
};

function mealForTime(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export function Diary({
  date,
  onDateChange,
  onAi,
  onOpenFasting,
}: {
  date: string;
  onDateChange: (date: string) => void;
  onAi: (meal: MealType) => void;
  onOpenFasting: () => void;
}) {
  const { data, targets, updateEntry, removeEntry, addWater, addEntry, addSteps, notify } = useStore();
  const [picker, setPicker] = useState<{ open: boolean; meal: MealType }>({
    open: false,
    meal: "breakfast",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);

  const dayEntries = useMemo(() => data.entries.filter((e) => e.date === date), [data.entries, date]);
  const totals = useMemo(() => sumEntries(dayEntries), [dayEntries]);
  const exercises = useMemo(
    () => data.exercises.filter((e) => e.date === date),
    [data.exercises, date],
  );
  const burned = sumExerciseKcal(exercises);
  const target = targets?.calories ?? 2000;
  const remaining = target + burned - totals.calories;
  const progress = totals.calories / Math.max(1, target + burned);
  const over = remaining < 0;

  const water = data.water[date] ?? 0;
  const waterGoal = data.settings.waterGoalMl;
  const steps = data.steps[date] ?? 0;
  const stepGoal = data.settings.stepGoal;

  const editing = data.entries.find((e) => e.id === editingId) ?? null;
  const [grams, setGrams] = useState(100);
  const [editMeal, setEditMeal] = useState<MealType>("breakfast");

  useEffect(() => {
    if (editing) {
      setGrams(editing.grams);
      setEditMeal(editing.meal);
    }
    // Only re-seed when a different entry is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const copyYesterday = () => {
    const yesterday = shiftKey(date, -1);
    const source = data.entries.filter((e) => e.date === yesterday);
    if (source.length === 0) {
      notify("Nothing logged yesterday to copy.");
      return;
    }
    source.forEach((entry) => addEntry(entry.food, entry.grams, entry.meal, date));
    notify(`Copied ${source.length} item${source.length > 1 ? "s" : ""} from yesterday`, "success");
  };

  const goalText = data.profile
    ? data.profile.goal === "lose"
      ? `Losing ${data.profile.rateKgPerWeek} kg / week`
      : data.profile.goal === "gain"
        ? `Gaining ${data.profile.rateKgPerWeek} kg / week`
        : "Maintaining weight"
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <IconButton onClick={() => onDateChange(shiftKey(date, -1))} aria-label="Previous day">
          <ChevronLeft size={17} />
        </IconButton>
        <button
          onClick={() => onDateChange(todayKey())}
          className="group flex flex-col items-center"
          title="Jump to today"
        >
          <span className="text-[16px] font-semibold text-white">{dayLabel(date)}</span>
          <span className="text-[11px] text-mist-500">
            {date === todayKey() ? "Keep it up" : "Tap for today"}
          </span>
        </button>
        <IconButton
          onClick={() => onDateChange(shiftKey(date, 1))}
          aria-label="Next day"
          disabled={date >= todayKey()}
          className="disabled:opacity-30"
        >
          <ChevronRight size={17} />
        </IconButton>
      </div>

      <section className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-lime-400/[0.07] blur-3xl" />
        <div className="relative flex items-center justify-between">
          <p className="section-title">Daily energy</p>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10.5px] font-medium text-mist-400">
            {goalText}
          </span>
        </div>

        <div className="relative mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-7">
          <Ring progress={progress} size={198} stroke={13} color={over ? "#f87171" : "#d3ff4f"}>
            <span
              className={`num text-[40px] leading-none font-semibold ${over ? "text-red-400" : "text-white"}`}
            >
              {Math.abs(Math.round(remaining))}
            </span>
            <span className="mt-1 text-[11px] font-medium tracking-[0.14em] text-mist-500 uppercase">
              {over ? "kcal over" : "kcal left"}
            </span>
          </Ring>

          <div className="w-full flex-1">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Eaten", value: Math.round(totals.calories), color: "#eef1f6" },
                { label: "Burned", value: burned, color: "#fb923c" },
                { label: "Goal", value: target, color: "#d3ff4f" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/[0.03] px-2 py-2.5 text-center">
                  <p className="num text-[16px] font-semibold" style={{ color: s.color }}>
                    {fmt(s.value)}
                  </p>
                  <p className="mt-0.5 text-[9.5px] tracking-[0.12em] text-mist-500 uppercase">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-4">
              <MacroBar
                label="Protein"
                value={totals.protein}
                target={targets?.protein ?? 0}
                color="#7dd3fc"
              />
              <MacroBar label="Carbs" value={totals.carbs} target={targets?.carbs ?? 0} color="#fbbf24" />
              <MacroBar label="Fat" value={totals.fat} target={targets?.fat ?? 0} color="#f472b6" />
            </div>
            <p className="mt-3 text-[10.5px] text-mist-500">
              {Math.round(totals.fiber)} g fiber ·{" "}
              {targets ? `${Math.round(targets.fiber)} g target` : ""}
            </p>
          </div>
        </div>
      </section>

      <button
        onClick={() => onAi(mealForTime())}
        className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-lime-400/20 bg-gradient-to-r from-lime-400/[0.1] via-lime-400/[0.04] to-transparent p-4 text-left transition-colors hover:border-lime-400/35"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-ink-950">
          <Sparkles size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-lime-200">Log a meal with AI</span>
          <span className="mt-0.5 block text-[11.5px] text-mist-400">
            Snap a photo or write one line — Gemini fills in the macros.
          </span>
        </span>
        <ChevronRight size={17} className="text-lime-400/70 transition-transform group-hover:translate-x-0.5" />
      </button>

      <div className="grid grid-cols-2 gap-3">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-water">
              <Droplets size={14} />
              <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase">Water</span>
            </div>
            <IconButton
              onClick={() => addWater(-250, date)}
              className="h-6 w-6 border-0 bg-white/[0.04]"
              aria-label="Remove a glass"
            >
              <Minus size={12} />
            </IconButton>
          </div>
          <p className="num mt-2 text-[19px] font-semibold text-white">
            {fmt(water)}{" "}
            <span className="text-[11px] font-normal text-mist-500">/ {fmt(waterGoal)} ml</span>
          </p>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className="h-5 flex-1 rounded-[3px] transition-colors"
                style={{
                  background:
                    water >= ((i + 1) * waterGoal) / 10 ? "#38bdf8" : "rgba(255,255,255,0.07)",
                }}
              />
            ))}
          </div>
          <button
            onClick={() => addWater(250, date)}
            className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-water hover:text-sky-300"
          >
            <Plus size={12} /> 250 ml
          </button>
        </section>

        <section className="card p-4">
          <div className="flex items-center gap-1.5 text-mist-400">
            <Footprints size={14} />
            <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase">Steps</span>
          </div>
          <p className="num mt-2 text-[19px] font-semibold text-white">
            {fmt(steps)}{" "}
            <span className="text-[11px] font-normal text-mist-500">/ {fmt(stepGoal)}</span>
          </p>
          <div className="mt-2 h-5 overflow-hidden rounded-[3px] bg-white/[0.07]">
            <div
              className="h-full rounded-[3px] bg-gradient-to-r from-mist-500 to-mist-300 transition-[width]"
              style={{ width: `${Math.min(100, (steps / Math.max(1, stepGoal)) * 100)}%` }}
            />
          </div>
          <button
            onClick={() => addSteps(1000, date)}
            className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-mist-300 hover:text-white"
          >
            <Plus size={12} /> 1,000
          </button>
        </section>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="section-title">Meals</h2>
          <button
            onClick={copyYesterday}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-mist-500 transition-colors hover:text-mist-200"
          >
            <Copy size={11} /> Copy yesterday
          </button>
        </div>

        <div className="space-y-2.5">
          {MEALS.map((meal) => {
            const items = dayEntries.filter((e) => e.meal === meal.value);
            const kcal = items.reduce((sum, e) => sum + portion(e.food, e.grams).calories, 0);
            return (
              <section key={meal.value} className="card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: `${MEAL_COLORS[meal.value]}14`,
                      color: MEAL_COLORS[meal.value],
                    }}
                  >
                    {MEAL_ICONS[meal.value]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-mist-100">{meal.label}</p>
                    <p className="text-[10.5px] text-mist-500">
                      {items.length === 0
                        ? "Nothing logged"
                        : `${items.length} item${items.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <span className="num text-[13px] font-semibold text-mist-300">
                    {Math.round(kcal)}
                    <span className="ml-1 text-[10px] font-normal text-mist-500">kcal</span>
                  </span>
                  <IconButton
                    onClick={() => setPicker({ open: true, meal: meal.value })}
                    className="h-8 w-8"
                    aria-label={`Add ${meal.label}`}
                  >
                    <Plus size={15} />
                  </IconButton>
                </div>

                {items.length > 0 && (
                  <div className="divide-y divide-white/[0.05] border-t border-white/[0.05]">
                    {items.map((entry) => {
                      const n = portion(entry.food, entry.grams);
                      return (
                        <button
                          key={entry.id}
                          onClick={() => setEditingId(entry.id)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.025]"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: MEAL_COLORS[meal.value] }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] text-mist-200">
                              {entry.food.name}
                            </span>
                            <span className="mt-0.5 block text-[10.5px] text-mist-500">
                              {fmt(entry.grams, 0)} g · P {fmt(n.protein, 0)} · C {fmt(n.carbs, 0)} · F{" "}
                              {fmt(n.fat, 0)}
                            </span>
                          </span>
                          <span className="num text-[12px] text-mist-400">{Math.round(n.calories)}</span>
                          <ChevronRight size={13} className="text-mist-500" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-400/10 text-orange-300">
              <Dumbbell size={15} />
            </span>
            <div>
              <p className="text-[12.5px] font-medium text-mist-100">Exercise</p>
              <p className="text-[10.5px] text-mist-500">
                {exercises.length === 0 ? "No workouts logged" : `${exercises.length} workout${exercises.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="num text-[14px] font-semibold text-orange-300">+{burned}</p>
              <p className="text-[9.5px] text-mist-500">kcal burned</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setExerciseOpen(true)}>
              <Plus size={13} /> Log
            </Button>
          </div>
        </div>
        {exercises.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exercises.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10.5px] text-mist-300"
              >
                <Flame size={10} className="text-orange-300" /> {e.name} · {e.minutes}m
              </span>
            ))}
          </div>
        )}
      </section>

      <FastingTeaser onOpenFasting={onOpenFasting} />

      <FoodPicker
        open={picker.open}
        onClose={() => setPicker((p) => ({ ...p, open: false }))}
        date={date}
        initialMeal={picker.meal}
        onRequestAI={() => {
          setPicker((p) => ({ ...p, open: false }));
          onAi(picker.meal);
        }}
      />

      <ExerciseSheet open={exerciseOpen} onClose={() => setExerciseOpen(false)} date={date} />

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditingId(null)}
        title={editing?.food.name}
        subtitle={editing ? `${editing.food.calories} kcal per 100 g` : undefined}
      >
        {editing && (
          <div>
            <span className="label">Portion</span>
            <NumberStepper value={grams} onChange={setGrams} step={10} min={1} max={3000} />

            <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-white/[0.03] p-3 text-center">
              {[
                { label: "kcal", value: portion(editing.food, grams).calories, color: "#fff", digits: 0 },
                { label: "Protein", value: portion(editing.food, grams).protein, color: "#7dd3fc", digits: 1 },
                { label: "Carbs", value: portion(editing.food, grams).carbs, color: "#fbbf24", digits: 1 },
                { label: "Fat", value: portion(editing.food, grams).fat, color: "#f472b6", digits: 1 },
              ].map((m) => (
                <div key={m.label}>
                  <p className="num text-[16px] font-semibold" style={{ color: m.color }}>
                    {fmt(m.value, m.digits)}
                  </p>
                  <p className="text-[9.5px] tracking-wide text-mist-500 uppercase">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <span className="label">Meal</span>
              <Segment
                options={MEALS.map((m) => ({ value: m.value, label: m.label.split(" ")[0] }))}
                value={editMeal}
                onChange={setEditMeal}
              />
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  removeEntry(editing.id);
                  setEditingId(null);
                  notify("Entry removed");
                }}
              >
                <Trash2 size={15} /> Delete
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  updateEntry(editing.id, { grams, meal: editMeal });
                  setEditingId(null);
                  notify("Entry updated", "success");
                }}
              >
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

function FastingTeaser({ onOpenFasting }: { onOpenFasting: () => void }) {
  const { data } = useStore();
  const { fasting } = data;
  const active = fasting.activeStart !== null;
  const now = useNow(active);
  const goalMs = fasting.goalHours * 3600_000;
  const elapsed = active ? now - (fasting.activeStart ?? now) : 0;
  const progress = active ? Math.min(1, elapsed / goalMs) : 0;
  const done = active && elapsed >= goalMs;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fast/10 text-fast">
          <Timer size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-mist-100">
            {active ? (done ? "Fast complete 🎉" : "Fasting in progress") : `${fasting.goalHours}:8 fasting`}
          </p>
          <p className="text-[10.5px] text-mist-500">
            {active
              ? `${clock(elapsed)} elapsed · started ${timeOfDay(fasting.activeStart ?? now)}`
              : "Tap to start your fasting window"}
          </p>
        </div>
        {active ? (
          <button
            onClick={onOpenFasting}
            className="rounded-full border border-fast/30 bg-fast/10 px-3 py-1.5 text-[11px] font-semibold text-fast"
          >
            View timer
          </button>
        ) : (
          <button
            onClick={onOpenFasting}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-mist-200"
          >
            Open
          </button>
        )}
      </div>
      {active && (
        <div className="h-1 bg-white/[0.06]">
          <div
            className="h-full bg-fast transition-[width] duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </section>
  );
}
