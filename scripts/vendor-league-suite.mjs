// Mechanical vendoring of the verified preview suite. No database or credential copying.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),source=path.resolve(process.argv[2]||'');
if(!fs.existsSync(path.join(source,'league-workshop.js')))throw Error('Choose the verified preview source checkout.');
const runtime=path.join(root,'league-suite-runtime'),assets=path.join(root,'league-suite-assets');fs.mkdirSync(runtime,{recursive:true});fs.mkdirSync(assets,{recursive:true});
const names=fs.readdirSync(source).filter(n=>/\.(js|css|html)$/.test(n)&&n!=='_worker.js');
const rewrite=text=>{
 text=text.replace(/\/api\/(league-results|drafts|ea|registration|awards|team-hub|sound)(?=[/?'"`])/g,'/api/league-suite/$1');
 for(const [from,to] of [['/league-workshop.html','/league-suite'],['/league-workshop','/league-suite'],['/ea-clubs.html','/league-suite/ea-clubs'],['/ea-clubs','/league-suite/ea-clubs'],['/league-dashboard.html','/league-suite/dashboard'],['/league-dashboard','/league-suite/dashboard'],['/league-join.html','/league-suite/join']])text=text.replaceAll(from+'"',to+'"').replaceAll(from+"'",to+"'").replaceAll(from+'?',to+'?').replaceAll(from+'#',to+'#');
 for(const name of names)text=text.replace(new RegExp('(?<![.\\w/-])/'+name.replaceAll('.','\\.'),'g'),'/league-suite-assets/'+name);
 return text.replaceAll('/assets/ea-trial-recovery-20261015.json','/league-suite-assets/ea-trial-recovery-20261015.json').replaceAll('League workspace','League Suite').replaceAll('League Workspace','League Suite').replaceAll('Development preview · Local league drafts · No changes to the live website or bot','Private League Suite · Test data only · Public league unchanged').replaceAll('Development preview','Private beta').replaceAll('League Workshop · UFL Preview','League Suite · UNC').replaceAll('UNC Futbol League preview home','UNC Futbol League home').replaceAll('>Admin</a>','>League Suite</a>');
};
for(const name of names){const text=fs.readFileSync(path.join(source,name),'utf8');if(name.endsWith('.js'))fs.writeFileSync(path.join(runtime,name),text);fs.writeFileSync(path.join(assets,name),rewrite(text));}
const backend=path.join(source,'functions','_lib'),target=path.join(runtime,'functions','_lib');fs.mkdirSync(target,{recursive:true});
for(const name of fs.readdirSync(backend).filter(n=>n.endsWith('.js'))){let text=fs.readFileSync(path.join(backend,name),'utf8');if(name==='auth.js')text=text.replace(/export async function getSession\(request, env\) \{[\s\S]*?\n\}/,'export async function getSession(request, env) { return env.SUITE_ACTOR || null; }');fs.writeFileSync(path.join(target,name),text);}
fs.copyFileSync(path.join(source,'assets/ea-trial-recovery-20261015.json'),path.join(assets,'ea-trial-recovery-20261015.json'));
fs.copyFileSync(path.join(root,'league-suite-access.js'),path.join(assets,'league-suite-access.js'));
const entry=path.join(assets,'league-workshop.js');fs.appendFileSync(entry,"\nimport {installSuiteAccessControls} from './league-suite-access.js';installSuiteAccessControls();\n");
console.log('Vendored suite code and namespaced private assets; test results remain in the existing separate DB.');
