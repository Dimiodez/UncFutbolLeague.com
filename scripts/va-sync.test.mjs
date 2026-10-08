import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('sync-virtual-arena.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'').split('const archivedSeason =')[0];
function setup(status,props) {
  const context=vm.createContext({console:{warn(){}},fetch:async()=>({status,ok:status===200,text:async()=>`<div data-page="${JSON.stringify({props}).replaceAll('"','&quot;')}"></div>`})});
  vm.runInContext(source,context);
  return expression=>vm.runInContext(expression,context);
}
test('missing optional VA stats do not stop standings and results sync',async()=>{
  const run=setup(404);
  assert.equal((await run("pageProps({key:'s2-10v10'},'stats',{allowMissing:true})")).statsUnavailable,true);
  await assert.rejects(run("pageProps({key:'s2-10v10'},'standings',{allowMissing:true})"),/404/);
  await assert.rejects(run("pageProps({key:'s2-10v10'},'matches')"),/404/);
});
test('optional stats still reject access errors and wrong seasons',async()=>{
  await assert.rejects(setup(403)("pageProps({key:'s2-10v10'},'stats',{allowMissing:true})"),/403/);
  await assert.rejects(setup(200,{competition:{id:2},season:{id:1}})("pageProps({key:'s2-10v10',competitionId:2,seasonId:4},'stats',{allowMissing:true})"),/different competition or season/);
});

const completeSource=fs.readFileSync(new URL('sync-virtual-arena.mjs',import.meta.url),'utf8');
const recoverySource=completeSource.slice(completeSource.indexOf('const syncResults ='),completeSource.indexOf('const output ='));
function recover({allFail=false,wrongPrevious=false}={}) {
  const context=vm.createContext({console:{warn(){}},seasons:[{key:'six',competitionId:1,seasonId:2},{key:'ten',competitionId:2,seasonId:4}],buildSeason:async config=>{
    if(config.key==='ten'||allFail) throw new Error('VA unavailable');
    return {...config,fresh:true,teams:{},teamDetails:[]};
  },retainExistingTeams:(current)=>current,readFile:async path=>JSON.stringify(path.includes('six')?{competitionId:1,seasonId:2}:{key:'ten',competitionId:2,seasonId:wrongPrevious?3:4,retained:true})});
  return vm.runInContext(`(async()=>{${recoverySource};return liveSeasons;})()`,context);
}
test('one failed division retains its snapshot while the other refreshes',async()=>{
  const [six,ten]=await recover();
  assert.equal(six.fresh,true);
  assert.equal(ten.retained,true);
});
test('all feeds failing or a mismatched backup never publish replacements',async()=>{
  await assert.rejects(recover({allFail:true}),/All Virtual Arena divisions failed/);
  await assert.rejects(recover({wrongPrevious:true}),/mismatched snapshot/);
});

test('a removed VA entry remains available without being marked currently registered',()=>{
  const run=setup(200,{});
  const result=run(`retainExistingTeams({teams:{NEW:['New','']},teamDetails:[{key:'NEW',teamId:2}]},{teams:{OLD:['Old',''],LEGACY:['Legacy','']},teamDetails:[{key:'OLD',teamId:2},{key:'LEGACY',teamId:3}]})`);
  assert.ok(result.teams.LEGACY);
  assert.equal(result.teamDetails.find(team=>team.key==='LEGACY').registered,false);
  assert.equal(result.teams.OLD,undefined,'a renamed entry is not duplicated');
});
