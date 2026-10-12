// Local-only in-memory QA. Never publish this script or its synthetic records.
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {coachingApi} from '../functions/_lib/coaching.js';
import {sha256} from '../functions/_lib/auth.js';
import {isPublicFile} from './publication.mjs';
import {formationGuides} from './coaching-formations.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),db=new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root,'migrations/0001_auth.sql'),'utf8'));
db.exec(fs.readFileSync(path.join(root,'migrations/20261011_coaching.sql'),'utf8'));
db.exec(fs.readFileSync(path.join(root,'migrations/20261012_coaching_images.sql'),'utf8'));
db.prepare('INSERT INTO users(discord_id,username,display_name,role) VALUES(?,?,?,?)').run('qa','qa','Local QA Member','admin');
db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES(?,?,'2099-01-01')").run(await sha256('local-coaching-qa'),'qa');
const files=new Map();
const env={DB:{prepare(sql){return{params:[],bind(...p){this.params=p;return this;},async first(){return db.prepare(sql).get(...this.params);},async all(){return{results:db.prepare(sql).all(...this.params)};},async run(){return{meta:{changes:Number(db.prepare(sql).run(...this.params).changes)}};}};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}},PLAYER_PHOTOS:{async put(key,bytes){files.set(key,bytes);},async get(key){return files.has(key)?{body:files.get(key)}:null;},async delete(key){files.delete(key);}}};
if(process.argv.includes('--fixtures')){
  const image=new Uint8Array(fs.readFileSync(path.join(root,'assets/ufl-banner.jpg')));files.set('qa-cover',image);
  for(let n=1;n<=3;n++)db.prepare('INSERT INTO coaching_posts(id,author_id,title,hook,body,cover_key,cover_type) VALUES(?,?,?,?,?,?,?)').run(crypto.randomUUID(),'qa',`Layout test ${n}`,'Synthetic card for local layout checks only.','This is a local QA fixture, not a published guide.','qa-cover','image/jpeg');
}
if(process.argv.includes('--formations')){
  for(const guide of formationGuides){const key=`qa-${guide.family}`;files.set(key,new Uint8Array(fs.readFileSync(path.join(root,`assets/coaching/formations-${guide.family}.png`))));db.prepare('INSERT INTO coaching_posts(id,author_id,title,hook,body,byline,cover_key,cover_type) VALUES(?,?,?,?,?,?,?,?)').run(guide.id,'qa',guide.title,guide.hook,guide.body,'Dimiodez',key,'image/png');}
}
const member=process.argv.includes('--member'),port=Number(process.env.PORT||4192);
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://127.0.0.1:${port}`),headers=new Headers(req.headers);
    if(member)headers.set('cookie','__Host-ufl_session=local-coaching-qa');
    if(req.method!=='GET'&&req.method!=='HEAD')headers.set('origin',url.origin);
    let response;
    if(url.pathname==='/api/auth/session')response=Response.json({user:member?{id:'qa',displayName:'Local QA Member',username:'qa',role:'admin'}:null});
    else if(url.pathname.startsWith('/api/coaching')){
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024+131072){res.writeHead(413);res.end();return;}chunks.push(chunk);}
      const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
      const parts=url.pathname.split('/').filter(Boolean);response=await coachingApi(request,env,parts[2]||null,parts[3]==='images'?`image:${parts[4]}`:parts[3]||null);
    }else if(url.pathname.startsWith('/api/'))response=Response.json({});
    else{
      const file=url.pathname==='/'||!path.extname(url.pathname)?'index.html':decodeURIComponent(url.pathname.slice(1));
      if(!isPublicFile(file)||file.includes('..')||file.includes('\\')||!fs.existsSync(path.join(root,file)))response=new Response('Not found',{status:404});
      else{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};response=new Response(fs.readFileSync(path.join(root,file)),{headers:{'content-type':types[path.extname(file)]||'application/octet-stream'}});}
    }
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end('Local QA error');console.error(error);}
}).listen(port,'127.0.0.1',()=>console.log(`Local coaching QA: http://127.0.0.1:${port}/coaching (${member?'QA member':'signed out'}; in-memory only)`));
