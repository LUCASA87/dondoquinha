"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Download, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissInstallNotification,
  getDeferredInstallPrompt,
  isInstallNotificationDismissed,
  runPwaInstall,
} from "@/lib/pwa-install";
import {
  getApkDownloadUrl,
  isAndroid,
  isAppInstalled,
  isInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "@/lib/pwa-utils";

export function InstallAppNotification() {
  const [visivel, setVisivel] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [inApp, setInApp] = useState(false);

  const atualizarVisibilidade = useCallback(() => {
    if (!isMobileDevice() || isAppInstalled()) {
      setVisivel(false);
      return;
    }

    const instalavel = Boolean(getDeferredInstallPrompt()) || Boolean(getApkDownloadUrl());
    const android = isAndroid();
    const navegadorEmbutido = isInAppBrowser();

    setInApp(navegadorEmbutido);
    setPronto(instalavel);

    if (!android && !instalavel) {
      setVisivel(false);
      return;
    }

    setVisivel(!isInstallNotificationDismissed());
  }, []);

  useEffect(() => {
    atualizarVisibilidade();

    const eventos = [
      "dondoquinha-pwa-installable",
      "dondoquinha-pwa-installed",
      "dondoquinha-pwa-install-dismissed",
    ] as const;

    eventos.forEach((evento) => window.addEventListener(evento, atualizarVisibilidade));

    const timer = window.setInterval(atualizarVisibilidade, 2000);
    const stop = window.setTimeout(() => window.clearInterval(timer), 30000);

    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, atualizarVisibilidade));
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [atualizarVisibilidade]);

  if (!visivel) return null;

  const apkUrl = getApkDownloadUrl();

  async function handleInstalar() {
    if (inApp) {
      openInChrome();
      return;
    }

    if (apkUrl && !getDeferredInstallPrompt()) {
      window.location.href = apkUrl;
      return;
    }

    setInstalando(true);
    try {
      const resultado = await runPwaInstall();
      if (resultado === "installed") {
        setVisivel(false);
        return;
      }
    } finally {
      setInstalando(false);
      atualizarVisibilidade();
    }
  }

  function handleFechar() {
    dismissInstallNotification();
    setVisivel(false);
  }

  const labelBotao = inApp
    ? "Abrir no Chrome"
    : instalando
      ? "Abrindo..."
      : pronto
        ? "Instalar"
        : "Instalar";

  const subtitulo = inApp
    ? "Abra no Chrome para instalar o aplicativo"
    : pronto
      ? "Toque para instalar o aplicativo"
      : "Preparando instalador...";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-brand-red/20 bg-white p-3 shadow-2xl shadow-brand-red/15">
        <Image
          src="/pwa-icon-192.png"
          alt=""
          width={44}
          height={44}
          className="shrink-0 rounded-xl ring-1 ring-brand-red/15"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-black">Instale o Dondoquinha</p>
          <p className="text-xs text-brand-black/55">{subtitulo}</p>
        </div>

        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={handleInstalar}
          disabled={instalando || (!pronto && !inApp && !apkUrl)}
        >
          {inApp ? (
            <ExternalLink className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {labelBotao}
        </Button>

        <button
          type="button"
          onClick={handleFechar}
          className="shrink-0 rounded-lg p-1.5 text-brand-black/40 hover:bg-brand-cream hover:text-brand-black"
          aria-label="Fechar notificação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
