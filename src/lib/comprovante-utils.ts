import { formatCurrency, formatDate, formatItemNome } from "@/lib/format";
import { LOJA, type ComprovantePagamentoData, type ComprovanteVendaData } from "@/lib/store";

function statusLabel(status: "pago" | "pendente") {
  return status === "pago" ? "QUITADA" : "PENDENTE";
}

export function comprovanteVendaTexto(data: ComprovanteVendaData): string {
  const linhas = [
    `*${LOJA.nomeCompleto}*`,
    `RESUMO DO PEDIDO`,
    ``,
    `Data: ${formatDate(data.dataCompra)}`,
    `Pedido: ${data.numeroPedido}`,
    `Cliente: ${data.clienteNome}`,
    `Crediário: ${data.parcelasTotal}x`,
    data.obs ? `Obs: ${data.obs}` : "",
    ``,
    `*Produtos:*`,
    ...data.itens.map(
      (i) =>
        `• ${formatItemNome(i.descricao)} | Qtd: ${i.quantidade} | ${formatCurrency(i.total)}`
    ),
    ``,
    `*Total: ${formatCurrency(data.valorTotal)}*`,
    ``,
  ];

  if (data.parcelas.length > 0) {
    linhas.push(`*Parcelas:*`);
    data.parcelas.forEach((p) => {
      linhas.push(
        `${p.numero}/${data.parcelasTotal} — ${formatCurrency(p.valor)} — Venc: ${formatDate(p.dataVencimento)} — ${statusLabel(p.status)}`
      );
    });
  }

  linhas.push("", "Obrigada pela preferência!");
  return linhas.filter(Boolean).join("\n");
}

export function comprovantePagamentoTexto(data: ComprovantePagamentoData): string {
  const produtos =
    data.itens.length > 0
      ? [`*Produtos:*`, ...data.itens.map((i) => `• ${i.descricao}`), ``]
      : [];

  return [
    `*${LOJA.nomeCompleto}*`,
    `COMPROVANTE DE PAGAMENTO`,
    ``,
    `Data: ${formatDate(data.dataPagamento)}`,
    `Pedido: ${data.numeroPedido}`,
    `Cliente: ${data.clienteNome}`,
    `Parcela: ${data.parcelaNumero}/${data.parcelasTotal}`,
    data.obs ? `Como pagou: ${data.obs}` : "",
    ``,
    ...produtos,
    `Pago agora: ${formatCurrency(data.valorPagoAgora)}`,
    `Total da compra: ${formatCurrency(data.valorTotalVenda)}`,
    `Total já pago: ${formatCurrency(data.totalJaPago)}`,
    data.saldoRestante <= 0.001
      ? `*COMPRA QUITADA*`
      : `*AINDA FALTA PAGAR: ${formatCurrency(data.saldoRestante)}*`,
    data.saldoParcela > 0.001
      ? `Nesta parcela: ${formatCurrency(data.saldoParcela)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function pagamentoStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; font-size: 11px; color: #000; padding: 12px; width: 280px; }
    .center { text-align: center; }
    .logo { width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 4px; display: block; }
    .title { font-size: 15px; font-style: italic; font-weight: bold; }
    .subtitle { font-size: 8px; letter-spacing: 0.15em; color: #666; margin-bottom: 8px; }
    .heading { font-weight: bold; font-size: 12px; text-align: center; margin: 8px 0; }
    .line { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
    .muted { color: #666; }
    .header { border-bottom: 1px dashed #ccc; padding-bottom: 8px; margin-bottom: 8px; }
    .resumo { background: #f5f5f5; border-radius: 6px; padding: 8px; margin-top: 8px; }
    .saldo-box {
      background: #A51C30; color: #fff; border-radius: 6px; padding: 8px;
      margin-top: 6px; text-align: center;
    }
    .saldo-box .label { font-size: 9px; letter-spacing: 0.05em; opacity: 0.9; }
    .saldo-box .valor { font-size: 16px; font-weight: bold; margin-top: 2px; }
    .saldo-quitado { background: #1A1A1A; color: #fff; border-radius: 6px; padding: 8px; margin-top: 6px; text-align: center; font-weight: bold; font-size: 11px; }
  `;
}

function baseStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; font-size: 12px; color: #000; padding: 16px; max-width: 320px; }
    .center { text-align: center; }
    .logo { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 8px; display: block; }
    .title { font-size: 18px; font-style: italic; font-weight: bold; margin-bottom: 4px; }
    .subtitle { font-size: 9px; letter-spacing: 0.2em; color: #444; }
    .heading { font-weight: bold; font-size: 14px; text-align: center; margin: 12px 0; }
    .line { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
    .muted { color: #666; }
    .divider { border-top: 1px dashed #999; margin: 12px 0; padding-top: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0; }
    th, td { padding: 4px 2px; text-align: left; border-bottom: 1px solid #eee; }
    th:last-child, td:last-child { text-align: right; }
    .total { font-weight: bold; font-size: 14px; text-align: right; margin: 12px 0; }
    .parcela { border: 1px solid #ddd; padding: 8px; margin: 8px 0; border-radius: 4px; }
    .assinatura { border-top: 1px solid #000; height: 32px; margin-top: 24px; }
    .footer { text-align: center; font-size: 9px; color: #888; margin-top: 16px; }
  `;
}

function saldoPagamentoHtml(data: ComprovantePagamentoData): string {
  if (data.saldoRestante <= 0.001) {
    return `<div class="saldo-quitado">COMPRA QUITADA</div>`;
  }

  const parcela =
    data.saldoParcela > 0.001
      ? `<p style="font-size:9px;margin-top:4px;opacity:0.85">Nesta parcela: ${formatCurrency(data.saldoParcela)}</p>`
      : "";

  return `<div class="saldo-box">
    <p class="label">AINDA FALTA PAGAR</p>
    <p class="valor">${formatCurrency(data.saldoRestante)}</p>
    ${parcela}
  </div>`;
}

export function comprovanteVendaHtml(data: ComprovanteVendaData, logoUrl: string): string {
  const itens = data.itens
    .map(
      (i) => `<tr>
        <td>${formatItemNome(i.descricao)}</td>
        <td>${i.quantidade.toFixed(2).replace(".", ",")}</td>
        <td>${i.valorUnitario.toFixed(2).replace(".", ",")}</td>
        <td>${i.total.toFixed(2).replace(".", ",")}</td>
      </tr>`
    )
    .join("");

  const parcelas =
    data.parcelas.length > 0
      ? `<div class="divider"><p class="center" style="font-weight:bold;margin-bottom:8px">PARCELAS</p>${data.parcelas
          .map(
            (p) => `<div class="parcela">
              <div class="line"><span class="muted">Vencimento:</span><span>${formatDate(p.dataVencimento)}</span></div>
              <div class="line"><span class="muted">Valor:</span><span>${formatCurrency(p.valor)}</span></div>
              <div class="line"><span class="muted">Status:</span><span><strong>${statusLabel(p.status)}</strong></span></div>
              <div class="line"><span class="muted">Parcela:</span><span>${p.numero} de ${data.parcelasTotal}</span></div>
            </div>`
          )
          .join("")}</div>`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprovante ${data.numeroPedido}</title>
    <style>${baseStyles()}</style></head><body>
    <div class="center divider">
      <img src="${logoUrl}" class="logo" alt="Logo" />
      <p class="title">${LOJA.nome}</p>
      <p class="subtitle">${LOJA.subtitulo}</p>
    </div>
    <p class="heading">RESUMO DO PEDIDO</p>
    <div class="line"><span class="muted">Data da compra:</span><span>${formatDate(data.dataCompra)}</span></div>
    <div class="line"><span class="muted">Pedido:</span><span>${data.numeroPedido}</span></div>
    <div class="line"><span class="muted">Cliente:</span><span>${data.clienteNome}</span></div>
    <div class="line"><span class="muted">Crediário:</span><span>${data.parcelasTotal}x</span></div>
    ${data.obs ? `<div class="line"><span class="muted">Obs:</span><span>${data.obs}</span></div>` : ""}
    <table><thead><tr><th>Descrição</th><th>Qtd</th><th>Valor</th><th>Total</th></tr></thead><tbody>${itens}</tbody></table>
    <p class="total">Total Final: ${formatCurrency(data.valorTotal)}</p>
    ${parcelas}
    <div class="assinatura"></div>
    <p class="center" style="font-size:10px">Assinatura do Cliente</p>
    <p class="footer">Obrigada pela preferência!</p>
    </body></html>`;
}

export function comprovantePagamentoHtml(
  data: ComprovantePagamentoData,
  logoUrl: string
): string {
  const produtosHtml =
    data.itens.length > 0
      ? `<div style="margin:6px 0 8px">
          <p class="muted" style="font-size:9px;margin-bottom:4px">PRODUTOS</p>
          ${data.itens
            .map(
              (i) =>
                `<p style="font-size:10px;margin:2px 0"><strong>${i.descricao}</strong> · Qtd ${i.quantidade}</p>`
            )
            .join("")}
        </div>`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pagamento ${data.numeroPedido}</title>
    <style>${pagamentoStyles()}</style></head><body>
    <div class="center header">
      <img src="${logoUrl}" class="logo" alt="Logo" />
      <p class="title">${LOJA.nome}</p>
      <p class="subtitle">${LOJA.subtitulo}</p>
    </div>
    <p class="heading">COMPROVANTE DE PAGAMENTO</p>
    <div class="line"><span class="muted">Data:</span><span>${formatDate(data.dataPagamento)}</span></div>
    <div class="line"><span class="muted">Pedido:</span><span>${data.numeroPedido}</span></div>
    <div class="line"><span class="muted">Cliente:</span><span>${data.clienteNome}</span></div>
    <div class="line"><span class="muted">Parcela:</span><span>${data.parcelaNumero}/${data.parcelasTotal}</span></div>
    ${data.obs ? `<div class="line"><span class="muted">Como pagou:</span><span>${data.obs}</span></div>` : ""}
    ${produtosHtml}
    <div class="resumo">
      <div class="line"><span class="muted">Pago agora:</span><span>${formatCurrency(data.valorPagoAgora)}</span></div>
      <div class="line"><span class="muted">Total compra:</span><span>${formatCurrency(data.valorTotalVenda)}</span></div>
      <div class="line"><span class="muted">Já pago:</span><span>${formatCurrency(data.totalJaPago)}</span></div>
      ${saldoPagamentoHtml(data)}
    </div>
    </body></html>`;
}

export async function copiarComprovante(texto: string) {
  await navigator.clipboard.writeText(texto);
}
