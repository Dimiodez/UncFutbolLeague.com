# October 20 10v10 EA-only test

Created as separate workshop/shared league `ufl-10v10-20261020`. Eight teams, eight exact user-supplied fixtures; Tuesday 9:00 and 9:30 PM America/Chicago, standard 3/1/0 scoring. No VA data source or invented later rounds. October 15 6v6 records are untouched.

All eight IDs are in `league-ea-ten-trial.js`: Real Madrid 71042, Maykop 374656, Milan 48360, Timbers 412322, TabascoKids 698720, Night Shift 30258, Palace 23137, Newell’s 716581.

The preview-only five-minute scheduled Worker recognizes the fixed schedule. Shared storage seed uses INSERT OR IGNORE. Workshop adds this draft without replacing existing drafts; accepted results synchronize from shared storage. Upcoming games remain pending and standings start at zero.

Read-only feed verification on October 16: all eight club endpoints returned HTTP 200 and recent matches. League/playoff feeds used relay; friendly feeds used direct EA fallback after relay HTTP 500. Populated ratings/goals/assists/shots/saves were present in sampled returned players. Detailed fields vary between normalized relay and raw EA; alias normalization is required and absent fields remain unavailable.

Exact position identification and regulation/extra-time classification are not assumed. Quit/3–0 ambiguity requires manual review. Secure shared manual editing still requires preview Discord OAuth configuration. A successful feed check cannot guarantee EA availability on Tuesday. Test one actual scheduled match end-to-end before claiming live ingestion is proven for this new league.

Verified workshop UI lists two leagues, with eight 10v10 teams/fixtures and correct Tuesday kickoff times. Fixed-fixture and preservation regression tests pass. Existing scheduled collector heartbeat confirmed successful on October 16.
