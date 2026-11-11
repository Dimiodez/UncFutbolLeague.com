import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('app.js');
class MatchdayDate extends Date {
  static now() { return Date.parse('2026-11-10T18:00:00Z'); }
}
function overview(division, query = '', prepare = '') {
  const context = vm.createContext({window:{},URLSearchParams,Date:MatchdayDate});
  vm.runInContext(read('pickems-app/season-data.js'), context);
  vm.runInContext(app.slice(0, app.indexOf('function homePage()')) +
    app.slice(app.indexOf('function defaultScheduleWeek('), app.indexOf('function bindScheduleAgenda(')) +
    read('league-season2.js') + read('player-portraits.js') + read('league-pages.js') +
    read('season-competitions.js') + read('competition-overview.js'), context);
  vm.runInContext(prepare, context);
  return vm.runInContext(`competitionOverviewPage("${division}", new URLSearchParams("${query}"))`, context);
}

test('competition overviews retain the requested division in clubs, fixtures, awards, and picks', () => {
  for (const division of ['6v6','10v10']) {
    const html = overview(division);
    assert.ok(html.includes('UNC Fútbol League ' + division));
    for (const destination of ['/clubs','/standings','/stats','/pickems']) {
      assert.ok(html.includes(destination + '?season=2&division=' + division), destination);
    }
    assert.ok(html.includes('/schedules?season=2&type=' + division));
    assert.ok(html.includes('#award-' + division));
    assert.ok(html.includes('Recent results'));
    assert.ok(html.includes('Next match night'));
  }
  assert.ok(overview('10v10').includes('/clubs/club-1790120967830?season=2&division=10v10'));
});

test('the round links show one round and preserve accepted 1–0 forfeits in recent results', () => {
  const html = overview('6v6', 'round=10');
  const next = html.slice(html.indexOf('aria-labelledby="competition-next-title"'), html.indexOf('aria-labelledby="competition-recent-title"'));
  assert.match(next, /Round 10 fixtures/);
  assert.equal((next.match(/class="competition-fixture"/g) || []).length, 5);
  assert.match(next, /round=10" data-link aria-current="page"/);
  const recent = html.slice(html.indexOf('aria-labelledby="competition-recent-title"'), html.indexOf('aria-labelledby="competition-standings-title"'));
  assert.match(recent, /Roma[\s\S]*?1 – 0[\s\S]*?Tenerife/);
  assert.doesNotMatch(recent, /null|undefined/);
});

test('a round BYE stays visible and a completed calendar has no invented next match night', () => {
  const bye = overview('6v6', '', `
    const day=leagueSeasons['s2-6v6'].weeks[4];
    day.byes=[{team:'TEN',round:9}];
  `);
  assert.match(bye, /BYE · Round 9/);
  assert.match(bye, /clubs\/ITA\?season=2&division=6v6/);
  const complete = overview('10v10', '', `
    for (const day of leagueSeasons['s2-10v10'].weeks) {
      day.scheduledAt=1;
      for (const round of day.rounds) round.scheduledAt=1;
    }
  `);
  assert.match(complete, /The next fixtures will appear when scheduled/);
  assert.doesNotMatch(complete, /aria-label="Match night rounds"/);
});
