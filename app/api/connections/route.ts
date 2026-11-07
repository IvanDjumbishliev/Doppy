import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, listConnectedAccounts } from "@/lib/social-connections";

export async function GET() {
  const sessionId = cookies().get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ connections: [] });
  }

  try {
    const connections = await listConnectedAccounts(sessionId);
    return NextResponse.json({ connections });
  } catch (error) {
    console.error("Unable to load Doppy social connections.", error);
    return NextResponse.json(
      { error: "Unable to load connected accounts. Check the Supabase setup." },
      { status: 503 },
    );
  }
}
