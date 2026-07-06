import { formatCurrency, formatDate } from "@/lib/format";
import {
  PDF_LARGURA,
  PDF_MARGIN,
  adicionarCabecalhoRelatorioPDF,
  yNovaPaginaRelatorio,
} from "@/lib/relatorio-pdf-utils";

export type FiltroParcelasCliente = "pagas" | "abertas";

export interface ParcelaRelatorioCliente {
  numero: number;
  totalParcelas: number;
  vencimento: string;
  valor: number;
  pago: number;
  saldo: number;
  status: string;
}

export interface VendaRelatorioCliente {
  numeroPedido: string;
  dataCompra: string;
  produtos: string[];
  valorTotal: number;
  parcelas: ParcelaRelatorioCliente[];
}

export interface DadosRelatorioClienteComprasPDF {
  clienteNome: string;
  clienteCpf: string;
  filtroLabel: string;
  vendas: VendaRelatorioCliente[];
  totalCompras: number;
  totalPago: number;
  totalAberto: number;
}

export async function baixarRelatorioClienteComprasPDF(dados: DadosRelatorioClienteComprasPDF) {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const largura = PDF_LARGURA;

  let y = await adicionarCabecalhoRelatorioPDF(
    pdf,
    "Histórico de compras — Crediário",
    [
      dados.clienteNome,
      `CPF: ${dados.clienteCpf}`,
      `Filtro: ${dados.filtroLabel}`,
    ]
  );

  for (const venda of dados.vendas) {
    if (y > 250) {
      pdf.addPage();
      y = yNovaPaginaRelatorio();
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(
      `Pedido ${venda.numeroPedido} — ${formatDate(venda.dataCompra)} — ${formatCurrency(venda.valorTotal)}`,
      margin,
      y
    );
    y += 5;

    if (venda.produtos.length > 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(`Produtos: ${venda.produtos.join(", ")}`, margin, y);
      y += 5;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("PARC.", margin, y);
    pdf.text("VENC.", margin + 16, y);
    pdf.text("VALOR", margin + 46, y);
    pdf.text("PAGO", margin + 76, y);
    pdf.text("FALTA", margin + 106, y);
    pdf.text("STATUS", margin + 136, y);
    y += 4;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    for (const p of venda.parcelas) {
      if (y > 275) {
        pdf.addPage();
        y = yNovaPaginaRelatorio();
      }
      pdf.text(`${p.numero}/${p.totalParcelas}`, margin, y);
      pdf.text(formatDate(p.vencimento), margin + 16, y);
      pdf.text(formatCurrency(p.valor), margin + 46, y);
      pdf.text(formatCurrency(p.pago), margin + 76, y);
      pdf.text(formatCurrency(p.saldo), margin + 106, y);
      pdf.text(p.status, margin + 136, y);
      y += 5;
    }

    y += 4;
  }

  if (dados.vendas.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Nenhuma parcela encontrada para este filtro.", margin, y);
    y += 8;
  }

  pdf.setDrawColor(165, 28, 48);
  pdf.line(margin, y, margin + largura, y);
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(`Total em compras: ${formatCurrency(dados.totalCompras)}`, margin, y);
  y += 5;
  pdf.text(`Total já pago: ${formatCurrency(dados.totalPago)}`, margin, y);
  y += 5;
  pdf.text(`Total em aberto: ${formatCurrency(dados.totalAberto)}`, margin, y);

  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Gerado em ${formatDate(new Date().toISOString().split("T")[0])}`, margin, y);

  const slug = dados.clienteNome.replace(/\s+/g, "-").slice(0, 20).toLowerCase();
  pdf.save(`compras-${slug}-${Date.now()}.pdf`);
}
