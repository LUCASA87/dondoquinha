import { formatCurrency, formatDate } from "@/lib/format";
import {
  PDF_LARGURA,
  PDF_MARGIN,
  adicionarCabecalhoRelatorioPDF,
  yNovaPaginaRelatorio,
} from "@/lib/relatorio-pdf-utils";

export interface LinhaRelatorioConta {
  descricao: string;
  parcela: string;
  dataPagamento: string;
  valor: number;
}

export interface DadosRelatorioContasPDF {
  titulo: string;
  contas: LinhaRelatorioConta[];
  total: number;
}

export async function baixarRelatorioContasPDF(dados: DadosRelatorioContasPDF) {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const largura = PDF_LARGURA;

  let y = await adicionarCabecalhoRelatorioPDF(pdf, "Relatório de contas pagas", [
    dados.titulo,
  ]);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("DESCRIÇÃO", margin, y);
  pdf.text("PARCELA", margin + 78, y);
  pdf.text("PAGO EM", margin + 108, y);
  pdf.text("VALOR", margin + 148, y);

  y += 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, margin + largura, y);
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  for (const conta of dados.contas) {
    if (y > 275) {
      pdf.addPage();
      y = yNovaPaginaRelatorio();
    }

    const linhas = pdf.splitTextToSize(conta.descricao, 72);
    pdf.text(linhas, margin, y);
    pdf.text(conta.parcela, margin + 78, y);
    pdf.text(formatDate(conta.dataPagamento), margin + 108, y);
    pdf.text(formatCurrency(conta.valor), margin + 148, y);

    y += Math.max(6, linhas.length * 5);
  }

  y += 4;
  pdf.setDrawColor(165, 28, 48);
  pdf.line(margin, y, margin + largura, y);
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(`Total pago: ${formatCurrency(dados.total)}`, margin, y);

  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Gerado em ${formatDate(new Date().toISOString().split("T")[0])} — ${dados.contas.length} conta(s)`,
    margin,
    y
  );

  pdf.save(`relatorio-contas-pagas-${Date.now()}.pdf`);
}
