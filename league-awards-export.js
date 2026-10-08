import {awardSlots,awardPeriod} from './league-awards-model.js';

async function loadArtwork(url){
 if(!url)return null;
 return new Promise(resolve=>{const img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(()=>resolve(null),5000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);resolve(null);};img.src=url;});
}
export async function downloadAwardImage({settings,board,demo=false}){
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1900;const context=canvas.getContext('2d');
 const gradient=context.createLinearGradient(0,0,0,1900);gradient.addColorStop(0,'#123c4b');gradient.addColorStop(1,'#07172b');context.fillStyle=gradient;context.fillRect(0,0,1600,1900);
 const text=(value,x,y,size=30,color='#fff',maxWidth=1480)=>{context.fillStyle=color;context.font=`600 ${size}px system-ui, sans-serif`;context.textAlign='center';context.fillText(value,x,y,maxWidth);};
 const incomplete=Object.keys(board.selections).length<11;
 text(`${demo?'SAMPLE — ':incomplete?'DRAFT — ':''}${board.type==='week'?'TEAM OF THE WEEK':'TEAM OF THE SEASON'}`,800,95,55);
 text(`${settings.league} · ${settings.season}`,800,155,32);const period=awardPeriod(board);
 text(board.type==='week'?`${period.from} – ${period.to} · ${settings.timeZone}`:`Full season · ${settings.format}`,800,205,25,'#b7ccdf');
 context.fillStyle='#0c483f';context.fillRect(70,260,1460,1460);context.strokeStyle='#ffffff45';context.lineWidth=4;context.strokeRect(100,290,1400,1400);context.beginPath();context.moveTo(100,990);context.lineTo(1500,990);context.stroke();context.beginPath();context.arc(800,990,160,0,Math.PI*2);context.stroke();context.strokeRect(470,290,660,220);context.strokeRect(470,1470,660,220);
 let missing=0;
 const artwork=await Promise.all(awardSlots(board.formation).map(async slot=>{const player=board.selections[slot.id];return {slot,player,face:player?await loadArtwork(player.portraitUrl):null,badge:player?await loadArtwork(player.badgeUrl):null};}));
 for(const {slot,player,face,badge} of artwork){
  const x=70+slot.x*14.6,y=285+slot.y*14.1;
  const width=Math.min(264,slot.width*14.6);context.fillStyle='#0b1b2b';context.fillRect(x-width/2,y-70,width,205);
  if(face){const side=Math.min(face.width,face.height),sx=(face.width-side)/2;context.drawImage(face,sx,0,side,side,x-62,y-60,124,124);}else{if(player?.portraitUrl)missing++;context.fillStyle='#254c65';context.beginPath();context.arc(x,y,52,0,Math.PI*2);context.fill();text(player?.name.slice(0,2).toUpperCase()||slot.position,x,y+10,30);}
  text(player?.name||slot.id,x,y+92,23,'#fff',width-12);text(player?`${slot.position} · ${player.averageRating.toFixed(2)}`:'Unfilled',x,y+123,20,'#f5ce6a',width-12);
  if(badge)context.drawImage(badge,x+70,y+20,44,44);else if(player?.badgeUrl)missing++;
 }
 text(`${board.formation} · ${settings.format} awards · UNC FÚTBOL LEAGUE`,800,1790,27);
 if(demo)text('SAMPLE PLAYERS / FABRICATED RATINGS — NOT AN OFFICIAL AWARD',800,1845,24,'#f5ce6a');
 else if(incomplete)text(`DRAFT · ${Object.keys(board.selections).length}/11 positions selected`,800,1845,24,'#f5ce6a');
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('The browser could not generate the image.');
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${demo?'sample-':incomplete?'draft-':''}${settings.format}-${board.type==='week'?`totw-${board.weekDate}`:'tots'}-${settings.league.replace(/[^a-z0-9]+/gi,'-')}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return missing;
}
