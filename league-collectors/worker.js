import {collectLeagues} from '../league-suite-runtime/functions/_lib/league-collector.js';
import {hostedFeedApi} from '../league-suite-runtime/functions/_lib/ea-hosted-feed.js';
export default {
 async scheduled(event,env,ctx){ctx.waitUntil(collectLeagues(env));},
 async fetch(request,env){const path=new URL(request.url).pathname;return ['/ea-fetch-plan','/ea-feed'].includes(path)?hostedFeedApi(request,env):new Response('UFL scheduled test-league collector.');}
};
