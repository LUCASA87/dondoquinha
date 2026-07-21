"use server";

import { cache } from "react";
import { revalidateClientes } from "@/lib/revalidate-app";
import { getSupabase } from "@/lib/supabase/data";

export async function createCliente(formData: FormData) {
  const supabase = getSupabase();

  const { error } = await supabase.from("clientes").insert({
    nome: formData.get("nome") as string,
    cpf: (formData.get("cpf") as string).replace(/\D/g, ""),
    telefone: (formData.get("telefone") as string) || null,
    endereco: (formData.get("endereco") as string) || null,
  });

  if (error) return { error: error.message };

  revalidateClientes();
  return { success: true };
}

export async function updateCliente(id: string, formData: FormData) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("clientes")
    .update({
      nome: formData.get("nome") as string,
      cpf: (formData.get("cpf") as string).replace(/\D/g, ""),
      telefone: (formData.get("telefone") as string) || null,
      endereco: (formData.get("endereco") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateClientes();
  return { success: true };
}

export async function deleteCliente(id: string) {
  const supabase = getSupabase();

  const { data: cliente, error: fetchError } = await supabase
    .from("clientes")
    .select("nome")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!cliente) return { error: "Cliente não encontrada." };

  const { error: nomeError } = await supabase
    .from("vendas")
    .update({ cliente_nome: cliente.nome })
    .eq("cliente_id", id);

  if (nomeError) return { error: nomeError.message };

  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidateClientes();
  return { success: true };
}

export const getClientes = cache(async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome");

  if (error) return [];
  return data;
});
