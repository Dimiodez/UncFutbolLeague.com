const status=text=>{document.querySelector('#rank-status').textContent=text;};
let run=null;
async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options,signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Scores are unavailable.');return data;}
export async function loadLeaderboard(){
  const root=document.querySelector('#leaderboard');
  try{const data=await api('/api/arcade/leaderboard');root.replaceChildren();if(!data.entries.length){const row=document.createElement('li');row.textContent='No completed runs yet. Set the first best.';root.append(row);}for(const [i,entry] of data.entries.entries()){const row=document.createElement('li');const name=document.createElement('span');name.textContent=`${i+1}. ${entry.displayName} · ${entry.team}`;const score=document.createElement('b');score.textContent=entry.score.toLocaleString();row.append(name,score);root.append(row);}}
  catch{root.textContent='Leaderboard unavailable. You can still play.';}
}
export async function beginRun(team){
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  const previous=run;flush(false);if(previous)await previous.chain;
  run=null;
  try{const session=await api('/api/auth/session');if(!session.authenticated){status('Guest practice · Sign in on the site before starting a run to join the leaderboard.');return seed;}
    const data=await api('/api/arcade/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({team})});
    run={id:data.id,seq:0,steps:[],ticks:0,chain:Promise.resolve(),failed:false,pending:0};status('Playing as '+session.user.displayName+' · Your best completed run counts.');return data.seed;
  }catch{status('Score connection unavailable · Playing locally for this run.');return seed;}
}
export function record(step){if(!run||run.failed)return;const last=run.steps.at(-1);if(typeof step[0]==='number'&&last&&last[0]===step[0]&&typeof last[0]==='number')last[1]+=step[1];else run.steps.push([...step]);if(typeof step[0]==='number')run.ticks+=step[1];if(run.ticks>=600||run.steps.length>=700)flush(false);}
export function flush(final=false){
  const current=run;if(!current||current.failed||!current.steps.length)return;
  const steps=current.steps;current.steps=[];current.ticks=0;const seq=current.seq++;current.pending++;
  if(current.pending>4){current.failed=true;status('Score connection interrupted · This run stays on this device.');return;}
  current.chain=current.chain.then(async()=>{if(current.failed)return;try{const result=await api('/api/arcade/run',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:current.id,seq,steps})});if(result.finished){status('Run verified · Your personal best is on the leaderboard.');await loadLeaderboard();}else if(final){status('This run was not completed; no leaderboard score was saved.');}}catch(error){current.failed=true;status(error.message+' This run stays on this device.');}finally{current.pending--;}});
}
document.querySelector('#refresh-board').addEventListener('click',loadLeaderboard);
status('Sign in on the site to save your best to the members leaderboard. Guests can practice.');

export function discardRun(){if(run){run.failed=true;run.steps=[];}run=null;}
export async function ownerSession(){try{const session=await api('/api/auth/session');return session.authenticated&&session.user?.role==='owner';}catch{return false;}}
