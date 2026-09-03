const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const season = window.UFL_SEASON;
const teamByKey = Object.fromEntries(Object.entries(season.teams).map(([key,[name,logo]]) => [key,{key,name,logo}]));
const currentWeek = season.weeks.find(week => week.matches.some(match => match[3] === null))?.week ?? season.weeks.at(-1).week;
const state = { mode: 'simple', simpleWeek: currentWeek, detailWeek: currentWeek, simplePeriod: 'weekly', detailPeriod: 'weekly' };
const teams = Object.values(teamByKey);
const rosters = {
  ARS:['Saka','Ødegaard','Rice','Havertz'], CHE:['Palmer','Jackson','Fernández','Caicedo'], LIV:['Salah','Díaz','Szoboszlai','Mac Allister'],
  MCI:['Haaland','Foden','De Bruyne','Rodri'], MUN:['Fernandes','Rashford','Garnacho','Højlund'], NEW:['Isak','Gordon','Guimarães','Tonali'],
  TOT:['Son','Maddison','Kulusevski','Johnson'], WHU:['Bowen','Kudus','Paquetá','Ward-Prowse']
};
const entries = [];
const escapeHtml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const badge = team => `<img class="team-badge team-logo" src="${team.logo}" alt="${escapeHtml(team.name)} crest" loading="lazy">`;

function weekData(week) { return season.weeks.find(item => item.week === week) || season.weeks[0]; }
function fixturesForWeek(week) {
  return weekData(week).matches.map(([id,home,away,hs,as]) => ({
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
function formatKickoff(week) { return weekData(week).date; }
function getBallot(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
function showToast(message) { const toast=$('#toast'); toast.textContent=message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2400); }

function renderSimple() {
  const week=state.simpleWeek, data=weekData(week), fixtures=fixturesForWeek(week), complete=fixtures.every(f=>f.hs!==null&&f.as!==null), open=!complete&&Date.now()<data.scheduledAt*1000, saved=getBallot(`ufl-simple-${week}`);
  weekTabs('#simple-weeks',week,'simple'); $('#simple-title').textContent=`Gameweek ${week} · 5 matches`;
  $('#simple-status').textContent=open?'Voting open':complete?'Final · voting closed':'Voting closed'; $('#simple-status').className=`status ${open?'open':'closed'}`;
  $('#live-badge').innerHTML=`<i></i> WEEK ${week} · ${open?'OPEN':complete?'FINAL':'LOCKED'}`;
  $('#simple-fixtures').innerHTML=fixtures.map((f,i)=>{
    const result=complete?(f.hs>f.as?'home':f.hs<f.as?'away':'draw'):null, chosen=saved.picks?.[f.id];
    const cls=choice=>`${choice===chosen?' selected':''}${complete&&choice===result?' correct':''}`;
    return `<article class="simple-match"><header><span>Match ${i+1} · ${formatKickoff(week)}</span><a href="${f.url}" target="_blank" rel="noopener noreferrer">${complete?`Final ${f.hs}–${f.as}`:open?'Pick one':'Awaiting result'} ↗</a></header><div>
      <button data-choice="home" data-match="${f.id}" class="${cls('home')}" ${open?'':'disabled'}>${badge(f.home)}<span><strong>${f.home.name}</strong><small>Home win</small></span></button>
      <button data-choice="draw" data-match="${f.id}" class="draw${cls('draw')}" ${open?'':'disabled'}><b>×</b><span><strong>Draw</strong><small>Level</small></span></button>
      <button data-choice="away" data-match="${f.id}" class="${cls('away')}" ${open?'':'disabled'}>${badge(f.away)}<span><strong>${f.away.name}</strong><small>Away win</small></span></button>
    </div></article>`;
  }).join('');
  const featured=fixtures.at(-1); $('#tb-question').textContent=`Total goals in ${featured.home.name} vs ${featured.away.name}?`; $('#tb-lock').textContent=`Locks ${formatKickoff(week)}`;
  $('#tiebreaker').value=open?(saved.tiebreaker??''):(complete?featured.hs+featured.as:''); $('#tiebreaker').disabled=!open; $('#save-simple').disabled=!open; $('#save-simple').textContent=open?'Submit your picks':complete?`Week ${week} final`:`Week ${week} locked`;
  updateProgress(); renderSimpleLeaders(); renderActivity(open);
}
function updateProgress(){ const total=fixturesForWeek(state.simpleWeek).length, count=new Set($$('[data-choice].selected').map(b=>b.dataset.match)).size; $('#progress-label').textContent=`${count}/${total} picks made`; $('#progress-bar').style.width=`${total?count/total*100:0}%`; }
function renderSimpleLeaders(){
  $('#simple-leaders').innerHTML=season.standings.map(([key,played,wins,draws,losses,gf,ga,gd,points],index)=>{
    const team=teamByKey[key];
    return `<a class="standing-row" href="${season.standingsSource}" target="_blank" rel="noopener noreferrer"><b>${index+1}</b>${badge(team)}<p><strong>${team.name}</strong><small>${wins}W · ${draws}D · ${losses}L</small></p><span>${played}</span><span>${gd>0?'+':''}${gd}</span><strong>${points}</strong></a>`;
  }).join('');
}
function renderActivity(){ $('#activity').innerHTML='<p class="empty-community">Community entries will appear after secure Discord login launches.</p>'; }
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

document.addEventListener('click',event=>{
  const mode=event.target.closest('[data-mode]'); if(mode){state.mode=mode.dataset.mode; $$('[data-mode]').forEach(b=>b.classList.toggle('active',b===mode)); $$('[data-pane]').forEach(p=>p.classList.toggle('active',p.dataset.pane===state.mode)); $('#subtitle').textContent=state.mode==='simple'?'Pick the winner or a draw across all five scheduled matches.':'Call scores, scorers, assists, and your Double Down.'; window.parent.postMessage({type:'ufl-app-resize'},window.location.origin);}
  const sw=event.target.closest('[data-simple-week]'); if(sw){state.simpleWeek=Number(sw.dataset.simpleWeek);renderSimple();}
  const dw=event.target.closest('[data-detail-week]'); if(dw){state.detailWeek=Number(dw.dataset.detailWeek);renderDetail();}
  const choice=event.target.closest('[data-choice]'); if(choice&&!choice.disabled){$$(`[data-match="${choice.dataset.match}"]`).forEach(b=>b.classList.remove('selected'));choice.classList.add('selected');updateProgress();}
  const sp=event.target.closest('[data-simple-period]'); if(sp){state.simplePeriod=sp.dataset.simplePeriod;renderSimpleLeaders();}
  const dp=event.target.closest('[data-detail-period]'); if(dp){state.detailPeriod=dp.dataset.detailPeriod;renderDetailLeaders();}
  if(event.target.closest('#save-simple')){const picks={};$$('[data-choice].selected').forEach(b=>picks[b.dataset.match]=b.dataset.choice);if(Object.keys(picks).length<5)return showToast('Make all five picks first.');localStorage.setItem(`ufl-simple-${state.simpleWeek}`,JSON.stringify({picks,tiebreaker:$('#tiebreaker').value}));showToast('Pick’ems saved on this device.');}
  const save=event.target.closest('[data-save-detail]');if(save){const card=save.closest('[data-detail-card]'),players={},thresholds={};$$('[data-player]',card).forEach(s=>players[s.dataset.player]=s.value);$$('[data-threshold]',card).forEach(s=>thresholds[s.dataset.threshold]=s.value);localStorage.setItem(`ufl-detail-${save.dataset.saveDetail}`,JSON.stringify({home:$('[data-home]',card).value,away:$('[data-away]',card).value,players,thresholds,saved:true}));save.textContent='Saved ✓';showToast('Detailed picks saved.');}
});
document.addEventListener('change',event=>{if(event.target.matches('[data-threshold]')&&event.target.value==='2+'){$$('[data-threshold]',event.target.closest('.detail-card')).forEach(s=>{if(s!==event.target)s.value='1+';});}});
renderSimple();
