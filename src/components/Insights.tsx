import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  Droplets,
  Flame,
  Plus,
  Scale,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useStore } from "../store";
import { lastNDays, parseKey, shortDate, shiftKey, todayKey, weekdayLetter } from "../lib/date";
import { fmt, signed, weightDisplay } from "../lib/format";
import { sumEntries } from "../lib/nutrition";
import { Button, MacroBar, Segment, Stat } from "./ui";
import { WeightSheet } from "./WeightSheet";

export function Insights({ onOpenFasting }: { onOpenFasting: () => void }) {
  const { data, targets } = useStore();
  const [range, setRange] = useState("7");
  const [weightOpen, setWeightOpen] = useState(false);
  const days = useMemo(() => lastNDays(Number(range)), [range]);

  const daily = useMemo(
    () =>
      days.map((date) => {
        const entries = data.entries.filter((e) => e.date === date);
        const totals = sumEntries(entries);
        return {
          date,
          totals,
          logged: entries.length > 0,
          water: data.water[date] ?? 0,
          exercise: data.exercises
            .filter((e) => e.date === date)
            .reduce((s, e) => s + e.calories, 0),
        };
      }),
    [days, data.entries, data.water, data.exercises],
  );

  const loggedDays = daily.filter((d) => d.logged);
  const avg = loggedDays.length
    ? loggedDays.reduce(
        (acc, d) => ({
          calories: acc.calories + d.totals.calories,
          protein: acc.protein + d.totals.protein,
          carbs: acc.carbs + d.totals.carbs,
          fat: acc.fat + d.totals.fat,
          water: acc.water + d.water,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 },
      )
    : null;
  const n = loggedDays.length || 1;
  const avgCalories = (avg?.calories ?? 0) / n;
  const avgWater = (avg?.water ?? 0) / n;

  const streak = useMemo(() => {
    let cursor = todayKey();
    const has = (d: string) => data.entries.some((e) => e.date === d);
    if (!has(cursor)) cursor = shiftKey(cursor, -1);
    let count = 0;
    while (has(cursor) && count < 3650) {
      count += 1;
      cursor = shiftKey(cursor, -1);
    }
    return count;
  }, [data.entries]);

  const weightSeries = useMemo(
    () => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)),
    [data.weights],
  );
  const firstWeight = weightSeries[0];
  const latestWeight = weightSeries[weightSeries.length - 1];
  const weightDelta = firstWeight && latestWeight ? latestWeight.kg - firstWeight.kg : 0;
  const units = data.profile?.units ?? "metric";
  const target = targets?.calories ?? 2000;

  const chartMax = Math.max(target, ...daily.map((d) => d.totals.calories)) * 1.08;
  const targetPct = Math.min(96, (target / chartMax) * 100);

  const fastingSessions = data.fasting.sessions.filter(
    (s) => s.start >= parseKey(days[0]).getTime(),
  );
  const fastingComplete = fastingSessions.filter(
    (s) => (s.end - s.start) / 3600_000 >= s.goalHours,
  ).length;

  const tips: { icon: ReactNode; text: string }[] = [];
  if (loggedDays.length < Math.min(3, Number(range))) {
    tips.push({
      icon: <CalendarCheck size={14} />,
      text: `Log at least 3 days in this range for meaningful averages. You're at ${loggedDays.length}.`,
    });
  }
  if (targets && loggedDays.length >= 3) {
    if (avgCalories > target + 200) {
      tips.push({
        icon: <TrendingUp size={14} />,
        text: `You're averaging ${Math.round(avgCalories - target)} kcal above your ${target} kcal target. Smaller portions or one fewer snack closes the gap.`,
      });
    } else if (avgCalories < target - 350) {
      tips.push({
        icon: <TrendingDown size={14} />,
        text: `Intake is averaging ${Math.round(target - avgCalories)} kcal under target — that's a steep deficit and can cost you energy and muscle.`,
      });
    }
    const proteinPct = (avg?.protein ?? 0) / n / targets.protein;
    if (proteinPct < 0.8) {
      tips.push({
        icon: <Flame size={14} />,
        text: `Protein is at ${Math.round(proteinPct * 100)}% of target. Add a protein-rich breakfast or a shake to stay fuller.`,
      });
    }
    if (avgWater < data.settings.waterGoalMl * 0.6) {
      tips.push({
        icon: <Droplets size={14} />,
        text: `Hydration averages ${(avgWater / 1000).toFixed(1)} L — under 60% of your goal. Keep a bottle in sight.`,
      });
    }
  }
  if (latestWeight && firstWeight && weightSeries.length >= 2 && data.profile) {
    const weeks = Math.max(
      1,
      (new Date(latestWeight.date).getTime() - new Date(firstWeight.date).getTime()) / (7 * 86_400_000),
    );
    const perWeek = weightDelta / weeks;
    const goalSign = data.profile.goal === "lose" ? -1 : data.profile.goal === "gain" ? 1 : 0;
    if (goalSign !== 0 && Math.sign(perWeek) !== goalSign && Math.abs(perWeek) > 0.1) {
      tips.push({
        icon: <Scale size={14} />,
        text: `Weight is trending ${perWeek > 0 ? "up" : "down"} ${Math.abs(perWeek).toFixed(2)} kg/week, against your goal. Targets may need a tweak.`,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Insights</h1>
          <p className="mt-0.5 text-[12px] text-mist-500">Patterns from your diary, not guesses.</p>
        </div>
        <Segment
          className="w-[150px]"
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      <section className="card grid grid-cols-3 gap-2 p-4">
        <Stat
          label="Avg intake"
          value={
            <>
              {fmt(avgCalories)}
              <span className="ml-1 text-[10px] font-normal text-mist-500">kcal</span>
            </>
          }
          hint={`${loggedDays.length}/${range} days logged`}
        />
        <Stat
          label="Streak"
          value={
            <span className="inline-flex items-center gap-1.5">
              {streak} <Flame size={15} className="text-orange-400" />
            </span>
          }
          hint={streak === 1 ? "day in a row" : "days in a row"}
        />
        <Stat
          label="Net balance"
          value={
            <span className={avgCalories > target ? "text-amber-300" : "text-lime-300"}>
              {loggedDays.length ? signed(target - avgCalories) : "—"}
            </span>
          }
          hint="kcal vs goal / day"
        />
      </section>

      <section className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="section-title">Calories</p>
            <p className="mt-0.5 text-[11px] text-mist-500">
              Goal {fmt(target)} kcal · bars are daily totals
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[10.5px] text-mist-500">
            <span className="h-2 w-2 rounded-full bg-lime-400" /> on target
          </span>
        </div>

        <div className="relative h-[132px]">
          <div
            className="absolute inset-x-0 border-t border-dashed border-lime-400/40"
            style={{ bottom: `${targetPct}%` }}
          >
            <span className="absolute -top-2 right-0 rounded bg-ink-850 px-1 text-[9px] text-lime-400/80">
              goal
            </span>
          </div>
          <div className="flex h-full items-end gap-[3px]">
            {daily.map((d) => {
              const h = (d.totals.calories / chartMax) * 100;
              const ratio = d.totals.calories / target;
              const color = !d.logged
                ? "rgba(255,255,255,0.05)"
                : ratio > 1.1
                  ? "#fb923c"
                  : ratio > 0.8
                    ? "#d3ff4f"
                    : "#6b7688";
              return (
                <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-[3px] transition-all group-hover:opacity-80"
                    style={{
                      height: `${Math.max(h, d.logged ? 2 : 1)}%`,
                      background: color,
                    }}
                    title={`${shortDate(d.date)} · ${Math.round(d.totals.calories)} kcal`}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex gap-[3px]">
          {daily.map((d) => (
            <div key={d.date} className="flex-1 text-center text-[9px] text-mist-500">
              {Number(range) <= 7
                ? weekdayLetter(d.date)
                : Number(d.date.slice(8)) % 5 === 1
                  ? d.date.slice(8)
                  : ""}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="section-title">Average macros</p>
          <span className="text-[10.5px] text-mist-500">
            {loggedDays.length ? `${loggedDays.length} logged days` : "no data yet"}
          </span>
        </div>
        <div className="space-y-3">
          <MacroBar
            label="Protein"
            value={(avg?.protein ?? 0) / n}
            target={targets?.protein ?? 0}
            color="#7dd3fc"
          />
          <MacroBar label="Carbs" value={(avg?.carbs ?? 0) / n} target={targets?.carbs ?? 0} color="#fbbf24" />
          <MacroBar label="Fat" value={(avg?.fat ?? 0) / n} target={targets?.fat ?? 0} color="#f472b6" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-2 text-[11.5px] text-mist-400">
            <Droplets size={14} className="text-water" />
            {(avgWater / 1000).toFixed(1)} L water / day
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-mist-400">
            <Timer size={14} className="text-fast" />
            {fastingSessions.length} fasts · {fastingComplete} completed
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="section-title">Weight trend</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="num text-[22px] font-semibold text-white">
                {latestWeight ? weightDisplay(latestWeight.kg, units) : "—"}
              </span>
              {weightSeries.length >= 2 && (
                <span
                  className={`num rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    (data.profile?.goal === "lose" && weightDelta < 0) ||
                    (data.profile?.goal === "gain" && weightDelta > 0)
                      ? "bg-lime-400/10 text-lime-300"
                      : "bg-white/[0.05] text-mist-300"
                  }`}
                >
                  {signed(weightDelta, 1)} kg
                </span>
              )}
            </div>
            {data.profile && (
              <p className="mt-0.5 text-[11px] text-mist-500">
                Goal {weightDisplay(data.profile.targetWeightKg, units)}
              </p>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setWeightOpen(true)}>
            <Plus size={13} /> Weigh in
          </Button>
        </div>

        {weightSeries.length >= 2 ? (
          <WeightChart
            points={weightSeries.map((w) => ({ date: w.date, kg: w.kg }))}
            goal={data.profile?.targetWeightKg}
            units={units}
          />
        ) : (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-white/10 py-6 text-center">
            <Scale size={18} className="mb-2 text-mist-500" />
            <p className="text-[12px] text-mist-300">Two weigh-ins unlock your trend</p>
            <p className="mt-0.5 text-[11px] text-mist-500">One number never tells the story.</p>
          </div>
        )}
        {latestWeight && (
          <p className="mt-2 text-right text-[10px] text-mist-500">
            Last weigh-in {shortDate(latestWeight.date)}
          </p>
        )}
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <Sparkles size={14} className="text-lime-400" />
          <p className="section-title">Coaching notes</p>
        </div>
        {tips.length === 0 ? (
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-lime-300">
              <Trophy size={16} />
            </span>
            <p className="text-[12px] leading-relaxed text-mist-300">
              Nothing stands out — intake, protein and hydration are tracking close to plan. Keep
              logging consistently and this page gets sharper.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tips.slice(0, 3).map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-mist-300">
                  {tip.icon}
                </span>
                <p className="text-[12px] leading-relaxed text-mist-300">{tip.text}</p>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={onOpenFasting}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-left"
        >
          <span className="inline-flex items-center gap-2 text-[11.5px] text-mist-300">
            <Timer size={13} className="text-fast" /> Fasting history
          </span>
          <span className="text-[11px] text-mist-500">
            {data.fasting.goalHours}:{(24 - data.fasting.goalHours) || 0} plan
          </span>
        </button>
      </section>

      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
    </div>
  );
}

function WeightChart({
  points,
  goal,
  units,
}: {
  points: { date: string; kg: number }[];
  goal?: number;
  units: "metric" | "imperial";
}) {
  const W = 340;
  const H = 110;
  const pad = 6;
  const values = points.map((p) => (units === "imperial" ? p.kg * 2.2046226218 : p.kg));
  const goalValue = goal ? (units === "imperial" ? goal * 2.2046226218 : goal) : undefined;
  const all = goalValue ? [...values, goalValue] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(0.8, max - min);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2);

  const line = points.map((_, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
  const delta = values[values.length - 1] - values[0];

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d3ff4f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#d3ff4f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {goalValue !== undefined && (
          <>
            <line
              x1={pad}
              x2={W - pad}
              y1={y(goalValue)}
              y2={y(goalValue)}
              stroke="#7dd3fc"
              strokeDasharray="4 4"
              strokeOpacity="0.5"
              strokeWidth="1"
            />
            <text x={W - pad} y={y(goalValue) - 4} textAnchor="end" fontSize="7" fill="#7dd3fc" opacity="0.8">
              goal
            </text>
          </>
        )}
        <path d={area} fill="url(#weightFill)" />
        <path d={line} fill="none" stroke="#d3ff4f" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(values[i])}
            r={i === points.length - 1 ? 3.5 : 2}
            fill={i === points.length - 1 ? "#d3ff4f" : "#0b0d12"}
            stroke="#d3ff4f"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9.5px] text-mist-500">
        <span>{shortDate(points[0].date)}</span>
        <span className={delta === 0 ? "" : delta < 0 ? "text-lime-400/80" : "text-amber-400/80"}>
          {signed(delta, 1)} {units === "imperial" ? "lb" : "kg"} total
        </span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}
