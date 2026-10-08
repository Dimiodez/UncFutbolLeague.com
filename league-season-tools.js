const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
if(!document.querySelector('#season-tools-style')){const css=document.createElement('link');css.id='season-tools-style';css.rel='stylesheet';css.href='/league-season-tools.css';document.head.append(css);}
export function renderSeasonCalendar({host,draft}){
 const section=document.createElement('section');section.className='season-calendar';
 section.innerHTML=`<h3>Season calendar</h3><p>Matchnights and breaks in ${escape(draft.settings.timeZone)}. Times below also show your device’s local time. Shared player RSVP and reminders are not connected yet.</p><label>Show team<select><option value="">All teams</option>${draft.settings.teams.map(t=>`<option value="${escape(t.id)}">${escape(t.name)}</option>`).join('')}</select></label><div data-calendar-events></div>`;
 const render=()=>{
  const team=section.querySelector('select').value;
  const events=[...draft.nights.map(n=>({date:n.date,label:`League week ${n.week}`,fixtures:n.fixtures,byes:n.byes||[]})),...(draft.skippedDates||[]).map(b=>({...b,label:b.reasons.join(' · '),fixtures:[],byes:[]}))].sort((a,b)=>a.date.localeCompare(b.date));
  section.querySelector('[data-calendar-events]').innerHTML=events.map(e=>{
   const fixtures=e.fixtures.filter(f=>!team||[f.home.id,f.away.id].includes(team)),byes=e.byes.filter(b=>!team||b.id===team);
   if(team&&e.fixtures.length&&!fixtures.length&&!byes.length)return '';
   return `<article class="rule-card"><h4>${escape(e.date)} · ${escape(e.label)}</h4>${byes.length?`<p class="workshop-warning"><strong>Full-night BYE: ${byes.map(b=>escape(b.name)).join(', ')}</strong> · Both kickoff slots off · No points or stats</p>`:''}${fixtures.map(f=>`<p><strong>${escape(f.home.name)} vs ${escape(f.away.name)}</strong> · ${escape(new Intl.DateTimeFormat('en-US',{timeZone:draft.settings.timeZone,hour:'numeric',minute:'2-digit'}).format(f.startsAt))} league time<br><time datetime="${new Date(f.startsAt).toISOString()}">Your time: ${escape(new Date(f.startsAt).toLocaleString())}</time> · ${(draft.acceptedResults||[]).some(r=>r.fixtureId===f.id)?'Accepted locally':'Scheduled'}</p>`).join('')||(!byes.length?'<p>No league games — break.</p>':'')}</article>`;
  }).join('')||'<p>Generate fixtures to populate the season calendar.</p>';
 };section.querySelector('select').onchange=render;render();host.append(section);
 if(draft.nights.length){
  const overview=document.createElement('details');overview.innerHTML='<summary>Season at a glance — weeks, byes & both kickoff slots</summary><div style="max-width:100%;overflow-x:auto"><table><caption>Double round-robin · League timezone</caption><thead><tr><th>Week / date</th><th>Full-night BYE</th><th>First kickoff</th><th>Second kickoff</th></tr></thead><tbody></tbody></table></div>';
  overview.querySelector('tbody').innerHTML=draft.nights.map(n=>{const slots=[...new Set(n.fixtures.map(f=>f.startsAt))].sort((a,b)=>a-b),cell=slot=>{const games=n.fixtures.filter(f=>f.startsAt===slot),time=slot?new Intl.DateTimeFormat('en-US',{timeZone:draft.settings.timeZone,hour:'numeric',minute:'2-digit'}).format(slot):'';return `<td><strong>${escape(time)}</strong>${games.map(f=>`<div>${escape(f.home.name)} vs ${escape(f.away.name)}</div>`).join('')}</td>`;};return `<tr><th>Week ${n.week}<br>${escape(n.date)}</th><td>${(n.byes||[]).map(t=>escape(t.name)).join(', ')||'—'}</td>${cell(slots[0])}${cell(slots[1])}</tr>`;}).join('');
  section.querySelector('label').before(overview);
 }
 const cups=draft.settings.pageContent?.finals?.cupPlans||[];
 if(cups.length)section.insertAdjacentHTML('beforeend',`<h4>Cup dates (all entrants)</h4>${cups.flatMap(c=>c.fixtures.map(f=>`<p>${escape(f.date)} · ${escape(c.name)} R${f.round} · ${escape(f.home.name)} ${f.away?`vs ${escape(f.away.name)}`:'— bye'}</p>`)).join('')}`);
}
