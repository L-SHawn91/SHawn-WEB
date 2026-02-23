# 🖥️ SHawn-WEB: Digital Lab (v2.0)

> **SHawn Lab: Web Platform & Digital Asset Headquarters**

SHawn Lab의 공식 홈페이지(`Lab-Homepage`)와 블로그, 디지털 디자인 자산들을 관리하는 웹 프로젝트 본부입니다.

## 🌐 Assets
- **Lab-Homepage**: Next.js 기반의 고성능 웹 서비스.
- **Posts**: MDX 기반의 블로그 및 기술 아티클.
- **Sovereign Alpha Design**: 디자인 토큰 및 UI 컴포넌트 라이브러리.

## 🚀 Development
```bash
# 의존성 설치 및 로컬 서버 실행
npm install
npm run dev
```

## 🚢 Production Deploy (GitHub Actions)
- `main` 브랜치 push 시 프로덕션 배포 워크플로가 실행됩니다: `.github/workflows/deploy-production.yml`
- 저장소 시크릿에 아래 값을 반드시 설정해야 합니다.
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
  - `PRODUCTION_URL` (선택, 예: `https://phdshawn.com`)  
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
