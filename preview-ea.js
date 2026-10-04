const account=document.querySelector('#ea-account'),status=document.querySelector('#ea-status'),results=document.querySelector('#ea-results'),sheets=document.querySelector('#ea-matches');
const escape=value=>String(value??'—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let signedIn=false;
fetch('/api/auth/session').then(response=>response.json()).then(data=>{signedIn=data.authenticated;account.innerHTML=signedIn?`Signed in as ${escape(data.user.displayName)} · Preview account only`:'<a href="/api/auth/discord">Sign in with Discord</a> to save a verified club selection to your preview account.';});
document.querySelector('#ea-search').addEventListener('submit',async event=>{
 event.preventDefault();status.textContent='Searching EA…';results.innerHTML='';sheets.innerHTML='';
 try{const response=await fetch(`/api/ea/search?name=${encodeURIComponent(event.currentTarget.elements.name.value.trim())}`),data=await response.json();if(!response.ok)throw Error(data.error);
 status.textContent=data.clubs.length?'Choose the matching club.':'No clubs found. Try the exact in-game name.';
 for(const club of data.clubs){const card=document.createElement('article');card.innerHTML=`<h2>${escape(club.name)}</h2><p>EA club ${escape(club.id)} · Current generation</p><button data-check>Check recent matches</button> <button data-link ${signedIn?'':'disabled'}>Save preview club link</button><p data-message></p>`;
 card.querySelector('[data-check]').addEventListener('click',()=>checkMatches(club));
 card.querySelector('[data-link]').addEventListener('click',async()=>{const response=await fetch('/api/ea/links',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(club)}),data=await response.json();card.querySelector('[data-message]').textContent=response.ok?data.note:data.error;});results.append(card);}
 }catch(error){status.textContent=error.message;}
});
async function checkMatches(club){
 status.textContent='Checking EA match history…';sheets.innerHTML='';
 try{const response=await fetch(`/api/ea/clubs/${encodeURIComponent(club.id)}/matches`),data=await response.json();if(!response.ok)throw Error(data.error);
 status.textContent=`Checked ${new Date(data.checkedAt).toLocaleString()}. ${data.matches.length} available games.${data.partial?' Some match feeds were unavailable.':''}`;
 sheets.innerHTML=`<h2>${escape(club.name)} — available results</h2><p>${escape(data.note)}</p>`;
 for(const game of data.matches){const teams=Object.values(game.clubs||{}),players=Object.values(game.players||{}),card=document.createElement('article');card.innerHTML=`<h3>${teams.map(team=>`${escape(team.clubName??team.name)} ${escape(team.score??team.goals)}`).join(' vs ')}</h3><p>${escape(new Date(Number(game.timestamp)*1000).toLocaleString())}</p><details><summary>Full player stats</summary>${teams.map(team=>`<h4>${escape(team.clubName??team.name)}</h4><div class="sheet"><table><thead><tr><th>Player</th><th>Position</th><th>Rating</th><th>Goals</th><th>Assists</th><th>Shots</th><th>Passes</th><th>Tackles</th><th>Saves</th><th>MotM</th></tr></thead><tbody>${players.filter(player=>String(player.clubId)===String(team.clubId)).map(player=>`<tr><td>${escape(player.name)}</td><td>${escape(player.position)}</td><td>${escape(player.rating)}</td><td>${escape(player.goals)}</td><td>${escape(player.assists)}</td><td>${escape(player.shots)}</td><td>${escape(player.passesCompleted)} / ${escape(player.passes)}</td><td>${escape(player.tacklesWon)} / ${escape(player.tackles)}</td><td>${escape(player.saves)}</td><td>${Number(player.manOfTheMatch)===1?'★':'—'}</td></tr>`).join('')}</tbody></table></div>`).join('')}</details>`;sheets.append(card);}
 }catch(error){status.textContent=error.message;}
}
