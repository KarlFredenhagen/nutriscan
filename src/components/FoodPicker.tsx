import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Plus,
  ScanBarcode,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { FoodItem, MealType } from "../types";
import { MEALS, portion } from "../lib/nutrition";
import { fmt, round } from "../lib/format";
import { searchFoods } from "../data/foods";
import { useStore, uid } from "../store";
import { Button, EmptyState, Field, NumberStepper, Segment, Sheet } from "./ui";
import { BarcodePanel } from "./BarcodePanel";
import { dateKey } from "../lib/date";

export function FoodPicker({
  open,
  onClose,
  date,
  initialMeal,
  onRequestAI,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  initialMeal: MealType;
  onRequestAI: () => void;
}) {
  const { data, addEntry, saveCustomFood, notify } = useStore();
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState(100);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [prefillName, setPrefillName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setMeal(initialMeal);
      setSelected(null);
      setQuery("");
      setCreating(false);
      setScanning(false);
      setPrefillName(undefined);
    }
  }, [open, initialMeal]);

  const results = useMemo(() => searchFoods(query, data.customFoods), [query, data.customFoods]);

  const recent = useMemo(() => {
    if (query.trim()) return [];
    const seen = new Set<string>();
    const out: FoodItem[] = [];
    for (const entry of [...data.entries].sort((a, b) => b.createdAt - a.createdAt)) {
      if (seen.has(entry.food.name)) continue;
      seen.add(entry.food.name);
      out.push(entry.food);
      if (out.length >= 5) break;
    }
    return out;
  }, [data.entries, query]);

  const openFood = (food: FoodItem) => {
    setSelected(food);
    setGrams(food.servingGrams ?? 100);
  };

  const add = () => {
    if (!selected) return;
    addEntry(selected, grams, meal, date);
    notify(`Added ${selected.name} · ${Math.round(portion(selected, grams).calories)} kcal`, "success");
    setSelected(null);
    setQuery("");
    onClose();
  };

  const total = selected ? portion(selected, grams) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={
        selected ? "Portion" : creating ? "New food" : scanning ? "Scan a barcode" : "Add food"
      }
      subtitle={selected ? undefined : `Logging to ${MEALS.find((m) => m.value === meal)?.label} · ${date === dateKey() ? "today" : date}`}
    >
      {selected && total ? (
        <div className="animate-fade">
          <button
            onClick={() => setSelected(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-mist-400 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to search
          </button>

          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[17px] leading-snug font-semibold text-white">{selected.name}</h3>
                {selected.brand && <p className="text-[12px] text-mist-400">{selected.brand}</p>}
                <p className="mt-0.5 text-[11.5px] text-mist-500">
                  {selected.servingLabel ? `${selected.servingLabel} · ` : ""}
                  {selected.calories} kcal / 100 g
                </p>
              </div>
              <span
                title={selected.source === "off" ? "From Open Food Facts" : undefined}
                className="shrink-0 rounded-full bg-lime-400/10 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-lime-300 uppercase"
              >
                {selected.source === "ai"
                  ? "AI"
                  : selected.source === "custom"
                    ? "Mine"
                    : selected.source === "off"
                      ? "Barcode"
                      : "Database"}
              </span>
            </div>

            <div className="mt-5">
              <span className="label">Portion size</span>
              <NumberStepper value={grams} onChange={setGrams} step={10} min={1} max={3000} />
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {Array.from(
                  new Set(
                    [selected.servingGrams, 50, 100, 150, 200, 250].filter(
                      (g): g is number => typeof g === "number" && g > 0 && g <= 1000,
                    ),
                  ),
                )
                  .sort((a, b) => a - b)
                  .slice(0, 6)
                  .map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrams(g)}
                      className={`chip ${grams === g ? "chip-active" : ""}`}
                    >
                      {g} g
                    </button>
                  ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl bg-white/[0.03] p-3 text-center">
              <div>
                <p className="num text-[17px] font-semibold text-white">{Math.round(total.calories)}</p>
                <p className="text-[10px] tracking-wide text-mist-500 uppercase">kcal</p>
              </div>
              {[
                { label: "Protein", value: total.protein, color: "#7dd3fc" },
                { label: "Carbs", value: total.carbs, color: "#fbbf24" },
                { label: "Fat", value: total.fat, color: "#f472b6" },
              ].map((m) => (
                <div key={m.label}>
                  <p className="num text-[17px] font-semibold" style={{ color: m.color }}>
                    {fmt(m.value, 1)}
                  </p>
                  <p className="text-[10px] tracking-wide text-mist-500 uppercase">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <span className="label">Meal</span>
            <Segment
              options={MEALS.map((m) => ({ value: m.value, label: m.label.split(" ")[0] }))}
              value={meal}
              onChange={setMeal}
            />
          </div>

          <Button size="lg" className="mt-5 w-full" onClick={add}>
            <Plus size={17} /> Add {Math.round(total.calories)} kcal
          </Button>
        </div>
      ) : creating ? (
        <CustomFoodForm
          initialName={prefillName}
          onCancel={() => {
            setCreating(false);
            setPrefillName(undefined);
          }}
          onCreate={(food) => {
            saveCustomFood(food);
            setCreating(false);
            setPrefillName(undefined);
            openFood(food);
            notify("Custom food saved", "success");
          }}
        />
      ) : scanning ? (
        <div className="animate-fade">
          <button
            onClick={() => setScanning(false)}
            className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-mist-400 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to search
          </button>
          <BarcodePanel
            onPick={(food) => {
              setScanning(false);
              openFood(food);
            }}
            onManual={(name) => {
              setScanning(false);
              setPrefillName(name);
              setCreating(true);
            }}
            onAskAI={onRequestAI}
          />
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-mist-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 120+ foods…"
              className="field pr-10 pl-10"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-mist-500 hover:text-white"
                aria-label="Clear"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setScanning(true);
                setQuery("");
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-lime-400/25 bg-lime-400/[0.07] py-2.5 text-[12.5px] font-semibold text-lime-200 transition-colors hover:bg-lime-400/[0.12]"
            >
              <ScanBarcode size={15} /> Scan barcode
            </button>
            <button
              onClick={() => {
                setPrefillName(undefined);
                setCreating(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-[12.5px] font-medium text-mist-200 transition-colors hover:bg-white/[0.07]"
            >
              <Plus size={15} /> Custom food
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-mist-500 uppercase">
              {query ? `${results.length} results` : "Popular & recent"}
            </span>
            <span className="text-[11px] text-mist-500">Packaged food? Scan the barcode</span>
          </div>

          {!query && recent.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {recent.map((food) => (
                <button key={`recent-${food.id}`} onClick={() => openFood(food)} className="chip">
                  <Clock size={11} /> {food.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 divide-y divide-white/[0.05]">
            {results.map((food) => {
              const kcal = food.servingGrams
                ? Math.round((food.calories * food.servingGrams) / 100)
                : food.calories;
              return (
                <button
                  key={food.id}
                  onClick={() => openFood(food)}
                  className="group flex w-full items-center gap-3 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-mist-100 group-hover:text-white">
                      {food.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-mist-500">
                      {food.servingGrams
                        ? `per ${food.servingLabel ?? `${food.servingGrams} g`}`
                        : "per 100 g"}{" "}
                      · P {fmt(food.protein, 1)} · C {fmt(food.carbs, 1)} · F {fmt(food.fat, 1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-[13px] font-semibold text-mist-200">{kcal}</p>
                    <p className="text-[10px] text-mist-500">kcal</p>
                  </div>
                  <ChevronRight size={15} className="text-mist-500 group-hover:text-mist-400" />
                </button>
              );
            })}
          </div>

          {results.length === 0 && (
            <EmptyState
              icon={<Search size={20} />}
              title="No match in the database"
              body="Create a custom food, or let Gemini estimate the nutrition for you."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setScanning(true)}>
                    <ScanBarcode size={14} /> Scan barcode
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onRequestAI}>
                    <Sparkles size={14} /> Ask Gemini
                  </Button>
                </div>
              }
            />
          )}

          <button
            onClick={onRequestAI}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/[0.05] p-3.5 text-left transition-colors hover:bg-lime-400/[0.09]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/15 text-lime-300">
              <Sparkles size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-lime-200">Not in the list? Describe it</p>
              <p className="text-[11.5px] text-mist-400">Gemini estimates any meal from text or a photo.</p>
            </div>
            <ChevronRight size={16} className="text-lime-400/70" />
          </button>
        </div>
      )}
    </Sheet>
  );
}

function CustomFoodForm({
  onCancel,
  onCreate,
  initialName,
}: {
  onCancel: () => void;
  onCreate: (food: FoodItem) => void;
  initialName?: string;
}) {
  const [form, setForm] = useState({
    name: initialName ?? "",
    servingLabel: "1 serving",
    servingGrams: 100,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.name.trim().length > 1 && form.servingGrams > 0 && form.calories > 0;

  const submit = () => {
    if (!valid) return;
    const f = 100 / form.servingGrams;
    onCreate({
      id: `custom-${uid()}`,
      name: form.name.trim().slice(0, 70),
      per100: true,
      servingLabel: form.servingLabel.trim() || `${form.servingGrams} g`,
      servingGrams: form.servingGrams,
      calories: round(form.calories * f),
      protein: round(form.protein * f, 1),
      carbs: round(form.carbs * f, 1),
      fat: round(form.fat * f, 1),
      fiber: round(form.fiber * f, 1),
      source: "custom",
    });
  };

  return (
    <div className="animate-fade space-y-4">
      <Field
        label="Food name"
        placeholder="e.g. Grandma's lasagna"
        value={form.name}
        maxLength={70}
        autoFocus
        onChange={(e) => set("name", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Serving name"
          placeholder="1 slice"
          value={form.servingLabel}
          onChange={(e) => set("servingLabel", e.target.value)}
        />
        <Field
          label="Serving weight"
          type="number"
          inputMode="decimal"
          suffix="g"
          value={form.servingGrams}
          onChange={(e) => set("servingGrams", Number(e.target.value))}
        />
      </div>
      <div>
        <span className="label">Nutrition per serving</span>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Calories"
            type="number"
            inputMode="numeric"
            suffix="kcal"
            value={form.calories || ""}
            onChange={(e) => set("calories", Number(e.target.value))}
          />
          <Field
            label="Protein"
            type="number"
            inputMode="decimal"
            suffix="g"
            value={form.protein || ""}
            onChange={(e) => set("protein", Number(e.target.value))}
          />
          <Field
            label="Carbs"
            type="number"
            inputMode="decimal"
            suffix="g"
            value={form.carbs || ""}
            onChange={(e) => set("carbs", Number(e.target.value))}
          />
          <Field
            label="Fat"
            type="number"
            inputMode="decimal"
            suffix="g"
            value={form.fat || ""}
            onChange={(e) => set("fat", Number(e.target.value))}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={submit} disabled={!valid}>
          Save food
        </Button>
      </div>
    </div>
  );
}
