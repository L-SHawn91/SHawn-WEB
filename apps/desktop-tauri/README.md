# OpenClaw Desktop (Tauri MVP)

## 개요
React + Vite + Tauri로 구성한 데스크톱 MVP입니다.

- 화면 3개: 대시보드 / 프로젝트보드 / OpenClaw 채팅 패널
- Mock 데이터 기반으로 다음을 표시
  - Mac 메인 + Linux 워커 상태 카드
  - GitHub PR / Issue / Branch 보드

## 실행 방법

사전 설치
- Node.js 18+
- Rust + Tauri CLI가 동작 가능한 환경

의존성 설치
```bash
pnpm install
```

개발 실행 (웹)
```bash
pnpm run dev:web
```

Tauri 개발 실행
```bash
pnpm run dev
```

웹 정적 빌드
```bash
pnpm run build:web
```

Tauri 빌드
```bash
pnpm run build
```

정적 타입/린트
```bash
pnpm run typecheck
pnpm run lint
```

## 참고
- 개발 상태 점검용으로 `src/data/mockData.ts`를 수정해 목업 데이터를 변경할 수 있습니다.
