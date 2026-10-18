import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Download,
  Droplets,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Footprints,
  KeyRound,
  Pencil,
  Ruler,
  Scale,
  Shield,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import type { ActivityLevel, GoalType, UnitSystem } from "../types";
import { ACTIVITY_LEVELS, bmi, bmiLabel, targetsFor } from "../lib/nutrition";
import { fmt, round, signed, toKg, weightDisplay, weightValue } from "../lib/format";
import { shortDate, todayKey } from "../lib/date";
import { GeminiError, MODEL_OPTIONS, testConnection } from "../lib/gemini";
import { useInstallPrompt } from "../lib/install";
import { useStore } from "../store";
import { Button, Field, NumberStepper, Segment, Select, Sheet } from "./ui";
import { WeightSheet } from "./WeightSheet";

export function Profile() {
  const { data, targets, updateSettings, updateProfile, notify, importData, resetAll } = useStore();
  const profile = data.profile!;
  const units = profile.units;

  const [keyInput, setKeyInput] = useState(data.settings.geminiKey);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const install = useInstallPrompt();

  const latestWeight = data.weights[0]?.kg ?? profile.weightKg;
  const startWeight = data.weights[data.weights.length - 1]?.kg ?? profile.weightKg;
  const delta = latestWeight - startWeight;
const bmiValue = bmi(latestWeight, profile.heightCm);

/** Short BMI band names so the stat labels never truncate in the 4-up grid. */
const bmiShort = (value: number) =>
  value < 18.5 ? "Under" : value < 25 ? "Healthy" : value < 30 ? "Over" : "Obese";

  useEffect(() => {
    setKeyInput(data.settings.geminiKey);
  }, [data.settings.geminiKey]);

  const saveAndTest = async () => {
    const key = keyInput.trim();
    updateSettings({ geminiKey: key });
    if (!key) {
      setTestResult({ ok: false, text: "Paste a key first." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const used = await testConnection(key, data.settings.model);
      setTestResult({ ok: true, text: `Connected. ${used} answered successfully.` });
      notify("Gemini connected", "success");
    } catch (err) {
      setTestResult({
        ok: false,
        text: err instanceof GeminiError ? err.message : "Couldn't reach Gemini.",
      });
    } finally {
      setTesting(false);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nutriscan-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify("Backup downloaded", "success");
  };

  const onImport = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result ?? ""));
      notify(ok ? "Backup restored" : "That file isn't a NutriScan backup", ok ? "success" : "error");
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <section className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -top-20 -right-14 h-52 w-52 rounded-full bg-lime-400/[0.08] blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 text-[22px] font-semibold text-ink-950">
            {(profile.name || "You").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-semibold text-white">{profile.name || "Your profile"}</h1>
            <p className="mt-0.5 text-[12px] text-mist-400">
              {profile.goal === "lose"
                ? `Losing ${profile.rateKgPerWeek} kg / week`
                : profile.goal === "gain"
                  ? `Gaining ${profile.rateKgPerWeek} kg / week`
                  : "Maintaining weight"}{" "}
              · {profile.age} yrs
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-mist-300">
            {units === "metric" ? "METRIC" : "IMPERIAL"}
          </span>
        </div>

        <div className="relative mt-5 grid grid-cols-4 gap-2">
          {[
            {
              label: "Weight",
              value: fmt(weightValue(latestWeight, units), 1),
              unit: units === "metric" ? "kg" : "lb",
            },
            {
              label: "Height",
              value:
                units === "metric"
                  ? fmt(profile.heightCm, 0)
                  : `${Math.floor(profile.heightCm / 30.48)}'${Math.round(profile.heightCm / 2.54) % 12}"`,
              unit: units === "metric" ? "cm" : "",
            },
            { label: bmiShort(bmiValue), value: bmiValue.toFixed(1), unit: "" },
            {
              label: "Goal",
              value: fmt(weightValue(profile.targetWeightKg, units), 1),
              unit: units === "metric" ? "kg" : "lb",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/[0.03] px-2 py-2.5 text-center">
              <p className="num truncate text-[14px] font-semibold text-white">
                {s.value}
                {s.unit && <span className="ml-0.5 text-[9px] font-normal text-mist-500">{s.unit}</span>}
              </p>
              <p className="mt-0.5 truncate text-[9px] tracking-wide text-mist-500 uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-lime-300">
              <Target size={15} />
            </span>
            <div>
              <p className="text-[13px] font-medium text-mist-100">Daily targets</p>
              <p className="text-[10.5px] text-mist-500">
                BMR {fmt(targets?.bmr ?? 0)} · maintenance {fmt(targets?.tdee ?? 0)} kcal
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setPlanOpen(true)}>
            <Pencil size={12} /> Edit plan
          </Button>
        </div>

        <div className="mt-4 flex items-end justify-between rounded-xl bg-white/[0.03] p-3.5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-mist-500 uppercase">Calories</p>
            <p className="num mt-1 text-[26px] leading-none font-semibold text-lime-300">
              {fmt(targets?.calories ?? 0)}
              <span className="ml-1 text-[11px] font-normal text-mist-500">kcal</span>
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-[10.5px] text-mist-400">
            <Flame size={12} className="text-lime-400" />
            {profile.goal === "maintain" ? "maintenance" : `${profile.rateKgPerWeek} kg/week pace`}
          </p>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-2">
          {[
            { label: "Protein", value: targets?.protein ?? 0, color: "#7dd3fc" },
            { label: "Carbs", value: targets?.carbs ?? 0, color: "#fbbf24" },
            { label: "Fat", value: targets?.fat ?? 0, color: "#f472b6" },
            { label: "Fiber", value: targets?.fiber ?? 0, color: "#a3e635" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg bg-white/[0.02] py-2 text-center">
              <p className="num text-[14px] font-semibold" style={{ color: m.color }}>
                {m.value}g
              </p>
              <p className="text-[9px] text-mist-500">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-mist-300">
              <Scale size={15} />
            </span>
            <div>
              <p className="text-[13px] font-medium text-mist-100">Weight</p>
              <p className="text-[10.5px] text-mist-500">
                {latestWeight ? weightDisplay(latestWeight, units) : "—"}
                {data.weights.length > 0 ? ` · ${shortDate(data.weights[0].date)}` : " · not logged"}
                {delta !== 0 ? ` · ${signed(delta, 1)} kg` : ""}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setWeightOpen(true)}>
            Weigh in
          </Button>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-lime-300">
              <Sparkles size={15} />
            </span>
            <div>
              <p className="text-[13px] font-medium text-mist-100">Gemini AI</p>
              <p className="text-[10.5px] text-mist-500">
                {data.settings.geminiKey ? "API key saved on this device" : "Add a key to enable AI tracking"}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-semibold ${
              data.settings.geminiKey
                ? "bg-lime-400/10 text-lime-300"
                : "bg-white/[0.05] text-mist-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${data.settings.geminiKey ? "bg-lime-400" : "bg-mist-500"}`}
            />
            {data.settings.geminiKey ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>

        <div className="mt-4">
          <label className="block">
            <span className="label">API key</span>
            <div className="relative">
              <KeyRound size={14} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-mist-500" />
              <input
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                className="field pr-10 pl-9 font-mono text-[12.5px]"
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-mist-500 hover:text-white"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void saveAndTest()} disabled={testing}>
              {testing ? "Testing…" : "Save & test"}
            </Button>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-lime-300 hover:text-lime-200"
            >
              Get a free key <ExternalLink size={11} />
            </a>
          </div>

          {testResult && (
            <div
              className={`mt-2.5 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed ${
                testResult.ok
                  ? "border-lime-400/25 bg-lime-400/[0.06] text-lime-200"
                  : "border-red-500/25 bg-red-500/[0.06] text-red-200"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
              )}
              {testResult.text}
            </div>
          )}

          <div className="mt-4">
            <span className="label">Model</span>
            <Select
              value={data.settings.model}
              onChange={(e) => {
                updateSettings({ model: e.target.value });
                setTestResult(null);
              }}
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-[10.5px] leading-relaxed text-mist-500">
              {MODEL_OPTIONS.find((m) => m.id === data.settings.model)?.hint ?? "Custom model"}. If a
              model isn't enabled for your key, NutriScan automatically falls back to the next
              available one.
            </p>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <Shield size={14} className="mt-0.5 shrink-0 text-mist-400" />
            <p className="text-[10.5px] leading-relaxed text-mist-500">
              Your key is stored in this browser's local storage and sent only to Google's Gemini API.
              Photos and text are used solely for nutrition estimates. Clear the key anytime.
            </p>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <p className="section-title mb-3">Preferences</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[12.5px] text-mist-200">
              <Ruler size={14} className="text-mist-400" /> Units
            </div>
            <Segment
              className="w-[170px]"
              options={[
                { value: "metric", label: "Metric" },
                { value: "imperial", label: "Imperial" },
              ]}
              value={units}
              onChange={(v) => updateProfile({ units: v as UnitSystem })}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12.5px] text-mist-200">
                <Droplets size={14} className="text-water" /> Water goal
              </span>
              <span className="num text-[12px] text-mist-400">{fmt(data.settings.waterGoalMl)} ml</span>
            </div>
            <NumberStepper
              value={data.settings.waterGoalMl}
              onChange={(v) => updateSettings({ waterGoalMl: v })}
              step={250}
              min={500}
              max={6000}
              suffix="ml"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12.5px] text-mist-200">
                <Footprints size={14} className="text-mist-400" /> Step goal
              </span>
              <span className="num text-[12px] text-mist-400">{fmt(data.settings.stepGoal)}</span>
            </div>
            <NumberStepper
              value={data.settings.stepGoal}
              onChange={(v) => updateSettings({ stepGoal: v })}
              step={500}
              min={1000}
              max={30000}
              suffix="steps"
            />
          </div>
        </div>
      </section>

      <section className="card p-4">
        <p className="section-title mb-3">Install app</p>
        {install.installed ? (
          <div className="flex items-start gap-2 rounded-xl border border-lime-400/20 bg-lime-400/[0.06] p-3">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-lime-300" />
            <p className="text-[10.5px] leading-relaxed text-mist-300">
              Running as an installed app. The diary opens offline and the launcher icon goes straight
              to today.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] leading-relaxed text-mist-500">
              Add NutriScan to your home screen for a full-screen app with an offline diary. Your data
              stays right here — an installed app keeps it separate from clearing your browser data.
            </p>
            {install.canInstall ? (
              <Button
                className="mt-3 w-full"
                onClick={async () => {
                  const outcome = await install.install();
                  if (outcome === "accepted") notify("NutriScan installed", "success");
                }}
              >
                <Smartphone size={14} /> Install app
              </Button>
            ) : install.ios ? (
              <div className="mt-3 space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[10.5px] leading-relaxed text-mist-400">
                <p className="font-semibold text-mist-200">On iPhone or iPad</p>
                <p>
                  Open this page in Safari, tap <span className="text-white">Share</span> →{" "}
                  <span className="text-white">Add to Home Screen</span>, then tap Add.
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[10.5px] leading-relaxed text-mist-400">
                Open the browser menu and choose <span className="text-white">Install app</span> or
                {" "}
                <span className="text-white">Add to Home Screen</span>.
              </div>
            )}
          </>
        )}
      </section>

      <section className="card p-4">
        <p className="section-title mb-3">Data & privacy</p>
        <p className="text-[11px] leading-relaxed text-mist-500">
          Your diary, weights and settings live in this browser only — no account, no server. Export
          a backup before clearing site data or switching devices.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={exportData}>
            <Download size={14} /> Export
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            onImport(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => setResetOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-red-400/80 hover:text-red-300"
        >
          <Trash2 size={12} /> Reset all data
        </button>
      </section>

      <div className="flex items-center justify-center gap-2 pt-2 pb-4 text-[10.5px] text-mist-500">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-lime-400 text-ink-950">
          <Sparkles size={11} />
        </span>
        NutriScan · local-first nutrition tracker · v1.0
      </div>

      <Sheet open={planOpen} onClose={() => setPlanOpen(false)} title="Edit your plan" subtitle="Targets update instantly.">
        <PlanForm onDone={() => setPlanOpen(false)} />
      </Sheet>

      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all data?">
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4">
          <p className="text-[12.5px] leading-relaxed text-red-200/90">
            This deletes your profile, diary, weight history, fasting sessions and settings from this
            browser. It cannot be undone unless you exported a backup.
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              resetAll();
              setResetOpen(false);
              notify("All data cleared");
            }}
          >
            Delete everything
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function PlanForm({ onDone }: { onDone: () => void }) {
  const { data, updateProfile, logWeight, notify } = useStore();
  const profile = data.profile!;
  const units = profile.units;
  const [form, setForm] = useState({
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activity: profile.activity,
    goal: profile.goal,
    rateKgPerWeek: profile.rateKgPerWeek,
    targetWeightKg: profile.targetWeightKg,
  });

  const preview = targetsFor({
    ...profile,
    ...form,
    rateKgPerWeek: form.goal === "maintain" ? 0 : form.rateKgPerWeek,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Age"
          type="number"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
          suffix="yrs"
        />
        <Field
          label="Height"
          type="number"
          value={Math.round(form.heightCm)}
          onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) })}
          suffix="cm"
        />
        <Field
          label="Weight"
          type="number"
          value={weightValue(form.weightKg, units)}
          onChange={(e) => setForm({ ...form, weightKg: round(toKg(Number(e.target.value), units), 1) })}
          suffix={units === "metric" ? "kg" : "lb"}
        />
      </div>

      <div>
        <span className="label">Activity level</span>
        <Select
          value={form.activity}
          onChange={(e) => setForm({ ...form, activity: e.target.value as ActivityLevel })}
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label} — {a.hint}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <span className="label">Goal</span>
        <Segment
          options={[
            { value: "lose", label: "Lose" },
            { value: "maintain", label: "Maintain" },
            { value: "gain", label: "Gain" },
          ]}
          value={form.goal}
          onChange={(v) => setForm({ ...form, goal: v as GoalType })}
        />
      </div>

      {form.goal !== "maintain" && (
        <div>
          <span className="label">Weekly pace</span>
          <Select
            value={String(form.rateKgPerWeek)}
            onChange={(e) => setForm({ ...form, rateKgPerWeek: Number(e.target.value) })}
          >
            {[0.25, 0.5, 0.75, 1].map((r) => (
              <option key={r} value={r}>
                {r} kg / week
              </option>
            ))}
          </Select>
        </div>
      )}

      <Field
        label="Target weight"
        type="number"
        value={weightValue(form.targetWeightKg, units)}
        onChange={(e) => setForm({ ...form, targetWeightKg: round(toKg(Number(e.target.value), units), 1) })}
        suffix={units === "metric" ? "kg" : "lb"}
      />

      <div className="flex items-center justify-between rounded-xl border border-lime-400/20 bg-lime-400/[0.05] px-3.5 py-3">
        <span className="flex items-center gap-2 text-[12px] text-mist-200">
          <Activity size={14} className="text-lime-400" /> New daily target
        </span>
        <span className="num text-[15px] font-semibold text-lime-300">{fmt(preview.calories)} kcal</span>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={() => {
          const changedWeight = Math.abs(form.weightKg - profile.weightKg) > 0.05;
          updateProfile({
            age: form.age,
            heightCm: form.heightCm,
            weightKg: form.weightKg,
            activity: form.activity,
            goal: form.goal,
            rateKgPerWeek: form.goal === "maintain" ? 0 : form.rateKgPerWeek,
            targetWeightKg: form.targetWeightKg,
          });
          if (changedWeight) logWeight(form.weightKg, todayKey());
          notify("Plan updated", "success");
          onDone();
        }}
      >
        Save plan
      </Button>

      <p className="text-center text-[10.5px] text-mist-500">
        BMI {bmi(form.weightKg, form.heightCm).toFixed(1)} · {bmiLabel(bmi(form.weightKg, form.heightCm)).label}
      </p>
    </div>
  );
}
