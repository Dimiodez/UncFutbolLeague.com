import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';
const source=fs.readFileSync(new URL('../player-photo-review.js',import.meta.url),'utf8');

function setup({canReview=true,failPublish=false}={}){
  const nodes=new Map(),calls=[],cards=[],appended=[];let published=false;
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:selector==='[data-photo-bg]'?'#ffffff':'',hidden:selector==='.photo-editor',disabled:selector==='[data-photo-publish]',files:[],handlers:{},classList:{toggle(){}},addEventListener(type,handler){this.handlers[type]=handler;},reset(){},getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback){callback(new Blob(['formatted'],{type:'image/png'}));}});return nodes.get(selector);};
  const art={isConnected:true,dataset:{playerPhotoId:'six-profile',playerPhotoIdentity:'shared-player',playerPhotoName:'Example Player'},image:null,querySelector(){return this.image;},prepend(image){this.image=image;}};
  const other={...art,dataset:{...art.dataset,playerPhotoId:'ten-profile'},image:null};cards.push(art,other);
  const root={dataset:{},isConnected:true,innerHTML:'',querySelector:node,querySelectorAll(){return [...nodes.values()];}};
  const host={append(value){appended.push(value);}};
  const main={querySelector(selector){if(selector==='[data-player-photo-id]')return art;if(selector==='[data-player-photo-panel]')return appended.find(p=>Object.hasOwn(p.dataset,'playerPhotoPanel'))||null;if(selector==='.league-explorer')return host;return null;}};
  const document={querySelector:()=>main,querySelectorAll:()=>cards,createElement:()=>root};
  class FakeImage{getAttribute(name){return name==='src'?this.src:null;}set src(value){this._src=value;this.onload?.();}get src(){return this._src;}remove(){for(const card of cards)if(card.image===this)card.image=null;}}
  const context=vm.createContext({document,location:{pathname:'/players/six-profile'},getAuthState:async()=>({user:{role:'admin'}}),escapeHtml:String,FormData,Blob,Date,Image:FakeImage,createImageBitmap:async()=>({width:1024,height:1024,close(){}}),fetch:async(url,options={})=>{
    calls.push({url,...options});
    if(url==='/api/player-portraits')return {ok:true,json:async()=>published?{portraits:{},byIdentity:{'shared-player':'/api/player-portraits/shared-player?v=new'}}:{portraits:{},byIdentity:{}}};
    if(url.startsWith('/api/admin/player-photos?'))return {ok:true,json:async()=>({canReview,photos:[]})};
    if(url==='/api/admin/player-photos/publish'){if(failPublish)return {ok:false,json:async()=>({error:'Storage unavailable'})};published=true;return {ok:true,json:async()=>({ok:true})};}
    throw new Error(`Unexpected request ${url}`);
  }});
  vm.runInContext(source,context);
  return {context,root,node,calls,cards};
}

test('admin chooses a local file, previews it, and publishes once without requesting approval',async()=>{
  const {context,root,node,calls,cards}=setup();await vm.runInContext('hydratePlayerPhotos()',context);
  assert.match(root.innerHTML,/No separate approval request/);assert.match(root.innerHTML,/Publish photo/);assert.ok(!root.innerHTML.includes('Upload for review'));
  const input=node('input[type=file]'),publish=node('[data-photo-publish]');assert.equal(publish.disabled,true);
  const file=new File(['original'],'player.png',{type:'image/png'});input.files=[file];input.value='player.png';
  await input.handlers.change();assert.equal(input.value,'player.png');assert.equal(publish.disabled,false);assert.equal(node('.photo-editor').hidden,false);
  assert.equal(calls.filter(c=>c.method==='POST').length,0,'preview must not upload');
  await node('form').handlers.submit({preventDefault(){}});
  const writes=calls.filter(c=>c.method==='POST');assert.equal(writes.length,1);assert.equal(writes[0].url,'/api/admin/player-photos/publish');assert.equal(writes[0].body.get('playerId'),'six-profile');assert.equal(writes[0].body.get('photo').name,'player.png');
  assert.equal(publish.disabled,true);assert.equal(node('.photo-editor').hidden,true);assert.match(node('.photo-status').textContent,/published.*all teams/);
  assert.equal(cards[0].image.src,cards[1].image.src);assert.match(cards[0].image.src,/shared-player/);
});

test('failed publication keeps the preview and an actionable error for retry',async()=>{
  const {context,node}=setup({failPublish:true});await vm.runInContext('hydratePlayerPhotos()',context);
  node('input[type=file]').files=[new File(['original'],'player.png',{type:'image/png'})];await node('input[type=file]').handlers.change();await node('form').handlers.submit({preventDefault(){}});
  assert.equal(node('.photo-status').textContent,'Storage unavailable');assert.equal(node('.photo-editor').hidden,false);assert.equal(node('[data-photo-publish]').disabled,false);
});

test('manager form remains submission-only and cannot expose the staff publish flow',async()=>{
  const {context,root}=setup({canReview:false});await vm.runInContext('hydratePlayerPhotos()',context);
  assert.match(root.innerHTML,/Submit for approval/);assert.ok(!root.innerHTML.includes('data-photo-publish'));
});

test('an empty public photo list never invents or publishes a portrait',async()=>{
  const {context,cards}=setup();vm.runInContext("leaguePlayerPhotoState.byIdentity={'shared-player':'/old'}",context);
  await vm.runInContext('refreshPublishedPlayerPhotos()',context);assert.equal(cards[0].image,null);assert.equal(cards[1].image,null);
});
