import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const header=html=>html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0].replace(/\s+/g,' ').trim();

test('every Suite page preserves the complete homepage header before JavaScript loads',()=>{
 const expected=header(read('index.html'));assert(expected);
 for(const name of ['league-workshop','ea-clubs','league-dashboard','league-join','league-centre']){
  const html=read('league-suite-assets/'+name+'.html');
  assert.equal(header(html),expected,name);
  assert.match(html,/data-standalone-navigation="true"/);
  assert.match(html,/href="\/styles\.css/);
  assert.match(html,/src="\/navigation-ux\.js/);
  assert.match(html,name==='league-centre'?/id="main"/:/id="workshop-main"/);
 }
 const brand=read('league-suite-assets/league-workshop-brand.js');
 assert.doesNotMatch(brand,/createElement\('header'\)|workshop-public-links|workshop-site-links|workshop-theme-label/);
 assert.doesNotMatch(read('league-suite-assets/league-workshop-brand.css'),/\.site-header|\.brand[\s.{>]/);
 assert.equal(brand,read('league-suite-runtime/league-workshop-brand.js'));
});

test('Suite first paint does not advertise an unsecured preview or a broken EA route',()=>{
 const html=read('league-suite-assets/league-workshop.html');
 assert.match(html,/<h1>League Suite<\/h1>/);
 assert.doesNotMatch(html,/No login needed|not an access-controlled|league-suite\/league-suite\//);
});

test('League landing exposes the private Suite entry only after successful access checks',async()=>{
 const app=read('app.js'),start=app.indexOf('async function hydrateAccount()');
 const hydrate=app.slice(start,app.indexOf('  let adminNav',start))+'\n}';
 for(const [role,allowed,status,expected] of [['owner',true,200,true],['admin',true,200,true],['admin',false,200,false],['owner',true,403,false],['member',true,200,false],[null,true,200,false]]){
  const entry={hidden:true,isConnected:true,innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const account={},menu={links:[],append(link){this.links.push(link);}};
  const document={querySelector(s){return s==='#account-nav'?account:s==='[data-league-suite-entry]'?entry:menu;},querySelectorAll(){return[];},createElement(){return {dataset:{}};}};
  const state={authenticated:!!role,user:role?{role,displayName:'QA user'}:null};
  const context=vm.createContext({document,getAuthState:async()=>state,fetch:async()=>({ok:status===200,json:async()=>({allowed})})});
  await vm.runInContext(hydrate+'\nhydrateAccount();',context);
  assert.equal(!entry.hidden,expected,role+' '+allowed+' '+status);
  assert.equal(menu.links.length,expected?1:0);
  if(expected){assert.match(entry.innerHTML,/href="\/league-suite"/);assert.doesNotMatch(entry.innerHTML,/data-link/);}
 }
});

