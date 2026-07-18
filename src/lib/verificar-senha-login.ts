"use client";

import { checkDefaultPasswordAction } from "@/app/actions/auth";
import { verifyPassword } from "@/lib/auth-password";
import { createClient } from "@/lib/supabase/client";
import { formatConnectionError } from "@/lib/format-error";

export async function verificarSenhaLogin(
  senha: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const senhaTrim = senha.trim();
  if (!senhaTrim) {
    return { ok: false, error: "Digite a senha de login." };
  }

  try {
    const supabase = createClient();
    const { data: credenciais, error: fetchError } = await supabase
      .from("app_credenciais")
      .select("senha_hash")
      .eq("id", 1)
      .maybeSingle();

    if (fetchError) {
      if (fetchError.message.includes("app_credenciais")) {
        return {
          ok: false,
          error: "Tabela de senhas não encontrada. Rode a migration 008 no Supabase.",
        };
      }
      return { ok: false, error: formatConnectionError(fetchError.message) };
    }

    const senhaHash = credenciais?.senha_hash ?? null;

    if (senhaHash) {
      const valida = await verifyPassword(senhaTrim, senhaHash);
      if (!valida) {
        return { ok: false, error: "Senha incorreta." };
      }
      return { ok: true };
    }

    const result = await checkDefaultPasswordAction(senhaTrim);
    if ("error" in result && result.error) {
      return { ok: false, error: result.error };
    }
    if (!result.valid) {
      return { ok: false, error: "Senha incorreta." };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao validar senha.";
    return { ok: false, error: formatConnectionError(message) };
  }
}
