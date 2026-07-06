import { NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { setSessionCookie } from "@/lib/auth";
import { getDefaultUsername } from "@/lib/auth-credentials";
import { getOriginFromRequest, getRpIdFromRequest } from "@/lib/webauthn-config";
import { consumeWebAuthnChallenge } from "@/lib/webauthn-challenge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    response,
    credentialId,
    publicKey,
    counter,
  }: {
    response: AuthenticationResponseJSON;
    credentialId?: string;
    publicKey?: string;
    counter?: number;
  } = body;

  if (!response || !credentialId || !publicKey) {
    return NextResponse.json({ error: "Dados de autenticação incompletos." }, { status: 400 });
  }

  const expectedChallenge = await consumeWebAuthnChallenge("auth");
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Desafio expirado. Tente novamente." }, { status: 400 });
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOriginFromRequest(request),
    expectedRPID: getRpIdFromRequest(request),
    credential: {
      id: credentialId,
      publicKey: Buffer.from(publicKey, "base64url"),
      counter: typeof counter === "number" ? counter : 0,
      transports: ["internal", "hybrid"],
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return NextResponse.json({ error: "Digital ou Face ID não reconhecido." }, { status: 401 });
  }

  await setSessionCookie(getDefaultUsername());

  return NextResponse.json({
    success: true,
    newCounter: verification.authenticationInfo.newCounter,
  });
}
