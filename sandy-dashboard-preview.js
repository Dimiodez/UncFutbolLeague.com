const houseTrackerClubs={
  'fc-sandy-bums':{slug:'fc-sandy-bums',name:'FC Sandy Bums',shortName:'Sandy Bums',analyticsName:'Sandy',clubId:'43521',crest:'/assets/fc-sandy-bums.png'},
  'fc-mountains':{slug:'fc-mountains',name:'FC Mountains',shortName:'Mountains',analyticsName:'Mountains',clubId:'96510',crest:'/assets/fc-mountains.png'}
};
const sandyTrackerState={data:null,club:houseTrackerClubs['fc-sandy-bums'],month:'all',sort:'appearances'};

const sbEsc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const sbNum=value=>Number(value)||0;
const sbDate=value=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
const sbMonth=value=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit'}).formatToParts(new Date(value));return `${parts.find(part=>part.type==='year')?.value}-${parts.find(part=>part.type==='month')?.value}`;};

function houseClubTrackerPage(slug){
  const club=houseTrackerClubs[slug]||houseTrackerClubs['fc-sandy-bums'];sandyTrackerState.club=club;sandyTrackerState.data=null;
  return `<section class="club-dashboard-preview sandy-dashboard-preview house-${club.slug}">
    <header class="club-dashboard-hero sandy-dashboard-hero">
      <div class="club-dashboard-identity"><img class="sandy-dashboard-crest" src="${club.crest}" alt="${club.name} crest"><div><span class="section-kicker">FC27 · HOUSE CLUB</span><h1>${club.name}</h1><div class="club-dashboard-badges"><b>EA club ${club.clubId}</b><b>Common Gen 5</b><b id="sandy-link-status">Stats connecting</b></div></div></div>
      <div class="club-dashboard-record" id="sandy-record"><div><strong>—</strong><span>Wins</span></div><div><strong>—</strong><span>Draws</span></div><div><strong>—</strong><span>Losses</span></div></div>
      <div class="club-dashboard-form"><span>Recent form</span><div id="sandy-form"><b>…</b></div><small id="sandy-form-copy">Loading saved results…</small></div>
    </header>
    <nav class="club-dashboard-tabs" role="tablist" aria-label="${club.name} sections">
      ${[['overview','Overview'],['squad','Players'],['matches','Matches'],['analytics','Analytics'],['partnerships','Partnerships'],['honors','Honors']].map(([id,label],index)=>`<button type="button" role="tab" aria-selected="${index===0}" aria-controls="sandy-panel-${id}" id="sandy-tab-${id}" data-sandy-tab="${id}">${label}</button>`).join('')}
    </nav>
    <div class="club-dashboard-panels">
      ${['overview','squad','matches','analytics','partnerships','honors'].map((id,index)=>`<section role="tabpanel" id="sandy-panel-${id}" aria-labelledby="sandy-tab-${id}" data-sandy-panel="${id}" ${index?'hidden':''}><div class="sandy-loading">Loading club history…</div></section>`).join('')}
    </div>
    <footer class="club-dashboard-foot"><span>UFL House Club</span><code>${club.name}</code><p>Results and player stats update from the club’s EA match history.</p></footer>
  </section>`;
}

function sandyBumsTrackerPreviewPage(){return houseClubTrackerPage('fc-sandy-bums');}

function sbTotals(matches){
  const totals={wins:0,draws:0,losses:0,gf:0,ga:0,cleanSheets:0};
  matches.forEach(match=>{const gf=sbNum(match.goals_for),ga=sbNum(match.goals_against);totals.gf+=gf;totals.ga+=ga;if(gf>ga)totals.wins++;else if(gf===ga)totals.draws++;else totals.losses++;if(ga===0)totals.cleanSheets++;});
  return totals;
}

function sbResult(match){const gf=sbNum(match.goals_for),ga=sbNum(match.goals_against);return gf>ga?'W':gf===ga?'D':'L';}
function sbAverage(values){const valid=values.filter(value=>Number.isFinite(value));return valid.length?valid.reduce((sum,value)=>sum+value,0)/valid.length:0;}
function sbFraction(value){const match=String(value||'').match(/(\d+)\s*\/\s*(\d+)/);return match?[Number(match[1]),Number(match[2])]:[0,0];}
function sbOwnClub(match){return (match.details?.clubs||[]).find(club=>String(club.id)===sandyTrackerState.club.clubId);}
function sbPlayerPosition(player){return String(player.stats?.[0]||'—').toUpperCase();}
function sbPlayerRating(player){const rating=Number(player.stats?.[1]);return Number.isFinite(rating)&&rating!==3?rating:null;}
function sbPlayerId(player){return String(player.id||player.name||'');}

function sbPairData(matches){
  const pairs=new Map();
  matches.forEach(match=>{
    const club=sbOwnClub(match);if(!club)return;
    const players=(club.players||[]).filter(player=>player.human!==false&&sbPlayerId(player));
    for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
      const ordered=[players[i],players[j]].sort((a,b)=>sbPlayerId(a).localeCompare(sbPlayerId(b))),key=ordered.map(sbPlayerId).join('|');
      const row=pairs.get(key)||{players:ordered.map(player=>({id:sbPlayerId(player),name:player.name||sbPlayerId(player)})),matches:0,wins:0,contributions:0,defensiveMatches:0,cleanSheets:0};
      row.players=ordered.map(player=>({id:sbPlayerId(player),name:player.name||sbPlayerId(player)}));row.matches++;if(sbResult(match)==='W')row.wins++;
      row.contributions+=ordered.reduce((sum,player)=>sum+sbNum(player.stats?.[2])+sbNum(player.stats?.[4]),0);
      if(ordered.every(player=>['DEF','GK'].includes(sbPlayerPosition(player)))){row.defensiveMatches++;if(sbNum(match.goals_against)===0)row.cleanSheets++;}
      pairs.set(key,row);
    }
  });
  const rows=[...pairs.values()].map(row=>({...row,winRate:Math.round(row.wins/Math.max(row.matches,1)*100),cleanSheetRate:Math.round(row.cleanSheets/Math.max(row.defensiveMatches,1)*100)}));
  const best=(eligible,sort)=>[...rows].filter(eligible).sort(sort)[0]||null;
  return {
    attack:best(row=>row.matches>=2,(a,b)=>b.contributions-a.contributions||b.matches-a.matches),
    defense:best(row=>row.defensiveMatches>=2,(a,b)=>b.cleanSheetRate-a.cleanSheetRate||b.defensiveMatches-a.defensiveMatches),
    winners:best(row=>row.matches>=3,(a,b)=>b.winRate-a.winRate||b.wins-a.wins||b.matches-a.matches),
    together:best(row=>row.matches>=1,(a,b)=>b.matches-a.matches||b.wins-a.wins)
  };
}

function sbHonorData(matches){
  const players=new Map();
  matches.forEach(match=>{
    const club=sbOwnClub(match);if(!club)return;
    (club.players||[]).filter(player=>player.human!==false&&sbPlayerId(player)).forEach(player=>{
      const id=sbPlayerId(player),row=players.get(id)||{id,name:player.name||id,apps:0,wins:0,goals:0,assists:0,motm:0,ratings:[],saves:0,interceptions:0,cleanSheets:0,positions:{}};
      const position=sbPlayerPosition(player),rating=sbPlayerRating(player);row.name=player.name||row.name;row.apps++;if(sbResult(match)==='W')row.wins++;row.goals+=sbNum(player.stats?.[2]);row.assists+=sbNum(player.stats?.[4]);row.motm+=player.motm?1:0;row.saves+=sbNum(player.stats?.[13]);row.interceptions+=sbNum(player.stats?.[11]);row.positions[position]=(row.positions[position]||0)+1;if(rating!==null)row.ratings.push(rating);if(sbNum(match.goals_against)===0&&['DEF','GK'].includes(position))row.cleanSheets++;players.set(id,row);
    });
  });
  const rows=[...players.values()].map(row=>({...row,rating:sbAverage(row.ratings),position:Object.entries(row.positions).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'}));
  const pick=(filter,sort)=>[...rows].filter(filter).sort(sort)[0]||null;
  return {
    sandiest:pick(row=>row.apps>0,(a,b)=>(b.rating*10+b.goals*4+b.assists*3+b.motm*3+b.wins*1.5)-(a.rating*10+a.goals*4+a.assists*3+a.motm*3+a.wins*1.5)||b.apps-a.apps),
    boot:pick(row=>row.apps>0,(a,b)=>b.goals-a.goals||b.assists-a.assists||b.rating-a.rating),
    assists:pick(row=>row.apps>0,(a,b)=>b.assists-a.assists||b.goals-a.goals||b.rating-a.rating),
    anchor:pick(row=>['DEF','GK'].includes(row.position),(a,b)=>b.rating-a.rating||b.cleanSheets-a.cleanSheets||b.interceptions-a.interceptions),
    gloves:pick(row=>row.position==='GK',(a,b)=>b.cleanSheets-a.cleanSheets||b.saves-a.saves||b.rating-a.rating),
    iron:pick(row=>row.apps>0,(a,b)=>b.apps-a.apps||b.rating-a.rating)
  };
}

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
  if(!match.details)return '<div class="sandy-match-loading">Open result to load the complete match report…</div>';
  const clubs=match.details.clubs||[],home=clubs.find(club=>String(club.id)===sandyTrackerState.club.clubId)||clubs[0],away=clubs.find(club=>club!==home)||clubs[1];
  if(!home||!away)return '<p class="match-prototype-note">No detailed EA report was stored for this result.</p>';
  const left=sbTeamStats(home),right=sbTeamStats(away);
  const rows=[['Goals',home.score,away.score,''],['Shots',left.shots,right.shots,''],['Passes',left.passes,right.passes,''],['Pass accuracy',left.passPct,right.passPct,'%'],['Assists',left.assists,right.assists,''],['Tackles',left.tackles,right.tackles,''],['Tackle success',left.tacklePct,right.tacklePct,'%'],['Interceptions',left.interceptions,right.interceptions,''],['Saves',left.saves,right.saves,''],['Average rating',left.rating.toFixed(1),right.rating.toFixed(1),'']];
  return `<div class="club-match-details"><div class="match-detail-tabs" role="tablist" aria-label="${sbEsc(away.name)} match details"><button type="button" class="is-active" data-sandy-match-view="stats" aria-selected="true">Match stats</button><button type="button" data-sandy-match-view="players" aria-selected="false">Player stats</button></div>
    <section class="match-detail-panel" data-sandy-match-panel="stats"><div class="match-stat-sheet"><div class="match-stat-clubs"><strong>${sbEsc(home.name)}</strong><b>${home.score}–${away.score}</b><strong>${sbEsc(away.name)}</strong></div>${rows.map(row=>sbStatBar(...row)).join('')}</div></section>
    <section class="match-detail-panel" data-sandy-match-panel="players" hidden>${[home,away].map(club=>`<div class="sandy-team-sheet"><h3>${sbEsc(club.name)}</h3><div class="match-player-table-wrap"><table class="match-player-table"><thead><tr><th>Player</th><th>Pos</th><th>Rating</th><th>G</th><th>A</th><th>Shots</th><th>Passes</th><th>Tackles</th><th>INT</th><th>Saves</th></tr></thead><tbody>${(club.players||[]).map(player=>`<tr><td>${player.motm?'★ ':''}${sbEsc(player.name)}</td><td>${sbEsc(player.stats?.[0]||'—')}</td><td><b>${sbEsc(player.stats?.[1]||'—')}</b></td><td>${sbEsc(player.stats?.[2]||'—')}</td><td>${sbEsc(player.stats?.[4]||'—')}</td><td>${sbEsc(player.stats?.[3]||'—')}</td><td>${sbEsc(player.stats?.[9]||'—')}</td><td>${sbEsc(player.stats?.[10]||'—')}</td><td>${sbEsc(player.stats?.[11]||'—')}</td><td>${sbEsc(player.stats?.[13]||'—')}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</section></div>`;
}

function sbMatchCard(match){
  const result=sbResult(match),club=sandyTrackerState.club;
  return `<details class="club-match-card sandy-match-card" data-match-id="${sbEsc(match.match_id)}"><summary class="club-match-row"><b class="club-form-${result.toLowerCase()}">${result}</b><div><small>${sbDate(match.played_at)} · EA result</small><strong>${club.name} <em>${sbNum(match.goals_for)}–${sbNum(match.goals_against)}</em> ${sbEsc(match.opponent_name)}</strong><span>EA match ${sbEsc(match.match_id)}</span></div><span class="club-match-action">Full stats</span></summary><div class="sandy-match-report">${sbMatchDetails(match)}</div></details>`;
}

function sbPlayerCards(players){
  return players.map(player=>`<article class="club-squad-card" data-appearances="${sbNum(player.appearances)}" data-goals="${sbNum(player.goals)}" data-assists="${sbNum(player.assists)}" data-rating="${sbNum(player.average_rating)}"><div class="club-player-top"><b>EA</b><span>${player.average_rating==null?'—':Number(player.average_rating).toFixed(2)}</span></div><h3>${sbEsc(player.latest_name)}</h3><div class="club-player-stats"><span><b>${sbNum(player.appearances)}</b> Apps</span><span><b>${sbNum(player.goals)}</b> Goals</span><span><b>${sbNum(player.assists)}</b> Assists</span><span><b>${(sbNum(player.goals)+sbNum(player.assists))}</b> G + A</span></div></article>`).join('');
}

function sbOverview(data,totals){
  const played=data.matches.length,winRate=played?Math.round(totals.wins/played*100):0;
  const leaders=[...data.players].sort((a,b)=>sbNum(b.goals)-sbNum(a.goals)).slice(0,5);
  return `<div class="club-metric-grid">${[['Matches',played,'Club history'],['Win rate',`${winRate}%`,`${totals.wins} wins`],['Goals',totals.gf,`${(totals.gf/Math.max(played,1)).toFixed(2)} per match`],['Conceded',totals.ga,`${(totals.ga/Math.max(played,1)).toFixed(2)} per match`],['Goal difference',`${totals.gf-totals.ga>=0?'+':''}${totals.gf-totals.ga}`,'All results'],['Clean sheets',totals.cleanSheets,`${Math.round(totals.cleanSheets/Math.max(played,1)*100)}% of matches`]].map(([label,value,detail])=>`<article class="club-metric"><span>${label}</span><strong>${value}</strong><small>${detail}</small></article>`).join('')}</div><div class="club-dashboard-two-col"><article class="club-dashboard-card"><span class="section-kicker">Club form</span><h2>${played} matches tracked</h2><div class="sandy-result-strip">${data.matches.map(match=>`<i class="club-form-${sbResult(match).toLowerCase()}" title="${sbEsc(match.opponent_name)}">${sbResult(match)}</i>`).join('')}</div><p>Follow the full run of results and how the club has performed over time.</p></article><article class="club-dashboard-card"><span class="section-kicker">Goal leaders</span><h2>On the scoresheet</h2><ol class="club-leader-list">${leaders.map(player=>`<li><span>${sbEsc(player.latest_name)}</span><strong>${sbNum(player.goals)} goals</strong></li>`).join('')}</ol></article></div>`;
}

function sbSquad(data){
  return `<div class="club-panel-heading"><div><span class="section-kicker">Club players</span><h2>${data.players.length} recorded players</h2><p>Everyone who has appeared for the club is included in its playing history.</p></div><label>Sort players<select id="sandy-player-sort"><option value="appearances">Appearances</option><option value="goals">Goals</option><option value="assists">Assists</option><option value="rating">Average rating</option></select></label></div><div class="club-squad-grid" id="sandy-squad-grid">${sbPlayerCards(data.players)}</div>`;
}

function sbMatches(data){
  return `<div class="club-panel-heading"><div><span class="section-kicker">EA results</span><h2>Match history</h2><p>Open any result for the same detailed stat fields used by the UFB match report.</p></div><label>Month<select id="sandy-month-filter"><option value="all">All recorded months</option>${data.months.map(month=>`<option value="${month}">${new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`))}</option>`).join('')}</select></label></div><p class="sandy-match-scroll-hint" id="sandy-match-scroll-hint" ${data.matches.length<=10?'hidden':''}>Latest 10 are in view · scroll for ${Math.max(0,data.matches.length-10)} older matches.</p><div class="club-match-list" id="sandy-match-list" aria-describedby="sandy-match-scroll-hint">${data.matches.map(sbMatchCard).join('')}</div>`;
}

function sbApplyMatchWindow(list){
  if(!list)return;
  const cards=[...list.querySelectorAll(':scope > .sandy-match-card')],scrollable=cards.length>10;
  list.classList.toggle('sandy-scroll-list',scrollable);
  if(!scrollable){list.style.removeProperty('--sandy-match-window');return;}
  requestAnimationFrame(()=>{
    if(!list.getBoundingClientRect().height){list.style.setProperty('--sandy-match-window','1080px');return;}
    const gap=parseFloat(getComputedStyle(list).rowGap)||0;
    const height=cards.slice(0,10).reduce((sum,card)=>sum+card.getBoundingClientRect().height,0)+(gap*9)+2;
    list.style.setProperty('--sandy-match-window',`${Math.ceil(height)}px`);
  });
}

function sbAnalytics(data,totals){
  const players=data.players,club=sandyTrackerState.club;
  const leaders=key=>[...players].sort((a,b)=>sbNum(b[key])-sbNum(a[key])).slice(0,5);
  const recent=[...data.matches].reverse();
  const maxGoal=Math.max(...recent.flatMap(match=>[sbNum(match.goals_for),sbNum(match.goals_against)]),1);
  return `<div class="club-panel-heading"><div><span class="section-kicker">Club trends</span><h2>${club.analyticsName} analytics</h2><p>Every number below is calculated from the club’s complete recorded match history.</p></div><span class="season-chip season-chip-live">${data.matches.length} matches</span></div><div class="analytics-grid">
    <article class="club-dashboard-card analytics-match-card"><span class="section-kicker">Match by match</span><h3>Scoring history</h3><div class="sandy-dual-chart">${recent.map(match=>`<div title="${sbEsc(match.opponent_name)} ${match.goals_for}–${match.goals_against}"><span><i style="height:${Math.max(4,sbNum(match.goals_for)/maxGoal*100)}%"></i><i style="height:${Math.max(4,sbNum(match.goals_against)/maxGoal*100)}%"></i></span><small>${sbResult(match)}</small></div>`).join('')}</div><div class="sandy-chart-legend"><span><i></i>Goals for</span><span><i></i>Goals against</span></div></article>
    <article class="club-dashboard-card analytics-rank-card"><span class="section-kicker">Club totals</span><h3>Goal leaders</h3><ol>${leaders('goals').map((player,index)=>`<li><b>${index+1}</b><span>${sbEsc(player.latest_name)}<small>${player.appearances} appearances</small></span><strong>${player.goals}</strong></li>`).join('')}</ol></article>
    <article class="club-dashboard-card analytics-rank-card"><span class="section-kicker">Club totals</span><h3>Assist leaders</h3><ol>${leaders('assists').map((player,index)=>`<li><b>${index+1}</b><span>${sbEsc(player.latest_name)}<small>${player.appearances} appearances</small></span><strong>${player.assists}</strong></li>`).join('')}</ol></article>
    <article class="club-dashboard-card analytics-pulse-card"><span class="section-kicker">Club pulse</span><h3>Performance rates</h3><div class="analytics-pulse-grid"><div><b>${Math.round(totals.wins/Math.max(data.matches.length,1)*100)}%</b><span>Win rate</span><small>${totals.wins} wins</small></div><div><b>${(totals.gf/Math.max(data.matches.length,1)).toFixed(2)}</b><span>Goals scored</span><small>per match</small></div><div><b>${(totals.ga/Math.max(data.matches.length,1)).toFixed(2)}</b><span>Goals conceded</span><small>per match</small></div><div><b>${Math.round(totals.cleanSheets/Math.max(data.matches.length,1)*100)}%</b><span>Clean sheets</span><small>${totals.cleanSheets} matches</small></div></div></article>
    <article class="club-dashboard-card analytics-compare-card"><div class="analytics-card-head"><div><span class="section-kicker">Player careers</span><h3>Player comparison</h3></div><div class="analytics-compare-selects"><select id="sandy-compare-a" aria-label="First ${club.name} player">${players.map((player,index)=>`<option value="${sbEsc(player.player_id)}" ${index===0?'selected':''}>${sbEsc(player.latest_name)}</option>`).join('')}</select><span>vs</span><select id="sandy-compare-b" aria-label="Second ${club.name} player">${players.map((player,index)=>`<option value="${sbEsc(player.player_id)}" ${index===1?'selected':''}>${sbEsc(player.latest_name)}</option>`).join('')}</select></div></div><div id="sandy-player-comparison"></div></article>
  </div>`;
}

function sbPairCard(kicker,title,pair,value,detail){
  if(!pair)return `<article class="house-pair-card is-empty"><span class="section-kicker">${kicker}</span><h3>${title}</h3><p>More shared appearances are needed before this partnership can be awarded.</p></article>`;
  return `<article class="house-pair-card"><span class="section-kicker">${kicker}</span><h3>${title}</h3><div class="house-pair-names"><b>${sbEsc(pair.players[0].name)}</b><i>+</i><b>${sbEsc(pair.players[1].name)}</b></div><strong>${value(pair)}</strong><p>${detail(pair)}</p></article>`;
}

function sbPartnerships(data){
  const pairs=sbPairData(data.matches);
  return `<div class="club-panel-heading"><div><span class="section-kicker">Better together</span><h2>UFL Partnerships</h2><p>These honors use matches where both players appeared for ${sandyTrackerState.club.name}.</p></div><span class="season-chip season-chip-live">${data.matches.length} matches</span></div><div class="house-pair-grid">
    ${sbPairCard('Attacking partnership','Sandcastle Architects',pairs.attack,pair=>`${pair.contributions} G + A`,pair=>`${pair.matches} matches together · ${pair.wins} wins`)}
    ${sbPairCard('Defensive partnership','Lock the Cabin',pairs.defense,pair=>`${pair.cleanSheetRate}% clean sheets`,pair=>`${pair.cleanSheets} clean sheets in ${pair.defensiveMatches} defensive appearances together`)}
    ${sbPairCard('Winning partnership','Two Uncs, One Mission',pairs.winners,pair=>`${pair.winRate}% win rate`,pair=>`${pair.wins} wins in ${pair.matches} matches together`)}
    ${sbPairCard('Most experienced','Always on the Teamsheet',pairs.together,pair=>`${pair.matches} matches together`,pair=>`${pair.wins} shared wins · ${pair.contributions} combined goal contributions`)}
  </div><p class="house-feature-note">Partnerships require shared appearances. Defensive honors require both players to be recorded at DEF or GK.</p>`;
}

function sbHonorCard(mark,title,player,value,detail,headline=false){
  if(!player)return `<article class="house-honor-card is-empty ${headline?'is-headline':''}"><span>${mark}</span><div><small>${title}</small><h3>Still up for grabs</h3><p>No eligible appearance has been recorded in this period.</p></div></article>`;
  return `<article class="house-honor-card ${headline?'is-headline':''}"><span>${mark}</span><div><small>${title}</small><h3>${sbEsc(player.name)}</h3><strong>${value(player)}</strong><p>${detail(player)}</p></div></article>`;
}

function sbHonors(data,month=data.months[0]||'all'){
  const matches=month==='all'?data.matches:data.matches.filter(match=>sbMonth(match.played_at)===month),honors=sbHonorData(matches);
  const monthName=month==='all'?'All recorded matches':new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
  return `<div class="club-panel-heading"><div><span class="section-kicker">House-club awards</span><h2>UFL Club Honors</h2><p>Recognition generated from the selected month’s recorded performances.</p></div><label>Award period<select id="house-honors-month"><option value="all" ${month==='all'?'selected':''}>All recorded matches</option>${data.months.map(value=>`<option value="${value}" ${value===month?'selected':''}>${new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}-01T12:00:00Z`))}</option>`).join('')}</select></label></div><div class="house-honors-period"><span>${monthName}</span><strong>${matches.length} match${matches.length===1?'':'es'}</strong></div><div class="house-honor-grid">
    ${sbHonorCard('SB','Sandiest Bum',honors.sandiest,player=>`${player.rating.toFixed(2)} average rating`,player=>`${player.goals} goals · ${player.assists} assists · ${player.wins} wins`,true)}
    ${sbHonorCard('GB','Golden Boot',honors.boot,player=>`${player.goals} goals`,player=>`${player.assists} assists in ${player.apps} appearances`)}
    ${sbHonorCard('AL','Assist Leader',honors.assists,player=>`${player.assists} assists`,player=>`${player.goals} goals in ${player.apps} appearances`)}
    ${sbHonorCard('DA','Defensive Anchor',honors.anchor,player=>`${player.rating.toFixed(2)} average rating`,player=>`${player.cleanSheets} clean sheets · ${player.interceptions} interceptions`)}
    ${sbHonorCard('GG','Golden Gloves',honors.gloves,player=>`${player.cleanSheets} clean sheets`,player=>`${player.saves} saves in ${player.apps} appearances`)}
    ${sbHonorCard('IU','Iron Unc',honors.iron,player=>`${player.apps} appearances`,player=>`${player.wins} wins · ${player.goals+player.assists} goal contributions`)}
  </div><p class="house-feature-note"><strong>Sandiest Bum:</strong> a transparent monthly form score using average rating, goals, assists, Player of the Match awards, wins, and appearances.</p>`;
}

function sbBindMatchInteractions(root){
  root.querySelectorAll('.sandy-match-card').forEach(card=>{
    card.addEventListener('toggle',async()=>{
      if(!card.open||card.dataset.loaded||card.dataset.loading)return;
      const report=card.querySelector('.sandy-match-report');
      if(report.querySelector('.club-match-details')){card.dataset.loaded='true';bindSandyMatchTabs(card);return;}
      card.dataset.loading='true';
      try{const response=await fetch(`/api/house-clubs/${sandyTrackerState.club.slug}?match=${encodeURIComponent(card.dataset.matchId)}&details=2`);if(!response.ok)throw new Error();const payload=await response.json();const match=payload.matches?.find(item=>String(item.match_id)===card.dataset.matchId);if(!match?.details)throw new Error();report.innerHTML=sbMatchDetails(match);card.dataset.loaded='true';bindSandyMatchTabs(card);}catch{report.innerHTML='<p class="match-prototype-note">This saved result does not have a complete player report yet.</p>';}finally{delete card.dataset.loading;}
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
    const response=await fetch(`/api/house-clubs/${sandyTrackerState.club.slug}?month=all&details=2`);if(!response.ok)throw new Error('Club history unavailable');
    const data=await response.json();sandyTrackerState.data=data;const totals=sbTotals(data.matches);
    root.querySelector('#sandy-link-status').textContent=data.syncDelayed?'Stats delayed':'Live stats connected';
    root.querySelector('#sandy-record').innerHTML=`<div><strong>${totals.wins}</strong><span>Wins</span></div><div><strong>${totals.draws}</strong><span>Draws</span></div><div><strong>${totals.losses}</strong><span>Losses</span></div>`;
    const recent=data.matches.slice(0,8),recentTotals=sbTotals(recent);root.querySelector('#sandy-form').innerHTML=recent.map(match=>`<b class="club-form-${sbResult(match).toLowerCase()}">${sbResult(match)}</b>`).join('');root.querySelector('#sandy-form-copy').textContent=`Last ${recent.length} · ${recentTotals.wins}W · ${recentTotals.draws}D · ${recentTotals.losses}L`;
    root.querySelector('[data-sandy-panel="overview"]').innerHTML=sbOverview(data,totals);
    root.querySelector('[data-sandy-panel="squad"]').innerHTML=sbSquad(data);
    root.querySelector('[data-sandy-panel="matches"]').innerHTML=sbMatches(data);
    root.querySelector('[data-sandy-panel="analytics"]').innerHTML=sbAnalytics(data,totals);
    root.querySelector('[data-sandy-panel="partnerships"]').innerHTML=sbPartnerships(data);
    root.querySelector('[data-sandy-panel="honors"]').innerHTML=sbHonors(data);
    root.querySelector('#sandy-player-sort')?.addEventListener('change',event=>{const grid=root.querySelector('#sandy-squad-grid'),key=event.target.value;[...grid.children].sort((a,b)=>Number(b.dataset[key])-Number(a.dataset[key])).forEach(card=>grid.append(card));});
    root.querySelector('#sandy-month-filter')?.addEventListener('change',event=>{const month=event.target.value,list=root.querySelector('#sandy-match-list'),hint=root.querySelector('#sandy-match-scroll-hint');const matches=month==='all'?data.matches:data.matches.filter(match=>sbMonth(match.played_at)===month);list.innerHTML=matches.map(sbMatchCard).join('')||'<p>No matches in this month.</p>';hint.hidden=matches.length<=10;hint.textContent=`Latest 10 are in view · scroll for ${Math.max(0,matches.length-10)} older matches.`;sbBindMatchInteractions(root);sbApplyMatchWindow(list);});
    root.querySelector('[data-sandy-panel="honors"]')?.addEventListener('change',event=>{if(event.target.id!=='house-honors-month')return;root.querySelector('[data-sandy-panel="honors"]').innerHTML=sbHonors(data,event.target.value);});
    root.querySelector('#sandy-compare-a')?.addEventListener('change',()=>sbRenderComparison(root));root.querySelector('#sandy-compare-b')?.addEventListener('change',()=>sbRenderComparison(root));sbRenderComparison(root);sbBindMatchInteractions(root);sbApplyMatchWindow(root.querySelector('#sandy-match-list'));
  }catch{
    root.querySelector('#sandy-link-status').textContent='Stats temporarily unavailable';root.querySelectorAll('.sandy-loading').forEach(panel=>panel.innerHTML='<p>Club results could not be reached. Please reload the page to try again.</p>');
  }
}

function bindSandyTrackerPreview(){
  const root=document.querySelector('.sandy-dashboard-preview');if(!root)return;
  root.querySelectorAll('[data-sandy-tab]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.sandyTab;root.querySelectorAll('[data-sandy-tab]').forEach(item=>{const active=item===button;item.setAttribute('aria-selected',String(active));});root.querySelectorAll('[data-sandy-panel]').forEach(panel=>{panel.hidden=panel.dataset.sandyPanel!==id;});if(id==='matches')sbApplyMatchWindow(root.querySelector('#sandy-match-list'));}));
  hydrateSandyTrackerPreview();
}
