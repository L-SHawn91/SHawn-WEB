import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const proto = forwardedProto || url.protocol.replace(':', '') || 'https';
  const origin = `${proto}://${host}`;

  const callbackTemplate = `${origin}/?shawn_token={JWT_TOKEN}`;

  return NextResponse.json({
    origin,
    callbackTemplate,
    telegramMessageTemplate: [
      '✅ 인증이 승인되었습니다.',
      '',
      `아래 링크를 눌러 웹 로그인 완료:`,
      callbackTemplate,
      '',
      '(JWT_TOKEN 자리에 실제 토큰을 URL-인코딩하여 넣으세요.)',
    ].join('\n'),
  });
}
