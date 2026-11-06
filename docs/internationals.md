# UFL Internationals

Public routes: /internationals, /internationals/teams, /internationals/teams/{country ID}, /internationals/schedules, /internationals/results, /internationals/standings, /internationals/stats, /internationals/totw. The League menu and hub link to the competition. Country IDs: ITA, FRA, GER, ESP, MEX, ARG, ENG, USA, BRA, CAN.

Five to six human players on match day, standard Clubs 11v11 pitch with remaining AI players, no human goalkeeper. This is not a squad-size limit: rosters may grow throughout the season. Owner/admin national roster controls add and softly remove members without moving club memberships or deleting global profiles. Existing player-photo approval rules still apply through the existing player pages.

Apply 20261106_internationals.sql before 20261106_internationals_seed.sql to the website DB. Both are additive/idempotent. The initial 60 memberships reuse 50 canonical profiles (including seven owner-confirmed aliases) and create ten unmatched profiles only when no matching normalized name exists. No club memberships, schedules, stats, selections, or EA club IDs are invented. Initial profiles/rosters are sourced from the owner's Discord screenshot; aliases were confirmed in chat. No account or EA-login identity is fabricated.

Competition records have league/cup/tournament kind and an optional parent for later cup/event expansion. International windows are separate records, rather than a forced weekly calendar. Schedule screenshots and club IDs are pending. The Google Doc was not accessible during setup; no dates were inferred from it. Keep its international schedule information separate from club league dates.

Collection remains inactive for this new competition until verified EA IDs, country-team mappings and actual fixtures are provided. No blank/fake draft is inserted into the active collector table, which would break existing workers. The international_competitions shared_league_id / publish_results gate provides the read path to an approved League Suite record. A mapped source must contain exactly the ten country IDs. projectLeague supplies only accepted results and player stats; source errors fail visibly rather than reverting to fake zero totals. Keep the existing hosted friendly feed, staff review, forfeit correction and duplicate protections when connecting future fixtures. Existing 6v6, 10v10 and house leagues stay independent.

Published international_selections are reserved for approved TOTW selections tied to international match windows; no placeholder players or ratings are seeded. Public stats never include club statistics. The initial public standings show zero played and list countries alphabetically, without invented ranks.

All roster writes require an active owner/admin session, same origin and rate limiting. Public API is read-only without those permissions. Adding an existing player to a second country is rejected, and removal retains an audit record and global profile. Later assignments of national managers should use explicit country-scoped authorization; none have been invented.

Source is canonical GitHub. Preserve Cloudflare's existing repository/branch/deployment integration. Validate both migrations, access controls, growth beyond six, identity reuse, zero invented fixtures and safe HTML in scripts/internationals.test.mjs before deployment.
