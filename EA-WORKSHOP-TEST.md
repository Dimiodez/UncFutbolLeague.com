# Independent EA match test — preview only

October 14: added an EA test panel to the workshop. No teams are preselected. Add up to eight team names and numeric EA club IDs. The existing preview API uses the EA relay, not VA, to check league, playoff and friendly feeds. The deployed search endpoint successfully responded during setup; this is not proof that any future match feed is current.

Manual check and optional five/fifteen-minute active-page checks retain up to 100 games per club in browser storage, deduplicated by EA match ID. Failed checks preserve previous games and show errors. The test-team opponent filter is for inspection only, not proof of an official fixture. Full raw stats are expandable. Export is an optional backup; normal saving is automatic on this browser, not Discord-account synced. Closing the page stops polling. No unattended server collector is implemented by this panel.

For the October 15 test, provide club IDs and kickoff times. Use those IDs in draft teams and generate fixtures. The existing Matches candidate checker restricts opponents and kickoff windows, excludes already accepted EA IDs, and requires staff review plus regular/extra-time confirmation before local test totals change. This panel does not autoaccept games, write production data, or publish leagues.
