# SHawnbio 분리/이관 계획 (Phase 1)

## 1) papers/datasets 의존성 맵 (현재 구조)

### A. 프론트 라우트
- `/papers` → `app/papers/page.tsx`
  - 호출 API
    - `POST /api/papers/search-parallel`
    - `POST /api/related` (related 미리보기)
    - `GET /api/auth/me` (로그인 상태 확인)
    - `GET/POST/DELETE /api/saved-items` (paper 저장/해제)
  - 내부 공통 의존
    - `apiFetch` from `lib/data-source/client.ts`

- `/datasets` → `app/datasets/page.tsx`
  - 호출 API
    - `POST /api/datasets/search`
    - `POST /api/related` (related 미리보기)
  - 내부 공통 의존
    - `apiFetch` from `lib/data-source/client.ts`

### B. API 라우트
- `POST /api/papers/search-parallel` → `app/api/papers/search-parallel/route.ts`
  - 내부 의존
    - `lib/search/queryPlanner.ts`
  - 외부 소스
    - PubMed (NCBI E-utilities)
    - arXiv API
    - Semantic Scholar Graph API
    - Crossref
    - OpenAlex

- `POST /api/datasets/search` → `app/api/datasets/search/route.ts`
  - 외부 소스
    - HuggingFace, Kaggle, NCBI, ENA, EuropePMC
    - Data.gov, data.europa.eu
    - Zenodo, Dryad, Dataverse, Figshare
    - GitHub, OpenML, Crossref, OpenAlex, CNGB

- `POST /api/related` → `app/api/related/route.ts`
  - 외부 소스
    - PubMed, OpenAlex, (dataset일 때) EuropePMC

- `GET /api/auth/me` → `app/api/auth/me/route.ts`
  - 내부 의존
    - `lib/server-auth.ts` (쿠키 JWT 검증)

- `GET/POST/DELETE /api/saved-items` → `app/api/saved-items/route.ts`
  - 내부 의존
    - `lib/server-auth.ts`
    - `lib/saved-items-store.ts` (state/saved-items.json 파일 저장)

### C. 공통 네트워크 유틸
- `lib/data-source/client.ts` → `apiFetch`
- `lib/data-source/runtime.ts` → `NEXT_PUBLIC_SHAWNBRAIN_API_BASE_URL` 기반 URL 해석

---

## 2) SHawnbio 네이밍 기준 라우트 설계안

### 권장 URL 네임스페이스
- 허브: `/bio`
- papers: `/bio/papers`
- datasets: `/bio/datasets`

### 단계적 이관 전략 (최소 리스크)
1. **Phase 1 (이번 배치)**
   - `/bio` 허브 추가
   - `/bio/papers`, `/bio/datasets`를 alias(redirect)로 제공
   - 기존 `/papers`, `/datasets` 유지
2. **Phase 2**
   - 실제 구현 파일을 `app/bio/...` 하위로 이동 또는 공통 컴포넌트화
   - `/papers`, `/datasets`는 301 또는 내부 redirect로 레거시 경로화
3. **Phase 3**
   - API도 필요 시 `/api/bio/papers/search`, `/api/bio/datasets/search` 형태로 정리
   - 기존 API endpoint는 호환 계층으로 유지 후 점진 제거

---

## 3) 1차 코드 반영 내역 (최소 침습)

- `app/bio/page.tsx` 추가
  - SHawnbio Hub 페이지 생성
  - `/bio/papers`, `/bio/datasets` 진입 링크 제공

- `app/bio/papers/page.tsx` 추가
  - `redirect('/papers')` alias 경로

- `app/bio/datasets/page.tsx` 추가
  - `redirect('/datasets')` alias 경로

> 기존 papers/datasets 구현 및 API는 변경하지 않아 회귀 위험을 최소화함.
