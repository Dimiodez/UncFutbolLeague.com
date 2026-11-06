import {internationalData,escape as e} from './internationals.js';
import {internationalContent,SECTIONS} from './internationals-view.js';
import {getSession} from './auth.js';
export async function internationalPage({request,env}){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const parts=new URL(request.url).pathname.replace(/^\/internationals\/?/,'').split('/').filter(Boolean),section=parts[0]||'overview';
 let countryCode=parts[1]||null;
 if(!SECTIONS.includes(section)||(countryCode&&(section!=='teams'||parts.length!==2))||parts.length>2)return new Response('International page not found',{status:404});
 let data,actor;try{[data,actor]=await Promise.all([internationalData(env),getSession(request,env)]);}catch{return new Response('Internationals is temporarily unavailable. Please reload in a moment.',{status:503,headers:{'cache-control':'no-store'}});}
 const country=countryCode?data.teams.find(t=>t.id===countryCode):null;if(countryCode&&!country)return new Response('National team not found',{status:404});
 const manage=!!actor&&['owner','admin'].includes(actor.role);
 const people=manage?(await env.DB.prepare('SELECT p.id,p.discord_name FROM league_players p WHERE NOT EXISTS(SELECT 1 FROM league_player_aliases a WHERE a.alias_id=p.id) ORDER BY p.discord_name COLLATE NOCASE').all()).results:[];
 const shell=await(await env.ASSETS.fetch(new Request(new URL('/',request.url),request))).text();
 let header=shell.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0]||'<header class="site-header"><a href="/">UNC FUTBOL LEAGUE</a></header>';
 let footer=shell.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0]||'';
 footer=footer.replace(/<div class="unc-location"[\s\S]*?<\/div>/,'');
 if(actor)header=header.replace('id="account-nav">Sign in','id="account-nav">Account');
 const title=(country?country.name+' · ':section==='overview'?'':section[0].toUpperCase()+section.slice(1)+' · ')+'UFL Internationals';
 const html='<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#071b36"><title>'+e(title)+'</title><meta name="description" content="UFL Internationals. National squads, international fixtures, results, standings, player stats and TOTW."><meta property="og:title" content="'+e(title)+'"><link rel="stylesheet" href="/styles.css"><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/internationals.css?v=agenda-divisions-20261106"><script src="/theme-init.js"></script><script src="/navigation-ux.js" defer></script>'+(manage?'<script src="/internationals.js?v=c8521c30" defer></script>':'')+'</head><body data-standalone-navigation="true"><a class="skip-link" href="#main">Skip to content</a>'+header+'<main id="main" class="internationals-page" tabindex="-1">'+internationalContent(data,section,country,manage,people)+'</main>'+footer+'</body></html>';
 return new Response(request.method==='HEAD'?null:html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','vary':'Cookie'}});
}
