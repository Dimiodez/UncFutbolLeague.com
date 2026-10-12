import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {formationGuides} from './coaching-formations.mjs';
const require=createRequire(import.meta.url);
const sharp=require(process.env.COACH_SHARP||'sharp');
const output=fileURLToPath(new URL('../assets/coaching/',import.meta.url));fs.mkdirSync(output,{recursive:true});
const shapes={
  3:[['GK',50,92],['CB',25,75],['CB',50,77],['CB',75,75],['LM',8,47],['CDM',36,57],['CDM',64,57],['RM',92,47],['CAM',50,34],['ST',35,15],['ST',65,15]],
  4:[['GK',50,92],['LB',12,72],['CB',36,77],['CB',64,77],['RB',88,72],['CDM',50,57],['CM',31,40],['CM',69,40],['LW',12,18],['ST',50,13],['RW',88,18]],
  5:[['GK',50,92],['LWB',8,65],['CB',28,77],['CB',50,79],['CB',72,77],['RWB',92,65],['CM',25,43],['CM',50,49],['CM',75,43],['ST',35,17],['ST',65,17]]
};
for(const guide of formationGuides){
  const dots=shapes[guide.family].map(([label,x,y])=>{const cx=860+x*6,cy=120+y*6.5;return`<circle cx="${cx}" cy="${cy}" r="24" fill="${label==='GK'?'#65c7df':'#ea1235'}" stroke="#f3f6fa" stroke-width="2"/><text x="${cx}" y="${cy+5}" fill="${label==='GK'?'#061a35':'#fff'}" font-family="Arial,sans-serif" font-size="13" font-weight="bold" text-anchor="middle">${label}</text>`;}).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#071423"/><rect width="1600" height="12" fill="#ea1235"/><rect x="38" y="38" width="1524" height="824" rx="30" fill="#10243d" stroke="#29415f" stroke-width="2"/><text x="95" y="140" fill="#ff6079" font-family="Arial,sans-serif" font-size="24" font-weight="bold" letter-spacing="5">THE UNC PLAYBOOK</text><text x="90" y="390" fill="#f3f6fa" font-family="Impact,Arial,sans-serif" font-size="240" font-weight="bold">${guide.family}</text><text x="105" y="485" fill="#f3f6fa" font-family="Arial,sans-serif" font-size="65" font-weight="bold">AT THE BACK</text><rect x="105" y="530" width="115" height="7" rx="3" fill="#ea1235"/><text x="105" y="606" fill="#a8b6c8" font-family="Arial,sans-serif" font-size="27">SHAPE. SUPPORT. COMMUNICATION.</text><text x="105" y="730" fill="#f3f6fa" font-family="Arial,sans-serif" font-size="25" font-weight="bold">BY DIMIODEZ</text><rect x="835" y="105" width="650" height="685" rx="16" fill="#0b1d32" stroke="#48627c" stroke-width="2"/><rect x="860" y="130" width="600" height="635" fill="none" stroke="#48627c" stroke-width="2"/><path d="M860 447H1460" stroke="#48627c" stroke-width="2"/><circle cx="1160" cy="447" r="66" fill="none" stroke="#48627c" stroke-width="2"/><path d="M1005 130V235H1315V130 M1005 765V660H1315V765" fill="none" stroke="#48627c" stroke-width="2"/>${dots}<text x="1160" y="840" fill="#a8b6c8" font-family="Arial,sans-serif" font-size="20" text-anchor="middle">${guide.shape} · REPRESENTATIVE SHAPE</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(output,`formations-${guide.family}.png`));
  console.log(`Built original ${guide.family}-back cover (11 positions).`);
}
