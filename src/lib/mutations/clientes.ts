import { runDb, mapDbError, dbError } from "@/lib/db/helpers";
import { invalidateAfterClientesChange } from "@/lib/queries/page-cache";

export async function createCliente(formData: FormData) {
  try {
    const result = await runDb(async (supabase) => {
    const { error } = await supabase.from("clientes").insert({
      nome: formData.get("nome") as string,
      cpf: (formData.get("cpf") as string).replace(/\D/g, ""),
      telefone: (formData.get("telefone") as string) || null,
      endereco: (formData.get("endereco") as string) || null,
    });
    if (error) return dbError(error.message);
    return { success: true as const };
  });

    if ("success" in result && result.success) invalidateAfterClientesChange();
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}

export async function updateCliente(id: string, formData: FormData) {
  try {
    const result = await runDb(async (supabase) => {
    const { error } = await supabase
      .from("clientes")
      .update({
        nome: formData.get("nome") as string,
        cpf: (formData.get("cpf") as string).replace(/\D/g, ""),
        telefone: (formData.get("telefone") as string) || null,
        endereco: (formData.get("endereco") as string) || null,
      })
      .eq("id", id);
    if (error) return dbError(error.message);
    return { success: true as const };
  });

    if ("success" in result && result.success) invalidateAfterClientesChange();
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}

export async function deleteCliente(id: string) {
  try {
    const result = await runDb(async (supabase) => {
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) return dbError(error.message);
    return { success: true as const };
  });

    if ("success" in result && result.success) invalidateAfterClientesChange();
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}
