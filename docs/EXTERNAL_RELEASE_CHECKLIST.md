# External Release Checklist (SHawn-WEB)

## 1) Deployment (Vercel)
- [ ] Login: `npx vercel login` (or use `--token`)
- [ ] Link project: `npx vercel link`
- [ ] Set env vars in Vercel project settings
- [ ] Deploy preview: `npx vercel`
- [ ] Deploy production: `npx vercel --prod`

## 2) Legal / Copyright
- [ ] Show source attribution (PubMed, arXiv, Semantic Scholar, NCBI, ENA, Europe PMC, etc.)
- [ ] Do not mirror/rehost full-text PDFs unless license explicitly allows it
- [ ] Display only metadata/abstract/snippets + canonical source links
- [ ] Respect each API Terms of Use and rate limits

## 3) Compliance / Risk Controls
- [ ] Add disclaimer: research-support tool, not medical advice
- [ ] Add privacy notice: query logs may be stored (or disable/minimize logs)
- [ ] Add abuse/rate limiting on public endpoints
- [ ] Add timeout/fallback handling for external APIs
- [ ] Add caching to reduce repeated calls and quota impact

## 4) Quality Gates
- [ ] `/papers` works end-to-end
- [ ] `/datasets` works end-to-end
- [ ] API error states render friendly messages
- [ ] Search with typo/no-result gives fallback suggestion
- [ ] External source outages do not break entire page

## 5) Recommended Minimum Before Public Launch
- [ ] Sources + licenses page
- [ ] Terms/Disclaimer page
- [ ] Privacy page
- [ ] Basic per-IP rate limit
- [ ] Error monitoring (Sentry or equivalent)
