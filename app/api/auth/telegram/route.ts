import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

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
  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
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

      return response;

    } catch (error: any) {
      console.error('JWT verification failed:', error.message);
      
      if (error.code === 'ERR_JWT_EXPIRED') {
        return NextResponse.json(
          { success: false, error: 'Token expired' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error: any) {
    console.error('Telegram auth error:', error);
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

  return response;
}
