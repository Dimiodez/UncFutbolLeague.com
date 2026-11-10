import { internationalData } from './internationals.js';
import { nationalFlag } from './international-flags.js';

export const INTERNATIONAL_PICKEM_KEY = 's1-internationals';
const INTERNATIONAL_MATCH_OFFSET = 1_000_000_000;

export async function loadInternationalPickemSeason(env) {
  return internationalPickemSeason(await internationalData(env));
}

export function internationalPickemSeason(data) {
  const teams = Object.fromEntries(data.teams.map(({id, name}) => {
    const svg = nationalFlag(id).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    return [id, [name, 'data:image/svg+xml,' + encodeURIComponent(svg)]];
  }));
  const weeks = new Map();
  for (const fixture of data.fixtures) {
    // Knockout placeholders have no confirmed teams or league-stage draw rules.
    if (fixture.stage !== 'league') continue;
    const round = Number(/^Round (\d+)$/.exec(fixture.round)?.[1]);
    const start = typeof fixture.startsAt === 'number' ? fixture.startsAt : Date.parse(fixture.startsAt);
    const kickoff = Math.floor(start / 1000);
    const sourceId = fixture.sourceMatchId;
    const home = fixture.home?.id, away = fixture.away?.id;
    if (!Number.isSafeInteger(sourceId) || sourceId <= 0 || !round || !Number.isFinite(kickoff) ||
        !Object.hasOwn(teams, home) || !Object.hasOwn(teams, away)) {
      throw new Error('Invalid international fixture.');
    }
    // Keep matchday IDs stable when a round's date is corrected.
    const matchday = Math.ceil(round / 2);
    if (!weeks.has(matchday)) weeks.set(matchday, {week: matchday, scheduledAt: kickoff, rounds: [], matches: []});
    const day = weeks.get(matchday);
    day.scheduledAt = Math.min(day.scheduledAt, kickoff);
    if (!day.rounds.some(entry => entry.round === round && entry.scheduledAt === kickoff)) {
      day.rounds.push({round, scheduledAt: kickoff});
    }
    const hasScore = Number.isInteger(fixture.homeScore) && Number.isInteger(fixture.awayScore);
    day.matches.push([INTERNATIONAL_MATCH_OFFSET + sourceId, home, away,
      hasScore ? fixture.homeScore : null, hasScore ? fixture.awayScore : null,
      kickoff, round, sourceId]);
  }
  return {
    teams,
    standingsSource: '/internationals/standings',
    standings: data.standings.map(row => [row.id, row.played, row.wins, row.draws, row.losses,
      row.goalsFor, row.goalsAgainst, row.goalDifference, row.points]),
    weeks: [...weeks.values()].sort((a, b) => a.week - b.week),
  };
}
