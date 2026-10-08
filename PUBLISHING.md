# Public-only Cloudflare Pages publication

Build command: `node scripts/build-public.mjs`

Static output: `dist`

The build copies the approved root resources and browser app assets without changing their URLs or bytes. It refuses an existing output folder, so builds should run in clean checkouts. Do not deploy the repository root. Internal setup scripts, notes, migrations, configuration and Functions source are not public assets.

Keep `functions/` at project root for Cloudflare Pages compilation. Preserve the existing production DB, PLAYER_PHOTOS, UFB_BOT and authentication variables. Do not copy secret values into the public output. Preview deployments intentionally do not have production write access or production login configuration.

Checks: `node --test scripts/*.test.mjs mountain-app/tests/*.test.mjs` and `node scripts/check-ufb.mjs`.

2026-10-08 validation: 152 checks passed; preview content hashes matched all 321 ordinary public resources; `_headers` and `_redirects` were included; tested internal URLs no longer returned original files; public page routes and signed-out admin guards were verified. No roster or club cleanup was performed. The temporary club directory intentionally combines provisional teams with current official registrations.

This closes a confirmed file-publication exposure. It does not establish the cause of, or guarantee removal of, Google's browser warning. A successful authenticated Discord callback still needs a real user/browser test; never bypass a Safe Browsing warning to perform it.
