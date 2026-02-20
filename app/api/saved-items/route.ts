import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server-auth";
import { listSavedItems, removeItem, saveItem, SavedItemType } from "@/lib/saved-items-store";

function parseType(value: string | null): SavedItemType | undefined {
  if (value === "paper" || value === "dataset") return value;
  return undefined;
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = parseType(request.nextUrl.searchParams.get("type"));
  const items = await listSavedItems(userId, type);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const type = parseType(body?.type ?? null);
  if (!type || !body?.itemId || !body?.title || !body?.url) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await saveItem({
    userId,
    type,
    itemId: String(body.itemId),
    title: String(body.title),
    url: String(body.url),
    source: body?.source ? String(body.source) : undefined,
    year: typeof body?.year === "number" ? body.year : undefined,
    savedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const type = parseType(body?.type ?? null);
  const itemId = body?.itemId ? String(body.itemId) : "";
  if (!type || !itemId) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await removeItem(userId, type, itemId);
  return NextResponse.json({ success: true });
}
