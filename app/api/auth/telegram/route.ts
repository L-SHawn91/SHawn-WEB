import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import fs from 'node:fs/promises';
import path from 'node:path';

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_LOG_PATH = path.join(process.cwd(), 'logs', 'auth-events.jsonl');

async function appendAuthAudit(event: Record<string, unknown>) {
  try {
    await fs.mkdir(path.dirname(AUTH_LOG_PATH), { recursive: true });
    await fs.appendFile(AUTH_LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');
  } catch (error) {
    console.error('Failed to write auth audit log:', error);
  }
}

/**
 * Telegram Magic Link Authentication
 * 
 * Flow:
 * 1. User clicks "Login" on web → Opens Telegram bot
 * 2. Telegram bot sends approval request to Dr. SHawn
 * 3. Dr. SHawn approves → GCP generates JWT
 * 4. Web receives JWT → This endpoint validates and sets cookie
 */
export async function POST(req: Request) {
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      await appendAuthAudit({ ts: new Date().toISOString(), action: 'auth_failed', reason: 'invalid_token_payload', ip, userAgent });
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 400 }
      );
    }

    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify JWT from GCP
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      // Verify user_id is Dr. SHawn
      if (payload.user_id !== '7727358623') {
        await appendAuthAudit({ ts: new Date().toISOString(), action: 'auth_failed', reason: 'unauthorized_user', userId: payload.user_id, ip, userAgent });
        return NextResponse.json(
          { success: false, error: 'Unauthorized user' },
          { status: 403 }
        );
      }

      // Create response with HttpOnly cookie
      const response = NextResponse.json({ 
        success: true,
        user_id: payload.user_id,
        expires_at: payload.exp
      });

      // Set secure HttpOnly cookie
      response.cookies.set('shawn_auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400,  // 24 hours
        path: '/'
      });

      console.log(`✅ Telegram auth successful for user: ${payload.user_id}`);
      await appendAuthAudit({
        ts: new Date().toISOString(),
        action: 'auth_success',
        userId: payload.user_id,
        exp: payload.exp,
        ip,
        userAgent,
      });

      return response;

    } catch (error: any) {
      console.error('JWT verification failed:', error.message);
      
      if (error.code === 'ERR_JWT_EXPIRED') {
        await appendAuthAudit({ ts: new Date().toISOString(), action: 'auth_failed', reason: 'token_expired', ip, userAgent });
        return NextResponse.json(
          { success: false, error: 'Token expired' },
          { status: 401 }
        );
      }

      await appendAuthAudit({ ts: new Date().toISOString(), action: 'auth_failed', reason: 'jwt_verify_failed', ip, userAgent });
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error: any) {
    console.error('Telegram auth error:', error);
    await appendAuthAudit({ ts: new Date().toISOString(), action: 'auth_failed', reason: 'server_error', detail: String(error?.message || error), ip, userAgent });
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Logout endpoint
 */
export async function DELETE(req: Request) {
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const response = NextResponse.json({ success: true });
  
  // Clear cookie
  response.cookies.set('shawn_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  });

  console.log('✅ User logged out');
  await appendAuthAudit({ ts: new Date().toISOString(), action: 'logout', ip, userAgent });

  return response;
}
