"use server";

import { cache } from "react";
import { revalidateEstoque } from "@/lib/revalidate-app";
import { getSupabase } from "@/lib/supabase/data";
import { formatItemNome } from "@/lib/format";

export async function createProduto(formData: FormData) {
  const supabase = getSupabase();
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

  if (error) return { error: error.message };

  revalidateEstoque();
  return { success: true };
}

export async function updateProduto(id: string, formData: FormData) {
  const supabase = getSupabase();

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

  if (error) return { error: error.message };

  revalidateEstoque();
  return { success: true };
}

export async function deleteProduto(id: string) {
  const supabase = getSupabase();

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidateEstoque();
  return { success: true };
}

export const getProdutos = cache(async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("nome");

  if (error) return [];
  return data;
});
