import {loadLevel,keeperX,ballSpeed,createGame,LEVELS,WIDTH,HEIGHT,PADDLE_Y,BALL_R,goalX,goalCenters,paddleWidth,launch,advance,update,clamp} from './engine.mjs?v=level13';
const $=s=>document.querySelector(s),canvas=$('#pitch'),ctx=canvas.getContext('2d');
import {TEAM_NAMES,THEMES} from './teams.mjs';
import {beginRun,record,flush,loadLeaderboard,discardRun,ownerSession} from './ranked.mjs?v=surprise1';
$('#team').replaceChildren(...Object.entries(TEAM_NAMES).map(([key,[name,short]])=>{const o=document.createElement('option');o.value=key;o.textContent=`${name} · ${short}`;return o;}));
let testing=false,testLevel=0;
let aimAngle=0,aimPointer=null,padShootHeld=false;
let runTeam='gotham',trail=[];
let theme=THEMES.gotham,g=createGame(),target=320,keys=new Set(),last=0,accumulator=0,saved=false,best=null,saveAvailable=true;
try{localStorage.removeItem('ufl-cleat-best-v1');const choice=localStorage.getItem('ufl-cleat-theme-v1');if(THEMES[choice])$('#team').value=choice;}catch{}
function applyTheme(){theme=THEMES[$('#team').value];['--accent','--dark','--mid','--pale'].forEach((k,i)=>document.documentElement.style.setProperty(k,theme[i]));try{localStorage.setItem('ufl-cleat-theme-v1',$('#team').value);}catch{saveAvailable=false;}}
function saveBest(){if(testing||saved)return;flush(true);saved=true;}
function overlay(kicker,title,copy,action){$('#overlay').hidden=false;$('#overlay-kicker').textContent=kicker;$('#overlay-title').textContent=title;$('#overlay-copy').textContent=copy;$('#action').textContent=action;}
function sync(){if(g.phase==='ready'){target=WIDTH/2;record(['aim',target]);update(g,0,target);}$('#aim-controls').hidden=g.phase!=='ready';const l=LEVELS[g.level];$('#opposition').textContent=`${TEAM_NAMES[$('#team').value][1]} vs ${TEAM_NAMES[g.opponent]?.[1]||'—'} · Opposition changes each level`;$('#level').textContent=`${String(g.level+1).padStart(2,"0")} / ${LEVELS.length}`;$('#score').textContent=String(g.score).padStart(5,'0');$('#lives').textContent=String(g.lives);$('#objective').textContent=`${g.goals} / ${l.goals} goals · ${l.name} · ${Math.round(ballSpeed(g)/330*100)}% speed`;$('#pause').disabled=!['playing','ready','paused'].includes(g.phase);$('#pause').textContent=g.phase==='paused'?'Resume':'Pause';$('#level-list').querySelectorAll('li').forEach((li,i)=>{li.classList.toggle('current',i===g.level);li.classList.toggle('cleared',i<g.level);});
$('#team').disabled=starting||!['intro','over','won'].includes(g.phase);
if(g.phase==='intro')return;
if(g.phase==='levelup')overlay('LEVEL CLEARED',`${l.name}. Done.`,`${g.score.toLocaleString()} points. Next: ${LEVELS[g.level+1].name}. Keep your ${g.lives} remaining ${g.lives===1?'life':'lives'}.`,'Next level →');
else if(g.phase==='won'||g.phase==='over'){saveBest();overlay(g.phase==='won'?'ALL THIRTEEN LEVELS CLEARED':'FULL TIME',g.phase==='won'?'TOP BINS.':'ONE MORE TRY?',`${g.score.toLocaleString()} points · ${g.phase==='won'?'You beat the run!':'Reached level '+(g.level+1)+'.'}`,'Play again ↗');}
else if(g.phase==='paused')overlay('TIME OUT','TAKE A BREATHER.','Your run is paused.','Resume →');
else $('#overlay').hidden=true;
}
function shoot(){if(g.phase!=='ready')return;const angle=Math.round(aimAngle);record(['launch',angle]);launch(g,angle);sync();canvas.focus({preventScroll:true});}
$('#shoot').addEventListener('click',shoot);
let beforePause='ready';
function pause(){if(g.phase==='paused')g.phase=beforePause;else if(['ready','playing'].includes(g.phase)){beforePause=g.phase;g.phase='paused';keys.clear();}sync();}
function action(){if(g.phase==='intro'||['over','won'].includes(g.phase)){void startRun(testing?testLevel:null);}else if(g.phase==='levelup'){record(['advance']);advance(g);}else if(g.phase==='paused')pause();else {if(g.phase==='ready')shoot();}sync();canvas.focus({preventScroll:true});}
let starting=false;
async function startRun(level=null){if(starting)return;starting=true;const chosenTeam=$('#team').value;$('#team').disabled=true;$('#action').disabled=true;try{if(level!==null&&(!Number.isInteger(level)||level<0||level>=LEVELS.length||!await ownerSession())){document.querySelector('#test-status').textContent='Owner login required.';return;}testing=level!==null;testLevel=level??0;if(testing)discardRun();const seed=testing?crypto.getRandomValues(new Uint32Array(1))[0]:await beginRun(chosenTeam);g=createGame(chosenTeam,Object.keys(TEAM_NAMES),seed);if(testing){g.level=testLevel;loadLevel(g);document.querySelector('#rank-status').textContent='OWNER TEST · No scores or achievements saved.';}document.querySelector('#test-status').textContent=testing?'Testing level '+(testLevel+1)+' · Scores and achievements disabled.':'';g.phase='ready';target=320;saved=false;runTeam=$('#team').value;trail=[];keys.clear();accumulator=0;beforePause='ready';sync();canvas.focus({preventScroll:true});}finally{starting=false;$('#action').disabled=false;}}
$('#action').addEventListener('click',action);$('#pause').addEventListener('click',()=>{pause();canvas.focus({preventScroll:true});});$('#team').addEventListener('change',()=>{applyTheme();if(g.phase==='intro')g=createGame($('#team').value,Object.keys(TEAM_NAMES));sync();});
function point(e){const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)*WIDTH/r.width,y=(e.clientY-r.top)*HEIGHT/r.height;if(g.phase==='ready'){aimAngle=clamp(Math.atan2(x-WIDTH/2,Math.max(30,PADDLE_Y-BALL_R-4-y))*180/Math.PI,-60,60);target=WIDTH/2;}else target=clamp(x,0,WIDTH);}
canvas.addEventListener('pointermove',point);
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);point(e);aimPointer=g.phase==='ready'?e.pointerId:null;});
canvas.addEventListener('pointerup',e=>{if(aimPointer===e.pointerId&&g.phase==='ready'){point(e);shoot();}aimPointer=null;});
canvas.addEventListener('pointercancel',()=>{aimPointer=null;});
window.addEventListener('keydown',e=>{if(['SELECT','INPUT','TEXTAREA','BUTTON','SUMMARY'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d',' ','p','escape'].includes(k)){e.preventDefault();if(e.repeat&&[' ','p','escape'].includes(k))return;keys.add(k);if(k===' ')action();if(k==='p'||k==='escape')pause();}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();if(g.phase==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&g.phase==='playing')pause();});
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function line(x,y,x2,y2,c,width=1){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function draw(){
  const opposition=THEMES[g.opponent]||THEMES.bayern;
  rect(0,0,WIDTH,HEIGHT,'#0b211e');for(let i=0;i<10;i++)rect(0,i*70,WIDTH,70,i%2?'#0e2924':'#0c241f');
  ctx.strokeStyle='#d6ffe51c';ctx.lineWidth=2;ctx.strokeRect(22,55,596,616);ctx.strokeRect(176,55,288,102);ctx.strokeRect(245,55,150,50);ctx.beginPath();ctx.arc(320,350,77,0,Math.PI*2);ctx.stroke();line(22,350,618,350,'#d6ffe51c',2);circle(320,350,4,'#d6ffe52a');
  for(const [netIndex,gx] of goalCenters(g).entries()){const gw=LEVELS[g.level].goalWidth;rect(gx-gw/2,9,gw,32,'#ddebe512');for(let x=gx-gw/2;x<gx+gw/2;x+=12)line(x,9,x,40,'#a8ccc355');for(let y=10;y<42;y+=10)line(gx-gw/2,y,gx+gw/2,y,'#a8ccc355');rect(gx-gw/2-4,7,gw+8,5,'#e6fff2');rect(gx-gw/2-4,7,5,37,'#e6fff2');rect(gx+gw/2-1,7,5,37,'#e6fff2');rect(gx-24,netIndex*4,48,4,netIndex?'#ffcc66':theme[0]);}
  if(g.level>=7){const kx=keeperX(g);rect(kx-40,82,80,19,'#f4f4ef');rect(kx-19,76,38,25,opposition[0]);circle(kx,69,9,'#e9b88f');rect(kx-45,83,9,13,'#ffcc66');rect(kx+36,83,9,13,'#ffcc66');}
  for(const b of g.blocks){if(b.hp<=0)continue;const {x,y,w,h}=b;rect(x+3,y+h+4,w,6,'#06140f77');
    if(b.type==='defender'){rect(x+23,y-5,16,14,'#e7b692');rect(x+19,y-8,23,7,'#17232c');rect(x+12,y+10,38,23,opposition[0]);rect(x+2,y+12,10,17,opposition[2]);rect(x+50,y+12,10,17,opposition[2]);rect(x+16,y+33,12,10,'#dfe5de');rect(x+34,y+33,12,10,'#dfe5de');rect(x+14,y+42,16,5,'#101921');rect(x+34,y+42,16,5,'#101921');ctx.fillStyle='#17251e';ctx.font='bold 15px monospace';ctx.textAlign='center';ctx.fillText(String(g.level+2),x+31,y+27);}
    else if(b.type==='wall'){rect(x,y,w,h,'#b37053');rect(x,y,w,3,'#e2a37a');line(x,y+15,x+w,y+15,'#573e32',3);for(let n=1;n<4;n++){line(x+n*25,y,x+n*25,y+15,'#573e32',3);line(x+n*25-12,y+15,x+n*25-12,y+h,'#573e32',3);}}
    else{rect(x,y+6,w,h-12,'#efbb42');rect(x+8,y,w-20,10,'#ffd56c');for(let i=0;i<Math.floor((w-45)/30);i++)rect(x+12+i*30,y+11,24,20,'#233b49');rect(x+w-32,y+11,23,30,'#233b49');rect(x+3,y+38,w-6,4,'#89601f');circle(x+35,y+h-3,12,'#091318');circle(x+w-36,y+h-3,12,'#091318');circle(x+35,y+h-3,5,'#829099');circle(x+w-36,y+h-3,5,'#829099');}
    rect(x,y-19,w,5,'#081713');rect(x,y-19,w*b.hp/b.max,5,b.type==='defender'?opposition[0]:'#f5bd62');
  }
  for(const d of g.drops){rect(d.x-13,d.y-13,26,26,d.type==='life'?'#ffda6c':d.type==='wide'?theme[0]:'#93cfff');ctx.fillStyle='#10201b';ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.fillText(d.type==='life'?'+1':d.type==='wide'?'W':'C',d.x,d.y+6);}
  if(g.invader){const v=g.invader;circle(v.x,v.y-20,8,'#edbb98');rect(v.x-17,v.y-10,34,25,'#ffef84');rect(v.x-24,v.y-6,7,15,'#edbb98');rect(v.x+17,v.y-6,7,15,'#edbb98');rect(v.x-14,v.y+15,10,12,'#fafafa');rect(v.x+4,v.y+15,10,12,'#fafafa');ctx.font='bold 13px monospace';ctx.fillStyle='#fff6ad';ctx.textAlign='center';ctx.fillText('+1 LIFE · '+(6-v.passes)+' PASSES',v.x,v.y-37);}
  for(const p of g.particles){ctx.globalAlpha=p.life*2;rect(p.x,p.y,4,4,theme[0]);}ctx.globalAlpha=1;
  const w=paddleWidth(g),x=g.paddleX-w/2,y=PADDLE_Y;
  rect(x+4,y+23,w-8,6,'#0005');rect(x,y,w-20,18,theme[0]);rect(x+w-26,y+5,26,13,theme[0]);rect(x+6,y-8,30,8,theme[0]);rect(x,y+17,w,5,theme[3]);for(let i=12;i<w-5;i+=24)rect(x+i,y+22,8,6,'#f0f7ee');for(let i=37;i<65;i+=9)rect(x+i,y+1,4,9,theme[1]);rect(x+w-30,y+9,18,3,theme[2]);
  if(g.curve>0&&g.phase==='playing'){trail.push({x:g.ball.x,y:g.ball.y});if(trail.length>22)trail.shift();trail.forEach((p,i)=>{ctx.globalAlpha=i/trail.length*.5;circle(p.x,p.y,2+i/trail.length*5,'#93cfff');});ctx.globalAlpha=1;}else trail=[];
  circle(g.ball.x+2,g.ball.y+3,BALL_R+1,'#0006');circle(g.ball.x,g.ball.y,BALL_R,'#f6f7ed');rect(g.ball.x-3,g.ball.y-3,6,6,'#17232c');rect(g.ball.x-7,g.ball.y-6,3,3,'#17232c');rect(g.ball.x+4,g.ball.y+4,3,3,'#17232c');
  if(g.phase==='ready'){ctx.fillStyle='#e8ffca';ctx.textAlign='center';ctx.font='600 16px system-ui';ctx.fillText('AIM: POINTER / WASD · RELEASE / SPACE TO SHOOT',320,530);const angle=aimAngle*Math.PI/180;ctx.save();ctx.setLineDash([7,6]);line(g.ball.x,g.ball.y-12,g.ball.x+Math.sin(angle)*130,g.ball.y-Math.cos(angle)*130,'#ffffffbb',3);ctx.restore();}
  const powers=[];if(g.wide>0)powers.push(`WIDE CLEAT ${Math.ceil(g.wide)}s`);if(g.curve>0)powers.push(`CURVE ${Math.ceil(g.curve)}s`);$('#power-status').hidden=!powers.length;$('#power-status').textContent=powers.join(' · ');
}
function frame(now){const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);const padLeft=pad?.buttons[14]?.pressed,padRight=pad?.buttons[15]?.pressed,padUp=pad?.buttons[12]?.pressed,padDown=pad?.buttons[13]?.pressed,padShoot=!!pad?.buttons[0]?.pressed;if(padShoot&&!padShootHeld)action();padShootHeld=padShoot;const elapsed=Math.min((now-last)/1000||0,0.05);last=now;accumulator+=elapsed;while(accumulator>=1/120){if(g.phase==='ready'){target=WIDTH/2;if(keys.has('arrowleft')||keys.has('a')||padLeft)aimAngle-=75/120;if(keys.has('arrowright')||keys.has('d')||padRight)aimAngle+=75/120;if(keys.has('arrowup')||keys.has('w')||padUp)aimAngle-=Math.sign(aimAngle)*Math.min(Math.abs(aimAngle),75/120);if(keys.has('arrowdown')||keys.has('s')||padDown)aimAngle+=(Math.sign(aimAngle)||1)*75/120;aimAngle=clamp(aimAngle,-60,60);}else{if(keys.has('arrowleft')||keys.has('a')||padLeft)target-=610/120;if(keys.has('arrowright')||keys.has('d')||padRight)target+=610/120;}target=clamp(target,paddleWidth(g)/2+8,WIDTH-paddleWidth(g)/2-8);target=Math.round(target);if(['playing','ready'].includes(g.phase))record([target,1]);update(g,1/120,target);accumulator-=1/120;}if(g.events.includes('double-netter'))unlockDoubleNetter();if(g.events.length){const meaningful=g.events.filter(e=>!['hit','bounce'].includes(e));if(meaningful.length)$('#announcement').textContent=meaningful.includes('double-netter')?'Not so Unc after all — Double netter!':meaningful.includes('goal')?'Goal!':meaningful.includes('miss')?'Ball lost. '+g.lives+' lives left.':meaningful.join(' ');g.events=[];sync();}draw();requestAnimationFrame(frame);}
$('#level-list').innerHTML=LEVELS.map((l,i)=>'<li><span>'+String(i+1).padStart(2,'0')+'</span>'+l.name+'<b>'+l.goals+' goals</b></li>').join('');
applyTheme();g=createGame($('#team').value,Object.keys(TEAM_NAMES));sync();requestAnimationFrame(frame);

loadLeaderboard();

function unlockDoubleNetter(){if(testing)return;document.querySelector('#earned-achievements').hidden=false;const panel=document.querySelector('#achievement-detail');panel.textContent='Unlocked: Not so Unc after all — Double netter. One shot, two nets. Pure gaming prowess!';try{localStorage.setItem('ufl-cleat-achievement-double-netter','unlocked');}catch{panel.textContent+=' Browser storage unavailable; this unlock lasts for this visit.';}}
try{if(localStorage.getItem('ufl-cleat-achievement-double-netter')==='unlocked')unlockDoubleNetter();}catch{}

document.querySelector('#test-level').replaceChildren(...LEVELS.map((level,i)=>{const option=document.createElement('option');option.value=i;option.textContent=(i+1)+' · '+level.name;return option;}));
ownerSession().then(owner=>{document.querySelector('#owner-testing').hidden=!owner;});
document.querySelector('#test-start').addEventListener('click',()=>startRun(Number(document.querySelector('#test-level').value)));
document.querySelector('#test-exit').addEventListener('click',()=>startRun(null));
