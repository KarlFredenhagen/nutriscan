import type { UnitSystem } from "../types";

export const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function fmt(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export const KG_TO_LB = 2.2046226218;

export function weightDisplay(kg: number, units: UnitSystem, digits = 1): string {
  return units === "imperial" ? `${fmt(kg * KG_TO_LB, digits)} lb` : `${fmt(kg, digits)} kg`;
}

export function weightValue(kg: number, units: UnitSystem): number {
  return units === "imperial" ? round(kg * KG_TO_LB, 1) : round(kg, 1);
}

export function toKg(value: number, units: UnitSystem): number {
  return units === "imperial" ? value / KG_TO_LB : value;
}

export function heightDisplay(cm: number, units: UnitSystem): string {
  if (units === "metric") return `${fmt(cm, 0)} cm`;
  const totalIn = cm / 2.54;
  return `${Math.floor(totalIn / 12)}' ${Math.round(totalIn % 12)}"`;
}

export function volumeDisplay(ml: number, units: UnitSystem): string {
  return units === "imperial" ? `${fmt(ml / 29.5735, 0)} fl oz` : `${fmt(ml, 0)} ml`;
}

export function signed(n: number, digits = 0): string {
  const v = round(n, digits);
  return `${v > 0 ? "+" : ""}${fmt(v, digits)}`;
}
