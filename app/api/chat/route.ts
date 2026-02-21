import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { loadKnowledgeSnapshot, searchKnowledge } from '@/lib/chat-knowledge';

type ChatRequest = {
  prompt?: string;
  message?: string;
};

function formatFeatureOverview(snapshot: Awaited<ReturnType<typeof loadKnowledgeSnapshot>>) {
  const grouped = snapshot.capabilities.reduce<Record<string, string[]>>((acc, c) => {
    const key = c.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(`- ${c.name}: ${c.description} (${c.route})`);
    return acc;
  }, {});

  return [
    `SHawn Lab 현재 기능 요약 (업데이트: ${snapshot.generatedAt})`,
    '',
    '[Core]',
    ...(grouped.core || []),
    '',
    '[Lane]',
    ...(grouped.lane || []),
    '',
    '[System/API]',
    ...(grouped.system || []),
  ]
    .filter(Boolean)
    .join('\n');
}

function formatSearchResult(query: string, result: ReturnType<typeof searchKnowledge>) {
  const capLines = result.caps.map((c) => `- ${c.name}: ${c.description} (${c.route})`);
  const postLines = result.posts.map((p) => `- ${p.title}: ${p.summary || '요약 없음'} (${p.path})`);

  return [
    `질문: "${query}" 관련 정보입니다.`,
    '',
    '[관련 기능]',
    ...(capLines.length ? capLines : ['- 관련 기능을 찾지 못했습니다.']),
    '',
    '[관련 콘텐츠]',
    ...(postLines.length ? postLines : ['- 관련 콘텐츠를 찾지 못했습니다.']),
    '',
    '필요하면 위 항목 중 특정 기능(예: papers/datasets/market) 실행형으로 바로 안내해드리겠습니다.',
  ].join('\n');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequest;
    const prompt = String(body.prompt || body.message || '').trim();

    if (!prompt) {
      return NextResponse.json({ role: 'system', content: '질문을 입력해주세요.' }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId();
    const snapshot = await loadKnowledgeSnapshot();

    const needsOverview = /전체|전체기능|기능|무엇|뭐할|설명|overview|capability/i.test(prompt);

    if (!userId) {
      const guest = [
        '현재 게스트 모드입니다. 텔레그램 인증 후 개인화/실행형 기능을 더 강하게 사용할 수 있습니다.',
        '',
        needsOverview ? formatFeatureOverview(snapshot) : formatSearchResult(prompt, searchKnowledge(snapshot, prompt)),
        '',
        '인증 방법: Telegram에서 승인 후 /api/auth/telegram 으로 토큰 교환 → shawn_auth 쿠키 발급',
      ].join('\n');

      return NextResponse.json({ role: 'assistant', content: guest, authenticated: false });
    }

    const content = needsOverview
      ? formatFeatureOverview(snapshot)
      : formatSearchResult(prompt, searchKnowledge(snapshot, prompt));

    return NextResponse.json({
      role: 'assistant',
      content,
      authenticated: true,
      userId,
      knowledgeUpdatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error('[chat] error:', error);
    return NextResponse.json({ role: 'system', content: '챗봇 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
