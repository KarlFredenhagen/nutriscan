import { useEffect, useMemo, useState } from "react";
import { Flame, Plus, Trash2 } from "lucide-react";
import { EXERCISE_PRESETS, exerciseCalories } from "../lib/nutrition";
import { fmt } from "../lib/format";
import { useStore } from "../store";
import { Button, NumberStepper, Sheet } from "./ui";

export function ExerciseSheet({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
}) {
  const { data, addExercise, removeExercise, notify } = useStore();
  const todays = data.exercises.filter((e) => e.date === date);
  const [preset, setPreset] = useState(EXERCISE_PRESETS[0]);
  const [minutes, setMinutes] = useState(30);
  const [customName, setCustomName] = useState("");
  const weightKg = data.profile?.weightKg ?? 70;

  useEffect(() => {
    if (open) {
      setPreset(EXERCISE_PRESETS[0]);
      setMinutes(30);
      setCustomName("");
    }
  }, [open]);

  const kcal = useMemo(
    () => exerciseCalories(preset.met, weightKg, minutes),
    [preset.met, weightKg, minutes],
  );

  const add = () => {
    if (minutes < 1) return;
    addExercise({
      date,
      name: customName.trim() || preset.name,
      minutes,
      calories: kcal,
    });
    notify(`${customName.trim() || preset.name} added · +${kcal} kcal`, "success");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Log a workout" subtitle="Adds calories back to today's budget.">
      <div>
        <span className="label">Activity</span>
        <div className="flex flex-wrap gap-1.5">
          {EXERCISE_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setPreset(p);
                setCustomName("");
              }}
              className={`chip ${preset.name === p.name && !customName ? "chip-active" : ""}`}
            >
              <span aria-hidden>{p.emoji}</span> {p.name}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Or type another activity…"
            className="field"
            maxLength={40}
          />
        </div>

        <div className="mt-4">
          <span className="label">Duration</span>
          <NumberStepper value={minutes} onChange={setMinutes} step={5} min={1} max={480} suffix="min" />
        </div>

        <div className="card mt-4 flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
              <Flame size={17} />
            </span>
            <div>
              <p className="text-[12.5px] font-medium text-mist-200">Estimated burn</p>
              <p className="text-[11px] text-mist-500">
                {preset.name} · {minutes} min · {fmt(weightKg, 0)} kg
              </p>
            </div>
          </div>
          <p className="num text-xl font-semibold text-orange-300">{kcal}</p>
        </div>

        <Button size="lg" className="mt-4 w-full" onClick={add}>
          <Plus size={16} /> Add workout
        </Button>

        {todays.length > 0 && (
          <div className="mt-6">
            <p className="section-title mb-2">Logged on this day</p>
            <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
              {todays.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-mist-200">{e.name}</p>
                    <p className="text-[11px] text-mist-500">{e.minutes} min</p>
                  </div>
                  <span className="num text-[12.5px] text-orange-300">+{e.calories} kcal</span>
                  <button
                    onClick={() => removeExercise(e.id)}
                    className="text-mist-500 hover:text-red-400"
                    aria-label="Delete workout"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
