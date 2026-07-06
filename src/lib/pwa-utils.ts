export const PASSKEY_ID_STORAGE = "dondoquinha_passkey_id";

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function getStoredPasskeyId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PASSKEY_ID_STORAGE);
}

export function setStoredPasskeyId(credentialId: string) {
  localStorage.setItem(PASSKEY_ID_STORAGE, credentialId);
}

export function clearStoredPasskeyId() {
  localStorage.removeItem(PASSKEY_ID_STORAGE);
}

export function getApkDownloadUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APK_URL?.trim();
  return url || null;
}

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // PWA opcional — não bloqueia o app
  }
}
