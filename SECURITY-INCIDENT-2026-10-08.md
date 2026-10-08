# Login warning investigation — October 8, 2026

Chrome displayed a Dangerous site warning during Discord login. A separate Cloudflare-branded 502 occurred on the OAuth callback. Neither screenshot establishes the root cause or proves compromise; the warning remains unresolved until the provider investigation/review is complete.

The public Google Safe Browsing checker returned "No available data", not a clean verdict. The website owner must inspect Google's Search Console Security Issues report for affected URLs and the review process. Do not bypass browser warnings or advise visitors to whitelist the site.

A separate ESET screenshot blocked an HTTP request to deals-assets-cdn.razerzone.com. No literal reference to that host was found in this checkout, including vendored files. The requesting process has not been identified. Do not assume that alert explains the Chrome warning.

## Hardening changes

- Validate callback state format, optional issuer, authorization-code bounds, and Discord response fields before creating a session.
- Rate-limit state-validated callbacks; bound Discord requests to 10 seconds each and reject upstream redirects to protect client credentials/access tokens.
- Fail closed on provider/network/JSON/database errors; clear OAuth state and return a generic retry message without secret details.
- Apply API security headers to oversized-body errors as well as normal responses; add restrictive API CSP while preserving image-specific policies.
- Prevent authentication response caching and avoid logging raw exception messages that might contain credentials.

Existing HTTPS, Secure/HttpOnly/SameSite cookies, hashed database sessions, same-origin write checks, admin authorization and private-photo validation remain in place. No league data, credentials, permissions or storage objects were changed.

## Verification and remaining work

Run `node --test scripts/auth-security.test.mjs scripts/player-photos.test.mjs scripts/league-rosters.test.mjs scripts/ea-match-center.test.mjs`.

Tests cover valid mocked login, invalid state/provider/profile, provider failures, callback limits, security headers and existing roster/photo/admin safeguards. Mock tests do not substitute for a human end-to-end Discord login or an independent security assessment.

Still needed: Search Console owner access and exact Security Issues findings; inspect affected URLs and deployment/account logs accordingly, remediate confirmed findings, then submit a security review. Google controls warning removal. Do not store OAuth callback codes, tokens, cookies or credentials in this document or Git.

## Turnstile follow-up

The owner reports Search Console now says no issues detected. This does not establish the cause of the earlier Chrome warning or amount to a complete security audit.

The owner authorized Cloudflare Turnstile on login. The managed widget is restricted to the official UFL hostnames with no site-wide clearance or paid bot-management changes. Both keys are stored as Cloudflare Pages secrets, never in source. GET `/api/auth/discord` displays the themed challenge; same-origin POST verifies the token server-side, including hostname and action, before redirecting to Discord. The OAuth state cookie is HMAC-signed and expires after ten minutes so direct OAuth initiation cannot bypass verification. Existing in-flight logins must restart after deployment.

Public pages, house-club APIs, bot connections and Discord OAuth callbacks are not blanket-challenged. Callbacks require the signed state issued after successful verification. The privacy page discloses Turnstile use. `scripts/turnstile.test.mjs` covers blocked/bypass paths and mocked successful flow; do not automate solving a real human challenge.
