import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Flame,
  Moon,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  ScanLine,
} from "lucide-react";
import type { ActivityLevel, GoalType, Profile, Sex, UnitSystem } from "../types";
import { ACTIVITY_LEVELS, targetsFor } from "../lib/nutrition";
import { heightDisplay, round, toKg, weightValue } from "../lib/format";
import { Button, Field, Segment } from "./ui";
import { useStore } from "../store";

const TOTAL_STEPS = 4;

export function Onboarding() {
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    sex: "female" as Sex,
    age: 30,
    units: "metric" as UnitSystem,
    heightCm: 170,
    weightKg: 70,
    activity: "light" as ActivityLevel,
    goal: "lose" as GoalType,
    rateKgPerWeek: 0.5,
    targetWeightKg: 65,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const preview: Profile = useMemo(
    () => ({
      name: form.name.trim(),
      sex: form.sex,
      age: form.age,
      heightCm: form.heightCm,
      weightKg: form.weightKg,
      activity: form.activity,
      goal: form.goal,
      rateKgPerWeek: form.goal === "maintain" ? 0 : form.rateKgPerWeek,
      targetWeightKg: form.targetWeightKg,
      units: form.units,
      createdAt: Date.now(),
    }),
    [form],
  );
  const targets = useMemo(() => targetsFor(preview), [preview]);

  const units = form.units;
  const valid =
    step === 0 ||
    (step === 1 && form.age >= 13 && form.age <= 100) ||
    (step === 2 && form.heightCm >= 120 && form.heightCm <= 230 && form.weightKg >= 35 && form.weightKg <= 300) ||
    step === 3 ||
    (step === 4 && form.targetWeightKg >= 25 && form.targetWeightKg <= 350);

  const next = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else completeOnboarding(preview);
  };

  const changeUnits = (nextUnits: UnitSystem) => {
    if (nextUnits === form.units) return;
    set("units", nextUnits);
  };

  if (step === 0) {
    return (
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-8">
        <div className="pointer-events-none absolute top-[-120px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-lime-400/10 blur-[100px]" />
        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-ink-950">
            <ScanLine size={19} strokeWidth={2.4} />
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-white">
            Nutri<span className="text-lime-400">Scan</span>
          </span>
        </div>

        <div className="relative mt-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/25 bg-lime-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-lime-300">
            <Sparkles size={12} /> AI FOOD TRACKING
          </span>
          <h1 className="mt-5 text-[40px] leading-[1.05] font-semibold tracking-tight text-white">
            Snap your plate.
            <br />
            <span className="text-mist-400">Know your numbers.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-mist-400">
            NutriScan uses Gemini to turn a photo or a sentence into a full calorie and macro
            breakdown — then keeps your goals, fasting and progress in one place.
          </p>
        </div>

        <div className="relative mt-9 space-y-2.5">
          {[
            { icon: <Camera size={16} />, title: "Photo & text logging", body: "Describe a meal in plain language. Or just point your camera." },
            { icon: <Target size={16} />, title: "Targets built for your body", body: "Mifflin-St Jeor calorie plan with protein, carbs and fat." },
            { icon: <Moon size={16} />, title: "Fasting, water, weight & insights", body: "Everything Yazio does, private to your device." },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-ink-850/70 p-3.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-lime-400">
                {f.icon}
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-mist-100">{f.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-mist-500">{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-auto pt-8">
          <Button size="lg" className="w-full" onClick={next}>
            Get started <ArrowRight size={17} />
          </Button>
          <p className="mt-3 text-center text-[11px] text-mist-500">
            Free & local-first. Bring your own Gemini API key.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-7">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(step - 1)}
          className="btn h-9 w-9 border border-white/10 bg-white/[0.04] text-mist-300"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i <= step ? "w-6 bg-lime-400" : "w-6 bg-white/10"
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-medium text-mist-500">{step}/4</span>
      </div>

      <div className="mt-9 flex-1">
        {step === 1 && (
          <div className="animate-fade">
            <h1 className="text-[27px] leading-tight font-semibold text-white">Let's meet you.</h1>
            <p className="mt-1.5 text-[13.5px] text-mist-400">
              We use this to calculate your energy needs.
            </p>

            <div className="mt-7 space-y-5">
              <Field
                label="Name (optional)"
                placeholder="What should we call you?"
                value={form.name}
                maxLength={24}
                onChange={(e) => set("name", e.target.value)}
              />

              <div>
                <span className="label">Biological sex</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["female", "male"] as Sex[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => set("sex", s)}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        form.sex === s
                          ? "border-lime-400/50 bg-lime-400/[0.08]"
                          : "border-white/10 bg-ink-900/60 hover:border-white/20"
                      }`}
                    >
                      <span className="block text-[13.5px] font-medium capitalize text-mist-100">{s}</span>
                      <span className="mt-0.5 block text-[11px] text-mist-500">
                        {s === "female" ? "Used for BMR formula" : "Used for BMR formula"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Age"
                  type="number"
                  inputMode="numeric"
                  min={13}
                  max={100}
                  value={form.age}
                  onChange={(e) => set("age", Number(e.target.value))}
                  suffix="yrs"
                />
                <div>
                  <span className="label">Units</span>
                  <Segment
                    options={[
                      { value: "metric", label: "Metric" },
                      { value: "imperial", label: "Imperial" },
                    ]}
                    value={units}
                    onChange={changeUnits}
                    className="h-[46px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade">
            <h1 className="text-[27px] leading-tight font-semibold text-white">Your body today.</h1>
            <p className="mt-1.5 text-[13.5px] text-mist-400">
              No judgement — just a starting point you can update anytime.
            </p>

            <div className="mt-7 space-y-5">
              {units === "metric" ? (
                <Field
                  label="Height"
                  type="number"
                  inputMode="numeric"
                  value={round(form.heightCm, 0)}
                  onChange={(e) => set("heightCm", Number(e.target.value))}
                  suffix="cm"
                />
              ) : (
                <div>
                  <span className="label">Height</span>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      type="number"
                      value={Math.floor(form.heightCm / 30.48)}
                      onChange={(e) => {
                        const feet = Number(e.target.value);
                        const inches = Math.round(form.heightCm / 2.54) % 12;
                        set("heightCm", round(feet * 30.48 + inches * 2.54, 1));
                      }}
                      suffix="ft"
                    />
                    <Field
                      type="number"
                      value={Math.round(form.heightCm / 2.54) % 12}
                      onChange={(e) => {
                        const inches = Number(e.target.value);
                        const feet = Math.floor(form.heightCm / 30.48);
                        set("heightCm", round(feet * 30.48 + inches * 2.54, 1));
                      }}
                      suffix="in"
                    />
                  </div>
                </div>
              )}

              <Field
                label="Current weight"
                type="number"
                inputMode="decimal"
                value={weightValue(form.weightKg, units)}
                onChange={(e) => set("weightKg", round(toKg(Number(e.target.value), units), 1))}
                suffix={units === "metric" ? "kg" : "lb"}
              />

              <div className="card-tight flex items-center justify-between p-4">
                <div>
                  <p className="text-[12.5px] font-medium text-mist-100">Body mass index</p>
                  <p className="text-[11.5px] text-mist-500">A rough screening number, not the whole story.</p>
                </div>
                <div className="text-right">
                  <p className="num text-xl font-semibold text-white">
                    {(form.weightKg / (form.heightCm / 100) ** 2).toFixed(1)}
                  </p>
                  <p className="text-[10.5px] text-mist-500">{heightDisplay(form.heightCm, units)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade">
            <h1 className="text-[27px] leading-tight font-semibold text-white">How active are you?</h1>
            <p className="mt-1.5 text-[13.5px] text-mist-400">
              Day-to-day movement, not just workouts. Be honest for better targets.
            </p>
            <div className="mt-7 space-y-2">
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => set("activity", a.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    form.activity === a.value
                      ? "border-lime-400/50 bg-lime-400/[0.07]"
                      : "border-white/10 bg-ink-900/60 hover:border-white/20"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      form.activity === a.value
                        ? "border-lime-400 bg-lime-400 text-ink-950"
                        : "border-white/20 text-transparent"
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-mist-100">{a.label}</span>
                    <span className="block text-[11.5px] text-mist-500">{a.hint}</span>
                  </span>
                  <span className="num text-[11px] text-mist-500">×{a.multiplier}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade">
            <h1 className="text-[27px] leading-tight font-semibold text-white">What's the goal?</h1>
            <p className="mt-1.5 text-[13.5px] text-mist-400">
              You can change this whenever life changes.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {(
                [
                  { value: "lose", label: "Lose fat", icon: <TrendingDown size={18} /> },
                  { value: "maintain", label: "Maintain", icon: <Minus size={18} /> },
                  { value: "gain", label: "Build", icon: <TrendingUp size={18} /> },
                ] as { value: GoalType; label: string; icon: ReactNode }[]
              ).map((g) => (
                <button
                  key={g.value}
                  onClick={() => {
                    set("goal", g.value);
                    set(
                      "targetWeightKg",
                      g.value === "lose"
                        ? Math.max(40, round(form.weightKg - 5, 1))
                        : g.value === "gain"
                          ? round(form.weightKg + 3, 1)
                          : form.weightKg,
                    );
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border py-4 transition-colors ${
                    form.goal === g.value
                      ? "border-lime-400/50 bg-lime-400/[0.08] text-lime-300"
                      : "border-white/10 bg-ink-900/60 text-mist-300 hover:border-white/20"
                  }`}
                >
                  {g.icon}
                  <span className="text-[12.5px] font-medium">{g.label}</span>
                </button>
              ))}
            </div>

            {form.goal !== "maintain" && (
              <div className="mt-5">
                <span className="label">Pace</span>
                <Segment
                  options={[
                    { value: "0.25", label: "Gentle" },
                    { value: "0.5", label: "Steady" },
                    { value: "0.75", label: form.goal === "lose" ? "Fast" : "Aggressive" },
                  ]}
                  value={String(form.rateKgPerWeek)}
                  onChange={(v) => set("rateKgPerWeek", Number(v))}
                />
                <p className="mt-2 text-[11.5px] text-mist-500">
                  {form.rateKgPerWeek} kg / week · about{" "}
                  {Math.round((form.rateKgPerWeek * 7700) / 7)} kcal {form.goal === "lose" ? "deficit" : "surplus"} per day
                </p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Field
                label="Target weight"
                type="number"
                inputMode="decimal"
                value={weightValue(form.targetWeightKg, units)}
                onChange={(e) => set("targetWeightKg", round(toKg(Number(e.target.value), units), 1))}
                suffix={units === "metric" ? "kg" : "lb"}
              />
              <div>
                <span className="label">Daily plan</span>
                <div className="flex h-[46px] items-center justify-center gap-1.5 rounded-xl border border-lime-400/30 bg-lime-400/[0.07]">
                  <Flame size={15} className="text-lime-400" />
                  <span className="num text-[15px] font-semibold text-lime-300">
                    {targets.calories.toLocaleString()} kcal
                  </span>
                </div>
              </div>
            </div>

            <div className="card mt-4 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="section-title">Your macro split</p>
                <span className="text-[11px] text-mist-500">BMR {targets.bmr} · TDEE {targets.tdee}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Protein", value: targets.protein, color: "#7dd3fc" },
                  { label: "Carbs", value: targets.carbs, color: "#fbbf24" },
                  { label: "Fat", value: targets.fat, color: "#f472b6" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-white/[0.03] py-2">
                    <p className="num text-[17px] font-semibold" style={{ color: m.color }}>
                      {m.value}g
                    </p>
                    <p className="text-[10.5px] text-mist-500">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-ink-950 via-ink-950/90 to-transparent pt-4 pb-2">
        <Button size="lg" className="w-full" onClick={next} disabled={!valid}>
          {step === 4 ? (
            <>
              Start tracking <Check size={17} />
            </>
          ) : (
            <>
              Continue <ArrowRight size={17} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
