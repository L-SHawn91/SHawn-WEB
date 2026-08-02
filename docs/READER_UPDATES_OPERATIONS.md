# Reader Updates & Measurement Operations

## What is implemented

- Vercel Analytics and Speed Insights render in the root layout.
- GA4 loads only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` has a valid `G-...` value. The legacy `NEXT_PUBLIC_GOOGLE_ANALYTICS` name remains a fallback.
- Reader requests use `POST /api/reader-updates`. The browser never receives the delivery URL or bearer token.
- The form collects an email and one or more reader-selected interests: new writing, report updates, or research/content collaboration.
- The browser request must include the current site `Origin`; direct cross-origin and headerless requests are rejected.
- The public surface uses reader/editorial wording rather than operational or commercial framing.

## Production activation

Set these **Production** environment variables in Vercel, then redeploy:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
READER_UPDATES_WEBHOOK_URL=https://<operator-controlled-receiver>/...
READER_UPDATES_WEBHOOK_BEARER_TOKEN=<long-random-secret>
```

The receiver must:

1. Accept HTTPS `POST` JSON with a 2xx response.
2. Validate the optional Bearer token before accepting data.
3. Store only the fields needed to acknowledge/update the reader.
4. Avoid retaining raw requests or email addresses in application logs.
5. Implement confirmation and opt-out handling before sending recurring email.

A non-2xx or timeout results in a safe failure to the browser; the email is not logged by SHawn-WEB.

## Analytics events

- `home_search_submitted`: selected lane and query length only; no search text.
- `reader_update_submitted`: selected-interest count only; no email address.

Use GA4/Vercel dashboards for aggregate trend checks. Do not use event analytics to identify or profile individual readers.

## Editorial collaboration boundary

Any external support, paid research work, product mention, or other partnership must be reviewed case-by-case before publication. Keep the following boundaries:

- Editorial conclusions remain independent from support relationships.
- Bio claims retain source attribution and evidence limits.
- Asset material remains educational/commentary, not individualized investment advice.
- Do not add display ad scripts or undisclosed product links to the global layout.

## Verification after deployment

1. Open `/robots.txt` and `/sitemap.xml`; assert the deployed canonical domain appears.
2. Check Vercel Analytics is receiving a page view.
3. Check GA4 Realtime after opening the site if a measurement ID was configured.
4. Submit a controlled test email; confirm the receiver accepts it once and that the email does not appear in Vercel function logs.
5. Exercise the form’s unavailable and rate-limit paths in a preview environment.
