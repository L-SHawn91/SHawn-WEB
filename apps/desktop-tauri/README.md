# OpenClaw Desktop (Tauri MVP)

## 개요
React + Vite + Tauri(v2) 기반 데스크톱 MVP입니다.

- 화면 3개: 대시보드 / 프로젝트보드 / OpenClaw 채팅패널
- 공통 UI: 상단 내비게이션 + 상태바
- Mock 데이터 기반으로 다음을 표시
  - Mac 메인 + Linux 워커 상태 카드
  - GitHub PR / Issue / Branch 보드

## 실행 방법

### 1) 사전 설치
- Node.js 18+
- pnpm
- Rust toolchain (`rustup`)
- macOS의 경우 Xcode Command Line Tools

### 2) 의존성 설치
```bash
pnpm install
```

### 3) 개발 실행
웹만 실행:
```bash
pnpm run dev:web
```

Tauri 개발 실행:
```bash
pnpm run dev
```

### 4) 빌드
웹 정적 빌드:
```bash
pnpm run build:web
```

Tauri 패키징 빌드:
```bash
pnpm run build
```

### 5) 품질 점검
```bash
pnpm run lint
pnpm run typecheck
```

(루트 `SHawn-WEB/`에서 실행할 때)
```bash
pnpm run typecheck
pnpm run build:web
pnpm run desktop:build
```

---

## 문제해결 (빌드 실패 시)

### A. `tauri.conf.json` 스키마 오류
증상 예시:
- `"identifier" is a required property`
- `Additional properties are not allowed ('package', 'tauri', 'distDir' ...)`

원인:
- Tauri v1 형식 설정을 v2 CLI에서 읽을 때 발생

조치:
- `src-tauri/tauri.conf.json`을 v2 스키마로 유지해야 함
  - `$schema`: `https://schema.tauri.app/config/2`
  - 루트 키: `productName`, `version`, `identifier`
  - `build.frontendDist` 사용 (`distDir` 아님)
  - `app.windows` 사용 (`tauri.windows` 아님)

### B. macOS 빌드 도구 누락
증상:
- Rust/Cargo 또는 clang 관련 오류

조치:
```bash
xcode-select --install
rustup update
```

### C. `cargo metadata ... No such file or directory (os error 2)`
증상:
- `failed to run 'cargo metadata' command`
- `No such file or directory (os error 2)`

원인:
- Rust/Cargo가 설치되지 않았거나 PATH에 없음

조치:
```bash
# Cargo 설치 여부 확인
cargo --version

# 미설치 시
rustup-init
source "$HOME/.cargo/env"

# 최신화
rustup update
```

### D. 의존성/캐시 꼬임
조치:
```bash
pnpm install --force
pnpm run build:web
pnpm run build
```

### E. Tailwind `content` 경고
증상:
- `The 'content' option in your Tailwind CSS configuration is missing or empty.`

조치:
- `tailwind.config.cjs`에 `content` 경로가 설정되어 있는지 확인

---

## 참고
- 목업 데이터는 `src/data/mockData.ts`에서 수정할 수 있습니다.
