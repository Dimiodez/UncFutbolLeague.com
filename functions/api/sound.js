import {soundApi} from '../_lib/sound.js';

export async function onRequest({request,env}) {
  return soundApi(request,env);
}
