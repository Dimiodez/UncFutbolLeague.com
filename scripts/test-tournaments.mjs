import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unable to extract ${name}`);
}

const names = [
  'publicGroupTable', 'publicLeagueTable', 'publicGroupFixtures',
  'balancedLeagueFixtures', 'makeByotSnapshot', 'allCompetitionMatches',
  'assignCompetitionMatch', 'decideCompetitionMatch', 'recalculateCompetition',
  'eventWinner', 'eventSchedulePath', 'eventSharePath', 'controlRoomBody',
  'adminControlRoom', 'normalizedScoreInput'
];
const context = {
  console, URLSearchParams,
  escapeHtml: value => String(value),
  eventShareTools: () => '<share-tools></share-tools>',
  eventBoard: () => '<event-board></event-board>'
};
vm.createContext(context);
vm.runInContext(names.map(extractFunction).join('\n'), context);

function mockForm(values) {
  return { elements: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value: String(value) }])) };
}

const eightNames = Array.from({ length: 8 }, (_, index) => `Team ${index + 1}`).join('\n');
const groups = context.makeByotSnapshot(mockForm({
  teamCount: 8, teams: eightNames, format: 'groups', groupCount: 2,
  qualifiers: 2, leagueGames: 4, qualificationPlan: '4:0'
}));
assert.deepEqual(Array.from(groups.groupStage.groups, group => group.length), [4, 4]);
assert.equal(groups.groupStage.fixtures.length, 12);
assert.deepEqual(Array.from(groups.rounds, round => round.length), [2, 1]);

const twelveNames = Array.from({ length: 12 }, (_, index) => `Club ${index + 1}`).join('\n');
const league = context.makeByotSnapshot(mockForm({
  teamCount: 12, teams: twelveNames, format: 'league', groupCount: 1,
  qualifiers: 2, leagueGames: 4, qualificationPlan: '6:4'
}));
assert.equal(league.leagueSnapshot.fixtures.length, 24);
assert.equal(league.leagueSnapshot.directPlaces, 6);
assert.equal(league.leagueSnapshot.playoffs.length, 2);
assert.deepEqual(Array.from(league.rounds, round => round.length), [4, 2, 1]);

league.leagueSnapshot.fixtures.forEach((match, index) => {
  match.homeScore = index % 3 + 1;
  match.awayScore = 0;
});
context.recalculateCompetition(league);
assert.ok(league.leagueSnapshot.playoffs.every(match => match.home !== 'TBD' && match.away !== 'TBD'));
league.leagueSnapshot.playoffs.forEach(match => { match.homeScore = 2; match.awayScore = 1; });
context.recalculateCompetition(league);
assert.ok(league.rounds[0].every(match => match.home !== 'TBD' && match.away !== 'TBD'));
league.rounds.forEach(round => {
  round.forEach(match => { match.homeScore = 3; match.awayScore = 1; });
  context.recalculateCompetition(league);
});
assert.notEqual(context.eventWinner(league), null);

const controlRoom = context.adminControlRoom([{
  id: 'league-12345', title: 'League Night', status: 'published',
  lifecycleStatus: 'live', destination: 'community-events', snapshot: league
}], 'league-12345');
assert.match(controlRoom, /Tournament Night Control Room/);
assert.match(controlRoom, /Save live results/);
assert.match(controlRoom, /Matches completed/);
assert.equal(context.normalizedScoreInput('12'), 12);
assert.equal(context.normalizedScoreInput('7 goals'), 7);
assert.equal(context.normalizedScoreInput(''), '');

assert.equal(context.eventSharePath({ id: 'abc-12345', snapshot: { series: 'byot' } }), '/schedules/byot-tournaments?event=abc-12345');
assert.equal(context.eventSharePath({ id: 'cup-12345', destination: 'league-cup', snapshot: {} }), '/schedules/league-cup?event=cup-12345');

const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
assert.match(styles, /\.event-league-fixtures\{grid-template-columns:minmax\(0,1fr\)\}/);
assert.match(styles, /\.event-bracket-match\{position:relative;grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
assert.match(source, /type="text" inputmode="numeric" pattern="\[0-9\]\*"/);

console.log('Tournament presets, advancement, winner, and share-link tests passed.');
