import type { SupabaseClient } from "@supabase/supabase-js";
import { runDb, mapDbError, dbError } from "@/lib/db/helpers";
import { normalizeClienteNome, normalizePhone, parseClienteForm } from "@/lib/validate";
import { invalidateAfterClientesChange } from "@/lib/queries/page-cache";

async function findClienteCadastroDuplicado(
  supabase: SupabaseClient,
  nome: string,
  cpf: string | null,
  telefone: string | null,
  excludeId?: string
): Promise<string | null> {
  const nomeNorm = normalizeClienteNome(nome);
  if (nomeNorm) {
    let query = supabase.from("clientes").select("id, nome");
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) return null;
    const nomeDuplicado = data?.some(
      (cliente) => normalizeClienteNome(cliente.nome) === nomeNorm
    );
    if (nomeDuplicado) return "Já existe uma cliente com este nome.";
  }

  if (cpf) {
    let query = supabase.from("clientes").select("id").eq("cpf", cpf).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) return null;
    if (data && data.length > 0) return "Este CPF já está cadastrado.";
  }

  const telefoneDigits = telefone ? normalizePhone(telefone) : "";
  if (telefoneDigits) {
    let query = supabase.from("clientes").select("id, telefone").not("telefone", "is", null);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) return null;
    const duplicado = data?.some(
      (cliente) => normalizePhone(cliente.telefone ?? "") === telefoneDigits
    );
    if (duplicado) return "Este telefone já está cadastrado.";
  }

  return null;
}

export async function createCliente(formData: FormData) {
  try {
    const parsed = parseClienteForm(formData);
    if (!parsed.ok) return { error: parsed.error };

    const result = await runDb(async (supabase) => {
      const duplicado = await findClienteCadastroDuplicado(
        supabase,
        parsed.nome,
        parsed.cpf,
        parsed.telefone
      );
      if (duplicado) return { error: duplicado };

      const { error } = await supabase.from("clientes").insert({
        nome: parsed.nome,
        cpf: parsed.cpf,
        telefone: parsed.telefone,
        endereco: parsed.endereco,
      });
      if (error) return dbError(error.message, error.code);
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
      const duplicado = await findClienteCadastroDuplicado(
        supabase,
        parsed.nome,
        parsed.cpf,
        parsed.telefone,
        id
      );
      if (duplicado) return { error: duplicado };

      const { error } = await supabase
        .from("clientes")
        .update({
          nome: parsed.nome,
          cpf: parsed.cpf,
          telefone: parsed.telefone,
          endereco: parsed.endereco,
        })
        .eq("id", id);
      if (error) return dbError(error.message, error.code);
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
      const { data: cliente, error: fetchError } = await supabase
        .from("clientes")
        .select("nome")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) return dbError(fetchError.message, fetchError.code);
      if (!cliente) return { error: "Cliente não encontrada." };

      // Guarda o nome nas vendas antes de apagar (FK zera o cliente_id)
      const { error: nomeError } = await supabase
        .from("vendas")
        .update({ cliente_nome: cliente.nome })
        .eq("cliente_id", id);

      if (nomeError) return dbError(nomeError.message, nomeError.code);

      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) return dbError(error.message, error.code);
      return { success: true as const };
    });

    if ("success" in result && result.success) invalidateAfterClientesChange();
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}
