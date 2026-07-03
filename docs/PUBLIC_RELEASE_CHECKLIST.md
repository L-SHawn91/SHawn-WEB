# Public Release Checklist

Use this checklist before pushing or tagging a public release of SHawn-WEB.

## Required checks

- [ ] `git status -sb` is reviewed and only intended public changes are present.
- [ ] `npm run check:public-safety` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Critical public routes render locally or in preview (`/`, `/blog`, `/papers`, `/datasets`, `/dashboard`).
- [ ] No `.env`, token, credential, auth, cache, database, or large generated artifact is tracked.
- [ ] No private local/cloud paths, unpublished research data, private investment state, or workflow logs are present.
- [ ] License posture is explicit in `LICENSE`.
- [ ] Citation metadata exists in `CITATION.cff`.
- [ ] Public pages include research-support / no-medical-advice boundaries where relevant.

## Public positioning

SHawn-WEB is the public-facing SHawn Lab web surface. It should showcase research automation, evidence mapping, document QA, and selected public demos without exposing internal control-plane repositories or private data sources.
