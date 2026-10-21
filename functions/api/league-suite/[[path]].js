import {suiteAccess,suiteAccessApi,suiteDenied,privateSuiteResponse} from '../../_lib/league-suite-access.js';
import {previewLeagueResultsApi} from '../../../league-suite-runtime/functions/_lib/preview-league-results.js';
import {previewDraftsApi} from '../../../league-suite-runtime/functions/_lib/preview-drafts.js';
import {previewEaApi} from '../../../league-suite-runtime/functions/_lib/preview-ea.js';
import {previewRegistrationApi} from '../../../league-suite-runtime/functions/_lib/preview-registration.js';
import {previewAwardsApi} from '../../../league-suite-runtime/functions/_lib/preview-awards.js';
import {previewTeamHubApi} from '../../../league-suite-runtime/functions/_lib/preview-team-hub.js';
export async function onRequest({request,env}){
 const url=new URL(request.url),path=url.pathname.replace('/api/league-suite/','');
 if(path==='access')return suiteAccessApi(request,env);
 const access=await suiteAccess(request,env);if(!access.allowed)return suiteDenied(access);
 if(!env.LEAGUE_SUITE_DB)return new Response('Suite test storage unavailable',{status:503});
 const scoped={...env,DB:env.LEAGUE_SUITE_DB,SUITE_ACTOR:access.user};
 const handlers={'league-results':previewLeagueResultsApi,drafts:previewDraftsApi,registration:previewRegistrationApi,awards:previewAwardsApi,'team-hub':previewTeamHubApi};
 url.pathname='/api/'+path;const internal=new Request(url,request),handler=path.startsWith('ea/')?previewEaApi:handlers[path];
 return handler?privateSuiteResponse(await handler(internal,scoped)):new Response('Not found',{status:404});
}
