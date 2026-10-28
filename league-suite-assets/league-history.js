import {VA_TEST_SOURCES} from './league-va-schedule.js';
import {correctFixture} from './league-result-corrections.js';
import {numeric,DETAIL_FIELDS,PLAYER_POSITIONS} from './league-player-stats.js';
const participants={
 'ufl-10v10-20261020':{'22':'ten-team-1','19':'ten-team-2','21':'ten-team-3','17':'ten-team-4','11':'ten-team-5','27':'ten-team-6','20':'ten-team-7','15':'ten-team-8'},
 'ufl-6v6-20261015':{'25':'team-1','14':'team-2','5':'team-3','18':'team-4','26':'team-5','8':'team-6','23':'team-7','7':'team-8','24':'team-9','16':'team-10'}
};
const nameKey=n=>String(n||'').toLowerCase().replace(/^ufl\s+/,'').replace(/ta6asco/g,'tabasco').replace(/[^a-z0-9]/g,'');
function verifyParticipants(draft,fixture,match){for(const side of ['home','away']){
 const id=match['participant_'+side+'_id'],participant=match['participant_'+side],team=fixture[side];
 if(id!==undefined?participants[draft.settings.trialSchedule]?.[String(id)]!==team.id:nameKey(participant?.name)!==nameKey(team.name))throw Error('Historical VA participants do not match the saved fixture.');
}}
function postedMatches(draft,props){
 const source=VA_TEST_SOURCES[draft.settings.trialSchedule];
 if(!source||props.competition?.id!==source.competitionId||props.season?.id!==source.seasonId)throw Error('Wrong historical VA season.');
 if(!Array.isArray(props.schedule?.matches))throw Error('Missing VA match history.');
 return new Map(props.schedule.matches.flatMap(g=>Object.values(g).filter(Array.isArray).flat()).filter(m=>m.posted_at&&Number.isFinite(Date.parse(m.posted_at))&&[m.participant_home_score,m.participant_away_score].every(n=>Number.isInteger(n)&&n>=0&&n<=100)).map(m=>[String(m.id),m]));
}
export function backfillVaScores(draft,props,{unavailableFixtures,beforeDate,maxRound=6,now=new Date().toISOString()}={}){
 if(!(unavailableFixtures instanceof Set)||!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate||'')||!Number.isFinite(Date.parse(now)))throw Error('EA-unavailable fixtures and a historical cutoff are required.');
 const matches=postedMatches(draft,props);let next=draft;
 for(const f of draft.fixtures){
  if(f.date>=beforeDate||f.startsAt>Date.parse(now)||f.round>maxRound||!unavailableFixtures.has(f.id)||(next.acceptedResults||[]).some(r=>r.fixtureId===f.id)||(draft.pendingResults||[]).some(p=>p.fixtureId===f.id))continue;
  const m=matches.get(f.vaMatchId);if(!m||Date.parse(m.posted_at)>Date.parse(now))continue;verifyParticipants(draft,f,m);
  next=correctFixture(next,f.id,{homeScore:m.participant_home_score,awayScore:m.participant_away_score,appearances:[],reason:'Owner-authorized VA historical score fallback: no match in current EA friendly history. Player statistics unavailable; no stats inferred.',statsReview:true},{actor:'Owner-authorized historical backfill',now});
  const r=next.acceptedResults.at(-1);r.matchId=`va:${props.competition.id}:${props.season.id}:${m.id}`;
  r.provenance={kind:'va-score-only',url:`https://ufl.virtualarena.app/matches/${m.id}`,vaMatchId:String(m.id),recordedAt:now,playerStats:'unavailable'};
 }
 return next;
}
export function reconcileHistory(draft,props,{now=Date.now(),maxRound=6}={}){
 const matches=postedMatches(draft,props),differences=[],missing=[];let compared=0,matched=0;
 for(const f of draft.fixtures){if(f.startsAt>now||f.round>maxRound)continue;const m=matches.get(f.vaMatchId);if(!m||Date.parse(m.posted_at)>now)continue;
  verifyParticipants(draft,f,m);const r=(draft.acceptedResults||[]).find(r=>r.fixtureId===f.id);if(!r){missing.push(f.id);continue;}compared++;
  if(r.homeScore===m.participant_home_score&&r.awayScore===m.participant_away_score)matched++;
  else differences.push({fixtureId:f.id,date:f.date,home:f.home.name,away:f.away.name,recordedScore:[r.homeScore,r.awayScore],vaScore:[m.participant_home_score,m.participant_away_score],protectedManual:!!r.correction});
 }
 return {checkedAt:new Date(now).toISOString(),throughRound:maxRound,source:'VA posted scores compared with accepted test results; reviewed results preserved',compared,matched,differences,missing,scoreOnlyFixtures:(draft.acceptedResults||[]).filter(r=>r.provenance?.kind==='va-score-only').map(r=>r.fixtureId)};
}
export function checkedProvenance(value,fixture){
 if(value===undefined)return undefined;
 const full=value?.kind==='va-match-report';
 if(!value||!['va-score-only','va-match-report'].includes(value.kind)||value.vaMatchId!==fixture.vaMatchId||value.url!==`https://ufl.virtualarena.app/matches/${fixture.vaMatchId}`||value.playerStats!==(full?'reported':'unavailable')||!Number.isFinite(Date.parse(value.recordedAt))||full&&!Number.isFinite(Date.parse(value.postedAt)))throw Error('Invalid saved result provenance.');
 return {kind:value.kind,vaMatchId:value.vaMatchId,url:value.url,playerStats:value.playerStats,recordedAt:value.recordedAt,...(full?{postedAt:value.postedAt}:{})};
}

// Explicit owner-selected historical reconciliation only. The collector never
// calls this: future collection remains EA-based. Exact same-game EA names
// establish identities; unmatched identities stop the reconciliation.
export function reconcileVaMatchReport(draft,fixtureId,props,{actor,now=new Date().toISOString()}={}){
 const f=draft.fixtures.find(f=>f.id===fixtureId),previous=(draft.acceptedResults||[]).find(r=>r.fixtureId===fixtureId),source=VA_TEST_SOURCES[draft.settings.trialSchedule],m=props?.match;
 if(!f||!previous||!actor||!Number.isFinite(Date.parse(now)))throw Error('An existing fixture and explicit reconciliation actor are required.');
 if(!source||props.competition?.id!==source.competitionId||props.season?.id!==source.seasonId||m?.competition_season_id!==source.seasonId||String(m?.id)!==f.vaMatchId||!Number.isFinite(Date.parse(m.posted_at))||Date.parse(m.posted_at)>Date.parse(now))throw Error('Wrong or unposted VA match report.');
 verifyParticipants(draft,f,m);
 const score=n=>Number.isInteger(n)&&n>=0&&n<=100;
 if(!score(m.participant_home_score)||!score(m.participant_away_score))throw Error('VA must supply both recorded scores.');
 const aliases={shots:'shots',passes:'total_passes',passesCompleted:'successful_passes',tackles:'total_tackles',tacklesWon:'successful_tackles',saves:'saves',redCards:'red_card',manOfTheMatch:'motm'},appearances=[],seen=new Set();
 for(const side of ['home','away']){
  const team=f[side],stats=m[`participant_${side}_stats`],lineup=Object.values(m[`participant_${side}_lineup`]?.players||{});
  if(!stats||typeof stats!=='object')throw Error('VA player sheet unavailable.');
  for(const [userId,s] of Object.entries(stats)){
   if(!s||typeof s!=='object'||!['goals','assists','match_rating','total_passes','total_tackles','shots'].some(k=>numeric(s[k])!==null))continue;
   const exact=String(s.player_name||'').normalize('NFKC').trim().toLowerCase();
   const candidates=previous.appearances.filter(p=>p.teamId===team.id&&exact&&p.name.normalize('NFKC').trim().toLowerCase()===exact);
   if(candidates.length!==1||seen.has(candidates[0].playerId))throw Error(`VA player identity is not uniquely linked: ${s.player_name||userId}`);
   const old=candidates[0],position=String(s.position||old.position||'UNK').toUpperCase();
   if(!PLAYER_POSITIONS.includes(position))throw Error('Unknown VA position.');
   const value=k=>{const raw=s[k];if(raw===null||raw===undefined||raw==='')return null;if(typeof raw==='boolean')return Number(raw);const n=numeric(raw);if(n===null)throw Error('Invalid VA numeric statistic.');return n;};
   const rating=value('match_rating');if(rating!==null&&rating>10)throw Error('Invalid VA match rating.');
   const registered=lineup.find(p=>String(p.id)===userId);
   appearances.push({...old,position,rating,goals:value('goals'),assists:value('assists'),details:Object.fromEntries(DETAIL_FIELDS.map(k=>[k,aliases[k]?value(aliases[k]):null])),vaReport:{userId,registeredName:registered?.name||'',position:s.position||null,goalkeeperCleansheet:s.goalkeeper_cleansheet??null,defenderCleansheet:s.defender_cleansheet??null,dnf:s.dnf??null}});
   seen.add(old.playerId);
  }
 }
 if(!appearances.length)throw Error('VA report has no comparable player statistics.');
 if(previous.provenance?.kind==='va-match-report'&&previous.provenance.vaMatchId===f.vaMatchId&&previous.homeScore===m.participant_home_score&&previous.awayScore===m.participant_away_score&&JSON.stringify(previous.appearances)===JSON.stringify(appearances))return draft;
 const reason=`Owner selected VA match ${m.id} as the recorded score and player-stat source for this historical fixture.`;
 const corrected=correctFixture(draft,fixtureId,{homeScore:m.participant_home_score,awayScore:m.participant_away_score,appearances,reason,statsReview:false},{actor,now});
 const result=corrected.acceptedResults.find(r=>r.fixtureId===fixtureId);
 result.provenance={kind:'va-match-report',vaMatchId:f.vaMatchId,url:`https://ufl.virtualarena.app/matches/${f.vaMatchId}`,playerStats:'reported',recordedAt:now,postedAt:m.posted_at};
 // Keep the original result order and every other fixture byte-for-byte intact.
 return {...corrected,acceptedResults:draft.acceptedResults.map(r=>r.fixtureId===fixtureId?result:r)};
}
