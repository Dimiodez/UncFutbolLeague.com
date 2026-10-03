# Player photos: private upload, review and approval

R2 enabled by the owner on 2026-10-03. Private Standard bucket `unc-ufl-player-photos` created and the new photo tables applied to the existing website database. Production deployment and authenticated staff acceptance must be verified separately.

After the owner enables R2 in Cloudflare:

1. Create a private bucket `unc-ufl-player-photos`. Do not enable r2.dev or attach a public domain.
2. Add a production R2 binding `PLAYER_PHOTOS` in `wrangler.toml` pointing to that bucket.
3. Execute `migrations/0011_player_photos.sql` against the existing website D1 DB. This only creates new photo tables; it does not modify rosters or users.
4. Deploy Pages. Verify an owner/admin can upload an original, close/reopen the profile, crop and approve it. Verify signed-out visitors cannot load originals and only see approved portraits.

Originals and rejected uploads remain private for later review until staff chooses **Clean up reviewed originals & old portraits** for that player and confirms deletion. Cleanup permanently removes reviewed originals and superseded portraits, never the current public portrait or pending uploads. Audit metadata remains. Approval preserves previous objects until cleanup and replaces only the current public pointer. JPEG/PNG/WebP originals are limited to 5 MB; approval is a 512 × 640 PNG made in a browser canvas. No paid AI/image service is used. Cropping does not create an illustrated character or remove backgrounds.

Server catalog is generated from the current player directories by `node scripts/build-player-photo-catalog.mjs`. Only explicitly confirmed player-ID aliases share a publication; ambiguous same-name players do not share uploads. Rebuild the catalog when adding directory players. Existing profile IDs, rosters and static portraits remain intact.

R2 includes a free allowance but can charge beyond it. The owner must accept any storage billing activation themselves.
