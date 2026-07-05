"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProduto(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("produtos").insert({
    nome: formData.get("nome") as string,
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
      nome: formData.get("nome") as string,
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
