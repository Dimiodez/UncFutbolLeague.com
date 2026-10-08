import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {siteRoot,listFiles} from './publication.mjs';

export function buildPublic(output=path.join(siteRoot,'dist')){
  const resolved=path.resolve(output);
  // Never delete or overwrite an existing directory; builds run in clean checkouts.
  fs.mkdirSync(resolved,{recursive:false});
  const files=listFiles();
  for(const file of files){
    const source=path.join(siteRoot,file),target=path.join(resolved,file);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
    const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    if(hash(source)!==hash(target))throw new Error(`Publication copy mismatch: ${file}`);
  }
  if(!files.includes('index.html')||!files.includes('_headers')||!files.includes('_redirects'))throw new Error('Missing publication controls.');
  console.log(`Verified ${files.length} public files. Functions source remains outside public assets.`);
  return files;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildPublic();
