import { registerServiceWorker } from "@/lib/pwa-utils";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "dondoquinha_install_dismissed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerReady = false;

export function initPwaInstallListener() {
  if (typeof window === "undefined" || listenerReady) return;
  listenerReady = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    sessionStorage.removeItem(DISMISS_KEY);
    window.dispatchEvent(new Event("dondoquinha-pwa-installable"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    sessionStorage.removeItem(DISMISS_KEY);
    window.dispatchEvent(new Event("dondoquinha-pwa-installed"));
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
}

export function isInstallNotificationDismissed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissInstallNotification() {
  sessionStorage.setItem(DISMISS_KEY, "1");
  window.dispatchEvent(new Event("dondoquinha-pwa-install-dismissed"));
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = deferredPrompt;
  if (!prompt) return "unavailable";

  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  clearDeferredInstallPrompt();
  return outcome;
}

export async function waitForInstallPrompt(timeoutMs = 8000): Promise<boolean> {
  if (deferredPrompt) return true;

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("dondoquinha-pwa-installable", onReady);
      resolve(Boolean(deferredPrompt));
    }, timeoutMs);

    function onReady() {
      window.clearTimeout(timer);
      window.removeEventListener("dondoquinha-pwa-installable", onReady);
      resolve(Boolean(deferredPrompt));
    }

    window.addEventListener("dondoquinha-pwa-installable", onReady);
  });
}

/** Abre o instalador nativo do Android (popup do sistema). */
export async function runPwaInstall(): Promise<
  "installed" | "dismissed" | "unavailable"
> {
  await registerServiceWorker();

  if (!deferredPrompt) {
    await waitForInstallPrompt(8000);
  }

  const outcome = await promptPwaInstall();
  if (outcome === "accepted") return "installed";
  if (outcome === "dismissed") return "dismissed";
  return "unavailable";
}
