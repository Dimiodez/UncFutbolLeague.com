import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const siteRoot=fileURLToPath(new URL('../',import.meta.url));
const publicRoots=new Set(['index.html','app.js','auth-turnstile.css','auth-turnstile.js','club-dashboard-preview.css','featured-club.js','league-pages.css','league-pages.js','league-roster-admin.css','league-roster-admin.js','league-season2.js','player-photo-review.css','player-photo-review.js','player-portraits.js','sandy-dashboard-preview.css','sandy-dashboard-preview.js','styles.css','theme-init.js','ufb-docs.js','_headers','_redirects']);
const publicFolders=new Set(['assets','arcade-app','func-app','goose-app','mountain-app','pickems-app','sandy-app','wheel-app']);
export function isPublicFile(file){
  if(publicRoots.has(file))return true;
  if(!publicFolders.has(file.split('/')[0]))return false;
  if(file.split('/').some(part=>part.startsWith('.')||['node_modules','scripts','tests','source','raw'].includes(part)))return false;
  if(/(?:^|\/)(?:package(?:-lock)?\.json|server\.mjs)$/.test(file)||/\.(?:md|map|toml|ya?ml|sql)$/i.test(file))return false;
  if(/^mountain-app\/assets\/sprites\/(?:schwein|schwein-run|schwein-salmon|schwein-tantrum)\//.test(file))return false;
  return /\.(?:html|js|mjs|css|json|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|mp3|wav|ogg|mp4|webm)$/i.test(file);
}
export function listFiles(root=siteRoot){
  const files=[];
  function visit(dir,prefix=''){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(entry.isSymbolicLink())throw new Error('Publication cannot include symlinks.');
      const file=prefix+entry.name;
      if(entry.isDirectory()){
        if(!prefix&&!publicFolders.has(entry.name))continue;
        if(entry.name.startsWith('.')||['node_modules','scripts','tests','source','raw'].includes(entry.name))continue;
        visit(path.join(dir,entry.name),file+'/');
      }else if(isPublicFile(file))files.push(file);
    }
  }
  visit(root);return files.sort();
}
