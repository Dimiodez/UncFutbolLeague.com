import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {formationGuides} from './coaching-formations.mjs';

const db='2e4969ed-3a15-4e07-b0a2-516fb480b58f';
const owner='222875432763129856';
const wrangler=process.env.COACH_WRANGLER;
const literal=value=>`'${String(value).replaceAll("'","''")}'`;
if(!process.argv.includes('--apply')){
  console.log('Plan only: add the three requested formation guides under the existing dimio11 owner account with byline Dimiodez. Existing records will never be overwritten. Use --apply after migration and deployment.');
  process.exit(0);
}
if(!wrangler)throw new Error('Set COACH_WRANGLER to the installed Wrangler JS entry point.');
function cli(args){return execFileSync(process.execPath,[wrangler,...args],{encoding:'utf8',maxBuffer:1024*1024});}
function sql(command){const results=JSON.parse(cli(['d1','execute',db,'--remote','--env','production','--json','--command',command]));if(results.some(r=>!r.success))throw new Error('Database request failed.');return results;}
const users=sql(`SELECT discord_id FROM users WHERE discord_id=${literal(owner)} AND username='dimio11' AND role='owner' AND status='active';`)[0].results;
if(users.length!==1)throw new Error('Expected active owner account was not found. No posts created.');
const publishedAt=Date.now();
for(const [index,guide] of formationGuides.entries()){
  if(sql(`SELECT id FROM coaching_posts WHERE id=${literal(guide.id)};`)[0].results.length){console.log(`Preserved existing guide: ${guide.title}`);continue;}
  const key=`coaching/${guide.id}/formation-cover-v1.png`;
  const filename=fileURLToPath(new URL(`../assets/coaching/formations-${guide.family}.png`,import.meta.url));
  cli(['r2','object','put',`unc-ufl-player-photos/${key}`,'--file',filename,'--content-type','image/png','--remote']);
  const fields=[guide.id,owner,guide.title,guide.hook,guide.body,'Dimiodez',key,'image/png'].map(literal).join(',');
  // Offset by seconds so the initial three cards read 3-back, 4-back, 5-back.
  const createdAt=new Date(publishedAt-index*1000).toISOString().slice(0,19).replace('T',' ');
  sql(`INSERT OR IGNORE INTO coaching_posts(id,author_id,title,hook,body,byline,cover_key,cover_type,created_at) SELECT ${fields},${literal(createdAt)} WHERE EXISTS(SELECT 1 FROM users WHERE discord_id=${literal(owner)} AND username='dimio11' AND role='owner' AND status='active');`);
  const verified=sql(`SELECT id,byline,author_id FROM coaching_posts WHERE id=${literal(guide.id)};`)[0].results;
  if(verified.length!==1||verified[0].author_id!==owner||verified[0].byline!=='Dimiodez')throw new Error('Publication verification failed.');
  console.log(`Published, owner-editable: ${guide.title}`);
}
