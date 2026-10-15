# October 15 workshop player stats test

Preview only. Production is unchanged.

- Verified the live preview relay response for Roma: `players` is flat, keyed by player ID, with `clubId` and broad `forward` / `midfielder` / `goalkeeper` roles. The old importer incorrectly assumed club-keyed players. Both shapes are now supported.
- Scheduled result imports retain appearances, goals, assists, rating, shots, shots on target, passes, completed passes, tackles, tackles won, interceptions, saves, cards and MOTM when supplied.
- Stats display missing values as unavailable and derive pass/tackle percentages from combined totals. Upstream relay values are retained as supplied; no claim of independently validated EA completeness.
- TOTW: enable **Manual outfield placement** to see all rated outfield candidates and drag/select into any outfield award slot. Original EA role remains unchanged; no exact position inference. GK remains keeper-only. Strict eligibility remains available. Manual setting and lineup persist when saved.
- Existing accepted-results files remain readable; absent detailed fields remain unavailable, not fabricated/backfilled. No practice or historic games were inserted during verification.
- Collection still requires the workshop browser open and awake. Discord drafts are snapshot saves, not a background collector. Tonight only LAFC–Roma and Toluca–Bayern have both IDs linked. Missing IDs can be added while EA history retains those fixtures.
- Tests: `node --test scripts/league-detailed-stats.test.mjs scripts/league-ea-auto.test.mjs scripts/league-awards.test.mjs scripts/award-publication.test.mjs`.
