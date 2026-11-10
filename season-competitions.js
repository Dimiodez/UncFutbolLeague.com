const uflSeasonCards = [
  {id:'6v6',name:'UNC Fútbol League 6v6',label:'6v6 · Season 2',schedule:'/schedules?season=2&type=6v6',table:'/standings?season=2&division=6v6',official:'https://ufl.virtualarena.app/competitions/1/seasons/2'},
  {id:'10v10',name:'UNC Fútbol League 10v10',label:'10v10 · Season 1 on VA',schedule:'/schedules?season=2&type=10v10',table:'/standings?season=2&division=10v10',official:'https://ufl.virtualarena.app/competitions/3/seasons/5'},
  {id:'international',name:'UFL Intercontinental Cup',label:'Internationals · Season 1',schedule:'/internationals/schedules',table:'/internationals/standings',official:'https://ufl.virtualarena.app/competitions/4/seasons/6'},
];
const uflSeasonStatuses = {registration:'Registrations open',ongoing:'In progress',upcoming:'Upcoming',complete:'Completed'};

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
      const timing=registration?details.registrationEnds:status==='ongoing'?details.endsAt:status==='upcoming'?details.startsAt:null;
      const date=timing&&Date.parse(timing)?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:window.UFLTime?.zone?.()||'America/Chicago'}).format(new Date(timing)):'';
      const note=date?(registration?'Registrations close ':status==='ongoing'?'Competition ends ':'Competition starts ')+date:'';
      return '<article class="season-competition card"><span class="section-kicker">'+escapeHtml(card.label)+'</span><h2>'+escapeHtml(card.name)+'</h2>'+
        '<span class="season-state" data-state="'+escapeHtml(status||'unknown')+'">'+escapeHtml(uflSeasonStatuses[status]||'Status unavailable')+'</span>'+
        (note?'<p>'+escapeHtml(note)+'</p>':'')+
        '<div class="season-card-links"><a href="'+card.schedule+'"'+(card.id==='international'?'':' data-link')+'>Fixtures</a><a href="'+card.table+'"'+(card.id==='international'?'':' data-link')+'>Standings</a><a href="'+card.official+'" rel="noopener noreferrer" target="_blank">'+(registration?'Registration on VA ↗':'Official competition ↗')+'</a></div></article>';
    }).join('');
  }
  board.textContent='Loading competitions…';
  const results=await Promise.allSettled([
    fetch('/pickems-app/seasons/competition-status.json',{cache:'no-store'}).then(response=>response.ok?response.json():{}),
    fetch('/api/events?destination=league-cup',{cache:'no-store'}).then(response=>response.ok?response.json():{}),
  ]);
  if(!board.isConnected)return;
  renderCards(results[0].status==='fulfilled'?results[0].value:{});
  const data=results[1].status==='fulfilled'?results[1].value:{};
  const published=Array.isArray(data.events)?data.events.filter(event=>['live','upcoming'].includes(event.lifecycleStatus)&&Date.parse(event.startsAt)>=Date.parse('2026-10-01T00:00:00Z')&&Date.parse(event.startsAt)<Date.parse('2027-10-01T00:00:00Z')):[];
  if(!published.length||!cups?.isConnected)return;
  cups.innerHTML='<h2 class="season-cups-heading">Published league cups</h2><div class="season-board">'+published.map(event=>'<article class="season-competition card"><h3>'+escapeHtml(event.title)+'</h3><span class="season-state" data-state="'+(event.lifecycleStatus==='live'?'ongoing':'upcoming')+'">'+(event.lifecycleStatus==='live'?'In progress':'Upcoming')+'</span><div class="season-card-links"><a href="/schedules/league-cup" data-link>Open cup schedule</a></div></article>').join('')+'</div>';
}
