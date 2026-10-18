import { useEffect, useState } from "react";
import { Plus, Scale, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { round, toKg, weightDisplay, weightValue } from "../lib/format";
import { shortDate, todayKey } from "../lib/date";
import { Button, Field, Sheet } from "./ui";

export function WeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, logWeight, removeWeight, notify } = useStore();
  const units = data.profile?.units ?? "metric";
  const [value, setValue] = useState(70);
  const [date, setDate] = useState(todayKey());

  useEffect(() => {
    if (open) {
      setValue(weightValue(data.profile?.weightKg ?? 70, units));
      setDate(todayKey());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const kg = toKg(value, units);
    if (!Number.isFinite(kg) || kg < 25 || kg > 400) {
      notify("Enter a weight between 25 and 400 kg.", "error");
      return;
    }
    logWeight(round(kg, 1), date);
    notify(`Weight saved · ${weightDisplay(kg, units)}`, "success");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Log weight" subtitle="Weigh in at the same time of day for the cleanest trend.">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={`Weight (${units === "metric" ? "kg" : "lb"})`}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          suffix={units === "metric" ? "kg" : "lb"}
        />
        <Field
          label="Date"
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => setDate(e.target.value || todayKey())}
        />
      </div>

      <Button size="lg" className="mt-4 w-full" onClick={submit}>
        <Plus size={16} /> Save weigh-in
      </Button>

      <div className="mt-6">
        <p className="section-title mb-2">Recent weigh-ins</p>
        {data.weights.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-white/[0.06] py-7 text-center">
            <Scale size={18} className="mb-2 text-mist-500" />
            <p className="text-[12.5px] text-mist-400">No weigh-ins yet</p>
            <p className="text-[11px] text-mist-500">Trends appear after your first entry.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
            {data.weights.slice(0, 10).map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="num text-[13px] text-mist-200">{weightDisplay(w.kg, units)}</p>
                  <p className="text-[10.5px] text-mist-500">
                    {shortDate(w.date)}
                    {w.date === todayKey() ? " · today" : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeWeight(w.id)}
                  className="text-mist-500 hover:text-red-400"
                  aria-label="Delete weigh-in"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
