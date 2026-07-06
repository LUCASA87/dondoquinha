"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatItemNome } from "@/lib/format";

export async function createProduto(formData: FormData) {
  const supabase = await createClient();
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

  revalidatePath("/estoque");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateProduto(id: string, formData: FormData) {
  const supabase = await createClient();

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

  revalidatePath("/estoque");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteProduto(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/estoque");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getProdutos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("nome");

  if (error) return [];
  return data;
}
