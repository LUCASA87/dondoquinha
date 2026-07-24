import { formatCurrency, formatDate } from "@/lib/format";
import {
  PDF_LARGURA,
  PDF_MARGIN,
  adicionarCabecalhoRelatorioPDF,
} from "@/lib/relatorio-pdf-utils";

export interface DadosRelatorioDashboardPDF {
  periodoLabel: string;
  dataInicio: string;
  dataFim: string;
  vendas: number;
  custo: number;
  liquido: number;
  crediarioAberto: number;
  crediarioRecebido: number;
  aPagarAberto: number;
  aPagarPagas: number;
  caixa: number;
  estoqueCusto: number;
  estoquePrecoVenda: number;
  estoqueLucro: number;
}

function linhaResumo(
  pdf: import("jspdf").jsPDF,
  y: number,
  label: string,
  valor: number,
  destaque = false
) {
  const margin = PDF_MARGIN;
  const largura = PDF_LARGURA;
  pdf.setFont("helvetica", destaque ? "bold" : "normal");
  pdf.setFontSize(destaque ? 11 : 10);
  pdf.setTextColor(26, 26, 26);
  pdf.text(label, margin, y);
  pdf.text(formatCurrency(valor), margin + largura, y, { align: "right" });
  return y + (destaque ? 7 : 6);
}

export async function baixarRelatorioDashboardPDF(dados: DadosRelatorioDashboardPDF) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const largura = PDF_LARGURA;

  let y = await adicionarCabecalhoRelatorioPDF(pdf, "Relatório financeiro", [
    `Período: ${dados.periodoLabel}`,
    `De ${formatDate(dados.dataInicio)} até ${formatDate(dados.dataFim)}`,
  ]);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(165, 28, 48);
  pdf.text("Vendas", margin, y);
  y += 6;
  pdf.setTextColor(26, 26, 26);
  y = linhaResumo(pdf, y, "Vendas", dados.vendas);
  y = linhaResumo(pdf, y, "(−) Custo", dados.custo);
  y = linhaResumo(pdf, y, "(=) Líquido", dados.liquido, true);

  y += 4;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, margin + largura, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(165, 28, 48);
  pdf.text("Crediário", margin, y);
  y += 6;
  pdf.setTextColor(26, 26, 26);
  y = linhaResumo(pdf, y, "Em aberto (venc. no período)", dados.crediarioAberto);
  y = linhaResumo(pdf, y, "Recebido", dados.crediarioRecebido);

  y += 4;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, margin + largura, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(165, 28, 48);
  pdf.text("A pagar", margin, y);
  y += 6;
  pdf.setTextColor(26, 26, 26);
  y = linhaResumo(pdf, y, "Em aberto (venc. no período)", dados.aPagarAberto);
  y = linhaResumo(pdf, y, "Pagas", dados.aPagarPagas);

  y += 4;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, margin + largura, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(165, 28, 48);
  pdf.text("Caixa", margin, y);
  y += 6;
  pdf.setTextColor(26, 26, 26);
  y = linhaResumo(pdf, y, "Recebido − pagas", dados.caixa, true);

  y += 4;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, margin + largura, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(165, 28, 48);
  pdf.text("Estoque atual", margin, y);
  y += 6;
  pdf.setTextColor(26, 26, 26);
  y = linhaResumo(pdf, y, "Custo", dados.estoqueCusto);
  y = linhaResumo(pdf, y, "Preço venda / valor bruto", dados.estoquePrecoVenda);
  y = linhaResumo(pdf, y, "Lucro estoque", dados.estoqueLucro, true);

  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Gerado em ${formatDate(new Date().toISOString().split("T")[0])}`,
    margin,
    y
  );

  pdf.save(`relatorio-financeiro-${dados.dataInicio}-${dados.dataFim}.pdf`);
}
