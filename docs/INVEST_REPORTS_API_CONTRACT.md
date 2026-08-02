# SHawn-WEB Invest Reports API Contract

SHawn-WEB consumes SHawn-INV report exports as a read-only Assets surface. SHawn-INV remains the canonical report engine; SHawn-WEB must not recalculate scores, place orders, or reinterpret reports as investment advice.

## Public safety boundary

All `/invest` pages and `/api/reports` consumers must keep the content as reference material:

- Korean disclaimer: `교육·해설용 참고 자료이며 투자 조언이 아닙니다.`
- English disclaimer: `For education and commentary only, not investment advice.`
- `content_class` must be `reference`.
- Generated reports must not expose raw secrets, local paths, source enum values, or internal artifact filenames.

## Report JSON shape

Each exported report JSON should include:

```json
{
  "schema_version": "market_digest.web.v1",
  "content_class": "reference",
  "market": "KR",
  "generated_at": "2026-07-06T08:30:00+09:00",
  "meta": {
    "market": "KR",
    "date": "2026-07-06",
    "time": "08:30",
    "timestamp": "2026-07-06T08:30:00+09:00",
    "title": "KR Market Radar",
    "avg_score": 0,
    "coverage_mode": "shawn-inv-web-export"
  },
  "summary": {
    "market_regime": "시장 관찰 모드",
    "signal_confidence": 0,
    "data_coverage": 1,
    "risk_notes": []
  },
  "reports": [],
  "compliance": {
    "disclaimer": "교육·해설용 참고 자료이며 투자 조언이 아닙니다. 실제 투자 판단은 사용자의 책임입니다.",
    "no_trade_instruction": true
  }
}
```

## `/api/reports`

`GET /api/reports` reads `public/reports/index.json` and returns:

```json
{
  "items": [],
  "total": 0,
  "offset": 0,
  "limit": 50,
  "hasMore": false,
  "nextOffset": null,
  "contract": {
    "schema_version": "market_digest.web.index.v1",
    "content_class": "reference",
    "disclaimer": "For education and commentary only, not investment advice."
  }
}
```

Supported query parameters:

- `type=KR|US`
- `date=YYYY-MM-DD`
- `q=<text>`
- `offset=<number>`
- `limit=<number>`

## Forbidden public fields/phrases

Public JSON/HTML/UI must not contain:

- API keys, tokens, `.env`, local paths such as `/home/...`
- raw source names such as `yahoo_query2`, `polygon`, `newsapi`
- internal artifact keys such as `source_snapshot_v0`, `score_table_v0`, `risk_gate_table_v0`, `content_pack_v0`
- trading-instruction phrasing such as direct buy/sell recommendations, target-price promises, stop-loss instructions, guaranteed returns, or position-sizing directives

Use reader-facing labels instead: `시장 상황 점수`, `데이터 근거`, `위험 점검`, `가격 범위 확인 필요`, `지연시세/프록시`, `집중 감시`, and `긍정 신호 우세`.
