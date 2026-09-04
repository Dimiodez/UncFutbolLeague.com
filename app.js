const routes = {
  home: '/', rules: '/rules', teams: '/teams', schedules: '/schedules',
  standings: '/standings', pickems: '/pickems', wheel: '/wheel', contact: '/contact', account: '/account', admin: '/admin'
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
  'league-cup': ['League Cup Schedule','The knockout road to silverware.']
};

const locations = [
  'grilling by the touchline', 'somewhere on the beach', 'lost in the mountains',
  'ankle-deep in the swamp', 'arguing with VAR', 'warming up since 4 PM',
  'at the back post—unmarked', 'checking the transfer market', 'on a tactical smoke break',
  'telling the kids how FIFA 12 did it', 'icing both knees', 'parked in the box'
];

function pageHero(kicker, title, copy) {
  return `<section class="page-hero"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${copy}</p></div></section>`;
}

function emptyState(title, copy, action = '') {
  return `<div class="empty-state"><img src="/assets/ufl-mark.png" alt=""><h2>${title}</h2><p>${copy}</p>${action}</div>`;
}

function tenVTenComingSoon(area) {
  return pageHero('FC27 forecast', '10v10 is coming', `${area} will arrive when the next big-pitch era begins.`) +
    `<section class="section"><div class="status-row status-row-center"><span class="season-chip season-chip-upcoming">FC27 · Late October</span></div>${emptyState('Coming Soon to an FC27 Beach Near You', 'The 10v10 Uncs are still finding their sandals, tactics board, and enough players who promise they can make kickoff. The first 10v10 season is planned for late October in FC27.','<a class="button button-primary" href="/" data-link>Return to the clubhouse →</a>')}</section>`;
}

function houseTeamsPage() {
  return pageHero('House teams', 'From the beach to the mountains, find your house.', 'Two houses. One community. Plenty of opportunities to blame the connection.') +
    `<section class="section"><div class="house-team-grid"><article class="card house-team-card"><div class="team-logo-placeholder" aria-label="FC Sandy Bums logo coming soon">SB</div><span class="season-chip season-chip-live">House Team</span><h2>FC Sandy Bums</h2><p>Sun, sand, questionable tan lines, and football played with the confidence of an Unc holding a beverage.</p><span class="logo-note">Official crest coming soon</span></article><article class="card house-team-card"><div class="team-logo-placeholder" aria-label="FC Mountains logo coming soon">FM</div><span class="season-chip season-chip-live">House Team</span><h2>FC Mountains</h2><p>Higher elevation, lower oxygen, and absolutely no excuse for losing your runner at the back post.</p><span class="logo-note">Official crest coming soon</span></article></div></section>`;
}

function homePage() {
  return `<section class="hero"><div class="hero-inner"><p class="eyebrow">Est. 2026 · EA FC Community League</p><h1>Football for <em>the seasoned.</em></h1><p class="hero-copy">A Discord-born league where football IQ beats pace abuse, the banter stays elite, and every match deserves a post-game story.</p><div class="button-row"><a class="button button-primary" href="/contact" data-link>Join the league →</a><a class="button button-secondary" href="/schedules" data-link>View schedules</a></div></div><div class="ticker"><span>6v6 League</span><span>10v10 League</span><span>House Teams</span><span>Community Cups</span><span>Pick’ems</span><span>No pace merchants*</span></div></section>
  <section class="section"><span class="section-kicker">Choose your football</span><h2>One community.<br>Plenty of ways to play.</h2><p class="section-intro">Build a club, find a house team, chase the table, or show up for cup night. UFL makes organized EA FC competition feel like the best night in the group chat.</p><div class="cards"><article class="card"><span class="num">06</span><div class="status-row"><span class="season-chip season-chip-live">FC26 Season 1 · In Progress</span><span class="season-chip season-chip-upcoming">FC27 Season 2 · Late October</span></div><h3>6v6 League</h3><p>Quick matches, tight spaces, and nowhere to hide.</p><a href="/teams?division=6v6" data-link>Meet the teams →</a></article><article class="card"><span class="num">10</span><div class="status-row"><span class="season-chip season-chip-upcoming">FC27 · Late October</span></div><h3>10v10 League</h3><p>The full tactical experience for organized clubs.</p><a href="/teams?division=10v10" data-link>Coming in FC27 →</a></article><article class="card"><span class="num">HC</span><h3>House Teams</h3><p>From the beach to the mountains, find your house: FC Sandy Bums or FC Mountains.</p><a href="/teams?division=house" data-link>Find your house →</a></article></div></section>
  <section class="dark-section"><div class="section feature-grid"><div><span class="section-kicker">Built for the group chat</span><h2>Serious matches.<br>Unserious people.</h2><p class="section-intro">Fixtures, tables, rules, predictions, and the legendary Unc Wheel—all under one crest. Competitive enough to matter. Relaxed enough to come back next week.</p><div class="stat-row"><div class="stat"><strong>6v6</strong><span>Quick & technical</span></div><div class="stat"><strong>10v10</strong><span>Full-club football</span></div><div class="stat"><strong>∞</strong><span>Post-match excuses</span></div></div></div><div class="crest-stage"><img src="/assets/ufl-animated.gif" alt="Animated UNC Futbol League crest"></div></div></section>`;
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
  if (requestedType === '10v10') return tenVTenComingSoon('Schedules and fixtures');
  const type = ['events','league-cup'].includes(requestedType) ? requestedType : 'events';
  const data = scheduleTypes[type];
  const tabs = ['events','league-cup'].map(key => {
    const val = scheduleTypes[key];
    return `<a class="tab ${key===type?'active':''}" href="/schedules/${key==='events'?'community-events':'league-cup'}" data-link>${val[0]}</a>`;
  }).join('');
  const rows = leagueSeason?.weeks?.flatMap(week => week.matches.map(([id,home,away,homeScore,awayScore], matchIndex) => {
    const played = homeScore !== null && awayScore !== null;
    return `<tr><td><strong>Week ${week.week}</strong><small class="match-number">Match ${matchIndex+1}</small></td><td>${escapeHtml(week.date)}</td><td>${escapeHtml(leagueTeam(home)[0])}</td><td>${escapeHtml(leagueTeam(away)[0])}</td><td><a class="result-link ${played?'final':'upcoming'}" href="https://ufl.virtualarena.app/matches/${id}" target="_blank" rel="noopener noreferrer">${played?`${homeScore}–${awayScore} · Final`:'Upcoming'} ↗</a></td></tr>`;
  })).join('');
  return pageHero('Match centre',data[0],data[1]) + `<section class="section"><div class="tabs">${tabs}</div><p class="sync-note">Official fixtures and results · synced from Virtual Arena</p><div class="table-wrap"><table><thead><tr><th>Matchweek</th><th>Date</th><th>Home</th><th>Away</th><th>Result</th></tr></thead><tbody>${rows || '<tr><td colspan="5">League schedule temporarily unavailable.</td></tr>'}</tbody></table></div></section>`;
}

function scheduleLandingTabs(active) {
  return `<div class="tabs"><a class="tab ${active==='events'?'active':''}" href="/schedules/community-events" data-link>Community Events Schedule</a><a class="tab ${active==='league-cup'?'active':''}" href="/schedules/league-cup" data-link>League Cup Schedule</a></div>`;
}

function communityEventsPage() {
  return pageHero('Community calendar','Community Events Schedule','Draft nights, random squads, special formats, and the sort of ideas that sound even better after kickoff.') +
    `<section class="section schedule-landing">${scheduleLandingTabs('events')}<div class="status-row"><span class="season-chip season-chip-upcoming">Dates being arranged</span></div><div class="schedule-feature"><div><span class="section-kicker">No league table required</span><h2>SHOW UP.<br>GET A TEAM.<br>BLAME THE WHEEL.</h2><p class="section-intro">Community events are flexible one-night competitions built for whoever is around. Official dates and signup details will appear here as each event is announced.</p></div><div class="cards schedule-cards"><article class="card"><span class="num">01</span><h3>Random Squad Nights</h3><p>Let the Unc Wheel handle recruitment, then insist the draw was rigged.</p></article><article class="card"><span class="num">02</span><h3>Draft Events</h3><p>Captains, player pools, and just enough strategy to cause a group-chat investigation.</p></article><article class="card"><span class="num">03</span><h3>Special Formats</h3><p>Theme nights, quick cups, and community experiments that do not need a full season.</p></article></div></div>${emptyState('The cookout calendar is warming up','No community event has been officially scheduled yet. Once a date is confirmed, the event format, signup window, and kickoff time will be posted here.')}</section>`;
}

function leagueCupPage() {
  return pageHero('Road to silverware','League Cup Schedule','One bracket, no league-table excuses, and a trophy somebody will mention for the next five years.') +
    `<section class="section schedule-landing">${scheduleLandingTabs('league-cup')}<div class="status-row"><span class="season-chip season-chip-upcoming">Cup draw coming soon</span></div><div class="cup-road"><article><span>01</span><strong>Draw</strong><small>Teams enter the hat</small></article><i>→</i><article><span>02</span><strong>Opening Round</strong><small>Win or find a new excuse</small></article><i>→</i><article><span>03</span><strong>Semifinals</strong><small>The pressure gets real</small></article><i>→</i><article><span>04</span><strong>Final</strong><small>One last night for glory</small></article></div>${emptyState('The bracket is still at the engraver','The official League Cup draw, matchups, and kickoff dates will appear here when the competition is announced. Bring shin pads and several believable connection excuses.')}</section>`;
}

function standingsPage(params) {
  const division = params.get('division') === '10v10' ? '10v10' : '6v6';
  if (division === '10v10') return tenVTenComingSoon('Standings and statistics');
  const rows = leagueSeason?.standings?.map(([key,played,wins,draws,losses,gf,ga,gd,points], index) => { const [name,logo]=leagueTeam(key); return `<tr><td><strong>${index+1}</strong></td><td><a class="table-team" href="${virtualArena['6v6'].standings}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(logo)}" alt="" loading="lazy"><strong>${escapeHtml(name)}</strong></a></td><td>${played}</td><td>${wins}</td><td>${draws}</td><td>${losses}</td><td>${signed(gd)}</td><td><strong>${points}</strong></td></tr>`; }).join('');
  return pageHero('Race for the title','Standings','Form, points, goal difference, and the weekly reminder that the table never lies.') + `<section class="section"><div class="tabs"><a class="tab active" href="/standings" data-link>6v6</a><a class="tab" href="/standings?division=10v10" data-link>10v10</a></div><p class="sync-note">Official table · synced from Virtual Arena</p><div class="table-wrap"><table><thead><tr><th>#</th><th>Club</th><th>Played</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Standings temporarily unavailable.</td></tr>'}</tbody></table></div></section>`;
}

function utilityPage(kind) {
  return pageHero('Call your shot','UFL Pick’ems','Predict the fixtures, collect points, and earn group-chat immunity for approximately one week.') + `<section class="section"><div class="utility-frame">${emptyState('Touchline connection next','The real Simple and Detailed Pick’ems were located in Touchline. Its server and member data will be connected here in the backend deployment phase.')}</div></section>`;
}

function wheelPage() {
  return `<section class="integrated-app" aria-label="Unc Wheel United"><iframe class="integrated-app-frame" src="/wheel-app/?v=20260903-readability1" title="Unc Wheel United application" scrolling="no"></iframe></section>`;
}

function pickemsPage() {
  return `<section class="integrated-app pickems-host" aria-label="UFL Pick’ems"><iframe class="integrated-app-frame" src="/pickems-app/?v=20260904-va-sync1" title="UFL Pick’ems application" scrolling="no"></iframe></section>`;
}

function contactPage() {
  return pageHero('Get in the game','Contact & Discord','UFL lives online. The Discord is our clubhouse, match lobby, transfer desk, and questionable pundit studio.') + `<section class="section contact-grid"><div class="contact-panel"><span class="section-kicker">The clubhouse</span><h2>JOIN THE DISCORD</h2><p>Find a team, register for competition, report results, and meet the Uncs. Add the permanent invite link to activate this button.</p><span class="button button-primary" aria-disabled="true">Invite link coming soon</span></div><div class="card"><span class="num">?</span><h3>Need league help?</h3><p>Commissioner contacts, support channels, and partnership information will be listed here after the Discord details are confirmed.</p><p><strong>League location:</strong><br><span id="contact-location">Wherever the Wi-Fi reaches.</span></p><button class="tab" id="contact-reroll">Relocate Unc</button></div></section>`;
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
  return `<div class="account-profile">${avatar}<div><span class="season-chip season-chip-live">${escapeHtml(user.role)}</span><h2>${escapeHtml(user.displayName)}</h2><p>@${escapeHtml(user.username)}</p></div></div>`;
}

async function hydrateAccount() {
  const state = await getAuthState();
  const nav = document.querySelector('#account-nav');
  if (nav) nav.textContent = state.authenticated ? state.user.displayName : 'Sign in';
  const accountRoot = document.querySelector('#account-root');
  if (accountRoot) {
    if (!state.configured) accountRoot.innerHTML = `<h2>Discord login setup</h2><p>The secure login code is ready. Connect the Cloudflare database and Discord application secrets to activate registration.</p>`;
    else if (!state.authenticated) accountRoot.innerHTML = `<h2>Join with Discord</h2><p>We request only your Discord ID, username, display name, and avatar. We do not request your email or messages. If you enter Pick’ems, your display name and avatar may appear on the public leaderboard.</p><a class="button discord-button" href="/api/auth/discord">Continue with Discord →</a>`;
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
  const response = await fetch('/api/admin/users', { credentials: 'same-origin' });
  if (!response.ok) return void (adminRoot.innerHTML = '<h2>Unable to load members</h2><p>Please sign in again or try later.</p>');
  const data = await response.json();
  adminRoot.innerHTML = `<div class="admin-heading"><div><p class="eyebrow">Registered through Discord</p><h2>${data.users.length} members</h2></div><span class="season-chip season-chip-live">${escapeHtml(state.user.role)}</span></div><div class="member-list">${data.users.map(user => `<article class="member-row">${user.avatarUrl?`<img class="discord-avatar" src="${escapeHtml(user.avatarUrl)}" alt="">`:'<span class="discord-avatar avatar-fallback">UFL</span>'}<div><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)} · ${escapeHtml(user.status)}</small></div><span class="member-role">${escapeHtml(user.role)}</span>${data.canManageRoles&&user.role!=='owner'?`<button class="tab" data-role-user="${escapeHtml(user.id)}" data-next-role="${user.role==='admin'?'member':'admin'}">${user.role==='admin'?'Remove admin':'Make admin'}</button>`:'<span></span>'}</article>`).join('')}</div>`;
  document.querySelectorAll('[data-role-user]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    const update = await fetch('/api/admin/role', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ discordId: button.dataset.roleUser, role: button.dataset.nextRole }) });
    if (update.ok) hydrateAccount(); else button.disabled = false;
  }));
}

function render() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const main = document.querySelector('main');
  if (path === routes.rules) main.innerHTML = rulesPage();
  else if (path === routes.teams) main.innerHTML = teamsPage(params);
  else if (path === '/schedules/community-events') main.innerHTML = communityEventsPage();
  else if (path === '/schedules/league-cup') main.innerHTML = leagueCupPage();
  else if (path === routes.schedules) main.innerHTML = schedulesPage(params);
  else if (path === routes.standings) main.innerHTML = standingsPage(params);
  else if (path === routes.pickems) main.innerHTML = pickemsPage();
  else if (path === routes.wheel) main.innerHTML = wheelPage();
  else if (path === routes.contact) main.innerHTML = contactPage();
  else if (path === routes.account) main.innerHTML = accountPage();
  else if (path === routes.admin) main.innerHTML = adminPage();
  else main.innerHTML = homePage();
  document.querySelectorAll('.main-nav > a').forEach(a => a.classList.toggle('active', new URL(a.href).pathname === path));
  bindDynamicActions();
  hydrateAccount();
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
