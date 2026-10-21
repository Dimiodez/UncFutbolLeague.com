import test from 'node:test';import assert from 'node:assert/strict';
import {playerTotals} from '../league-player-stats.js';import {visibleStatColumns} from '../league-stat-columns.js';
test('tracker omits unavailable fields but retains real zero values',()=>{
 const rows=playerTotals([{playerId:'1',teamId:'team-1',name:'Player',rating:7,goals:0,assists:0,details:{shots:1,shotsOnTarget:null,interceptions:null,saves:0,redCards:0,yellowCards:null}}]);
 const keys=visibleStatColumns(rows).map(([key])=>key);assert(!keys.includes('shotsOnTarget'));assert(!keys.includes('interceptions'));assert(!keys.includes('yellowCards'));assert(keys.includes('redCards'));assert(keys.includes('saves'));assert.deepEqual(visibleStatColumns([]),[]);
 const unavailable=playerTotals([{playerId:'2',teamId:'team-1',name:'Other',rating:6,goals:0,assists:0,details:{}}]);assert(!visibleStatColumns(unavailable).some(([key])=>['saves','redCards','yellowCards'].includes(key)));
});
