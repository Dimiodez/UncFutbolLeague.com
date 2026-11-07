import test from 'node:test';
import assert from 'node:assert/strict';
import { createBracket, resolveBracket, setMatchScore, teamCounts, teamsFromDraw } from '../wheel-app/double-elimination.mjs';

const entrants = count => Array.from({ length: count }, (_, index) => ({
  id: 'team-' + index, name: 'Team ' + (index + 1), players: [],
}));

test('Cup Night transfers team identity and assigned rosters only', () => {
  const session = {
    teams: [
      { id: 'red', name: 'Red ', colorHue: 9, playerIds: ['p1', 'p2'] },
      { id: 'blue', name: 'Blue', colorHue: 220, playerIds: ['p3'] },
      { id: 'empty', name: 'Empty', colorHue: 70, playerIds: [] },
    ],
    players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Sam' }, { id: 'p3', name: 'Jo' }, { id: 'p4', name: 'Ready player' }],
    assignments: [{ playerId: 'p1', position: 'ST' }, { playerId: 'p2' }, { playerId: 'p3', position: 'CB' }],
  };
  const before = JSON.stringify(session);
  const bracket = createBracket(teamsFromDraw(session), () => 0.99999);
  assert.deepEqual(bracket.teams.map(team => team.id), ['red', 'blue']);
  assert.equal(bracket.teams[0].name, 'Red');
  assert.equal(bracket.teams[0].colorHue, 9);
  assert.deepEqual(bracket.teams.flatMap(team => team.players.map(player => player.name)), ['Alice', 'Sam', 'Jo']);
  assert.equal(bracket.teams[0].players[0].position, 'ST');
  assert.equal(JSON.stringify(session), before);
});

for (const count of teamCounts) {
  for (const reset of [false, true]) {
    test(count + ' teams complete with ' + (reset ? 'a reset' : 'no reset') + ' and every eliminated team loses twice', () => {
      let bracket = createBracket(entrants(count), () => 0.99999);
      let board = resolveBracket(bracket);
      const losses = new Map(bracket.teams.map(team => [team.id, 0]));
      let played = 0;
      while (!board.champion) {
        const match = Array.from(board.matches.values()).find(match => match.status === 'ready');
        assert.ok(match, 'the next match is available');
        assert.notEqual(match.home, match.away);
        assert.ok(losses.get(match.home) < 2 && losses.get(match.away) < 2);
        const awayWins = match.id === 'GF' ? reset : played % 2 === 0;
        const loser = awayWins ? match.home : match.away;
        losses.set(loser, losses.get(loser) + 1);
        bracket = setMatchScore(bracket, match.id, awayWins ? '1' : '2', awayWins ? '2' : '1');
        board = resolveBracket(bracket);
        assert.ok(++played <= 2 * count - 1);
      }
      assert.equal(played, 2 * count - (reset ? 1 : 2));
      for (const [team, defeats] of losses) assert.equal(defeats, team === board.champion ? (reset ? 1 : 0) : 2);
      assert.equal(board.finals.length, reset ? 2 : 1);
      assert.equal(resolveBracket(JSON.parse(JSON.stringify(bracket))).champion, board.champion);
    });
  }
}

test('a corrected winner invalidates changed matchups and preserves independent scores', () => {
  let bracket = createBracket(entrants(4), () => 0.99999);
  bracket = setMatchScore(bracket, 'W1-1', '2', '1');
  bracket = setMatchScore(bracket, 'W1-2', '2', '1');
  bracket = setMatchScore(bracket, 'W2-1', '3', '1');
  bracket = setMatchScore(bracket, 'L1-1', '3', '1');
  bracket = setMatchScore(bracket, 'W1-1', '1', '2');
  assert.deepEqual(Object.keys(bracket.scores), ['W1-1', 'W1-2']);
  assert.equal(resolveBracket(bracket).matches.get('W2-1').status, 'ready');
  assert.throws(() => setMatchScore(bracket, 'GF', '1', '2'), /Wait for both teams/);
  assert.throws(() => setMatchScore(bracket, 'W1-1', '1', '1'), /decisive score/);
  assert.throws(() => setMatchScore(bracket, 'W1-1', '', '2'), /whole scores/);
});

test('correcting the first final removes the no-longer-required reset and its score', () => {
  let bracket = createBracket(entrants(2), () => 0.99999);
  bracket = setMatchScore(bracket, 'W1-1', '1', '0');
  bracket = setMatchScore(bracket, 'GF', '0', '1');
  bracket = setMatchScore(bracket, 'GF2', '0', '1');
  bracket = setMatchScore(bracket, 'GF', '1', '0');
  assert.equal(bracket.scores.GF2, undefined);
  assert.equal(resolveBracket(bracket).champion, bracket.teams[0].id);
});
