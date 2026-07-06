export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerReady = false;

export function initPwaInstallListener() {
  if (typeof window === "undefined" || listenerReady) return;
  listenerReady = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("dondoquinha-pwa-installable"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event("dondoquinha-pwa-installed"));
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = deferredPrompt;
  if (!prompt) return "unavailable";

  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  clearDeferredInstallPrompt();
  return outcome;
}

export async function waitForInstallPrompt(timeoutMs = 4000): Promise<boolean> {
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
