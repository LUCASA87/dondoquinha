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
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!(await validateStoredCredentials(username, password))) {
    return { error: "Usuário ou senha incorretos." };
  }

  await setSessionCookie(username);
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
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
