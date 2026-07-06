import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isAuthenticated } from "@/lib/auth";
import { getOriginFromRequest, getRpIdFromRequest } from "@/lib/webauthn-config";
import { consumeWebAuthnChallenge } from "@/lib/webauthn-challenge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const body = await request.json();
  const expectedChallenge = await consumeWebAuthnChallenge("reg");

  if (!expectedChallenge) {
    return NextResponse.json({ error: "Desafio expirado. Tente novamente." }, { status: 400 });
  }

  const rpID = getRpIdFromRequest(request);
  const origin = getOriginFromRequest(request);

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Não foi possível ativar o login rápido." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  return NextResponse.json({
    success: true,
    credential: {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
    },
  });
}
