# EA club history groundwork

This branch keeps the Maykop dashboard isolated from the live site while defining the reusable archive path for future linked 6v6 and 10v10 clubs.

## Reuse from the house-club archive

The existing FC Sandy Bums and FC Mountains flow already establishes the important behavior:

- fetch EA league and playoff results through the private UFB Worker;
- write matches idempotently using the EA club ID and EA match ID;
- store player identity and per-match appearances separately;
- keep older matches after they leave EA's recent-results response;
- expose read-only club history to the website through a Worker binding; and
- allow a protected manual check as a recovery path.

## General club archive target

1. Store each verified league club with its EA club ID, platform, UFL season and division.
2. Poll eligible linked clubs every 20 minutes. A lease prevents overlapping checks.
3. Upsert the match, both club totals and every human player stat in one idempotent batch.
4. Deduplicate on `(ea_club_id, ea_match_id)` so a repeated EA response never creates a second match.
5. Preserve raw supported EA fields alongside normalized columns used by the bot and website.
6. Keep archive reads private to the website Worker. Public clients never receive a direct bot or EA credential.
7. Scope pages and aggregates by UFL season and division without deleting prior seasons.

## Match detail contract

The club page expects two useful match views:

- **Match stats:** score, shots, shot accuracy, passes, pass accuracy, assists, tackles, tackle success, saves, cards and average rating when EA supplies them.
- **Player stats:** name, position, rating, goals, assists, shots, passes, tackles, saves and player-of-the-match state.

Formations are intentionally excluded until EA position data proves reliable enough to render them accurately.

## Test-realm status

The Maykop page currently uses a representative static dataset for layout and interaction testing. The 20-minute Maykop poller is **not enabled**. Enabling it later requires an approved, verified club link and a generic archive migration in the UFB Worker.
