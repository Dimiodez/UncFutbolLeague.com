import assert from 'node:assert/strict';
import {squadMatches} from '../team-hub-ux.js';
assert(squadMatches('DimiOdez',true,'dImI','all'));
assert(squadMatches('H00bear',false,'  H00  ','available'));
assert(!squadMatches('H00bear',true,'','available'));
assert(squadMatches('TheFlav',true,'','assigned'));
assert(!squadMatches('TheFlav',false,'','assigned'));
assert(!squadMatches('TheFlav',false,'rosa','all'));
console.log('PASS: case-insensitive squad search and current-board placement filters.');
