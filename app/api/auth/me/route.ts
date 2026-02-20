import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server-auth";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, userId });
}
