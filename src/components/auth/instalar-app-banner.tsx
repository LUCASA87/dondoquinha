"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getApkDownloadUrl,
  isAndroid,
  isAppInstalled,
  isIos,
  isMobileDevice,
  registerServiceWorker,
} from "@/lib/pwa-utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstalarAppBanner() {
  const [visivel, setVisivel] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mostrarIosDica, setMostrarIosDica] = useState(false);

  useEffect(() => {
    if (!isMobileDevice() || isAppInstalled()) return;

    void registerServiceWorker();

    const apkUrl = getApkDownloadUrl();
    if (apkUrl || isAndroid() || isIos()) {
      setVisivel(true);
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisivel(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visivel) return null;

  const apkUrl = getApkDownloadUrl();

  async function handleInstalarPwa() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setVisivel(false);
    }
    setInstallPrompt(null);
  }

  return (
    <div className="mb-6 rounded-xl border border-brand-red/20 bg-brand-cream/60 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <Smartphone className="h-5 w-5 text-brand-red" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-medium text-brand-black">Instale no celular</p>
            <p className="mt-1 text-sm text-brand-black/60">
              Acesse mais rápido como aplicativo, direto na tela inicial.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {installPrompt && (
              <Button type="button" className="w-full sm:w-auto" onClick={handleInstalarPwa}>
                <Download className="h-4 w-4" />
                Instalar aplicativo
              </Button>
            )}

            {apkUrl && (
              <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
                <a href={apkUrl} download>
                  <Download className="h-4 w-4" />
                  Baixar APK
                </a>
              </Button>
            )}

            {isIos() && !installPrompt && (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setMostrarIosDica((v) => !v)}
              >
                Como instalar no iPhone
              </Button>
            )}
          </div>

          {mostrarIosDica && (
            <p className="text-xs leading-relaxed text-brand-black/60">
              No Safari, toque em <strong>Compartilhar</strong> e depois em{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}

          {!installPrompt && !apkUrl && isAndroid() && (
            <p className="text-xs text-brand-black/60">
              No Chrome, abra o menu (⋮) e toque em <strong>Instalar aplicativo</strong> ou{" "}
              <strong>Adicionar à tela inicial</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
