import {testClub,mergeTestMatches,testOpponents} from './league-ea-test-model.js?v=20261014-eatest1';
const key='ufl-preview-ea-test-v1';
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function installEaTestLab(){
 const host=document.createElement('details');host.className='card ea-test-lab';host.open=false;
 const style=document.createElement('link');style.rel='stylesheet';style.href='/league-suite-assets/league-ea-test.css?v=20261014-eatest1';document.head.append(style);
 const anchor=document.querySelector('#league-overview');anchor.before(host);
 let clubs=[],busy=false,timer,saveNote='Saved on this browser only';
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');clubs=saved.slice(0,8).map(c=>({...testClub(c.name,c.id),matches:mergeTestMatches([],c.matches||[],String(c.id)),checkedAt:c.checkedAt,partial:c.partial}));}catch{saveNote='Previous test settings could not be read. Existing league drafts are unchanged.';}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(clubs));saveNote='Saved on this browser only';}catch{saveNote='Browser storage is full. New results are not saved; export the test archive.';}};
 function render(){
  const open=host.open;
  host.innerHTML=`<summary>EA Clubs · independent match test</summary><p>Connect up to eight clubs for the upcoming test. This reads EA club games through the existing relay—not Virtual Arena. Nothing here changes official results.</p><form class="ea-test-add"><label>Test team name<input name="clubName" maxlength="80" required placeholder="Team name"></label><label>EA club ID<input name="clubId" inputmode="numeric" pattern="[0-9]{1,20}" required placeholder="Numeric club ID"></label><button ${busy?'disabled':''}>Add test team</button></form><div class="workshop-toolbar"><button type="button" data-check ${busy||!clubs.length?'disabled':''}>${busy?'Checking EA…':'Check all teams now'}</button><label>Auto-check while this page stays open<select data-interval><option value="0">Off</option><option value="5">Every 5 minutes</option><option value="15">Every 15 minutes</option></select></label><label><input type="checkbox" data-only> Only games between test teams</label><button type="button" data-export ${!clubs.length?'disabled':''}>Export test archive</button></div><p data-status role="status" aria-live="polite">${esc(saveNote)}</p><div class="ea-test-clubs"></div><p class="hub-help">Archive: up to 100 games per club on this browser. Auto-check stops when you close the page and may pause in background tabs. These games do not feed standings until matched to a scheduled fixture and accepted under Matches → Check EA candidates. Use the same club IDs in your draft teams. Extra time still needs confirmation.</p>`;
  host.querySelector('summary').textContent='EA diagnostics · Raw match history (optional)';
  host.querySelector('summary+p').textContent='Troubleshooting tool only. This archive and its timer are separate from automatic league tracking. Turning this timer off does not turn your league checker off.';
  host.querySelector('.hub-help').textContent='Up to 100 raw games per club are stored in this browser. This diagnostic archive never updates standings or player stats. Manage club IDs and scheduled results inside your league. The automatic EA trial uses standard 3 / 1 / 0 scoring; other leagues retain their configured review rules.';
  host.open=open;host.querySelector('[data-interval]').value=String(interval);
  host.querySelector('[data-only]').checked=only;
  host.querySelector('form').onsubmit=e=>{e.preventDefault();try{if(clubs.length>=8)throw Error('This test supports up to eight teams.');const f=new FormData(e.target),c=testClub(f.get('clubName'),f.get('clubId'));if(clubs.some(x=>x.id===c.id))throw Error('That EA club is already in the test.');clubs.push({...c,matches:[]});save();render();}catch(err){status(err.message);}};
  host.querySelector('[data-check]').onclick=check;
  host.querySelector('[data-interval]').onchange=e=>{interval=Number(e.target.value);clearInterval(timer);if(interval)timer=setInterval(()=>{if(!document.hidden)check();},interval*60000);status(interval?'Auto-check enabled while this page remains open.':'Auto-check off.');};
  host.querySelector('[data-only]').onchange=e=>{only=e.target.checked;renderClubs();};
  host.querySelector('[data-export]').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,previewOnly:true,exportedAt:new Date().toISOString(),clubs},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ufl-ea-test-archive.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  renderClubs();
 }
 let interval=0,only=false;
 const status=text=>{host.querySelector('[data-status]').textContent=text;};
 function renderClubs(){
  const list=host.querySelector('.ea-test-clubs');list.replaceChildren();
  for(const c of clubs){const box=document.createElement('article');box.className='ea-test-club';const matches=only?c.matches.filter(g=>testOpponents(g,clubs.map(t=>t.id))):c.matches;
   box.innerHTML=`<h3>${esc(c.name)} <small>EA ${esc(c.id)}</small></h3><p>${c.checkedAt?'Last successful check: '+esc(new Date(c.checkedAt).toLocaleString()):'Not checked yet'} · ${c.matches.length} archived${c.partial?' · Partial feed—some match types unavailable':''}</p>${c.error?`<p role="alert">${esc(c.error)}</p>`:''}<button type="button" data-remove ${busy?'disabled':''}>Remove from test</button><p>Most recent 5${only?' between test teams':''} · imported games, not approved league results</p>`;
   box.querySelector('[data-remove]').onclick=()=>{if(confirm('Remove this club and its browser-only test archive?')){clubs=clubs.filter(t=>t.id!==c.id);save();render();}};
   for(const g of matches.slice(0,5)){const d=document.createElement('details'),s=document.createElement('summary');s.textContent=Object.values(g.clubs).map(t=>(t.clubName||t.name||'Club')+' '+(t.goals??t.score??'?')).join(' vs ')+' · '+new Date(Number(g.timestamp)*1000).toLocaleString();const pre=document.createElement('pre');pre.textContent=JSON.stringify(g,null,2);d.append(s,pre);box.append(d);}
   if(!matches.length){const p=document.createElement('p');p.textContent='No matching archived games yet. An empty EA feed does not prove that no games were played.';box.append(p);}list.append(box);
  }
 }
 async function check(){
  if(busy||!clubs.length)return;busy=true;render();let failures=0;
  for(const c of clubs){try{const r=await fetch('/api/league-suite/ea/clubs/'+c.id+'/matches',{cache:'no-store',signal:AbortSignal.timeout(30000)}),data=await r.json();if(!r.ok)throw Error(data.error||'EA check failed.');if(!Array.isArray(data.matches))throw Error('Invalid EA response.');c.matches=mergeTestMatches(c.matches,data.matches,c.id);c.checkedAt=data.checkedAt;c.partial=data.partial;delete c.error;}catch(e){failures++;c.error=e.message||'EA check failed; previous games retained.';}}
  busy=false;save();render();status((failures?`${failures} team check(s) failed; previous games retained. `:'EA check complete. ')+saveNote);
 }
 render();
}
