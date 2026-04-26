# 🖥️ SHawn-WEB: Digital Lab (v2.0)

> **SHawn Lab: Web Platform & Digital Asset Headquarters**

SHawn Lab의 공식 홈페이지(`Lab-Homepage`)와 블로그, 디지털 디자인 자산들을 관리하는 웹 프로젝트 본부입니다.

## 🌐 Assets
- **Lab-Homepage**: Next.js 기반의 고성능 웹 서비스.
- **Posts**: MDX 기반의 블로그 및 기술 아티클.
- **Sovereign Alpha Design**: 디자인 토큰 및 UI 컴포넌트 라이브러리.
- **Dashboard Route (`/dashboard`)**: SHawn ecosystem의 canonical user-facing dashboard entrypoint.

## Dashboard governance
- User-facing dashboard access must default to `SHawn-WEB` route `/dashboard`.
- `SHawn-dashboard` repo is the prototype/incubation source for dashboard-specific experiments.
- Validated dashboard behavior is promoted from `SHawn-dashboard` into this repo.
- Standalone local Vite dashboard runs are for local experiment/validation only, not the default long-term operating surface.

## 🚀 Development
```bash
# 의존성 설치 및 로컬 서버 실행
npm install
npm run dev
```

## 🚢 Production Deploy (GitHub Actions)
- `main` 브랜치 push 시 프로덕션 배포 워크플로가 실행됩니다: `.github/workflows/deploy-production.yml`
- Build gate는 Vercel secret 없이도 통과할 수 있지만, 실제 public site 반영은 아래 저장소 secret이 모두 있어야 실행됩니다.
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
  - `PRODUCTION_URL` (선택, 예: `https://phdshawn.com`)
- secret이 없으면 deploy job은 실패 대신 `Production deploy skipped` summary를 남기고 종료합니다. 이 상태에서는 GitHub의 코드만 최신이고 웹은 바뀌지 않습니다.
- secret 등록 후 GitHub Actions에서 **Deploy Production → Run workflow**로 수동 재실행하거나 `main`에 새 commit을 push합니다.
- 배포 후 스모크 테스트 경로:
  - `/invest`
  - `/invest/reports`
  - `/invest/archive`
  - `/invest/dashboard`

## 📜 Governance
- **Sovereign Alpha**: 네온 하이라이트와 다크 프리미엄 디자인 원칙 고수.
- 상세 프로토콜은 `GOVERNANCE.md`를 참조하십시오.

---
*Maintained by SHawn-Bot Creative Engine*
