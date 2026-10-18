export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type GoalType = "lose" | "maintain" | "gain";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type UnitSystem = "metric" | "imperial";

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: GoalType;
  /** Magnitude of weekly weight change in kg. */
  rateKgPerWeek: number;
  targetWeightKg: number;
  units: UnitSystem;
  createdAt: number;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodItem extends Nutrition {
  id: string;
  name: string;
  brand?: string;
  /** All nutrition values are normalised per 100 g / 100 ml. */
  per100: true;
  servingLabel?: string;
  servingGrams?: number;
  /** Set for foods resolved from a scanned barcode (Open Food Facts). */
  barcode?: string;
  source: "db" | "custom" | "ai" | "off";
}

export interface LogEntry {
  id: string;
  date: string;
  meal: MealType;
  /** Portion size in grams (or millilitres for drinks). */
  grams: number;
  createdAt: number;
  food: FoodItem;
}

export interface Exercise {
  id: string;
  date: string;
  name: string;
  minutes: number;
  calories: number;
  createdAt: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
  createdAt: number;
}

export interface FastingSession {
  id: string;
  start: number;
  end: number;
  goalHours: number;
}

export interface Settings {
  geminiKey: string;
  model: string;
  waterGoalMl: number;
  stepGoal: number;
  aiConsent: boolean;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  entries: LogEntry[];
  exercises: Exercise[];
  weights: WeightEntry[];
  water: Record<string, number>;
  fasting: {
    goalHours: number;
    activeStart: number | null;
    sessions: FastingSession[];
  };
  settings: Settings;
  customFoods: FoodItem[];
  steps: Record<string, number>;
  onboarded: boolean;
}

export interface Targets {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}
