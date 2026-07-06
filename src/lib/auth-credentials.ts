import { createClient } from "@/lib/supabase/server";
import { hashPassword, verifyPassword } from "@/lib/auth-password";

export function getDefaultUsername(): string {
  return (process.env.AUTH_USER?.trim() || "dondoquinha").toLowerCase();
}

export function getDefaultPassword(): string {
  return process.env.AUTH_PASSWORD?.trim() || "203189";
}

async function ensureCredentials() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_credenciais")
    .select("usuario, senha_hash")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) return data;

  const senha_hash = await hashPassword(getDefaultPassword());
  const { error: insertError } = await supabase.from("app_credenciais").insert({
    id: 1,
    usuario: getDefaultUsername(),
    senha_hash,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { usuario: getDefaultUsername(), senha_hash };
}

export async function validateStoredCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const normalizedUser = username.trim().toLowerCase();
  const normalizedPass = password.trim();

  if (normalizedUser !== getDefaultUsername().toLowerCase()) {
    return false;
  }

  try {
    const creds = await ensureCredentials();
    if (await verifyPassword(normalizedPass, creds.senha_hash)) {
      return true;
    }
  } catch {
    // Tabela ainda não criada ou erro de conexão — usa fallback abaixo
  }

  return normalizedPass === getDefaultPassword();
}

export async function syncStoredPassword(password: string) {
  try {
    const supabase = await createClient();
    const senha_hash = await hashPassword(password.trim());
    await supabase.from("app_credenciais").upsert({
      id: 1,
      usuario: getDefaultUsername(),
      senha_hash,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // ignora se a tabela ainda não existir
  }
}

export async function updateStoredPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string; success?: boolean }> {
  const atual = currentPassword.trim();
  const nova = newPassword.trim();

  if (nova.length < 4) {
    return { error: "A nova senha deve ter pelo menos 4 caracteres." };
  }

  if (atual === nova) {
    return { error: "A nova senha deve ser diferente da atual." };
  }

  try {
    const creds = await ensureCredentials();
    const valid = await verifyPassword(atual, creds.senha_hash);
    if (!valid) {
      return { error: "Senha atual incorreta." };
    }

    const supabase = await createClient();
    const senha_hash = await hashPassword(nova);
    const { error } = await supabase
      .from("app_credenciais")
      .update({
        senha_hash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) return { error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao trocar senha.";
    return { error: message };
  }
}
