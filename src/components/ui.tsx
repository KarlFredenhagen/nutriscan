import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Minus, Plus, X } from "lucide-react";
import { useStore } from "../store";
import { clamp, fmt } from "../lib/format";

type Variant = "primary" | "ghost" | "quiet" | "danger";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "icon";
}) {
  const sizes = {
    sm: "h-9 px-3.5 text-[13px]",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-[15px]",
    icon: "h-9 w-9",
  };
  const variants: Record<Variant, string> = {
    primary: "btn-primary",
    ghost: "btn-ghost",
    quiet: "btn-quiet",
    danger: "bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/15",
  };
  return (
    <button className={`btn ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn h-9 w-9 shrink-0 border border-white/10 bg-white/[0.04] text-mist-300 hover:bg-white/[0.08] hover:text-white ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
  full = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  full?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-sheet relative flex w-full ${maxWidth} flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-ink-900 shadow-[0_-20px_80px_rgba(0,0,0,0.6)] sm:rounded-[1.75rem] ${
          full ? "h-[92dvh] sm:h-[86dvh]" : "max-h-[92dvh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            {title && <h2 className="truncate text-lg font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-mist-400">{subtitle}</p>}
          </div>
          <IconButton onClick={onClose} aria-label="Close">
            <X size={16} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Ring({
  size = 190,
  stroke = 12,
  progress,
  color = "#d3ff4f",
  track = "rgba(255,255,255,0.07)",
  children,
  capped = true,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  capped?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, capped ? Math.min(1, progress) : progress);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function MacroBar({
  label,
  value,
  target,
  color,
  unit = "g",
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const pct = target > 0 ? clamp((value / target) * 100, 0, 100) : 0;
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-baseline justify-between gap-1">
        <span className="text-[11px] font-medium tracking-wide text-mist-400">{label}</span>
        <span className="num text-[11px] text-mist-400">
          <span className="text-mist-100">{fmt(value, 0)}</span>/{fmt(target, 0)}
          {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 rounded-xl border border-white/[0.07] bg-ink-900/70 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-[12.5px] font-medium transition-colors ${
            value === o.value
              ? "bg-white/[0.09] text-white shadow-sm"
              : "text-mist-400 hover:text-mist-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  suffix,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; suffix?: string }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <div className="relative">
        <input className={`field ${suffix ? "pr-14" : ""} ${className}`} {...rest} />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-mist-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

export function NumberStepper({
  value,
  onChange,
  step = 10,
  min = 0,
  max = 5000,
  suffix = "g",
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const set = (v: number) => onChange(clamp(Math.round(v), min, max));
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => set(value - step)}
        className="btn h-10 w-10 border border-white/10 bg-white/[0.04] text-mist-200 hover:bg-white/10"
        aria-label="Decrease"
      >
        <Minus size={15} />
      </button>
      <div className="relative flex-1">
        <input
          type="number"
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          className="field text-center font-mono text-base"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-mist-500">
          {suffix}
        </span>
      </div>
      <button
        type="button"
        onClick={() => set(value + step)}
        className="btn h-10 w-10 border border-white/10 bg-white/[0.04] text-mist-200 hover:bg-white/10"
        aria-label="Increase"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-lime-400" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function Select({
  value,
  onChange,
  children,
  className = "",
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="field appearance-none pr-10 text-[14px]"
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-mist-500"
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold tracking-[0.14em] text-mist-500 uppercase">{label}</p>
      <p className="num mt-1 truncate text-[19px] font-semibold text-white" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[11.5px] text-mist-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-mist-400">
        {icon}
      </div>
      <p className="text-sm font-medium text-mist-200">{title}</p>
      {body && <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-mist-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CheckPill({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
        checked ? "border-lime-400 bg-lime-400 text-ink-950" : "border-white/20 text-transparent"
      }`}
    >
      <Check size={12} strokeWidth={3} />
    </span>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-8">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`animate-toast pointer-events-auto max-w-[92vw] rounded-2xl border px-4 py-2.5 text-[13px] shadow-xl backdrop-blur-md ${
            t.tone === "error"
              ? "border-red-500/30 bg-red-950/90 text-red-100"
              : t.tone === "success"
                ? "border-lime-400/30 bg-[#1b2410]/95 text-lime-100"
                : "border-white/10 bg-ink-800/95 text-mist-100"
          }`}
        >
          {t.message}
        </button>
      ))}
    </div>,
    document.body,
  );
}
