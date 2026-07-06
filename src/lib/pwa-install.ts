export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __DQ_PWA_PROMPT?: BeforeInstallPromptEvent;
  }
}

const DISMISS_KEY = "dondoquinha_install_dismissed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerReady = false;

function storePrompt(event: BeforeInstallPromptEvent) {
  deferredPrompt = event;
  if (typeof window !== "undefined") {
    window.__DQ_PWA_PROMPT = event;
  }
  sessionStorage.removeItem(DISMISS_KEY);
  window.dispatchEvent(new Event("dondoquinha-pwa-installable"));
}

export function initPwaInstallListener() {
  if (typeof window === "undefined" || listenerReady) return;
  listenerReady = true;

  if (window.__DQ_PWA_PROMPT) {
    storePrompt(window.__DQ_PWA_PROMPT);
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    storePrompt(event as BeforeInstallPromptEvent);
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.__DQ_PWA_PROMPT = undefined;
    sessionStorage.removeItem(DISMISS_KEY);
    window.dispatchEvent(new Event("dondoquinha-pwa-installed"));
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt ?? window.__DQ_PWA_PROMPT ?? null;
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
  window.__DQ_PWA_PROMPT = undefined;
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
  const prompt = getDeferredInstallPrompt();
  if (!prompt) return "unavailable";

  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  clearDeferredInstallPrompt();
  return outcome;
}

export async function waitForInstallPrompt(timeoutMs = 12000): Promise<boolean> {
  if (getDeferredInstallPrompt()) return true;

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("dondoquinha-pwa-installable", onReady);
      resolve(Boolean(getDeferredInstallPrompt()));
    }, timeoutMs);

    function onReady() {
      window.clearTimeout(timer);
      window.removeEventListener("dondoquinha-pwa-installable", onReady);
      resolve(Boolean(getDeferredInstallPrompt()));
    }

    window.addEventListener("dondoquinha-pwa-installable", onReady);
  });
}

/** Abre o instalador nativo do Android (popup do sistema). */
export async function runPwaInstall(): Promise<
  "installed" | "dismissed" | "unavailable"
> {
  const { registerServiceWorker } = await import("@/lib/pwa-utils");
  await registerServiceWorker();

  if (!getDeferredInstallPrompt()) {
    await waitForInstallPrompt(12000);
  }

  const outcome = await promptPwaInstall();
  if (outcome === "accepted") return "installed";
  if (outcome === "dismissed") return "dismissed";
  return "unavailable";
}
