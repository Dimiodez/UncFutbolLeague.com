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
 assert.ok(context.rendered.indexOf('Want to add your own game?')>context.rendered.indexOf('Play Mountain Mayhem'));
 assert.ok(context.rendered.includes('href="/arcade/submit" data-link'));
 const submission=vm.runInContext('arcadeSubmissionPage()',context);
 for(const required of ['@dimio11','Pitch an idea','Build your own','Codex','GitHub','source-code ZIP','leaderboard','Review first. Publish after approval.','API keys','creator credit'])assert.ok(submission.includes(required),required);
 assert.ok(!submission.includes('<form'),'Submission is reviewed through Discord, not an unrequested upload form');
 for(const step of ['Create a GitHub repository','Open a local copy in Codex','GitHub Desktop','commit and push','does not automatically back them up to GitHub','starter prompt'])assert.ok(submission.includes(step),step);
 assert.ok(source.includes("else if (path === '/arcade/submit') main.innerHTML = arcadeSubmissionPage();"));
});
