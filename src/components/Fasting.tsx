import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Flame, Play, Square, Timer, TrendingUp, X } from "lucide-react";
import { useStore } from "../store";
import { clock, dateKey, shortDate, shiftKey, timeOfDay, todayKey } from "../lib/date";
import { fmt } from "../lib/format";
import { Button, EmptyState, Ring, Stat } from "./ui";

const PLANS = [
  { hours: 14, label: "14:10", hint: "Gentle" },
  { hours: 16, label: "16:8", hint: "Classic" },
  { hours: 18, label: "18:6", hint: "Advanced" },
  { hours: 20, label: "20:4", hint: "Warrior" },
];

const STAGES = [
  { h: 0, title: "Digesting", body: "Insulin is up and your body is using the last meal for energy." },
  { h: 4, title: "Fat burning begins", body: "Glycogen drops, so your body starts tapping stored fat." },
  { h: 12, title: "Ketosis", body: "Fat-derived ketones become a main fuel source. Focus often sharpens." },
  { h: 18, title: "Deep fast", body: "Autophagy and repair processes ramp up. Longer isn't always better." },
];

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

function duration(ms: number): string {
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function Fasting() {
  const { data, startFast, stopFast, cancelFast, setFastingGoal, notify } = useStore();
  const { fasting } = data;
  const active = fasting.activeStart !== null;
  const now = useNow(active);
  const goalMs = fasting.goalHours * 3600_000;
  const elapsed = active ? now - (fasting.activeStart ?? now) : 0;
  const remainingMs = Math.max(0, goalMs - elapsed);
  const progress = active ? elapsed / goalMs : 0;
  const done = active && elapsed >= goalMs;

  const stats = useMemo(() => {
    const sessions = fasting.sessions;
    const weekAgo = Date.now() - 7 * 86_400_000;
    const week = sessions.filter((s) => s.start >= weekAgo);
    const completed = sessions.filter((s) => (s.end - s.start) / 3600_000 >= s.goalHours);
    const avg = sessions.length
      ? sessions.reduce((sum, s) => sum + (s.end - s.start), 0) / sessions.length
      : 0;
    return {
      total: sessions.length,
      week: week.length,
      completed: completed.length,
      avg,
      best: sessions.reduce((max, s) => Math.max(max, s.end - s.start), 0),
      streak: (() => {
        // consecutive days with a completed fast, starting from today/yesterday
        const days = new Set(completed.map((s) => dateKey(new Date(s.end))));
        let cursor = todayKey();
        if (!days.has(cursor)) cursor = shiftKey(cursor, -1);
        let count = 0;
        while (days.has(cursor) && count < 3650) {
          count += 1;
          cursor = shiftKey(cursor, -1);
        }
        return count;
      })(),
    };
  }, [fasting.sessions]);

  const currentStage = [...STAGES].reverse().find((s) => elapsed >= s.h * 3600_000) ?? STAGES[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Fasting</h1>
        <p className="mt-0.5 text-[12px] text-mist-500">
          Time-restricted eating, tracked to the second.
        </p>
      </div>

      <section className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-fast/[0.12] blur-3xl" />
        <div className="relative flex items-center justify-between">
          <p className="section-title">Fasting window</p>
          <span
            className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
              active
                ? done
                  ? "bg-lime-400/10 text-lime-300"
                  : "bg-fast/15 text-fast"
                : "bg-white/[0.04] text-mist-400"
            }`}
          >
            {active ? (done ? "Goal reached" : "Fasting") : "Idle"}
          </span>
        </div>

        <div className="relative mt-4 flex flex-col items-center">
          <Ring progress={active ? progress : 0} size={214} stroke={12} color={done ? "#d3ff4f" : "#a78bfa"}>
            {active ? (
              <>
                <span className="num text-[30px] leading-none font-semibold tracking-tight text-white">
                  {clock(elapsed)}
                </span>
                <span className="mt-1.5 text-[10.5px] font-medium tracking-[0.14em] text-mist-500 uppercase">
                  {done ? "past goal" : "remaining " + clock(remainingMs)}
                </span>
                <span className="mt-1 text-[10px] text-mist-500">
                  {timeOfDay(fasting.activeStart ?? now)} → {timeOfDay((fasting.activeStart ?? now) + goalMs)}
                </span>
              </>
            ) : (
              <>
                <span className="num text-[42px] leading-none font-semibold text-white">
                  {fasting.goalHours}
                  <span className="text-[18px] text-mist-400">:{(24 - fasting.goalHours) || 0}</span>
                </span>
                <span className="mt-1.5 text-[10.5px] font-medium tracking-[0.14em] text-mist-500 uppercase">
                  fasting plan
                </span>
                <span className="mt-1 text-[10px] text-mist-500">Start whenever you're ready</span>
              </>
            )}
          </Ring>

          <div className="mt-4 grid w-full grid-cols-4 gap-1.5">
            {PLANS.map((p) => (
              <button
                key={p.hours}
                onClick={() => {
                  setFastingGoal(p.hours);
                  notify(`${p.label} fasting plan selected`);
                }}
                className={`rounded-xl border py-2 text-center transition-colors ${
                  fasting.goalHours === p.hours
                    ? "border-fast/40 bg-fast/10 text-fast"
                    : "border-white/[0.07] bg-white/[0.02] text-mist-400 hover:border-white/15"
                }`}
              >
                <span className="num block text-[12.5px] font-semibold">{p.label}</span>
                <span className="block text-[9.5px] opacity-70">{p.hint}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex w-full gap-2">
            {active ? (
              <>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    cancelFast();
                    notify("Fast discarded");
                  }}
                >
                  <X size={15} /> Discard
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    stopFast();
                    notify(done ? "Fast completed — nice work 🎉" : "Fast saved", "success");
                  }}
                >
                  <Square size={13} /> End fast
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  startFast();
                  notify("Fasting started");
                }}
              >
                <Play size={16} /> Start fasting
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="card grid grid-cols-3 gap-2 p-4">
        <Stat label="Streak" value={`${stats.streak}d`} hint="completed fasts" />
        <Stat label="This week" value={fmt(stats.week)} hint="sessions" />
        <Stat
          label="Avg length"
          value={stats.avg ? duration(stats.avg) : "—"}
          hint={`${stats.completed} goals hit`}
        />
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <Flame size={14} className="text-fast" />
          <p className="section-title">What's happening</p>
        </div>
        <div className="relative space-y-3.5">
          <div className="absolute top-2 bottom-2 left-[7px] w-px bg-white/[0.08]" />
          {STAGES.map((s) => {
            const reached = active && elapsed >= s.h * 3600_000;
            return (
              <div key={s.h} className="relative flex gap-3 pl-0">
                <span
                  className={`relative z-10 mt-1 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border ${
                    reached
                      ? "border-fast bg-fast text-ink-950"
                      : "border-white/15 bg-ink-850 text-transparent"
                  }`}
                >
                  <Check size={8} strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-mist-100">
                    {s.title}
                    <span className="ml-2 text-[10px] font-normal text-mist-500">{s.h}h+</span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-mist-500">{s.body}</p>
                </div>
              </div>
            );
          })}
        </div>
        {active && (
          <div className="mt-3 rounded-lg border border-fast/20 bg-fast/[0.06] px-3 py-2 text-[11px] text-fast">
            You're in: {currentStage.title}
          </div>
        )}
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-mist-400" />
            <p className="section-title">History</p>
          </div>
          <span className="text-[10.5px] text-mist-500">
            {stats.total} session{stats.total === 1 ? "" : "s"}
          </span>
        </div>
        {fasting.sessions.length === 0 ? (
          <EmptyState
            icon={<Timer size={19} />}
            title="No fasts recorded"
            body="Start a fasting window above. Your history and streak build automatically."
          />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {fasting.sessions.slice(0, 8).map((s) => {
              const length = s.end - s.start;
              const hit = length / 3600_000 >= s.goalHours;
              return (
                <div key={s.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="num text-[12.5px] text-mist-200">{duration(length)}</p>
                    <p className="text-[10.5px] text-mist-500">
                      {shortDate(dateKey(new Date(s.start)))} · {timeOfDay(s.start)} → {timeOfDay(s.end)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${
                      hit ? "bg-lime-400/10 text-lime-300" : "bg-white/[0.05] text-mist-400"
                    }`}
                  >
                    {hit ? "Goal met" : `${s.goalHours}h goal`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {stats.best > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-mist-500">
            <TrendingUp size={11} /> Longest fast: {duration(stats.best)}
          </p>
        )}
      </section>

      <p className="px-2 pb-2 text-center text-[10.5px] leading-relaxed text-mist-500">
        Intermittent fasting isn't for everyone — skip it if you're pregnant, under 18, or managing a
        condition that needs regular meals.
      </p>
    </div>
  );
}
