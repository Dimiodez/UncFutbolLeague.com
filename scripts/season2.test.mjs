import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSeason = async key => JSON.parse(await readFile(new URL(`../pickems-app/seasons/${key}.json`, import.meta.url), 'utf8'));

test('Season 1 remains a closed 6v6 archive', async () => {
  const season = await readSeason('s1-6v6');
  assert.equal(season.key, 's1-6v6');
  assert.equal(season.status, 'archived');
  assert.ok(season.weeks.length > 0);
});

test('UFL Season 2 divisions map to their distinct Virtual Arena feeds', async () => {
  const [six, ten] = await Promise.all([readSeason('s2-6v6'), readSeason('s2-10v10')]);
  assert.deepEqual(
    [six.uflSeason, six.division, six.competitionId, six.seasonId],
    [2, '6v6', 1, 2]
  );
  assert.deepEqual(
    [ten.uflSeason, ten.division, ten.competitionId, ten.seasonId],
    [2, '10v10', 3, 5]
  );
  assert.match(six.source, /competitions\/1\/seasons\/2\/matches$/);
  assert.match(ten.source, /competitions\/3\/seasons\/5\/matches$/);
  assert.match(ten.standingsSource, /competitions\/3\/seasons\/5\/standings$/);
  assert.match(ten.teamsSource, /competitions\/3\/seasons\/5\/teams$/);
  assert.match(ten.statsSource, /competitions\/3\/seasons\/5\/stats$/);
  assert.match(ten.seriesSource, /competitions\/3\/seasons\/5$/);
});

test('registration snapshots stay usable before schedules are published', async () => {
  const [six, ten] = await Promise.all([readSeason('s2-6v6'), readSeason('s2-10v10')]);
  for (const season of [six, ten]) {
    assert.ok(Array.isArray(season.teamDetails));
    assert.ok(Array.isArray(season.standings));
    assert.ok(Array.isArray(season.weeks));
    assert.ok(season.teamsSource);
    assert.ok(season.standingsSource);
  }
});

test('league surfaces expose season-first navigation', async () => {
  const [siteApp, pickemsApp, pickemsMarkup] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../pickems-app/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../pickems-app/index.html', import.meta.url), 'utf8')
  ]);
  assert.match(siteApp, /leagueSeasonTabs\('\/teams'/);
  assert.match(siteApp, /leagueSeasonTabs\('\/schedules'/);
  assert.match(siteApp, /leagueSeasonTabs\('\/standings'/);
  assert.match(pickemsMarkup, /data-pickem-season="1"/);
  assert.match(pickemsMarkup, /data-pickem-division="10v10"/);
  assert.match(pickemsApp, /'s1-10v10'.*unavailable: true/);
});
