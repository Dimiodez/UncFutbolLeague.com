import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const context={};
vm.createContext(context);
vm.runInContext(app.slice(app.indexOf('const escapeHtml'),app.indexOf('const virtualArena'))+app.slice(app.indexOf('function houseMatchDetails'),app.indexOf('async function hydrateHouseClub')),context);
test('prints both human-player sheets and MotM without unsupported columns',()=>{
 const player={name:'<script>unsafe</script>',motm:true,stats:['MID','8.0','1','3','2','—','—','—','—','20 / 25 (80%)','2 / 3 (67%)','—','—','0']};
 const html=context.houseMatchDetails({details:{clubs:[{name:'Bums',players:[player]},{name:'Opponents',players:[player]}]}});
 assert.match(html,/Passes/);assert.match(html,/Tackles/);assert.match(html,/Shots/);assert.match(html,/Saves/);assert.match(html,/★ &lt;script&gt;/);
 assert.doesNotMatch(html,/<script>|<th scope="col">Interceptions|Key passes|Dribbles|Blocks/);
 assert.match(html,/Opponents/);
});
test('older partial reports explain missing archived stats',()=>{
 assert.match(context.houseMatchDetails({details:{partial:true,clubs:[]}}),/original saved stats/);
 assert.match(context.houseMatchDetails({}),/not been archived/);
});
