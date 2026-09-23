import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const app = read('app.js');
const redirects = read('_redirects');
const route = read('functions/ufb.js');

assert.match(html, /href="\/ufb" data-link/, 'UFB must remain in the shared site navigation');
assert.match(html, /src="\/ufb-docs\.js\?v=/, 'The command guide must load on every device');
assert.match(app, /ufb:\s*'\/ufb'/, 'The router must register /ufb');
assert.match(app, /path === routes\.ufb\) main\.innerHTML = ufbPage\(\)/, 'The router must render the UFB guide');
assert.match(redirects, /^\/ufb\/ \/ufb 301/m, 'The canonical URL must have no trailing slash');
assert.match(route, /env\.ASSETS\.fetch/, 'Direct visits to /ufb must serve the site shell');

const context = {window: {}};
vm.runInNewContext(read('ufb-docs.js'), context);
const groups = context.window.UFB_DOCS;
assert.ok(Array.isArray(groups) && groups.length > 0, 'The command guide must have categories');
assert.ok(groups.flatMap(group => group.commands).filter(command => command.name.startsWith('/')).length >= 40,
  'The full bot command reference must be published');
for (const group of groups) for (const command of group.commands) {
  if (!command.preview?.src) continue;
  assert.ok(command.preview.src.startsWith('/assets/'));
  assert.ok(existsSync(new URL(`..${command.preview.src}`, import.meta.url)), `Missing ${command.preview.src}`);
}
assert.ok(existsSync(new URL('../assets/ufb-mark.svg', import.meta.url)), 'UFB brand mark must ship');
console.log(`UFB website route, navigation, guide, and assets verified in ${siteRoot}`);
