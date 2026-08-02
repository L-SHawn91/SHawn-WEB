import { NextResponse } from "next/server";
import { normalizeReaderUpdateSubmission } from "@/lib/reader-updates";

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestWindows = new Map<string, { count: number; startedAt: number }>();

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const previous = requestWindows.get(ip);
  if (!previous || now - previous.startedAt >= WINDOW_MS) {
    requestWindows.set(ip, { count: 1, startedAt: now });
    return false;
  }

  previous.count += 1;
  return previous.count > MAX_REQUESTS_PER_WINDOW;
}

function getConfiguredWebhook() {
  const value = process.env.READER_UPDATES_WEBHOOK_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProtocol || new URL(request.url).protocol.replace(":", "");
    return originUrl.host === host && originUrl.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const submission = normalizeReaderUpdateSubmission(await request.json().catch(() => null));
  if (!submission) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  const webhook = getConfiguredWebhook();
  if (!webhook) {
    return NextResponse.json({ error: "intake_not_configured" }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const bearerToken = process.env.READER_UPDATES_WEBHOOK_BEARER_TOKEN?.trim();

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SHawn-LAB-reader-updates/1.0",
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      body: JSON.stringify({
        type: "reader_update_request",
        email: submission.email,
        interests: submission.interests,
        receivedAt: new Date().toISOString(),
        source: "shawn-web",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "delivery_unavailable" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "delivery_unavailable" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
