import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isPublicFile,listFiles,siteRoot} from './publication.mjs';
import {buildPublic} from './build-public.mjs';

test('internal files cannot enter the public output',()=>{
  for(const file of ['wrangler.toml','.assetsignore','.dev.vars','.git/config','.github/workflows/verify-ufb.yml','scripts/configure-turnstile.mjs','migrations/0001_auth.sql','functions/_lib/auth.js','bot-match-bridge/index.mjs','SECURITY-INCIDENT-2026-10-08.md','mountain-app/package.json','mountain-app/server.mjs','mountain-app/assets/sprites/raw/climber-strip.png'])assert.equal(isPublicFile(file),false,file);
});
test('runtime modules, data, login resources and security controls are preserved',()=>{
  for(const file of ['auth-turnstile.js','auth-turnstile.css','_headers','_redirects','pickems-app/seasons/s1-6v6.json','pickems-app/seasons/s2-6v6.json','pickems-app/seasons/s2-10v10.json','arcade-app/engine.mjs','mountain-app/game/AssetManifest.js','mountain-app/vendor/phaser.min.js'])assert.equal(isPublicFile(file),true,file);
});
test('only Git-tracked files enter the current artifact',()=>{
  const tracked=new Set(execFileSync('git',['ls-files'],{cwd:siteRoot,encoding:'utf8'}).trim().split(/\r?\n/));
  for(const file of listFiles())assert.ok(tracked.has(file),`Untracked public file: ${file}`);
});
test('build copies every selected file byte-for-byte and refuses existing output',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ufl-publication-test-'));
  try{
    const output=path.join(temp,'public'),files=buildPublic(output);
    assert.equal(files.length,listFiles().length);
    for(const file of files)assert.deepEqual(fs.readFileSync(path.join(output,file)),fs.readFileSync(path.join(siteRoot,file)));
    for(const file of ['wrangler.toml','scripts/configure-turnstile.mjs','functions/_lib/auth.js'])assert.equal(fs.existsSync(path.join(output,file)),false);
    assert.throws(()=>buildPublic(output),/EEXIST/);
  }finally{fs.rmSync(temp,{recursive:true});}
});
