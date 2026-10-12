import {coachingApi} from '../_lib/coaching.js';
export const onRequest=({request,env})=>coachingApi(request,env);
