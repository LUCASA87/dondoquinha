import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getRpIdFromRequest,
  getWebAuthnDisplayName,
  getWebAuthnUserId,
  getWebAuthnUserName,
} from "@/lib/webauthn-config";
import { setWebAuthnChallenge } from "@/lib/webauthn-challenge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const rpID = getRpIdFromRequest(request);
  const options = await generateRegistrationOptions({
    rpName: "Dondoquinha",
    rpID,
    userName: getWebAuthnUserName(),
    userDisplayName: getWebAuthnDisplayName(),
    userID: Uint8Array.from(getWebAuthnUserId()),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  });

  await setWebAuthnChallenge(options.challenge, "reg");

  return NextResponse.json(options);
}
