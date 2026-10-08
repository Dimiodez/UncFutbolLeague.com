// Run explicitly to configure the existing Cloudflare account. Never prints or saves secrets.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if (!process.argv.includes('--configure')) throw new Error('Pass --configure to provision the UFL login widget.');
const account='c6fc6be01ae7f90232ab9d519cbcfbb0';
const config=readFileSync(`${process.env.APPDATA}/xdg.config/.wrangler/config/default.toml`,'utf8');
const token=config.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
if(!token) throw new Error('Existing Cloudflare login required.');
async function api(path,method='GET',body){
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  const data=await response.json();
  if(!response.ok||!data.success) throw new Error(`Cloudflare request failed (${response.status}; codes ${data.errors?.map(e=>e.code).join(',')}).`);
  return data.result;
}
const name='UFL Discord login';
const widgets=await api('challenges/widgets');
const existing=widgets.find(w=>w.name===name);
const widget=existing?await api(`challenges/widgets/${existing.sitekey}`):await api('challenges/widgets','POST',{name,domains:['uncfutbolleague.com','www.uncfutbolleague.com'],mode:'managed',clearance_level:'no_clearance'});
if(!widget.secret||!widget.sitekey) throw new Error('Widget keys unavailable; no site settings were changed.');
const wrangler='C:/Users/twizz/AppData/Local/Temp/ufl-wrangler-cli/node_modules/.bin/wrangler.cmd';
for(const [key,value] of [['TURNSTILE_SECRET_KEY',widget.secret],['TURNSTILE_SITE_KEY',widget.sitekey]]){
  const result=spawnSync(`"${wrangler}" pages secret put ${key} --project-name uncfutbolleague-com`,{shell:true,input:value,encoding:'utf8',windowsHide:true});
  if(result.status!==0) throw new Error(`Could not store ${key}; inspect Cloudflare settings before deploying.`);
  console.log(`${key} stored in Cloudflare (value hidden).`);
}
console.log('Managed login widget ready for the UFL domains. No paid settings enabled.');
