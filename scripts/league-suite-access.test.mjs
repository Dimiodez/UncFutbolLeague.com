import test from 'node:test';import assert from 'node:assert/strict';
import {suiteAccess,suiteAccessApi} from '../functions/_lib/league-suite-access.js';
import {onRequest as suitePage} from '../functions/league-suite.js';
import {onRequest as suiteSubpage} from '../functions/league-suite/[[path]].js';
import {onRequest as suiteAsset} from '../functions/league-suite-assets/[[path]].js';
import {onRequest as suiteApi} from '../functions/api/league-suite/[[path]].js';
const req=(path='/league-suite',method='GET',input,origin='https://www.uncfutbolleague.com')=>new Request('https://www.uncfutbolleague.com'+path,{method,headers:{cookie:'__Host-ufl_session=test',origin},...(input?{body:JSON.stringify(input)}:{})});
function env(role='owner',enabled=0){let setting=enabled;return {DB:{prepare(sql){return {bind(...args){this.args=args;return this;},async first(){return sql.includes('FROM sessions')?role?{discord_id:'123',role,status:'active'}:null:{admins_enabled:setting};},async run(){setting=this.args[0];return {meta:{changes:1}};}};}},ASSETS:{fetch:async()=>new Response('Private suite')}};}
test('suite defaults to owner only and rejects public/member/admin page, assets and API access',async()=>{
 for(const role of [null,'member','manager','admin']){const e=env(role);assert.equal((await suiteAccess(req(),e)).allowed,false);assert([401,403].includes((await suitePage({request:req(),env:e})).status));assert([401,403].includes((await suiteAsset({request:req(),env:e,next:()=>{throw Error('Static asset leaked');}})).status));assert([401,403].includes((await suiteApi({request:req('/api/league-suite/league-results'),env:e})).status));}
 assert.equal((await suitePage({request:req(),env:env('owner')})).status,200);
});
test('only owner may enable admins; revoked and other roles remain denied; cross-origin writes rejected',async()=>{
 for(const role of [null,'member','admin'])assert.equal((await suiteAccessApi(req('/api/league-suite/access','POST',{adminsEnabled:true}),env(role,1))).status,403);
 const e=env();assert.equal((await suiteAccessApi(req('/api/league-suite/access','POST',{adminsEnabled:true}),e)).status,200);
 assert.equal((await suiteAccess(req(),env('admin',1))).allowed,true);assert.equal((await suiteAccess(req(),env('admin',0))).allowed,false);
 assert.equal((await suiteAccess(req(),env('manager',1))).allowed,false);
 assert.equal((await suiteAccessApi(req('/api/league-suite/access','POST',{adminsEnabled:true},'https://evil.example'),e)).status,403);
 const page=await suitePage({request:req(),env:e});assert.match(page.headers.get('cache-control'),/no-store/);
});
test('optional catch-all serves signed-in suite entry and exact subpages instead of shadowing entry with 404',async()=>{
 const paths={'/league-suite':'league-workshop.html','/league-suite/':'league-workshop.html','/league-suite/dashboard':'league-dashboard.html','/league-suite/ea-clubs':'ea-clubs.html','/league-suite/join':'league-join.html'};
 for(const role of ['owner','admin'])for(const [path,file] of Object.entries(paths)){
  const e=env(role,1);let requested;
  e.ASSETS.fetch=async request=>{requested=new URL(request.url).pathname;return new Response('Private suite HTML');};
  const response=await suiteSubpage({request:req(path),env:e});
  assert.equal(response.status,200,`${role} ${path}`);assert.equal(requested,'/league-suite-assets/'+file.replace(/\.html$/,''));assert.match(response.headers.get('cache-control'),/no-store/);
 }
 for(const role of [null,'member','manager'])assert([401,403].includes((await suiteSubpage({request:req(),env:env(role,1)})).status));
 assert.equal((await suiteSubpage({request:req(),env:env('admin',0)})).status,403);
 for(const path of ['/league-suite/missing','/league-suite/dashboard/extra','/league-suite/toString'])assert.equal((await suiteSubpage({request:req(path),env:env()})).status,404);
});

