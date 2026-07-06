import { scrypt } from "@noble/hashes/scrypt.js";
import {
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, dkLen: 64 } as const;

function randomSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomSalt();
  const derived = scrypt(
    utf8ToBytes(password.trim()),
    salt,
    SCRYPT_PARAMS
  );
  return `${bytesToHex(salt)}:${bytesToHex(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = hexToBytes(saltHex);
  const expected = hexToBytes(hashHex);
  const derived = scrypt(
    utf8ToBytes(password.trim()),
    salt,
    SCRYPT_PARAMS
  );

  return timingSafeEqualBytes(derived, expected);
}
