import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  Exercise,
  FoodItem,
  LogEntry,
  MealType,
  Profile,
  Settings,
  Targets,
  WeightEntry,
} from "./types";
import { todayKey } from "./lib/date";
import { targetsFor } from "./lib/nutrition";

const STORAGE_KEY = "nutriscan.state.v1";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const defaultSettings: Settings = {
  geminiKey: "",
  model: "gemini-3.8-flash",
  waterGoalMl: 2500,
  stepGoal: 8000,
  aiConsent: true,
};

export function defaultData(): AppData {
  return {
    version: 1,
    profile: null,
    entries: [],
    exercises: [],
    weights: [],
    water: {},
    fasting: { goalHours: 16, activeStart: null, sessions: [] },
    settings: defaultSettings,
    customFoods: [],
    steps: {},
    onboarded: false,
  };
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const base = defaultData();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      fasting: { ...base.fasting, ...parsed.fasting },
      version: 1,
    };
  } catch {
    return defaultData();
  }
}

export interface Toast {
  id: string;
  message: string;
  tone: "info" | "success" | "error";
}

interface StoreValue {
  data: AppData;
  targets: Targets | null;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  update: (fn: (data: AppData) => AppData) => void;
  completeOnboarding: (profile: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addEntry: (food: FoodItem, grams: number, meal: MealType, date: string) => void;
  updateEntry: (id: string, patch: Partial<Pick<LogEntry, "grams" | "meal">>) => void;
  removeEntry: (id: string) => void;
  saveCustomFood: (food: FoodItem) => void;
  addExercise: (exercise: Omit<Exercise, "id" | "createdAt">) => void;
  removeExercise: (id: string) => void;
  logWeight: (kg: number, date?: string) => void;
  removeWeight: (id: string) => void;
  addWater: (ml: number, date?: string) => void;
  setWater: (ml: number, date?: string) => void;
  startFast: () => void;
  stopFast: () => void;
  cancelFast: () => void;
  setFastingGoal: (hours: number) => void;
  addSteps: (steps: number, date?: string) => void;
  resetAll: () => void;
  importData: (raw: string) => boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable (private mode / quota). The app keeps working in memory.
    }
  }, [data]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
    timers.current.push(timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const update = useCallback((fn: (data: AppData) => AppData) => {
    setData((prev) => fn(prev));
  }, []);

  const value = useMemo<StoreValue>(() => {
    const updateProfile = (patch: Partial<Profile>) =>
      setData((prev) =>
        prev.profile ? { ...prev, profile: { ...prev.profile, ...patch } } : prev,
      );

    return {
      data,
      targets: data.profile ? targetsFor(data.profile) : null,
      toasts,
      notify,
      dismissToast,
      update,
      completeOnboarding: (profile) =>
        setData((prev) => ({
          ...prev,
          profile,
          onboarded: true,
          weights: [
            { id: uid(), date: todayKey(), kg: profile.weightKg, createdAt: Date.now() },
            ...prev.weights.filter((w) => w.date !== todayKey()),
          ],
        })),
      updateProfile,
      updateSettings: (patch) =>
        setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } })),
      addEntry: (food, grams, meal, date) =>
        setData((prev) => ({
          ...prev,
          entries: [
            ...prev.entries,
            { id: uid(), date, meal, grams, food, createdAt: Date.now() },
          ],
        })),
      updateEntry: (id, patch) =>
        setData((prev) => ({
          ...prev,
          entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeEntry: (id) =>
        setData((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) })),
      saveCustomFood: (food) =>
        setData((prev) => ({ ...prev, customFoods: [food, ...prev.customFoods] })),
      addExercise: (exercise) =>
        setData((prev) => ({
          ...prev,
          exercises: [{ ...exercise, id: uid(), createdAt: Date.now() }, ...prev.exercises],
        })),
      removeExercise: (id) =>
        setData((prev) => ({ ...prev, exercises: prev.exercises.filter((e) => e.id !== id) })),
      logWeight: (kg, date = todayKey()) =>
        setData((prev) => {
          const others = prev.weights.filter((w) => w.date !== date);
          const entry: WeightEntry = { id: uid(), date, kg, createdAt: Date.now() };
          const weights = [entry, ...others].sort((a, b) => b.date.localeCompare(a.date));
          const latest = weights[0];
          return {
            ...prev,
            weights,
            profile:
              prev.profile && latest.date === date
                ? { ...prev.profile, weightKg: latest.kg }
                : prev.profile,
          };
        }),
      removeWeight: (id) =>
        setData((prev) => ({ ...prev, weights: prev.weights.filter((w) => w.id !== id) })),
      addWater: (ml, date = todayKey()) =>
        setData((prev) => ({
          ...prev,
          water: { ...prev.water, [date]: Math.max(0, (prev.water[date] ?? 0) + ml) },
        })),
      setWater: (ml, date = todayKey()) =>
        setData((prev) => ({ ...prev, water: { ...prev.water, [date]: Math.max(0, ml) } })),
      startFast: () =>
        setData((prev) => ({
          ...prev,
          fasting: { ...prev.fasting, activeStart: Date.now() },
        })),
      stopFast: () =>
        setData((prev) => {
          if (!prev.fasting.activeStart) return prev;
          return {
            ...prev,
            fasting: {
              ...prev.fasting,
              activeStart: null,
              sessions: [
                {
                  id: uid(),
                  start: prev.fasting.activeStart,
                  end: Date.now(),
                  goalHours: prev.fasting.goalHours,
                },
                ...prev.fasting.sessions,
              ],
            },
          };
        }),
      cancelFast: () =>
        setData((prev) => ({ ...prev, fasting: { ...prev.fasting, activeStart: null } })),
      setFastingGoal: (hours) =>
        setData((prev) => ({ ...prev, fasting: { ...prev.fasting, goalHours: hours } })),
      addSteps: (steps, date = todayKey()) =>
        setData((prev) => ({
          ...prev,
          steps: { ...prev.steps, [date]: Math.max(0, (prev.steps[date] ?? 0) + steps) },
        })),
      resetAll: () => setData(defaultData()),
      importData: (raw) => {
        try {
          const parsed = JSON.parse(raw) as Partial<AppData>;
          if (!parsed || typeof parsed !== "object" || !("version" in parsed)) return false;
          const base = defaultData();
          setData({
            ...base,
            ...parsed,
            settings: { ...base.settings, ...parsed.settings },
            fasting: { ...base.fasting, ...parsed.fasting },
            version: 1,
          });
          return true;
        } catch {
          return false;
        }
      },
    };
  }, [data, toasts, notify, dismissToast, update]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
