import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getRpIdFromRequest } from "@/lib/webauthn-config";
import { setWebAuthnChallenge } from "@/lib/webauthn-challenge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const credentialIds: string[] = Array.isArray(body.credentialIds)
    ? body.credentialIds.filter((id: unknown) => typeof id === "string")
    : typeof body.credentialId === "string"
      ? [body.credentialId]
      : [];

  const options = await generateAuthenticationOptions({
    rpID: getRpIdFromRequest(request),
    userVerification: "required",
    allowCredentials: credentialIds.length
      ? credentialIds.map((id) => ({
          id,
          transports: ["internal", "hybrid"],
        }))
      : undefined,
  });

  await setWebAuthnChallenge(options.challenge, "auth");

  return NextResponse.json(options);
}
