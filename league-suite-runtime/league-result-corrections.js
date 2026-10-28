import {DETAIL_FIELDS,PLAYER_POSITIONS,numeric,clubPlayers} from './league-player-stats.js';
export function correctFixture(draft,fixtureId,values,{actor='Workshop editor',now=new Date().toISOString()}={}){
 const fixture=draft.fixtures.find(f=>f.id===fixtureId);if(!fixture)throw Error('Unknown fixture.');
 const reason=String(values.reason||'').trim();if(reason.length<5||reason.length>500)throw Error('Enter a correction reason (5–500 characters).');
 const score=v=>{if(v===''||v===null||v===undefined||!Number.isInteger(Number(v))||Number(v)<0||Number(v)>100)throw Error('Enter both scores (0–100).');return Number(v);};
 const previous=(draft.acceptedResults||[]).find(r=>r.fixtureId===fixtureId),appearances=values.appearances??previous?.appearances??[];
 if(!Array.isArray(appearances)||appearances.length>50)throw Error('Too many player entries.');
 const seen=new Set();for(const p of appearances){if(!p.playerId||seen.has(p.playerId)||!p.name?.trim()||p.name.length>100||![fixture.home.id,fixture.away.id].includes(p.teamId)||!PLAYER_POSITIONS.includes(p.position||'UNK')||p.rating!==null&&(numeric(p.rating)===null||p.rating>10)||['goals','assists'].some(k=>p[k]!==null&&numeric(p[k])===null)||Object.entries(p.details||{}).some(([k,v])=>!DETAIL_FIELDS.includes(k)||v!==null&&numeric(v)===null))throw Error('Invalid player stats. Use blank for unavailable and nonnegative numbers.');seen.add(p.playerId);}
 const correction={reason,actor,at:now,statsReview:values.statsReview===true};
 const result={...(previous||{}),fixtureId,matchId:previous?.matchId||`manual:${fixtureId}`,timestamp:previous?.timestamp||fixture.startsAt,homeScore:score(values.homeScore),awayScore:score(values.awayScore),finish:values.finish||previous?.finish||'standard',appearances:appearances.map(p=>({...p,position:p.position||'UNK',teamName:[fixture.home,fixture.away].find(t=>t.id===p.teamId).name})),correction,eaOriginal:previous?.eaOriginal||(previous?{homeScore:previous.homeScore,awayScore:previous.awayScore,appearances:previous.appearances}:null),history:[...(previous?.history||[]),{...correction,before:previous?{homeScore:previous.homeScore,awayScore:previous.awayScore,appearances:previous.appearances}:null}].slice(-30)};
 if(draft.settings.scoringMode==='noDraws'&&result.homeScore===result.awayScore)throw Error('This league does not allow draws.');
 if(!['standard','regular','extraTime'].includes(result.finish))throw Error('Invalid match finish.');
 if((draft.settings.trialSchedule||draft.settings.collectionEnabled)&&draft.settings.scoringMode!=='noDraws')result.finish='standard';
 return {...draft,acceptedResults:[...(draft.acceptedResults||[]).filter(r=>r.fixtureId!==fixtureId),result]};
}
export function applyConfirmedTrialCorrection(draft){const result=draft.acceptedResults?.find(r=>r.matchId==='106222996430420');if(draft.settings.trialSchedule!=='ufl-6v6-20261015'||!result||result.correction)return draft;return correctFixture(draft,result.fixtureId,{homeScore:0,awayScore:0,reason:'Owner confirmed 0–0 at regulation; forced quit when extra time began. EA quit score is not the league result.',statsReview:true},{actor:'Owner confirmation · October 16',now:'2026-10-16T12:00:00Z'});}
export function needsResultReview(game){
 const clubs=Object.entries(game.clubs||{}),scores=clubs.map(([,c])=>numeric(c.goals??c.score));
 if(scores.length!==2||!scores.includes(3)||!scores.includes(0))return false;
 // A 3–0 score or DNF flag alone does not establish a quit. Check the actual
 // human players on both teams; blank/invalid ratings and 3.0 need review.
 return clubs.some(([id])=>{const players=clubPlayers(game,id).filter(([,p])=>String(p?.playername??p?.name??'').trim());return !players.length||players.some(([,p])=>{const r=numeric(p.rating);return r===null||r<=0||r>10||r===3;});});
}
