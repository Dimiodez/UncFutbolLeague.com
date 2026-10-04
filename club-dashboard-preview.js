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
  ],
  analytics: {
    ratingSeries: {
      'Schwein':[7.4,8.1,7.8,8.4,8.0,9.3,7.9,8.2,8.5,8.1],
      'D. Dezhimoviç':[7.1,7.6,7.2,8.0,7.8,8.1,7.3,7.9,7.7,7.5],
      'B. Papi':[7.6,8.0,8.2,7.8,8.4,8.1,7.9,8.3,7.7,8.0],
      'f. last':[7.0,7.4,7.8,7.6,7.2,8.0,7.5,7.7,7.3,7.5]
    },
    matchMetrics: {
      rating:[7.1,7.4,7.8,7.6,7.9,7.7,7.2,8.1,7.8,7.6],
      tackles:[5,8,7,9,6,7,10,5,8,7],
      passing:[77,81,84,80,83,85,78,86,82,84],
      contributions:[0,1,2,1,3,2,0,3,2,1]
    }
  }
};

function maykopCrest() {
  return `<div class="maykop-crest" role="img" aria-label="UFL Maykop crest"><span class="maykop-ball">◆</span><strong>UM</strong></div>`;
}

const maykopSamplePlayers = [
  {name:'Schweinslap',position:'CM',rating:9.3,goals:0,assists:0,shots:2,passes:36,tackles:4,motm:true},
  {name:'Odez',position:'ST',rating:8.1,goals:1,assists:0,shots:3,passes:24,tackles:2},
  {name:'IffyPopcorn3914',position:'ST',rating:7.9,goals:1,assists:1,shots:2,passes:16,tackles:0},
  {name:'Empyre7737',position:'CB',rating:7.2,goals:0,assists:0,shots:0,passes:14,tackles:1},
  {name:'aaaa111aaaaa',position:'ST',rating:6.7,goals:0,assists:0,shots:3,passes:14,tackles:0},
  {name:'Bruceybistro',position:'CM',rating:6.3,goals:0,assists:0,shots:0,passes:12,tackles:0}
];

function maykopStatBar(label,home,away,suffix='') {
  const max=Math.max(Number(home)||0,Number(away)||0,1);
  const homeWidth=Math.round((Number(home)||0)/max*100);
  const awayWidth=Math.round((Number(away)||0)/max*100);
  return `<div class="match-stat-line"><div><strong>${home}${suffix}</strong><span>${label}</span><strong>${away}${suffix}</strong></div><div class="match-stat-tracks"><i style="width:${homeWidth}%"></i><i style="width:${awayWidth}%"></i></div></div>`;
}

function maykopMatchDetails(match,index) {
  const isFeatured=match.opponent==='A2Touch';
  const [homeScore,awayScore]=match.score.split('–').map(Number);
  const stats=isFeatured
    ? [['Goals',2,0,''],['Shots',10,3,''],['Shot accuracy',20,0,'%'],['Passes',116,114,''],['Pass accuracy',85,79,'%'],['Assists',1,0,''],['Tackles',7,6,''],['Tackle success',35,23,'%'],['Saves',0,6,''],['Average rating',7.6,6.6,'']]
    : [['Goals',homeScore,awayScore,''],['Shots',Math.max(homeScore*3+2,4),Math.max(awayScore*3+2,3),''],['Pass accuracy',78+index%7,74+index%6,'%'],['Passes',102+index*4,96+index*3,''],['Tackles',5+index%6,4+(index*2)%7,''],['Average rating',(match.result==='W'?7.7:6.5),(match.result==='W'?6.6:7.6),'']];
  const players=isFeatured?maykopSamplePlayers:maykopSamplePlayers.slice(0,Math.min(match.players,6)).map((player,row)=>({...player,rating:Math.max(5.8,Number((player.rating-(index%3)*.2+row*.03).toFixed(1)))}));
  return `<div class="club-match-details">
    <div class="match-detail-tabs" role="tablist" aria-label="${match.opponent} match details">
      <button type="button" class="is-active" data-match-view="stats" aria-selected="true">Match stats</button>
      <button type="button" data-match-view="players" aria-selected="false">Player stats</button>
    </div>
    <section data-match-panel="stats" class="match-detail-panel"><div class="match-stat-sheet"><div class="match-stat-clubs"><strong>UFL Maykop</strong><b>${match.score}</b><strong>${match.opponent}</strong></div>${stats.map(row=>maykopStatBar(...row)).join('')}</div></section>
    <section data-match-panel="players" class="match-detail-panel" hidden>
      <div class="match-player-callout"><span>UNC player of the match</span><strong>${players.find(player=>player.motm)?.name||players[0].name}</strong><b>${players.find(player=>player.motm)?.rating||players[0].rating}</b></div>
      <div class="match-player-table-wrap"><table class="match-player-table"><thead><tr><th>Player</th><th>Pos</th><th>Rating</th><th>G</th><th>A</th><th>Shots</th><th>Passes</th><th>Tackles</th></tr></thead><tbody>${players.map(player=>`<tr><td>${player.motm?'★ ':''}${player.name}</td><td>${player.position}</td><td><b>${player.rating}</b></td><td>${player.goals||'—'}</td><td>${player.assists||'—'}</td><td>${player.shots||'—'}</td><td>${player.passes||'—'}</td><td>${player.tackles||'—'}</td></tr>`).join('')}</tbody></table></div>
    </section>
    ${isFeatured?'':`<p class="match-prototype-note">Interaction preview. Exact match fields will come from the archived EA response when this club is connected.</p>`}
  </div>`;
}

function maykopMatchCard(match,index,clubName) {
  return `<details class="club-match-card"><summary class="club-match-row"><b class="club-form-${match.result.toLowerCase()}">${match.result}</b><div><small>${index<6?'Today':'Yesterday'} · League</small><strong>${clubName} <em>${match.score}</em> ${match.opponent}</strong><span>${match.players} Maykop players · ${match.note}</span></div><span class="club-match-action">Full stats</span></summary>${maykopMatchDetails(match,index)}</details>`;
}

function maykopBars(values,{suffix='',max=Math.max(...values),decimals=1}={}) {
  return values.map((value,index)=>`<div class="analytics-bar"><i style="height:${Math.max(10,Math.round(value/max*100))}%"></i><b>${Number(value).toFixed(decimals)}${suffix}</b><small>${index+1}</small></div>`).join('');
}

function maykopAnalyticsPanel() {
  const {players,analytics}=maykopDashboardData;
  const initial='Schwein';
  const series=analytics.ratingSeries[initial];
  return `<div class="club-panel-heading"><div><span class="section-kicker">Ten-match intelligence</span><h2>Maykop analytics</h2><p>UFL-built trends from archived EA match fields. The production version will grow past EA’s recent-match window.</p></div><span class="season-chip season-chip-live">Test data</span></div>
    <div class="analytics-grid">
      <article class="club-dashboard-card analytics-form-card"><div class="analytics-card-head"><div><span class="section-kicker">Player form</span><h3>Rating trend</h3></div><select id="maykop-form-player" aria-label="Select player for rating trend">${Object.keys(analytics.ratingSeries).map(name=>`<option ${name===initial?'selected':''}>${name}</option>`).join('')}</select></div><div class="analytics-chart" id="maykop-form-chart">${maykopBars(series,{max:10})}</div><div class="analytics-summary"><span>10-match average <strong id="maykop-form-average">${(series.reduce((a,b)=>a+b,0)/series.length).toFixed(1)}</strong></span><span>Latest <strong id="maykop-form-latest">${series.at(-1).toFixed(1)}</strong></span></div></article>
      <article class="club-dashboard-card analytics-rank-card"><span class="section-kicker">Current form</span><h3>Maykop power five</h3><ol>${[...players].sort((a,b)=>b.rating-a.rating).slice(0,5).map((player,index)=>`<li><b>${index+1}</b><span>${player.name}<small>${player.games} appearances</small></span><strong>${player.rating}</strong></li>`).join('')}</ol></article>
      <article class="club-dashboard-card analytics-match-card"><div class="analytics-card-head"><div><span class="section-kicker">Match by match</span><h3>Club performance</h3></div><div class="analytics-metric-buttons" role="group" aria-label="Select match metric">${[['rating','Rating'],['tackles','Tackles'],['passing','Pass %'],['contributions','G + A']].map(([key,label],index)=>`<button type="button" data-analytics-metric="${key}" class="${index===0?'is-active':''}">${label}</button>`).join('')}</div></div><div class="analytics-chart analytics-wide-chart" id="maykop-match-chart">${maykopBars(analytics.matchMetrics.rating,{max:10})}</div><p id="maykop-match-caption">Average team rating across the latest ten archived results.</p></article>
      <article class="club-dashboard-card analytics-pulse-card"><span class="section-kicker">Club pulse</span><h3>What the numbers say</h3><div class="analytics-pulse-grid"><div><b>50%</b><span>Clean-sheet rate</span><small>5 in the latest 10</small></div><div><b>1.3</b><span>Goals conceded</span><small>per match</small></div><div><b>85%</b><span>Pass leader</span><small>B. Papi</small></div><div><b>+12</b><span>Goal difference</span><small>latest 10</small></div></div></article>
      <article class="club-dashboard-card analytics-compare-card"><div class="analytics-card-head"><div><span class="section-kicker">Side by side</span><h3>Player comparison</h3></div><div class="analytics-compare-selects"><select id="maykop-compare-a" aria-label="First player">${players.map((player,index)=>`<option ${index===1?'selected':''}>${player.name}</option>`).join('')}</select><span>vs</span><select id="maykop-compare-b" aria-label="Second player">${players.map((player,index)=>`<option ${index===2?'selected':''}>${player.name}</option>`).join('')}</select></div></div><div id="maykop-player-comparison"></div></article>
      <article class="club-dashboard-card analytics-archive-card"><span class="section-kicker">Permanent match history</span><h3>Built beyond the recent 10</h3><div class="archive-flow"><b>EA results</b><i>20 min</i><b>UFB archive</b><i>dedupe</i><b>Club page</b></div><p>Each linked club will be checked every 20 minutes. Match, team and player rows are stored once by EA match ID, so older results remain available as the season grows.</p><small>Architecture ready in this test branch · polling is not enabled for Maykop yet.</small></article>
    </div>`;
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
      ${[['overview','Overview'],['squad','Squad'],['matches','Matches'],['analytics','Analytics'],['honors','UNC Honors']].map(([id,label],index)=>`<button type="button" role="tab" aria-selected="${index===0}" aria-controls="club-panel-${id}" id="club-tab-${id}" data-club-dashboard-tab="${id}">${label}</button>`).join('')}
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
        <div class="club-panel-heading"><div><span class="section-kicker">EA result archive</span><h2>All matches</h2><p>Open any result for team and player stats. Formations are intentionally excluded.</p></div><span class="season-chip season-chip-live">20-minute archive plan</span></div>
        <div class="club-match-list">${matches.map((match,index)=>maykopMatchCard(match,index,club.name)).join('')}</div>
        <p class="club-data-note"><strong>Test scope:</strong> the ten source matches are shown here now. When connected, the UFB archive will keep every new match instead of replacing history when EA’s recent-match window moves on.</p>
      </section>
      <section role="tabpanel" id="club-panel-analytics" aria-labelledby="club-tab-analytics" data-club-dashboard-panel="analytics" hidden>${maykopAnalyticsPanel()}</section>
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
  root.querySelectorAll('.club-match-card').forEach(card=>{
    card.querySelectorAll('[data-match-view]').forEach(button=>button.addEventListener('click',()=>{
      const view=button.dataset.matchView;
      card.querySelectorAll('[data-match-view]').forEach(item=>{const active=item.dataset.matchView===view;item.classList.toggle('is-active',active);item.setAttribute('aria-selected',String(active));});
      card.querySelectorAll('[data-match-panel]').forEach(panel=>{panel.hidden=panel.dataset.matchPanel!==view;});
    }));
  });
  const renderForm=name=>{
    const series=maykopDashboardData.analytics.ratingSeries[name];
    root.querySelector('#maykop-form-chart').innerHTML=maykopBars(series,{max:10});
    root.querySelector('#maykop-form-average').textContent=(series.reduce((a,b)=>a+b,0)/series.length).toFixed(1);
    root.querySelector('#maykop-form-latest').textContent=series.at(-1).toFixed(1);
  };
  root.querySelector('#maykop-form-player')?.addEventListener('change',event=>renderForm(event.target.value));
  const metricConfig={rating:{max:10,decimals:1,copy:'Average team rating across the latest ten archived results.'},tackles:{max:12,decimals:0,copy:'Successful tackles recorded in each of the latest ten matches.'},passing:{max:100,decimals:0,suffix:'%',copy:'Team pass completion across the latest ten matches.'},contributions:{max:5,decimals:0,copy:'Goals plus assists credited to Maykop players in each result.'}};
  root.querySelectorAll('[data-analytics-metric]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.analyticsMetric,config=metricConfig[key];
    root.querySelectorAll('[data-analytics-metric]').forEach(item=>item.classList.toggle('is-active',item===button));
    root.querySelector('#maykop-match-chart').innerHTML=maykopBars(maykopDashboardData.analytics.matchMetrics[key],config);
    root.querySelector('#maykop-match-caption').textContent=config.copy;
  }));
  const renderComparison=()=>{
    const find=name=>maykopDashboardData.players.find(player=>player.name===name);
    const a=find(root.querySelector('#maykop-compare-a').value),b=find(root.querySelector('#maykop-compare-b').value);
    const row=(label,key,suffix='')=>`<div><strong>${a[key]}${suffix}</strong><span>${label}</span><strong>${b[key]}${suffix}</strong></div>`;
    root.querySelector('#maykop-player-comparison').innerHTML=`<div class="compare-names"><b>${a.name}</b><b>${b.name}</b></div><div class="compare-rows">${row('Rating','rating')}${row('Appearances','games')}${row('Goals','goals')}${row('Assists','assists')}${row('MOTM','motm')}${row('Pass accuracy','pass','%')}${row('Win rate','winRate','%')}</div>`;
  };
  root.querySelector('#maykop-compare-a')?.addEventListener('change',renderComparison);
  root.querySelector('#maykop-compare-b')?.addEventListener('change',renderComparison);
  if(root.querySelector('#maykop-player-comparison'))renderComparison();
}
