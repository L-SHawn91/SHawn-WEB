# SHawnbrain Repo Ownership (정리)

## 원칙
- 투자 도메인 로직(지표 계산, 시그널, 리포트 엔진): **SHawn-INV**
- 웹 표현/UI/통합 허브: **SHawn-WEB**

## 현재 적용
- `SHawn-WEB /api/invest/snapshot`은 `SHAWN_INV_SNAPSHOT_URL`이 설정되면 해당 엔드포인트로 프록시합니다.
- 설정이 없을 때만 SHawn-WEB 내부 fallback 로직을 사용합니다.

## 권장 운영
1. SHawn-INV에서 snapshot API를 정본으로 운영
2. SHawn-WEB은 프록시/표시 역할만 수행
3. 투자 알고리즘 변경은 SHawn-INV에서만 진행
