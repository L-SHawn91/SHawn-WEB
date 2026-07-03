# Security Policy

## Supported scope

This public repository is the SHawn Lab web/portfolio surface. Public code must not expose private control-plane state, credentials, unpublished research data, private investment logic, or personal workflow logs.

## Report a vulnerability or accidental disclosure

Please do not open a public issue containing secrets, credentials, private file paths, unreleased research data, patient/sample information, or exploit details.

Use GitHub's private vulnerability reporting if available, or contact the repository owner through GitHub.

## Public boundary

The repository must not contain:

- API keys, tokens, OAuth credentials, cookies, or private keys
- `.env`, auth, or credential files
- private cloud/local paths or internal workflow logs
- raw private research data, patient/sample data, manuscripts, or unpublished project state
- live database files, generated caches, or large intermediate outputs
