import {collectLeagues} from '../league-suite-runtime/functions/_lib/league-collector.js';
export default {
 async scheduled(event,env,ctx){ctx.waitUntil(collectLeagues(env));},
 async fetch(){return new Response('UFL scheduled test-league collector. No public write endpoint.');}
};
