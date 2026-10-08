import { mkdir, readFile, writeFile } from 'node:fs/promises';

const BASE = 'https://ufl.virtualarena.app';
const seasons = [
  { key: 's2-6v6', competitionId: 1, seasonId: 2, division: '6v6', uflSeason: 2 },
  { key: 's2-10v10', competitionId: 3, seasonId: 5, division: '10v10', uflSeason: 2 }
];

const decodeHtml = value => value
  .replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

async function pageProps(config, path, { allowMissing = false } = {}) {
  const seasonBase = `${BASE}/competitions/${config.competitionId}/seasons/${config.seasonId}`;
  const response = await fetch(`${seasonBase}/${path}`, { headers: { 'user-agent': 'UncFutbolLeague.com data sync' } });
  if (response.status === 404 && allowMissing && path === 'stats') {
    console.warn(`Virtual Arena ${config.key}/stats is not published yet; continuing core league sync.`);
    return { leaderboards: {}, statsUnavailable: true };
  }
  if (!response.ok) throw new Error(`Virtual Arena ${config.key}/${path} returned ${response.status}`);
  const html = await response.text();
  const match = html.match(/data-page="([^"]+)"/);
  if (!match) throw new Error(`Virtual Arena ${config.key}/${path} did not contain season data`);
  const page = JSON.parse(decodeHtml(match[1]));
  if (page.props?.competition?.id !== config.competitionId || page.props?.season?.id !== config.seasonId) {
    throw new Error(`Virtual Arena ${config.key}/${path} returned a different competition or season`);
  }
  return page.props;
}

function makeTeamKey(name, abbreviation, used) {
  const preferred = String(abbreviation || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const words = String(name).replace(/^UFL\s+/i, '').match(/[A-Z0-9]+/gi) || ['TEAM'];
  const fallback = (words.length > 1 ? words.map(word => word[0]).join('') : words[0].slice(0, 4)).toUpperCase();
  const root = preferred || fallback || 'TEAM';
  let key = root;
  let suffix = 2;
  while (used.has(key)) key = `${root}${suffix++}`;
  used.add(key);
  return key;
}

function normalizeLeaderboards(leaderboards = {}) {
  return Object.fromEntries(Object.entries(leaderboards).map(([kind, categories]) => [kind,
    Object.fromEntries(Object.entries(categories || {}).map(([key, category]) => [key, {
      name: category.name,
      stat: category.stat || category.name,
      url: category.url,
      records: (category.records || []).slice(0, 5).map(record => ({
        data: { name: record.data?.name, image: record.data?.image_small || record.data?.image, url: record.data?.url },
        team: record.team ? { name: record.team.name, image: record.team.image } : null,
        stat: record.stat,
        played: record.played
      }))
    }]))
  ]));
}

async function buildSeason(config) {
  const [matchProps, standingProps, teamProps, statsProps] = await Promise.all([
    pageProps(config, 'matches'), pageProps(config, 'standings'), pageProps(config, 'teams'), pageProps(config, 'stats', { allowMissing: true })
  ]);
  const seasonBase = `${BASE}/competitions/${config.competitionId}/seasons/${config.seasonId}`;
  const teamRows = [...(teamProps.teams?.data || [])];
  const lastTeamPage=Number(teamProps.teams?.last_page||1);
  if(!Number.isInteger(lastTeamPage)||lastTeamPage<1||lastTeamPage>100)throw new Error('Invalid VA team pagination');
  for(let page=2;page<=lastTeamPage;page++){
    const more=await pageProps(config,`teams?page=${page}`);
    teamRows.push(...(more.teams?.data||[]));
  }
  const usedKeys = new Set();
  const keysByName = new Map();
  const ensureTeamKey = (name, abbreviation = '') => {
    if (!keysByName.has(name)) keysByName.set(name, makeTeamKey(name, abbreviation, usedKeys));
    return keysByName.get(name);
  };
  teamRows.forEach(row => ensureTeamKey(row.name, row.team?.abbr));
  (standingProps.standings || []).forEach(row => ensureTeamKey(row.name, row.team?.abbr));

  const teams = Object.fromEntries(teamRows.map(row => [ensureTeamKey(row.name, row.team?.abbr), [row.name, row.image]]));
  const teamDetails = teamRows.map(row => ({
    key: ensureTeamKey(row.name, row.team?.abbr),
    teamId: row.team?.id ?? row.participant_id ?? null,
    participantId: row.id,
    registered: true,
    name: row.name,
    abbreviation: row.team?.abbr || ensureTeamKey(row.name),
    logo: row.image,
    cover: row.team?.cover_display || null,
    url: row.url,
    rosterSize: row.users_count ?? null,
    stats: row.stats || {}
  }));
  const standings = (standingProps.standings || []).map(row => {
    const stats = row.stats || {};
    return [ensureTeamKey(row.name, row.team?.abbr), stats.played || 0, stats.wins || 0, stats.draws || 0,
      stats.losses || 0, stats.goals_for || 0, stats.goals_against || 0, stats.goal_difference || 0, stats.points || 0];
  });
  for (const row of standingProps.standings || []) {
    const key = ensureTeamKey(row.name, row.team?.abbr);
    if (!teams[key]) teams[key] = [row.name, row.image || row.team?.image || ''];
  }

  const scheduleDates = matchProps.schedule?.dates || [];
  const scheduleGroups = matchProps.schedule?.matches || [];
  const dateByRound = new Map(scheduleDates.map(date => [date.round_id, date]));
  const groupedMatches = scheduleGroups.map(group => Object.values(group)[0]).filter(Array.isArray);
  const weeks = groupedMatches.map((matches, index) => {
    const date = dateByRound.get(matches[0]?.competition_season_round_id) || scheduleDates[index] || {};
    const scheduledAt = Number(date.scheduled_at) || Math.floor(Date.parse(date.date || 0) / 1000) || 0;
    return {
      week: index + 1,
      date: String(date.date || 'Date to be announced').replace(/(\d{1,2}:\d{2})(AM|PM)/, '$1 $2'),
      scheduledAt,
      matches: matches.map(match => {
        const home = match.participant_home;
        const away = match.participant_away;
        if (!home?.name || !away?.name) throw new Error(`Virtual Arena ${config.key} returned a match without both teams`);
        const homeKey = ensureTeamKey(home.name, home.team?.abbr);
        const awayKey = ensureTeamKey(away.name, away.team?.abbr);
        if (!teams[homeKey]) teams[homeKey] = [home.name, home.image || ''];
        if (!teams[awayKey]) teams[awayKey] = [away.name, away.image || ''];
        return [match.id, homeKey, awayKey, match.participant_home_score, match.participant_away_score];
      })
    };
  });

  const timestamps = [
    teamProps.season?.updated_at,
    ...teamRows.map(row => row.updated_at),
    ...(standingProps.standings || []).map(row => row.updated_at),
    ...groupedMatches.flat().map(match => match.posted_at)
  ].filter(Boolean).map(Date.parse).filter(Number.isFinite);
  const syncedAt = new Date(timestamps.length ? Math.max(...timestamps) : Date.now()).toISOString();
  return {
    key: config.key,
    division: config.division,
    uflSeason: config.uflSeason,
    game: 'FC27',
    status: weeks.length ? 'active' : 'registration',
    competitionId: config.competitionId,
    seasonId: config.seasonId,
    seriesSource: config.division === '10v10' ? seasonBase : `${BASE}/competition-series/1/seasons/${config.uflSeason}`,
    source: `${seasonBase}/matches`,
    standingsSource: `${seasonBase}/standings`,
    teamsSource: `${seasonBase}/teams`,
    statsSource: `${seasonBase}/stats`,
    syncedAt,
    statsFetchedAt: statsProps.statsUnavailable ? null : syncedAt,
    statsStatus: statsProps.statsUnavailable ? 'pending' : 'available',
    teams,
    teamDetails,
    standings,
    weeks,
    leaderboards: normalizeLeaderboards(statsProps.leaderboards)
  };
}

// A provider disappearance is not authorization to delete a UFL team/page.
// Keep prior entries in the directory, but not in the current registration count.
function retainExistingTeams(current, previous) {
  if (!previous) return current;
  const ids = new Set(current.teamDetails.map(team => team.teamId).filter(Boolean));
  for (const [key, team] of Object.entries(previous.teams || {})) {
    const detail = previous.teamDetails?.find(row => row.key === key);
    if (current.teams[key] || (detail?.teamId && ids.has(detail.teamId))) continue;
    current.teams[key] = team;
    if (detail) current.teamDetails.push({ ...detail, registered: false });
  }
  return current;
}

const archivedSeason = JSON.parse(await readFile('pickems-app/season-data.json', 'utf8'));
archivedSeason.key = 's1-6v6';
archivedSeason.division = '6v6';
archivedSeason.uflSeason = 1;
archivedSeason.game = 'FC26';
archivedSeason.status = 'archived';

// Preserve a division's last good snapshot if its official feed is temporarily
// unavailable, without preventing the other division from refreshing.
const syncResults = await Promise.allSettled(seasons.map(buildSeason));
if (syncResults.every(result => result.status === 'rejected')) {
  throw new Error(`All Virtual Arena divisions failed: ${syncResults.map(result => result.reason.message).join('; ')}`);
}
const liveSeasons = await Promise.all(syncResults.map(async (result, index) => {
  const config = seasons[index];
  if (result.status === 'fulfilled') {
    let previous;
    try { previous = JSON.parse(await readFile(`pickems-app/seasons/${config.key}.json`, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous && (previous.competitionId !== config.competitionId || previous.seasonId !== config.seasonId)) {
      throw new Error(`Refusing to merge a mismatched snapshot for ${config.key}`);
    }
    return retainExistingTeams(result.value, previous);
  }
  console.warn(`::warning::${config.key} refresh failed; retaining last good snapshot. ${result.reason.message}`);
  const previous = JSON.parse(await readFile(`pickems-app/seasons/${config.key}.json`, 'utf8'));
  if (previous.competitionId !== config.competitionId || previous.seasonId !== config.seasonId) {
    throw new Error(`Refusing to retain a mismatched snapshot for ${config.key}`);
  }
  return previous;
}));
const output = { 's1-6v6': archivedSeason, ...Object.fromEntries(liveSeasons.map(season => [season.key, season])) };

await mkdir('pickems-app/seasons', { recursive: true });
await writeFile('pickems-app/seasons/s1-6v6.json', `${JSON.stringify(archivedSeason, null, 2)}\n`);
for (const season of liveSeasons) {
  const json = `${JSON.stringify(season, null, 2)}\n`;
  const variable = season.division === '6v6' ? 'UFL_SEASON_6V6_S2' : 'UFL_SEASON_10V10_S2';
  await writeFile(`pickems-app/seasons/${season.key}.json`, json);
  await writeFile(`pickems-app/season-data-${season.division}-s2.json`, json);
  await writeFile(`pickems-app/season-data-${season.division}-s2.js`, `window.${variable} = ${JSON.stringify(season, null, 2)};\n`);
}
await writeFile('pickems-app/season-data.js', `window.UFL_SEASONS = ${JSON.stringify(output, null, 2)};\nwindow.UFL_SEASON = window.UFL_SEASONS['s2-6v6'];\n`);

for (const season of liveSeasons) {
  const refreshed = syncResults[seasons.findIndex(config => config.key === season.key)].status === 'fulfilled';
  console.log(`${refreshed ? 'Synced' : 'Retained'} ${season.key}: ${season.teamDetails.length} teams, ${season.weeks.length} matchweeks, ${season.weeks.flatMap(week => week.matches).length} matches.`);
}
