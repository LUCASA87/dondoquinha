const USER_ID = "dondoquinha";

export function getWebAuthnUserId(): Uint8Array {
  const encoded = new TextEncoder().encode(USER_ID);
  return new Uint8Array(encoded.buffer.slice(0));
}

export function getWebAuthnUserName(): string {
  return (process.env.AUTH_USER?.trim() || USER_ID).toLowerCase();
}

export function getWebAuthnDisplayName(): string {
  return "Dondoquinha Moda e Beleza";
}

export function getRpIdFromRequest(request: Request): string {
  if (process.env.WEBAUTHN_RP_ID?.trim()) {
    return process.env.WEBAUTHN_RP_ID.trim();
  }
  if (process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID?.trim()) {
    return process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID.trim();
  }

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.split(":")[0]?.trim();

  if (host && host !== "localhost") {
    return host;
  }

  return "localhost";
}

export function getOriginFromRequest(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}
