"use server";

import { revalidateClientes } from "@/lib/revalidate-app";
import { createClient } from "@/lib/supabase/server";

export async function createCliente(formData: FormData) {
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidateClientes();
  return { success: true };
}

export async function getClientes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome");

  if (error) return [];
  return data;
}
