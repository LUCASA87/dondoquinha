export function saldoParcela(p: {
  valor_parcela: number;
  valor_pago?: number;
}): number {
  return Math.max(0, Number(p.valor_parcela) - Number(p.valor_pago ?? 0));
}

export function getVendaId(p: {
  venda_id?: string;
  vendas?: { id: string } | null;
}): string | null {
  return p.venda_id ?? p.vendas?.id ?? null;
}

/** Só a próxima parcela de cada venda pode receber pagamento. */
export function filtrarParcelasPagaveis<
  T extends {
    id: string;
    numero_parcela: number;
    valor_parcela: number;
    valor_pago?: number;
    venda_id?: string;
    vendas?: { id: string } | null;
  },
>(parcelas: T[]): T[] {
  const porVenda = new Map<string, T[]>();

  for (const p of parcelas) {
    const vendaId = getVendaId(p);
    if (!vendaId || saldoParcela(p) <= 0.001) continue;
    const lista = porVenda.get(vendaId) ?? [];
    lista.push(p);
    porVenda.set(vendaId, lista);
  }

  const pagaveis: T[] = [];
  for (const grupo of porVenda.values()) {
    grupo.sort((a, b) => a.numero_parcela - b.numero_parcela);
    pagaveis.push(grupo[0]);
  }

  return pagaveis.sort((a, b) => a.numero_parcela - b.numero_parcela);
}
