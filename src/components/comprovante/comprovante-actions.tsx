"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppMessages } from "@/components/ui/app-messages";
import {
  baixarArquivosComprovante,
  compartilharNoClique,
  gerarArquivosComprovante,
  imprimirArquivosProntos,
  isMobileDevice,
  obterCacheCompartilhamento,
  registrarCacheCompartilhamento,
  type ArquivosComprovante,
} from "@/lib/comprovante-share";

interface ComprovanteActionsProps {
  html: string;
  texto: string;
  nomeArquivo: string;
  telefoneCliente?: string | null;
  onFechar?: () => void;
}

export function ComprovanteActions({
  html,
  nomeArquivo,
  onFechar,
}: ComprovanteActionsProps) {
  const { toast } = useAppMessages();
  const [arquivos, setArquivos] = useState<ArquivosComprovante | null>(null);
  const [gerando, setGerando] = useState(true);
  const arquivosRef = useRef<ArquivosComprovante | null>(null);

  useEffect(() => {
    let cancelado = false;
    setGerando(true);
    setArquivos(null);
    arquivosRef.current = null;

    gerarArquivosComprovante(html, nomeArquivo)
      .then((resultado) => {
        if (!cancelado) {
          arquivosRef.current = resultado;
          registrarCacheCompartilhamento(resultado);
          setArquivos(resultado);
          setGerando(false);
        }
      })
      .catch(() => {
        if (!cancelado) setGerando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [html, nomeArquivo]);

  function obterProntos(): ArquivosComprovante | null {
    return arquivosRef.current ?? arquivos ?? obterCacheCompartilhamento();
  }

  function fallbackBaixar(prontos: ArquivosComprovante) {
    baixarArquivosComprovante(prontos, nomeArquivo);
    toast("Imagem baixada. Anexe no WhatsApp do PC.", "info");
  }

  function handleEnviar() {
    if (gerando) {
      toast("Aguarde, preparando comprovante...", "info");
      return;
    }

    const prontos = obterProntos();
    if (!prontos) {
      toast(
        "Não foi possível preparar o comprovante. Tente fechar e abrir de novo.",
        "error"
      );
      return;
    }

    if (!window.isSecureContext) {
      toast("Abra o site com https:// para compartilhar.", "error");
      fallbackBaixar(prontos);
      return;
    }

    if (!navigator.share) {
      fallbackBaixar(prontos);
      return;
    }

    if (!isMobileDevice()) {
      onFechar?.();
    }

    const iniciou = compartilharNoClique(prontos, {
      onSucesso: () => {
        if (isMobileDevice()) onFechar?.();
      },
      onErro: () => fallbackBaixar(prontos),
    });

    if (!iniciou) {
      fallbackBaixar(prontos);
    }
  }

  function handleBaixar() {
    if (gerando) {
      toast("Aguarde, preparando comprovante...", "info");
      return;
    }

    const prontos = obterProntos();
    if (!prontos) {
      toast("Não foi possível preparar o comprovante.", "error");
      return;
    }

    baixarArquivosComprovante(prontos, nomeArquivo);
    toast("Imagem baixada.", "info");
    onFechar?.();
  }

  function handleImprimir() {
    if (gerando) {
      toast("Aguarde, preparando comprovante...", "info");
      return;
    }

    const prontos = obterProntos();
    if (!prontos) {
      toast("Não foi possível preparar o comprovante.", "error");
      return;
    }

    const resultado = imprimirArquivosProntos(prontos, nomeArquivo);
    if (resultado.downloaded) {
      toast("PDF baixado para você imprimir.", "info");
    } else {
      toast("Abrindo impressão...", "info");
    }
  }

  return (
    <div className="flex items-center justify-center gap-3 w-full">
      <Button
        type="button"
        onClick={handleBaixar}
        disabled={gerando}
        variant="outline"
        size="icon"
        className="h-14 w-14 rounded-2xl border-brand-red/25 bg-brand-cream/50 text-brand-red hover:bg-brand-cream hover:border-brand-red/40"
        title="Baixar"
        aria-label="Baixar comprovante"
      >
        <ArrowDown className="h-7 w-7 stroke-[2.5]" />
      </Button>

      <Button
        type="button"
        onClick={handleImprimir}
        disabled={gerando}
        variant="outline"
        size="icon"
        className="h-14 w-14 rounded-2xl border-brand-red/25 bg-brand-cream/50 text-brand-red hover:bg-brand-cream hover:border-brand-red/40"
        title="Imprimir"
        aria-label="Imprimir comprovante"
      >
        <Printer className="h-7 w-7 stroke-[2.5]" />
      </Button>

      <Button
        type="button"
        onClick={handleEnviar}
        disabled={gerando}
        size="icon"
        className="h-14 w-14 rounded-2xl bg-brand-red text-white shadow-md shadow-brand-red/25 hover:bg-brand-red/90"
        title="Enviar"
        aria-label="Enviar comprovante"
      >
        {gerando ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <ArrowRight className="h-7 w-7 stroke-[2.5]" />
        )}
      </Button>
    </div>
  );
}
