import {execFileSync} from 'node:child_process';
import {baselineFormationGuides,formationGuides} from './coaching-formations.mjs';
import {validateGuide} from '../functions/_lib/coaching.js';

const db='2e4969ed-3a15-4e07-b0a2-516fb480b58f',owner='222875432763129856';
const literal=value=>`'${String(value).replaceAll("'","''")}'`;
const apply=process.argv.includes('--apply'),wrangler=process.env.COACH_WRANGLER;
for(const guide of formationGuides)validateGuide({...guide,byline:'Dimiodez'});
if(!apply){console.log(formationGuides.map(guide=>({title:guide.title,characters:guide.body.length})));process.exit(0);}
if(!wrangler)throw new Error('Set COACH_WRANGLER to the installed Wrangler JS entry point.');
function sql(command){
  if(command.length>30000)throw new Error('SQL exceeds the bounded command size. No write attempted.');
  const results=JSON.parse(execFileSync(process.execPath,[wrangler,'d1','execute',db,'--remote','--env','production','--json','--command',command],{encoding:'utf8',maxBuffer:1024*1024}));
  if(results.some(result=>!result.success))throw new Error('Database request failed.');
  return results;
}
if(sql(`SELECT discord_id FROM users WHERE discord_id=${literal(owner)} AND username='dimio11' AND role='owner' AND status='active';`)[0].results.length!==1)throw new Error('Owner identity verification failed.');
// Preflight all records. Do not overwrite a member's intervening edits, uploaded images or moderation.
const planned=[];
for(const [index,guide] of formationGuides.entries()){
  const current=sql(`SELECT * FROM coaching_posts WHERE id=${literal(guide.id)};`)[0].results[0];
  if(!current||current.author_id!==owner||current.status!=='published')throw new Error('Unexpected post ownership or publication state.');
  if(current.body===guide.body){console.log(`Already expanded: ${guide.title}`);continue;}
  if(current.body!==baselineFormationGuides[index].body)throw new Error(`Guide was edited since initial publication; preserve it and merge manually: ${guide.title}`);
  planned.push({guide,revision:current.revision});
}
for(const {guide,revision} of planned){
  sql(`UPDATE coaching_posts SET body=${literal(guide.body)},revision=revision+1,updated_at=datetime('now') WHERE id=${literal(guide.id)} AND author_id=${literal(owner)} AND revision=${Number(revision)} AND status='published';`);
  const current=sql(`SELECT body,revision FROM coaching_posts WHERE id=${literal(guide.id)};`)[0].results[0];
  if(current.body!==guide.body||current.revision!==revision+1)throw new Error('Concurrent edit or verification failure; stop rather than overwrite.');
  console.log(`Verified tactical expansion: ${guide.title}`);
}
