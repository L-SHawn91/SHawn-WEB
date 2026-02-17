import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'SHawn-Brain 인증 폴링은 비활성화되었습니다.',
      deprecated: true,
    },
    { status: 410 }
  );
}
