export const minTeams = 2;
export const maxTeams = 16;
export const teamCounts = Array.from({ length: maxTeams - minTeams + 1 }, (_, index) => index + minTeams);

const storageKey = 'uwu.double-elimination.v1';

export function readBracket() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return Array.isArray(saved?.teams) && teamCounts.includes(saved.teams.length) && saved.scores ? saved : null;
  } catch {
    return null;
  }
}

export function storeBracket(bracket) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(bracket));
    return true;
  } catch {
    return false;
  }
}

export function teamsFromDraw(session) {
  const players = new Map(session.players.map(player => [player.id, player.name]));
  const positions = new Map(session.assignments.map(({ playerId, position }) => [playerId, position]));
  return session.teams.filter(team => team.playerIds.length).map(team => ({
    id: team.id,
    name: team.name.trim(),
    colorHue: team.colorHue,
    players: team.playerIds.map(id => ({ name: players.get(id) || 'Unnamed player', position: positions.get(id) })),
  }));
}

export function createBracket(teams, random = Math.random) {
  if (!teamCounts.includes(teams.length)) throw new Error('Choose between 2 and 16 teams.');
  const names = teams.map(team => team.name.trim().toLowerCase());
  if (names.some(name => !name)) throw new Error('Give each team a name before creating the bracket.');
  if (new Set(names).size !== teams.length) throw new Error('Each team needs a unique name.');
  const seededTeams = [...teams];
  for (let index = seededTeams.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [seededTeams[index], seededTeams[other]] = [seededTeams[other], seededTeams[index]];
  }
  return { teams: seededTeams, scores: {} };
}

function buildMatches(teams) {
  const size = 2 ** Math.ceil(Math.log2(teams.length));
  let seedOrder = [1, 2];
  while (seedOrder.length < size) {
    const nextSize = seedOrder.length * 2;
    seedOrder = seedOrder.flatMap(seed => [seed, nextSize + 1 - seed]);
  }

  const winners = [];
  const losers = [];
  const winner = match => ({ match, outcome: 'winner' });
  const loser = match => ({ match, outcome: 'loser' });
  const makeRound = (bracket, number, count, sources) => Array.from({ length: count }, (_, index) => ({
    id: bracket + number + '-' + (index + 1),
    sources: sources(index),
  }));

  winners.push(makeRound('W', 1, size / 2, index =>
    seedOrder.slice(index * 2, index * 2 + 2).map(seed => ({ team: teams[seed - 1]?.id ?? null }))
  ));
  while (winners.at(-1).length > 1) {
    const previous = winners.at(-1);
    winners.push(makeRound('W', winners.length + 1, previous.length / 2, index =>
      [winner(previous[index * 2]), winner(previous[index * 2 + 1])]
    ));
  }

  if (size > 2) {
    losers.push(makeRound('L', 1, size / 4, index =>
      [loser(winners[0][index * 2]), loser(winners[0][index * 2 + 1])]
    ));
    for (const winnersRound of winners.slice(1)) {
      const previous = losers.at(-1);
      // Cross the drops when possible so a team does not immediately replay
      // its first-round opponent after dropping from the winners bracket.
      losers.push(makeRound('L', losers.length + 1, winnersRound.length, index =>
        [winner(previous[index]), loser(winnersRound[winnersRound.length > 1 ? index ^ 1 : index])]
      ));
      if (winnersRound.length > 1) {
        const dropRound = losers.at(-1);
        losers.push(makeRound('L', losers.length + 1, dropRound.length / 2, index =>
          [winner(dropRound[index * 2]), winner(dropRound[index * 2 + 1])]
        ));
      }
    }
  }

  const winnersFinal = winners.at(-1)[0];
  const finals = [{
    id: 'GF',
    sources: [winner(winnersFinal), losers.length ? winner(losers.at(-1)[0]) : loser(winnersFinal)],
  }];
  return { winners, losers, finals };
}

export function resolveBracket(bracket) {
  const matches = new Map();
  const validScores = {};

  function resolve(match) {
    const participants = match.sources.map(source =>
      source.match ? matches.get(source.match.id)[source.outcome] : source.team
    );
    const [home, away] = participants;
    const result = { ...match, home, away };
    const score = bracket.scores[match.id];
    if (home === undefined || away === undefined) {
      result.status = 'waiting';
    } else if (home === null || away === null) {
      result.status = 'bye';
      result.winner = home ?? away;
      result.loser = null;
    } else if (score?.home === home && score?.away === away) {
      result.status = 'complete';
      result.score = score;
      const homeWon = score.homeScore > score.awayScore;
      result.winner = homeWon ? home : away;
      result.loser = homeWon ? away : home;
      validScores[match.id] = score;
    } else {
      result.status = 'ready';
    }
    matches.set(match.id, result);
    return result;
  }

  const graph = buildMatches(bracket.teams);
  const winners = graph.winners.map(round => round.map(resolve));
  const losers = graph.losers.map(round => round.map(resolve));
  const final = resolve(graph.finals[0]);
  const finals = [final];
  let champion;
  if (final.status === 'complete') {
    if (final.winner === final.home) {
      champion = final.winner;
    } else {
      const reset = resolve({
        id: 'GF2',
        sources: [{ team: final.home }, { team: final.away }],
      });
      finals.push(reset);
      champion = reset.winner;
    }
  }
  return { winners, losers, finals, matches, champion, validScores };
}

export function setMatchScore(bracket, matchId, homeValue, awayValue) {
  const match = resolveBracket(bracket).matches.get(matchId);
  if (match?.status !== 'ready' && match?.status !== 'complete') throw new Error('Wait for both teams to advance.');
  if (!/^\d{1,2}$/.test(homeValue) || !/^\d{1,2}$/.test(awayValue)) throw new Error('Enter two whole scores from 0 to 99.');
  const homeScore = Number(homeValue);
  const awayScore = Number(awayValue);
  if (homeScore === awayScore) throw new Error('Enter a decisive score to advance the winner.');
  const scores = {
    ...bracket.scores,
    [matchId]: { home: match.home, away: match.away, homeScore, awayScore },
  };
  const updated = { ...bracket, scores };
  return { ...updated, scores: resolveBracket(updated).validScores };
}
