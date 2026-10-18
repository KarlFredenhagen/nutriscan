import { useState } from "react";
import {
  ChartColumn,
  ScanLine,
  Sparkles,
  Timer,
  User,
  UtensilsCrossed,
} from "lucide-react";
import type { MealType } from "./types";
import { todayKey } from "./lib/date";
import { useStore } from "./store";
import { Onboarding } from "./components/Onboarding";
import { Diary } from "./components/Diary";
import { Insights } from "./components/Insights";
import { Fasting } from "./components/Fasting";
import { Profile } from "./components/Profile";
import { AiLogger } from "./components/AiLogger";
import { Toasts } from "./components/ui";

type Tab = "diary" | "insights" | "fasting" | "profile";

const NAV: { id: Tab; label: string; icon: typeof ChartColumn }[] = [
  { id: "diary", label: "Diary", icon: UtensilsCrossed },
  { id: "insights", label: "Insights", icon: ChartColumn },
  { id: "fasting", label: "Fasting", icon: Timer },
  { id: "profile", label: "Profile", icon: User },
];

function mealForTime(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export default function App() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>("diary");
  const [date, setDate] = useState(todayKey());
  const [ai, setAi] = useState<{ open: boolean; meal: MealType } | null>(null);

  if (!data.profile || !data.onboarded) {
    return (
      <>
        <Onboarding />
        <Toasts />
      </>
    );
  }

  const openAi = (meal: MealType) => setAi({ open: true, meal });

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-ink-900/70 px-5 py-6 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-ink-950">
            <ScanLine size={19} strokeWidth={2.4} />
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-white">
            Nutri<span className="text-lime-400">Scan</span>
          </span>
        </div>

        <nav className="mt-8 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-mist-400 hover:bg-white/[0.03] hover:text-mist-100"
                }`}
              >
                <Icon size={17} className={active ? "text-lime-400" : "text-mist-500"} />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-400" />}
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => openAi(mealForTime())}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-lime-400/25 bg-gradient-to-br from-lime-400/[0.14] to-transparent p-3.5 text-left transition-colors hover:border-lime-400/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-ink-950">
            <Sparkles size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-lime-200">AI quick add</span>
            <span className="block text-[10.5px] text-mist-400">Photo, text or suggestion</span>
          </span>
        </button>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold tracking-[0.12em] text-mist-500 uppercase">
                Gemini
              </span>
              <span
                className={`flex items-center gap-1 text-[9.5px] font-semibold ${
                  data.settings.geminiKey ? "text-lime-300" : "text-mist-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    data.settings.geminiKey ? "bg-lime-400" : "bg-mist-500"
                  }`}
                />
                {data.settings.geminiKey ? "READY" : "NO KEY"}
              </span>
            </div>
            <button
              onClick={() => go("profile")}
              className="mt-2 text-[11px] font-medium text-mist-400 hover:text-white"
            >
              {data.settings.geminiKey ? "Manage AI settings" : "Add your API key →"}
            </button>
          </div>
          <p className="px-1 text-[10px] leading-relaxed text-mist-500">
            Local-first. Your diary never leaves this browser.
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-ink-950/85 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-400 text-ink-950">
            <ScanLine size={15} strokeWidth={2.5} />
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-white">
            Nutri<span className="text-lime-400">Scan</span>
          </span>
        </div>
        <button
          onClick={() => go("profile")}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-mist-300"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              data.settings.geminiKey ? "bg-lime-400" : "bg-mist-500"
            }`}
          />
          {data.settings.geminiKey ? "AI READY" : "ADD AI KEY"}
        </button>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-4 pt-4 pb-28 sm:px-6 lg:max-w-[820px] lg:px-8 lg:pt-8 lg:pb-12">
        <div key={tab} className="animate-fade">
          {tab === "diary" && (
            <Diary
              date={date}
              onDateChange={setDate}
              onAi={openAi}
              onOpenFasting={() => go("fasting")}
            />
          )}
          {tab === "insights" && <Insights onOpenFasting={() => go("fasting")} />}
          {tab === "fasting" && <Fasting />}
          {tab === "profile" && <Profile />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 via-ink-950/90 to-transparent" />
        <div className="relative mx-auto flex max-w-[520px] items-end justify-around px-4 pb-[max(10px,env(safe-area-inset-bottom))]">
          {NAV.slice(0, 2).map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => go(item.id)} />
          ))}

          <button
            onClick={() => openAi(mealForTime())}
            aria-label="Log with AI"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400 text-ink-950 shadow-[0_10px_30px_rgba(211,255,79,0.28)] transition-transform active:scale-95"
          >
            <Sparkles size={22} />
          </button>

          {NAV.slice(2).map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => go(item.id)} />
          ))}
        </div>
      </nav>

      {ai && (
        <AiLogger
          open={ai.open}
          date={date}
          initialMeal={ai.meal}
          onClose={() => setAi(null)}
          onOpenSettings={() => {
            setAi(null);
            go("profile");
          }}
        />
      )}

      <Toasts />
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: Tab; label: string; icon: typeof ChartColumn };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex w-[72px] flex-col items-center gap-1 py-2 text-[9.5px] font-medium transition-colors ${
        active ? "text-lime-300" : "text-mist-500"
      }`}
    >
      <Icon size={19} />
      {item.label}
    </button>
  );
}
