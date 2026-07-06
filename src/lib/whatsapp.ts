import { formatCurrency, formatDate } from "@/lib/format";
import { LOJA } from "@/lib/store";

/** Normaliza telefone brasileiro para wa.me (ex: 5511999999999). */
export function normalizarTelefoneWhatsApp(telefone: string): string | null {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return digits.length >= 12 ? digits : null;
}

export function abrirWhatsApp(telefone: string | null | undefined, mensagem: string): boolean {
  let url: string;

  if (telefone?.trim()) {
    const numero = normalizarTelefoneWhatsApp(telefone);
    if (!numero) return false;
    url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
  }

  // window.open no gesto do toque funciona melhor no celular que click sintético em <a>
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function mensagemWhatsAppCliente(nome: string): string {
  return `Olá, ${nome}! Tudo bem? 😊\n\n${LOJA.nomeCompleto}`;
}

export function mensagemCobrancaParcela(data: {
  clienteNome: string;
  valor: number;
  dataVencimento: string;
  numeroParcela: number;
  parcelasTotal: number;
  numeroPedido?: string;
  produtos?: string[];
}): string {
  const pedido = data.numeroPedido ? ` (pedido ${data.numeroPedido})` : "";
  const produtos =
    data.produtos && data.produtos.length > 0
      ? `\nProdutos: ${data.produtos.join(", ")}\n`
      : "";
  return (
    `Olá, ${data.clienteNome}! 😊\n\n` +
    `Passando para lembrar da parcela ${data.numeroParcela}/${data.parcelasTotal}${pedido} ` +
    `do crediário, no valor de ${formatCurrency(data.valor)}, ` +
    `com vencimento em ${formatDate(data.dataVencimento)}.` +
    produtos +
    `\nQualquer dúvida, estamos à disposição!\n\n` +
    `${LOJA.nomeCompleto}`
  );
}

export function mensagemCobrancaDebito(data: {
  clienteNome: string;
  totalDevido: number;
  produtos?: string[];
}): string {
  const produtos =
    data.produtos && data.produtos.length > 0
      ? `\nProdutos: ${data.produtos.join(", ")}\n`
      : "";
  return (
    `Olá, ${data.clienteNome}! 😊\n\n` +
    `Passando para lembrar do saldo em aberto no crediário: ${formatCurrency(data.totalDevido)}.` +
    produtos +
    `\nPodemos combinar o pagamento quando for melhor para você.\n\n` +
    `${LOJA.nomeCompleto}`
  );
}
