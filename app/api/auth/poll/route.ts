import { NextResponse } from 'next/server';

/**
 * Backward-compatible polling endpoint for stale chat widgets.
 *
 * We return pending instead of 410 so users don't see deprecation errors.
 * Modern flow uses /api/auth/telegram with token callback.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');

  return NextResponse.json({
    session_id: sessionId,
    status: 'pending',
    message:
      'Use Telegram token callback (?shawn_token=...) or manual token auth in chat widget. Legacy polling is kept for compatibility.',
    deprecated: true,
  });
}
