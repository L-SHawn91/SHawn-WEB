import { getAuthenticatedUserId } from "@/lib/server-auth";

const DEFAULT_ADMIN_USER_ID = "7727358623";

function parseAdminUserIdsFromEnv(): string[] {
  const raw = String(process.env.ADMIN_USER_IDS || "").trim();
  if (!raw) return [DEFAULT_ADMIN_USER_ID];

  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return ids.length ? ids : [DEFAULT_ADMIN_USER_ID];
}

export function isAdminUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const allowList = parseAdminUserIdsFromEnv();
  return allowList.includes(userId);
}

export async function getAuthenticatedAdminUserId(): Promise<string | null> {
  const userId = await getAuthenticatedUserId();
  return isAdminUserId(userId) ? userId : null;
}
