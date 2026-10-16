import {buildLeagueSchedule,fixtureCandidates} from '../league-engine.js';
import {eaTrialSettings} from '../league-ea-trial.js';
const draft=buildLeagueSchedule(eaTrialSettings()),games=new Map(),feeds=[];
for(const team of draft.settings.teams){const response=await fetch(`https://ufl-major-update-preview.pages.dev/api/ea/clubs/${team.eaClubId}/matches`);const data=await response.json();feeds.push({club:team.eaClubId,status:response.status,feeds:data.feeds});for(const game of data.matches||[])games.set(String(game.matchId),game);}
const matches=[],unresolved=[];
for(const fixture of draft.fixtures){const found=fixtureCandidates(fixture,[...games.values()],{timeZone:draft.settings.timeZone});if(found.candidates.length===1)matches.push(found.candidates[0]);else unresolved.push({fixture:fixture.id,home:fixture.home.name,away:fixture.away.name,status:found.status});}
console.log(JSON.stringify({trialSchedule:draft.settings.trialSchedule,capturedAt:new Date().toISOString(),source:'EA match history retrieved through preview relay/direct fallback; not VA',matches,unresolved,feeds}));
