import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const parent = path.join(root,'.edge-sound-qa');
fs.mkdirSync(parent,{recursive:true});
const output = fs.mkdtempSync(path.join(parent,'public-'));
const allowed = new Set(['.html','.css','.js','.mjs','.json','.jpg','.jpeg','.png','.webp','.svg','.woff','.woff2','.ico']);
function copy(relative) {
  const source = path.join(root,relative);
  for (const entry of fs.readdirSync(source,{withFileTypes:true})) {
    if(entry.name.startsWith('.') || ['scripts','node_modules','functions','migrations'].includes(entry.name))continue;
    const file = path.join(relative,entry.name);
    if(entry.isDirectory()){copy(file);continue;}
    if(!entry.isFile() || !allowed.has(path.extname(file).toLowerCase()) || /^assets[\\/]league[\\/]player-/.test(file))continue;
    const target = path.join(output,file); fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);
  }
}
for(const entry of fs.readdirSync(root,{withFileTypes:true})) {
  if(entry.isFile() && (['index.html','_headers','_redirects'].includes(entry.name) || ['.js','.css','.html'].includes(path.extname(entry.name))) && entry.name!=='_worker.js')fs.copyFileSync(path.join(root,entry.name),path.join(output,entry.name));
}
for(const directory of ['assets','arcade-app','func-app','goose-app','pickems-app','sandy-app','wheel-app'])copy(directory);
// Bundle backend imports into the Worker, never upload their source as static assets.
const require = createRequire('C:/Users/twizz/Documents/GitHub/UncWheelUnited/ufb-bot/package.json');
await require('esbuild').build({entryPoints:[path.join(root,'_worker.js')],outfile:path.join(output,'_worker.js'),bundle:true,format:'esm',platform:'browser',target:'es2022'});
console.log(output);
