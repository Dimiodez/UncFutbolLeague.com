# Public TOTW / TOTS landing page

12 October 2026: live-site presentation only, not workshop publishing. `/totw` is in the League menu and hub in Coaching's former position. Coaching retains its URL/content/permissions and is now under Utility. `/tots` also opens the season-selection view.

Season 1 now has a verified public VA archive snapshot in `assets/league/awards-season1.js`: nine 6v6 TOTWs, ten outfield players each, 3-5-2 formation, rounds 1–2 through 17–18. The archive uses official squad IDs 10, 12, 13, 15, 16, 17, 18, 19 and 21; each gameweek links to its specific official squad. Public names and avatar URLs only are retained. Slot orientation follows VA's published formation layout. No goalkeeper or TOTS has been invented. Only 6v6 was contested in Season 1, so no empty historical 10v10 card is shown.

Season 2 remains unchanged: source links and honest unannounced placeholders. No automatic lineup publishing or workshop draft reads are connected. The read-only `scripts/read-season1-awards.mjs` validates the public IDs, round pairs and player slots before emitting sanitized JSON; it makes no site or VA writes.

Season and gameweek navigation use the official schedule snapshot already on the site. One gameweek = both rounds on a single match day, grouped by actual scheduled date, not round number or a hardcoded Thursday. With ten clubs this is ten fixtures across two rounds. 6v6 and 10v10 have separate cards within the selected gameweek and can have different match dates. TOTS has its own season-level view. Future links can attach approved VA selection content without replacing this navigation.

No DB migration, user data, team/player photos, roster, match results or bot changes are part of this work. Public-only build allowlist includes the two new presentation assets.

The owner supplied the official Season 2 sources: 6v6 `/competitions/1/seasons/2/squads` and 10v10 `/competitions/3/seasons/5/squads`. Both public pages were verified on 12 October 2026: `squads: []`, `selectedSquad: null`, `squadPlayers: null`. Each current-season TOTW card links to its division's VA archive. Links are not fabricated week-specific links or TOTS sources; historical seasons are not incorrectly linked to Season 2. Automatic lineup import remains unconnected until a real published squad is available to validate its schema/gameweek mapping.
