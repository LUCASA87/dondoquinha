"use client";

import { getLogoDataUrl, injetarLogoNoHtml } from "@/lib/comprovante-logo";

export type ArquivosComprovante = {
  jpegBlob: Blob;
  pngBlob: Blob;
  pdfBlob: Blob;
  jpegFile: File;
  pngFile: File;
};

export type ResultadoCompartilhamento = {
  ok: boolean;
  downloaded?: boolean;
  shared?: boolean;
  cancelled?: boolean;
};

function baixarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function isShareCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isNavegadorWhatsApp(): boolean {
  return /WhatsApp/i.test(navigator.userAgent);
}

export function mensagemCompartilharIndisponivel(): string {
  if (isNavegadorWhatsApp()) {
    return 'Toque nos ⋮ acima e escolha "Abrir no Chrome". Depois clique em Enviar de novo.';
  }
  if (isMobileDevice()) {
    return "Abra o site no Chrome do celular para enviar pelo WhatsApp.";
  }
  return "Use Chrome ou Edge no PC e escolha WhatsApp no menu. Se não abrir, use ⬇ Baixar e anexe no WhatsApp.";
}

function criarArquivoJpeg(arquivos: ArquivosComprovante): File {
  return new File([arquivos.jpegBlob], arquivos.jpegFile.name, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function criarArquivoPng(arquivos: ArquivosComprovante): File {
  return new File([arquivos.pngBlob], arquivos.pngFile.name, {
    type: "image/png",
    lastModified: Date.now(),
  });
}

function montarShareData(arquivos: ArquivosComprovante, png = false): ShareData {
  return {
    files: [png ? criarArquivoPng(arquivos) : criarArquivoJpeg(arquivos)],
    title: "Comprovante Dondoquinha",
  };
}

function podeCompartilhar(shareData: ShareData): boolean {
  if (!navigator.canShare) return true;
  try {
    return navigator.canShare(shareData);
  } catch {
    return true;
  }
}

async function aguardarImagens(doc: Document) {
  const imagens = Array.from(doc.images);
  await Promise.all(
    imagens.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  );
  await new Promise((r) => setTimeout(r, 150));
}

async function prepararHtml(html: string): Promise<string> {
  const logoDataUrl = await getLogoDataUrl();
  return injetarLogoNoHtml(html, logoDataUrl);
}

export async function gerarArquivosComprovante(
  html: string,
  nomeBase: string
): Promise<ArquivosComprovante> {
  const htmlPronto = await prepararHtml(html);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "360px";
  iframe.style.height = "1200px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      throw new Error("Não foi possível gerar o comprovante.");
    }

    doc.open();
    doc.write(htmlPronto);
    doc.close();

    await aguardarImagens(doc);

    const body = doc.body;
    const largura = body.scrollWidth || 320;
    const altura = body.scrollHeight || 800;
    iframe.style.width = `${largura + 40}px`;
    iframe.style.height = `${altura + 40}px`;

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await withTimeout(
      html2canvas(body, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: largura,
        height: altura,
        windowWidth: largura,
        windowHeight: altura,
      }),
      60000,
      "Tempo esgotado ao gerar imagem do comprovante."
    );

    const blobFromCanvas = (type: string, quality?: number) =>
      withTimeout(
        new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Erro ao gerar imagem"))),
            type,
            quality
          );
        }),
        15000,
        "Tempo esgotado ao converter imagem."
      );

    const [jpegBlob, pngBlob] = await Promise.all([
      blobFromCanvas("image/jpeg", 0.92),
      blobFromCanvas("image/png"),
    ]);

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const larguraMm = 80;
    const alturaMm = (canvas.height * larguraMm) / canvas.width;
    const pdf = new jsPDF({
      unit: "mm",
      format: [larguraMm, Math.max(alturaMm + 5, 100)],
      orientation: "portrait",
    });
    pdf.addImage(imgData, "JPEG", 0, 0, larguraMm, alturaMm);
    const pdfBlob = pdf.output("blob");

    const jpegFile = new File([jpegBlob], `${nomeBase}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    const pngFile = new File([pngBlob], `${nomeBase}.png`, {
      type: "image/png",
      lastModified: Date.now(),
    });

    return { jpegBlob, pngBlob, pdfBlob, jpegFile, pngFile };
  } finally {
    document.body.removeChild(iframe);
  }
}

let shareEmAndamento = false;
let cacheCompartilhamento: ArquivosComprovante | null = null;

export function registrarCacheCompartilhamento(arquivos: ArquivosComprovante) {
  cacheCompartilhamento = arquivos;
}

export function obterCacheCompartilhamento() {
  return cacheCompartilhamento;
}

type CallbacksCompartilhar = {
  onSucesso?: () => void;
  onErro?: () => void;
  onCancelado?: () => void;
};

/**
 * Chama navigator.share no clique (síncrono) — necessário no Chrome do PC.
 * A imagem já deve estar pronta antes do clique.
 */
export function compartilharNoClique(
  arquivos: ArquivosComprovante,
  callbacks?: CallbacksCompartilhar
): boolean {
  if (!navigator.share || shareEmAndamento) {
    return false;
  }

  registrarCacheCompartilhamento(arquivos);

  const file = criarArquivoJpeg(arquivos);
  const shareData: ShareData = { files: [file] };

  shareEmAndamento = true;

  try {
    navigator
      .share(shareData)
      .then(() => {
        callbacks?.onSucesso?.();
      })
      .catch((error) => {
        if (isShareCancelled(error)) {
          callbacks?.onCancelado?.();
          return;
        }
        callbacks?.onErro?.();
      })
      .finally(() => {
        shareEmAndamento = false;
      });

    return true;
  } catch {
    shareEmAndamento = false;
    return false;
  }
}

/** @deprecated use compartilharNoClique no handler do botão */
export async function compartilharArquivos(
  arquivos: ArquivosComprovante,
  callbacks?: CallbacksCompartilhar
): Promise<"shared" | "cancelled" | "failed"> {
  if (!navigator.share || shareEmAndamento) return "failed";

  shareEmAndamento = true;
  try {
    await navigator.share(montarShareData(arquivos));
    callbacks?.onSucesso?.();
    return "shared";
  } catch (error) {
    if (isShareCancelled(error)) return "cancelled";
    return "failed";
  } finally {
    shareEmAndamento = false;
  }
}

export function baixarArquivosComprovante(
  arquivos: ArquivosComprovante,
  nomeBase: string
): ResultadoCompartilhamento {
  baixarArquivo(arquivos.jpegBlob, `${nomeBase}.jpg`);
  return { ok: true, downloaded: true };
}

export function imprimirArquivosProntos(arquivos: ArquivosComprovante, nomeBase: string) {
  const url = URL.createObjectURL(arquivos.pdfBlob);
  const janela = window.open(url, "_blank");
  if (!janela) {
    baixarArquivo(arquivos.pdfBlob, `${nomeBase}.pdf`);
    return { downloaded: true as const };
  }
  setTimeout(() => {
    janela.print();
  }, 600);
  return {};
}
