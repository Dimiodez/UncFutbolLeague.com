# Private team hubs · focused live release

The refined UX adds searchable squad/current-board placement filters, Squad/Position sidebar views, nearby assignment/instruction editing and quick removal. Board details, destructive/reset actions and team notes are collapsible; formation/phase remain visible. Save state/actions stay visible when scrolling. All these changes preserve explicit saves and the existing server access checks. Browser QA covers search, select/place and position removal without losing instructions.

The registered squad is a sticky right-side sidebar with its own scroll area, beside the formations. Coaching instructions are below the boards. Pointer-driven roster dragging supports either comparison panel; dropping on the other board activates that board and assigns the player without duplicating the playbook. Small screens use a sticky horizontal player selector, with tap-to-place retained.

Each current Season 2 club in each division has a hub automatically, keyed by season/division/team. No preview league registration database, workshop drafts, or public Roma demo is included. Roster players are read from the existing live roster on every request, including later registrations. Saved playbooks are shared online with revision conflict checks.

Access rules: explicit team managers edit; signed-in accounts explicitly linked to a canonical roster identity view that identity's current teams; the site owner can inspect every team read-only unless also assigned manager. Admins can appoint/revoke managers and link accounts but have no global tactics-reading override. Existing role/title labels and team-media permissions do not grant tactical access. Revocation, transfers and suspension are checked every request. A merged-away player identity must be relinked to its canonical record; stale alias memberships grant no access.

Owner/admin access screen: `/team-hub-access`. Private hub directory: `/team-hub`. Individual team example: `/team-hub?team=6v6%3AROM`. Existing public team pages and signed-in account/admin screens link into these areas. Managers can also be roster-linked to view their other team, without edit access there.

Tables `team_hub_managers`, `team_hub_accounts`, `team_hub_playbooks` are created idempotently on authenticated first use. No existing roster, account, title, image, league or bot data is overwritten. Access changes are audit logged. All private API responses are no-store. Server validation, same-origin checks, account IDs and atomic revisions protect saves. Future new teams are covered when added to the existing shared club registry; the league creation workshop is not deployed here.

Acceptance testing still requires the owner to choose the two test captain accounts and their specific teams. Do not assume names establish identity or appoint users without an explicit selection. Verify a second signed-in account cannot read the other's private hub, and that player-linked accounts can read but not save.
