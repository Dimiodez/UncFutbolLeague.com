// Local-only, synthetic read-only UI preview. Never connects to production APIs.
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {siteRoot,isPublicFile} from './publication.mjs';
const pages={'/league-suite':'league-workshop','/league-suite/':'league-workshop','/league-suite/ea-clubs':'ea-clubs','/league-suite/dashboard':'league-dashboard','/league-suite/join':'league-join'};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4197');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(403);res.end('Read-only local preview');return;}
 let body,type='application/json',status=200;
 if(url.pathname==='/api/auth/session')body=JSON.stringify({configured:true,authenticated:true,user:{id:'local-qa',role:'owner',displayName:'Local QA Owner'}});
 else if(url.pathname==='/api/league-suite/access')body=JSON.stringify({allowed:true,owner:true,adminsEnabled:true});
 else if(url.pathname==='/api/league-suite/drafts')body=JSON.stringify({account:{id:'local-qa',name:'Local QA Owner'},revision:null,draft:null});
 else if(url.pathname==='/api/league-suite/league-results')body=JSON.stringify({leagues:[]});
 else if(url.pathname.startsWith('/api/'))body=JSON.stringify({matches:[],teams:[],players:[],applications:[],entries:[]});
 else{
  let file=pages[url.pathname]?'league-suite-assets/'+pages[url.pathname]+'.html':decodeURIComponent(url.pathname.slice(1));
  if(file.startsWith('league-suite-assets/')&&!path.extname(file))file+='.html';
  if(!file||(!path.extname(file)&&!file.startsWith('league-suite-assets/')))file='index.html';
  if(file.includes('..')||file.includes('\\')||!isPublicFile(file)||!fs.existsSync(path.join(siteRoot,file))){status=404;body='Not found';type='text/plain';}
  else{body=fs.readFileSync(path.join(siteRoot,file));type=types[path.extname(file)]||'application/octet-stream';}
 }
 res.writeHead(status,{'content-type':type,'cache-control':'no-store'});res.end(body);
}).listen(4197,'127.0.0.1',()=>console.log('Read-only Suite UI QA: http://127.0.0.1:4197/'));

