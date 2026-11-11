const uflSeasonCards = [
  {id:'6v6',overview:'/competitions/6v6',name:'UNC Fútbol League 6v6',label:'6v6 · Season 2',schedule:'/schedules?season=2&type=6v6',table:'/standings?season=2&division=6v6',official:'https://ufl.virtualarena.app/competitions/1/seasons/2'},
  {id:'10v10',overview:'/competitions/10v10',name:'UNC Fútbol League 10v10',label:'10v10 · UFL Season 2',providerSeason:'Virtual Arena Season 1',schedule:'/schedules?season=2&type=10v10',table:'/standings?season=2&division=10v10',official:'https://ufl.virtualarena.app/competitions/3/seasons/5'},
  {id:'international',name:'UFL Intercontinental Cup',label:'Internationals · Season 1',schedule:'/internationals/schedules',table:'/internationals/standings',official:'https://ufl.virtualarena.app/competitions/4/seasons/6'},
];
const uflSeasonStatuses = {registration:'Registrations open',ongoing:'In progress',upcoming:'Upcoming',complete:'Completed'};

function fetchUflSeasonStatuses() {
  return fetch('/pickems-app/seasons/competition-status.json',{cache:'no-store'})
    .then(response => response.ok ? response.json() : {});
}

function uflCompetitionCards(active = '') {
  return uflSeasonCards.map(card => {
    const international = card.id === 'international';
    const href = international ? '/internationals' : card.overview;
    return `<a class="home-competition-card" href="${escapeHtml(href)}"${international ? '' : ' data-link'} ${card.id === active ? 'aria-current="page"' : ''}>
      <span class="home-competition-state" data-home-competition-state="${card.id}" hidden></span>
      <span class="home-competition-name">${escapeHtml(card.name)} <span aria-hidden="true">→</span></span>
    </a>`;
  }).join('');
}

function uflHomeCompetitions() {
  return `<section class="section home-competitions" aria-labelledby="home-competitions-title">
    <div class="home-competitions-heading"><h2 id="home-competitions-title">Current competitions</h2>
      <a href="/teams?division=house" data-link>House teams →</a></div>
    <nav class="home-competition-grid" aria-label="Current competitions">${uflCompetitionCards()}</nav>
  </section>`;
}

function updateUflCompetitionStatusBadges(section, statuses) {
  updateUflCompetitionStatusBadges(section, statuses);
}

async function hydrateUflHomeCompetitions() {
  const section = document.querySelector('.home-competitions');
  if (!section) return;
  const statuses = await fetchUflSeasonStatuses().catch(() => ({}));
  if (!section.isConnected) return;
  for (const badge of section.querySelectorAll('[data-home-competition-state]')) {
    const status = statuses[badge.dataset.homeCompetitionState]?.status;
    if (!Object.hasOwn(uflSeasonStatuses, status)) continue;
    badge.dataset.state = status;
    badge.textContent = uflSeasonStatuses[status];
    badge.hidden = false;
  }
}

function uflSeasonPage() {
  return pageHero('UFL · League','Current season','Find the competitions, registration status, fixtures and standings for the UFL season.')+
    '<section class="section"><div class="season-board" aria-label="Current competitions" data-season-board></div><div data-season-cups></div></section>';
}

async function hydrateUflSeasonPage() {
  const board=document.querySelector('[data-season-board]');
  if(!board)return;
  const cups=document.querySelector('[data-season-cups]');
  function renderCards(statuses={}) {
    board.innerHTML=uflSeasonCards.map(card=>{
      const details=statuses[card.id], status=details?.status;
      const registration=status==='registration';
      const domestic = card.id === '6v6' || card.id === '10v10';
      const weeks = domestic ? leagueSeasonFor(card.id, '2')?.weeks || [] : [];
      const lastKickoff = Math.max(0, ...weeks.flatMap(week => [
        Number(week.scheduledAt) || 0,
        ...(week.rounds || []).map(round => Number(round.scheduledAt) || 0),
      ]));
      let timing;
      let label;
      if (registration) {
        timing = Date.parse(details.registrationEnds);
        label = 'Registrations close';
      } else if (status === 'upcoming') {
        timing = Date.parse(details.startsAt);
        label = 'Competition starts';
      } else if (status === 'ongoing' || !status) {
        timing = lastKickoff ? lastKickoff * 1000 : Date.parse(details?.endsAt);
        label = lastKickoff ? 'Last scheduled matchday' : 'Competition ends';
      }
      const date = Number.isFinite(timing)
        ? new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: window.UFLTime?.zone?.() || 'America/New_York'}).format(timing)
        : '';
      const note = date ? label + ' ' + date : '';
      return '<article class="season-competition card"><span class="section-kicker">'+escapeHtml(card.label)+'</span><h2>'+escapeHtml(card.name)+'</h2>'+
        '<span class="season-state" data-state="'+escapeHtml(status||'unknown')+'">'+escapeHtml(uflSeasonStatuses[status]||'Status unavailable')+'</span>'+
        (note?'<p>'+escapeHtml(note)+'</p>':'')+
        (card.providerSeason?'<p class="season-provider-label">'+escapeHtml(card.providerSeason)+'</p>':'')+
        '<div class="season-card-links">'+(card.overview?'<a href="'+card.overview+'" data-link>Overview</a>':'')+'<a href="'+card.schedule+'"'+(card.id==='international'?'':' data-link')+'>Fixtures</a><a href="'+card.table+'"'+(card.id==='international'?'':' data-link')+'>Standings</a>'+(card.id==='international'?'<a href="/pickems?competition=s1-internationals" data-link>Pick’ems</a>':'')+'<a href="'+card.official+'" rel="noopener noreferrer" target="_blank">'+(registration?'Registration on VA ↗':'Official competition ↗')+'</a></div></article>';
    }).join('');
  }
  board.textContent='Loading competitions…';
  const results=await Promise.allSettled([
    fetchUflSeasonStatuses(),
    fetch('/api/events?destination=league-cup',{cache:'no-store'}).then(response=>response.ok?response.json():{}),
  ]);
  if(!board.isConnected)return;
  renderCards(results[0].status==='fulfilled'?results[0].value:{});
  const data=results[1].status==='fulfilled'?results[1].value:{};
  const published=Array.isArray(data.events)?data.events.filter(event=>['live','upcoming'].includes(event.lifecycleStatus)&&Date.parse(event.startsAt)>=Date.parse('2026-10-01T00:00:00Z')&&Date.parse(event.startsAt)<Date.parse('2027-10-01T00:00:00Z')):[];
  if(!published.length||!cups?.isConnected)return;
  cups.innerHTML='<h2 class="season-cups-heading">Published league cups</h2><div class="season-board">'+published.map(event=>'<article class="season-competition card"><h3>'+escapeHtml(event.title)+'</h3><span class="season-state" data-state="'+(event.lifecycleStatus==='live'?'ongoing':'upcoming')+'">'+(event.lifecycleStatus==='live'?'In progress':'Upcoming')+'</span><div class="season-card-links"><a href="/schedules/league-cup" data-link>Open cup schedule</a></div></article>').join('')+'</div>';
}
