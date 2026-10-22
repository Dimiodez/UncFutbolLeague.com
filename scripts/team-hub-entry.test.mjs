import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../team-hub-entry.js',import.meta.url),'utf8');
function render(path,search,{already=false}={}){
 let entry=null,inserted=false,afterProfile=false;
 const profile={querySelector:selector=>selector==='h2'?{after:node=>{entry=node;inserted=true}}:null,after:()=>afterProfile=true};
 const main={querySelector:selector=>selector==='[data-private-hub-link]'?(already?{}:null):selector==='.league-club-profile'?profile:null};
 const context=vm.createContext({location:{pathname:path,search},URLSearchParams,decodeURIComponent,encodeURIComponent,document:{querySelector:()=>main,createElement:tag=>({tag,dataset:{},children:[],append(...nodes){this.children.push(...nodes)}})}});
 vm.runInContext(source.slice(0,source.indexOf('function startTeamHubEntry'))+'\ninstallTeamHubEntry();',context);
 return {entry,inserted,afterProfile};
}
test('private hub is a prominent primary action directly beside club identity',()=>{
 const result=render('/clubs/ROM','?season=2&division=6v6');
 assert.equal(result.inserted,true);assert.equal(result.afterProfile,false);
 const [link,note]=result.entry.children;
 assert.equal(link.className,'button button-primary');assert.equal(link.textContent,'Open Team Hub →');
 assert.equal(link.href,'/team-hub?team=6v6%3AROM');assert.match(note.textContent,/Team access required/);
});
test('entry preserves division context and avoids archive, unrelated and duplicate buttons',()=>{
 assert.equal(render('/clubs/MAY','?season=2&division=10v10').entry.children[0].href,'/team-hub?team=10v10%3AMAY');
 assert.equal(render('/clubs/ROM','?season=1&division=6v6').inserted,false);
 assert.equal(render('/players/ROM','?season=2').inserted,false);
 assert.equal(render('/clubs/ROM','?season=2',{already:true}).inserted,false);
});
test('mobile target and keyboard focus remain explicit',()=>{
 const css=fs.readFileSync(new URL('../league-pages.css',import.meta.url),'utf8');
 assert.ok(css.includes('.league-team-hub-entry .button.button-primary'));
 assert.ok(css.includes('min-height:48px'));assert.ok(css.includes('.button:focus-visible'));
 assert.ok(css.includes('.league-team-hub-entry .button.button-primary{width:100%'));
});
