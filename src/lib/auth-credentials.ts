import { getSupabase } from "@/lib/supabase/data";
import { hashPassword, verifyPassword } from "@/lib/auth-password";

export function getDefaultUsername(): string {
  return (process.env.AUTH_USER?.trim() || "dondoquinha").toLowerCase();
}

export function getDefaultPassword(): string {
  return process.env.AUTH_PASSWORD?.trim() || "203189";
}

async function fetchStoredHash(): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_credenciais")
    .select("senha_hash")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.senha_hash ?? null;
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

  // Caminho rápido: sem Supabase e sem scrypt
  if (normalizedPass === getDefaultPassword()) {
    return true;
  }

  try {
    const hash = await fetchStoredHash();
    if (!hash) return false;
    return verifyPassword(normalizedPass, hash);
  } catch {
    return false;
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

  const valid = await validateStoredCredentials(getDefaultUsername(), atual);
  if (!valid) {
    return { error: "Senha atual incorreta." };
  }

  try {
    const supabase = getSupabase();
    const senha_hash = await hashPassword(nova);
    const { error } = await supabase.from("app_credenciais").upsert({
      id: 1,
      usuario: getDefaultUsername(),
      senha_hash,
      updated_at: new Date().toISOString(),
    });

    if (error) return { error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao trocar senha.";
    return { error: message };
  }
}
