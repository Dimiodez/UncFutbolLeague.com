import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const docsSource=readFileSync(new URL('../ufb-docs.js',import.meta.url),'utf8');
const context={window:{}};
vm.runInNewContext(docsSource,context);
const hiddenTitles=new Set(['Draft nights','Cups & BYOT']);
const visibleDocs=context.window.UFB_DOCS.filter(group=>!hiddenTitles.has(group.title));
const docs=visibleDocs.flatMap(group=>group.commands);
const registeredCommands=JSON.parse(readFileSync(new URL('../../ufb-bot/assets/stat-backgrounds/commands.json',import.meta.url),'utf8'));
const commandDefinitions=root=>{
 const nested=(root.options||[]).filter(o=>o.type===1||o.type===2);
 if(!nested.length)return [[`/${root.name}`,root]];
 return nested.flatMap(option=>option.type===2?(option.options||[]).filter(child=>child.type===1).map(child=>[`/${root.name} ${option.name} ${child.name}`,child]):[[`/${root.name} ${option.name}`,option]]);
};
const schema=new Map(registeredCommands.flatMap(commandDefinitions));
const commands=docs.filter(c=>c.name.startsWith('/'));
assert.equal(commands.length,schema.size,'Documentation must cover every registered root/subcommand');
for(const command of commands){
 const definition=schema.get(command.name);
 assert.ok(definition,`Unknown documented command ${command.name}`);
 assert.ok(command.examples?.length,`Missing examples for ${command.name}`);
 for(const example of command.examples){
  assert.ok(example===command.name||example.startsWith(command.name+' '),`Wrong command in ${example}`);
  const matches=[...example.slice(command.name.length).matchAll(/(?:^|\s)([a-z][a-z0-9_]*):/g)];
  const values=new Map(matches.map((m,n)=>[m[1],example.slice(command.name.length).slice(m.index+m[0].length,matches[n+1]?.index).trim()]));
  for(const [name,value] of values){
   const option=definition.options?.find(o=>o.name===name);
   assert.ok(option,`Unregistered option ${name} in ${example}`);
   assert.ok(value,`Empty option ${name}`);
   if(option.choices)assert.ok(option.choices.some(c=>String(c.value)===value||c.name===value),`Invalid choice ${value} in ${example}`);
   if([4,10].includes(option.type))assert.ok(Number.isFinite(Number(value)),`Invalid number ${value}`);
   if(option.type===5)assert.ok(['true','false'].includes(value));
  }
  for(const option of definition.options||[])if(option.required)assert.ok(values.has(option.name),`Missing required ${option.name} in ${example}`);
 }
 assert.deepEqual(Array.from(command.options||[],o=>o.name).sort(),Array.from(definition.options||[],o=>o.name).sort(),`Option reference is out of date for ${command.name}`);
}
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const renderer=appSource.slice(appSource.indexOf('function ufbPage()'),appSource.indexOf('async function getAuthState()'));
context.escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
context.pageHero=()=>'<header>UFL</header>';
vm.runInNewContext(renderer+'\nglobalThis.rendered=ufbPage();',context);
const totalExamples=commands.reduce((n,c)=>n+c.examples.length,0);
assert.equal((context.rendered.match(/<pre>/g)||[]).length,totalExamples);
assert.equal((context.rendered.match(/<details class="ufb-category">/g)||[]).length,visibleDocs.length,'Every published UFB category starts collapsed');
assert.ok(!/<details[^>]*\bopen\b/.test(context.rendered),'No UFB category starts open');
assert.ok(context.rendered.includes('Upcoming features')&&context.rendered.includes('Planned'));
assert.ok(context.rendered.includes('Draft nights')&&context.rendered.includes('Workshop'));
assert.equal((context.rendered.match(/<figure class="ufb-preview">/g)||[]).length,5,'Every image-producing command has an output example');
assert.equal((context.rendered.match(/loading="lazy"/g)||[]).length,5,'Command output examples must load lazily');
assert.ok(context.rendered.includes('pitch_availability'));
assert.ok(context.rendered.includes('Dedicated channel posts')||context.rendered.includes('dedicated auto-post'));
console.log(`PASS: all ${commands.length} registered commands/subcommands documented, ${totalExamples} validated usage examples, current options and rendered examples/roadmap labels.`);
