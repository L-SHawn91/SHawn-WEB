# Mac 메인 + Linux 워커 통합운영 Runbook

## 문서 목적
본 문서는 SHawn-WEB/리포지터리의 **Mac 메인 노드와 Linux 워커 노드**를 함께 운영할 때의 표준 절차를 정리한다.

## 1) 역할분리 (RACI)

### Mac 메인 (Primary Node)
- **Owner**: 전체 운영 조율, 배포, Gateway 상태 총괄
- **책임**:
  - `openclaw gateway` 런타임 실행 상태 관리
  - Linux 워커 노드 등록/승인/재연결 승인
  - 정책 파일(`dmPolicy`, `allowlist`) 최종 반영
  - 배포 브랜치 머지 및 릴리즈 판단

### Linux 워커 (Worker Node)
- **Owner**: 데이터 처리/동기화/배치 작업 실행
- **책임**:
  - 연구 데이터 수집, 분석 작업 스케줄 실행
  - 메트릭 수집 및 장애 로그 적재
  - Mac 메인과 결과 동기화
  - 하드웨어/디스크/권한 이슈 조기 보고

### RACI 예시
- **R(Responsible)**: 실제 실행자
- **A(Accountable)**: 최종 승인/결정권자
- **C(Consulted)**: 사전 검토자
- **I(Informed)**: 현황 공유 대상

| 작업 | Mac 메인 | Linux 워커 |
|---|---|---|
| OpenClaw Gateway 재시작 | A/R | I |
| 장기 배치 파이프라인 실행 | I | A/R |
| 노드 페어링 승인 | A/R | I |
| 승인 대기 이슈 대응 | R | C |
| 데이터 동기화 확인 | A/R | R |

## 2) 장애복구

### 2-1) Gateway 장애
1. 상태 점검: `openclaw gateway status`
2. 프로세스 비정상 시: `openclaw gateway restart`
3. 재시작 후 다시 `openclaw status`로 노드 접속 상태 확인
4. Linux 워커가 미인증/재접속 반복 시: `nodes status`로 장치 목록 확인 후 재페어링 수행

### 2-2) Linux 워커 미응답
1. 네트워크/프로세스 상태 확인
2. SSH 터널/방화벽 규칙 점검
3. 워커에서 서비스 재기동
4. Mac에서 `nodes pending`/`nodes describe <node>`로 승인/상태 확인
5. 동일 문제 반복 시 워커 재페어링(쌍 바인딩) 수행

### 2-3) 동기화 실패
1. 최근 동기화 로그/체크섬 확인
2. 대상 디렉토리 수동 동기화 테스트 실행
3. 실패 파일만 재전송
4. `allowlist` 누락 또는 경로 권한 변경 여부 확인

### 2-4) 승인(approval) 큐 적체
1. `nodes pending` 확인 후 우선순위 정리
2. 안전성 검토 후 `nodes approve <id>` 또는 `nodes reject <id>`
3. 30분 이내 재평가 안 되는 항목은 수동 리트라이

## 3) 배포순서

### 3-1) 사전 체크
- `openclaw status`로 전체 노드 상태 확인
- 브랜치 최신화 및 환경 변수 최신 여부 확인
- DM/allowlist 정책 변경 사항 사전 검토

### 3-2) Mac 기준 배포 순서
1. `openclaw status`로 게이트웨이 및 승인 대상 점검
2. gateway 정상 시 상태 유지 (`openclaw gateway status`)
3. 코드 배포/빌드 실행
4. 배포 후 `openclaw status` 재확인
5. Linux 워커 대상 서비스 재시작 및 동기화 트리거

### 3-3) 롤백
1. 배포 직후 치명적 오류 발생 시 즉시 이전 태그/커밋으로 revert
2. gateway 상태를 정상으로 유지하며 Linux 워커에 이전 버전 재동기화
3. 장애원인 로그(실행 로그 + 승인 로그) 보존

## 4) 데이터동기화

### 4-1) 동기화 원칙
- 작업 산출물은 **Mac이 메타 제어**, Linux가 실제 계산/생성
- 대량 데이터는 증분 동기화
- `last_seen`/`checksum` 기반 정합성 확인

### 4-2) 동기화 예시
- Mac에서 Linux로 전송
  - 작업 입력 데이터, 정책 변경사항, 승인 리스트
- Linux에서 Mac로 회수
  - 분석 결과, 배치 로그, 에러 리포트

### 4-3) 충돌 해결
1. 타임스탬프 + SHA256 우선 비교
2. Mac이 최신 규칙 집행
3. 충돌 시 수동 병합 후 감사 로그에 사유 기재

## 5) 권한정책 (dmPolicy / allowlist)

### 5-1) dmPolicy
- 데이터 접근 범위, 세션 지속시간, 실행 권한의 기본 규칙을 문서화
- 원칙: 최소 권한 원칙(least privilege)
- 워커 작업은 필요한 경로만 접근, 읽기/쓰기 구분

### 5-2) allowlist
- 외부 호출 대상(엔드포인트/API/장치/허용 IP)만 등록
- 운영 중 `allowlist`는 변경이력 로그(승인자, 시간, 사유) 유지
- 정기 점검 시 미사용 엔트리 제거

### 5-3) 운영 규칙
- 새 기기/서비스 추가 시:
  1. 임시 등록(짧은 유효 기간)
  2. 승인 검증
  3. 정상 동작 확인
  4. 영구 등록 전 1회 장애리허설

## 6) 일일 운영체크리스트

- [ ] Mac: `openclaw status`, `openclaw gateway status` 확인
- [ ] Linux 워커 `nodes describe <node>`로 리소스/연결 상태 점검
- [ ] 승인 큐(`nodes pending`) 0건 or 처리 완료 상태 점검
- [ ] 당일 신규/수정 파일 동기화 상태 검증
- [ ] dmPolicy/allowlist 변경사항 리뷰(미승인 변경 없음)
- [ ] 장애 알림 임계치 확인 및 로그 아카이브
- [ ] 배포 후 30분 모니터링: CPU/메모리/대기열 지연 확인
- [ ] 다음 날 운영 인수인계용 이슈 로그 정리

## 7) 실행명령 예시

> 실제 CLI 하위 명령은 설치된 OpenClaw 버전에 따라 상이할 수 있음

```bash
# 기본 상태/서비스 점검
openclaw status
openclaw gateway status
openclaw gateway restart

# 노드/페어링/승인 처리(예시)
openclaw nodes status
openclaw nodes pending
openclaw nodes describe <node-id>
openclaw nodes approve <approval-id>
openclaw nodes reject <approval-id>

# 장치/연결 점검(예시)
openclaw devices list
openclaw devices describe <device-id>
openclaw devices ping <device-id>

# 승인 큐 정리(예시)
openclaw approvals list
openclaw approvals history --since 24h
openclaw approvals clear --dry-run
```

## 8) 참고 운영 프로토콜
- 모든 변경은 `README`/운영일지에 기록
- 장애 대응은 원인분석, 영향도, 조치, 재발방지 항목 4단계로 기록
- 보안상 민감한 토큰/키는 로그/문서에 직접 노출하지 않음