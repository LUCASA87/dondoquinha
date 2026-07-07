import type { SupabaseClient } from "@supabase/supabase-js";
import { dbError } from "@/lib/db/helpers";
import { formatItemNome } from "@/lib/format";

interface ItemEstoqueVenda {
  produto_id: string | null;
  quantidade: number;
}

function agruparQuantidadePorProduto(itens: ItemEstoqueVenda[]): Map<string, number> {
  const qtdPorProduto = new Map<string, number>();
  for (const item of itens) {
    if (!item.produto_id) continue;
    qtdPorProduto.set(
      item.produto_id,
      (qtdPorProduto.get(item.produto_id) ?? 0) + item.quantidade
    );
  }
  return qtdPorProduto;
}

/** Valida estoque antes de registrar a venda. */
export async function validarEstoqueVenda(
  supabase: SupabaseClient,
  itens: ItemEstoqueVenda[]
): Promise<{ error: string } | { success: true }> {
  const qtdPorProduto = agruparQuantidadePorProduto(itens);
  if (qtdPorProduto.size === 0) return { success: true };

  const produtoIds = [...qtdPorProduto.keys()];
  const { data: produtos, error } = await supabase
    .from("produtos")
    .select("id, quantidade, nome")
    .in("id", produtoIds);

  if (error) return dbError(error.message, error.code);
  if (!produtos || produtos.length !== produtoIds.length) {
    return { error: "Um ou mais produtos não foram encontrados no estoque." };
  }

  for (const produto of produtos) {
    const baixar = qtdPorProduto.get(produto.id) ?? 0;
    const atual = Number(produto.quantidade);
    if (baixar > atual) {
      return {
        error: `Estoque insuficiente para ${formatItemNome(produto.nome)}. Disponível: ${atual}.`,
      };
    }
  }

  return { success: true };
}

/** Baixa estoque após venda e remove produtos zerados. */
export async function baixarEstoqueVenda(
  supabase: SupabaseClient,
  itens: ItemEstoqueVenda[]
): Promise<{ error: string } | { success: true }> {
  const qtdPorProduto = agruparQuantidadePorProduto(itens);
  if (qtdPorProduto.size === 0) return { success: true };

  const produtoIds = [...qtdPorProduto.keys()];
  const { data: produtos, error: selectError } = await supabase
    .from("produtos")
    .select("id, quantidade, nome")
    .in("id", produtoIds);

  if (selectError) return dbError(selectError.message, selectError.code);
  if (!produtos || produtos.length !== produtoIds.length) {
    return { error: "Um ou mais produtos não foram encontrados no estoque." };
  }

  for (const produto of produtos) {
    const baixar = qtdPorProduto.get(produto.id) ?? 0;
    const nova = Number(produto.quantidade) - baixar;

    if (nova < 0) {
      return {
        error: `Estoque insuficiente para ${formatItemNome(produto.nome)}.`,
      };
    }

    if (nova === 0) {
      const { error } = await supabase.from("produtos").delete().eq("id", produto.id);
      if (error) return dbError(error.message, error.code);
      continue;
    }

    const { error } = await supabase
      .from("produtos")
      .update({ quantidade: nova })
      .eq("id", produto.id);

    if (error) return dbError(error.message, error.code);
  }

  return { success: true };
}
