import {pathToFileURL} from 'node:url';
import {readMatchType} from '../league-suite-runtime/functions/_lib/ea-match-feed.js';
export async function preflightHosted({clubIds,readFeed=readMatchType}={}){
 if(!Array.isArray(clubIds)||!clubIds.length||clubIds.length>30||clubIds.some(id=>typeof id!=='string'||!/^\d{1,20}$/.test(id))||new Set(clubIds).size!==clubIds.length)throw Error('Supply 1–30 unique numeric EA club IDs.');
 const checks=[];
 for(let i=0;i<clubIds.length;i+=3)await Promise.all(clubIds.slice(i,i+3).map(async clubId=>{
  try{const feed=await readFeed(clubId,'friendly','friendlyMatch');checks.push({clubId,available:feed.available&&feed.source==='EA direct',source:feed.source||null,matches:feed.matches.length,attempts:feed.attempts||[]});}
  catch(error){checks.push({clubId,available:false,error:String(error.message)});}
 }));
 const summary={checkedAt:new Date().toISOString(),readOnly:true,clubs:checks.length,passed:checks.filter(c=>c.available).length,checks};console.log(JSON.stringify(summary));
 if(summary.passed!==summary.clubs)throw Error('Hosted EA access failed for '+(summary.clubs-summary.passed)+' clubs.');return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)preflightHosted({clubIds:JSON.parse(process.env.EA_PREFLIGHT_CLUBS||'[]')}).catch(error=>{console.error(String(error.message));process.exitCode=1;});
