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
} from "@/lib/pwa-utils";

export async function isPasskeyLoginAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  if (!(await platformAuthenticatorIsAvailable())) return false;
  return Boolean(getStoredPasskeyId());
}

export async function registerPasskeyOnDevice(deviceName?: string): Promise<void> {
  const optionsRes = await fetch("/api/auth/passkey/register/options", {
    method: "POST",
  });

  if (!optionsRes.ok) {
    const data = await optionsRes.json().catch(() => ({}));
    throw new Error(data.error || "Não foi possível iniciar o cadastro da digital.");
  }

  const options = await optionsRes.json();
  const registration = await startRegistration({ optionsJSON: options });

  const verifyRes = await fetch("/api/auth/passkey/register/verify", {
    method: "POST",
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
  const credentialId = getStoredPasskeyId();
  if (!credentialId) {
    throw new Error("Nenhuma digital cadastrada neste aparelho.");
  }

  const supabase = createClient();
  const { data: passkey, error: fetchError } = await supabase
    .from("app_passkeys")
    .select("credential_id, public_key, counter")
    .eq("credential_id", credentialId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(formatConnectionError(fetchError.message));
  }
  if (!passkey) {
    localStorage.removeItem(PASSKEY_ID_STORAGE);
    throw new Error("Digital não encontrada. Entre com senha e ative novamente.");
  }

  const optionsRes = await fetch("/api/auth/passkey/login/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentialId }),
  });

  if (!optionsRes.ok) {
    const data = await optionsRes.json().catch(() => ({}));
    throw new Error(data.error || "Não foi possível iniciar o login rápido.");
  }

  const options = await optionsRes.json();
  const authentication = await startAuthentication({ optionsJSON: options });

  const verifyRes = await fetch("/api/auth/passkey/login/verify", {
    method: "POST",
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
    throw new Error(data.error || "Digital ou Face ID não reconhecido.");
  }

  const { newCounter } = await verifyRes.json();

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
