// Emit only our token-free diagnostic messages, never request headers or event bodies.
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
if(process.argv.includes('--api')){
 const config=readFileSync(`${process.env.APPDATA}/xdg.config/.wrangler/config/default.toml`,'utf8');
 const token=config.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
 const base='https://api.cloudflare.com/client/v4/accounts/c6fc6be01ae7f90232ab9d519cbcfbb0/pages/projects/uncfutbolleague-com';
 async function api(url,method='GET'){
  const response=await fetch(url,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:method==='POST'?'{}':undefined});
  const data=await response.json();if(!data.success)throw new Error(`Cloudflare diagnostics failed (${response.status}).`);return data.result;
 }
 const project=await api(base),deployment=project.canonical_deployment.id;
 const tail=await api(`${base}/deployments/${deployment}/tails`,'POST');
 const socket=new WebSocket(tail.url,'trace-v1');
 socket.addEventListener('open',()=>{socket.send(JSON.stringify({debug:false}));console.log('Sanitized diagnostic stream connected.');});
 socket.addEventListener('message',async({data})=>{
  try{
   const text=typeof data==='string'?data:await data.text(),event=JSON.parse(text);
   for(const log of event.logs||[]){const messages=log.message||[];if(messages.some(m=>typeof m==='string'&&m.startsWith('UFL Turnstile')))console.log(JSON.stringify(messages));}
   if(event.event?.request?.url?.includes('/api/auth/discord'))console.log(JSON.stringify({loginStatus:event.event.response?.status,outcome:event.outcome}));
  }catch{}
 });
 socket.addEventListener('error',()=>console.log('Diagnostic connection unavailable.'));
 setTimeout(async()=>{socket.close();await api(`${base}/deployments/${deployment}/tails/${tail.id}`,'DELETE');console.log('Diagnostic stream closed.');},55000);
 await new Promise(resolve=>socket.addEventListener('close',resolve));
 process.exit(0);
}
const cli='C:/Users/twizz/AppData/Local/Temp/ufl-wrangler-cli/node_modules/wrangler/bin/wrangler.js';
const child=spawn(process.execPath,[cli,'pages','deployment','tail','--project-name','uncfutbolleague-com','--environment','production','--format','json'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let buffer='';
child.stdout.on('data',chunk=>{
  buffer+=chunk;
  // Wrangler pretty-prints JSON objects. Parse complete objects without printing raw output.
  let start=buffer.indexOf('{');
  while(start>=0){
    let depth=0,quoted=false,escaped=false,end=-1;
    for(let i=start;i<buffer.length;i++){
      const c=buffer[i];
      if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}
      else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}
    }
    if(end<0)break;
    try{const event=JSON.parse(buffer.slice(start,end));
      for(const log of event.logs||[]){const messages=log.message||[];if(messages.some(m=>typeof m==='string'&&m.startsWith('UFL Turnstile')))console.log(JSON.stringify(messages));}
      if(event.event?.request?.url?.includes('/api/auth/discord'))console.log(JSON.stringify({loginStatus:event.event.response?.status,outcome:event.outcome}));
    }catch{}
    buffer=buffer.slice(end);start=buffer.indexOf('{');
  }
  if(buffer.length>1000000)buffer='';
});
child.stderr.on('data',()=>{});
child.on('exit',code=>{console.log(`Diagnostic stream ended (${code}).`);process.exitCode=code||0;});
setTimeout(()=>child.kill(),55000);
