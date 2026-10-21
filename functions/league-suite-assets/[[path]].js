import {suiteAccess,suiteDenied,privateSuiteResponse} from '../_lib/league-suite-access.js';
export async function onRequest(context){const access=await suiteAccess(context.request,context.env);if(!access.allowed)return suiteDenied(access);return privateSuiteResponse(await context.next());}
