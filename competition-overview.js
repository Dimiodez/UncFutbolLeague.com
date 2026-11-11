function competitionKickoff(stamp) {
  return window.UFLTime?.format(stamp * 1000) || new Date(stamp * 1000).toLocaleString('en-US', {
    month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago',timeZoneName:'short'
  });
}

function competitionTeamLink(key, context) {
  const visual = leagueClubVisual(key, context.season);
  return `<a class="competition-team" href="${leagueViewLink('/clubs/' + encodeURIComponent(key), context)}" data-link>
    <img src="${escapeHtml(visual.logo || '/assets/ufl-mark.webp')}" alt="" width="28" height="28" loading="lazy">
    <span>${escapeHtml(visual.name)}</span>
  </a>`;
}

function competitionFixture(match, context, recent = false) {
  const played = scheduleMatchState(match, context.season) === 'played';
  const score = played ? match[3] + ' – ' + match[4] : 'vs';
  return `<article class="competition-fixture">
    ${recent ? `<time class="competition-result-time" datetime="${new Date(match[5] * 1000).toISOString()}">${escapeHtml(competitionKickoff(match[5]))}</time>` : ''}
    ${competitionTeamLink(match[1], context)}
    <strong class="competition-score">${score}</strong>
    ${competitionTeamLink(match[2], context)}
  </article>`;
}

function competitionOverviewPage(division, params = new URLSearchParams()) {
  const context = leagueViewContext(new URLSearchParams({season:'2',division}));
  const season = context.season;
  const weeks = season?.weeks || [];
  const night = defaultScheduleWeek(weeks, Date.now(), false);
  const played = weeks.flatMap(day => day.matches.map(match => ({day, match})))
    .filter(({match}) => scheduleMatchState(match, season) === 'played')
    .sort((a, b) => (b.match[5] || b.day.scheduledAt) - (a.match[5] || a.day.scheduledAt) || b.match[0] - a.match[0]);
  const latestWeek = played[0]?.day.week;
  const base = '/competitions/' + division;
  const schedule = '/schedules?season=2&type=' + division;
  const roundNumbers = [...new Set([
    ...(night?.rounds || []).map(round => round.round),
    ...(night?.matches || []).map(match => match[6] || 1),
    ...(night?.byes || []).map(bye => bye.round),
  ])].sort((a, b) => a - b);
  const selectedRound = roundNumbers.find(round => String(round) === params.get('round')) || roundNumbers[0];
  const matches = (night?.matches || []).filter(match => (match[6] || 1) === selectedRound);
  const byes = (night?.byes || []).filter(bye => bye.round === selectedRound);
  const next = night ? `
    <section class="competition-panel" aria-labelledby="competition-next-title">
      <header class="competition-panel-header">
        <div><p class="section-kicker">${night.scheduledAt * 1000 <= Date.now() ? 'Current match night' : 'Next match night'}</p>
        <h2 id="competition-next-title">Matchday ${night.week}</h2>
        <p>${escapeHtml(competitionKickoff(night.scheduledAt))}</p></div>
        <a href="${schedule}&matchday=${night.week}" data-link>Open match night →</a>
      </header>
      <nav class="competition-rounds" aria-label="Match night rounds">${roundNumbers.map(round => {
        const stamp = night.rounds?.find(entry => entry.round === round)?.scheduledAt || night.scheduledAt;
        return `<a href="${base}?round=${round}" data-link ${round === selectedRound ? 'aria-current="page"' : ''}>
          <strong>Round ${round}</strong><span>${escapeHtml(competitionKickoff(stamp))}</span>
        </a>`;
      }).join('')}</nav>
      <div class="competition-fixture-list" aria-label="Round ${selectedRound} fixtures">
        ${matches.map(match => competitionFixture(match, context)).join('')}
        ${byes.map(bye => `<p class="competition-bye">${competitionTeamLink(bye.team, context)}<span>BYE · Round ${selectedRound}</span></p>`).join('')}
        ${matches.length || byes.length ? '' : '<p>No fixtures are listed for this round yet.</p>'}
      </div>
      <a class="competition-picks-link" href="/pickems?season=2&division=${division}&matchday=${night.week}" data-link>
        ${night.scheduledAt * 1000 > Date.now() ? 'Make your picks' : 'View this matchday’s picks'} →
      </a>
    </section>` : `<section class="competition-panel" aria-labelledby="competition-next-title">
      <h2 id="competition-next-title">Next match night</h2><p>The next fixtures will appear when scheduled.</p>
      <a href="${schedule}" data-link>View the schedule →</a>
    </section>`;
  const table = (season?.standings || []).slice(0, 5);
  const standings = table.length ? `<div class="competition-table-scroll"><table>
    <thead><tr><th scope="col" aria-label="Position">#</th><th scope="col">Club</th><th scope="col">P</th><th scope="col">GD</th><th scope="col">Pts</th></tr></thead>
    <tbody>${table.map(([key, games, wins, draws, losses, gf, ga, gd, points], index) =>
      `<tr><td>${index + 1}</td><th scope="row">${competitionTeamLink(key, context)}</th><td>${games}</td><td>${signed(gd)}</td><td><strong>${points}</strong></td></tr>`).join('')}</tbody>
    </table></div>` : '<p>Standings will appear after results are published.</p>';
  const recent = played.slice(0, 6).map(({match,day}) => competitionFixture(
    [...match.slice(0, 5), match[5] || day.scheduledAt, ...match.slice(6)], context, true)).join('');
  return `<section class="section competition-overview" data-competition-overview="${division}">
    <nav class="home-competition-grid" aria-label="Current competitions">${uflCompetitionCards(division)}</nav>
    <header class="competition-heading">
      <p class="section-kicker">FC27 · UFL Season 2</p>
      <h1>UNC Fútbol League ${division}</h1>
    </header>
    <nav class="competition-links" aria-label="${division} competition pages">
      <a href="/clubs?season=2&division=${division}" data-link>Teams</a>
      <a href="${schedule}" data-link>Fixtures</a>
      <a href="/standings?season=2&division=${division}" data-link>Standings</a>
      <a href="/stats?season=2&division=${division}" data-link>Stats</a>
      <a href="/totw?season=2${latestWeek ? '&week=' + latestWeek : ''}#award-${division}" data-link>TOTW</a>
      <a href="/pickems?season=2&division=${division}" data-link>Pick’ems</a>
    </nav>
    <div class="competition-layout">
      <div class="competition-main">${next}
        <section class="competition-panel" aria-labelledby="competition-recent-title">
          <header class="competition-panel-header"><h2 id="competition-recent-title">Recent results</h2>
          <a href="${schedule}&status=played&matchday=all" data-link>All results →</a></header>
          <div class="competition-fixture-list">${recent || '<p>Confirmed results will appear here.</p>'}</div>
        </section>
      </div>
      <aside class="competition-panel" aria-labelledby="competition-standings-title">
        <header class="competition-panel-header"><h2 id="competition-standings-title">Standings</h2></header>
        ${standings}<a class="competition-table-link" href="/standings?season=2&division=${division}" data-link>Full table →</a>
      </aside>
    </div>
    ${season?.syncedAt ? `<p class="competition-update">Last published update ${escapeHtml(new Date(season.syncedAt).toLocaleString())}</p>` : ''}
  </section>`;
}

function hydrateCompetitionOverview() {
  const root = document.querySelector('[data-competition-overview]');
  if (!root) return;
  const navigation = root.querySelector('.home-competition-grid');
  const active = navigation?.querySelector('[aria-current="page"]');
  if (active && navigation.scrollWidth > navigation.clientWidth) {
    navigation.scrollLeft = active.offsetLeft - navigation.offsetLeft -
      (navigation.clientWidth - active.clientWidth) / 2;
  }
  fetchUflSeasonStatuses().then(statuses => {
    if (!root.isConnected) return;
    updateUflCompetitionStatusBadges(root, statuses);
  }).catch(() => {});
}
