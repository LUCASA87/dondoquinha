import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import { createClient } from "@/lib/supabase/client";
import { formatConnectionError } from "@/lib/format-error";
import {
  PASSKEY_ID_STORAGE,
  setStoredPasskeyId,
  getStoredPasskeyId,
  clearStoredPasskeyId,
} from "@/lib/pwa-utils";

export interface PasskeyRecord {
  credential_id: string;
  public_key: string;
  counter: number;
}

async function fetchPasskeysFromDb(): Promise<PasskeyRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_passkeys")
    .select("credential_id, public_key, counter");

  if (error) {
    throw new Error(formatConnectionError(error.message));
  }

  return data ?? [];
}

/** Há passkey cadastrada no Supabase (funciona no PWA e no navegador). */
export async function hasRegisteredPasskey(): Promise<boolean> {
  try {
    const passkeys = await fetchPasskeysFromDb();
    return passkeys.length > 0;
  } catch {
    return Boolean(getStoredPasskeyId());
  }
}

export async function canUsePasskeyLogin(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  if (!(await platformAuthenticatorIsAvailable())) return false;
  return hasRegisteredPasskey();
}

export async function canActivatePasskeyLogin(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  if (!(await platformAuthenticatorIsAvailable())) return false;
  return !(await hasRegisteredPasskey());
}

/** @deprecated use canUsePasskeyLogin */
export async function isPasskeyLoginAvailable(): Promise<boolean> {
  return canUsePasskeyLogin();
}

export async function registerPasskeyOnDevice(deviceName?: string): Promise<void> {
  const optionsRes = await fetch("/api/auth/passkey/register/options", {
    method: "POST",
    credentials: "include",
  });

  if (!optionsRes.ok) {
    const data = await optionsRes.json().catch(() => ({}));
    throw new Error(data.error || "Não foi possível iniciar o cadastro da digital.");
  }

  const options = await optionsRes.json();
  const registration = await startRegistration({ optionsJSON: options });

  const verifyRes = await fetch("/api/auth/passkey/register/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registration),
  });

  if (!verifyRes.ok) {
    const data = await verifyRes.json().catch(() => ({}));
    throw new Error(data.error || "Não foi possível salvar a digital.");
  }

  const { credential } = await verifyRes.json();
  const supabase = createClient();

  const { error } = await supabase.from("app_passkeys").upsert(
    {
      credential_id: credential.credentialId,
      public_key: credential.publicKey,
      counter: credential.counter,
      device_name: deviceName || guessDeviceName(),
    },
    { onConflict: "credential_id" }
  );

  if (error) {
    if (error.message.includes("app_passkeys")) {
      throw new Error("Tabela de login rápido não encontrada. Rode a migration 011 no Supabase.");
    }
    throw new Error(formatConnectionError(error.message));
  }

  setStoredPasskeyId(credential.credentialId);
}

export async function loginWithPasskey(): Promise<void> {
  const supabase = createClient();
  const storedId = getStoredPasskeyId();

  let passkeys = await fetchPasskeysFromDb();
  if (!passkeys.length) {
    clearStoredPasskeyId();
    throw new Error("Login do celular não ativado. Ative com sua senha primeiro.");
  }

  if (storedId) {
    const preferida = passkeys.find((p) => p.credential_id === storedId);
    if (preferida) {
      passkeys = [preferida, ...passkeys.filter((p) => p.credential_id !== storedId)];
    }
  }

  const credentialIds = passkeys.map((p) => p.credential_id);

  const optionsRes = await fetch("/api/auth/passkey/login/options", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentialIds }),
  });

  if (!optionsRes.ok) {
    const data = await optionsRes.json().catch(() => ({}));
    throw new Error(data.error || "Não foi possível iniciar o login rápido.");
  }

  const options = await optionsRes.json();
  const authentication = await startAuthentication({ optionsJSON: options });

  const passkey =
    passkeys.find((p) => p.credential_id === authentication.id) ?? passkeys[0];

  const verifyRes = await fetch("/api/auth/passkey/login/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      response: authentication,
      credentialId: passkey.credential_id,
      publicKey: passkey.public_key,
      counter: passkey.counter,
    }),
  });

  if (!verifyRes.ok) {
    const data = await verifyRes.json().catch(() => ({}));
    throw new Error(data.error || "Digital ou senha do celular não reconhecida.");
  }

  const { newCounter } = await verifyRes.json();
  setStoredPasskeyId(passkey.credential_id);

  if (typeof newCounter === "number") {
    await supabase
      .from("app_passkeys")
      .update({ counter: newCounter })
      .eq("credential_id", passkey.credential_id);
  }
}

function guessDeviceName(): string {
  if (typeof navigator === "undefined") return "Celular";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  return "Dispositivo";
}
