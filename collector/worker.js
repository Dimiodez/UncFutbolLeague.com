import {collectLeagues} from '../functions/_lib/league-collector.js';
export default {async scheduled(event,env,ctx){ctx.waitUntil(collectLeagues(env));},async fetch(){return new Response('UFL preview scheduled collector. No public write endpoint.',{status:200});}};
