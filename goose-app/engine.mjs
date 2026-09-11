export const VERSION='goose-v1',DT=1/120,GROUND=392,X=150;
export const pace=g=>(265+g.time*3)/265;
export function createGame(seed){return {rng:seed>>>0,time:0,distance:0,score:0,cans:0,mode:0,y:364,vy:0,jumps:0,objects:[],spawn:1.3,honks:0,drinks:0,rushAt:3,groups:0,over:false};}
function random(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
function add(g,type,x,y,w,h,extra={}){g.objects.push({type,x,y,w,h,...extra});}
function spawnGroup(g){
 const pattern=++g.groups%4,speed=265*pace(g);
 if(pattern===3){const w=Math.round(speed*.95);add(g,'lake',1010,GROUND-6,w,86);for(let i=0;i<5;i++)add(g,'ball',1010+i*w/4,GROUND-130-Math.sin(i/4*Math.PI)*40,18,18);add(g,'can',1010+w+85,GROUND-85,20,30);g.spawn=w/speed+1.8;return;}
 if(pattern===2||pattern===0){const duck=pattern===0,y=GROUND-(duck?142:94);add(g,duck?'duck':'frisbee',1010,y,duck?47:42,duck?30:12,{baseY:y,phase:random(g)*6});for(let i=0;i<4;i++)add(g,'ball',1020+i*46,GROUND-28,18,18);add(g,'can',1290,GROUND-65,20,30);g.spawn=2.2;return;}
 const t=random(g),type=t<.25?'cone':t<.5?'dog':t<.75?'defender':'hurdle';add(g,type,1010,GROUND-(type==='defender'?58:34),type==='dog'?52:34,type==='defender'?58:34);
 for(let i=0;i<4;i++)add(g,'ball',990+i*46,GROUND-110-Math.sin(i/3*Math.PI)*40,18,18);
 if(random(g)<.6)add(g,'can',1260,GROUND-85,20,30);g.spawn=1.9+random(g)*.4;
}
// Input bit 0: hold to glide. Bit 1: a new jump press this tick.
export function step(g,input){
 if(g.over)throw Error('Run is finished.');
 const events=[];if((input&2)&&g.jumps<2){g.vy=g.jumps===0?-570:-470;g.jumps++;events.push({type:'jump',second:g.jumps===2});}
 g.time+=DT;const speed=265*pace(g);g.distance+=speed*DT/12;g.score+=speed*DT/30;g.mode=Math.max(0,g.mode-DT);
 const glide=(input&1)&&g.jumps===2&&g.vy>0;g.vy+=(glide?330:1500)*DT;if(glide)g.vy=Math.min(g.vy,100);g.y+=g.vy*DT;if(g.y>=GROUND-28){g.y=GROUND-28;g.vy=0;g.jumps=0;}
 g.spawn-=DT;if(g.spawn<=0)spawnGroup(g);let rush=false;
 for(const o of g.objects){
  o.x-=(speed+(o.type==='frisbee'?65:o.type==='duck'?35:0))*DT;
  if(o.baseY!==undefined)o.y=o.baseY+Math.sin(g.time*(o.type==='duck'?4:2)+o.phase)*(o.type==='duck'?12:8);
  const hit=X+24>o.x&&X-19<o.x+o.w&&g.y+25>o.y&&g.y-22<o.y+o.h;
  if(!hit)continue;
  if(o.type==='ball'){g.score+=50;o.gone=true;events.push({type:'ball',x:o.x,y:o.y});}
  else if(o.type==='can'){
   g.cans++;g.drinks++;g.score+=100;o.gone=true;
   if(g.drinks>=g.rushAt){g.drinks=0;g.rushAt=g.rushAt===3?4:3;rush=true;}
   if(g.cans>=3){g.cans=0;g.mode=6;events.push({type:'mode'});}else events.push({type:'can'});
  }else if(g.mode>0){if(o.type!=='lake'){g.honks++;g.score+=200;events.push({type:'honk',x:o.x,y:o.y});}o.gone=true;}
  else{g.over=true;events.push({type:'over'});break;}
 }
 g.objects=g.objects.filter(o=>o.x+o.w>-40&&!o.gone&&(!rush||o.type!=='ball'||o.x<X-30));
 if(rush){for(let i=0;i<4;i++)add(g,'defender',X+speed*(.55+i*.5),GROUND-58,34,58);g.spawn=2.8;}
 return events;
}
export function replay(g,steps){
 if(!Array.isArray(steps)||steps.length<1||steps.length>1200)throw Error('Invalid packet.');let ticks=0;
 for(const action of steps){if(!Array.isArray(action)||action.length!==2)throw Error('Invalid input.');const [input,n]=action;if(!Number.isInteger(input)||input<0||input>3||!Number.isInteger(n)||n<1||ticks+n>1200||(input&2)&&n!==1)throw Error('Invalid input.');for(let i=0;i<n;i++)step(g,input);ticks+=n;}
 return {game:g,ticks,finished:g.over};
}
