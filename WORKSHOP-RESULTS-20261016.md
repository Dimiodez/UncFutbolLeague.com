# Workshop match corrections and unattended collection

Scope: preview only. No production deployment or production database changes.

## Preserved records

- October 15 6v6 trial: all 10 fixtures and 116 human-player appearances.
- Arsenal–Druzhba: owner-confirmed regulation result 0–0, standard 3/1/0 scoring. Original EA 3–0 quit record retained; player stats flagged for review.
- Seed migrations use INSERT OR IGNORE, not replacement. Subsequent corrections preserve EA originals and bounded history. Collection does not overwrite corrected matches.

## Available

- Schedule & results → Match centre & corrections: per-fixture score, players, positions, ratings, goals, assists and detailed available EA stats; missing player rows can be added.
- Device-only corrections are marked local and survive shared refreshes. Shared corrections require a Discord owner/admin session, same-origin request and matching revision.
- Preview D1 holds shared results and raw matching EA snapshots. Browser refresh reads shared results for linked local drafts every minute, except while editing.
- Separate Worker `ufl-preview-league-collector`: five-minute cron, preview DB only. Pending fixtures from the past seven days; rotates at most six clubs per run; league, playoff and friendly feeds, EA fallback. Ambiguous matches and suspicious quit/3–0 results require review.
- Collector heartbeat/warnings shown in league header; do not equate a deployed trigger with a successful live collection.

## Before Tuesday October 20 10v10 test

1. Configure preview Discord OAuth and owner identity. At implementation time Pages secret list was empty. Do not bypass authentication or copy production secrets automatically.
2. Supply actual 10v10 clubs/IDs and scheduled pairings/date/time; create a separate league, preserving 6v6 trial.
3. Enable shared collection as owner/admin and verify an actual cron heartbeat and a real result import with browser closed. At initial deployment heartbeat remained pending.
4. Test authenticated online correction/revision conflict end to end. Signed-out rejection and correction preservation are covered by tests.

This is not yet a full VA match-centre replacement. Match-specific visual lineup/team-hub integration and richer clean-sheet controls remain separate work. EA upstream availability cannot be guaranteed.

## Verification

Eight tests pass across recovery, corrections, scheduled-collector preservation, signed-out writes, detailed stats, automatic fixture matching, awards and publication authorization. Preview build passes. Deployment UI shows all ten results and protected 0–0.
