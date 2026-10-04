const sandyTrackerState={data:null,month:'all',sort:'appearances'};

const sbEsc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const sbNum=value=>Number(value)||0;
const sbDate=value=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
const sbMonth=value=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit'}).formatToParts(new Date(value));return `${parts.find(part=>part.type==='year')?.value}-${parts.find(part=>part.type==='month')?.value}`;};

function sandyBumsTrackerPreviewPage(){
  return `<section class="club-dashboard-preview sandy-dashboard-preview">
    <div class="club-preview-ribbon"><span>TEST REALM</span><strong>Permanent EA club tracker</strong><small>Live Sandy Bums archive · no production layout changes</small></div>
    <header class="club-dashboard-hero sandy-dashboard-hero">
      <div class="club-dashboard-identity"><img class="sandy-dashboard-crest" src="/assets/fc-sandy-bums.png" alt="FC Sandy Bums crest"><div><span class="section-kicker">FC27 · HOUSE CLUB</span><h1>FC Sandy Bums</h1><div class="club-dashboard-badges"><b>EA club 43521</b><b>Common Gen 5</b><b id="sandy-link-status">Archive connecting</b></div></div></div>
      <div class="club-dashboard-record" id="sandy-record"><div><strong>—</strong><span>Wins</span></div><div><strong>—</strong><span>Draws</span></div><div><strong>—</strong><span>Losses</span></div></div>
      <div class="club-dashboard-form"><span>Recent form</span><div id="sandy-form"><b>…</b></div><small id="sandy-form-copy">Loading saved results…</small></div>
    </header>
    <nav class="club-dashboard-tabs" role="tablist" aria-label="FC Sandy Bums tracker sections">
      ${[['overview','Overview'],['squad','Players'],['matches','Matches'],['analytics','Analytics'],['tracker','Tracker']].map(([id,label],index)=>`<button type="button" role="tab" aria-selected="${index===0}" aria-controls="sandy-panel-${id}" id="sandy-tab-${id}" data-sandy-tab="${id}">${label}</button>`).join('')}
    </nav>
    <div class="club-dashboard-panels">
      ${['overview','squad','matches','analytics','tracker'].map((id,index)=>`<section role="tabpanel" id="sandy-panel-${id}" aria-labelledby="sandy-tab-${id}" data-sandy-panel="${id}" ${index?'hidden':''}><div class="sandy-loading">Loading permanent club history…</div></section>`).join('')}
    </div>
    <footer class="club-dashboard-foot"><span>Test route</span><code>/test/sandy-bums</code><p>Powered by the existing UFB match archive. The public club page is unchanged.</p></footer>
  </section>`;
}

function sbTotals(matches){
  const totals={wins:0,draws:0,losses:0,gf:0,ga:0,cleanSheets:0};
  matches.forEach(match=>{const gf=sbNum(match.goals_for),ga=sbNum(match.goals_against);totals.gf+=gf;totals.ga+=ga;if(gf>ga)totals.wins++;else if(gf===ga)totals.draws++;else totals.losses++;if(ga===0)totals.cleanSheets++;});
  return totals;
}

function sbResult(match){const gf=sbNum(match.goals_for),ga=sbNum(match.goals_against);return gf>ga?'W':gf===ga?'D':'L';}
function sbAverage(values){const valid=values.filter(value=>Number.isFinite(value));return valid.length?valid.reduce((sum,value)=>sum+value,0)/valid.length:0;}
function sbFraction(value){const match=String(value||'').match(/(\d+)\s*\/\s*(\d+)/);return match?[Number(match[1]),Number(match[2])]:[0,0];}

function sbTeamStats(club){
  const players=club?.players||[];
  const sum=index=>players.reduce((total,player)=>total+sbNum(player.stats?.[index]),0);
  const fractions=index=>players.reduce((total,player)=>{const [made,attempted]=sbFraction(player.stats?.[index]);return [total[0]+made,total[1]+attempted];},[0,0]);
  const passes=fractions(9),tackles=fractions(10),ratings=players.map(player=>Number(player.stats?.[1])).filter(value=>Number.isFinite(value)&&value!==3);
  return {goals:sum(2),shots:sum(3),assists:sum(4),passes:passes[1],passPct:passes[1]?Math.round(passes[0]/passes[1]*100):0,tackles:tackles[1],tacklePct:tackles[1]?Math.round(tackles[0]/tackles[1]*100):0,interceptions:sum(11),saves:sum(13),rating:sbAverage(ratings)};
}

function sbStatBar(label,left,right,suffix=''){
  const max=Math.max(Number(left)||0,Number(right)||0,1);
  return `<div class="match-stat-line"><div><strong>${left}${suffix}</strong><span>${label}</span><strong>${right}${suffix}</strong></div><div class="match-stat-tracks"><i style="width:${Math.round((Number(left)||0)/max*100)}%"></i><i style="width:${Math.round((Number(right)||0)/max*100)}%"></i></div></div>`;
}

function sbMatchDetails(match){
  if(!match.details)return '<div class="sandy-match-loading">Open result to load the complete archived report…</div>';
  const clubs=match.details.clubs||[],home=clubs.find(club=>String(club.id)==='43521')||clubs[0],away=clubs.find(club=>club!==home)||clubs[1];
  if(!home||!away)return '<p class="match-prototype-note">No detailed EA report was stored for this result.</p>';
  const left=sbTeamStats(home),right=sbTeamStats(away);
  const rows=[['Goals',home.score,away.score,''],['Shots',left.shots,right.shots,''],['Passes',left.passes,right.passes,''],['Pass accuracy',left.passPct,right.passPct,'%'],['Assists',left.assists,right.assists,''],['Tackles',left.tackles,right.tackles,''],['Tackle success',left.tacklePct,right.tacklePct,'%'],['Interceptions',left.interceptions,right.interceptions,''],['Saves',left.saves,right.saves,''],['Average rating',left.rating.toFixed(1),right.rating.toFixed(1),'']];
  return `<div class="club-match-details"><div class="match-detail-tabs" role="tablist" aria-label="${sbEsc(away.name)} match details"><button type="button" class="is-active" data-sandy-match-view="stats" aria-selected="true">Match stats</button><button type="button" data-sandy-match-view="players" aria-selected="false">Player stats</button></div>
    <section class="match-detail-panel" data-sandy-match-panel="stats"><div class="match-stat-sheet"><div class="match-stat-clubs"><strong>${sbEsc(home.name)}</strong><b>${home.score}–${away.score}</b><strong>${sbEsc(away.name)}</strong></div>${rows.map(row=>sbStatBar(...row)).join('')}</div></section>
    <section class="match-detail-panel" data-sandy-match-panel="players" hidden>${[home,away].map(club=>`<div class="sandy-team-sheet"><h3>${sbEsc(club.name)}</h3><div class="match-player-table-wrap"><table class="match-player-table"><thead><tr><th>Player</th><th>Pos</th><th>Rating</th><th>G</th><th>A</th><th>Shots</th><th>Passes</th><th>Tackles</th><th>INT</th><th>Saves</th></tr></thead><tbody>${(club.players||[]).map(player=>`<tr><td>${player.motm?'★ ':''}${sbEsc(player.name)}</td><td>${sbEsc(player.stats?.[0]||'—')}</td><td><b>${sbEsc(player.stats?.[1]||'—')}</b></td><td>${sbEsc(player.stats?.[2]||'—')}</td><td>${sbEsc(player.stats?.[4]||'—')}</td><td>${sbEsc(player.stats?.[3]||'—')}</td><td>${sbEsc(player.stats?.[9]||'—')}</td><td>${sbEsc(player.stats?.[10]||'—')}</td><td>${sbEsc(player.stats?.[11]||'—')}</td><td>${sbEsc(player.stats?.[13]||'—')}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</section></div>`;
}

function sbMatchCard(match){
  const result=sbResult(match);
  return `<details class="club-match-card sandy-match-card" data-match-id="${sbEsc(match.match_id)}"><summary class="club-match-row"><b class="club-form-${result.toLowerCase()}">${result}</b><div><small>${sbDate(match.played_at)} · Archived</small><strong>FC Sandy Bums <em>${sbNum(match.goals_for)}–${sbNum(match.goals_against)}</em> ${sbEsc(match.opponent_name)}</strong><span>EA match ${sbEsc(match.match_id)}</span></div><span class="club-match-action">Full stats</span></summary><div class="sandy-match-report">${sbMatchDetails(match)}</div></details>`;
}

function sbPlayerCards(players){
  return players.map(player=>`<article class="club-squad-card" data-appearances="${sbNum(player.appearances)}" data-goals="${sbNum(player.goals)}" data-assists="${sbNum(player.assists)}" data-rating="${sbNum(player.average_rating)}"><div class="club-player-top"><b>EA</b><span>${player.average_rating==null?'—':Number(player.average_rating).toFixed(2)}</span></div><h3>${sbEsc(player.latest_name)}</h3><div class="club-player-stats"><span><b>${sbNum(player.appearances)}</b> Apps</span><span><b>${sbNum(player.goals)}</b> Goals</span><span><b>${sbNum(player.assists)}</b> Assists</span><span><b>${(sbNum(player.goals)+sbNum(player.assists))}</b> G + A</span></div></article>`).join('');
}

function sbOverview(data,totals){
  const played=data.matches.length,winRate=played?Math.round(totals.wins/played*100):0;
  const leaders=[...data.players].sort((a,b)=>sbNum(b.goals)-sbNum(a.goals)).slice(0,5);
  return `<div class="club-metric-grid">${[['Archived matches',played,'Permanent history'],['Win rate',`${winRate}%`,`${totals.wins} wins`],['Goals',totals.gf,`${(totals.gf/Math.max(played,1)).toFixed(2)} per match`],['Conceded',totals.ga,`${(totals.ga/Math.max(played,1)).toFixed(2)} per match`],['Goal difference',`${totals.gf-totals.ga>=0?'+':''}${totals.gf-totals.ga}`,'All archived'],['Clean sheets',totals.cleanSheets,`${Math.round(totals.cleanSheets/Math.max(played,1)*100)}% of matches`]].map(([label,value,detail])=>`<article class="club-metric"><span>${label}</span><strong>${value}</strong><small>${detail}</small></article>`).join('')}</div><div class="club-dashboard-two-col"><article class="club-dashboard-card"><span class="section-kicker">Archive snapshot</span><h2>${played} matches saved</h2><div class="sandy-result-strip">${data.matches.map(match=>`<i class="club-form-${sbResult(match).toLowerCase()}" title="${sbEsc(match.opponent_name)}">${sbResult(match)}</i>`).join('')}</div><p>Results remain in the archive after they disappear from EA’s recent-match feed.</p></article><article class="club-dashboard-card"><span class="section-kicker">Goal leaders</span><h2>On the scoresheet</h2><ol class="club-leader-list">${leaders.map(player=>`<li><span>${sbEsc(player.latest_name)}</span><strong>${sbNum(player.goals)} goals</strong></li>`).join('')}</ol></article></div>`;
}

function sbSquad(data){
  return `<div class="club-panel-heading"><div><span class="section-kicker">Every recorded player</span><h2>${data.players.length} archived players</h2><p>Players remain in club history even after leaving the EA club.</p></div><label>Sort players<select id="sandy-player-sort"><option value="appearances">Appearances</option><option value="goals">Goals</option><option value="assists">Assists</option><option value="rating">Average rating</option></select></label></div><div class="club-squad-grid" id="sandy-squad-grid">${sbPlayerCards(data.players)}</div>`;
}

function sbMatches(data){
  return `<div class="club-panel-heading"><div><span class="section-kicker">Permanent EA result archive</span><h2>Every saved match</h2><p>Open a result for the same detailed stat fields used by the UFB match report.</p></div><label>Month<select id="sandy-month-filter"><option value="all">All recorded months</option>${data.months.map(month=>`<option value="${month}">${new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`))}</option>`).join('')}</select></label></div><p class="sandy-match-scroll-hint" id="sandy-match-scroll-hint" ${data.matches.length<=10?'hidden':''}>Latest 10 are in view · scroll for ${Math.max(0,data.matches.length-10)} older matches.</p><div class="club-match-list" id="sandy-match-list" aria-describedby="sandy-match-scroll-hint">${data.matches.map(sbMatchCard).join('')}</div>`;
}

function sbApplyMatchWindow(list){
  if(!list)return;
  const cards=[...list.querySelectorAll(':scope > .sandy-match-card')],scrollable=cards.length>10;
  list.classList.toggle('sandy-scroll-list',scrollable);
  if(!scrollable){list.style.removeProperty('--sandy-match-window');return;}
  requestAnimationFrame(()=>{
    const gap=parseFloat(getComputedStyle(list).rowGap)||0;
    const height=cards.slice(0,10).reduce((sum,card)=>sum+card.getBoundingClientRect().height,0)+(gap*9)+2;
    list.style.setProperty('--sandy-match-window',`${Math.ceil(height)}px`);
  });
}

function sbAnalytics(data,totals){
  const players=data.players;
  const leaders=key=>[...players].sort((a,b)=>sbNum(b[key])-sbNum(a[key])).slice(0,5);
  const recent=[...data.matches].reverse();
  const maxGoal=Math.max(...recent.flatMap(match=>[sbNum(match.goals_for),sbNum(match.goals_against)]),1);
  return `<div class="club-panel-heading"><div><span class="section-kicker">Archive-powered trends</span><h2>Sandy analytics</h2><p>Every number below is calculated from the saved UFB archive—not a ten-match tracker window.</p></div><span class="season-chip season-chip-live">${data.matches.length} matches</span></div><div class="analytics-grid">
    <article class="club-dashboard-card analytics-match-card"><span class="section-kicker">Match by match</span><h3>Scoring history</h3><div class="sandy-dual-chart">${recent.map(match=>`<div title="${sbEsc(match.opponent_name)} ${match.goals_for}–${match.goals_against}"><span><i style="height:${Math.max(4,sbNum(match.goals_for)/maxGoal*100)}%"></i><i style="height:${Math.max(4,sbNum(match.goals_against)/maxGoal*100)}%"></i></span><small>${sbResult(match)}</small></div>`).join('')}</div><div class="sandy-chart-legend"><span><i></i>Goals for</span><span><i></i>Goals against</span></div></article>
    <article class="club-dashboard-card analytics-rank-card"><span class="section-kicker">Permanent totals</span><h3>Goal leaders</h3><ol>${leaders('goals').map((player,index)=>`<li><b>${index+1}</b><span>${sbEsc(player.latest_name)}<small>${player.appearances} appearances</small></span><strong>${player.goals}</strong></li>`).join('')}</ol></article>
    <article class="club-dashboard-card analytics-rank-card"><span class="section-kicker">Permanent totals</span><h3>Assist leaders</h3><ol>${leaders('assists').map((player,index)=>`<li><b>${index+1}</b><span>${sbEsc(player.latest_name)}<small>${player.appearances} appearances</small></span><strong>${player.assists}</strong></li>`).join('')}</ol></article>
    <article class="club-dashboard-card analytics-pulse-card"><span class="section-kicker">Club pulse</span><h3>Archive rates</h3><div class="analytics-pulse-grid"><div><b>${Math.round(totals.wins/Math.max(data.matches.length,1)*100)}%</b><span>Win rate</span><small>${totals.wins} wins</small></div><div><b>${(totals.gf/Math.max(data.matches.length,1)).toFixed(2)}</b><span>Goals scored</span><small>per match</small></div><div><b>${(totals.ga/Math.max(data.matches.length,1)).toFixed(2)}</b><span>Goals conceded</span><small>per match</small></div><div><b>${Math.round(totals.cleanSheets/Math.max(data.matches.length,1)*100)}%</b><span>Clean sheets</span><small>${totals.cleanSheets} matches</small></div></div></article>
    <article class="club-dashboard-card analytics-compare-card"><div class="analytics-card-head"><div><span class="section-kicker">Archive careers</span><h3>Player comparison</h3></div><div class="analytics-compare-selects"><select id="sandy-compare-a" aria-label="First Sandy Bums player">${players.map((player,index)=>`<option value="${sbEsc(player.player_id)}" ${index===0?'selected':''}>${sbEsc(player.latest_name)}</option>`).join('')}</select><span>vs</span><select id="sandy-compare-b" aria-label="Second Sandy Bums player">${players.map((player,index)=>`<option value="${sbEsc(player.player_id)}" ${index===1?'selected':''}>${sbEsc(player.latest_name)}</option>`).join('')}</select></div></div><div id="sandy-player-comparison"></div></article>
  </div>`;
}

function sbTracker(data){
  return `<div class="club-panel-heading"><div><span class="section-kicker">UFB permanent archive</span><h2>Tracker status</h2><p>The archive already saves Sandy Bums results beyond EA’s recent-match limit.</p></div><span class="season-chip season-chip-live">Active archive</span></div><div class="sandy-tracker-grid"><article><span>Saved matches</span><strong>${data.matches.length}</strong><small>Across ${data.months.length} recorded months</small></article><article><span>Saved players</span><strong>${data.players.length}</strong><small>Kept after leaving the club</small></article><article><span>Last successful check</span><strong>${data.lastSyncedAt?sbDate(data.lastSyncedAt):'Pending'}</strong><small>${data.syncDelayed?'EA feed currently delayed':'Archive healthy'}</small></article></div><article class="club-dashboard-card sandy-tracker-explainer"><div class="archive-flow"><b>EA club 43521</b><i>scheduled check</i><b>UFB Worker</b><i>match-ID dedupe</i><b>Permanent D1 archive</b><i>private feed</i><b>Test dashboard</b></div><h3>How the permanent tracker works</h3><p>Each result is identified by the EA club ID and match ID. Repeated checks update the same record instead of creating duplicates. Match totals, player identities and per-match player stats are stored separately, so season analytics can grow without losing older results.</p><p><strong>20-minute rollout target:</strong> the general league tracker will use this same archive pattern on a 20-minute cadence. Sandy’s existing production collector remains unchanged while this page is tested.</p></article>`;
}

function sbBindMatchInteractions(root){
  root.querySelectorAll('.sandy-match-card').forEach(card=>{
    card.addEventListener('toggle',async()=>{
      if(!card.open||card.dataset.loaded||card.dataset.loading)return;
      const report=card.querySelector('.sandy-match-report');
      if(report.querySelector('.club-match-details')){card.dataset.loaded='true';bindSandyMatchTabs(card);return;}
      card.dataset.loading='true';
      try{const response=await fetch(`/api/house-clubs/fc-sandy-bums?match=${encodeURIComponent(card.dataset.matchId)}&details=2`);if(!response.ok)throw new Error();const payload=await response.json();const match=payload.matches?.find(item=>String(item.match_id)===card.dataset.matchId);if(!match?.details)throw new Error();report.innerHTML=sbMatchDetails(match);card.dataset.loaded='true';bindSandyMatchTabs(card);}catch{report.innerHTML='<p class="match-prototype-note">This saved result does not have a complete player report yet.</p>';}finally{delete card.dataset.loading;}
    });
    if(card.querySelector('.club-match-details')){card.dataset.loaded='true';bindSandyMatchTabs(card);}
  });
}

function bindSandyMatchTabs(card){
  card.querySelectorAll('[data-sandy-match-view]').forEach(button=>button.addEventListener('click',()=>{const view=button.dataset.sandyMatchView;card.querySelectorAll('[data-sandy-match-view]').forEach(item=>{const active=item===button;item.classList.toggle('is-active',active);item.setAttribute('aria-selected',String(active));});card.querySelectorAll('[data-sandy-match-panel]').forEach(panel=>{panel.hidden=panel.dataset.sandyMatchPanel!==view;});}));
}

function sbRenderComparison(root){
  const data=sandyTrackerState.data;if(!data)return;
  const player=id=>data.players.find(item=>String(item.player_id)===id);
  const a=player(root.querySelector('#sandy-compare-a')?.value),b=player(root.querySelector('#sandy-compare-b')?.value);if(!a||!b)return;
  const row=(label,key,format=value=>value)=>`<div><strong>${format(a[key])}</strong><span>${label}</span><strong>${format(b[key])}</strong></div>`;
  root.querySelector('#sandy-player-comparison').innerHTML=`<div class="compare-names"><b>${sbEsc(a.latest_name)}</b><b>${sbEsc(b.latest_name)}</b></div><div class="compare-rows">${row('Average rating','average_rating',value=>value==null?'—':Number(value).toFixed(2))}${row('Appearances','appearances')}${row('Goals','goals')}${row('Assists','assists')}<div><strong>${sbNum(a.goals)+sbNum(a.assists)}</strong><span>G + A</span><strong>${sbNum(b.goals)+sbNum(b.assists)}</strong></div></div>`;
}

async function hydrateSandyTrackerPreview(){
  const root=document.querySelector('.sandy-dashboard-preview');if(!root)return;
  try{
    const response=await fetch('/api/house-clubs/fc-sandy-bums?month=all&details=2');if(!response.ok)throw new Error('Archive unavailable');
    const data=await response.json();sandyTrackerState.data=data;const totals=sbTotals(data.matches);
    root.querySelector('#sandy-link-status').textContent=data.syncDelayed?'Archive delayed':'Permanent archive active';
    root.querySelector('#sandy-record').innerHTML=`<div><strong>${totals.wins}</strong><span>Wins</span></div><div><strong>${totals.draws}</strong><span>Draws</span></div><div><strong>${totals.losses}</strong><span>Losses</span></div>`;
    const recent=data.matches.slice(0,8),recentTotals=sbTotals(recent);root.querySelector('#sandy-form').innerHTML=recent.map(match=>`<b class="club-form-${sbResult(match).toLowerCase()}">${sbResult(match)}</b>`).join('');root.querySelector('#sandy-form-copy').textContent=`Last ${recent.length} · ${recentTotals.wins}W · ${recentTotals.draws}D · ${recentTotals.losses}L`;
    root.querySelector('[data-sandy-panel="overview"]').innerHTML=sbOverview(data,totals);
    root.querySelector('[data-sandy-panel="squad"]').innerHTML=sbSquad(data);
    root.querySelector('[data-sandy-panel="matches"]').innerHTML=sbMatches(data);
    root.querySelector('[data-sandy-panel="analytics"]').innerHTML=sbAnalytics(data,totals);
    root.querySelector('[data-sandy-panel="tracker"]').innerHTML=sbTracker(data);
    root.querySelector('#sandy-player-sort')?.addEventListener('change',event=>{const grid=root.querySelector('#sandy-squad-grid'),key=event.target.value;[...grid.children].sort((a,b)=>Number(b.dataset[key])-Number(a.dataset[key])).forEach(card=>grid.append(card));});
    root.querySelector('#sandy-month-filter')?.addEventListener('change',event=>{const month=event.target.value,list=root.querySelector('#sandy-match-list'),hint=root.querySelector('#sandy-match-scroll-hint');const matches=month==='all'?data.matches:data.matches.filter(match=>sbMonth(match.played_at)===month);list.innerHTML=matches.map(sbMatchCard).join('')||'<p>No archived matches in this month.</p>';hint.hidden=matches.length<=10;hint.textContent=`Latest 10 are in view · scroll for ${Math.max(0,matches.length-10)} older matches.`;sbBindMatchInteractions(root);sbApplyMatchWindow(list);});
    root.querySelector('#sandy-compare-a')?.addEventListener('change',()=>sbRenderComparison(root));root.querySelector('#sandy-compare-b')?.addEventListener('change',()=>sbRenderComparison(root));sbRenderComparison(root);sbBindMatchInteractions(root);sbApplyMatchWindow(root.querySelector('#sandy-match-list'));
  }catch{
    root.querySelector('#sandy-link-status').textContent='Archive temporarily unavailable';root.querySelectorAll('.sandy-loading').forEach(panel=>panel.innerHTML='<p>The permanent archive could not be reached. Saved matches are safe; reload this test page to try again.</p>');
  }
}

function bindSandyTrackerPreview(){
  const root=document.querySelector('.sandy-dashboard-preview');if(!root)return;
  root.querySelectorAll('[data-sandy-tab]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.sandyTab;root.querySelectorAll('[data-sandy-tab]').forEach(item=>{const active=item===button;item.setAttribute('aria-selected',String(active));});root.querySelectorAll('[data-sandy-panel]').forEach(panel=>{panel.hidden=panel.dataset.sandyPanel!==id;});}));
  hydrateSandyTrackerPreview();
}
