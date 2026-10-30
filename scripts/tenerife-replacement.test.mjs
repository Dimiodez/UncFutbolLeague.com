import test from 'node:test';import assert from 'node:assert/strict';
import {buildLeagueSchedule,fixtureCandidates} from '../league-suite-runtime/league-engine.js';
import {eaTrialSettings} from '../league-suite-runtime/league-ea-trial.js';
import {hubTeams} from '../functions/_lib/team-hub.js';
import {previewLeagueResultsApi} from '../league-suite-runtime/functions/_lib/preview-league-results.js';

test('Tenerife replaces Italia under the same private hub identity and assignment key',()=>{
 const clubs=hubTeams().filter(t=>t.division==='6v6'),t=clubs.find(t=>t.id==='6v6:ITA');
 assert.equal(t.name,'UFL Tenerife');assert.equal(t.key,'ITA');assert.equal(clubs.filter(t=>t.name==='UFL Tenerife').length,1);assert(!clubs.some(t=>t.name==='UFL Italia'));
});

test('shared league responses retain the dated EA replacement for browser restoration',async()=>{
 const settings=eaTrialSettings(),replacement={from:'2026-10-29',previousId:'1663550',name:'UFL Tenerife'};settings.teams[0]={...settings.teams[0],name:'UFL Tenerife',eaClubId:'1996085',eaClubReplacement:replacement};
 const row={id:'test',draft_json:JSON.stringify({settings,acceptedResults:[]}),revision:1,enabled:1,health:null},env={DB:{prepare(){return {all:async()=>({results:[row]})};}}};
 const response=await previewLeagueResultsApi(new Request('https://test/api/league-results'),env),body=await response.json();assert.equal(response.status,200);assert.deepEqual(body.leagues[0].draft.settings.teams[0].eaClubReplacement,replacement);
});

test('date-aware replacement uses the old EA club for historical fixtures and Tenerife for October 29 onward',()=>{
 const settings=eaTrialSettings(),original=buildLeagueSchedule(settings).fixtures[0];
 settings.teams=settings.teams.map(t=>t.id==='team-1'?{...t,name:'UFL Tenerife',eaClubId:'1996085',eaClubReplacement:{from:'2026-10-29',previousId:'1663550',name:'UFL Tenerife'}}:t);
 const old={id:original.id,vaMatchId:'102',week:1,round:1,date:original.date,startsAt:original.startsAt,homeId:original.home.id,awayId:original.away.id};
 settings.vaSchedule={version:1,competitionId:1,seasonId:2,format:'6v6',fixtures:[old,{...old,id:'tenerife-current',vaMatchId:'122',week:3,round:5,date:'2026-10-29',startsAt:original.startsAt+14*86400000}]};
 const before=JSON.stringify(settings),draft=buildLeagueSchedule(settings),[past,current]=draft.fixtures;
 assert.equal(past.home.id,'team-1');assert.equal(past.home.eaClubId,'1663550');assert.equal(current.home.id,'team-1');assert.equal(current.home.eaClubId,'1996085');assert.equal(current.home.name,'UFL Tenerife');assert.equal(JSON.stringify(settings),before);
 const match=clubId=>({matchId:'today-match',timestamp:current.startsAt/1000+600,clubs:{[clubId]:{goals:1},[current.away.eaClubId]:{goals:0}}});
 assert.equal(fixtureCandidates(current,[match('1996085')],{timeZone:settings.timeZone}).candidates.length,1);assert.equal(fixtureCandidates(current,[match('1663550')],{timeZone:settings.timeZone}).candidates.length,0);
 settings.teams[0].eaClubReplacement.previousId='bad-id';assert.throws(()=>buildLeagueSchedule(settings),/replacement/);
});
