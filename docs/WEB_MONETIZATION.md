# 웹(phdshawn.com) 수익화 가이드

Draft: 2026-07-05 · 대상: SHawn-WEB (self-hosted Next.js / Vercel)
전제: phdshawn.com은 **본인 소유 사이트**라 광고·제휴·스크립트를 자유롭게 넣을 수 있음
(워드프레스닷컴 무료 사이트와 달리). SHide 원칙: 수익화는 L4 게이트, **공시 필수**,
공개면 신뢰도 유지.

---

## 1. 지금 구현된 것 (이 세션)

| 파일 | 역할 |
|---|---|
| `components/monetization/adsense.tsx` | `<AdSenseScript>`(로더) + `<AdSlot slot="..."/>`(광고 유닛). **미설정 시 아무것도 렌더 안 함** |
| `public/ads.txt` | AdSense 검증용. 퍼블리셔 ID 교체 필요 |
| `components/monetization/affiliate.tsx` | `<AffiliateLink>`(rel=sponsored) + `<AffiliateDisclosure>`(공시 배너) |

전부 **env/설정 없으면 무해(inert)** 하게 만들어 커밋·배포해도 안전.

### 붙이는 법 (AdSense)

1. AdSense 계정 승인 → 퍼블리셔 ID(`ca-pub-…`) 발급.
2. Vercel env: `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…`
3. `public/ads.txt`의 `pub-0000…`를 실제 ID로 교체.
4. `app/layout.tsx` `<body>`에 `<AdSenseScript/>` 1회 추가.
5. 광고 위치(예: 블로그 본문 하단)에 `<AdSlot slot="1234567890" />`.

### 붙이는 법 (제휴)

- 제휴 링크 있는 글 상단에 `<AffiliateDisclosure/>` 1개.
- 링크는 `<AffiliateLink href="…">텍스트</AffiliateLink>` (자동으로 `rel="sponsored nofollow noopener"` + "광고" 마커).

---

## 2. "애드센스 말고" — 노출(트래픽) 기반 수익화 대안

수익화를 트래픽/노출로 하려면 크게 3계열이 있음.

### A. 다른 디스플레이 광고 네트워크 (AdSense 대체/상위)

| 네트워크 | 진입 조건 | 특징 |
|---|---|---|
| **AdSense** | 낮음(승인만) | 표준·범용. RPM 낮은 편 |
| **Media.net** | 낮음 | Yahoo/Bing 컨텍스트 광고. AdSense 대안·병행 |
| **Ezoic** | 낮음(문턱 거의 없음) | AI 최적화로 AdSense보다 RPM↑ 흔함. 초기 단계 적합 |
| **Mediavine** | **월 5만 세션** | 고RPM. 트래픽 커지면 이전 대상 |
| **Raptive(AdThrive)** | **월 10만 PV** | 최상위 RPM. 대형 트래픽용 |

→ 실무 경로: **초기엔 AdSense 또는 Ezoic → 5만/10만 세션 넘으면 Mediavine/Raptive로 이전**. 코드상으론 `<AdSlot>` 자리를 네트워크 스크립트로 바꾸는 수준이라 교체 쉬움.

### B. 제휴(affiliate) — 트래픽을 커미션으로

노출 대비 수익이 광고보다 높을 수 있음(특히 구매의도 트래픽).

| 프로그램 | 지역/대상 | 비고 |
|---|---|---|
| **쿠팡 파트너스** | 한국, 전품목 | 국내 트래픽 수익화의 사실상 표준. **공시 문구 의무** |
| **Amazon Associates** | 글로벌 | 도서·기기(연구/랩 관련 자연스러움) |
| 도구·SaaS 제휴 | 글로벌 | AI 도구·논문 도구 등 콘텐츠 주제와 정합 |

→ 이미 `<AffiliateLink>`/`<AffiliateDisclosure>`로 구현됨. 콘텐츠 맥락에 맞는 링크만 삽입.

### C. 스폰서/네이티브 — authority가 쌓인 뒤

트래픽·권위가 붙으면 **직접 스폰서 글/브랜드 딜**이 단가 최고. 단 `no_private_contracts` 게이트·공시 준수 필요. 초기 단계 아님.

### (참고) 네이버 애드포스트

**네이버 블로그 채널 전용** 수익화라 phdshawn.com(웹)엔 해당 없음. 네이버 스포크를 운영하면 그쪽에서 별도로 켜는 것.

---

## 3. 냉정한 우선순위 (devil's advocate)

- **저트래픽에서 광고 RPM은 미미.** 노출 수익은 트래픽의 함수라, 지금은 **SEO로 트래픽을 키우는 게 선행**. 광고를 먼저 도배해도 수익은 안 나고 신뢰도만 깎임.
- **연구자 authority 브랜드 상충.** 광고 밀도가 높으면 컨설팅·구독 같은 고단가 레버를 갉아먹음. 광고는 **본문 하단·글 사이 1~2개**로 절제.
- **방금 SHawn AI가 ToS 정지** — 공격적 수익화의 플랫폼 리스크 실사례. self-hosted 웹은 정지 리스크가 없지만, 품질·정책 준수는 동일하게 중요.

**권장 순서:** SEO로 트래픽↑ → Ezoic/AdSense(절제) + 맥락 제휴(쿠팡/Amazon) 병행 → 5만 세션에서 Mediavine 이전 → authority 붙으면 스폰서·컨설팅.

---

## 4. 배선 패치 (프로덕션 `origin/main` 기준 — fast-forward 후 적용)

> 로컬이 최신화된 뒤 아래 2개 파일에 총 ~4줄만 추가하면 배선 완료. env 없으면
> 여전히 무해(inert)하므로, 지금 넣어도 승인 전까진 광고가 안 뜸.

### 4-1. `app/layout.tsx` — 로더 1회 로드

import 블록에 추가:
```tsx
import { AdSenseScript } from "@/components/monetization/adsense";
```
`<Analytics gaId={...} />` 바로 아래에 추가(이미 있는 `<SpeedInsights />` 근처):
```tsx
            <Analytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || ""} />
            <AdSenseScript />
            <SpeedInsights />
```

### 4-2. `app/blog/[slug]/page.tsx` — 본문 하단 인아티클 광고

import에 추가:
```tsx
import { AdSlot } from "@/components/monetization/adsense";
```
본문 prose div(`<MDXRemote source={post.content} />`가 든 `bw-prose` div)가 닫힌
직후, `<RelatedPosts ...>` 앞에 삽입:
```tsx
      </div>
      {/* in-article ad: 본문과 관련글 사이, 절제된 위치 */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INARTICLE || ""} className="my-10" />

      <RelatedPosts
```

### 4-3. env (Vercel)

```
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT_INARTICLE=1234567890   # AdSense 대시보드의 광고 유닛 slot id
```
그리고 `public/ads.txt`의 `pub-0000…`를 실제 ID로 교체 → 재배포.

### 4-4. 검증

- env 미설정 상태로 배포 → 광고 자리 비어있고 레이아웃 정상(무해 확인).
- env 설정 후 → 본문 하단에 광고 1개 노출, `/ads.txt` 200 확인, AdSense 대시보드에 노출 집계.

## 5. 다음 구현 후보

- 위 4번 배선 적용(승인 후).
- 관련 글 하단 **맥락 제휴 블록**(`<AffiliateDisclosure/>` + `<AffiliateLink/>`).
- (선택) Ezoic 스크립트용 `<AdSlot>` 대체 어댑터.
- 이메일/뉴스레터 캡처(전환형, 별도) — 노출 수익과 병행 시 LTV 최대.
