import { NextResponse } from 'next/server';

/**
 * Backward-compatible auth request endpoint.
 *
 * Old chat widgets call this endpoint and expect { session_id }.
 * We keep it alive to avoid hard failure messages on stale deployments.
 */
export async function POST() {
  const sessionId = `legacy_${Date.now().toString(36)}`;

  return NextResponse.json({
    success: true,
    session_id: sessionId,
    status: 'pending',
    message:
      'Legacy auth request accepted. Use Telegram approval + token callback (?shawn_token=...) or manual token input in chat widget.',
  });
}
