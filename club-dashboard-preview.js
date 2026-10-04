const maykopDashboardData = {
  club: {
    name: 'UFL Maykop', abbreviation: 'UM', division: 'Division 1', skillRating: 1875,
    record: { wins: 33, draws: 6, losses: 15 },
    stats: { played: 54, goals: 137, conceded: 90, goalDifference: 47, winRate: 61.1, goalsPerGame: 2.54, concededPerGame: 1.67, promotions: 4 },
    form: ['L','L','W','W','W','W','L','W']
  },
  players: [
    { position:'CM', name:'f. last', rating:7.5, games:47, goals:25, assists:26, motm:6, winRate:68, pass:82 },
    { position:'CM', name:'Schwein', rating:8.1, games:51, goals:7, assists:28, motm:13, winRate:62, pass:78 },
    { position:'ST', name:'D. Dezhimoviç', rating:7.5, games:43, goals:33, assists:24, motm:6, winRate:69, pass:71 },
    { position:'CB', name:'Bizzie', rating:7.3, games:34, goals:1, assists:4, motm:1, winRate:61, pass:84, tackles:50 },
    { position:'ST', name:'Zo', rating:7.5, games:27, goals:19, assists:11, motm:4, winRate:66, pass:79 },
    { position:'CB', name:'Grazinho', rating:6.6, games:23, goals:4, assists:4, motm:0, winRate:69, pass:77, tackles:19 },
    { position:'ST', name:'B. kardan', rating:6.8, games:33, goals:5, assists:1, motm:0, winRate:60, pass:82 },
    { position:'CB', name:'B. Papi', rating:8.0, games:22, goals:6, assists:8, motm:2, winRate:77, pass:85, tackles:22 },
    { position:'ST', name:'A. Salmon', rating:7.6, games:41, goals:31, assists:15, motm:5, winRate:73, pass:81 },
    { position:'ST', name:'Güt', rating:6.8, games:12, goals:2, assists:1, motm:0, winRate:41, pass:75 }
  ],
  matches: [
    { result:'L', score:'0–3', opponent:'As Monaco CF', players:5, note:'League' },
    { result:'L', score:'0–6', opponent:'As Monaco CF', players:5, note:'League' },
    { result:'W', score:'2–0', opponent:'A2Touch', players:6, note:'Odez · IffyPopcorn3914' },
    { result:'W', score:'4–0', opponent:'FoeFoesIMTippin', players:6, note:'IffyPopcorn3914 (3) · Odez' },
    { result:'W', score:'3–0', opponent:'fkJws', players:6, note:'Odez (2) · aaaa111aaaaa' },
    { result:'W', score:'6–1', opponent:'Legendarios300', players:5, note:'IffyPopcorn3914 (3) · Odez (2)' },
    { result:'L', score:'0–2', opponent:'Splash Bros FC', players:8, note:'League' },
    { result:'W', score:'5–0', opponent:'FC FENIX', players:8, note:'aaaa111aaaaa (4) · Odez' },
    { result:'W', score:'3–1', opponent:'Trendy Lions', players:9, note:'IffyPopcorn3914 (3)' },
    { result:'W', score:'2–0', opponent:'Los Timidos', players:9, note:'llzoll · IffyPopcorn3914' }
  ]
};

function maykopCrest() {
  return `<div class="maykop-crest" role="img" aria-label="UFL Maykop crest"><span class="maykop-ball">◆</span><strong>UM</strong></div>`;
}

function maykopClubDashboardPage() {
  const {club,players,matches}=maykopDashboardData;
  const metric=(label,value,detail='')=>`<article class="club-metric"><span>${label}</span><strong>${value}</strong>${detail?`<small>${detail}</small>`:''}</article>`;
  const form=club.form.map(result=>`<b class="club-form-${result.toLowerCase()}">${result}</b>`).join('');
  const leaders=[
    ['The Golden Grill','D. Dezhimoviç','33 goals','The finisher keeping the net busy.'],
    ['The Grocery Getter','Schwein','28 assists','Bringing chances home for everybody.'],
    ['Built Different','Schwein','13 MOTM','The performance that keeps showing up.'],
    ['The Brick House','B. Papi','85% passing','22 tackles · 8.0 average rating.']
  ];
  return `<section class="club-dashboard-preview">
    <div class="club-preview-ribbon"><span>TEST REALM</span><strong>EA club profile concept</strong><small>Prototype data from the linked Maykop profile · no production changes</small></div>
    <header class="club-dashboard-hero">
      <div class="club-dashboard-identity">${maykopCrest()}<div><span class="section-kicker">FC27 · COMMON GEN 5</span><h1>${club.name}</h1><div class="club-dashboard-badges"><b>${club.division}</b><b>SR ${club.skillRating}</b><b>EA linked</b></div></div></div>
      <div class="club-dashboard-record"><div><strong>${club.record.wins}</strong><span>Wins</span></div><div><strong>${club.record.draws}</strong><span>Draws</span></div><div><strong>${club.record.losses}</strong><span>Losses</span></div></div>
      <div class="club-dashboard-form"><span>Recent form</span><div>${form}</div><small>Last 8 · 5W · 0D · 3L</small></div>
    </header>
    <nav class="club-dashboard-tabs" role="tablist" aria-label="UFL Maykop dashboard sections">
      ${[['overview','Overview'],['squad','Squad'],['matches','Matches'],['honors','UNC Honors']].map(([id,label],index)=>`<button type="button" role="tab" aria-selected="${index===0}" aria-controls="club-panel-${id}" id="club-tab-${id}" data-club-dashboard-tab="${id}">${label}</button>`).join('')}
    </nav>
    <div class="club-dashboard-panels">
      <section role="tabpanel" id="club-panel-overview" aria-labelledby="club-tab-overview" data-club-dashboard-panel="overview">
        <div class="club-metric-grid">${metric('League appearances',club.stats.played,'EA club total')}${metric('Win rate',`${club.stats.winRate}%`,'33 wins')}${metric('Goals',club.stats.goals,`${club.stats.goalsPerGame} per game`)}${metric('Conceded',club.stats.conceded,`${club.stats.concededPerGame} per game`)}${metric('Goal difference',`+${club.stats.goalDifference}`,'137 for · 90 against')}${metric('Promotions',club.stats.promotions,'Club progression')}</div>
        <div class="club-dashboard-two-col">
          <article class="club-dashboard-card club-season-pulse"><div class="club-card-heading"><div><span class="section-kicker">Last 10 league matches</span><h2>Season pulse</h2></div><strong>70%</strong></div><div class="club-pulse-score"><b>7W</b><b>0D</b><b>3L</b></div><div class="club-pulse-track"><i style="width:70%"></i></div><div class="club-pulse-split"><span><strong>25</strong> scored</span><span><strong>13</strong> conceded</span><span><strong>+12</strong> difference</span></div><p>The attack is producing 2.5 goals per match across the current ten-match window.</p></article>
          <article class="club-dashboard-card"><span class="section-kicker">Squad leaders</span><h2>Setting the standard</h2><ol class="club-leader-list"><li><span>Highest rating</span><strong>Schwein · 8.1</strong></li><li><span>Goals</span><strong>D. Dezhimoviç · 33</strong></li><li><span>Assists</span><strong>Schwein · 28</strong></li><li><span>Best win rate</span><strong>B. Papi · 77%</strong></li></ol></article>
        </div>
      </section>
      <section role="tabpanel" id="club-panel-squad" aria-labelledby="club-tab-squad" data-club-dashboard-panel="squad" hidden>
        <div class="club-panel-heading"><div><span class="section-kicker">Linked EA squad</span><h2>The Maykop lineup</h2></div><label>Sort players<select id="maykop-player-sort"><option value="games">Games played</option><option value="rating">Average rating</option><option value="goals">Goals</option><option value="assists">Assists</option><option value="motm">MOTM</option></select></label></div>
        <div class="club-squad-grid" id="maykop-squad-grid">${players.map(player=>maykopPlayerCard(player)).join('')}</div>
      </section>
      <section role="tabpanel" id="club-panel-matches" aria-labelledby="club-tab-matches" data-club-dashboard-panel="matches" hidden>
        <div class="club-panel-heading"><div><span class="section-kicker">EA result feed</span><h2>Recent matches</h2></div><span class="season-chip season-chip-live">Post-match data</span></div>
        <div class="club-match-list">${matches.map((match,index)=>`<article class="club-match-row"><b class="club-form-${match.result.toLowerCase()}">${match.result}</b><div><small>${index<6?'Today':'Yesterday'} · League</small><strong>${club.name} <em>${match.score}</em> ${match.opponent}</strong><span>${match.players} Maykop players · ${match.note}</span></div><button type="button" title="Full stat sheet will use the UFB match format">Full stats</button></article>`).join('')}</div>
        <p class="club-data-note">The connected version would expand each result into the same complete player stat sheet used by the UFB <code>/matches</code> command.</p>
      </section>
      <section role="tabpanel" id="club-panel-honors" aria-labelledby="club-tab-honors" data-club-dashboard-panel="honors" hidden>
        <div class="club-panel-heading"><div><span class="section-kicker">Our own clubhouse awards</span><h2>UNC Honors</h2><p>Original UFL recognition built from verified match totals—not copied award names.</p></div></div>
        <div class="club-honor-grid">${leaders.map(([title,name,value,copy],index)=>`<article><span>0${index+1}</span><div><small>${title}</small><h3>${name}</h3><strong>${value}</strong><p>${copy}</p></div></article>`).join('')}</div>
      </section>
    </div>
    <footer class="club-dashboard-foot"><span>Prototype route</span><code>/test/maykop</code><p>Future live version: EA club ID + platform → private Worker → verified club page.</p></footer>
  </section>`;
}

function maykopPlayerCard(player) {
  return `<article class="club-squad-card" data-rating="${player.rating}" data-games="${player.games}" data-goals="${player.goals}" data-assists="${player.assists}" data-motm="${player.motm}"><div class="club-player-top"><b>${player.position}</b><span>${player.rating}</span></div><h3>${player.name}</h3><div class="club-player-stats"><span><b>${player.games}</b> Apps</span><span><b>${player.goals}</b> Goals</span><span><b>${player.assists}</b> Assists</span><span><b>${player.motm}</b> MOTM</span><span><b>${player.winRate}%</b> Wins</span><span><b>${player.pass}%</b> Pass</span></div></article>`;
}

function bindMaykopDashboard() {
  const root=document.querySelector('.club-dashboard-preview');
  if(!root)return;
  const activate=id=>{
    root.querySelectorAll('[data-club-dashboard-tab]').forEach(button=>{const active=button.dataset.clubDashboardTab===id;button.setAttribute('aria-selected',String(active));});
    root.querySelectorAll('[data-club-dashboard-panel]').forEach(panel=>{panel.hidden=panel.dataset.clubDashboardPanel!==id;});
  };
  root.querySelectorAll('[data-club-dashboard-tab]').forEach(button=>button.addEventListener('click',()=>activate(button.dataset.clubDashboardTab)));
  root.querySelector('#maykop-player-sort')?.addEventListener('change',event=>{
    const key=event.target.value,grid=root.querySelector('#maykop-squad-grid');
    [...grid.children].sort((a,b)=>Number(b.dataset[key])-Number(a.dataset[key])).forEach(card=>grid.append(card));
  });
}
