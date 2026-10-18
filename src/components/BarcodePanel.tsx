import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Barcode,
  Camera,
  CameraOff,
  ChevronRight,
  ImageUp,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { FoodItem } from "../types";
import { BarcodeLookupError, lookupBarcode, normalizeBarcode, type BarcodeProduct } from "../lib/barcode";
import { fmt } from "../lib/format";
import { Button } from "./ui";

type ScanState = "idle" | "starting" | "scanning" | "looking-up" | "found";

interface DetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

/**
 * Prefer the browser's on-device detector (Chrome, Edge, Android). Everywhere
 * else load the ZXing WASM ponyfill on demand so Safari and Firefox still scan.
 */
async function createDetector(): Promise<{ detector: DetectorLike; engine: "native" | "wasm" }> {
  const Native = (globalThis as unknown as { BarcodeDetector?: new (o?: unknown) => DetectorLike })
    .BarcodeDetector;
  if (Native) {
    try {
      return { detector: new Native({ formats: FORMATS }), engine: "native" };
    } catch {
      try {
        return { detector: new Native(), engine: "native" };
      } catch {
        /* fall through to WASM */
      }
    }
  }
  const mod = (await import("barcode-detector/ponyfill")) as unknown as {
    BarcodeDetector: new (o?: unknown) => DetectorLike;
  };
  return { detector: new mod.BarcodeDetector({ formats: FORMATS }), engine: "wasm" };
}

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access was blocked. Allow it for this site, or type the barcode below.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera found. Type the barcode below, or scan a photo.";
  if (name === "NotReadableError") return "Your camera is busy in another app. Close it and retry.";
  return "Couldn't start the camera. Type the barcode below, or scan a photo.";
}

export function BarcodePanel({
  onPick,
  onManual,
  onAskAI,
}: {
  onPick: (food: FoodItem) => void;
  onManual: (name?: string) => void;
  onAskAI: () => void;
}) {
  const [state, setState] = useState<ScanState>("idle");
  const [manual, setManual] = useState("");
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [error, setError] = useState<{ message: string; hint?: "manual" | "ai" } | null>(null);
  const [engine, setEngine] = useState<"native" | "wasm" | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const [cameraSupported] = useState(
    () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const detectorRef = useRef<DetectorLike | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Bring the result card into view (the sheet body may be scrolled to the form).
  useEffect(() => {
    if (product) {
      setImageBroken(false);
      rootRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [product]);

  const stopCamera = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      abortRef.current?.abort();
    },
    [stopCamera],
  );

  const resolve = useCallback(
    async (raw: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      stopCamera();
      setError(null);
      setProduct(null);
      setState("looking-up");
      try {
        const found = await lookupBarcode(raw, controller.signal);
        setProduct(found);
        setState("found");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const lookupError = err instanceof BarcodeLookupError ? err : null;
        setState("idle");
        setError({
          message: lookupError?.message ?? "Something went wrong looking that barcode up.",
          hint:
            lookupError?.code === "no-nutrition"
              ? "ai"
              : lookupError?.code === "network" || lookupError?.code === "rate-limit"
                ? undefined
                : "manual",
        });
      }
    },
    [stopCamera],
  );

  const startCamera = useCallback(async () => {
    if (!cameraSupported) return;
    setError(null);
    setState("starting");
    let detector: DetectorLike;
    try {
      const created = await createDetector();
      detector = created.detector;
      detectorRef.current = detector;
      setEngine(created.engine);
    } catch {
      setState("idle");
      setError({
        message:
          "Couldn't load the on-device barcode reader. Type the barcode below, or scan a photo.",
        hint: "manual",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setState("scanning");

      timerRef.current = window.setInterval(async () => {
        const el = videoRef.current;
        if (busyRef.current || !el || el.readyState < 2) return;
        busyRef.current = true;
        try {
          const codes = await detector.detect(el);
          const hit = codes.find((c) => normalizeBarcode(c.rawValue));
          if (hit) {
            navigator.vibrate?.(60);
            await resolve(hit.rawValue);
          }
        } catch {
          // A single unreadable frame is normal; keep scanning.
        } finally {
          busyRef.current = false;
        }
      }, 280);
    } catch (err) {
      stopCamera();
      setState("idle");
      setError({ message: cameraErrorMessage(err), hint: "manual" });
    }
  }, [cameraSupported, resolve, stopCamera]);

  const scanPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setState("looking-up");
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("decode"));
        el.src = url;
      });
      const detector = detectorRef.current ?? (await createDetector()).detector;
      detectorRef.current = detector;
      const codes = await detector.detect(image);
      const hit = codes.find((c) => normalizeBarcode(c.rawValue));
      if (!hit) {
        setState("idle");
        setError({
          message: "No barcode found in that photo. Get closer, fill the frame, and keep it sharp.",
          hint: "manual",
        });
        return;
      }
      await resolve(hit.rawValue);
    } catch {
      setState("idle");
      setError({ message: "Couldn't read that image. Try another photo.", hint: "manual" });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    const digits = normalizeBarcode(manual);
    if (!digits) {
      setError({ message: "Barcodes are 8–14 digits. Check the number under the bars.", hint: "manual" });
      return;
    }
    void resolve(digits);
  };

  if (product) {
    const { food } = product;
    const servingKcal = food.servingGrams
      ? Math.round((food.calories * food.servingGrams) / 100)
      : null;
    return (
      <div ref={rootRef} className="animate-fade">
        <div className="card p-4">
          <div className="flex items-start gap-3.5">
            {product.imageUrl && !imageBroken ? (
              <img
                src={product.imageUrl}
                alt=""
                onError={() => setImageBroken(true)}
                referrerPolicy="no-referrer"
                className="h-20 w-20 shrink-0 rounded-xl border border-white/10 bg-white/5 object-contain p-1"
                loading="lazy"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-mist-500">
                <Barcode size={26} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] leading-snug font-semibold text-white">{food.name}</h3>
              <p className="mt-0.5 text-[12px] text-mist-400">
                {food.brand ? `${food.brand} · ` : ""}
                {product.quantity ?? "size unknown"}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-lime-400/10 px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-lime-300 uppercase">
                  Open Food Facts
                </span>
                {product.nutriscore && /^[a-e]$/.test(product.nutriscore) && (
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-mist-300 uppercase">
                    Nutri-Score {product.nutriscore}
                  </span>
                )}
                {product.partial && (
                  <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9.5px] font-semibold text-amber-300">
                    Partial data
                  </span>
                )}
              </div>
              <p className="num mt-1.5 text-[10.5px] text-mist-500">#{product.barcode}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-white/[0.03] p-3 text-center">
            <div>
              <p className="num text-[16px] font-semibold text-white">{Math.round(food.calories)}</p>
              <p className="text-[9.5px] tracking-wide text-mist-500 uppercase">kcal/100g</p>
            </div>
            {[
              { label: "Protein", value: food.protein, color: "#7dd3fc" },
              { label: "Carbs", value: food.carbs, color: "#fbbf24" },
              { label: "Fat", value: food.fat, color: "#f472b6" },
            ].map((m) => (
              <div key={m.label}>
                <p className="num text-[16px] font-semibold" style={{ color: m.color }}>
                  {fmt(m.value, 1)}
                </p>
                <p className="text-[9.5px] tracking-wide text-mist-500 uppercase">{m.label}</p>
              </div>
            ))}
          </div>

          {product.partial && (
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-amber-200/70">
              This entry is missing some macros upstream. Values shown are what the community
              database has — double-check the label if precision matters.
            </p>
          )}

          {servingKcal !== null && (
            <p className="mt-2.5 text-[11px] text-mist-400">
              One serving ({food.servingLabel ?? `${food.servingGrams} g`}) ≈ {servingKcal} kcal
            </p>
          )}
        </div>

        <Button size="lg" className="mt-4 w-full" onClick={() => onPick(food)}>
          <ChevronRight size={16} /> Choose portion & log
        </Button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setProduct(null);
              setManual("");
              setState("idle");
            }}
          >
            <RefreshCw size={14} /> Scan another
          </Button>
          <Button variant="ghost" onClick={() => onManual(food.name)}>
            <Pencil size={14} /> Edit values
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="animate-fade">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950">
        {state === "starting" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/40">
            <Loader2 size={20} className="animate-spin text-lime-400" />
            <p className="text-[11.5px] text-mist-300">Starting camera…</p>
          </div>
        )}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-[220px] w-full bg-black object-cover ${
            state === "scanning" || state === "starting" ? "" : "opacity-0"
          }`}
        />
        {(state === "starting" || state === "scanning" || state === "looking-up") && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[110px] w-[80%] max-w-[300px] rounded-xl border-2 border-lime-400/70">
                <span className="animate-scanline absolute inset-x-0 top-0 h-0.5 bg-lime-400" />
              </div>
            </div>
          </>
        )}
        {state !== "scanning" && state !== "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            {state === "looking-up" ? (
              <>
                <Loader2 size={22} className="animate-spin text-lime-400" />
                <p className="text-[12.5px] font-medium text-mist-200">Looking it up…</p>
                <p className="text-[11px] text-mist-500">Searching Open Food Facts</p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-lime-300">
                  {cameraSupported ? <Camera size={22} /> : <CameraOff size={22} />}
                </div>
                <p className="text-[12.5px] font-medium text-mist-200">
                  {cameraSupported ? "Point at the barcode" : "Camera not available here"}
                </p>
                <p className="max-w-[240px] text-[11px] leading-relaxed text-mist-500">
                  {cameraSupported
                    ? "Start the camera and hold the package steady — EAN and UPC codes are read on-device."
                    : "Type the digits under the bars, or scan a photo of the barcode."}
                </p>
                {cameraSupported && (
                  <Button size="sm" className="mt-1.5" onClick={() => void startCamera()}>
                    <Camera size={14} /> Start camera
                  </Button>
                )}
              </>
            )}
          </div>
        )}
        {state === "scanning" && (
          <button
            onClick={() => {
              stopCamera();
              setState("idle");
            }}
            className="absolute top-2 right-2 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur"
          >
            Stop
          </button>
        )}
      </div>

      <p className="mt-2 text-center text-[10.5px] text-mist-500">
        {engine === "wasm"
          ? "Scanning with the on-device WASM reader (downloaded once)."
          : engine === "native"
            ? "Scanning with your browser's built-in barcode reader."
            : "Codes are decoded on your device — only the number is sent to Open Food Facts."}
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] leading-relaxed text-amber-100/90">{error.message}</p>
            {error.hint === "ai" && (
              <button
                onClick={onAskAI}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200 underline underline-offset-2"
              >
                <Sparkles size={11} /> Estimate with Gemini instead
              </button>
            )}
            {error.hint === "manual" && (
              <button
                onClick={() => onManual()}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200 underline underline-offset-2"
              >
                <Pencil size={11} /> Add it as a custom food
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={submitManual} className="mt-4">
        <span className="label">Type a barcode</span>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Barcode size={15} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-mist-500" />
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 3017620422003"
              className="field pl-10 font-mono tracking-wide"
            />
          </div>
          <Button
            type="submit"
            className="px-4"
            disabled={state === "looking-up"}
            aria-label="Look up barcode"
          >
            <Search size={15} />
          </Button>
        </div>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          onClick={() => photoRef.current?.click()}
          className="chip"
          disabled={state === "looking-up"}
        >
          <ImageUp size={12} /> Scan a photo
        </button>
        <button onClick={() => onManual()} className="chip">
          <Pencil size={12} /> Add manually
        </button>
        <button onClick={onAskAI} className="chip">
          <Sparkles size={12} /> Ask Gemini
        </button>
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void scanPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <p className="mt-4 text-[10.5px] leading-relaxed text-mist-500">
        Product data comes from Open Food Facts, a free crowd-sourced database (ODbL). If a product is
        missing or wrong you can log it manually — or improve it upstream at openfoodfacts.org.
      </p>
    </div>
  );
}
