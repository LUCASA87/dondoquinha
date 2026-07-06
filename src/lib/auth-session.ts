export const SESSION_COOKIE = "dondoquinha_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    "dondoquinha-dev-secret-altere-na-vercel"
  );
}

function getAuthUser(): string {
  return (process.env.AUTH_USER?.trim() || "dondoquinha").toLowerCase();
}

function getAuthPassword(): string {
  return process.env.AUTH_PASSWORD?.trim() || "203189";
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(username: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const payload = `${username.toLowerCase()}:${expiresAt}`;
  const signature = await signPayload(payload);
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return false;

    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const expectedSignature = await signPayload(payload);

    if (!safeEqual(signature, expectedSignature)) return false;

    const [username, expiresAtRaw] = payload.split(":");
    if (!username || !expiresAtRaw) return false;
    if (!safeEqual(username, getAuthUser())) return false;
    if (Date.now() > Number(expiresAtRaw)) return false;

    return true;
  } catch {
    return false;
  }
}

export function validateCredentials(username: string, password: string): boolean {
  const userOk = safeEqual(username.trim().toLowerCase(), getAuthUser());
  const passOk = safeEqual(password.trim(), getAuthPassword());
  return userOk && passOk;
}
