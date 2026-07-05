# 네이버 블로그 어댑터 사양서

Draft: 2026-07-03 · 상위 문서: `SYNDICATION_ORCHESTRATOR_SPEC.md`
목적: 허브 콘텐츠를 네이버 블로그로 배포. **단, 자동 발행은 불가 — 반자동(초안 생성 + 수동 게시)이 기본안.**

---

## 1. 핵심 제약 (먼저 읽을 것)

- **네이버 블로그 "글쓰기 API"는 2020-05-06 완전 종료.** 종료 사유가 명시적으로 *"API로 광고성 글을 대량 발행하는 것을 막기 위해"* 였다. → **프로그램으로 네이버 블로그에 글을 올리는 공식 경로는 존재하지 않는다.**
- 남아 있는 네이버 Open API는 검색·데이터 조회류이며, **블로그 글쓰기(write)는 없다.**
- 블로그별 RSS는 **읽기 전용**(pull). 배포(push)에는 못 쓴다.
- 브라우저 자동화(비공식 매크로)로 우회 가능은 하나 **네이버 ToS 위반·계정 정지 위험**이 크고, 하필 이 대량-배포 유스케이스가 네이버가 API를 없앤 바로 그 대상이다.

> **판정:** 네이버는 "자동 발행 어댑터"로 만들 수 없다. **반자동(초안 자동 생성 → 사람이 게시)** 로 설계한다. 자동화 욕심은 계정 리스크로 되돌아온다(devil's advocate).

---

## 2. 채택 설계 — 반자동 초안 어댑터

오케스트레이터의 `ChannelAdapter`를 구현하되, `publish()`는 **게시가 아니라 "게시 준비물 생성"** 을 수행하고 `status: "manual-required"` 를 반환한다.

```ts
// NaverAdapter
key = "naver"; role = "spoke"; canonicalPolicy = "unsupported"; supportsUpdate = false;

async publish(item: ContentItem): Promise<PublishResult> {
  const bundle = buildNaverDraft(item);   // 아래 3장
  writeBundle(`content/naver-drafts/${item.slug}/`, bundle);
  return { channel: "naver", status: "manual-required",
           note: `초안 생성됨: content/naver-drafts/${item.slug}/ — 스마트에디터에 붙여넣어 게시` };
}
```

---

## 3. 초안 번들 (사람이 5분 안에 게시 가능하도록)

`content/naver-drafts/{slug}/` 에 생성:

| 파일 | 내용 |
|---|---|
| `title.txt` | 네이버용 제목(중복 회피 위해 허브와 부분 변형) |
| `body.html` | 스마트에디터 붙여넣기용 HTML(제한 태그만: 문단/소제목/목록/이미지 자리표시자) |
| `body.md` | 마크다운 대안(붙여넣기 편의) |
| `images/` | 순서대로 번호 매긴 이미지(hero→inline). 스마트에디터에 순서대로 업로드 |
| `tags.txt` | 태그 목록(쉼표) |
| `checklist.md` | 게시 절차 + 준수사항(하단 CTA, 원문 링크, 공개범위, 1일 1건) |

`buildNaverDraft()` 규칙:
- 스마트에디터가 허용하지 않는 태그/속성 제거, 외부 스크립트·iframe 금지.
- 이미지: 웹 경로가 아니라 **로컬 파일**로 내보내 사람이 직접 업로드(네이버는 외부 hotlink 제약).
- 본문 하단에 **허브 유도 문구**(정보형): 예) "전체 데이터·차트는 phdshawn.com에서 확인". 공개안전 스크럽 통과 문구만.
- 중복 콘텐츠 완화를 위해 제목·도입부 부분 변형(네이버는 외부 canonical 미존중이므로 본문 차별화가 유일한 수단).

---

## 4. 상태·멱등

- 자동 발행이 없으므로 시스템은 "초안 생성 여부"까지만 추적: `syndication-state.json` 에 `{ naver: { draftedAt, published: false } }`.
- 사람이 게시 후 `logNo`/URL을 상태에 수기 기록하면, 이후 재실행 시 "이미 게시됨"으로 skip.
- (선택) 게시 확인 자동화: 해당 네이버 블로그 **RSS를 폴링**해 같은 제목이 뜨면 `published: true` 로 전환 — 읽기 전용 API만 사용하므로 ToS 안전.

---

## 5. 거버넌스·리스크

- SHide 운영정책 준수: **draft-first, 1일 1공개** 상한.
- 공개안전 스크럽(내부 모델·봇명 치환, 수익화 문구 제거)을 초안 생성 전에 적용.
- **금지:** 로그인 자동화·매크로를 통한 대량 자동 게시(계정 정지·ToS 위반). 본 어댑터는 명시적으로 이를 채택하지 않는다.
- 네이버는 구글과 별개 검색 생태계 → "중복 페널티"보다 **독립 유입 채널** 관점으로 운영.

---

## 6. 구현 단계

1. `buildNaverDraft()` + 번들 라이터.
2. 오케스트레이터에 NaverAdapter(`manual-required`) 등록.
3. admin "Blog Studio"에 "네이버 초안 열기/다운로드" 액션.
4. (선택) RSS 게시확인 폴러.

## 7. 재검토 트리거

- 네이버가 향후 공식 write API를 부활시키면(현재 없음) 이 어댑터를 자동 발행으로 승격. 그 전까지 반자동 고정.
