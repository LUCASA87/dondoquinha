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

/**
 * Devolve ao estoque os itens de uma venda.
 * Se o produto tinha sido apagado ao zerar, recria pelo nome/descrição.
 * Chamar ANTES de apagar a venda (precisa dos venda_itens).
 */
export async function devolverEstoqueVenda(
  supabase: SupabaseClient,
  vendaId: string
): Promise<{ error: string } | { success: true }> {
  const { data: itens, error } = await supabase
    .from("venda_itens")
    .select("produto_id, descricao, quantidade, preco_unitario, preco_custo")
    .eq("venda_id", vendaId);

  if (error) return dbError(error.message, error.code);
  if (!itens?.length) return { success: true };

  for (const item of itens) {
    const qtd = Number(item.quantidade);
    if (qtd <= 0) continue;

    if (item.produto_id) {
      const { data: produto } = await supabase
        .from("produtos")
        .select("id, quantidade")
        .eq("id", item.produto_id)
        .maybeSingle();

      if (produto) {
        const { error: upError } = await supabase
          .from("produtos")
          .update({ quantidade: Number(produto.quantidade) + qtd })
          .eq("id", produto.id);
        if (upError) return dbError(upError.message, upError.code);
        continue;
      }
    }

    const nome = formatItemNome(String(item.descricao || "PRODUTO"));
    const { data: existente } = await supabase
      .from("produtos")
      .select("id, quantidade")
      .eq("nome", nome)
      .maybeSingle();

    if (existente) {
      const { error: upError } = await supabase
        .from("produtos")
        .update({ quantidade: Number(existente.quantidade) + qtd })
        .eq("id", existente.id);
      if (upError) return dbError(upError.message, upError.code);
      continue;
    }

    const { error: insError } = await supabase.from("produtos").insert({
      nome,
      quantidade: qtd,
      preco_venda: Number(item.preco_unitario),
      preco_custo: Number(item.preco_custo ?? 0),
    });
    if (insError) return dbError(insError.message, insError.code);
  }

  return { success: true };
}
