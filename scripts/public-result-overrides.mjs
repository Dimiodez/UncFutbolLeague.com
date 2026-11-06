// Explicit owner decisions and provenance-tagged recovery of unposted real EA results.
export function applyPublicResultOverrides(season,overrides=[]){
 const entries=overrides.filter(o=>o.seasonKey===season.key);if(!entries.length)return season;
 const next=structuredClone(season);next.resultOverrides={...(next.resultOverrides||{})};
 const contribution=(own,other)=>Number.isInteger(own)&&Number.isInteger(other)?[1,own>other?1:0,own===other?1:0,own<other?1:0,own,other,own-other,own>other?3:own===other?1:0]:[0,0,0,0,0,0,0,0];
 for(const o of entries){
  if(!['forfeit','ea-recovery','review'].includes(o.kind)||!Number.isInteger(o.matchId)||!o.reason)throw Error('Invalid explicit result override');
  const match=next.weeks.flatMap(w=>w.matches).find(m=>m[0]===o.matchId);
  if(!match||match[1]!==o.home||match[2]!==o.away)throw Error('Owner override fixture identity mismatch');
  const before=[match[3],match[4]],providerBefore=next.resultOverrides[String(o.matchId)]?.providerScore||before;
  // A subsequently posted official VA result supersedes a temporary EA recovery/review.
  if(o.kind!=='forfeit'&&providerBefore.every(Number.isInteger)){delete next.resultOverrides[String(o.matchId)];continue;}
  if(o.kind==='review'){next.resultOverrides[String(o.matchId)]={...o,providerScore:providerBefore};continue;}
  if(![o.homeScore,o.awayScore].every(v=>Number.isInteger(v)&&v>=0)||o.kind==='ea-recovery'&&!/^\d+$/.test(o.eaMatchId||''))throw Error('Invalid recovered result evidence');
  for(const [team,oldOwn,oldOther,own,other]of [[o.home,before[0],before[1],o.homeScore,o.awayScore],[o.away,before[1],before[0],o.awayScore,o.homeScore]]){
   const row=next.standings.find(r=>r[0]===team);if(!row)throw Error('Override standings team missing');
   const old=contribution(oldOwn,oldOther),after=contribution(own,other);
   for(let i=0;i<8;i++){const delta=after[i]-old[i];row[i+1]+=delta;if(delta)next.ownerOverridesAffectStandings=true;}
  }
  match[3]=o.homeScore;match[4]=o.awayScore;next.resultOverrides[String(o.matchId)]={...o,providerScore:providerBefore};
 }
 next.standings.sort((a,b)=>b[8]-a[8]||b[7]-a[7]||b[5]-a[5]||String(a[0]).localeCompare(String(b[0])));return next;
}
