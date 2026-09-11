const routes = {
  home: '/', rules: '/rules', teams: '/teams', schedules: '/schedules',
  standings: '/standings', users: '/users', pickems: '/pickems', func: '/func', arcade: '/arcade', wheel: '/wheel', contact: '/contact', privacy: '/privacy', account: '/account', admin: '/admin'
};

const escapeHtml = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

const virtualArena = {
  '6v6': {
    schedule: 'https://ufl.virtualarena.app/competitions/1/seasons/1/matches',
    standings: 'https://ufl.virtualarena.app/competitions/1/seasons/1/standings',
    teams: 'https://ufl.virtualarena.app/competitions/1/seasons/1/teams'
  }
};

const leagueSeason = window.UFL_SEASON;
const leagueTeam = key => leagueSeason?.teams?.[key] || [key, ''];
const signed = value => Number(value) > 0 ? `+${value}` : String(value);

const divisions = {
  '6v6': { title: '6v6 Teams', intro: 'Fast, technical, and just chaotic enough. Meet the squads competing in the six-a-side division.' },
  '10v10': { title: '10v10 Teams', intro: 'Full-pitch tactics, organized squads, and ninety virtual minutes to settle it.' },
  house: { title: 'House Teams', intro: 'The home of drop-ins, community nights, and players looking for their next squad.' }
};

const scheduleTypes = {
  '6v6': ['6v6 League Schedule','Six-a-side fixtures and matchweek results.'],
  '10v10': ['10v10 League Schedule','Full-squad fixtures and matchweek results.'],
  events: ['Community Events Schedule','Community nights, special events, and one-off competitions.'],
  'league-cup': ['League Cup Schedule','The knockout road to silverware.'],
  byot: ['BYOT Tournaments','Bring your own squad and chase the recurring BYOT crown.']
};

const locations = [
  'grilling by the touchline', 'somewhere on the beach', 'lost in the mountains',
  'ankle-deep in the swamp', 'arguing with VAR', 'warming up since 4 PM',
  'at the back post—unmarked', 'checking the transfer market', 'on a tactical smoke break',
  'telling the kids how FIFA 12 did it', 'icing both knees', 'parked in the box',
  'explaining offside to someone who did not ask', 'waiting for one more to join the lobby',
  'checking the couch cushions for skill points', 'blaming input delay',
  'pretending that was a driven pass', 'by the corner flag catching his breath',
  'changing formation for the fifth time', 'requesting more stoppage time',
  'reading the patch notes two seasons late', 'calling next goal wins',
  'holding sprint since 2013', 'yelling man on to an empty room',
  'practicing green-timed finishes in warmups', 'in party chat saying just one more',
  'checking whether the keeper moved', 'drawing tactics on a napkin',
  'waiting for the captain to ready up', 'asking the concession stand for orange slices',
  'measuring the grass for a better excuse', 'looking for the Pro Clubs invite',
  'explaining that chemistry no longer works that way',
  'celebrating before the ball crossed the line', 'still loading into the lobby',
  'managing a hamstring from the recliner', 'insisting the pass was meant for someone else'
];

function pageHero(kicker, title, copy) {
  return `<section class="page-hero"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${copy}</p></div></section>`;
}

function emptyState(title, copy, action = '') {
  return `<div class="empty-state"><img src="/assets/ufl-mark.webp" alt=""><h2>${title}</h2><p>${copy}</p>${action}</div>`;
}

function tenVTenComingSoon(area) {
  return pageHero('FC27 forecast', '10v10 is coming', `${area} will arrive when the next big-pitch era begins.`) +
    `<section class="section"><div class="status-row status-row-center"><span class="season-chip season-chip-upcoming">FC27 · Late October</span></div>${emptyState('Coming Soon to an FC27 Beach Near You', 'The 10v10 Uncs are still finding their sandals, tactics board, and enough players who promise they can make kickoff. The first 10v10 season is planned for late October in FC27.','<a class="button button-primary" href="/" data-link>Return to the clubhouse →</a>')}</section>`;
}

function houseTeamsPage() {
  return pageHero('House teams', 'From the beach to the mountains, find your house.', 'Two houses. One community. Plenty of opportunities to blame the connection.') +
    `<section class="section"><div class="house-team-callout"><span class="section-kicker">Open pickup nights</span><h2>Free to join. Pickup games almost every night.</h2><p>Choose a house, meet the community, and jump in whenever a lobby opens.</p></div><div class="house-team-grid"><article class="card house-team-card"><img class="house-team-logo" src="/assets/fc-sandy-bums.png" alt="FC Sandy Bums crest" loading="lazy" decoding="async"><span class="season-chip season-chip-live">House Team</span><h2>FC Sandy Bums</h2><p>Sun, sand, questionable tan lines, and football played with the confidence of an Unc holding a beverage.</p></article><article class="card house-team-card"><img class="house-team-logo" src="/assets/fc-mountains.png" alt="FC Mountains crest" loading="lazy" decoding="async"><span class="season-chip season-chip-live">House Team</span><h2>FC Mountains</h2><p>Higher elevation, lower oxygen, and absolutely no excuse for losing your runner at the back post.</p></article></div></section>`;
}

function homePage() {
  return `<section class="hero"><div class="hero-inner"><p class="eyebrow">Est. 2026 · EA FC Community League</p><h1>Football for <em>the seasoned.</em></h1><p class="hero-copy">A Discord-born league where football IQ beats pace abuse, the banter stays elite, and every match deserves a post-game story.</p><div class="button-row"><a class="button button-primary" href="/contact" data-link>Join the league →</a><a class="button button-secondary" href="/schedules" data-link>View schedules</a></div></div><div class="ticker"><span>6v6 League</span><span>10v10 League</span><span>House Teams</span><span>Community Cups</span><span>Pick’ems</span><span>No pace merchants*</span></div></section>
  <section class="section home-calendar" id="home-calendar"><span class="section-kicker">Coming up</span><h2>From the clubhouse calendar</h2><div class="home-calendar-grid"><p>Checking the schedule…</p></div></section>
  <section class="section"><span class="section-kicker">Choose your football</span><h2>One community.<br>Plenty of ways to play.</h2><p class="section-intro">Build a club, find a house team, chase the table, or show up for cup night. UFL makes organized EA FC competition feel like the best night in the group chat.</p><div class="cards"><article class="card"><span class="num">06</span><div class="status-row"><span class="season-chip season-chip-live">FC26 Season 1 · In Progress</span><span class="season-chip season-chip-upcoming">FC27 Season 2 · Late October</span></div><h3>6v6 League</h3><p>Quick matches, tight spaces, and nowhere to hide.</p><a href="/teams?division=6v6" data-link>Meet the teams →</a></article><article class="card"><span class="num">10</span><div class="status-row"><span class="season-chip season-chip-upcoming">FC27 · Late October</span></div><h3>10v10 League</h3><p>The full tactical experience for organized clubs.</p><a href="/teams?division=10v10" data-link>Coming in FC27 →</a></article><article class="card"><span class="num">HC</span><h3>House Teams</h3><p>From the beach to the mountains, find your house: FC Sandy Bums or FC Mountains.</p><a href="/teams?division=house" data-link>Find your house →</a></article></div></section>
  <section class="section home-playground"><span class="section-kicker">Around the clubhouse</span><h2>More than match night.</h2><p class="section-intro">Make your picks, build a novelty player card, or let the wheel settle the argument nobody else wants to settle.</p><div class="cards"><article class="card"><span class="num">P</span><h3>UFL Pick’ems</h3><p>Save predictions to your Discord account and climb the shared weekly and season leaderboards.</p><a href="/pickems" data-link>Make your picks →</a></article><article class="card"><span class="num">F</span><h3>FUNC Card Studio</h3><p>Create a Futbol Unc Novelty Card with your face, club crest, position, and custom attributes.</p><a href="/func" data-link>Build your card →</a></article><article class="card"><span class="num">W</span><h3>The Unc Wheel</h3><p>Draft teams, randomize a cup night, and leave the difficult decisions to suspiciously dramatic chance.</p><a href="/wheel" data-link>Spin the wheel →</a></article></div></section>
  <section class="dark-section"><div class="section feature-grid"><div><span class="section-kicker">Built for the group chat</span><h2>Serious matches.<br>Unserious people.</h2><p class="section-intro">Fixtures, tables, rules, predictions, and the legendary Unc Wheel—all under one crest. Competitive enough to matter. Relaxed enough to come back next week.</p><div class="stat-row"><div class="stat"><strong>6v6</strong><span>Quick & technical</span></div><div class="stat"><strong>10v10</strong><span>Full-club football</span></div><div class="stat"><strong>∞</strong><span>Post-match excuses</span></div></div></div><div class="crest-stage"><img src="/assets/ufl-animated.webp" alt="Animated UNC Futbol League crest" decoding="async"></div></div></section>`;
}

function rulesPage() {
  const rules = [
    ['Community rules', [
      'To maintain the casual nature of our league, participation in other leagues (especially money leagues) is discouraged, but not a deal breaker. We are prioritizing a fun, casual environment for all our members. (League exemption being the MPL.)',
      '<strong>No assholes.</strong> This community is intended to be lighthearted and fun for everyone involved. We will be operating on a 3-strike policy. Once you have exhausted your 3 strikes, you will be banned from participating in the league. Please be respectful with your fellow players.'
    ]],
    ['Match days & times', [
      '<strong>Schedule:</strong> Matches will be played on Tuesdays and Thursdays.',
      '<strong>Kickoff Times:</strong> Games start at 11:00 PM Eastern. <span class="rule-update">Season 2 update: kickoff will move up to 10:00 PM Eastern.</span>',
      '<strong>Format:</strong> Each matchup consists of playing one opponent per night.'
    ]],
    ['Matchplay & gameplay restrictions', [
      'To ensure games stay high-scoring, fun, and free of sweaty exploits, the following in-game rules are strictly enforced:',
      '<strong>AI Goalkeepers only.</strong> Absolutely no human-controlled goalkeepers. Human keepers are entirely too overpowered and ruin the flow. We want to see goals, beautiful build-up play, and clinical finishes—let the AI do its job.',
      '<strong>No Goalie Blocking / Griefing:</strong> You are not allowed to obstruct, run into, or block the AI goalkeeper to prevent them from throwing or “kicking” the ball away. Let them play out.',
      '<strong>Free Kicks and Corner Etiquette:</strong> When the opponent has a free kick near the box, do not manually park players on the goal line behind the wall to block the shot. Trust your wall and your AI keeper. Attackers are not allowed to block the goalie on corners or free kicks.',
      '<strong>Anti-Sweat / No Time Wasting:</strong> We are all here to play the game, not watch the clock. Holding the ball in the corner flag to shield it and waste time at the end of a half or match is strictly prohibited. Play the game properly until the final whistle.',
      '<strong>Lag Outs:</strong> If a player disconnects within the first 10 match minutes, the match may be restarted unless a clear goal has already been scored.'
    ]],
    ['Attendance, grace periods & rescheduling', [
      '<strong>Grace Period:</strong> Teams will have a 10-minute grace period from the scheduled start time.',
      '<strong>Forfeits:</strong> After 10 minutes, a failure to show results in an auto-forfeit, and the opposing team receives a 3–0 win and 3 points.',
      '<strong>Rescheduling:</strong> Teams may request a reschedule with at least 2 hours’ notice. This may be declined by the opposing team, which would result in a forfeit for the team requesting a reschedule.'
    ]],
    ['Roster requirements & limits', [
      '<strong>Roster Limits:</strong> 6 Players Max Per Team. To ensure everyone gets decent touches, solid playtime, and squads remain manageable, rosters are capped at a maximum of 6 players per team.',
      '<strong>Minimum Player Count:</strong> Each team must have at least 3 players rostered to play.',
      '<strong>Discord Requirement:</strong> All rostered players must be in the Discord server.',
      '<strong>Roster Submission:</strong> Teams must post their full roster in the designated channel.'
    ]],
    ['The UFL code of conduct — don’t be a dickhead', [
      'We are all adults with jobs, families, and limited free time. This league is an escape, not a Pro-Clubs World Cup qualifier.',
      '<strong>Banter vs. Toxicity:</strong> Friendly trash talk and banter are highly encouraged—it’s half the fun. However, zero tolerance for genuine abuse, ridiculing, or bashing out opponents.',
      '<strong>Keep it Casual:</strong> If someone makes a mistake, missclicks, or misses an open net, laugh it off. Don’t sweat your teammates or berate the opposition.',
      '<strong>The Golden Rule:</strong> Keep it fun, keep it respectful, and don’t be a dickhead. Persistent toxicity will result in a swift boot from the league.'
    ]]
  ];
  return pageHero('Rules & information','League rules','Play some good fútbol, have a laugh, and enjoy the downtime. These rules keep the vibes immaculate and the games flowing.') +
    `<section class="section"><div class="rule-list">${rules.map(([heading,items],i)=>`<details class="rule" ${i===0?'open':''}><summary>${heading}</summary><ul>${items.map(item=>`<li>${item}</li>`).join('')}</ul></details>`).join('')}</div><aside class="notice commissioner-note"><strong>Commissioner’s note:</strong> These rules are in place so we can actually enjoy our evenings. Show up, play hard, laugh at the EA jank, and let’s have a good season.</aside></section>`;
}

function teamsPage(params) {
  const division = params.get('division') || '6v6';
  if (division === '10v10') return tenVTenComingSoon('Teams and rosters');
  if (division === 'house') return houseTeamsPage();
  const data = divisions[division] || divisions['6v6'];
  const tabs = Object.entries(divisions).map(([key,val]) => key === '6v6'
    ? `<a class="tab active" href="/teams?division=6v6" data-link>${val.title}</a>`
    : `<a class="tab ${key===division?'active':''}" href="/teams?division=${key}" data-link>${val.title}</a>`).join('');
  const cards = leagueSeason?.teamDetails?.map(team => `<a class="league-team-card" href="${escapeHtml(team.url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.name)} crest" loading="lazy"><div><span>${escapeHtml(team.abbreviation)}</span><h2>${escapeHtml(team.name)}</h2><p>${team.stats.wins ?? 0}W · ${team.stats.draws ?? 0}D · ${team.stats.losses ?? 0}L${team.rosterSize!==null?` · ${team.rosterSize} players`:''}</p></div><b>View team ↗</b></a>`).join('');
  return pageHero('The clubs',data.title,data.intro) + `<section class="section"><div class="tabs">${tabs}</div><p class="sync-note">Synced from Virtual Arena · ${leagueSeason?new Date(leagueSeason.syncedAt).toLocaleString():'data unavailable'}</p>${cards?`<div class="league-team-grid">${cards}</div>`:emptyState('Squads assembling','Official team data is temporarily unavailable.')}</section>`;
}

function schedulesPage(params) {
  const requestedType = params.get('type');
  if (!requestedType) {
    const destinations=[['6v6','6v6 League','Weekly fixtures and results, organized by matchweek.','/schedules?type=6v6'],['10v10','10v10 League','The upcoming full-squad schedule.','/schedules?type=10v10'],['events','Community Events','Community nights and special formats.','/schedules/community-events'],['league-cup','League Cup','Official cup fixtures and knockout rounds.','/schedules/league-cup'],['byot','BYOT Tournaments','Recurring bring-your-own-team competitions.','/schedules/byot-tournaments']];
    return pageHero('Match centre','Schedules','Every league, cup, community event, and BYOT tournament in one place.')+`<section class="section"><div class="schedule-hub">${destinations.map(([key,title,copy,href])=>`<a class="card schedule-hub-card" href="${href}" data-link><span class="num">${key==='6v6'?'6V6':key==='10v10'?'10V10':key==='league-cup'?'LC':key==='events'?'CE':'BY'}</span><h2>${title}</h2><p>${copy}</p><strong>Open schedule →</strong></a>`).join('')}</div></section>`;
  }
  if (requestedType === '10v10') return pageHero('Match centre','10v10 League Schedule','Full-squad fixtures will appear here when the FC27 10v10 season begins.')+`<section class="section">${scheduleLandingTabs('10v10')}<div class="status-row"><span class="season-chip season-chip-upcoming">FC27 · Late October</span></div>${emptyState('10v10 schedule coming soon','The complete schedule will remain inside this tab when the division begins.')}</section>`;
  const type = '6v6';
  const data = scheduleTypes[type];
  const weeks = leagueSeason?.weeks?.map(week => `<section class="schedule-week"><div class="schedule-week-head"><span class="section-kicker">Matchweek</span><h2>Week ${week.week}</h2><p>${escapeHtml(week.date)}</p></div><div class="table-wrap"><table><thead><tr><th>Match</th><th>Home</th><th>Away</th><th>Result</th></tr></thead><tbody>${week.matches.map(([id,home,away,homeScore,awayScore],matchIndex)=>{const played=homeScore!==null&&awayScore!==null;return `<tr><td><strong>Match ${matchIndex+1}</strong></td><td>${escapeHtml(leagueTeam(home)[0])}</td><td>${escapeHtml(leagueTeam(away)[0])}</td><td><a class="result-link ${played?'final':'upcoming'}" href="https://ufl.virtualarena.app/matches/${id}" target="_blank" rel="noopener noreferrer">${played?`${homeScore}–${awayScore} · Final`:'Upcoming'} ↗</a></td></tr>`;}).join('')}</tbody></table></div></section>`).join('');
  return pageHero('Match centre',data[0],data[1]) + `<section class="section">${scheduleLandingTabs(type)}<p class="sync-note">Official fixtures and results · synced from Virtual Arena</p><div class="schedule-weeks">${weeks || emptyState('Schedule temporarily unavailable','The official 6v6 fixtures could not be loaded.')}</div></section>`;
}

function scheduleLandingTabs(active) {
  return `<div class="tabs schedule-tabs"><a class="tab ${active==='6v6'?'active':''}" href="/schedules?type=6v6" data-link>6v6</a><a class="tab ${active==='10v10'?'active':''}" href="/schedules?type=10v10" data-link>10v10</a><a class="tab ${active==='events'?'active':''}" href="/schedules/community-events" data-link>Community Events</a><a class="tab ${active==='league-cup'?'active':''}" href="/schedules/league-cup" data-link>League Cup</a><a class="tab ${active==='byot'?'active':''}" href="/schedules/byot-tournaments" data-link>BYOT Tournaments</a></div>`;
}

function communityEventsPage() {
  return pageHero('Community calendar','Community Events Schedule','Draft nights, random squads, special formats, and the sort of ideas that sound even better after kickoff.') +
    `<section class="section schedule-landing">${scheduleLandingTabs('events')}<div id="published-events" data-destination="community-events">${emptyState('Checking the cookout calendar','Loading published community events…')}</div></section>`;
}

function leagueCupPage() {
  return pageHero('Road to silverware','League Cup Schedule','One bracket, no league-table excuses, and a trophy somebody will mention for the next five years.') +
    `<section class="section schedule-landing">${scheduleLandingTabs('league-cup')}<div id="published-events" data-destination="league-cup">${emptyState('Checking the engraver','Loading the published cup draw…')}</div></section>`;
}

function byotBuilder() {
  return `<section class="byot-builder" id="byot-builder" hidden><div class="byot-builder-head"><div><span class="section-kicker">Owner / admin tools</span><h2>Create the next BYOT tournament</h2><p>Set the field, groups, bracket and local kickoff time, then publish it directly to this schedule.</p></div><span class="season-chip season-chip-live">Protected</span></div><div class="byot-presets" aria-label="Reusable tournament configurations"><div><span class="section-kicker">Quick setup</span><strong>Reusable configurations</strong></div><button class="byot-preset" type="button" data-byot-preset="groups-8"><b>8 teams</b><span>2 groups of 4 · top 2 advance · semifinals</span></button><button class="byot-preset" type="button" data-byot-preset="league-12"><b>12 teams</b><span>4 league games · top 6 direct · next 4 play in</span></button></div><form id="byot-form"><div class="byot-fields"><label>Tournament name<input name="title" value="BYOT Tournament" maxlength="120" required></label><label>Date and kickoff<input name="startsAt" type="datetime-local" required></label><label>Team count<select name="teamCount"><option>4</option><option>6</option><option selected>8</option><option>9</option><option>12</option><option>15</option><option>16</option></select></label><label>Group count<select name="groupCount"><option value="1">1 · League phase</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label><label>Format<select name="format"><option value="groups">Groups + knockout</option><option value="league">League phase + knockout</option><option value="knockout">Straight knockout</option></select></label><label>Advance per group<select name="qualifiers"><option>1</option><option selected>2</option></select></label><label>League games per team<select name="leagueGames"></select></label><label>League qualification<select name="qualificationPlan"></select></label></div><p class="byot-format-help">Group format supports balanced groups of two to four. League phase puts everyone in one table with the same guaranteed game count; the top teams qualify directly, the next teams enter seeded play-ins, and every available split produces a clean knockout bracket.</p><label class="byot-team-label">Team names <small>One per line. The list automatically follows the selected team count.</small><textarea name="teams" rows="8" placeholder="Pistoleros CF&#10;UFL Lyon&#10;Team 3&#10;Team 4" required></textarea></label><div class="button-row"><button class="button button-primary" type="submit">Save + publish BYOT →</button><button class="button button-secondary" type="button" id="byot-preview">Preview format</button></div><p class="byot-message" id="byot-message" aria-live="polite"></p><div id="byot-preview-board"></div></form></section>`;
}

const inauguralByotDefaults = {id:'inaugural',title:'Pistoleros CF lift the first crown',eventDate:'2026-09-04',lifecycleStatus:'completed',champion:'Pistoleros CF',finalist:'UFL Lyon',championScore:5,finalistScore:2,roster:['Dez','Gucci','Dloww','Luis']};

function inauguralByot(record=inauguralByotDefaults, editable=false) {
  const item={...inauguralByotDefaults,...record},date=new Date(`${item.eventDate}T12:00:00`),shortDate=date.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'}),longDate=date.toLocaleDateString([],{month:'long',day:'numeric',year:'numeric'});
  const editor=editable?`<form class="byot-history-editor" data-byot-history="${escapeHtml(item.id)}"><h3>Edit completed-event details</h3><div><label>Display title<input name="title" value="${escapeHtml(item.title)}" required></label><label>Date<input name="eventDate" type="date" value="${escapeHtml(item.eventDate)}" required></label><label>Status<select name="lifecycleStatus">${['upcoming','live','completed','archived'].map(status=>`<option value="${status}" ${status===item.lifecycleStatus?'selected':''}>${status}</option>`).join('')}</select></label><label>Champion<input name="champion" value="${escapeHtml(item.champion)}" required></label><label>Champion score<input name="championScore" type="number" min="0" max="99" value="${escapeHtml(item.championScore)}" required></label><label>Finalist<input name="finalist" value="${escapeHtml(item.finalist)}" required></label><label>Finalist score<input name="finalistScore" type="number" min="0" max="99" value="${escapeHtml(item.finalistScore)}" required></label><label>Winning roster<input name="roster" value="${escapeHtml((item.roster||[]).join(', '))}"></label></div><button class="button button-primary" type="submit">Save event details</button><span data-byot-history-message aria-live="polite"></span></form>`:'';
  return `<details class="published-event byot-inaugural" data-published-event="inaugural" open><summary class="published-event-head"><div><span class="section-kicker">Inaugural BYOT Tournament</span><h2>${escapeHtml(item.title)}</h2><strong class="event-winner">🏆 Champion: ${escapeHtml(item.champion)}</strong></div><div><span class="season-chip event-status-${escapeHtml(item.lifecycleStatus)}">${escapeHtml(item.lifecycleStatus)}</span><span class="season-chip season-chip-live">${escapeHtml(shortDate)}</span><i aria-hidden="true"></i></div></summary><div class="published-event-body">${eventShareTools({id:'inaugural',snapshot:{series:'byot'}},new URLSearchParams(window.location.search).get('event')==='inaugural')}<div class="byot-champion"><img src="/assets/pistoleros-cf.png" alt="Pistoleros CF crest" loading="lazy" decoding="async"><div><span class="section-kicker">Final · ${escapeHtml(longDate)}</span><h3>${escapeHtml(item.champion)} <b>${escapeHtml(item.championScore)}–${escapeHtml(item.finalistScore)}</b> ${escapeHtml(item.finalist)}</h3><p><strong>Winning team:</strong> ${(item.roster||[]).map(escapeHtml).join(' · ')}</p></div></div>${editor}</div></details>`;
}

function byotTournamentsPage() {
  return pageHero('Recurring tournament series','BYOT Tournaments','Bring your own team, choose the format, and play from group stage to trophy night.') +
    `<section class="section schedule-landing">${scheduleLandingTabs('byot')}<div class="byot-series-intro"><div><span class="section-kicker">Bring Your Own Team</span><h2>Your squad. Your format. One champion.</h2></div><p>Published draws, local kickoff times, live brackets and completed champions all stay together here.</p></div>${byotBuilder()}<div id="byot-events">${inauguralByot()}</div></section>`;
}

function eventMatches(snapshot) {
  if (snapshot?.kind === 'draw') return (snapshot.session?.teams || []).map(team => ({ home: team.name, away: (team.playerIds || []).map(id => snapshot.session.players.find(player => player.id === id)?.name).filter(Boolean).join(', '), label: 'Roster' }));
  const group = snapshot?.groupStage?.fixtures || [];
  const league = snapshot?.leagueSnapshot?.fixtures || [];
  const bracket = (snapshot?.rounds || []).flatMap((round, roundIndex) => round.map(match => ({ ...match, label: roundIndex === snapshot.rounds.length - 1 ? 'Final' : `Round ${roundIndex + 1}` })));
  return [...group.map(match => ({ ...match, label: `Group ${String.fromCharCode(65 + match.groupIndex)}` })), ...league.map(match => ({ ...match, label: 'League phase' })), ...bracket].filter(match => match.home || match.away);
}

function eventWinner(snapshot) {
  const rounds = snapshot?.rounds || [];
  return rounds.length ? rounds[rounds.length - 1]?.[0]?.winner : null;
}

function eventSchedulePath(event) {
  if (event?.snapshot?.series === 'byot' || event?.id === 'inaugural') return '/schedules/byot-tournaments';
  return event?.destination === 'league-cup' ? '/schedules/league-cup' : '/schedules/community-events';
}

function eventSharePath(event) {
  return `${eventSchedulePath(event)}?event=${encodeURIComponent(event.id)}`;
}

function eventShareTools(event, includeAll=false) {
  return `<div class="event-share-tools"><button class="tab" type="button" data-share-event="${escapeHtml(eventSharePath(event))}">Copy tournament link</button>${includeAll?`<a class="tab" href="${eventSchedulePath(event)}" data-link>View all tournaments</a>`:''}</div>`;
}

function requestedEvent(items) {
  const requested = new URLSearchParams(window.location.search).get('event');
  if (!requested) return { events: items, focused: false };
  const match = items.find(item => item.id === requested);
  return match ? { events: [match], focused: true } : { events: items, focused: false };
}

function wireEventShareButtons(root=document) {
  root.querySelectorAll('[data-share-event]').forEach(button=>{
    if(button.dataset.shareBound) return;
    button.dataset.shareBound='true';
    button.addEventListener('click',async()=>{
    const url=new URL(button.dataset.shareEvent,window.location.origin).href;
    try { await navigator.clipboard.writeText(url); button.textContent='Link copied'; }
    catch { window.prompt('Copy this tournament link:',url); }
    });
  });
}

function publicGroupTable(group, fixtures) {
  const rows = new Map(group.map(name => [name, { name, played: 0, difference: 0, points: 0 }]));
  fixtures.forEach(match => {
    if (match.homeScore === '' || match.awayScore === '') return;
    const home = rows.get(match.home), away = rows.get(match.away);
    if (!home || !away) return;
    const hs = Number(match.homeScore), as = Number(match.awayScore);
    home.played++; away.played++; home.difference += hs-as; away.difference += as-hs;
    if (hs === as) { home.points++; away.points++; } else if (hs > as) home.points += 3; else away.points += 3;
  });
  return [...rows.values()].sort((a,b) => b.points-a.points || b.difference-a.difference || a.name.localeCompare(b.name));
}

function publicLeagueTable(names, fixtures) {
  const rows = new Map((names || []).filter(Boolean).map(name => [name,{name,played:0,won:0,drawn:0,lost:0,difference:0,points:0}]));
  (fixtures || []).forEach(match=>{
    if(match.homeScore==='' || match.awayScore==='' || match.homeScore==null || match.awayScore==null) return;
    const home=rows.get(match.home),away=rows.get(match.away); if(!home||!away) return;
    const hs=Number(match.homeScore),as=Number(match.awayScore); home.played++; away.played++; home.difference+=hs-as; away.difference+=as-hs;
    if(hs===as){home.drawn++;away.drawn++;home.points++;away.points++;}else if(hs>as){home.won++;away.lost++;home.points+=3;}else{away.won++;home.lost++;away.points+=3;}
  });
  return [...rows.values()].sort((a,b)=>b.points-a.points||b.difference-a.difference||a.name.localeCompare(b.name));
}

function publicGroupFixtures(group,index,doubleRound=false) {
  return group.flatMap((home,homeIndex)=>group.slice(homeIndex+1).flatMap((away,awayIndex)=>{
    const first={id:`public-g${index}-${homeIndex}-${awayIndex}-1`,groupIndex:index,home,away,homeScore:'',awayScore:''};
    return doubleRound?[first,{...first,id:`${first.id}-2`,home:away,away:home}]:[first];
  }));
}

function editableScore(match, editable, compact=false) {
  const value = side => match[`${side}Score`] ?? '';
  if (!editable) return compact
    ? `<b class="event-inline-score event-inline-score-readonly"><span>${value('home') !== '' ? escapeHtml(String(value('home'))) : '–'}</span><em>–</em><span>${value('away') !== '' ? escapeHtml(String(value('away'))) : '–'}</span></b>`
    : `<b>${value('home') !== '' ? `${escapeHtml(String(value('home')))}–${escapeHtml(String(value('away')))}` : 'TBD'}</b>`;
  const disabled=!match.home||!match.away||match.home==='TBD'||match.away==='TBD'?' disabled':'';
  const fields=`<input data-event-score data-match-id="${escapeHtml(match.id)}" data-score-side="home" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" aria-label="${escapeHtml(match.home||'Home')} score" value="${escapeHtml(value('home'))}"${disabled}><span>–</span><input data-event-score data-match-id="${escapeHtml(match.id)}" data-score-side="away" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" aria-label="${escapeHtml(match.away||'Away')} score" value="${escapeHtml(value('away'))}"${disabled}>`;
  return compact ? `<b class="event-inline-score">${fields}</b>` : `<b class="event-bracket-score">${fields}</b>`;
}

function normalizedScoreInput(value) {
  const digits=String(value??'').replace(/\D/g,'').slice(0,2);
  return digits===''?'':Math.max(0,Math.min(99,Number(digits)));
}

function publicMatch(match, label, editable=false, bracketSlot=false) {
  const content=`<div class="event-bracket-match"><small>${escapeHtml(label)}</small><span class="${match.winner === match.home ? 'winner' : ''}" title="${escapeHtml(match.home || 'TBD')}">${escapeHtml(match.home || 'TBD')}</span>${editableScore(match,editable)}<span class="${match.winner === match.away ? 'winner' : ''}" title="${escapeHtml(match.away || 'TBD')}">${escapeHtml(match.away || 'TBD')}</span></div>`;
  return bracketSlot?`<div class="event-bracket-slot">${content}</div>`:content;
}

function eventBoard(snapshot, editable=false) {
  if (snapshot?.kind === 'draw') {
    return `<div class="event-roster-grid">${(snapshot.session?.teams || []).map(team => `<article><h3>${escapeHtml(team.name)}</h3><p>${(team.playerIds || []).map(id => snapshot.session.players.find(player => player.id === id)?.name).filter(Boolean).map(escapeHtml).join(' · ') || 'Roster pending'}</p></article>`).join('')}</div>`;
  }
  const columns = [];
  const roundColumns = [];
  let leagueColumn = '';
  let qualificationColumn = '';
  let groups = snapshot?.groupStage?.groups || snapshot?.groupSetup || [];
  if(snapshot?.format==='groups' && !groups.length && snapshot?.names?.length) {
    const count=Math.max(2,Number(snapshot.groupCount)||2); groups=Array.from({length:count},()=>[]);
    snapshot.names.filter(Boolean).forEach((name,index)=>groups[index%count].push(name));
  }
  groups.forEach((group, index) => {
    const savedFixtures = (snapshot.groupStage?.fixtures || []).filter(match => match.groupIndex === index);
    const fixtures = savedFixtures.length ? savedFixtures : publicGroupFixtures(group,index,Boolean(snapshot.doubleElimination));
    const table = publicGroupTable(group, fixtures);
    columns.push(`<section class="event-stage-column group-column"><h3>Group ${String.fromCharCode(65+index)}</h3><div class="event-group-table"><div class="event-table-head"><b>#</b><strong>Team</strong><span>P</span><span>GD</span><span>Pts</span></div>${table.map((row, place) => `<div><b>${place+1}</b><strong>${escapeHtml(row.name)}</strong><span>${row.played}</span><span>${row.difference > 0 ? '+' : ''}${row.difference}</span><span>${row.points}</span></div>`).join('')}</div><h4>Matches</h4><div class="event-group-matches">${fixtures.map(match => `<div><span>${escapeHtml(match.home)}</span>${editableScore(match,editable,true)}<span>${escapeHtml(match.away)}</span></div>`).join('')}</div></section>`);
  });
  if(snapshot?.qualifyingPlayoffs?.length) qualificationColumn=`<section class="event-stage-column knockout-column qualification-column"><h3>Final qualifiers</h3><div class="event-stage-matches">${snapshot.qualifyingPlayoffs.map(match=>publicMatch(match,'Play-in',editable)).join('')}</div><div class="event-stage-placeholder compact-placeholder"><p>Lowest qualifying seeds play for the remaining bracket places.</p></div></section>`;
  if(snapshot?.format==='league' && snapshot?.leagueSnapshot) {
    const league=snapshot.leagueSnapshot,table=publicLeagueTable(snapshot.names,league.fixtures);
    leagueColumn=`<section class="event-stage-column event-league-column"><h3>League standings</h3><div class="event-league-table"><div class="event-table-head"><b>#</b><strong>Team</strong><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>Pts</span></div>${table.map((row,index)=>`<div class="${index<league.directPlaces?'direct':index<league.directPlaces+league.playoffPlaces?'playoff':''}"><b>${index+1}</b><strong title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</strong><span>${row.played}</span><span>${row.won}</span><span>${row.drawn}</span><span>${row.lost}</span><span>${row.difference>0?'+':''}${row.difference}</span><b>${row.points}</b></div>`).join('')}</div><div class="qualification-key"><span>Top ${league.directPlaces} direct</span><span>Next ${league.playoffPlaces} to playoff</span></div><h4>League matches</h4><div class="event-league-fixtures">${(league.fixtures||[]).map(match=>`<div><span title="${escapeHtml(match.home)}">${escapeHtml(match.home)}</span>${editableScore(match,editable,true)}<span title="${escapeHtml(match.away)}">${escapeHtml(match.away)}</span></div>`).join('')}</div></section>`;
    qualificationColumn=`<section class="event-stage-column knockout-column qualification-column"><h3>Qualification playoffs</h3>${league.playoffs?.length?`<div class="event-stage-matches">${league.playoffs.map(match=>publicMatch(match,'Playoff',editable)).join('')}</div>`:`<div class="event-stage-placeholder"><strong>${league.playoffPlaces||0} playoff places</strong><p>Matchups appear when the league phase is complete.</p></div>`}</section>`;
  }
  (snapshot?.rounds || []).forEach((round, index, rounds) => {
    const remaining = rounds.length-index;
    const title = remaining === 1 ? 'Final' : remaining === 2 ? 'Semifinals' : remaining === 3 ? 'Quarterfinals' : `KO round ${index+1}`;
    const roundColumn=`<section class="event-stage-column knockout-column event-round-${index + 1} event-round-size-${round.length}"><h3>${title}</h3><div class="event-stage-matches">${round.map(match => publicMatch(match, title, editable, true)).join('')}</div></section>`;
    roundColumns.push(roundColumn);
  });
  if((snapshot?.format==='groups'||snapshot?.format==='league') && !(snapshot?.rounds||[]).length) columns.push(`<section class="event-stage-column knockout-column"><h3>Knockout bracket</h3><div class="event-stage-placeholder"><strong>Awaiting qualifiers</strong><p>The bracket will appear here automatically when it is created in the event builder.</p></div></section>`);
  const winner = eventWinner(snapshot);
  const champion=roundColumns.length?`<aside class="event-champion-panel"><small>Match centre</small><h3>Winner</h3><div><span>🏆</span><strong>${escapeHtml(winner||'To be decided')}</strong></div></aside>`:'';
  const bracketFlow=roundColumns.length?`<div class="event-knockout-flow"><div class="event-opening-stack">${roundColumns[0]}${qualificationColumn}</div>${roundColumns.length>2?roundColumns.slice(1,-1).join(''):''}<div class="event-final-stack">${roundColumns.length>1?roundColumns.at(-1):''}${champion}</div></div>`:'';
  if(snapshot?.format==='league') return `<div class="event-tournament-board event-board-league">${leagueColumn}${bracketFlow}</div>`;
  return `<div class="event-tournament-board">${columns.join('')}${bracketFlow?`<div class="event-knockout-flow-wide">${bracketFlow}</div>`:''}</div>`;
}

function allCompetitionMatches(snapshot) {
  return [
    ...(snapshot?.groupStage?.fixtures||[]),
    ...(snapshot?.leagueSnapshot?.fixtures||[]),
    ...(snapshot?.leagueSnapshot?.playoffs||[]),
    ...(snapshot?.qualifyingPlayoffs||[]),
    ...(snapshot?.rounds||[]).flat()
  ];
}

function assignCompetitionMatch(match,home,away) {
  if(match.home!==home||match.away!==away) Object.assign(match,{home,away,homeScore:'',awayScore:'',winner:''});
}

function decideCompetitionMatch(match) {
  if(match.homeScore===''||match.awayScore===''||Number(match.homeScore)===Number(match.awayScore)) return void (match.winner='');
  match.winner=Number(match.homeScore)>Number(match.awayScore)?match.home:match.away;
}

function recalculateCompetition(snapshot) {
  let qualifiers=null;
  if(snapshot?.format==='league'&&snapshot.leagueSnapshot) {
    const league=snapshot.leagueSnapshot,table=publicLeagueTable(snapshot.names,league.fixtures);
    league.playoffs.forEach((match,index)=>{
      assignCompetitionMatch(match,table[league.directPlaces+index]?.name||'TBD',table[league.directPlaces+league.playoffPlaces-1-index]?.name||'TBD');
      decideCompetitionMatch(match);
    });
    qualifiers=[...table.slice(0,league.directPlaces).map(row=>row.name),...league.playoffs.map(match=>match.winner||'TBD')];
  } else if(snapshot?.format==='groups'&&snapshot.groupStage) {
    const ranked=(snapshot.groupStage.groups||snapshot.groupSetup||[]).flatMap((group,groupIndex)=>publicGroupTable(group,snapshot.groupStage.fixtures.filter(match=>match.groupIndex===groupIndex)).slice(0,snapshot.qualifiers).map((row,rank)=>({...row,rank})));
    ranked.sort((a,b)=>a.rank-b.rank||b.points-a.points||b.difference-a.difference||a.name.localeCompare(b.name));
    const bracketSize=snapshot.rounds?.[0]?.length*2||0,playIns=snapshot.qualifyingPlayoffs||[],directCount=Math.max(0,bracketSize-playIns.length);
    playIns.forEach((match,index)=>{
      const pool=ranked.slice(directCount);
      assignCompetitionMatch(match,pool[index]?.name||'TBD',pool[pool.length-1-index]?.name||'TBD');
      decideCompetitionMatch(match);
    });
    qualifiers=[...ranked.slice(0,directCount).map(row=>row.name),...playIns.map(match=>match.winner||'TBD')];
  }
  const firstRound=snapshot.rounds?.[0]||[];
  if(qualifiers) firstRound.forEach((match,index)=>assignCompetitionMatch(match,qualifiers[index]||'TBD',qualifiers[qualifiers.length-1-index]||'TBD'));
  firstRound.forEach(decideCompetitionMatch);
  for(let roundIndex=1;roundIndex<(snapshot.rounds||[]).length;roundIndex++) snapshot.rounds[roundIndex].forEach((match,index)=>{
    const previous=snapshot.rounds[roundIndex-1];
    assignCompetitionMatch(match,previous[index*2]?.winner||'TBD',previous[index*2+1]?.winner||'TBD');
    decideCompetitionMatch(match);
  });
}

async function hydratePublishedEvents() {
  const root = document.querySelector('#published-events');
  if (!root) return;
  try {
    const [response,sessionResponse] = await Promise.all([fetch(`/api/events?destination=${root.dataset.destination}`),fetch('/api/auth/session',{credentials:'same-origin'})]);
    const data = await response.json(),session=sessionResponse.ok?await sessionResponse.json():{};
    if (!response.ok) throw new Error();
    const visibleEvents = root.dataset.destination === 'community-events' ? data.events.filter(item=>item.snapshot?.series!=='byot') : data.events;
    if (!visibleEvents.length) return void (root.innerHTML = emptyState(root.dataset.destination === 'league-cup' ? 'The bracket is still at the engraver' : 'The cookout calendar is warming up', 'No event has been published here yet.'));
    const mayEdit=session.authenticated&&['owner','admin'].includes(session.user?.role);
    const paint=()=>{
      const view=requestedEvent(visibleEvents);
      root.innerHTML = `<div class="published-event-list">${view.events.map(item => {
        const winner = eventWinner(item.snapshot);
        const date = item.startsAt ? new Date(item.startsAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'Time to be announced';
        const controls=mayEdit?`<div class="event-results-actions"><button class="button button-primary" type="button" data-save-event-results="${escapeHtml(item.id)}">Save live results</button><span data-event-results-message="${escapeHtml(item.id)}" aria-live="polite">Enter scores above; tables and winners recalculate automatically.</span></div>`:'';
        return `<details class="published-event" data-published-event="${escapeHtml(item.id)}" open><summary class="published-event-head"><div><span class="section-kicker">${escapeHtml(item.format.replaceAll('-', ' '))}</span><h2>${escapeHtml(item.title)}</h2>${winner ? `<strong class="event-winner">🏆 Winner: ${escapeHtml(winner)}</strong>` : ''}</div><div><span class="season-chip event-status-${escapeHtml(item.lifecycleStatus)}">${escapeHtml(item.lifecycleStatus)}</span><span class="season-chip season-chip-live">${escapeHtml(date)}</span><i aria-hidden="true"></i></div></summary><div class="published-event-body">${eventShareTools(item,view.focused)}${eventBoard(item.snapshot,mayEdit)}${controls}</div></details>`;
      }).join('')}</div>`;
      wireEventShareButtons(root);
      root.querySelectorAll('[data-event-score]').forEach(input=>input.addEventListener('change',()=>{
        const item=visibleEvents.find(event=>event.id===input.closest('[data-published-event]')?.dataset.publishedEvent);
        const match=allCompetitionMatches(item?.snapshot).find(candidate=>candidate.id===input.dataset.matchId);
        if(!match)return;
        match[`${input.dataset.scoreSide}Score`]=normalizedScoreInput(input.value);
        recalculateCompetition(item.snapshot);
        paint();
      }));
      root.querySelectorAll('[data-save-event-results]').forEach(button=>button.addEventListener('click',async()=>{
        const item=visibleEvents.find(event=>event.id===button.dataset.saveEventResults),message=root.querySelector(`[data-event-results-message="${button.dataset.saveEventResults}"]`);
        button.disabled=true;if(message)message.textContent='Saving results…';
        const save=await fetch('/api/admin/events',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,title:item.title,destination:item.destination,format:item.format,startsAt:item.startsAt,status:'published',snapshot:item.snapshot})});
        if(save.ok){if(message)message.textContent='Live results saved.';button.disabled=false;}else{const result=await save.json().catch(()=>({}));if(message)message.textContent=result.error||'Unable to save results.';button.disabled=false;}
      }));
    };
    paint();
  } catch { root.innerHTML = emptyState('Schedule temporarily unavailable','The published event list could not be loaded. Please try again shortly.'); }
}

function balancedLeagueFixtures(names,gamesPerTeam) {
  const fixtures=[],seen=new Set(),count=names.length;
  for(let offset=1;offset<=Math.floor(gamesPerTeam/2);offset++) for(let homeIndex=0;homeIndex<count;homeIndex++) {
    const awayIndex=(homeIndex+offset)%count,key=[homeIndex,awayIndex].sort((a,b)=>a-b).join('-');
    if(!seen.has(key)){seen.add(key);fixtures.push({id:`byot-league-${homeIndex}-${awayIndex}`,home:names[homeIndex],away:names[awayIndex],homeScore:'',awayScore:''});}
  }
  if(gamesPerTeam%2===1) for(let homeIndex=0;homeIndex<count/2;homeIndex++){const awayIndex=homeIndex+count/2;fixtures.push({id:`byot-league-opposite-${homeIndex}`,home:names[homeIndex],away:names[awayIndex],homeScore:'',awayScore:''});}
  return fixtures;
}

function makeByotSnapshot(form) {
  const count = Number(form.elements.teamCount.value);
  const names = form.elements.teams.value.split(/\r?\n/).map(name=>name.trim()).filter(Boolean);
  if (names.length !== count) throw new Error(`Enter exactly ${count} team names.`);
  const format = form.elements.format.value;
  if(format==='league') {
    const [directPlaces,playoffPlaces]=form.elements.qualificationPlan.value.split(':').map(Number);
    const gamesPerTeam=Number(form.elements.leagueGames.value);
    const bracketSize=directPlaces+playoffPlaces/2;
    if(!directPlaces||playoffPlaces<0||directPlaces+playoffPlaces>count||(bracketSize&(bracketSize-1))) throw new Error('Choose a valid league qualification split.');
    if(!gamesPerTeam||gamesPerTeam>=count||(count*gamesPerTeam)%2) throw new Error('Choose a valid guaranteed game count.');
    const fixtures=balancedLeagueFixtures(names,gamesPerTeam),playoffs=Array.from({length:playoffPlaces/2},(_,index)=>({id:`byot-league-playoff-${index}`,home:`League seed ${directPlaces+1+index}`,away:`League seed ${directPlaces+playoffPlaces-index}`,homeScore:'',awayScore:'',winner:''}));
    const rounds=[];
    for(let matchCount=bracketSize/2,roundIndex=0;matchCount>=1;matchCount/=2,roundIndex++) rounds.push(Array.from({length:matchCount},(_,index)=>({id:`byot-ko-${roundIndex}-${index}`,home:'TBD',away:'TBD',homeScore:'',awayScore:'',winner:''})));
    return {series:'byot',kind:'competition',format:'league',names,groupCount:1,gamesPerTeam,leagueSnapshot:{fixtures,directPlaces,playoffPlaces,playoffs},qualifyingPlayoffs:[],rounds};
  }
  const groupCount = Math.min(Number(form.elements.groupCount.value), Math.max(1, Math.floor(count/2)));
  const groupSetup = Array.from({length:groupCount},()=>[]);
  names.forEach((name,index)=>groupSetup[index%groupCount].push(name));
  if (format === 'groups' && groupSetup.some(group=>group.length<2)) throw new Error('Each group needs at least two teams. Reduce the group count.');
  if (format === 'groups' && count % groupCount !== 0) throw new Error('Choose a group count that divides the teams evenly.');
  if (format === 'groups' && groupSetup.some(group=>group.length>4)) throw new Error('BYOT groups support two to four teams each.');
  if (format === 'knockout' && (count & (count-1))) throw new Error('Straight knockout requires 4, 8, or 16 teams.');
  const fixtures = format === 'groups' ? groupSetup.flatMap((group,index)=>publicGroupFixtures(group,index)) : [];
  const qualifiers = format === 'groups' ? Math.min(Number(form.elements.qualifiers.value), Math.min(...groupSetup.map(group=>group.length))) : count;
  const qualifiedCount = format === 'groups' ? groupCount*qualifiers : count;
  const bracketSize = 2 ** Math.floor(Math.log2(qualifiedCount));
  const playInCount = qualifiedCount-bracketSize;
  const qualifyingPlayoffs = Array.from({length:playInCount},(_,index)=>({id:`byot-play-in-${index}`,home:'Best placed qualifier',away:'Best placed qualifier',homeScore:'',awayScore:'',winner:''}));
  const rounds=[];
  for(let matchCount=Math.floor(bracketSize/2),roundIndex=0;matchCount>=1;matchCount=Math.floor(matchCount/2),roundIndex++) rounds.push(Array.from({length:matchCount},(_,index)=>({id:`byot-ko-${roundIndex}-${index}`,home:roundIndex===0&&format==='knockout'?names[index*2]:'TBD',away:roundIndex===0&&format==='knockout'?names[index*2+1]:'TBD',homeScore:'',awayScore:'',winner:''})));
  return {series:'byot',kind:'competition',format:format==='groups'?'groups':'knockout',names,groupCount,qualifiers,groupSetup:format==='groups'?groupSetup:[],groupStage:format==='groups'?{groups:groupSetup,fixtures}:undefined,qualifyingPlayoffs,rounds};
}

async function hydrateByotPage() {
  const eventsRoot=document.querySelector('#byot-events');
  if(!eventsRoot) return;
  const state=await getAuthState(),mayEdit=state.authenticated&&['owner','admin'].includes(state.user.role);
  let history=inauguralByotDefaults;
  let events=[];
  try {
    const [response,historyResponse]=await Promise.all([fetch('/api/events?destination=community-events'),fetch('/api/byot-history')]),data=await response.json(),historyData=await historyResponse.json();
    events=response.ok?data.events.filter(event=>event.snapshot?.series==='byot'):[];
    if(historyResponse.ok&&historyData.records?.length) history=historyData.records.find(record=>record.id==='inaugural')||historyData.records[0];
    const resultControls=item=>mayEdit?`<div class="event-results-actions"><button class="button button-primary" type="button" data-save-event-results="${escapeHtml(item.id)}">Save live results</button><button class="button button-secondary danger-action" type="button" data-delete-byot-event="${escapeHtml(item.id)}">Delete event</button><span data-event-results-message aria-live="polite">Enter scores above; tables and winners recalculate automatically.</span></div>`:'';
    const requested=new URLSearchParams(window.location.search).get('event'),view=requestedEvent(events);
    const showInaugural=!requested||requested==='inaugural';
    const cards=(requested==='inaugural'?[]:view.events).map(item=>{const date=item.startsAt?new Date(item.startsAt).toLocaleString([],{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Time to be announced';return `<details class="published-event" data-published-event="${escapeHtml(item.id)}" open><summary class="published-event-head"><div><span class="section-kicker">BYOT Tournament</span><h2>${escapeHtml(item.title)}</h2></div><div><span class="season-chip event-status-${escapeHtml(item.lifecycleStatus)}">${escapeHtml(item.lifecycleStatus)}</span><span class="season-chip season-chip-live">${escapeHtml(date)}</span><i aria-hidden="true"></i></div></summary><div class="published-event-body">${eventShareTools(item,view.focused)}${eventBoard(item.snapshot,mayEdit)}${resultControls(item)}</div></details>`;}).join('');
    eventsRoot.innerHTML=`<div class="published-event-list">${cards}${showInaugural?inauguralByot(history,mayEdit):''}</div>`;
    wireEventShareButtons(eventsRoot);
    const wireCard=(card,item)=>{
      card.querySelectorAll('[data-event-score]').forEach(input=>input.addEventListener('change',()=>{
        const match=allCompetitionMatches(item.snapshot).find(candidate=>candidate.id===input.dataset.matchId);if(!match)return;
        match[`${input.dataset.scoreSide}Score`]=normalizedScoreInput(input.value);
        recalculateCompetition(item.snapshot);
        const body=card.querySelector('.published-event-body');body.innerHTML=`${eventShareTools(item,Boolean(new URLSearchParams(window.location.search).get('event')))}${eventBoard(item.snapshot,true)}${resultControls(item)}`;wireCard(card,item);
      }));
      wireEventShareButtons(card);
      card.querySelector('[data-save-event-results]')?.addEventListener('click',async event=>{
        const button=event.currentTarget,message=card.querySelector('[data-event-results-message]');button.disabled=true;message.textContent='Saving results…';
        const save=await fetch('/api/admin/events',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,title:item.title,destination:item.destination,format:item.format,startsAt:item.startsAt,status:'published',snapshot:item.snapshot})});
        if(save.ok)message.textContent='Live results saved.';else{const result=await save.json().catch(()=>({}));message.textContent=result.error||'Unable to save results.';}button.disabled=false;
      });
      card.querySelector('[data-delete-byot-event]')?.addEventListener('click',async event=>{
        if(!window.confirm(`Delete ${item.title}? This permanently removes the published event and all of its saved results.`))return;
        const button=event.currentTarget,message=card.querySelector('[data-event-results-message]');button.disabled=true;message.textContent='Deleting event…';
        const response=await fetch(`/api/admin/events?id=${encodeURIComponent(item.id)}`,{method:'DELETE',credentials:'same-origin'});
        if(response.ok){history.replaceState({},'',eventSchedulePath(item));render();}else{const result=await response.json().catch(()=>({}));message.textContent=result.error||'Unable to delete this event.';button.disabled=false;}
      });
    };
    events.forEach(item=>{const card=eventsRoot.querySelector(`[data-published-event="${item.id}"]`);if(card)wireCard(card,item);});
  } catch { eventsRoot.innerHTML=`<div class="published-event-list">${inauguralByot(history,mayEdit)}</div>`; }
  wireEventShareButtons(eventsRoot);

  const historyForm=document.querySelector('[data-byot-history]');
  historyForm?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),message=form.querySelector('[data-byot-history-message]');button.disabled=true;message.textContent='Saving…';const payload={id:form.dataset.byotHistory,title:form.elements.title.value,eventDate:form.elements.eventDate.value,lifecycleStatus:form.elements.lifecycleStatus.value,champion:form.elements.champion.value,championScore:Number(form.elements.championScore.value),finalist:form.elements.finalist.value,finalistScore:Number(form.elements.finalistScore.value),roster:form.elements.roster.value.split(',').map(name=>name.trim()).filter(Boolean)};try{const response=await fetch('/api/byot-history',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),result=await response.json().catch(()=>({}));if(!response.ok) throw new Error(result.error||'Unable to save event details.');message.textContent='Saved.';window.setTimeout(render,250);}catch(error){message.textContent=error.message;button.disabled=false;}});

  const builder=document.querySelector('#byot-builder');
  if(!builder || !mayEdit) return;
  builder.hidden=false;
  const form=document.querySelector('#byot-form'),preview=document.querySelector('#byot-preview-board'),message=document.querySelector('#byot-message');
  const syncGroupOptions=()=>{const count=Number(form.elements.teamCount.value),format=form.elements.format.value,isGroups=format==='groups',isLeague=format==='league';[...form.elements.groupCount.options].forEach(option=>{const groups=Number(option.value),size=count/groups;option.disabled=!isGroups||groups===1||!Number.isInteger(size)||size<2||size>4;});if(isGroups&&form.elements.groupCount.selectedOptions[0]?.disabled){const first=[...form.elements.groupCount.options].find(option=>!option.disabled);if(first) form.elements.groupCount.value=first.value;}if(isLeague)form.elements.groupCount.value='1';form.elements.groupCount.disabled=!isGroups;form.elements.qualifiers.disabled=!isGroups;const previousGames=form.elements.leagueGames.value;form.elements.leagueGames.innerHTML=Array.from({length:Math.min(6,count-1)},(_,index)=>index+1).filter(games=>(count*games)%2===0).map(games=>`<option value="${games}" ${String(games)===previousGames||(!previousGames&&games===Math.min(4,count-1))?'selected':''}>${games} guaranteed games</option>`).join('');const previousPlan=form.elements.qualificationPlan.value,plans=[];for(let direct=1;direct<=count;direct++)for(let playoff=0;playoff<=count-direct;playoff+=2){const bracket=direct+playoff/2;if(bracket>=2&&(bracket&(bracket-1))===0)plans.push({direct,playoff,bracket});}plans.sort((a,b)=>Number(b.playoff>0)-Number(a.playoff>0)||b.bracket-a.bracket||b.direct-a.direct);form.elements.qualificationPlan.innerHTML=plans.map((plan,index)=>`<option value="${plan.direct}:${plan.playoff}" ${`${plan.direct}:${plan.playoff}`===previousPlan||(!previousPlan&&index===0)?'selected':''}>Top ${plan.direct} direct${plan.playoff?` · next ${plan.playoff} play in`:''} · ${plan.bracket}-team bracket</option>`).join('');form.elements.leagueGames.disabled=!isLeague;form.elements.qualificationPlan.disabled=!isLeague;};
  form.elements.teamCount.addEventListener('change',syncGroupOptions);form.elements.format.addEventListener('change',syncGroupOptions);syncGroupOptions();
  document.querySelectorAll('[data-byot-preset]').forEach(button=>button.addEventListener('click',()=>{
    const league=button.dataset.byotPreset==='league-12',count=league?12:8;
    form.elements.teamCount.value=String(count);
    form.elements.format.value=league?'league':'groups';
    syncGroupOptions();
    if(league){form.elements.leagueGames.value='4';form.elements.qualificationPlan.value='6:4';}
    else{form.elements.groupCount.value='2';form.elements.qualifiers.value='2';}
    form.elements.teams.value=Array.from({length:count},(_,index)=>`Team ${index+1}`).join('\n');
    document.querySelectorAll('[data-byot-preset]').forEach(item=>item.classList.toggle('active',item===button));
    preview.innerHTML=eventBoard(makeByotSnapshot(form));
    message.textContent=`${league?'12-team league phase':'8-team groups + knockout'} configuration loaded. Replace the placeholder team names, then preview or publish.`;
  }));
  const showPreview=()=>{try{preview.innerHTML=eventBoard(makeByotSnapshot(form));message.textContent='';}catch(error){message.textContent=error.message;}};
  document.querySelector('#byot-preview')?.addEventListener('click',showPreview);
  form.addEventListener('submit',async event=>{event.preventDefault();message.textContent='Publishing…';const button=form.querySelector('[type="submit"]');button.disabled=true;try{const snapshot=makeByotSnapshot(form);const startsAt=new Date(form.elements.startsAt.value).toISOString();const response=await fetch('/api/admin/events',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({title:form.elements.title.value.trim(),destination:'community-events',format:'byot',startsAt,status:'published',snapshot})});const result=await response.json().catch(()=>({}));if(!response.ok) throw new Error(result.error||'Unable to publish this tournament.');message.textContent='Published. Refreshing the BYOT schedule…';window.setTimeout(render,300);}catch(error){message.textContent=error.message;button.disabled=false;}});
}

async function hydrateHomeCalendar() {
  const root=document.querySelector('#home-calendar .home-calendar-grid');
  if(!root) return;
  const nextLeagueWeek=leagueSeason?.weeks?.find(week=>week.matches.some(([, , ,homeScore,awayScore])=>homeScore===null||awayScore===null));
  const leagueCard=nextLeagueWeek?`<a class="home-event-card home-matchweek-card" href="/schedules?type=6v6" data-link><span class="season-chip season-chip-live">6v6 schedule</span><h3>Matchweek ${nextLeagueWeek.week}</h3><p>${escapeHtml(nextLeagueWeek.date)} · ${nextLeagueWeek.matches.length} fixtures</p><small>Open official schedule →</small></a>`:'';
  try {
    const response=await fetch('/api/events?calendar=1'),data=await response.json();
    if(!response.ok) throw new Error();
    const eventCards=data.events.map(event=>{const byot=event.snapshot?.series==='byot',label=byot?'BYOT Tournament':event.destination==='league-cup'?'League Cup':'Community Event';return `<a class="home-event-card" href="${escapeHtml(eventSharePath(event))}" data-link><span class="season-chip event-status-${escapeHtml(event.lifecycleStatus)}">${escapeHtml(event.lifecycleStatus)}</span><h3>${escapeHtml(event.title)}</h3><p>${event.startsAt?new Date(event.startsAt).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Time to be announced'}</p><small>${label} →</small></a>`;}).join('');
    root.innerHTML=leagueCard+eventCards||'<p class="admin-empty">No upcoming fixtures, community events, or cups yet.</p>';
  } catch { root.innerHTML=leagueCard||'<p class="admin-empty">Calendar temporarily unavailable.</p>'; }
}

function standingsPage(params) {
  const division = params.get('division') === '10v10' ? '10v10' : '6v6';
  const hero = pageHero('Race for the title','Standings','Form, points, goal difference, and the weekly reminder that the table never lies.');
  const tabs = `<div class="tabs"><a class="tab ${division==='6v6'?'active':''}" href="/standings" data-link>6v6</a><a class="tab ${division==='10v10'?'active':''}" href="/standings?division=10v10" data-link>10v10</a></div>`;
  if (division === '10v10') return hero + `<section class="section">${tabs}<div class="status-row"><span class="season-chip season-chip-upcoming">FC27 · Late October</span></div>${emptyState('10v10 standings coming soon','The table will appear in this tab when the FC27 10v10 season begins.')}</section>`;
  const rows = leagueSeason?.standings?.map(([key,played,wins,draws,losses,gf,ga,gd,points], index) => { const [name,logo]=leagueTeam(key); return `<tr><td><strong>${index+1}</strong></td><td><a class="table-team" href="${virtualArena['6v6'].standings}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(logo)}" alt="" loading="lazy"><strong>${escapeHtml(name)}</strong></a></td><td>${played}</td><td>${wins}</td><td>${draws}</td><td>${losses}</td><td>${signed(gd)}</td><td><strong>${points}</strong></td></tr>`; }).join('');
  return hero + `<section class="section">${tabs}<p class="sync-note">Official table · synced from Virtual Arena</p><div class="table-wrap"><table><thead><tr><th>#</th><th>Club</th><th>Played</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Standings temporarily unavailable.</td></tr>'}</tbody></table></div></section>`;
}

function utilityPage(kind) {
  return pageHero('Call your shot','UFL Pick’ems','Predict the fixtures, collect points, and earn group-chat immunity for approximately one week.') + `<section class="section"><div class="utility-frame">${emptyState('Touchline connection next','The real Simple and Detailed Pick’ems were located in Touchline. Its server and member data will be connected here in the backend deployment phase.')}</div></section>`;
}

function usersPage() {
  return pageHero('The clubhouse','UFL Users','Everyone who has joined the site, with their chosen Discord nickname and any official league title.') +
    `<section class="section"><div class="users-directory-head"><div><span class="section-kicker">Member directory</span><h2>Meet the Uncs</h2></div><p>Titles are assigned by league staff in the protected Admin clubhouse.</p></div><div id="users-directory" class="users-directory"><p class="admin-empty">Loading the clubhouse roster…</p></div></section>`;
}

async function hydrateUsersDirectory() {
  const root=document.querySelector('#users-directory');
  if(!root) return;
  try {
    const response=await fetch('/api/users'),data=await response.json();
    if(!response.ok) throw new Error();
    if(!data.users.length) return void(root.innerHTML=emptyState('The clubhouse is quiet','No users have signed up yet.'));
    root.innerHTML=data.users.map(user=>{const avatar=user.avatarUrl?`<img src="${escapeHtml(user.avatarUrl)}" alt="" loading="lazy">`:'<span class="user-directory-avatar">UFL</span>';const team=user.teamTitle&&user.teamName?`<span class="member-title-badge">${escapeHtml(user.teamTitle)} · ${escapeHtml(user.teamName)}</span>`:'';return `<article class="user-directory-card">${avatar}<div><small>League nickname</small><h3>${escapeHtml(user.displayName)}</h3><div class="profile-chips"><span class="season-chip ${user.role==='owner'||user.role==='admin'?'season-chip-live':'season-chip-upcoming'}">${escapeHtml(user.role)}</span>${team}</div></div></article>`;}).join('');
  } catch { root.innerHTML=emptyState('Directory temporarily unavailable','The clubhouse roster could not be loaded. Please try again shortly.'); }
}

function arcadePage(){return '<section class="section arcade-hub"><span class="section-kicker">The clubhouse</span><h2>Arcade</h2><p class="section-intro">Pick a game. Rep your club. Beat your best.</p><div class="arcade-grid"><a class="card arcade-game-card" href="/arcade/cleat" data-link><img src="/assets/cleat-arcade.png" alt="Cleat pixel-art game cover" width="1536" height="1024"><span class="season-chip season-chip-live">13 levels · Soccer breakout</span><h3>Cleat Arcade</h3><p>Break through defenders, dodge the buses, and beat the keeper. One cleat. Three lives.</p><strong>Play Cleat Arcade →</strong></a><a class="card arcade-game-card" href="/arcade/loosey-goosey" data-link><img src="/assets/goose-mode-arcade.png" alt="Goose Mode: Loosey Goosey pixel-art game cover" width="1536" height="1024"><span class="season-chip season-chip-live">Endless runner · Goose Mode</span><h3>Loosey Goosey</h3><p>Jump, glide, and honk your way to kickoff. Fuel up on Goose Mode and leave the opposition behind.</p><strong>Play Loosey Goosey →</strong></a></div></section>';}
function arcadeGamePage(){return '<section class="integrated-app arcade-host" aria-label="Cleat Arcade"><iframe class="integrated-app-frame" src="/arcade-app/" title="Cleat Arcade soccer game" scrolling="no"></iframe></section>';}
function wheelPage() {
  return `<section class="integrated-app" aria-label="Unc Wheel United"><iframe class="integrated-app-frame" src="/wheel-app/?v=20260904-live-drawings5" title="Unc Wheel United application" scrolling="no"></iframe></section>`;
}

function funcPage() {
  return `<section class="integrated-app func-host" aria-label="FUNC Card Studio"><iframe class="integrated-app-frame" src="/func-app/?v=20260910-func-only2" title="FUNC Card Studio" scrolling="yes"></iframe></section>`;
}

function pickemsPage() {
  return `<section class="integrated-app pickems-host" aria-label="UFL Pick’ems"><iframe class="integrated-app-frame" src="/pickems-app/?v=20260909-season-tabs1" title="UFL Pick’ems application" scrolling="no"></iframe></section>`;
}

function contactPage() {
  return pageHero('Get in the game','Contact & Discord','UFL lives online. The Discord is our clubhouse, match lobby, transfer desk, and questionable pundit studio.') + `<section class="section contact-grid"><div class="contact-panel"><span class="section-kicker">The clubhouse</span><h2>JOIN THE DISCORD</h2><p>Find a team, register for competition, report results, and meet the Uncs.</p><div class="discord-invite-contact"><span>For a Discord invite, message</span><div><strong>Dimio11</strong><i>or</i><strong>luuuiiisss7</strong></div><small>Invites are subject to approval while the community grows.</small></div><span class="button button-primary" aria-disabled="true">Permanent invite link coming soon</span><div class="vibes-note"><span>Community standard</span><strong>Vibes come first.</strong><p>Competitive football is the point, but good people and a welcoming clubhouse are the priority as UFL grows.</p></div></div><div class="card"><span class="num">?</span><h3>Need league help?</h3><p>Message <strong>Dimio11</strong> or <strong>luuuiiisss7</strong> on Discord for invite approval, league questions, or support.</p><p><strong>League location:</strong><br><span id="contact-location">Wherever the Wi-Fi reaches.</span></p><button class="tab" id="contact-reroll">Relocate Unc</button></div></section>`;
}

function privacyPage() {
  return pageHero('Member data', 'Privacy & account information', 'A plain-language summary of what UFL stores, why it is needed, and how to request removal.') +
    `<section class="section privacy-grid"><article class="card"><span class="section-kicker">Discord sign-in</span><h2>What we store</h2><p>When you sign in, UFL stores your Discord user ID, username, display name, avatar URL, account role, and login timestamps. We do not request your email, Discord messages, server list, password, or Discord access token.</p></article><article class="card"><span class="section-kicker">Pick’ems</span><h2>Competition data</h2><p>Your submitted picks, tiebreakers, scores, and leaderboard placement are stored so the competition works across devices. Your display name and avatar may appear publicly in the member directory or leaderboard.</p></article><article class="card"><span class="section-kicker">Local tools</span><h2>On your device</h2><p>Wheel settings and saved FUNC creations may use your browser’s local storage or IndexedDB. Uploaded FUNC portraits remain on your device unless you download the finished card; UFL does not upload those portraits to its server.</p></article><article class="card"><span class="section-kicker">Your choice</span><h2>Removal requests</h2><p>To request account removal or correction, message <strong>Dimio11</strong> on the UFL Discord. UFL will delete or anonymize your member information where reasonably possible while retaining limited integrity or security records when necessary.</p><a href="/contact" data-link>Contact the league →</a></article></section>`;
}

function accountPage() {
  return pageHero('Member access','Discord account','Sign in with Discord to create your UFL member profile and prepare for account-based Pick’ems.') +
    `<section class="section auth-section"><div class="auth-card" id="account-root"><p>Checking your UFL session…</p></div></section>`;
}

function adminPage() {
  return pageHero('League operations','Admin clubhouse','Registered members and league permissions, protected by Discord identity.') +
    `<section class="section auth-section"><div class="auth-card admin-card" id="admin-root"><p>Verifying administrator access…</p></div></section>`;
}

async function getAuthState() {
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Unavailable');
    return await response.json();
  } catch {
    return { authenticated: false, configured: false, user: null };
  }
}

function userCard(user) {
  const avatar = user.avatarUrl ? `<img class="discord-avatar" src="${escapeHtml(user.avatarUrl)}" alt="">` : '<span class="discord-avatar avatar-fallback">UFL</span>';
  const teamTitle = user.teamTitle && user.teamName ? `<span class="season-chip member-team-title">${escapeHtml(user.teamTitle)} · ${escapeHtml(user.teamName)}</span>` : '';
  return `<div class="account-profile">${avatar}<div><div class="profile-chips"><span class="season-chip season-chip-live">${escapeHtml(user.role)}</span>${teamTitle}</div><h2>${escapeHtml(user.displayName)}</h2><p>@${escapeHtml(user.username)}</p></div></div>`;
}

const assignableTeams = [...new Set([
  ...Object.values(leagueSeason?.teams || {}).map(team => team[0]),
  'FC Sandy Bums', 'FC Mountains'
])].sort((a,b) => a.localeCompare(b));

function teamTitleControls(user) {
  const title = user.teamTitle || '';
  const teams = assignableTeams.map(team => `<option value="${escapeHtml(team)}" ${user.teamName===team?'selected':''}>${escapeHtml(team)}</option>`).join('');
  return `<div class="member-title-controls"><select data-title-kind="${escapeHtml(user.id)}" aria-label="Title for ${escapeHtml(user.displayName)}"><option value="" ${!title?'selected':''}>No team title</option><option value="captain" ${title==='captain'?'selected':''}>Captain</option><option value="manager" ${title==='manager'?'selected':''}>Manager</option></select><select data-title-team="${escapeHtml(user.id)}" aria-label="Team for ${escapeHtml(user.displayName)}"><option value="">Choose team…</option>${teams}</select><button class="tab" data-title-save="${escapeHtml(user.id)}">Save title</button></div>`;
}

function adminMemberRow(user, canManageRoles) {
  const avatar = user.avatarUrl ? `<img class="discord-avatar" src="${escapeHtml(user.avatarUrl)}" alt="">` : '<span class="discord-avatar avatar-fallback">UFL</span>';
  const titleBadge = user.teamTitle && user.teamName ? `<span class="member-title-badge">${escapeHtml(user.teamTitle)} · ${escapeHtml(user.teamName)}</span>` : '';
  const roleControl = canManageRoles && user.role !== 'owner'
    ? `<button class="tab" data-role-user="${escapeHtml(user.id)}" data-next-role="${user.role==='admin'?'member':'admin'}">${user.role==='admin'?'Remove admin':'Make admin'}</button>`
    : `<span class="owner-only-note">${user.role==='owner'?'Configured owner':'Owner controls admin access'}</span>`;
  return `<article class="member-row">${avatar}<div class="member-identity"><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)} · ${escapeHtml(user.status)}</small>${titleBadge}</div><span class="member-role">${escapeHtml(user.role)}</span><div class="member-admin-action">${roleControl}</div>${teamTitleControls(user)}</article>`;
}

function localDateTimeValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}

function controlRoomBody(event) {
  if(!event) return '<div class="admin-empty control-room-empty"><h3>No published tournament selected</h3><p>Publish a competition first, then it will appear here for live-night operation.</p></div>';
  const matches=allCompetitionMatches(event.snapshot),complete=matches.filter(match=>match.homeScore!==''&&match.awayScore!==''&&match.homeScore!=null&&match.awayScore!=null),ready=matches.filter(match=>!complete.includes(match)&&match.home&&match.away&&match.home!=='TBD'&&match.away!=='TBD'),winner=eventWinner(event.snapshot);
  return `<div data-control-room-body><div class="control-room-heading"><div><span class="section-kicker">Tournament Night Control Room</span><h2>${escapeHtml(event.title)}</h2><p>Enter results once, recalculate the competition, and publish the same board spectators see.</p></div>${eventShareTools(event)}</div><div class="control-room-metrics"><article><small>Event status</small><strong>${escapeHtml(event.lifecycleStatus||'upcoming')}</strong></article><article><small>Matches completed</small><strong>${complete.length} / ${matches.length}</strong></article><article><small>Ready to play</small><strong>${ready.length}</strong></article><article><small>Winner</small><strong>${escapeHtml(winner||'To be decided')}</strong></article></div><div class="control-room-queue"><div><span class="section-kicker">Now / next</span><h3>Playable match queue</h3></div>${ready.length?`<div>${ready.slice(0,4).map(match=>`<article><small>${escapeHtml(match.label||'Tournament match')}</small><strong title="${escapeHtml(match.home)}">${escapeHtml(match.home)}</strong><span>vs</span><strong title="${escapeHtml(match.away)}">${escapeHtml(match.away)}</strong></article>`).join('')}</div>`:'<p>Enter or complete earlier results to unlock the next matches.</p>'}</div>${eventBoard(event.snapshot,true)}<div class="control-room-actions"><button class="button button-primary" type="button" data-control-save="${escapeHtml(event.id)}">Save live results</button><label>Public status<select data-control-lifecycle>${['upcoming','live','completed','archived'].map(status=>`<option value="${status}" ${status===(event.lifecycleStatus||'upcoming')?'selected':''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('')}</select></label><button class="button button-secondary" type="button" data-control-status="${escapeHtml(event.id)}">Update status</button><span data-control-message aria-live="polite">Changes remain private until you save.</span></div></div>`;
}

function adminControlRoom(events,selectedId) {
  const published=events.filter(event=>event.status==='published');
  const selected=published.find(event=>event.id===selectedId)||published.find(event=>event.lifecycleStatus==='live')||published[0];
  return `<div class="control-room-selector"><label>Operating tournament<select data-control-event>${published.length?published.map(event=>`<option value="${escapeHtml(event.id)}" ${event===selected?'selected':''}>${escapeHtml(event.title)} · ${escapeHtml(event.lifecycleStatus||'upcoming')}</option>`).join(''):'<option>No published tournaments</option>'}</select></label></div>${controlRoomBody(selected)}`;
}

function adminCompetitionCard(event) {
  const lifecycle = event.lifecycleStatus || 'upcoming';
  return `<article class="admin-event-card" data-admin-event="${escapeHtml(event.id)}"><div class="admin-event-heading"><div><span class="season-chip ${lifecycle==='live'?'season-chip-live':'season-chip-upcoming'}">${escapeHtml(event.status==='draft'?'draft':lifecycle)}</span><h3>${escapeHtml(event.title)}</h3></div><small>${escapeHtml(event.format)} · ${escapeHtml(event.destination)}</small></div><div class="admin-event-fields"><label>Title<input data-event-title value="${escapeHtml(event.title)}"></label><label>Date and kickoff<input data-event-start type="datetime-local" value="${localDateTimeValue(event.startsAt)}"></label><label>Publish to<select data-event-destination><option value="community-events" ${event.destination==='community-events'?'selected':''}>Community Events</option><option value="league-cup" ${event.destination==='league-cup'?'selected':''}>League Cup</option></select></label><label>Event status<select data-event-lifecycle ${event.status==='draft'?'disabled':''}>${['upcoming','live','completed','archived'].map(status=>`<option value="${status}" ${lifecycle===status?'selected':''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('')}</select></label></div><div class="admin-event-actions"><button class="tab" data-event-save>Save changes</button><button class="tab" data-event-status ${event.status==='draft'?'disabled':''}>Update status</button><button class="tab" data-event-publish>${event.status==='published'?'Unpublish':'Publish'}</button><button class="tab" data-event-duplicate>Duplicate</button>${event.status==='published'?`<a class="tab" href="/admin?tab=control-room&amp;event=${encodeURIComponent(event.id)}" data-link>Open control room</a><button class="tab" type="button" data-share-event="${escapeHtml(eventSharePath(event))}">Copy public link</button>`:''}<button class="tab danger-action" data-event-delete>Delete</button></div></article>`;
}

function adminChat(messages) {
  return `<div class="admin-chat-log">${messages.length?messages.map(message=>`<article><div><strong>${escapeHtml(message.displayName)}</strong><span>${escapeHtml(message.role)}</span><time>${new Date(message.createdAt+'Z').toLocaleString()}</time></div><p>${escapeHtml(message.message)}</p></article>`).join(''):'<p class="admin-empty">No staff messages yet.</p>'}</div><form class="admin-chat-form" id="admin-chat-form"><textarea maxlength="1000" required placeholder="Message the admin team…" aria-label="Admin chat message"></textarea><button class="button button-primary" type="submit">Send message</button></form>`;
}

function adminAudit(entries) {
  return `<div class="admin-audit-list">${entries.length?entries.map(entry=>`<article><strong>${escapeHtml(entry.actorName || 'System')}</strong><span>${escapeHtml(entry.action.replaceAll('_',' '))}${entry.targetName?` · ${escapeHtml(entry.targetName)}`:''}</span><time>${new Date(entry.createdAt+'Z').toLocaleString()}</time></article>`).join(''):'<p class="admin-empty">No recorded actions yet.</p>'}</div>`;
}

async function hydrateAccount() {
  const state = await getAuthState();
  const nav = document.querySelector('#account-nav');
  if (nav) nav.textContent = state.authenticated ? state.user.displayName : 'Sign in';
  const mayAdmin = state.authenticated && ['owner','admin'].includes(state.user.role);
  let adminNav = document.querySelector('#admin-nav');
  if (mayAdmin && !adminNav && nav) {
    nav.insertAdjacentHTML('beforebegin','<a href="/admin" data-link id="admin-nav">Admin</a>');
    adminNav = document.querySelector('#admin-nav');
  } else if (!mayAdmin) adminNav?.remove();
  adminNav?.classList.toggle('active', window.location.pathname === '/admin');
  const accountRoot = document.querySelector('#account-root');
  if (accountRoot) {
    if (!state.configured) accountRoot.innerHTML = `<h2>Discord login setup</h2><p>The secure login code is ready. Connect the Cloudflare database and Discord application secrets to activate registration.</p>`;
    else if (!state.authenticated) accountRoot.innerHTML = `<h2>Join with Discord</h2><p>We request only your Discord ID, username, display name, and avatar. We do not request your email or messages. If you enter Pick’ems, your display name and avatar may appear on the public leaderboard.</p><p class="privacy-note">By continuing, you acknowledge the <a href="/privacy" data-link>UFL privacy notice</a>.</p><a class="button discord-button" href="/api/auth/discord">Continue with Discord →</a>`;
    else accountRoot.innerHTML = `${userCard(state.user)}<div class="button-row">${['owner','admin'].includes(state.user.role)?'<a class="button button-primary" href="/admin" data-link>Open admin clubhouse →</a>':''}<button class="button button-secondary" id="logout-button" type="button">Sign out</button></div>`;
  }
  document.querySelector('#logout-button')?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.assign('/account');
  });
  const adminRoot = document.querySelector('#admin-root');
  if (!adminRoot) return;
  if (!state.configured) return void (adminRoot.innerHTML = '<h2>Backend setup required</h2><p>Connect Discord OAuth and the UFL database before using the admin clubhouse.</p>');
  if (!state.authenticated) return void (adminRoot.innerHTML = '<h2>Sign in required</h2><a class="button discord-button" href="/api/auth/discord">Continue with Discord →</a>');
  if (!['owner','admin'].includes(state.user.role)) return void (adminRoot.innerHTML = '<h2>Administrator access required</h2><p>Your account is registered, but it does not have permission to open this page.</p>');
  const [membersResponse,eventsResponse,chatResponse,auditResponse] = await Promise.all([
    fetch('/api/admin/users',{credentials:'same-origin'}),fetch('/api/admin/events',{credentials:'same-origin'}),
    fetch('/api/admin/chat',{credentials:'same-origin'}),fetch('/api/admin/audit',{credentials:'same-origin'})
  ]);
  if (!membersResponse.ok) return void (adminRoot.innerHTML = '<h2>Unable to load the admin panel</h2><p>Please sign in again or try later.</p>');
  const data = await membersResponse.json();
  const events = eventsResponse.ok ? (await eventsResponse.json()).events : [];
  const messages = chatResponse.ok ? (await chatResponse.json()).messages : [];
  const audit = auditResponse.ok ? (await auditResponse.json()).entries : [];
  const adminParams=new URLSearchParams(window.location.search),activeAdminTab=adminParams.get('tab')==='control-room'?'control-room':'competitions',selectedControlEvent=adminParams.get('event');
  const active=tab=>activeAdminTab===tab?' active':'';
  adminRoot.innerHTML = `<div class="admin-heading"><div><p class="eyebrow">Admin control panel</p><h2>League operations</h2><p class="admin-note">Manage competitions and staff titles here. Captain and Manager remain display titles only; only the Owner can appoint administrators.</p></div><span class="season-chip season-chip-live">${escapeHtml(state.user.role)}</span></div><div class="admin-tabs" role="tablist"><button class="tab${active('competitions')}" data-admin-tab="competitions">Competitions</button><button class="tab${active('control-room')}" data-admin-tab="control-room">Night Control Room</button><button class="tab" data-admin-tab="members">Members (${data.users.length})</button><button class="tab" data-admin-tab="chat">Staff chat</button><button class="tab" data-admin-tab="audit">Audit history</button></div><section class="admin-panel${active('competitions')}" data-admin-panel="competitions"><div class="admin-section-heading"><div><h2>Competition manager</h2><p>Draft, publish, update status, duplicate, archive, or remove events and cups.</p></div><a class="button button-primary" href="/wheel" data-link>Create in Unc Wheel →</a></div><div class="admin-event-list">${events.length?events.map(adminCompetitionCard).join(''):'<p class="admin-empty">No saved competitions yet.</p>'}</div></section><section class="admin-panel${active('control-room')}" data-admin-panel="control-room" id="control-room-panel">${adminControlRoom(events,selectedControlEvent)}</section><section class="admin-panel" data-admin-panel="members"><div class="member-list">${data.users.map(user => adminMemberRow(user,data.canManageRoles)).join('')}</div></section><section class="admin-panel" data-admin-panel="chat"><div class="admin-section-heading"><div><h2>Staff chat</h2><p>Private to owners and administrators.</p></div><button class="tab" id="refresh-admin-chat">Refresh</button></div>${adminChat(messages)}</section><section class="admin-panel" data-admin-panel="audit"><div class="admin-section-heading"><div><h2>Audit history</h2><p>The latest protected administrative actions.</p></div></div>${adminAudit(audit)}</section>`;
  wireEventShareButtons(adminRoot);
  document.querySelectorAll('[data-admin-tab]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-admin-tab]').forEach(tab=>tab.classList.toggle('active',tab===button));
    document.querySelectorAll('[data-admin-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.adminPanel===button.dataset.adminTab));
  }));
  const wireControlRoom=()=>{
    const panel=document.querySelector('#control-room-panel');if(!panel)return;
    wireEventShareButtons(panel);
    const selector=panel.querySelector('[data-control-event]');
    selector?.addEventListener('change',()=>{
      const url=new URL(window.location.href);url.searchParams.set('tab','control-room');url.searchParams.set('event',selector.value);history.replaceState({},'',url);
      panel.innerHTML=adminControlRoom(events,selector.value);wireControlRoom();
    });
    const selectedId=selector?.value,item=events.find(event=>event.id===selectedId);
    panel.querySelectorAll('[data-event-score]').forEach(input=>input.addEventListener('change',()=>{
      const match=allCompetitionMatches(item?.snapshot).find(candidate=>candidate.id===input.dataset.matchId);if(!match)return;
      match[`${input.dataset.scoreSide}Score`]=normalizedScoreInput(input.value);
      recalculateCompetition(item.snapshot);panel.innerHTML=adminControlRoom(events,item.id);wireControlRoom();
      panel.querySelector('[data-control-message]').textContent='Unsaved result changes. Review the board, then save live results.';
    }));
    panel.querySelector('[data-control-save]')?.addEventListener('click',async event=>{
      const button=event.currentTarget,message=panel.querySelector('[data-control-message]');button.disabled=true;message.textContent='Saving live results…';
      const response=await fetch('/api/admin/events',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,title:item.title,destination:item.destination,format:item.format,startsAt:item.startsAt,status:'published',snapshot:item.snapshot})});
      if(response.ok)message.textContent='Live results saved. The public tournament board is up to date.';else{const result=await response.json().catch(()=>({}));message.textContent=result.error||'Unable to save live results.';}button.disabled=false;
    });
    panel.querySelector('[data-control-status]')?.addEventListener('click',async event=>{
      const button=event.currentTarget,message=panel.querySelector('[data-control-message]'),status=panel.querySelector('[data-control-lifecycle]').value;button.disabled=true;message.textContent='Updating public status…';
      const response=await fetch('/api/admin/event-status',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,status})});
      if(response.ok){item.lifecycleStatus=status;panel.innerHTML=adminControlRoom(events,item.id);wireControlRoom();panel.querySelector('[data-control-message]').textContent='Public tournament status updated.';}else{const result=await response.json().catch(()=>({}));message.textContent=result.error||'Unable to update status.';button.disabled=false;}
    });
  };
  wireControlRoom();
  document.querySelectorAll('[data-role-user]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    const update = await fetch('/api/admin/role', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ discordId: button.dataset.roleUser, role: button.dataset.nextRole }) });
    if (update.ok) hydrateAccount(); else button.disabled = false;
  }));
  document.querySelectorAll('[data-title-save]').forEach(button => button.addEventListener('click', async () => {
    const discordId = button.dataset.titleSave;
    const title = document.querySelector(`[data-title-kind="${discordId}"]`).value;
    const teamName = document.querySelector(`[data-title-team="${discordId}"]`).value;
    if (title && !teamName) return void window.alert('Choose a team before saving this title.');
    button.disabled = true;
    const update = await fetch('/api/admin/title', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ discordId, title, teamName }) });
    if (update.ok) hydrateAccount(); else {
      const result = await update.json().catch(() => ({}));
      window.alert(result.error || 'Unable to update the team title.');
      button.disabled = false;
    }
  }));
  const eventPayload = (card,event,overrides={}) => ({
    id:event.id,title:card.querySelector('[data-event-title]').value.trim(),
    startsAt:card.querySelector('[data-event-start]').value ? new Date(card.querySelector('[data-event-start]').value).toISOString() : null,
    destination:card.querySelector('[data-event-destination]').value,format:event.format,status:event.status,snapshot:event.snapshot,...overrides
  });
  document.querySelectorAll('[data-admin-event]').forEach(card => {
    const event = events.find(item=>item.id===card.dataset.adminEvent);
    card.querySelector('[data-event-save]')?.addEventListener('click',async buttonEvent=>{
      const button=buttonEvent.currentTarget; button.disabled=true;
      const response=await fetch('/api/admin/events',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(eventPayload(card,event))});
      if(response.ok) hydrateAccount(); else button.disabled=false;
    });
    card.querySelector('[data-event-status]')?.addEventListener('click',async buttonEvent=>{
      const button=buttonEvent.currentTarget; button.disabled=true;
      const status=card.querySelector('[data-event-lifecycle]').value;
      const response=await fetch('/api/admin/event-status',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:event.id,status})});
      if(response.ok) hydrateAccount(); else button.disabled=false;
    });
    card.querySelector('[data-event-publish]')?.addEventListener('click',async buttonEvent=>{
      const action=event.status==='published'?'unpublish':'publish';
      if(!window.confirm(`${action[0].toUpperCase()+action.slice(1)} ${event.title}?`)) return;
      const button=buttonEvent.currentTarget; button.disabled=true;
      const response=await fetch('/api/admin/events',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(eventPayload(card,event,{status:event.status==='published'?'draft':'published'}))});
      if(response.ok) hydrateAccount(); else button.disabled=false;
    });
    card.querySelector('[data-event-duplicate]')?.addEventListener('click',async buttonEvent=>{
      const title=window.prompt('Name for the duplicated draft:',`${event.title} copy`);
      if(!title?.trim()) return;
      const button=buttonEvent.currentTarget; button.disabled=true;
      const duplicate=eventPayload(card,event,{id:undefined,title:title.trim(),status:'draft'}); delete duplicate.id;
      const response=await fetch('/api/admin/events',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(duplicate)});
      if(response.ok) hydrateAccount(); else button.disabled=false;
    });
    card.querySelector('[data-event-delete]')?.addEventListener('click',async ()=>{
      if(!window.confirm(`Permanently delete ${event.title}? This cannot be undone.`)) return;
      const response=await fetch(`/api/admin/events?id=${encodeURIComponent(event.id)}`,{method:'DELETE',credentials:'same-origin'});
      if(response.ok) hydrateAccount();
    });
  });
  document.querySelector('#admin-chat-form')?.addEventListener('submit',async submitEvent=>{
    submitEvent.preventDefault();
    const form=submitEvent.currentTarget,textarea=form.querySelector('textarea'),button=form.querySelector('button');
    button.disabled=true;
    const response=await fetch('/api/admin/chat',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({message:textarea.value})});
    if(response.ok) hydrateAccount(); else button.disabled=false;
  });
  document.querySelector('#refresh-admin-chat')?.addEventListener('click',hydrateAccount);
}

function render() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const main = document.querySelector('main');
  const canonicalPath = path === '/' ? '/' : path;
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://www.uncfutbolleague.com${canonicalPath}`);
  if (path === routes.arcade) main.innerHTML = arcadePage();
  else if (path === '/arcade/loosey-goosey') main.innerHTML = '<section class="integrated-app arcade-host" aria-label="Loosey Goosey"><iframe class="integrated-app-frame" src="/goose-app/" title="Loosey Goosey soccer runner" scrolling="no"></iframe></section>';
  else if (path === '/arcade/cleat') main.innerHTML = arcadeGamePage();
  else if (path === routes.rules) main.innerHTML = rulesPage();
  else if (path === routes.teams) main.innerHTML = teamsPage(params);
  else if (path === '/schedules/community-events') main.innerHTML = communityEventsPage();
  else if (path === '/schedules/league-cup') main.innerHTML = leagueCupPage();
  else if (path === '/schedules/byot-tournaments') main.innerHTML = byotTournamentsPage();
  else if (path === routes.schedules) main.innerHTML = schedulesPage(params);
  else if (path === routes.standings) main.innerHTML = standingsPage(params);
  else if (path === routes.users) main.innerHTML = usersPage();
  else if (path === routes.pickems) main.innerHTML = pickemsPage();
  else if (path === routes.func) main.innerHTML = funcPage();
  else if (path === routes.wheel) main.innerHTML = wheelPage();
  else if (path === routes.contact) main.innerHTML = contactPage();
  else if (path === routes.privacy) main.innerHTML = privacyPage();
  else if (path === routes.account) main.innerHTML = accountPage();
  else if (path === routes.admin) main.innerHTML = adminPage();
  else main.innerHTML = homePage();
  document.querySelectorAll('.main-nav > a').forEach(a => a.classList.toggle('active', new URL(a.href).pathname === path || (new URL(a.href).pathname === '/arcade' && path.startsWith('/arcade/'))));
  document.querySelectorAll('.nav-group-link').forEach(a => a.classList.toggle('active', path === new URL(a.href).pathname || path.startsWith(`${new URL(a.href).pathname}/`)));
  if (path === '/arcade' || path.startsWith('/arcade/')) main.insertAdjacentHTML('afterbegin', '<p class="arcade-signup-note"><a href="/account" data-link>Sign up or sign in with Discord</a> before playing to add your personal best to the leaderboard.</p>');
  bindDynamicActions();
  hydrateAccount();
  hydratePublishedEvents();
  hydrateByotPage();
  hydrateUsersDirectory();
  hydrateHomeCalendar();
  window.scrollTo(0,0);
}

function randomLocation() { return locations[Math.floor(Math.random() * locations.length)]; }
function setLocation() {
  const location = randomLocation();
  const footer = document.querySelector('#unc-location');
  const contact = document.querySelector('#contact-location');
  if (footer) footer.textContent = location;
  if (contact) contact.textContent = `Currently ${location}.`;
}
function bindDynamicActions() {
  document.querySelectorAll('.integrated-app-frame').forEach(appFrame => {
    const syncAppTheme = () => {
      try { appFrame.contentDocument.documentElement.dataset.theme = document.documentElement.dataset.theme; }
      catch { /* Same-origin production build; retain its default if unavailable. */ }
    };
    const fitApp = () => {
      try {
        const doc = appFrame.contentDocument;
        syncAppTheme();
        const height = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
        appFrame.style.height = `${height}px`;
        appFrame.closest('.integrated-app')?.style.setProperty('height', `${height}px`);
        doc.documentElement.style.overflow = 'hidden';
        doc.body.style.overflow = 'hidden';
      } catch { /* Same-origin production build; retain fallback height if unavailable. */ }
    };
    appFrame.addEventListener('load', () => {
      fitApp();
      const observer = new ResizeObserver(fitApp);
      const frameRoot = appFrame.contentDocument?.documentElement;
      if (frameRoot) observer.observe(frameRoot);
      window.setTimeout(fitApp, 250);
      window.setTimeout(fitApp, 1000);
    });
  });
  document.querySelector('#contact-reroll')?.addEventListener('click', setLocation);
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-link]');
  if (!link || event.metaKey || event.ctrlKey || link.target) return;
  event.preventDefault();
  history.pushState({}, '', link.href);
  document.querySelector('.main-nav').classList.remove('open');
  render();
});
window.addEventListener('popstate', render);
document.querySelector('.menu-button').addEventListener('click', event => {
  const nav = document.querySelector('.main-nav');
  const open = nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', open);
});
document.querySelectorAll('.nav-group').forEach(group => {
  const button = group.querySelector(':scope > button');
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-group.open').forEach(other => { if (other !== group) other.classList.remove('open'); });
    const open = group.classList.toggle('open');
    button.setAttribute('aria-expanded', open);
  });
  group.addEventListener('mouseleave', () => {
    group.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    button.blur();
  });
});
document.querySelector('#reroll-location').addEventListener('click', setLocation);
function setTheme(theme) {
  const validTheme = ['classic','dark','vintage'].includes(theme) ? theme : 'classic';
  document.documentElement.dataset.theme = validTheme;
  localStorage.setItem('ufl-theme', validTheme);
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    const selected = button.dataset.themeChoice === validTheme;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', selected);
  });
  document.querySelectorAll('.integrated-app-frame').forEach(frame => {
    if (frame.contentDocument) frame.contentDocument.documentElement.dataset.theme = validTheme;
  });
}
document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.themeChoice)));
setTheme(document.documentElement.dataset.theme);
setLocation();
render();
