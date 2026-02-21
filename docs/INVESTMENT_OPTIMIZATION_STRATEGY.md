# SHawnbrain Investment Optimization Strategy

## Current issues observed
1. Index values (KOSPI/KOSDAQ/S&P/NASDAQ) can drift from real market values.
2. Investment pages are fragmented (`/market-intelligence`, `/market-intelligence/archive`, `/cartridges/invest`).
3. Users need one clear canonical flow for reports vs decision dashboard.

## What was applied now
- `/api/invest/snapshot` now tries live quotes from Yahoo Finance quote API first.
- Fallback to static baseline when external quote fetch fails.
- Provenance includes quote source and refresh rule for transparency.
- UX consolidation hint added:
  - `/cartridges/invest` shows canonical hub guidance to `/market-intelligence`.
  - `/market-intelligence` links back to dashboard.

## Recommended architecture
- Canonical IA:
  - `Market Intelligence` = report ingestion + archive + source-of-truth timeline
  - `Investment Dashboard` = scoring, signals, rebalance simulation
- Keep both routes but make intent explicit and cross-link strongly.

## Open-source references to adopt
1. **react-query / TanStack Query**: stale-while-revalidate for quote/report freshness.
2. **TradingView Lightweight Charts**: stable and fast index/signal charts.
3. **Apache ECharts**: multi-axis macro + factor visualizations.
4. **OpenBB** (concept/reference): normalized market data interface patterns.
5. **Backtrader / vectorbt**: strategy replay/backtest pipeline references.

## Model stack references
- Market summarization / event explanation:
  - GPT-4.1/4o class
  - Claude Sonnet class
  - Gemini 2.x class
- Quant signal QA fallback local mode:
  - Llama 3.1 via Ollama (lower quality, privacy-first)

## Next iteration backlog
1. Multi-provider quote redundancy (Yahoo + Stooq + fallback cache)
2. Minute-level cache with timestamp pill on UI
3. Single `/invest` shell route with tabs (Reports / Dashboard / Archive)
4. Benchmark-relative scoring explainability panel
5. Alert rules: drift detector when live quote deviates from cached value > threshold
