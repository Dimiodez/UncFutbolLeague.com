import {teamRegistrationApi} from '../_lib/team-registration.js';
export const onRequest=({request,env})=>teamRegistrationApi(request,env);
