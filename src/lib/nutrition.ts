import type {
  ActivityLevel,
  Exercise,
  LogEntry,
  MealType,
  Nutrition,
  Profile,
  Targets,
} from "../types";

export const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
  hint: string;
  multiplier: number;
}[] = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, little exercise", multiplier: 1.2 },
  { value: "light", label: "Lightly active", hint: "1–2 workouts / week", multiplier: 1.375 },
  { value: "moderate", label: "Moderately active", hint: "3–4 workouts / week", multiplier: 1.55 },
  { value: "active", label: "Very active", hint: "5–6 workouts / week", multiplier: 1.725 },
  { value: "athlete", label: "Athlete", hint: "Physical job or 2× daily", multiplier: 1.9 },
];

export const MEALS: { value: MealType; label: string; window: string }[] = [
  { value: "breakfast", label: "Breakfast", window: "Morning" },
  { value: "lunch", label: "Lunch", window: "Midday" },
  { value: "dinner", label: "Dinner", window: "Evening" },
  { value: "snack", label: "Snacks", window: "Anytime" },
];

export const emptyNutrition = (): Nutrition => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
});

/** Scale per-100 g values to an actual portion. */
export function portion(food: Nutrition, grams: number): Nutrition {
  const f = grams / 100;
  return {
    calories: food.calories * f,
    protein: food.protein * f,
    carbs: food.carbs * f,
    fat: food.fat * f,
    fiber: food.fiber * f,
  };
}

export function sumEntries(entries: LogEntry[]): Nutrition {
  return entries.reduce((acc, entry) => {
    const n = portion(entry.food, entry.grams);
    acc.calories += n.calories;
    acc.protein += n.protein;
    acc.carbs += n.carbs;
    acc.fat += n.fat;
    acc.fiber += n.fiber;
    return acc;
  }, emptyNutrition());
}

export function sumExerciseKcal(exercises: Exercise[]): number {
  return exercises.reduce((sum, e) => sum + e.calories, 0);
}

export function targetsFor(profile: Profile): Targets {
  const { sex, age, heightCm, weightKg, activity, goal, rateKgPerWeek } = profile;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
  const multiplier = ACTIVITY_LEVELS.find((a) => a.value === activity)?.multiplier ?? 1.375;
  const tdee = bmr * multiplier;

  const weeklyKcal = Math.max(0, rateKgPerWeek) * 7700;
  const delta = goal === "maintain" ? 0 : (weeklyKcal / 7) * (goal === "lose" ? -1 : 1);
  const floor = sex === "female" ? 1200 : 1500;
  const calories = Math.round(Math.min(Math.max(tdee + delta, floor), 6000) / 10) * 10;

  const proteinPerKg = goal === "lose" ? 2.2 : goal === "gain" ? 1.8 : 1.6;
  // Cap protein at 35% of energy so macro targets always add up.
  const protein = Math.round(Math.min(proteinPerKg * weightKg, (calories * 0.35) / 4));
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(40, Math.round((calories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((calories / 1000) * 14);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    protein,
    carbs,
    fat,
    fiber,
  };
}

export function macroSplit(targets: Targets) {
  const p = targets.protein * 4;
  const c = targets.carbs * 4;
  const f = targets.fat * 9;
  const total = p + c + f || 1;
  return { protein: p / total, carbs: c / total, fat: f / total };
}

export const EXERCISE_PRESETS: { name: string; met: number; emoji: string }[] = [
  { name: "Walking", met: 3.5, emoji: "🚶" },
  { name: "Running", met: 9.8, emoji: "🏃" },
  { name: "Cycling", met: 7.5, emoji: "🚴" },
  { name: "Swimming", met: 7, emoji: "🏊" },
  { name: "Strength training", met: 5, emoji: "🏋️" },
  { name: "HIIT", met: 8, emoji: "⚡" },
  { name: "Yoga", met: 3, emoji: "🧘" },
  { name: "Pilates", met: 3, emoji: "🤸" },
  { name: "Rowing", met: 7, emoji: "🚣" },
  { name: "Football", met: 7, emoji: "⚽" },
  { name: "Basketball", met: 6.5, emoji: "🏀" },
  { name: "Tennis", met: 7.3, emoji: "🎾" },
  { name: "Dancing", met: 5.5, emoji: "💃" },
  { name: "Hiking", met: 6, emoji: "🥾" },
  { name: "Skiing", met: 7, emoji: "⛷️" },
];

export function exerciseCalories(met: number, weightKg: number, minutes: number): number {
  return Math.round((met * 3.5 * weightKg) / 200 * minutes);
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiLabel(value: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (value < 18.5) return { label: "Underweight", tone: "warn" };
  if (value < 25) return { label: "Healthy range", tone: "good" };
  if (value < 30) return { label: "Overweight", tone: "warn" };
  return { label: "Obese", tone: "bad" };
}
