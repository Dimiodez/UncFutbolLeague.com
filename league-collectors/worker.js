import {collectLeagues} from '../league-suite-runtime/functions/_lib/league-collector.js';
import {hostedFeedApi} from '../league-suite-runtime/functions/_lib/ea-hosted-feed.js';
import {ensureHostedTransport} from '../league-suite-runtime/functions/_lib/ea-transport-watchdog.js';
export default {
 async scheduled(event,env,ctx){ctx.waitUntil((async()=>{let transport;try{transport=await ensureHostedTransport(env);}catch(error){transport={status:'watchdog-error',error:String(error.message)};console.error(JSON.stringify({event:'ea_transport_watchdog',...transport}));}await collectLeagues(env,{transport});})());},
 async fetch(request,env){const path=new URL(request.url).pathname;return ['/ea-fetch-plan','/ea-feed'].includes(path)?hostedFeedApi(request,env):new Response('UFL scheduled test-league collector.');}
};

export {EaFeedService} from './ea-feed-service.js';
