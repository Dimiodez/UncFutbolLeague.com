// Keep this standalone, private page on the exact public site's navigation.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=file=>fs.readFileSync(new URL(file,root),'utf8');
const site=read('index.html'),target=new URL('league-suite-assets/league-centre.html',root);
const header=site.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
const footer=site.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0];
if(!header||!footer)throw Error('Shared site shell not found.');
let html=fs.readFileSync(target,'utf8');
html=html.replace(/<header class="(?:masthead|site-header)">[\s\S]*?<\/header>/,header);
html=html.replace(/<footer class="(?:shell footer|site-footer)">[\s\S]*?<\/footer>/,footer);
fs.writeFileSync(target,html);
const locations=read('app.js').match(/const locations = (\[[\s\S]*?\]);/)?.[1];
if(!locations)throw Error('Shared footer locations not found.');
fs.writeFileSync(new URL('league-suite-assets/league-centre-footer.js',root),`// Generated from the main site's footer copy by sync-league-centre-shell.mjs.\nconst locations=${locations};\nconst reroll=()=>{const el=document.querySelector('#unc-location');if(el)el.textContent=locations[Math.floor(Math.random()*locations.length)];};\ndocument.querySelector('#reroll-location')?.addEventListener('click',reroll);reroll();\n`);
console.log('League Centre header and footer synchronized with the main site.');
