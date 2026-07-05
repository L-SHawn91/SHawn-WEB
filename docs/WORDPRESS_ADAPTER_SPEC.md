# WordPress 어댑터 사양서

Draft: 2026-07-03 · 상위 문서: `SYNDICATION_ORCHESTRATOR_SPEC.md`
목적: 허브 콘텐츠를 **3개 운영 WordPress.com 사이트에 자동 발행**(create/update). 스포크 어댑터 중 유일하게 완전 자동화 가능.

---

## 1. 대상·매핑

lane → WordPress.com 사이트(레지스트리: `SHide-BLOG/WORDPRESS_SITES.md`).

| lane | 사이트 | WP.com site ID |
|---|---|---|
| ai | shawnaiintelligence.wordpress.com | 255886652 |
| assets | shawnassets.wordpress.com | 255885793 |
| bio | shawnbiohub.wordpress.com | 255887381 |

---

## 2. 인증·엔드포인트 (중요: WordPress.com 방식)

이 사이트들은 **WordPress.com 호스팅**이라, 자기호스팅용 `wp/v2 + Application Password`가 아니라 **WordPress.com REST API + OAuth2 Bearer**를 쓴다.

- OAuth2 앱 등록: `developer.wordpress.com/apps` → client id/secret, redirect.
- 토큰 발급(계정 소유자 1회 승인): `https://public-api.wordpress.com/oauth2/token`.
- 글 생성: `POST https://public-api.wordpress.com/rest/v1.1/sites/{siteId}/posts/new`
- 글 수정: `POST .../sites/{siteId}/posts/{postId}` (WP.com은 PUT 대신 POST)
- 미디어 업로드: `POST .../sites/{siteId}/media/new`
- 대안(동일 인증): `POST https://public-api.wordpress.com/wp/v2/sites/{siteId}/posts` (wp/v2 호환 레이어)

> **선행 실측(必):** 각 사이트 플랜에서 위 write 엔드포인트가 실제로 허용되는지 1건 draft 생성으로 확인. (무료 플랜도 대체로 REST write 가능하나 플랜/설정 편차 존재 — `wordpress_api_verification` 기록처럼 draft 생성 테스트로 확정.)

토큰은 사이트별로 다를 수 있음 → `WP_TOKEN_AI` / `WP_TOKEN_ASSETS` / `WP_TOKEN_BIO` (env/시크릿). 레포 커밋 금지(`credential_bridge_safety`).

---

## 3. 어댑터 구현

```ts
// WordPressAdapter
key = "wordpress"; role = "spoke";
canonicalPolicy = "point-to-hub"; supportsUpdate = true;

async publish(item: ContentItem, ctx): Promise<PublishResult> {
  const site = SITE_BY_LANE[item.lane];               // siteId + token
  const prior = ctx.state.get(item.packageId, "wordpress", site.lane); // 멱등
  const media = await ensureMedia(site, item.images); // 업로드 or 재사용
  const body = {
    title: variantTitle(item),                        // 중복 회피용 부분 변형
    content: renderWpHtml(item, media, ctx.hubUrl),    // 본문 HTML + 하단 허브 CTA
    tags: item.tags.join(","),
    categories: item.category,
    status: ctx.draftFirst ? "draft" : "publish",
    // canonical: SEO 설정 지원 시 item.canonicalUrl 주입 (4장)
  };
  const res = prior?.postId
    ? await wpPost(site, `/posts/${prior.postId}`, body)     // update
    : await wpPost(site, `/posts/new`, body);                // create
  return { channel:"wordpress", externalId:String(res.ID), url:res.URL,
           status: prior?.postId ? "updated" : "created" };
}
```

---

## 4. canonical / 중복 콘텐츠 (핵심 리스크)

- 허브(phdshawn.com)에 먼저 발행 → `item.canonicalUrl` 확정 → WP 본문 canonical을 그 URL로.
- **제약:** WordPress.com에서 **외부 rel=canonical 주입은 플랜/SEO 설정에 따라 제한**될 수 있다(무료 플랜은 커스텀 head 제어 불가). canonical을 못 넣으면 구글 중복 리스크가 남는다.
  - 완화: 제목·도입부 **부분 변형**(`variantTitle`, 리드 문단 재작성), 허브 우선 색인 후 **시차 발행**, 필요 시 WP 글은 요약+"전체 보기(허브)" 형태로 축약.
- 하단 CTA는 **정보형**("전체 데이터·차트는 phdshawn.com") — 공개안전 스크럽이 노골적 수익화 문구를 제거하므로 준수.

---

## 5. 이미지 처리

- 1안(권장): `media/new`로 **각 사이트에 업로드** 후 반환 URL 사용 → hotlink 차단·핫링크 정책 무관, 견고.
- 2안(MVP): phdshawn.com `/shide-blog-assets/...` **핫링크** — 구현 간단하나 도메인 의존.
- 업로드 결과(mediaId/URL)를 상태에 캐시해 재발행 시 재업로드 방지.

---

## 6. 멱등·상태

`syndication-state.json`:
```json
{ "<packageId>": { "wordpress": { "ai": { "postId": 34, "url": "...", "mediaIds": [/*...*/], "publishedAt": "..." } } } }
```
- postId 있으면 update, 없으면 create. 삭제 감지 시 재생성.

---

## 7. 거버넌스·레이트

- **draft-first 기본.** SHide 운영정책: probe 기간 **사이트당 1일 1공개** 상한, 승인 후 publish 승격.
- 발행 전 공개안전 게이트(`public-safety-scan`, `check:forbidden-terms`, i18n) 통과 필수.
- 실패/429 지수 백오프 재시도. 사이트별 독립(`allSettled`).

---

## 8. 구현 단계

1. OAuth2 앱 등록 + 사이트별 토큰 발급, write 엔드포인트 **실측(draft 1건)**.
2. `renderWpHtml`(마크다운→HTML + CTA) + `variantTitle`.
3. `ensureMedia`(업로드/캐시).
4. create/update 멱등 + 상태 매핑.
5. draft-first → 승인 → publish 승격 플로우(admin "Blog Studio" 연동).

## 9. 열린 결정

- 이미지: 사이트 업로드(권장) vs 핫링크(MVP) 중 시작점.
- canonical 불가 시: 축약본 전략 vs 전문 게시+본문 차별화 중 택.
- publish 승인 주체·시점(자동 vs admin 수동 승인).
