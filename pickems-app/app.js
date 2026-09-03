const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { mode: 'simple', simpleWeek: 10, detailWeek: 10, simplePeriod: 'weekly', detailPeriod: 'weekly' };

const teams = [
  ['Arsenal','ARS','#e30613'],['Chelsea','CHE','#034694'],['Liverpool','LIV','#c8102e'],['Manchester City','MCI','#6cabdd'],
  ['Manchester United','MUN','#da291c'],['Newcastle United','NEW','#241f20'],['Tottenham Hotspur','TOT','#132257'],
  ['West Ham United','WHU','#7a263a'],['Real Madrid','RMA','#7c8ba8'],['Barcelona','FCB','#a50044']
].map(([name,short,color]) => ({ name, short, color }));
const rosters = {
  ARS:['Saka','Ødegaard','Rice','Havertz'], CHE:['Palmer','Jackson','Fernández','Caicedo'], LIV:['Salah','Díaz','Szoboszlai','Mac Allister'],
  MCI:['Haaland','Foden','De Bruyne','Rodri'], MUN:['Fernandes','Rashford','Garnacho','Højlund'], NEW:['Isak','Gordon','Guimarães','Tonali'],
  TOT:['Son','Maddison','Kulusevski','Johnson'], WHU:['Bowen','Kudus','Paquetá','Ward-Prowse']
};
const entries = [
  ['MayaFC','@maya',5,36,284,5],['ChrisOnTheCall','@chris',4,34,271,4],['Jordan6','@jordan',4,31,255,4],
  ['SamUnited','@sam',3,29,239,3],['TaylorTactics','@taylor',3,27,226,2],['AlexPresses','@alex',2,24,211,2]
];
const escapeHtml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const badge = team => `<span class="team-badge" style="--team:${team.color}">${team.short}</span>`;

function fixturesForWeek(week, pool = teams) {
  let rotation = [...pool];
  for (let round = 0; round < (week - 1) % (rotation.length - 1); round++) rotation = [rotation[0], rotation.at(-1), ...rotation.slice(1,-1)];
  return Array.from({length: rotation.length / 2}, (_,i) => {
    const a = rotation[i], b = rotation[rotation.length - 1 - i], swap = (week + i) % 2 === 0;
    return { id:`w${week}m${i}`, home:swap?b:a, away:swap?a:b, hs:(week+i*2)%5, as:(week+i+2)%4 };
  });
}
function weekTabs(target, selected, type) {
  $(target).innerHTML = Array.from({length:10},(_,i)=>`<button class="${i+1===selected?'active ':''}${i<9?'complete':''}" data-${type}-week="${i+1}"><span>${i<9?'✓':'LIVE'}</span>Week ${i+1}</button>`).join('');
}
function formatKickoff(week,index) { return `${index < 3 ? 'Tue' : 'Thu'} · ${7 + (index%3)}:${index%3===1?'30':'00'} PM`; }
function getBallot(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
function showToast(message) { const toast=$('#toast'); toast.textContent=message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2400); }

function renderSimple() {
  const week=state.simpleWeek, open=week===10, fixtures=fixturesForWeek(week), saved=getBallot(`ufl-simple-${week}`);
  weekTabs('#simple-weeks',week,'simple'); $('#simple-title').textContent=`Gameweek ${week} · 5 matches`;
  $('#simple-status').textContent=open?'Voting open':'Scored · voting closed'; $('#simple-status').className=`status ${open?'open':'closed'}`;
  $('#simple-fixtures').innerHTML=fixtures.map((f,i)=>{
    const result=f.hs>f.as?'home':f.hs<f.as?'away':'draw', chosen=open?saved.picks?.[f.id]:['home','draw','away'][(week+i)%3];
    const cls=choice=>`${choice===chosen?' selected':''}${!open&&choice===result?' correct':''}`;
    return `<article class="simple-match"><header><span>Match ${i+1} · ${formatKickoff(week,i)}</span><strong>${open?'Pick one':`Final ${f.hs}–${f.as}`}</strong></header><div>
      <button data-choice="home" data-match="${f.id}" class="${cls('home')}" ${open?'':'disabled'}>${badge(f.home)}<span><strong>${f.home.name}</strong><small>Home win</small></span></button>
      <button data-choice="draw" data-match="${f.id}" class="draw${cls('draw')}" ${open?'':'disabled'}><b>×</b><span><strong>Draw</strong><small>Level</small></span></button>
      <button data-choice="away" data-match="${f.id}" class="${cls('away')}" ${open?'':'disabled'}>${badge(f.away)}<span><strong>${f.away.name}</strong><small>Away win</small></span></button>
    </div></article>`;
  }).join('');
  const featured=fixtures.at(-1); $('#tb-question').textContent=`Total goals in ${featured.home.name} vs ${featured.away.name}?`; $('#tb-lock').textContent='Thursday · locks at kickoff';
  $('#tiebreaker').value=open?(saved.tiebreaker??''):(featured.hs+featured.as); $('#tiebreaker').disabled=!open; $('#save-simple').disabled=!open; $('#save-simple').textContent=open?'Submit your picks':`Week ${week} scored`;
  updateProgress(); renderSimpleLeaders(); renderActivity(open);
}
function updateProgress(){ const count=new Set($$('[data-choice].selected').map(b=>b.dataset.match)).size; $('#progress-label').textContent=`${count}/5 picks made`; $('#progress-bar').style.width=`${count*20}%`; }
function renderSimpleLeaders(){
  const season=state.simplePeriod==='season'; $('#simple-leader-title').textContent=season?'Season leaderboard':`Week ${state.simpleWeek}`;
  $$('[data-simple-period]').forEach(b=>b.classList.toggle('active',b.dataset.simplePeriod===state.simplePeriod));
  $('#simple-leaders').innerHTML=entries.map((e,i)=>({e,score:season?e[3]:Math.max(1,e[2]-((state.simpleWeek+i)%2))})).sort((a,b)=>b.score-a.score).map(({e,score},i)=>leaderRow(i,e[0],e[1],season?score:`${score}/5`,season?Math.min(10,state.simpleWeek):`±${i%3}`)).join('');
}
function renderActivity(open){ $('#activity').innerHTML=entries.slice(0,5).map((e,i)=>`<div class="activity-row"><span class="avatar">${e[0].slice(0,2).toUpperCase()}</span><p><strong>${e[0]}</strong><small>${open?(i===4?'4/5 picks saved':'5/5 picks saved'):`${e[2]}/5 correct`}</small></p><b>${open?(i===4?'Draft':'Ready'):`${e[2]} pt`}</b></div>`).join(''); }
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
renderSimple();renderDetail();
