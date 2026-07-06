"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getApkDownloadUrl,
  isAndroid,
  isAppInstalled,
  isIos,
  isMobileDevice,
  registerServiceWorker,
} from "@/lib/pwa-utils";
import {
  getDeferredInstallPrompt,
  promptPwaInstall,
  waitForInstallPrompt,
} from "@/lib/pwa-install";

type ModoAjuda = "android" | "ios" | null;

export function InstalarAppBanner() {
  const [visivel, setVisivel] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [podeInstalarNativo, setPodeInstalarNativo] = useState(false);
  const [modoAjuda, setModoAjuda] = useState<ModoAjuda>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    if (!isMobileDevice()) return;

    function atualizarEstado() {
      const appInstalado = isAppInstalled();
      setInstalado(appInstalado);
      setVisivel(!appInstalado);
      setPodeInstalarNativo(Boolean(getDeferredInstallPrompt()));
    }

    atualizarEstado();

    window.addEventListener("dondoquinha-pwa-installable", atualizarEstado);
    window.addEventListener("dondoquinha-pwa-installed", atualizarEstado);

    return () => {
      window.removeEventListener("dondoquinha-pwa-installable", atualizarEstado);
      window.removeEventListener("dondoquinha-pwa-installed", atualizarEstado);
    };
  }, []);

  if (!visivel || instalado) return null;

  const apkUrl = getApkDownloadUrl();

  async function handleInstalar() {
    setInstalando(true);
    setModoAjuda(null);

    try {
      await registerServiceWorker();

      let prompt = getDeferredInstallPrompt();
      if (!prompt) {
        await waitForInstallPrompt(5000);
        prompt = getDeferredInstallPrompt();
      }

      if (prompt) {
        const outcome = await promptPwaInstall();
        if (outcome === "accepted") {
          setVisivel(false);
          return;
        }
        if (outcome === "dismissed") return;
      }

      if (isIos()) {
        setModoAjuda("ios");
        return;
      }

      if (isAndroid()) {
        setModoAjuda("android");
      }
    } finally {
      setInstalando(false);
    }
  }

  return (
    <>
      <div className="mb-6 rounded-xl border border-brand-red/20 bg-brand-cream/60 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <Smartphone className="h-5 w-5 text-brand-red" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="font-medium text-brand-black">Instale no celular</p>
              <p className="mt-1 text-sm text-brand-black/60">
                Tenha o Dondoquinha na tela inicial, como um aplicativo.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={handleInstalar}
                disabled={instalando}
              >
                <Download className="h-4 w-4" />
                {instalando
                  ? "Preparando instalador..."
                  : podeInstalarNativo
                    ? "Instalar aplicativo"
                    : "Instalar agora"}
              </Button>

              {apkUrl && (
                <Button type="button" variant="outline" className="w-full" asChild>
                  <a href={apkUrl} download>
                    <Download className="h-4 w-4" />
                    Baixar APK
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modoAjuda !== null} onOpenChange={(open) => !open && setModoAjuda(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {modoAjuda === "ios" ? "Instalar no iPhone" : "Instalar no Android"}
            </DialogTitle>
            <DialogDescription>
              {modoAjuda === "ios"
                ? "Siga os passos abaixo para adicionar o app na tela inicial."
                : "Se o instalador automático não abriu, use o menu do navegador."}
            </DialogDescription>
          </DialogHeader>

          {modoAjuda === "ios" ? (
            <ol className="space-y-3 text-sm text-brand-black/75">
              <li className="flex gap-3">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                <span>
                  Toque em <strong>Compartilhar</strong> na barra inferior do Safari.
                </span>
              </li>
              <li className="flex gap-3">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                <span>
                  Escolha <strong>Adicionar à Tela de Início</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                <span>
                  Confirme em <strong>Adicionar</strong>. O ícone aparecerá na tela inicial.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-brand-black/75">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-xs font-bold text-brand-red">
                  1
                </span>
                <span>
                  Toque nos <strong>três pontos</strong> (⋮) no canto superior do Chrome.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-xs font-bold text-brand-red">
                  2
                </span>
                <span>
                  Selecione <strong>Instalar aplicativo</strong> ou{" "}
                  <strong>Adicionar à tela inicial</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-xs font-bold text-brand-red">
                  3
                </span>
                <span>
                  Toque em <strong>Instalar</strong> para concluir.
                </span>
              </li>
            </ol>
          )}

          <Button type="button" variant="outline" className="w-full" onClick={() => setModoAjuda(null)}>
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
