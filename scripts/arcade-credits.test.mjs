import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('all four arcade cards credit their creator directly below the title',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const escape=source.split('\n').find(line=>line.startsWith('const escapeHtml ='));
 const functions=source.slice(source.indexOf('function arcadePage()'),source.indexOf('function arcadeGamePage()'));
 const context=vm.createContext({});
 vm.runInContext(`${escape}\n${functions}\nglobalThis.rendered=mountainArcadePage();`,context);
 for(const title of ['Cleat Arcade','Loosey Goosey','Sandy Uppy','Mountain Mayhem'])assert.ok(context.rendered.includes(`<h3>${title}</h3><span class="arcade-creator">by Dimiodez</span>`));
 assert.equal((context.rendered.match(/class="arcade-creator"/g)||[]).length,4);
 assert.equal(vm.runInContext(`arcadeCreatorCredits('<h3>Guest Game</h3>',{'Guest Game':'Alex & Sam'})`,context),'<h3>Guest Game</h3><span class="arcade-creator">by Alex &amp; Sam</span>');
});
