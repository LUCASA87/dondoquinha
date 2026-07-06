import { getLogoDataUrl } from "@/lib/comprovante-logo";
import { LOJA } from "@/lib/store";
import type { jsPDF } from "jspdf";

export const PDF_MARGIN = 14;
export const PDF_LARGURA = 182;

export async function adicionarCabecalhoRelatorioPDF(
  pdf: jsPDF,
  titulo: string,
  detalhes: string[] = []
): Promise<number> {
  const margin = PDF_MARGIN;
  const largura = PDF_LARGURA;
  let y = 12;

  try {
    const logo = await getLogoDataUrl();
    pdf.addImage(logo, "PNG", margin, y, 18, 18);
  } catch {
    // continua sem logo se não carregar
  }

  const textX = margin + 22;
  pdf.setTextColor(165, 28, 48);
  pdf.setFont("helvetica", "bolditalic");
  pdf.setFontSize(14);
  pdf.text(LOJA.nome, textX, y + 6);

  pdf.setTextColor(100, 100, 100);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(LOJA.subtitulo, textX, y + 11);

  y += 22;
  pdf.setTextColor(26, 26, 26);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(titulo, margin, y);

  for (const linha of detalhes) {
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(linha, margin, y);
  }

  y += 4;
  pdf.setDrawColor(165, 28, 48);
  pdf.line(margin, y, margin + largura, y);
  y += 8;

  return y;
}

export function yNovaPaginaRelatorio(): number {
  return 18;
}
