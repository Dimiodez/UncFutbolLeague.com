import {liveTeamHub} from '../_lib/team-hub.js';
import {json} from '../_lib/auth.js';
export async function onRequest({request,env}){try{return await liveTeamHub(request,env);}catch(e){console.error('Team hub',String(e));return json({error:'Team hub unavailable. Your saved tactics have not been changed.'},503);}}
