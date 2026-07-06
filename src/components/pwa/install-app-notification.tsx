"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppMessages } from "@/components/ui/app-messages";
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
  isMobileDevice,
} from "@/lib/pwa-utils";

export function InstallAppNotification() {
  const { toast } = useAppMessages();
  const [visivel, setVisivel] = useState(false);
  const [instalando, setInstalando] = useState(false);

  const atualizarVisibilidade = useCallback(() => {
    if (!isMobileDevice() || isAppInstalled()) {
      setVisivel(false);
      return;
    }

    const apkUrl = getApkDownloadUrl();
    const podeInstalar = isAndroid() || Boolean(getDeferredInstallPrompt()) || Boolean(apkUrl);

    if (!podeInstalar) {
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
    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, atualizarVisibilidade));
    };
  }, [atualizarVisibilidade]);

  if (!visivel) return null;

  const apkUrl = getApkDownloadUrl();

  async function handleInstalar() {
    if (apkUrl && !getDeferredInstallPrompt()) {
      window.location.href = apkUrl;
      return;
    }

    setInstalando(true);
    try {
      const resultado = await runPwaInstall();

      if (resultado === "installed") {
        setVisivel(false);
        toast("Aplicativo instalado com sucesso.", "success");
        return;
      }

      if (resultado === "dismissed") return;

      toast(
        "Instalador indisponível. Abra no Chrome do Android e tente novamente.",
        "info"
      );
    } finally {
      setInstalando(false);
    }
  }

  function handleFechar() {
    dismissInstallNotification();
    setVisivel(false);
  }

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
          <p className="text-xs text-brand-black/55">Toque para instalar o aplicativo</p>
        </div>

        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={handleInstalar}
          disabled={instalando}
        >
          <Download className="h-4 w-4" />
          {instalando ? "..." : "Instalar"}
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
