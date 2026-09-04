import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://ufl.virtualarena.app';
const COMPETITION_ID = 1;
const SEASON_ID = 1;
const seasonBase = `${BASE}/competitions/${COMPETITION_ID}/seasons/${SEASON_ID}`;
const stableKeys = new Map([
  ['UFL Jagiellonia', 'JAG'], ['UFL New Legacy', 'NL'], ['UFL HamKam', 'HAM'],
  ['UFL Island Boys', 'IB'], ['UFL Bayern', 'BAY'], ['UFL Pumas UNAM', 'PUM'],
  ['UFL Como', 'COM'], ['UFL Gotham City', 'GOTH'], ['UFL Palermo', 'PAL'],
  ['UFL TabascoKids', 'TAB']
]);

function decodeHtml(value) {
  return value.replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

async function pageProps(path) {
  const response = await fetch(`${seasonBase}/${path}`, { headers: { 'user-agent': 'UncFutbolLeague.com data sync' } });
  if (!response.ok) throw new Error(`Virtual Arena ${path} returned ${response.status}`);
  const html = await response.text();
  const match = html.match(/data-page="([^"]+)"/);
  if (!match) throw new Error(`Virtual Arena ${path} did not contain season data`);
  const page = JSON.parse(decodeHtml(match[1]));
  if (page.props?.competition?.id !== COMPETITION_ID || page.props?.season?.id !== SEASON_ID) throw new Error(`Virtual Arena ${path} returned a different competition or season`);
  return page.props;
}

function teamKey(name) {
  const key = stableKeys.get(name);
  if (!key) throw new Error(`Unknown UNC Futbol League team: ${name}`);
  return key;
}

const [matchProps, standingProps, teamProps] = await Promise.all([pageProps('matches'), pageProps('standings'), pageProps('teams')]);
const teamRows = teamProps.teams?.data ?? [];
const teams = Object.fromEntries(teamRows.map(row => [teamKey(row.name), [row.name, row.image]]));
const teamDetails = teamRows.map(row => ({
  key: teamKey(row.name), name: row.name, abbreviation: row.team?.abbr || teamKey(row.name),
  logo: row.image, url: row.url, rosterSize: row.users_count ?? null, stats: row.stats ?? {}
}));
const standings = standingProps.standings.map(row => {
  const stats = row.stats;
  return [teamKey(row.name), stats.played, stats.wins, stats.draws, stats.losses, stats.goals_for, stats.goals_against, stats.goal_difference, stats.points];
});
const dateByRound = new Map(matchProps.schedule.dates.map(date => [date.round_id, date]));
const groupedMatches = matchProps.schedule.matches.map(group => Object.values(group)[0]);
const sourceTimestamps = [
  ...standingProps.standings.map(row => row.updated_at),
  ...groupedMatches.flat().map(match => match.posted_at)
].filter(Boolean).map(value => Date.parse(value)).filter(Number.isFinite);
const weeks = groupedMatches.map((matches, index) => {
  const date = dateByRound.get(matches[0].competition_season_round_id) ?? matchProps.schedule.dates[index];
  return {
    week: index + 1, date: date.date.replace(/(\d{1,2}:\d{2})(AM|PM)/, '$1 $2'), scheduledAt: date.scheduled_at,
    matches: matches.map(match => [match.id, teamKey(match.participant_home.name), teamKey(match.participant_away.name), match.participant_home_score, match.participant_away_score])
  };
});
const season = {
  competitionId: COMPETITION_ID, seasonId: SEASON_ID, source: `${seasonBase}/matches`,
  standingsSource: `${seasonBase}/standings`, teamsSource: `${seasonBase}/teams`,
  syncedAt: new Date(Math.max(...sourceTimestamps)).toISOString(),
  teams, teamDetails, standings, weeks
};

await mkdir('pickems-app', { recursive: true });
await writeFile('pickems-app/season-data.js', `window.UFL_SEASON = ${JSON.stringify(season, null, 2)};\n`);
console.log(`Synced ${teamDetails.length} teams, ${weeks.length} matchweeks, and ${weeks.flatMap(week => week.matches).length} matches.`);
