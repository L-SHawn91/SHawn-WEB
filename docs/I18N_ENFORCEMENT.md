# I18N Enforcement Policy

- Primary languages: Korean (`ko`) and English (`en`).
- Investment surfaces must support runtime language switching:
  - `/invest`
  - `/market-intelligence`
  - `/market-intelligence/archive`
  - `/cartridges/invest`
  - `/invest/search`
- All newly changed `app/**/page.tsx` files are CI-checked by `npm run check:i18n`.
- A changed page must include language wiring (`useLanguage`, `useI18n`, or `translations[...]`).
- Only exceptional pages may use `i18n-exempt` comment with explicit rationale.
