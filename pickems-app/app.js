const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const seasonData = window.UFL_SEASONS || { 's1-6v6': window.UFL_SEASON };
const competitions = {
  's2-6v6': { season: 2, division: '6v6', game: 'FC27' },
  's2-10v10': { season: 2, division: '10v10', game: 'FC27' },
  's1-6v6': { season: 1, division: '6v6', game: 'FC26', archived: true }
};
const state = { competition: 's2-6v6', mode: 'simple', simpleWeek: 1, detailWeek: 1, simplePeriod: 'weekly', detailPeriod: 'weekly' };
let season;
let teamByKey;
let teams;
function useCompetition(key) {
  state.competition = key;
  season = seasonData[key] || { teams: {}, standings: [], weeks: [] };
  teamByKey = Object.fromEntries(Object.entries(season.teams || {}).map(([teamKey,[name,logo]]) => [teamKey,{key:teamKey,name,logo}]));
  teams = Object.values(teamByKey);
  const currentWeek = season.weeks?.find(week => week.matches.some(match => match[3] === null || match[4] === null))?.week ?? season.weeks?.at(-1)?.week ?? 1;
  state.simpleWeek = currentWeek;
  state.detailWeek = currentWeek;
}
useCompetition(state.competition);
const rosters = {
  ARS:['Saka','Ødegaard','Rice','Havertz'], CHE:['Palmer','Jackson','Fernández','Caicedo'], LIV:['Salah','Díaz','Szoboszlai','Mac Allister'],
  MCI:['Haaland','Foden','De Bruyne','Rodri'], MUN:['Fernandes','Rashford','Garnacho','Højlund'], NEW:['Isak','Gordon','Guimarães','Tonali'],
  TOT:['Son','Maddison','Kulusevski','Johnson'], WHU:['Bowen','Kudus','Paquetá','Ward-Prowse']
};
const entries = [];
let authState = { authenticated: false, user: null };
let leaderboardEntries = [];
const serverBallots = new Map();
const escapeHtml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const badge = team => `<img class="team-badge team-logo" src="${team.logo}" alt="${escapeHtml(team.name)} crest" loading="lazy">`;

function weekData(week) { return season.weeks?.find(item => item.week === week) || season.weeks?.[0] || null; }
function fixturesForWeek(week) {
  return (weekData(week)?.matches || []).map(([id,home,away,hs,as]) => ({
    id: String(id), home: teamByKey[home], away: teamByKey[away], hs, as,
    url: `https://ufl.virtualarena.app/matches/${id}`
  }));
}
function weekTabs(target, selected, type) {
  $(target).innerHTML = season.weeks.map(week => {
    const complete = week.matches.every(match => match[3] !== null && match[4] !== null);
    return `<button class="${week.week===selected?'active ':''}${complete?'complete':''}" data-${type}-week="${week.week}"><span>${complete?'✓':'OPEN'}</span>Week ${week.week}</button>`;
  }).join('');
}
function formatKickoff(week) { return weekData(week)?.date || 'Date to be announced'; }
const ballotKey = (competition, week) => `${competition}:${Number(week)}`;
function getBallot(week) { return serverBallots.get(ballotKey(state.competition, week)) || {}; }
function showToast(message) { const toast=$('#toast'); toast.textContent=message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2400); }

function renderSimple() {
  const week=state.simpleWeek, data=weekData(week), fixtures=fixturesForWeek(week), complete=fixtures.every(f=>f.hs!==null&&f.as!==null), open=!complete&&Date.now()<data.scheduledAt*1000, saved=getBallot(week);
  weekTabs('#simple-weeks',week,'simple'); $('#simple-title').textContent=`Gameweek ${week} · ${fixtures.length} match${fixtures.length===1?'':'es'}`;
  $('#simple-status').textContent=open?'Voting open':complete?'Final · voting closed':'Voting closed'; $('#simple-status').className=`status ${open?'open':'closed'}`;
  $('#live-badge').innerHTML=`<i></i> WEEK ${week} · ${open?'OPEN':complete?'FINAL':'LOCKED'}`;
  $('#simple-fixtures').innerHTML=fixtures.map((f,i)=>{
    const result=complete?(f.hs>f.as?'home':f.hs<f.as?'away':'draw'):null, chosen=saved.picks?.[f.id];
    const cls=choice=>`${choice===chosen?' selected':''}${complete&&choice===chosen?(choice===result?' correct':' incorrect'):''}`;
    return `<article class="simple-match"><header><span>Match ${i+1} · ${formatKickoff(week)}</span><a href="${f.url}" target="_blank" rel="noopener noreferrer">${complete?`Final ${f.hs}–${f.as}`:open?'Pick one':'Awaiting result'} ↗</a></header><div>
      <button data-choice="home" data-match="${f.id}" class="${cls('home')}" ${open?'':'disabled'}>${badge(f.home)}<span><strong>${f.home.name}</strong><small>Home win</small></span></button>
      <button data-choice="draw" data-match="${f.id}" class="draw${cls('draw')}" ${open?'':'disabled'}><b>×</b><span><strong>Draw</strong><small>Level</small></span></button>
      <button data-choice="away" data-match="${f.id}" class="${cls('away')}" ${open?'':'disabled'}>${badge(f.away)}<span><strong>${f.away.name}</strong><small>Away win</small></span></button>
    </div></article>`;
  }).join('');
  const featured=fixtures.at(-1), finalTotal=complete?featured.hs+featured.as:null; $('#tb-question').textContent=`Total goals in ${featured.home.name} vs ${featured.away.name}?`; $('#tb-lock').textContent=complete?`Final total: ${finalTotal} · Your pick: ${saved.tiebreaker??'—'}`:`Locks ${formatKickoff(week)}`;
  $('#tiebreaker').value=saved.tiebreaker??(complete?finalTotal:''); $('#tiebreaker').disabled=!open; $('#save-simple').disabled=!open; $('#save-simple').textContent=open?(authState.authenticated?'Save shared ballot':'Sign in to submit'):complete?`Week ${week} final`:`Week ${week} locked`;
  $('#account-state').innerHTML=authState.authenticated?`Signed in as <strong>${escapeHtml(authState.user.displayName)}</strong> · picks are saved to your UFL account.`:`<a href="/account" target="_top">Sign in with Discord</a> to save picks across devices and appear on the shared leaderboard.`;
  updateProgress(); renderSimpleLeaders(); renderActivity(open);
}
function updateProgress(){ const total=fixturesForWeek(state.simpleWeek).length, count=new Set($$('[data-choice].selected').map(b=>b.dataset.match)).size; $('#progress-label').textContent=`${count}/${total} picks made`; $('#progress-bar').style.width=`${total?count/total*100:0}%`; }
function renderSimpleLeaders(){
  $('#simple-leader-title').textContent=`${competitions[state.competition].division} standings`;
  const source=$('#standings-source');if(source)source.href=season.standingsSource||season.seriesSource||'#';
  $('#simple-leaders').innerHTML=season.standings.map(([key,played,wins,draws,losses,gf,ga,gd,points],index)=>{
    const team=teamByKey[key];
    return `<a class="standing-row" href="${season.standingsSource}" target="_blank" rel="noopener noreferrer"><b>${index+1}</b>${badge(team)}<p><strong>${team.name}</strong><small>${wins}W · ${draws}D · ${losses}L</small></p><span>${played}</span><span>${gd>0?'+':''}${gd}</span><strong>${points}</strong></a>`;
  }).join('');
}
function renderActivity(){
  $('#pickem-leader-title').textContent=state.simplePeriod==='weekly'?`Week ${state.simpleWeek} leaders`:'Season leaders';
  $$('[data-leader-scope]').forEach(button=>button.classList.toggle('active',button.dataset.leaderScope===state.simplePeriod));
  $('#activity').innerHTML=leaderboardEntries.length?leaderboardEntries.map(entry=>`<div class="activity-row"><span class="avatar">${entry.avatarUrl?`<img src="${escapeHtml(entry.avatarUrl)}" alt="">`:escapeHtml(entry.displayName.slice(0,2).toUpperCase())}</span><p><strong>${escapeHtml(entry.displayName)}</strong><small>@${escapeHtml(entry.username)} · ${entry.picksMade} picks${state.simplePeriod==='weekly'&&entry.tiebreaker!==null?` · TB ${entry.tiebreaker}${entry.tiebreakerDiff!==null?entry.tiebreakerDiff===0?' (exact)':` (off ${entry.tiebreakerDiff})`:''}`:''}</small></p><b>${entry.score} pt${entry.score===1?'':'s'}</b></div>`).join(''):'<p class="empty-community">No scored community ballots yet. Be the first Unc on the board.</p>';
}
async function loadAuth(){
  try { const response=await fetch('/api/auth/session',{credentials:'same-origin'}); authState=response.ok?await response.json():authState; }
  catch { authState={authenticated:false,user:null}; }
}
async function loadBallot(week){
  if(!authState.authenticated)return;
  try{const response=await fetch(`/api/pickems/ballot?competition=${encodeURIComponent(state.competition)}&week=${week}`,{credentials:'same-origin'});if(response.ok)serverBallots.set(ballotKey(state.competition,week),await response.json());}catch{}
}
async function loadLeaderboard(){
  const query=new URLSearchParams({competition:state.competition});if(state.simplePeriod==='weekly')query.set('week',state.simpleWeek);
  try{const response=await fetch(`/api/pickems/leaderboard?${query}`);leaderboardEntries=response.ok?(await response.json()).entries:[];}catch{leaderboardEntries=[];}
  renderActivity();
}
function leaderRow(rank,name,handle,value,last){ return `<div class="leader-row ${rank===0?'leader':''}"><b>${rank+1}</b><span class="avatar">${name.slice(0,2).toUpperCase()}</span><p><strong>${name}</strong><small>${handle}</small></p><strong>${value}</strong><span>${last}</span></div>`; }

function renderDetail(){
  const week=state.detailWeek, open=week===10, fixtures=fixturesForWeek(week,teams.slice(0,8));
  weekTabs('#detail-weeks',week,'detail'); $('#detail-title').textContent=`Gameweek ${week} · 4 matches`; $('#detail-status').textContent=open?'Voting open':'Scored · voting closed'; $('#detail-status').className=`status ${open?'open':'closed'}`;
  $('#detail-fixtures').innerHTML=fixtures.map((f,i)=>{
    const saved=getBallot(`ufl-detail-${f.id}`), players=[...(rosters[f.home.short]||['Player 1','Player 2']),...(rosters[f.away.short]||['Player 3','Player 4'])];
    const options=(selected='')=>players.map(p=>`<option ${p===selected?'selected':''}>${escapeHtml(p)}</option>`).join('');
    const field=(label,key)=>`<label><span>${label}</span><div><select data-player="${key}" ${open?'':'disabled'}>${options(saved.players?.[key])}</select><select data-threshold="${key}" ${open?'':'disabled'}><option>1+</option><option ${saved.thresholds?.[key]==='2+'?'selected':''}>2+</option></select></div></label>`;
    return `<article class="detail-card" data-detail-card="${f.id}"><header><span>${open?'● VOTING OPEN':`FINAL · ${f.hs}–${f.as}`}</span><small>${formatKickoff(week,i)}</small></header><div class="score-call"><div>${badge(f.home)}<strong>${f.home.name}</strong></div><label><span>Your score</span><div><input data-home type="number" min="0" value="${saved.home??2}" ${open?'':'disabled'}><b>—</b><input data-away type="number" min="0" value="${saved.away??1}" ${open?'':'disabled'}></div></label><div>${badge(f.away)}<strong>${f.away.name}</strong></div></div><div class="player-grid">${field('Scorer 1','s1')}${field('Scorer 2','s2')}${field('Assist 1','a1')}${field('Assist 2','a2')}</div><div class="double-note"><b>2×</b><span><strong>One Double Down per match</strong><small>A 2+ player call doubles the point.</small></span></div><footer><span>${saved.saved?'Ballot saved on this device':'Demo ballot · not submitted'}</span>${open?`<button class="primary" data-save-detail="${f.id}">Save picks</button>`:''}</footer></article>`;
  }).join(''); renderDetailLeaders();
}
function renderDetailLeaders(){ const season=state.detailPeriod==='season'; $('#detail-leader-title').textContent=season?'Season leaderboard':`Week ${state.detailWeek}`; $$('[data-detail-period]').forEach(b=>b.classList.toggle('active',b.dataset.detailPeriod===state.detailPeriod)); $('#detail-leaders').innerHTML=entries.slice(0,5).map((e,i)=>leaderRow(i,e[0],e[1],season?e[4]:Math.max(4,35-i*3),season?e[5]+7-i:e[5])).join(''); }

document.addEventListener('click',async event=>{
  const competitionButton=event.target.closest('[data-competition]');if(competitionButton){
    const key=competitionButton.dataset.competition,config=competitions[key];if(!config)return;
    useCompetition(key);$$('[data-competition]').forEach(button=>button.classList.toggle('active',button===competitionButton));
    await renderCompetition();return;
  }
  const mode=event.target.closest('[data-mode]'); if(mode){state.mode=mode.dataset.mode; $$('[data-mode]').forEach(b=>b.classList.toggle('active',b===mode)); $$('[data-pane]').forEach(p=>p.classList.toggle('active',p.dataset.pane===state.mode)); $('#subtitle').textContent=state.mode==='simple'?'Pick the winner or a draw across all five scheduled matches.':'Call scores, scorers, assists, and your Double Down.'; window.parent.postMessage({type:'ufl-app-resize'},window.location.origin);}
  const sw=event.target.closest('[data-simple-week]'); if(sw){state.simpleWeek=Number(sw.dataset.simpleWeek);await loadBallot(state.simpleWeek);await loadLeaderboard();renderSimple();}
  const dw=event.target.closest('[data-detail-week]'); if(dw){state.detailWeek=Number(dw.dataset.detailWeek);renderDetail();}
  const choice=event.target.closest('[data-choice]'); if(choice&&!choice.disabled){$$(`[data-match="${choice.dataset.match}"]`).forEach(b=>b.classList.remove('selected'));choice.classList.add('selected');updateProgress();}
  const sp=event.target.closest('[data-simple-period]'); if(sp){state.simplePeriod=sp.dataset.simplePeriod;renderSimpleLeaders();}
  const scope=event.target.closest('[data-leader-scope]');if(scope){state.simplePeriod=scope.dataset.leaderScope;await loadLeaderboard();}
  const dp=event.target.closest('[data-detail-period]'); if(dp){state.detailPeriod=dp.dataset.detailPeriod;renderDetailLeaders();}
  if(event.target.closest('#save-simple')){
    if(!authState.authenticated){window.top.location.assign('/account');return;}
    const picks={};$$('[data-choice].selected').forEach(b=>picks[b.dataset.match]=b.dataset.choice);
    if(Object.keys(picks).length<fixturesForWeek(state.simpleWeek).length)return showToast('Make every pick first.');
    if($('#tiebreaker').value==='')return showToast('Add your total-goals tiebreaker.');
    const response=await fetch('/api/pickems/ballot',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({competition:state.competition,week:state.simpleWeek,picks,tiebreaker:Number($('#tiebreaker').value)})});
    const result=await response.json().catch(()=>({error:'Unable to save ballot.'}));
    if(!response.ok)return showToast(result.error||'Unable to save ballot.');
    serverBallots.set(ballotKey(state.competition,state.simpleWeek),{picks,tiebreaker:Number($('#tiebreaker').value)});showToast('Shared Pick’ems saved to your UFL account.');await loadLeaderboard();
  }
  const save=event.target.closest('[data-save-detail]');if(save){const card=save.closest('[data-detail-card]'),players={},thresholds={};$$('[data-player]',card).forEach(s=>players[s.dataset.player]=s.value);$$('[data-threshold]',card).forEach(s=>thresholds[s.dataset.threshold]=s.value);localStorage.setItem(`ufl-detail-${save.dataset.saveDetail}`,JSON.stringify({home:$('[data-home]',card).value,away:$('[data-away]',card).value,players,thresholds,saved:true}));save.textContent='Saved ✓';showToast('Detailed picks saved.');}
});
document.addEventListener('change',event=>{if(event.target.matches('[data-threshold]')&&event.target.value==='2+'){$$('[data-threshold]',event.target.closest('.detail-card')).forEach(s=>{if(s!==event.target)s.value='1+';});}});
async function renderCompetition(){
  const config=competitions[state.competition],ready=Boolean(season.weeks?.length);
  const syncedLabel=$('#data-source');if(syncedLabel)syncedLabel.textContent=season.syncedAt?`Virtual Arena · synced ${new Date(season.syncedAt).toLocaleString()}`:'Virtual Arena · awaiting first sync';
  $('[data-competition-pane="pickems"]').hidden=!ready;$('#future-competition').hidden=ready;
  if(ready){
    $('#subtitle').textContent=config.archived?'Season 1 is closed and preserved here with its final results and leaderboard.':`Pick the winner or a draw in every ${config.division} fixture.`;
    $('#live-badge').innerHTML=`<i></i> ${config.archived?'ARCHIVED':`${config.division} · SEASON 2`}`;
    $('#season-heading').textContent=`${config.game} · UFL Season ${config.season}${config.archived?' · Archive':''}`;
    await Promise.all([loadBallot(state.simpleWeek),loadLeaderboard()]);renderSimple();
  }else{
    const registered=season.teamDetails?.length||0;
    $('#future-title').textContent=`UFL Season 2 · ${config.division} Pick’ems`;
    $('#future-copy').textContent=`The ${config.division} competition is connected to Virtual Arena${registered?` with ${registered} registered team${registered===1?'':'s'}`:''}. Pick’ems will open automatically when the official schedule is published.`;
    $('#live-badge').innerHTML=`<i></i> ${config.division} · REGISTRATION`;
    $('#subtitle').textContent=`UFL Season 2 ${config.division} is ready for teams and fixtures.`;
  }
  window.parent.postMessage({type:'ufl-app-resize'},window.location.origin);
}
async function initialize(){await loadAuth();await renderCompetition();}
initialize();
