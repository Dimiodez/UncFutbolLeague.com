import {coachingApi} from '../../_lib/coaching.js';
export const onRequest=({request,env,params})=>coachingApi(request,env,params.id);
