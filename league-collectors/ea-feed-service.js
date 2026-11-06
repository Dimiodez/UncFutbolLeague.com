import {WorkerEntrypoint} from 'cloudflare:workers';
import {requestHostedFriendly} from '../league-suite-runtime/functions/_lib/ea-bot-feed.js';
// RPC methods are exposed only through configured Cloudflare service bindings.
export class EaFeedService extends WorkerEntrypoint {
 async friendlyFeed(request){return requestHostedFriendly(this.env,request,{schedule:promise=>this.ctx.waitUntil(promise)});}
}
