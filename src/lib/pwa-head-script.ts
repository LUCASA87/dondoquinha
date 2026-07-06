export const pwaHeadScript = `
(function () {
  if (typeof window === "undefined") return;
  window.__DQ_PWA_PROMPT = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    window.__DQ_PWA_PROMPT = e;
    window.dispatchEvent(new Event("dondoquinha-pwa-installable"));
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
  }
})();
`;
