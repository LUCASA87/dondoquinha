import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getRpIdFromRequest } from "@/lib/webauthn-config";
import { setWebAuthnChallenge } from "@/lib/webauthn-challenge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const credentialId = typeof body.credentialId === "string" ? body.credentialId : undefined;

  const options = await generateAuthenticationOptions({
    rpID: getRpIdFromRequest(request),
    userVerification: "required",
    allowCredentials: credentialId
      ? [{ id: credentialId, transports: ["internal", "hybrid"] }]
      : undefined,
  });

  await setWebAuthnChallenge(options.challenge, "auth");

  return NextResponse.json(options);
}
