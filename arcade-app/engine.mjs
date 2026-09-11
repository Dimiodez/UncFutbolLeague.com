export const WIDTH=640, HEIGHT=700, PADDLE_Y=645, BALL_R=9;
export const LEVELS = [
  {name:'First touch',goals:2,speed:330,goalWidth:164,goalSpeed:.65,rows:1,hp:1,wall:false,bus:false},
  {name:'Back four',goals:2,speed:360,goalWidth:150,goalSpeed:.8,rows:2,hp:1,wall:false,bus:false},
  {name:'Brick by brick',goals:3,speed:390,goalWidth:140,goalSpeed:.9,rows:2,hp:2,wall:true,bus:false},
  {name:'Park the bus',goals:3,speed:420,goalWidth:134,goalSpeed:1,rows:2,hp:2,wall:false,bus:true},
  {name:'Half-time hustle',goals:4,speed:450,goalWidth:126,goalSpeed:1.2,rows:2,hp:3,wall:true,bus:true},
  {name:'Double parked',goals:4,speed:480,goalWidth:126,goalSpeed:1.25,rows:2,hp:3,wall:false,bus:true,buses:2},
  {name:'The barricade',goals:4,speed:500,goalWidth:122,goalSpeed:1.3,rows:2,hp:3,wall:true,bus:true,buses:2},
  {name:'Gridlock',goals:4,speed:520,goalWidth:120,goalSpeed:1.35,rows:2,hp:4,wall:true,bus:true,buses:2},
  {name:'No way through',goals:5,speed:540,goalWidth:116,goalSpeed:1.4,rows:2,hp:4,wall:true,bus:true,buses:3},
  {name:'Extra time',goals:5,speed:560,goalWidth:112,goalSpeed:1.5,rows:2,hp:5,wall:true,bus:true,buses:3},
  {name:'Keeper chaos',goals:5,speed:580,goalWidth:110,goalSpeed:1.55,rows:2,hp:5,wall:true,bus:true,buses:3},
  {name:'Last whistle',goals:6,speed:600,goalWidth:108,goalSpeed:1.6,rows:2,hp:6,wall:true,bus:true,buses:3},
];
export function random(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function createGame(playerTeam="gotham",teams=["gotham","bayern","palermo"],seed=1234567){const g={rng:seed>>>0,playerTeam,teams,opponent:null,saveBoost:0,lifeOffered:[false,false,false],segmentScore:0,levelScore:0,invader:null,invaderOffered:false,phase:'intro',level:0,score:0,lives:3,goals:0,time:0,paddleX:320,paddleVelocity:0,wide:0,curve:0,ball:{x:320,y:630,vx:0,vy:0,spin:0},blocks:[],drops:[],particles:[],events:[],destroyed:0};loadLevel(g);g.phase='intro';return g;}
export function loadLevel(g){const family={como:'blue',mountains:'blue',island:'blue',gotham:'green',hamkam:'green',pumas:'gold',jagiellonia:'gold',sandy:'gold',palermo:'pink',bayern:'red',tabasco:'red',legacy:'purple'};const candidates=g.teams.filter(t=>t!==g.playerTeam&&t!==g.opponent&&(!family[t]||family[t]!==family[g.playerTeam]));g.opponent=candidates[Math.floor(random(g)*candidates.length)]||g.teams.find(t=>t!==g.playerTeam);if(g.level%5===0)g.segmentScore=g.score;g.levelScore=g.score;g.invader=null;g.invaderOffered=false;g.goals=0;g.time=0;g.wide=0;g.curve=0;g.drops=[];g.blocks=[];g.destroyed=0;const l=LEVELS[g.level];for(let row=0;row<l.rows;row++)for(let col=0;col<5;col++)g.blocks.push({x:68+col*106+(row%2?13:0),y:178+row*82,w:62,h:42,hp:l.hp,max:l.hp,type:'defender'});if(l.wall)for(let col=0;col<4;col++)g.blocks.push({x:88+col*120,y:377,w:98,h:30,hp:3,max:3,type:'wall'});if(l.bus)g.blocks.push({x:200,y:l.wall?465:370,w:230,h:56,hp:8,max:8,type:'bus'});if(l.buses){g.blocks=g.blocks.filter(b=>b.type!=='bus');for(let i=0;i<l.buses;i++)g.blocks.push({x:i===2?205:48+i*302,y:i===2?525:450,w:i===2?230:190,h:48,hp:8+g.level-5,max:8+g.level-5,type:'bus'});}resetBall(g);}
export function paddleWidth(g){return g.wide>0?156:108;}
export function goalX(g){const l=LEVELS[g.level];return 320+Math.sin(g.time*l.goalSpeed)*(240-l.goalWidth/2);}
export function resetBall(g){g.saveBoost=0;g.phase='ready';g.ball={x:g.paddleX,y:PADDLE_Y-BALL_R-4,vx:0,vy:0,spin:0};}
export function ballSpeed(g){return LEVELS[g.level].speed+g.goals*8+g.saveBoost;}
export function launch(g){if(g.phase!=='ready')return;g.phase='playing';const speed=ballSpeed(g);g.ball.vx=speed*.32;g.ball.vy=-speed*Math.sqrt(1-.32**2);g.ball.spin=g.curve>0?190:0;}
export function advance(g){if(g.phase!=='levelup')return;g.level++;loadLevel(g);}
export function awardGoal(g){g.saveBoost=0;g.score+=500;g.goals++;g.events.push('goal');if(g.goals>=LEVELS[g.level].goals){g.score+=250;g.phase=g.level===LEVELS.length-1?'won':'levelup';g.events.push(g.phase);}else resetBall(g);}
export function checkChallenges(g){const segment=Math.floor(g.level/5);if(!g.lifeOffered[segment]&&g.score-g.segmentScore>=2000){g.lifeOffered[segment]=true;g.invader={x:24,y:530,direction:1,passes:0,time:0};g.events.push('Rare pitch invader! Hit for +1 life.');}}
export function keeperX(g){return clamp(goalX(g)+Math.sin(g.time*(2.5+(g.level-7)*.15))*65,50,590);}
function burst(g,x,y){for(let i=0;i<12;i++)g.particles.push({x,y,vx:Math.cos(i*Math.PI/6)*110,vy:Math.sin(i*Math.PI/6)*110,life:.5});}
function hitBlock(g,block){block.hp--;g.events.push('hit');burst(g,g.ball.x,g.ball.y);if(block.hp<=0){g.score+=block.type==='bus'?300:block.type==='wall'?150:100;g.destroyed++;if(g.destroyed%3===0)g.drops.push({x:block.x+block.w/2,y:block.y,type:g.destroyed%6===0?'curve':'wide'});}}
export function update(g,dt,target){
  if(!['ready','playing'].includes(g.phase))return;
  dt=clamp(dt,0,1/120);const prevX=g.paddleX;const half=paddleWidth(g)/2;
  g.paddleX=clamp(target,half+8,WIDTH-half-8);g.paddleVelocity=dt?g.paddleVelocity*Math.exp(-dt*10)+clamp((g.paddleX-prevX)/dt,-900,900)*(1-Math.exp(-dt*10)):g.paddleVelocity;
  if(g.phase==='playing')g.time+=dt;g.wide=Math.max(0,g.wide-dt);g.curve=Math.max(0,g.curve-dt);
  for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}g.particles=g.particles.filter(p=>p.life>0);
  if(g.phase==='playing')checkChallenges(g);
  for(const d of g.drops){d.y+=150*dt;if(d.y>=PADDLE_Y-12&&d.y<=PADDLE_Y+18&&Math.abs(d.x-g.paddleX)<paddleWidth(g)/2+12){g[d.type]=12;if(d.type==='curve')g.ball.spin=(Math.sign(g.ball.vx)||1)*190;d.y=HEIGHT+50;g.events.push(d.type);}}g.drops=g.drops.filter(d=>d.y<HEIGHT+20);
  if(g.phase==='ready'){g.ball.x=g.paddleX;g.ball.y=PADDLE_Y-BALL_R-4;return;}
  const b=g.ball,oldX=b.x,oldY=b.y;
  if(g.invader){const v=g.invader;v.time+=dt;v.x+=v.direction*(155+g.level*12)*(1+.38*Math.sin(v.time*(4+g.level*.18)))*dt;v.y=535+Math.sin(v.time*(3.2+g.level*.18))*(19+g.level*1.5)+Math.sin(v.time*7)*8;if(v.x>=616||v.x<=24){v.x=clamp(v.x,24,616);v.direction*=-1;v.passes++;if(v.passes>=6){g.invader=null;g.events.push('Invader escaped.');}}}

  if(g.curve<=0)b.spin=0;
  if(g.curve>0&&b.spin){b.vx+=b.spin*dt;const speed=ballSpeed(g);b.vx=clamp(b.vx,-speed*.92,speed*.92);b.vy=Math.sign(b.vy)*Math.sqrt(speed*speed-b.vx*b.vx);}
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(g.invader&&Math.abs(b.x-g.invader.x)<25+BALL_R&&Math.abs(b.y-g.invader.y)<24+BALL_R){g.invader=null;g.lives++;g.events.push('Invader caught — extra life!');burst(g,b.x,b.y);}
  if(g.level>=7&&b.vy<0&&oldY-BALL_R>=101&&b.y-BALL_R<=101&&Math.abs(b.x-keeperX(g))<=40+BALL_R){g.saveBoost+=35;const speed=ballSpeed(g),ratio=speed/Math.hypot(b.vx,b.vy);b.vx*=ratio;b.vy=Math.abs(b.vy)*ratio;b.y=101+BALL_R;g.events.push('Keeper save — ball faster!');}
  if(b.x<BALL_R+7){b.x=BALL_R+7;b.vx=Math.abs(b.vx);b.spin*=-1;}if(b.x>WIDTH-BALL_R-7){b.x=WIDTH-BALL_R-7;b.vx=-Math.abs(b.vx);b.spin*=-1;}
  if(b.y<=40+BALL_R&&b.vy<0){const l=LEVELS[g.level];if(Math.abs(b.x-goalX(g))<l.goalWidth/2-BALL_R){burst(g,b.x,b.y);awardGoal(g);return;}b.y=40+BALL_R;b.vy=Math.abs(b.vy);}
  if(b.vy>0&&oldY+BALL_R<=PADDLE_Y&&b.y+BALL_R>=PADDLE_Y&&Math.abs(b.x-g.paddleX)<=paddleWidth(g)/2+BALL_R){const offset=clamp((b.x-g.paddleX)/(paddleWidth(g)/2),-1,1);const a=offset*1.08,s=ballSpeed(g);b.y=PADDLE_Y-BALL_R;b.vx=Math.sin(a)*s;b.vy=-Math.cos(a)*s;b.spin=g.curve>0?clamp(offset*230+g.paddleVelocity*.42,-300,300):0;g.events.push('bounce');}
  for(const block of g.blocks){if(block.hp<=0)continue;if(b.x+BALL_R>block.x&&b.x-BALL_R<block.x+block.w&&b.y+BALL_R>block.y&&b.y-BALL_R<block.y+block.h){if(oldY+BALL_R<=block.y){b.y=block.y-BALL_R;b.vy=-Math.abs(b.vy);}else if(oldY-BALL_R>=block.y+block.h){b.y=block.y+block.h+BALL_R;b.vy=Math.abs(b.vy);}else if(oldX<block.x){b.x=block.x-BALL_R;b.vx=-Math.abs(b.vx);}else{b.x=block.x+block.w+BALL_R;b.vx=Math.abs(b.vx);}hitBlock(g,block);break;}}
  if(b.y>HEIGHT+BALL_R){g.lives--;g.saveBoost=0;g.invader=null;g.events.push('miss');g.wide=0;g.curve=0;g.drops=[];if(g.lives<=0){g.phase='over';g.events.push('over');}else resetBall(g);}
}
