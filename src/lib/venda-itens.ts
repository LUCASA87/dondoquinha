import type { SupabaseClient } from "@supabase/supabase-js";
import { formatItemNome } from "@/lib/format";
import type { ComprovanteItem } from "@/lib/store";

type ItemVendaRow = {
  venda_id?: string;
  descricao?: string | null;
  quantidade?: number;
  preco_unitario?: number;
  produtos?: { nome: string } | null;
};

export function nomeItemVenda(item: {
  descricao?: string | null;
  produtos?: { nome: string } | null;
}): string {
  return formatItemNome(item.descricao ?? item.produtos?.nome ?? "PRODUTO");
}

export function mapItensComprovante(itens: ItemVendaRow[]): ComprovanteItem[] {
  return itens.map((item) => {
    const quantidade = Number(item.quantidade ?? 0);
    const valorUnitario = Number(item.preco_unitario ?? 0);
    return {
      descricao: nomeItemVenda(item),
      quantidade,
      valorUnitario,
      total: quantidade * valorUnitario,
    };
  });
}

export function mapNomesItensVenda(itens: ItemVendaRow[]): string[] {
  return itens.map(nomeItemVenda);
}

export function agruparNomesItensPorVenda(
  itens: ItemVendaRow[]
): Map<string, string[]> {
  const mapa = new Map<string, string[]>();

  for (const item of itens) {
    if (!item.venda_id) continue;
    const lista = mapa.get(item.venda_id) ?? [];
    lista.push(nomeItemVenda(item));
    mapa.set(item.venda_id, lista);
  }

  return mapa;
}

export async function buscarItensVendas(
  supabase: SupabaseClient,
  vendaIds: string[]
): Promise<ItemVendaRow[]> {
  if (vendaIds.length === 0) return [];

  const { data } = await supabase
    .from("venda_itens")
    .select("venda_id, descricao, quantidade, preco_unitario, produtos(nome)")
    .in("venda_id", vendaIds);

  return (data as ItemVendaRow[] | null) ?? [];
}
