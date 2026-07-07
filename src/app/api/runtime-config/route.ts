import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase não configurado na Vercel." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url, key });
}
