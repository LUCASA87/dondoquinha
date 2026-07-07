import { runDb, mapDbError, dbError } from "@/lib/db/helpers";
import { formatItemNome } from "@/lib/format";
import { invalidateAfterEstoqueChange } from "@/lib/queries/page-cache";

export async function createProduto(formData: FormData) {
  try {
    const result = await runDb(async (supabase) => {
      const nome = formatItemNome(formData.get("nome") as string);

      const { data: existente } = await supabase
        .from("produtos")
        .select("id, quantidade")
        .eq("nome", nome)
        .maybeSingle();

      if (existente) {
        const situacao =
          existente.quantidade < 1
            ? " O estoque está zerado — edite o produto e informe a nova quantidade."
            : " Edite o produto no Estoque para alterar a quantidade.";
        return {
          error: `O produto "${nome}" já está cadastrado.${situacao}`,
        };
      }

      const { error } = await supabase.from("produtos").insert({
        nome,
        codigo_sku: (formData.get("codigo_sku") as string) || null,
        quantidade: Number(formData.get("quantidade")),
        preco_custo: Number(formData.get("preco_custo")),
        preco_venda: Number(formData.get("preco_venda")),
      });

      if (error) return dbError(error.message);
      return { success: true as const };
    });

    if ("success" in result && result.success) invalidateAfterEstoqueChange();
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}

export async function updateProduto(id: string, formData: FormData) {
  try {
    const result = await runDb(async (supabase) => {
      const { error } = await supabase
        .from("produtos")
        .update({
          nome: formatItemNome(formData.get("nome") as string),
          codigo_sku: (formData.get("codigo_sku") as string) || null,
          quantidade: Number(formData.get("quantidade")),
          preco_custo: Number(formData.get("preco_custo")),
          preco_venda: Number(formData.get("preco_venda")),
        })
        .eq("id", id);

      if (error) return dbError(error.message);
      return { success: true as const };
    });

    if ("success" in result && result.success) invalidateAfterEstoqueChange();
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}

export async function deleteProduto(id: string) {
  try {
    const result = await runDb(async (supabase) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) return dbError(error.message);
      return { success: true as const };
    });

    if ("success" in result && result.success) invalidateAfterEstoqueChange();
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}
