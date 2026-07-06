import { cookies } from "next/headers";

const CHALLENGE_COOKIE = "dondoquinha_webauthn_ch";
const MAX_AGE_SEC = 300;

function getSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    "dondoquinha-dev-secret-altere-na-vercel"
  );
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function setWebAuthnChallenge(challenge: string, type: "reg" | "auth") {
  const payload = `${type}:${challenge}:${Date.now()}`;
  const signature = await sign(payload);
  const token = `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function consumeWebAuthnChallenge(
  expectedType: "reg" | "auth"
): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CHALLENGE_COOKIE)?.value;
  cookieStore.delete(CHALLENGE_COOKIE);

  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const expectedSignature = await sign(payload);
    if (!safeEqual(signature, expectedSignature)) return null;

    const [type, challenge, createdAtRaw] = payload.split(":");
    if (type !== expectedType || !challenge || !createdAtRaw) return null;
    if (Date.now() - Number(createdAtRaw) > MAX_AGE_SEC * 1000) return null;

    return challenge;
  } catch {
    return null;
  }
}
