# SHawn-INV Telegram Command Templates

Use these prompts directly in Telegram with clawbot.

## 1) Single ticker analyze

```text
/inv analyze ticker=AAPL horizon=swing risk=mid
실행요구: tools/analyze_ticker.py 실행 후 JSON 근거로만 답변.
```

Expected output:
- signal / confidence
- thesis 2~3 lines
- risk 1~2 lines
- provenance (source_used, asof)

## 2) Backtest

```text
/inv backtest ticker=AAPL strategy=ema_cross from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=10
실행요구: backtest_strategy.py 결과(JSON) 기준으로 CAGR/MDD/Sharpe/Sortino/alpha만 요약.
```

## 3) Strategy compare

```text
/inv compare ticker=AAPL from=2024-01-01 to=2026-02-27 benchmark=^GSPC fees_bps=10
실행요구: buy_hold / ema_cross / rsi_meanrev 비교 후 best strategy와 이유 3줄.
```

## 4) Strict evidence mode

```text
반드시 실행 증거(toolUse/toolResult 또는 명령/결과 JSON)가 있을 때만 완료라고 답해.
없으면 미완료 + 원문 에러로 보고.
```
