# Investment 통합 웹 게시 추진안 (2026-02-22)

## 1) 방향 결정
- 결론: 리포트와 대시보드를 분리 운영하지 않고, `단일 운영 허브 + 전문 상세 화면` 구조로 통합.
- 허브: `/invest` (운영 시작점)
- 상세: `/market-intelligence`(리포트 상세), `/cartridges/invest`(대시보드 심화), `/market-intelligence/archive`(히스토리)

## 2) 왜 이 구조가 맞는가
- 분리 구조는 "리포트 해석"과 "실행 판단" 사이를 반복 이동하게 만들어 판단 시간이 늘어남.
- 단일 허브는 최신성/건전성/시그널 합의/후보 큐를 한 번에 제공해 의사결정 루프를 짧게 만듦.
- 상세 화면은 기능 밀도를 유지하면서 허브에서 필요 시 진입하는 2단계 구조로 유지 가능.

## 3) 정보 구조 (IA)
- Layer A: Command Center (`/invest`)
  - 신호 합의 점수, 데이터 상태, 드리프트, 연동 상태
  - KR/US 최신 리포트 스트림
  - 실행 후보 큐(종목, 신호, 점수, 이유)
- Layer B: Deep Dive
  - 리포트 뷰어(`/market-intelligence`)
  - 시그널/리밸런싱 대시보드(`/cartridges/invest`)
  - 아카이브(`/market-intelligence/archive`)

## 4) 게시/연동 파이프라인
1. `SHawn-INV`에서 리포트 생성 (`tools/run_all.py` 또는 `tools/morning_report_builder.py`).
2. `SHawn-INV/tools/publish_reports.py`가 `SHawn-WEB/public/reports` 갱신.
3. `SHawn-WEB/scripts/sync-reports-index.mjs`가 `public/reports/index.json` 재생성.
4. `SHawn-WEB` 배포(기존 Vercel 파이프라인).
5. 웹에서 `/api/reports`, `/api/invest/snapshot`를 통해 허브/상세 화면 동시 반영.

## 5) 실행 단계
### Phase 1 (완료: 2026-02-22)
- `/invest`를 카드 링크 모음에서 운영형 통합 허브로 개편.
- 대시보드 페이지 안내를 `/invest` 중심 흐름으로 정렬.

### Phase 2 (완료: 2026-02-22)
- `/market-intelligence`와 `/cartridges/invest` 상단/내부 액션을 허브 기준으로 통일.
- 허브(`/invest`)에서 대시보드 상세 섹션으로 딥링크(`focus` 파라미터) 연결.
- 허브 후보 큐에서 워치리스트 상세로 진입 시 시장/종목 문맥(`market`, `symbol`) 전달.

### Phase 3 (운영 안정화)
- 허브 지표 클릭 시 상세 화면의 해당 섹션으로 딥링크 이동.
- 주요 액션(후보 큐 변경, 모드 변경)의 이벤트 로그를 쌓아 판단-성과 루프 측정.

## 6) 운영 기준
- 허브는 "상태 확인 → 원인 점검 → 실행 후보 확정" 순서를 깨지 않도록 유지.
- 상세 화면은 분석 밀도와 역사 데이터 접근성에 집중하고, 허브 역할을 중복하지 않음.
- 리포트와 대시보드의 데이터 소스는 `public/reports/*.json` + `snapshot` 규약으로 고정.
