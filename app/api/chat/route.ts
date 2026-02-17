import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      role: 'system',
      content: 'SHawn-Brain 연동 채팅은 비활성화되었습니다. Market Intelligence 기능을 이용해주세요.',
      deprecated: true,
    },
    { status: 410 }
  );
}
