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
  return `<div class="club-panel-heading"><div><span class="section-kicker">Private team room</span><h2>Maykop analytics</h2><p>Advanced competitive analysis is available only to UFL owners and admins, this club’s managers, and players registered to this club.</p></div><span class="season-chip">Discord protected</span></div>
    <div id="maykop-private-analytics" class="analytics-private-gate" aria-live="polite">
      <div class="analytics-lock-mark" aria-hidden="true">UFL</div><span class="section-kicker">Team access required</span><h3>Analytics stay inside the clubhouse.</h3><p>Sign in with Discord. The site will verify your current UFB roster or manager assignment before any analytics are returned.</p><a class="button button-primary" href="/api/auth/discord">Sign in with Discord →</a><small>FC Sandy Bums and FC Mountains remain public and keep their existing fun analytics.</small>
    </div>`;
}

function renderMaykopPrivateAnalytics(data,role) {
  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const metricEntries=Object.entries(data.matchByMatch.metrics),initialKey=metricEntries[0][0],initial=metricEntries[0][1];
  const rankRows=data.formIndex.map(row=>`<li><b>${row.rank}</b><span>${esc(row.name)}<small>${row.goals}G · ${row.assists}A · ${row.rating}★ · ${esc(row.streak)}</small></span><i class="form-movement ${row.movement>0?'is-up':row.movement<0?'is-down':''}">${row.movement>0?'↑'+row.movement:row.movement<0?'↓'+Math.abs(row.movement):'—'}</i><strong>${row.score}</strong></li>`).join('');
  const passingRows=data.passing.accuracy.map((row,index)=>`<div class="passing-row"><b>${index+1}</b><span>${esc(row[0])}<small>${esc(row[1])} · ${esc(row[3])}</small></span><i><u style="width:${row[2]}%"></u></i><strong>${row[2]}%</strong></div>`).join('');
  const volumeRows=data.passing.volume.map((row,index)=>`<div class="passing-row"><b>${index+1}</b><span>${esc(row[0])}<small>${esc(row[1])} · ${row[3]} total</small></span><i><u style="width:${Math.round(row[2]/data.passing.volume[0][2]*100)}%"></u></i><strong>${row[2]}</strong></div>`).join('');
  const film=data.filmRoom[0];
  const comparisons=data.comparison;
  return `<div class="analytics-access-banner"><span>Verified access</span><strong>${esc(role==='owner'?'UFL owner':role==='admin'?'UFL admin':role==='manager'?'Maykop manager':'Maykop player')}</strong><small>Private team analytics · not returned to public visitors</small></div>
    <div class="analytics-grid analytics-private-grid">
      <article class="club-dashboard-card analytics-match-card"><div class="analytics-card-head"><div><span class="section-kicker">Match by match</span><h3>Player trends</h3></div><div class="analytics-metric-buttons" role="group" aria-label="Select match metric">${metricEntries.map(([key,value],index)=>`<button type="button" data-private-metric="${key}" class="${index===0?'is-active':''}">${esc(value.label)}</button>`).join('')}</div></div><div class="analytics-player-pills">${data.matchByMatch.players.map((name,index)=>`<button type="button" class="${index===0?'is-active':''}">${esc(name)}</button>`).join('')}</div><div class="analytics-chart analytics-wide-chart" id="maykop-private-match-chart">${maykopBars(initial.series,{max:initialKey==='passing'?100:10,suffix:initial.suffix,decimals:initialKey==='rating'?1:0})}</div><p id="maykop-private-match-caption">${esc(initial.label)} across the latest ${data.window} archived matches.</p></article>
      <article class="club-dashboard-card analytics-rank-card analytics-form-index"><span class="section-kicker">Last five matches</span><h3>Squad form index</h3><ol>${rankRows}</ol><p class="analytics-method-note">A UFL score blending recent rating, production, results, and availability. It is a form guide—not a permanent player grade.</p></article>
      <article class="club-dashboard-card analytics-defending-card"><span class="section-kicker">Defending</span><h3>Back-line report</h3><div class="analytics-pulse-grid"><div><b>${data.defending.cleanSheets}</b><span>Clean sheets</span><small>${data.defending.cleanSheetRate}%</small></div><div><b>${data.defending.concededPerGame}</b><span>Conceded</span><small>per game</small></div><div><b>${data.defending.totalConceded}</b><span>Total conceded</span><small>${data.window} matches</small></div><div><b>${data.defending.pairing.cleanSheetRate}%</b><span>Best pairing</span><small>${esc(data.defending.pairing.players.join(' + '))}</small></div></div><div class="defending-strip">${data.defending.concededSeries.map(value=>`<span class="${value===0?'is-clean':value>1?'is-danger':''}"><b>${value}</b><small>${value===0?'CS':'GC'}</small></span>`).join('')}</div><div class="defending-pair"><span>Back-line pairing</span><strong>${esc(data.defending.pairing.players.join(' + '))}</strong><small>${data.defending.pairing.concededPerGame} conceded/game · ${data.defending.pairing.together} together</small></div></article>
      <article class="club-dashboard-card analytics-film-card"><div class="analytics-card-head"><div><span class="section-kicker">Film room</span><h3>Player development notes</h3></div><strong class="film-grade">${esc(film.grade)}</strong></div><h4>${esc(film.name)} <small>${esc(film.position)} · ${film.games} matches</small></h4><div class="film-focus"><b>Next focus · ${esc(film.focus[0])}</b><span>${esc(film.focus[1])}</span><p>${esc(film.focus[2])}</p></div><div class="film-strengths">${film.strengths.map(item=>`<div><b>${esc(item[0])}</b><strong>${esc(item[1])}</strong><p>${esc(item[2])}</p></div>`).join('')}</div></article>
      <article class="club-dashboard-card analytics-passing-card"><span class="section-kicker">Passing insights</span><h3>Accuracy and volume</h3><h4>Pass accuracy rankings</h4><div class="passing-list">${passingRows}</div><h4>Volume passers <small>per game</small></h4><div class="passing-list is-volume">${volumeRows}</div></article>
      <article class="club-dashboard-card analytics-compare-card"><div class="analytics-card-head"><div><span class="section-kicker">Head to head</span><h3>Player comparison</h3></div><div class="analytics-compare-selects"><select id="maykop-private-compare-a" aria-label="First player">${comparisons.map((player,index)=>`<option ${index===0?'selected':''}>${esc(player.name)}</option>`).join('')}</select><span>vs</span><select id="maykop-private-compare-b" aria-label="Second player">${comparisons.map((player,index)=>`<option ${index===1?'selected':''}>${esc(player.name)}</option>`).join('')}</select></div></div><div id="maykop-private-comparison"></div></article>
      <article class="club-dashboard-card analytics-archive-card"><span class="section-kicker">Permanent match history</span><h3>Built beyond the recent 10</h3><div class="archive-flow"><b>EA results</b><i>20 min</i><b>UFB archive</b><i>dedupe</i><b>Club page</b></div><p>Each linked club can be checked every 20 minutes. Match, team and player rows are stored once by EA match ID, so older results remain available as the season grows.</p><small>House-team trackers remain separate and unchanged.</small></article>
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
  let privateAnalyticsLoaded=false;
  const loadPrivateAnalytics=async()=>{
    if(privateAnalyticsLoaded)return;
    privateAnalyticsLoaded=true;
    const gate=root.querySelector('#maykop-private-analytics');
    gate?.classList.add('is-checking');
    try{
      const response=await fetch('/api/club-analytics/374656',{headers:{accept:'application/json'}});
      const payload=await response.json();
      if(!response.ok)throw Object.assign(new Error(payload.error||'Private analytics are unavailable.'),{status:response.status,code:payload.code});
      gate.innerHTML=renderMaykopPrivateAnalytics(payload.analytics,payload.access?.role);
      gate.className='analytics-private-content';
      bindPrivateAnalytics(gate,payload.analytics);
    }catch(error){
      privateAnalyticsLoaded=false;
      if(!gate)return;
      gate.classList.remove('is-checking');
      const signedOut=error.status===401||error.code==='signin_required';
      gate.querySelector('h3').textContent=signedOut?'Sign in to open the team room.':error.status===403?'This room belongs to UFL Maykop.':'Access check unavailable.';
      gate.querySelector('p').textContent=error.message;
      const link=gate.querySelector('a');
      if(link)link.hidden=!signedOut;
    }
  };
  const activate=id=>{
    root.querySelectorAll('[data-club-dashboard-tab]').forEach(button=>{const active=button.dataset.clubDashboardTab===id;button.setAttribute('aria-selected',String(active));});
    root.querySelectorAll('[data-club-dashboard-panel]').forEach(panel=>{panel.hidden=panel.dataset.clubDashboardPanel!==id;});
    if(id==='analytics')loadPrivateAnalytics();
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

function bindPrivateAnalytics(root,data){
  root.querySelectorAll('[data-private-metric]').forEach(button=>button.addEventListener('click',()=>{
    const metric=data.matchByMatch.metrics[button.dataset.privateMetric];
    root.querySelectorAll('[data-private-metric]').forEach(item=>item.classList.toggle('is-active',item===button));
    root.querySelector('#maykop-private-match-chart').innerHTML=maykopBars(metric.series,{max:button.dataset.privateMetric==='passing'?100:10,suffix:metric.suffix,decimals:button.dataset.privateMetric==='rating'?1:0});
    root.querySelector('#maykop-private-match-caption').textContent=`${metric.label} across the latest ${data.window} archived matches.`;
  }));
  const renderComparison=()=>{
    const find=name=>data.comparison.find(player=>player.name===name);
    const a=find(root.querySelector('#maykop-private-compare-a').value),b=find(root.querySelector('#maykop-private-compare-b').value);
    const row=(label,key,suffix='')=>`<div><strong>${a[key]}${suffix}</strong><span>${label}</span><strong>${b[key]}${suffix}</strong></div>`;
    root.querySelector('#maykop-private-comparison').innerHTML=`<div class="compare-names"><b>${a.name}</b><b>${b.name}</b></div><div class="compare-rows">${row('Position','position')}${row('Rating','rating')}${row('Appearances','games')}${row('Goals','goals')}${row('Assists','assists')}${row('Pass accuracy','pass','%')}${row('Tackles','tackles')}</div>`;
  };
  root.querySelector('#maykop-private-compare-a').addEventListener('change',renderComparison);
  root.querySelector('#maykop-private-compare-b').addEventListener('change',renderComparison);
  renderComparison();
}
