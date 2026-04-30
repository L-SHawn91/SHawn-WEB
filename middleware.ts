import { NextRequest, NextResponse } from 'next/server';

/**
 * Sliding-window rate limiter for search API routes.
 * Prevents a single IP from hammering upstream APIs (PubMed, S2, OpenAlex).
 *
 * Limits (per IP):
 *   /api/papers/*   — 20 requests / 60 seconds
 *   /api/datasets/* — 15 requests / 60 seconds
 */

interface Window {
  count: number;
  windowStart: number;
}

const ipWindows = new Map<string, Window>();
const WINDOW_MS = 60_000;

const LIMITS: Record<string, number> = {
  '/api/papers': 20,
  '/api/datasets': 15,
};

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to search API routes
  const limitKey = Object.keys(LIMITS).find((prefix) => pathname.startsWith(prefix));
  if (!limitKey) return NextResponse.next();

  const ip = getClientIp(request);
  const windowKey = `${ip}:${limitKey}`;
  const now = Date.now();
  const limit = LIMITS[limitKey]!;

  const win = ipWindows.get(windowKey);
  if (!win || now - win.windowStart > WINDOW_MS) {
    ipWindows.set(windowKey, { count: 1, windowStart: now });
    return NextResponse.next();
  }

  win.count += 1;
  if (win.count > limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before searching again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((WINDOW_MS - (now - win.windowStart)) / 1000)),
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/papers/:path*', '/api/datasets/:path*'],
};
