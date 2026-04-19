# SHawn-INV 자연어 → 명령어 변환 패턴 (KO)

목표: 텔레그램 자연어 요청을 재현 가능한 `/inv` 명령으로 정규화.

---

## 0) 기본 규칙

- 티커 미지정 시: 실행 금지, 티커 재질문
- 날짜 미지정 시 기본값:
  - backtest/compare: `from=2024-01-01`, `to=2026-02-27`
- 전략 미지정 시 기본값:
  - backtest: `strategy=ema_cross`
- 벤치마크 미지정 시:
  - US: `^GSPC`
  - KR: `^KS11`
- 수수료 미지정 시: `fees_bps=10`

---

## 1) 분석 (analyze) 패턴

1. "애플 분석해줘"
- `/inv analyze ticker=AAPL horizon=swing risk=mid`

2. "삼성전자 지금 어때?"
- `/inv analyze ticker=005930.KS horizon=swing risk=mid`

3. "테슬라 장기로 볼만해?"
- `/inv analyze ticker=TSLA horizon=long risk=mid`

4. "엔비디아 보수적으로 분석"
- `/inv analyze ticker=NVDA horizon=position risk=low`

5. "MSFT 공격적으로"
- `/inv analyze ticker=MSFT horizon=swing risk=high`

---

## 2) 백테스트 (backtest) 패턴

6. "애플 백테스트"
- `/inv backtest ticker=AAPL strategy=ema_cross from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=10`

7. "애플 RSI 전략 검증"
- `/inv backtest ticker=AAPL strategy=rsi_meanrev from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=10`

8. "마소 2023년부터 2025년말까지"
- `/inv backtest ticker=MSFT strategy=ema_cross from=2023-01-01 to=2025-12-31 benchmark=^GSPC fees_bps=10`

9. "삼전 바이앤홀드 성과"
- `/inv backtest ticker=005930.KS strategy=buy_hold from=2024-01-01 to=2026-02-27 benchmark=^KS11 fees_bps=10`

10. "수수료 25bp로 테슬라 백테스트"
- `/inv backtest ticker=TSLA strategy=ema_cross from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=25`

---

## 3) 전략 비교 (compare) 패턴

11. "애플 전략 비교해줘"
- `/inv compare ticker=AAPL from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=10`

12. "엔비디아 뭐가 제일 나아?"
- `/inv compare ticker=NVDA from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=10`

13. "삼성전자도 전략별로"
- `/inv compare ticker=005930.KS from=2024-01-01 to=2026-02-27 benchmark=^KS11 fees_bps=10`

14. "테슬라 2022~2026 비교"
- `/inv compare ticker=TSLA from=2022-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=10`

15. "애플 비교, 수수료 5bp"
- `/inv compare ticker=AAPL from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=5`

---

## 4) 한국어 키워드 매핑

- 기간
  - 단기/스윙 → `horizon=swing`
  - 중기/포지션 → `horizon=position`
  - 장기/롱텀 → `horizon=long`

- 성향
  - 보수적/안전 → `risk=low`
  - 중립/기본 → `risk=mid`
  - 공격적/고위험 → `risk=high`

- 전략
  - 이평/EMA → `strategy=ema_cross`
  - RSI/역추세 → `strategy=rsi_meanrev`
  - 바이앤홀드/보유 → `strategy=buy_hold`

---

## 5) 파서 우선순위

1. 의도 분류: analyze / backtest / compare
2. 티커 추출
3. 전략/기간/성향/수수료 추출
4. 기본값 채우기
5. 최종 명령 1줄 생성
6. 실행 전 사용자에게 정규화 결과 1줄 확인

---

## 6) 실행 전 확인 문구 템플릿

- `정규화: /inv backtest ticker=AAPL strategy=ema_cross from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=10 (이대로 실행)`

- `정규화: /inv analyze ticker=TSLA horizon=long risk=low (이대로 실행)`

---

## 7) 실패 시 고정 응답

- `미완료: 입력 파라미터가 부족합니다. 최소 ticker(필수), 목적(analyze/backtest/compare)을 지정해주세요.`
- `미완료: 날짜 형식은 YYYY-MM-DD만 허용됩니다.`
