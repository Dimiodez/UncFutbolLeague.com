// Shared calendar rotation: Monday 00:00 UTC, independent of visitor storage.
const featuredClubConfig = { season:'2', firstClub:'ROM', firstDivision:'6v6', startsAt:'2026-09-28T00:00:00Z' };

function featuredClubSelection(now = new Date()) {
  const week=Math.max(0,Math.floor((now.getTime()-Date.parse(featuredClubConfig.startsAt))/604800000));
  const divisions=[featuredClubConfig.firstDivision,featuredClubConfig.firstDivision==='6v6'?'10v10':'6v6'];
  const division=divisions[week%2];
  const entries=(leagueProvisionalSeasons[division]?.clubs||[]).map(club=>({division,key:club.key}));
  if(division===featuredClubConfig.firstDivision) {
    const first=entries.findIndex(club=>club.key===featuredClubConfig.firstClub);
    if(first>0) entries.unshift(...entries.splice(first,1));
  }
  // Each division advances only on its own weeks and wraps independently.
  const turn=Math.floor(week/2);
  return entries.length?entries[turn%entries.length]:null;
}

function featuredClubSection(now = new Date()) {
  const selected=featuredClubSelection(now);
  if(!selected) return '';
  const context=leagueViewContext(new URLSearchParams({season:featuredClubConfig.season,division:selected.division}));
  const club=leagueClubVisual(selected.key,context.season);
  const roster=context.players.filter(player=>player.club===selected.key);
  const captains=roster.filter(player=>player.role==='captain').slice(0,3);
  const displayed=captains.length?captains:roster.slice(0,3);
  const row=context.season?.standings?.find(item=>item[0]===selected.key);
  // A zero-game registration table is not yet a meaningful league ranking.
  const ranked=!!row&&context.season.standings.some(item=>item[1]>0);
  const played=row?.[1]??null;
  const fixtures=(context.season?.weeks||[]).flatMap(week=>(week.matches||[]).filter(match=>match[1]===selected.key||match[2]===selected.key).map(match=>({match,at:week.scheduledAt,date:week.date})));
  const results=fixtures.filter(({match})=>Number.isFinite(match[3])&&Number.isFinite(match[4])).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,3);
  const recent=results.length?`<ul>${results.map(({match})=>`<li>${escapeHtml(leagueTeam(match[1],context.season)[0])} <b>${match[3]}–${match[4]}</b> ${escapeHtml(leagueTeam(match[2],context.season)[0])}</li>`).join('')}</ul>`:'<p>Awaiting published results.</p>';
  const portrait=player=>typeof player.portrait==='string'?player.portrait:`/assets/league/player-${player.id}.jpg`;
  return `<section class="section home-featured-club" aria-labelledby="featured-club-title"><div class="featured-heading"><div><span class="section-kicker">Club of the week</span><h2 id="featured-club-title">Inside the clubhouse.</h2></div><span class="season-chip">Season ${context.selected.id} · ${selected.division}</span></div><article class="featured-club"><div class="featured-club-art"><img src="${escapeHtml(club.image)}" alt="${escapeHtml(club.name)} stadium artwork"><div class="featured-club-identity"><img src="${escapeHtml(club.logo)}" alt="${escapeHtml(club.name)} crest"><div><span>Weekly spotlight</span><h3>${escapeHtml(club.name)}</h3><a class="button button-primary" href="${leagueViewLink(`/clubs/${selected.key}`,context)}" data-link>Explore the club</a></div></div></div><div class="featured-club-content"><div class="featured-numbers">${[['Position',ranked?`#${context.season.standings.indexOf(row)+1}`:'—'],['Points',row?.[8]??'—'],['Goal difference',row?signed(row[7]):'—'],['Squad',roster.length]].map(([label,value])=>`<div><strong>${value}</strong><span>${label}</span></div>`).join('')}</div><p class="sync-note">${ranked?'Committed season snapshot.':'Season preparing · rankings and match data pending.'}</p><div class="featured-squad-heading"><h3>${captains.length?'Meet the captains':'Meet the squad'}</h3><a href="${leagueViewLink('/players',context,`&club=${selected.key}`)}" data-link>Full squad</a></div><div class="featured-captains">${displayed.map(player=>`<a href="${leagueViewLink(`/players/${player.id}`,context)}" data-link>${player.portrait?`<img src="${escapeHtml(portrait(player))}" alt="${escapeHtml(player.displayName||player.name)}" loading="lazy">`:'<span class="featured-player-placeholder" aria-hidden="true">UFL</span>'}<div><span class="section-kicker">${player.role==='captain'?'Captain':'Player'}</span><strong>${escapeHtml(player.displayName||player.name)}</strong><small>${escapeHtml(player.name)}</small></div></a>`).join('')}</div><div class="featured-match-panels"><div><h3>Recent results</h3>${recent}<a href="/schedules?season=${context.selected.id}&type=${selected.division}" data-link>Fixtures and results</a></div><div><h3>Club stats</h3><p>${played!==null?`${played} played · ${row[2]} wins · ${row[3]} draws · ${row[4]} losses`:'Awaiting match data.'}</p><a href="${leagueViewLink('/stats',context)}" data-link>Season stats</a><a href="${leagueViewLink('/standings',context)}" data-link>League standings</a></div></div></div></article><p class="featured-rotation-note">A new club every Monday · alternating 6v6 and 10v10 · no repeats until each division completes its rotation.</p></section>`;
}
