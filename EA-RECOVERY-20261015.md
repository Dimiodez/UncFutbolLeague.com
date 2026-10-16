# Friendly feed failure and recovery

## October 16 final recovery

Actual Arsenal club ID is 1664060, verified in Druzhba's EA friendly record and Arsenal's own history. The originally supplied 1597678 points to a different/obsolete club. Correct only that known old ID in this trial when no Arsenal fixture has already been accepted; preserve custom IDs and accepted results. Recovered Druzhba 0–3 Arsenal (10:23:55 PM Central October 15) and Italia 1–3 Arsenal. Snapshot now contains all ten scheduled matches and 116 appearances. Later section describes the initial eight-game recovery, superseded by this final recovery.

The public relay returns HTTP 500 for friendly and friendlyMatch. Documented relay names are league/playoff/friendly, distinct from EA upstream enum names. Direct EA is blocked from the local diagnostic machine (403), but succeeds from the deployed preview Worker. Added relay-first, bounded direct fallback with per-type availability reporting. Never convert failures to a successful empty feed.

Retrieved actual October 15 scheduled friendlies and preserved them in assets/ea-trial-recovery-20261015.json before recent history rotates. No VA result data. Eight unique scheduled matches, 93 player appearances. Snapshot is limited to this trial/date and each match passes the existing exact-opponent/time/duplicate acceptance gate. Current saved edits are not replaced. Existing accepted scores are not changed; missing player details can be enriched only from the same verified match with matching scores.

Discovered EA IDs in actual opponent records: Italia 1663550; Rippettes 1642215. Fill only missing draft IDs. Arsenal remains linked to the previously supplied 1597678; its two fixtures are absent in retrieved histories and remain pending (no inference of forfeits).

Verified real results: Italia 0–4 Toluca; Bayern 0–1 Rippettes; Ta6ascoKids 2–1 Pumas; LAFC 1–2 Roma; Toluca 6–1 Bayern; Rippettes 0–1 Ta6ascoKids; Druzhba 1–0 LAFC; Pumas 1–0 Roma.

Test: node --test scripts/ea-recovery.test.mjs scripts/ea-match-feed.test.mjs scripts/league-detailed-stats.test.mjs scripts/league-ea-auto.test.mjs scripts/league-ea-trial.test.mjs

Still browser-local collection outside the captured trial snapshot. This is not a full background result service. No production deployment or private-hub permissions changed.
