// Local-only synthetic UI preview. Mutations below affect memory only, never production.
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {buildLeagueSchedule} from '../league-suite-assets/league-engine.js';
import {eaTrialSettings} from '../league-suite-assets/league-ea-trial.js';
import {siteRoot,isPublicFile} from './publication.mjs';
import {linkDraftTeamClub} from '../league-suite-assets/league-team-linking.js';
const pages={'/league-suite':'league-workshop','/league-suite/':'league-workshop','/league-suite/ea-clubs':'ea-clubs','/league-suite/dashboard':'league-dashboard','/league-suite/join':'league-join'};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const fixtureContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(siteRoot,'pickems-app/season-data.js'),'utf8'),fixtureContext);
const qaSettings={...eaTrialSettings(),trialSchedule:undefined,serverLeagueId:'qa-team-link-20261112',league:'QA Team linking',season:'Local QA',collectionEnabled:true};
let qaDraft=buildLeagueSchedule(qaSettings),qaRevision=1;
const qaClub={id:'9000001',name:'QA National FC',platform:'common-gen5',verifiedAt:'2026-11-12T19:00:00.000Z'},qaNations=[{id:'ITA',name:'Italy',eaClubId:null},{id:'FRA',name:'France',eaClubId:null}];
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4197');
 const mockPosts=['/api/league-suite/ea/verify','/api/league-suite/ea/team-link','/api/league-suite/international-setup'];
 if(req.method==='POST'&&mockPosts.includes(url.pathname)){
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096){res.writeHead(413);res.end('Too large');return;}}
  try{const payload=JSON.parse(raw);if(payload.club?.id!==qaClub.id)throw Error('Choose the synthetic QA club.');
   let note='Synthetic selection verified; no production data changed.';
   if(url.pathname.endsWith('/team-link')){if(payload.revision!==qaRevision)throw Error('QA revision changed. Refresh.');qaDraft=linkDraftTeamClub(qaDraft,payload.teamId,qaClub);qaRevision++;note='Linked to the synthetic shared league.';}
   if(url.pathname.endsWith('/international-setup')){const team=qaNations.find(t=>t.id===payload.teamId);if(!team||team.eaClubId!==payload.expectedClubId)throw Error('QA national team changed. Refresh.');if(qaNations.some(t=>t.id!==team.id&&t.eaClubId===qaClub.id))throw Error('EA club already linked to another national team.');team.eaClubId=qaClub.id;note='National club linked in local QA memory only.';}
   res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({linked:true,verified:true,club:qaClub,revision:qaRevision,note}));
  }catch(error){res.writeHead(409,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}));}return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(403);res.end('Read-only local preview');return;}
 let body,type='application/json',status=200;
 if(url.pathname==='/api/auth/session')body=JSON.stringify({configured:true,authenticated:true,user:{id:'local-qa',role:'owner',displayName:'Local QA Owner'}});
 else if(url.pathname==='/api/league-suite/access')body=JSON.stringify({allowed:true,owner:true,adminsEnabled:true});
 else if(url.pathname==='/api/league-suite/drafts')body=JSON.stringify({account:{id:'local-qa',name:'Local QA Owner'},revision:null,draft:null});
 else if(url.pathname==='/api/league-suite/league-results')body=JSON.stringify({leagues:[{id:qaDraft.settings.serverLeagueId,draft:qaDraft,revision:qaRevision,checked_at:'2026-11-12 19:00:00',health:{polling:false}}]});
 else if(url.pathname==='/api/league-suite/ea/search')body=JSON.stringify({clubs:[qaClub],source:'Synthetic local QA'});
 else if(url.pathname==='/api/league-suite/international-setup')body=JSON.stringify({competition:{id:'ufl-internationals',name:'Internationals',trackingSource:'virtual-arena'},teams:qaNations,linkedTeams:qaNations.filter(t=>t.eaClubId).length});
 else if(url.pathname==='/api/pickems/ballot'){
  const season=fixtureContext.window.UFL_SEASONS[url.searchParams.get('competition')],week=season?.weeks.find(w=>w.week===Number(url.searchParams.get('week')));
  body=JSON.stringify({picks:Object.fromEntries((week?.matches||[]).map(([id])=>[String(id),'home'])),tiebreaker:4});
 }
 else if(url.pathname==='/api/team-hub')body=JSON.stringify({teams:[{id:'6v6:QA',name:'QA Managers FC',division:'6v6',season:'2',canEdit:true,isOwner:true},{id:'10v10:QA',name:'QA Inspection FC',division:'10v10',season:'2',canEdit:false,isOwner:true},{id:'6v6:OLD',name:'Place Holder Name',division:'6v6',season:'2',canEdit:false,isOwner:true}]});
 else if(url.pathname==='/api/admin/users')body=JSON.stringify({users:[],teamTitleTeams:[],canManageRoles:true});
 else if(url.pathname==='/api/player-portraits')body=JSON.stringify({portraits:{},byIdentity:{}});
 else if(url.pathname==='/api/admin/player-photos')body=JSON.stringify({canReview:true,photos:[]});
 else if(url.pathname==='/api/admin/events'||url.pathname==='/api/events')body=JSON.stringify({events:[]});
 else if(url.pathname.startsWith('/api/'))body=JSON.stringify({matches:[],teams:[],players:[],applications:[],entries:[]});
 else{
  let file=pages[url.pathname]?'league-suite-assets/'+pages[url.pathname]+'.html':decodeURIComponent(url.pathname.slice(1));
  if(file.startsWith('league-suite-assets/')&&!path.extname(file))file+='.html';
  if(/^(?:arcade|func|goose|mountain|pickems|sandy|wheel)-app\/$/.test(file))file+='index.html';
  if(file==='team-hub')file='team-hub.html';
  if(!file||(!path.extname(file)&&!file.startsWith('league-suite-assets/')))file='index.html';
  if(file.includes('..')||file.includes('\\')||!isPublicFile(file)||!fs.existsSync(path.join(siteRoot,file))){status=404;body='Not found';type='text/plain';}
  else{body=fs.readFileSync(path.join(siteRoot,file));type=types[path.extname(file)]||'application/octet-stream';}
 }
 res.writeHead(status,{'content-type':type,'cache-control':'no-store'});res.end(body);
}).listen(4197,'127.0.0.1',()=>console.log('Synthetic Suite UI QA (no production writes): http://127.0.0.1:4197/'));

