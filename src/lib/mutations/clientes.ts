import { runDb, mapDbError, dbError } from "@/lib/db/helpers";
import { parseClienteForm } from "@/lib/validate";
import { invalidateAfterClientesChange } from "@/lib/queries/page-cache";

export async function createCliente(formData: FormData) {
  try {
    const parsed = parseClienteForm(formData);
    if (!parsed.ok) return { error: parsed.error };

    const result = await runDb(async (supabase) => {
      const { error } = await supabase.from("clientes").insert({
        nome: parsed.nome,
        cpf: parsed.cpf,
        telefone: parsed.telefone,
        endereco: parsed.endereco,
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
    const parsed = parseClienteForm(formData);
    if (!parsed.ok) return { error: parsed.error };

    const result = await runDb(async (supabase) => {
      const { error } = await supabase
        .from("clientes")
        .update({
          nome: parsed.nome,
          cpf: parsed.cpf,
          telefone: parsed.telefone,
          endereco: parsed.endereco,
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
