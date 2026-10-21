# Scheduled test collection and pending review

The existing preview collector is the single worker for 6v6 and 10v10 test leagues. Its cron wakes every five minutes; EA network requests run only from 15 minutes before the first kickoff on a local fixture date until 90 minutes after that kickoff. A 9:00/9:30 PM Central night polls 8:45–10:30 PM America/Chicago. Up to six clubs per tick rotate by a whole batch so all 8/10 clubs are covered within ten minutes. DST is represented by the saved zoned fixture timestamps.

Inside the window the collector checks linked clubs even if a fixture already has an accepted result, retaining matching EA archives. Reviewed corrections remain protected. Outside the window the scheduler can reconcile already archived evidence and update its heartbeat, but makes no EA requests. Health distinguishes scheduler heartbeat from the last EA feed attempt.

Quit/3–0 and multiple-match evidence creates pendingResults with candidate match IDs, EA scores, timestamps, flags and available human-player stats. Pending records never enter acceptedResults, standings, season stats or awards. Missing fields are not invented. EA does not reliably expose every quit/DC, so this is a cautious review heuristic, not guaranteed disconnect detection.

In Match centre, open Needs review, choose the correct EA record, adjust the official score if needed (e.g. 0–0 after a quit), enter the reason and explicitly Accept reviewed result. Shared acceptance requires the existing owner/admin role gate, same-origin request, current revision and a stored pending candidate. The original EA result and correction history are retained; the pending fixture is removed after acceptance. Local-only acceptance remains a private draft.

The live owner-only League Suite uses the same separate test store and vendored implementation. Real competitions, public standings and bot data are unchanged. Existing completed October 15 and October 20 trials are preserved. This does not invent future fixtures or silently advance a fixed test into another gameweek.

Regression tests cover both formats' window boundaries, zero outside-window fetches, durable pending evidence, draw acceptance, revision conflicts, audit writes, restored records and repeat-collection protection.
