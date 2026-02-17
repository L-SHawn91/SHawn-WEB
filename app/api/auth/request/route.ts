import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'SHawn-Brain 인증 연동은 비활성화되었습니다.',
      deprecated: true,
    },
    { status: 410 }
  );
}
