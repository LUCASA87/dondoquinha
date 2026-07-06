import { LOJA } from "@/lib/store";

let logoDataUrlCache: string | null = null;

export async function getLogoDataUrl(): Promise<string> {
  if (logoDataUrlCache) return logoDataUrlCache;

  const response = await fetch(LOJA.logo);
  if (!response.ok) {
    throw new Error("Não foi possível carregar a logo.");
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Erro ao converter logo."));
    reader.readAsDataURL(blob);
  });

  logoDataUrlCache = dataUrl;
  return dataUrl;
}

export function injetarLogoNoHtml(html: string, logoDataUrl: string): string {
  return html.replace(/src="[^"]*logo\.png[^"]*"/gi, `src="${logoDataUrl}"`);
}
