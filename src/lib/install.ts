import { useEffect, useState } from "react";

/** Chrome/Edge/Samsung fire this before installing; Safari uses the share sheet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as NavigatorWithStandalone).standalone === true;
  return Boolean(displayMode || iosStandalone || window.matchMedia?.("(display-mode: fullscreen)").matches);
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOs;
}

/**
 * Exposes the deferred `beforeinstallprompt` event (Chromium only) plus the
 * current display mode, so the profile screen can offer a real install button
 * where the browser allows it and instructions where it doesn't.
 */
export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    const display = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    display?.addEventListener?.("change", onDisplayChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      display?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const install = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!event) return "unavailable";
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setEvent(null);
    return outcome;
  };

  return { installed, canInstall: Boolean(event), install, ios: isIos() };
}
