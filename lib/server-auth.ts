import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const token = cookies().get("shawn_auth")?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = payload.user_id;
    return typeof userId === "string" ? userId : null;
  } catch {
    return null;
  }
}
