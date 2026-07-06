import { formatCurrency, formatDate } from "@/lib/format";
import {
  PDF_LARGURA,
  PDF_MARGIN,
  adicionarCabecalhoRelatorioPDF,
  yNovaPaginaRelatorio,
} from "@/lib/relatorio-pdf-utils";

export interface LinhaRecebimentoCrediario {
  data: string;
  cliente: string;
  pedido: string;
  valor: number;
  obs: string;
}

export interface DadosRelatorioCrediarioRecebidoPDF {
  titulo: string;
  dataInicio: string;
  dataFim: string;
  linhas: LinhaRecebimentoCrediario[];
  total: number;
}

export async function baixarRelatorioCrediarioRecebidoPDF(dados: DadosRelatorioCrediarioRecebidoPDF) {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const largura = PDF_LARGURA;

  let y = await adicionarCabecalhoRelatorioPDF(pdf, "Relatório — Crediário recebido", [
    `Período: ${formatDate(dados.dataInicio)} a ${formatDate(dados.dataFim)}`,
  ]);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("DATA", margin, y);
  pdf.text("CLIENTE", margin + 28, y);
  pdf.text("PEDIDO", margin + 88, y);
  pdf.text("VALOR", margin + 118, y);
  pdf.text("OBS", margin + 148, y);

  y += 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, margin + largura, y);
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  for (const linha of dados.linhas) {
    if (y > 275) {
      pdf.addPage();
      y = yNovaPaginaRelatorio();
    }

    pdf.text(formatDate(linha.data), margin, y);
    const clienteLinhas = pdf.splitTextToSize(linha.cliente, 56);
    pdf.text(clienteLinhas, margin + 28, y);
    pdf.text(linha.pedido, margin + 88, y);
    pdf.text(formatCurrency(linha.valor), margin + 118, y);
    const obsLinhas = pdf.splitTextToSize(linha.obs || "—", 34);
    pdf.text(obsLinhas, margin + 148, y);

    y += Math.max(6, clienteLinhas.length * 5, obsLinhas.length * 5);
  }

  y += 4;
  pdf.setDrawColor(165, 28, 48);
  pdf.line(margin, y, margin + largura, y);
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(`Total recebido: ${formatCurrency(dados.total)}`, margin, y);

  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Gerado em ${formatDate(new Date().toISOString().split("T")[0])} — ${dados.linhas.length} pagamento(s)`,
    margin,
    y
  );

  pdf.save(`relatorio-crediario-${dados.dataInicio}-${dados.dataFim}.pdf`);
}
