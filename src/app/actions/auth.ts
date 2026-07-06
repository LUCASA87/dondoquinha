"use server";

import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth";
import {
  updateStoredPassword,
  validateStoredCredentials,
} from "@/lib/auth-credentials";

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
  newPassword: string
) {
  return updateStoredPassword(currentPassword, newPassword);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
