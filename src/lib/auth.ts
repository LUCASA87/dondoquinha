import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth-session";

export {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  verifySessionToken,
  validateCredentials,
} from "@/lib/auth-session";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export async function setSessionCookie(username: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
