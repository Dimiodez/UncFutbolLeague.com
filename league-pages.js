/* Clone-only presentation layer. No EA requests or account linking. */
const leagueArtwork = [
  ['BAY','bayern','Munich, Germany','Bavarian ambition, red shirts and a stadium built for big nights.'],
  ['COM','como','Lake Como, Italy','Lakeside football in royal blue, framed by the mountains of Lombardy.'],
  ['GOTH','gotham-city','Gotham City','The Dark Knights bring black-and-gold football to Wayne Memorial Stadium.'],
  ['HAM','hamkam','Hamar, Norway','Green and white, Norwegian roots and a proud Season 1 championship.'],
  ['IB','island-boys','The Caribbean','The Reefsharks bring tropical colour and the spirit of “Rise with the Wave.”'],
  ['JAG','jagiellonia','Białystok, Poland','Red and yellow, Polish roots and a matchday full of character.'],
  ['NL','new-legacy','Manchester, England','A new chapter, an attacking identity and a home at Legacy Stadium.'],
  ['PAL','palermo','Palermo, Sicily','Pink-and-black football with the unmistakable character of Sicily.'],
  ['PUM','pumas-unam','Mexico City, Mexico','University roots, navy and gold, and the iconic Pumas identity.'],
  ['TAB','tabascokids','Villahermosa, Mexico','Red, white and green, with a little extra heat on match night.']
];
// Public reference directory snapshot, explicitly limited to Season 1 6v6.
const leaguePlayerReference = [
  ['1790037122937','A_Poon','GOTH','10'],['1790040167969','BIGHIMUP','COM','',true],
  ['1790039653579','Bilal','PUM','30'],['1790039636892','Bradical','PUM','20'],
  ['1790040154536','BravoAnte','COM','25'],['1790037493288','Bruceybistro','HAM','',true],
  ['1790040112875','bRzGabriel98','COM','',true],['1790037129806','Cam','GOTH','15'],
  ['1790040141524','DimiOdez','COM','',true],['1790037114483','DonkeyKongsBong','GOTH','5'],
  ['1790039666683','germanwigends','PUM','35'],['1790039616426','H00bear','PUM','5'],
  ['1790037158112','i_spit_hot_fire','GOTH','30'],['1790037469426','J2theGut22','HAM','',true],
  ['1790037150378','KLee','GOTH','25'],['1790039623256','liz','PUM','10'],
  ['1790040121906','LondonIsRed','COM','',true],['1790037412465','Luuuiiisss7','HAM','',true],
  ['1790039646060','phantom','PUM','25'],['1790040177840','RaengerQuan','COM','',true],
  ['1790037457695','Salmon','HAM','',true],['1790037428289','Schweinslap','HAM','',true],
  ['1790037139988','Tee','GOTH','20'],['1790037441815','thealphabetman','HAM','',true],
  ['1790040132841','Vinicimnj','COM','',true],['1790039630375','zo','PUM','15']
].map(([id,name,club,number,portrait])=>({id,name,club,number,portrait}));

const leagueStatCategories = [
  ['goals','Golden Boot','Goals','Attack','The finishers who turn chances into goals.'],
  ['assists','Playmakers','Assists','Playmaking','The final pass before the celebration.'],
  ['contributions','Total impact','Goals + assists','Playmaking','Scoring and creating, counted together.'],
  ['tackles','Ball winners','Tackles per game','Defense','The players who win possession back.'],
  ['clean-sheets','Shutout specialists','Defender clean sheets','Defense','Keeping the opposition off the scoreboard.'],
  ['rating','MVP race','Average match rating','MVP','Consistency across every match.']
];
function leagueViewContext(params) {
  const selected=selectedLeagueSeason(params);
  const division=params.get('division')==='10v10'?'10v10':'6v6';
  const official=leagueSeasonFor(division,selected.id);
  const provisional=selected.id==='2'?leagueProvisionalSeasons[division]:null;
  const archive=selected.id==='1'&&division==='6v6';
  // Provider abbreviations can change. Preserve collaborator profile/roster keys
  // when an official entry has the same key or a unique normalized club name.
  const clubIdentity=name=>String(name||'').replace(/^UFL\s+/i,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliases=Object.fromEntries(Object.entries(official?.teams||{}).map(([key,team])=>{
    const exact=provisional?.clubs.find(c=>c.key===key);
    const matches=provisional?.clubs.filter(c=>clubIdentity(c.name)===clubIdentity(team[0]))||[];
    return [key,exact?.key||(matches.length===1?matches[0].key:key)];
  }));
  const mappedKey=key=>aliases[key]||key;
  const season=provisional?{...official,
    teams:{...Object.fromEntries(Object.entries(official?.teams||{}).map(([key,team])=>[mappedKey(key),team])),...Object.fromEntries(provisional.clubs.map(c=>[c.key,[c.name,c.logo]]))},
    teamDetails:official?.teamDetails?.map(t=>({...t,key:mappedKey(t.key)})),
    standings:official?.standings?.map(([key,...stats])=>[mappedKey(key),...stats]),
    weeks:official?.weeks?.map(week=>({...week,matches:week.matches.map(([id,home,away,...scores])=>[id,mappedKey(home),mappedKey(away),...scores])})),
    provisionalClubs:provisional.clubs}:official;
  const managed=selected.id==='2'&&typeof leagueManagedRosterState!=='undefined'?leagueManagedRosterState.players?.[division]:null;
  const players=(archive?leaguePlayerReference:managed||provisional?.players||[]).map(player=>({...player,portrait:playerPortraitSource(player)}));
  return {selected,division,season,archive,provisional,players};
}
function leagueViewLink(path, context, extra='') {
  return `${path}?season=${context.selected.id}&division=${context.division}${extra}`;
}
function leagueViewNavigation(path, context) {
  return `<nav class="league-local-nav" aria-label="League pages">${[['/clubs','Clubs'],['/players','Players'],['/standings','Standings'],['/stats','Stats'],['/schedules','Schedules']].map(([href,label])=>`<a href="${href==='/schedules'?`/schedules?season=${context.selected.id}&type=${context.division}`:leagueViewLink(href,context)}" data-link ${path===href?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="league-tab-stack">${leagueSeasonTabs(path,context.selected.id,'division',context.division)}${leagueDivisionTabs(path,context.selected.id,context.division,path==='/clubs')}</div><div class="league-view-status"><span class="season-chip ${context.selected.current?'season-chip-live':''}">${context.selected.label} · ${context.division} · ${context.selected.game}</span><span>${context.selected.archived?'Archived season':'Current season'}</span></div>`;
}
function leagueClubVisual(key, season) {
  if(!key)return {name:'Free agent',logo:'/assets/ufl-mark.webp',image:'/assets/ufl-banner.jpg',location:'Player pool',copy:'Available for team assignment.'};
  const [name,logo]=leagueTeam(key,season);
  const current=season?.provisionalClubs?.find(c=>c.key===key);
  if(current) return {name,logo:current.logo,image:current.image,location:'Season 2 · Provisional club',copy:'Meet the current squad. Club and player listings are from our collaborator’s roster; official VA registration will be linked as clubs register.'};
  const artwork=leagueArtwork.find(row=>row[0]===key&&name===leagueTeam(key,leagueSeasons['s1-6v6'])[0]);
  return {name,logo:artwork?`/assets/league/${artwork[1]}-crest.png`:logo,image:artwork?`/assets/league/${artwork[1]}.jpg`:'/assets/ufl-banner.jpg',location:artwork?.[2]||'UFL clubhouse',copy:artwork?.[3]||'Meet the squad. Club artwork and roster details will be added as the season takes shape.'};
}
function leagueClubCard(key,context) {
  const visual=leagueClubVisual(key,context.season);
  const stats=context.season.teamDetails?.find(t=>t.key===key)?.stats;
  const players=context.players.filter(p=>p.club===key).length;
  return `<a class="league-club-tile" href="${leagueViewLink(`/clubs/${encodeURIComponent(key)}`,context)}" data-link><div class="league-club-art"><img src="${escapeHtml(visual.image)}" alt="${escapeHtml(visual.name)} club artwork" loading="lazy"><span class="league-art-caption">${escapeHtml(visual.location)}</span></div><div class="league-club-body"><img class="league-club-crest" src="${escapeHtml(visual.logo)}" alt="${escapeHtml(visual.name)} crest" loading="lazy"><small>${context.division} · ${context.selected.label}</small><h2>${escapeHtml(visual.name)}</h2><p>${escapeHtml(visual.copy)}</p><div class="league-tile-footer"><span>${stats?.played?`${stats.wins}W · ${stats.draws}D · ${stats.losses}L`:`${players} ${context.archive?'reference':'provisional'} players`}</span><strong>Meet the club →</strong></div></div></a>`;
}
function leagueClubsPage(params) {
  if(params.get('division')==='house') return teamsPage(params);
  const context=leagueViewContext(params);
  const keys=Object.keys(context.season?.teams||{}).sort((a,b)=>leagueTeam(a,context.season)[0].localeCompare(leagueTeam(b,context.season)[0]));
  return pageHero('UFL · League','The clubs','Different colours. Different identities. One league.')+`<section class="section league-explorer">${leagueViewNavigation('/clubs',context)}${context.provisional?'<p class="sync-note">Provisional club and player roster from our collaborator · official VA registration will be linked as clubs register.</p>':''}<div class="league-directory-head"><div><span class="section-kicker">Club directory</span><h2>Find your colours.</h2></div><span>${keys.length} clubs</span></div><div class="league-club-tiles">${keys.map(key=>leagueClubCard(key,context)).join('')}</div>${keys.length?'':emptyState('The next lineup is on its way','Clubs will appear here when the selected season’s team list is available.')}</section>`;
}
function playerLeagueMemberships(player,context){
  if(context.archive)return [{division:context.division,...leagueClubVisual(player.club,context.season)}];
  const identity=playerIdentityKey(player);
  return ['6v6','10v10'].flatMap(division=>{
    const other=leagueViewContext(new URLSearchParams({season:context.selected.id,division}));
    const entries=other.players.filter(candidate=>playerIdentityKey(candidate)===identity);
    // Do not merge ambiguous duplicate names into another person's team.
    const membership=division===context.division?player:entries.length===1?entries[0]:null;
    return membership?.club?[{division,...leagueClubVisual(membership.club,other.season)}]:[];
  });
}
function leaguePlayerCard(player,context) {
  player={...player,portrait:playerPortraitSource(player)};
  const club=leagueClubVisual(player.club,context.season);
  const memberships=playerLeagueMemberships(player,context);
  const logos=memberships.map(team=>`<figure title="${escapeHtml(`${team.division} · ${team.name}`)}"><img src="${escapeHtml(team.logo)}" alt="${escapeHtml(`${team.name} · ${team.division}`)}" loading="lazy">${memberships.length>1?`<figcaption>${team.division}</figcaption>`:''}</figure>`).join('');
  return `<a class="league-player-tile" data-player-card data-search="${escapeHtml((player.name+' '+memberships.map(team=>team.name).join(' ')).toLowerCase())}" href="${leagueViewLink(`/players/${player.id}`,context)}" data-link><div class="league-player-art" data-player-photo-id="${escapeHtml(player.id)}" data-player-photo-name="${escapeHtml(player.name)}">${player.portrait?`<img src="${escapeHtml(typeof player.portrait==='string'?player.portrait:`/assets/league/player-${player.id}.jpg`)}" alt="${escapeHtml(player.name)}" loading="lazy">`:`<span class="league-shirt-number">${player.number?'#'+player.number:'UFL'}</span>`}<span class="league-player-season">S${context.selected.id} · ${context.division}</span></div><div class="league-player-body"><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(club.name)}</p><div class="league-player-memberships" aria-label="Team memberships">${logos}</div></div></a>`;
}
function leaguePlayersPage(params) {
  const context=leagueViewContext(params),club=params.get('club')||'';
  const players=context.players.filter(p=>!club||(club==='free-agent'?!p.club:p.club===club));
  const clubs=Object.keys(context.season?.teams||{});
  return pageHero('UFL · League','The players','The faces behind the clubs. Find a teammate, explore a squad, meet the league.')+`<section class="section league-explorer">${leagueViewNavigation('/players',context)}<div class="league-directory-head"><div><span class="section-kicker">Player directory</span><h2>Meet the lineup.</h2></div><label class="league-search">Search players<input id="league-player-search" type="search" placeholder="Player or club name" autocomplete="off"></label></div>${clubs.length?`<p class="sync-note">${context.archive?'Public collaborator directory snapshot · Season 1 reference rosters, not a complete official registration list.':'Provisional Season 2 rosters from our collaborator · VA registration and EA linking pending.'}</p><nav class="league-club-filters" aria-label="Filter players by club"><a class="${!club?'active':''}" href="${leagueViewLink('/players',context)}" data-link>All clubs <b>${context.players.length}</b></a>${clubs.map(key=>`<a class="${club===key?'active':''}" href="${leagueViewLink('/players',context,`&club=${key}`)}" data-link>${escapeHtml(leagueTeam(key,context.season)[0])} <b>${context.players.filter(p=>p.club===key).length}</b></a>`).join('')}</nav>`:''}<p id="league-player-count" aria-live="polite">${players.length} players</p><div class="league-player-grid">${players.map(p=>leaguePlayerCard(p,context)).join('')}</div><p id="league-player-no-results" class="empty-state" hidden>No players match that search.</p>${players.length?'':emptyState(context.archive?'No reference players for this club':'Player registration is coming next',context.archive?'There are no players listed for this club in the collaborator’s archived directory.':'The directory layout is ready. No Season 1 players have been carried into this season.',`<a class="button button-secondary" href="/players?season=1&division=6v6" data-link>Explore Season 1 players →</a>`)}</section>`;
}
function leagueClubProfile(key,params) {
  const context=leagueViewContext(params);
  if(!context.season?.teams?.[key]) return pageHero('UFL · League','Club not found','This club is not listed in the selected season.')+`<section class="section"><a href="${leagueViewLink('/clubs',context)}" data-link>Back to clubs →</a></section>`;
  const club=leagueClubVisual(key,context.season),players=context.players.filter(p=>p.club===key);
  const stats=context.season.teamDetails?.find(t=>t.key===key)?.stats;
  return pageHero(`${context.selected.label} · ${context.division}`,club.name,club.location)+`<section class="section league-explorer">${leagueViewNavigation('/clubs',context)}<a class="league-back" href="${leagueViewLink('/clubs',context)}" data-link>← All clubs</a><article class="league-club-profile"><img class="league-profile-art" src="${escapeHtml(club.image)}" alt="${escapeHtml(club.name)} club artwork"><div><img class="league-profile-crest" src="${escapeHtml(club.logo)}" alt="${escapeHtml(club.name)} crest"><span class="section-kicker">Club identity</span><h2>${escapeHtml(club.name)}</h2><p>${escapeHtml(club.copy)}</p><div class="league-mini-stats">${[['Played',stats?.played],['Wins',stats?.wins],['Points',stats?.points]].map(([label,value])=>`<div><strong>${value??'—'}</strong><span>${label}</span></div>`).join('')}</div><a href="${leagueViewLink('/standings',context)}" data-link>View season standings →</a></div></article><div class="league-directory-head"><div><span class="section-kicker">${context.archive?'Archived reference roster':'Provisional squad'}</span><h2>The dressing room.</h2></div><a href="${leagueViewLink('/players',context,`&club=${key}`)}" data-link>All club players →</a></div><div class="league-player-grid">${players.map(p=>leaguePlayerCard(p,context)).join('')}</div>${players.length?'':emptyState('Roster to follow','Player registration and club linking will be connected in the next phase.')}</section>`;
}
function leaguePlayerProfile(id,params) {
  const context=leagueViewContext(params),alias=!context.archive&&typeof leagueManagedRosterState!=='undefined'?leagueManagedRosterState.aliases?.[id]:null,player=context.players.find(p=>p.id===id)||(alias?context.players.find(p=>p.identity===alias):null);
  if(!player) return pageHero('UFL · League','Player not found','This player is not listed in the selected season.')+`<section class="section"><a href="${leagueViewLink('/players',context)}" data-link>Back to players →</a></section>`;
  const club=leagueClubVisual(player.club,context.season);
  return pageHero(`${context.selected.label} · ${context.division}`,player.name,club.name)+`<section class="section league-explorer">${leagueViewNavigation('/players',context)}<a class="league-back" href="${leagueViewLink('/players',context)}" data-link>← All players</a><div class="league-player-profile">${leaguePlayerCard(player,context)}<article class="card"><span class="section-kicker">Player profile · ${context.archive?'archive':'provisional'}</span><h2>${escapeHtml(player.name)}</h2><p>${context.selected.label} ${context.archive?'reference':'provisional'} roster${player.number?` · Shirt #${player.number}`:''}</p><a class="table-team" href="${player.club?leagueViewLink(`/clubs/${player.club}`,context):leagueViewLink('/players',context,'&club=free-agent')}" data-link><img src="${escapeHtml(club.logo)}" alt=""><strong>${escapeHtml(club.name)} →</strong></a><p class="sync-note">EA account linking and individual match statistics are coming soon.</p><a class="button button-secondary" href="${leagueViewLink('/stats',context)}" data-link>Explore stats →</a></article></div></section>`;
}
function leagueStandingsPage(params) {
  const context=leagueViewContext(params),rows=context.season?.standings||[];
  const champion=context.archive&&rows.length?leagueClubVisual(rows[0][0],context.season):null;
  const table=rows.length?`<div class="table-wrap league-standings-table"><table><caption>${context.selected.label} · ${context.division}${context.archive?' · Final table':''}</caption><thead><tr><th scope="col">#</th><th scope="col">Club</th><th scope="col">P</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th><th scope="col">GF</th><th scope="col">GA</th><th scope="col">GD</th><th scope="col">Pts</th></tr></thead><tbody>${rows.map(([key,p,w,d,l,gf,ga,gd,pts],index)=>{const club=leagueClubVisual(key,context.season);return `<tr ${context.archive&&index===0?'class="league-champion-row"':''}><td>${index+1}</td><th scope="row"><a class="table-team" href="${leagueViewLink(`/clubs/${key}`,context)}" data-link><img src="${escapeHtml(club.logo)}" alt="" loading="lazy"><strong>${escapeHtml(club.name)}</strong></a></th><td>${p}</td><td>${w}</td><td>${d}</td><td>${l}</td><td>${gf}</td><td>${ga}</td><td>${signed(gd)}</td><td><strong>${pts}</strong></td></tr>`;}).join('')}</tbody></table></div>`:emptyState('Standings to follow','The table will appear when clubs and results are available for this division.');
  return pageHero('UFL · League','The standings','The title race, the chasing pack and every point in between.')+`<section class="section league-explorer">${leagueViewNavigation('/standings',context)}${champion?`<article class="league-champion-panel"><img src="${escapeHtml(champion.image)}" alt="" class="league-champion-backdrop"><div><span class="section-kicker">Season ${context.selected.id} champions</span><h2>${escapeHtml(champion.name)}</h2><p>${rows[0][8]} points · ${rows[0][2]} wins · ${rows[0][1]} matches</p><a href="${leagueViewLink(`/clubs/${rows[0][0]}`,context)}" data-link>Meet the champions →</a></div><img class="league-champion-crest" src="${escapeHtml(champion.logo)}" alt="${escapeHtml(champion.name)} crest"></article>`:`<div class="league-directory-head"><div><span class="section-kicker">League table</span><h2>A new title race.</h2></div><span>Season preparing</span></div>`}<p class="sync-note">Committed Virtual Arena snapshot${context.season?.syncedAt?` · ${new Date(context.season.syncedAt).toLocaleString()}`:''}. No live EA connection.</p>${table}<div class="league-directory-head"><div><span class="section-kicker">Season honours</span><h2>More than the table.</h2></div></div><div class="league-honours-grid">${[['League champions',champion?.name||'To be decided'],['Season MVP','Awaiting confirmed award'],['Golden Boot','Awaiting confirmed award']].map(([title,value])=>`<article class="card"><span class="section-kicker">${title}</span><h3>${escapeHtml(value)}</h3></article>`).join('')}</div></section>`;
}
function leagueStatsPage(params) {
  const context=leagueViewContext(params),group=params.get('category')||'All';
  const categories=leagueStatCategories.filter(c=>group==='All'||c[3]===group);
  return pageHero('UFL · League','The numbers game','Goals, creators, ball winners and the season’s standout performers.')+`<section class="section league-explorer">${leagueViewNavigation('/stats',context)}<div class="league-directory-head"><div><span class="section-kicker">Award watch</span><h2>Who sets the standard?</h2></div><span class="season-chip">Data connection pending</span></div><div class="league-award-watch">${leagueStatCategories.filter(c=>['goals','assists','contributions','rating'].includes(c[0])).map(c=>`<a href="#stats-${c[0]}" class="league-award-card"><span>${c[1]}</span><h3>${c[2]}</h3><strong>—</strong><small>Awaiting match statistics</small></a>`).join('')}</div><div class="league-directory-head"><div><span class="section-kicker">Leaderboards</span><h2>Every kind of impact.</h2></div></div><nav class="league-club-filters" aria-label="Statistics category">${[['All','All leaderboards'],['Attack','Attack'],['Playmaking','Playmaking & G+A'],['Defense','Defense & shutouts'],['MVP','MVP']].map(([value,label])=>`<a class="${group===value?'active':''}" href="${leagueViewLink('/stats',context,`&category=${value}`)}" data-link>${label}</a>`).join('')}</nav><p class="sync-note">Individual match statistics are coming soon. No sample scores are presented as real results.</p><div class="league-stats-grid">${categories.map(([id,title,metric,,copy])=>`<article class="league-stat-board" id="stats-${id}"><header><span class="section-kicker">${title}</span><h2>${metric}</h2><p>${copy}</p></header><div class="league-stat-columns"><span>Player / club</span><span>${metric}</span></div><div class="league-stat-empty"><span aria-hidden="true">—</span><h3>Waiting for the first numbers.</h3><p>Rankings will appear once verified match statistics are connected for ${context.selected.label} ${context.division}.</p></div></article>`).join('')}</div></section>`;
}
function bindLeagueExplorer() {
  document.querySelectorAll('.league-award-card').forEach(link=>{
    const target=link.getAttribute('href');
    const params=new URLSearchParams(window.location.search);
    params.set('category','All');
    link.href=`/stats?${params}${target}`;
  });
  if(document.querySelector('.league-explorer')) document.querySelector('[data-nav-hub="league"]')?.classList.add('active');
  document.querySelector('#league-player-search')?.addEventListener('input',event=>{
    const term=event.target.value.trim().toLowerCase();
    let count=0;
    document.querySelectorAll('[data-player-card]').forEach(card=>{card.hidden=!card.dataset.search.includes(term);if(!card.hidden)count++;});
    document.querySelector('#league-player-count').textContent=`${count} players${term?' found':''}`;
    document.querySelector('#league-player-no-results').hidden=count>0||!term;
  });
}
