import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? null;
  return NextResponse.json({ googleClientId });
}
