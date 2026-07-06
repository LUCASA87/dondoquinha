"use server";

import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth";
import {
  preparePasswordChange,
  validateStoredCredentials,
} from "@/lib/auth-credentials";
import { isAuthenticated } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!(await validateStoredCredentials(username, password))) {
    return { error: "Usuário ou senha incorretos." };
  }

  await setSessionCookie(username);
  return { success: true as const };
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
  storedHash?: string | null
) {
  if (!(await isAuthenticated())) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  return preparePasswordChange(currentPassword, newPassword, storedHash);
}

/** Valida senha padrão do .env — sem crypto, seguro para Edge. */
export async function checkDefaultPasswordAction(password: string) {
  if (!(await isAuthenticated())) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const { getDefaultPassword } = await import("@/lib/auth-credentials");
  return { valid: password.trim() === getDefaultPassword() };
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
