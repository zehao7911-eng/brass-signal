export const stations=[
 {name:'Fern',color:0x40c8a1,light:0xa6ffda,hex:'#a6ffda',mark:'●',x:-5.45},
 {name:'Honey',color:0xf5a744,light:0xffd787,hex:'#ffd787',mark:'◆',x:0},
 {name:'Poppy',color:0xfa7281,light:0xffa6b4,hex:'#ffa6b4',mark:'▲',x:5.45},
];
export const yards=[
 {name:'Fern Valley',label:'THE FIRST DEPARTURE',ground:0x668563,bank:0x374e45,back:0x143737,leaf:0x35745e,roof:0x395c63,light:0xffddb0,speed:4.7,gap:4.2,order:[0,1,0,1]},
 {name:'Peach Orchard',label:'THE ORCHARD LINE',ground:0xa37a59,bank:0x654c40,back:0x412a36,leaf:0xb15b46,roof:0x794656,light:0xffbd8a,speed:5.5,gap:3.8,order:[2,1,0,2,0]},
 {name:'Blue Hour',label:'THE LAST LIGHT',ground:0x4a6380,bank:0x313951,back:0x171e3b,leaf:0x45578c,roof:0x414b79,light:0xbac9ff,speed:6.3,gap:3.35,order:[1,2,0,2,1,0]},
 {name:'Copper Summit',label:'THE SUMMIT EXPRESS',ground:0x9b7652,bank:0x503a48,back:0x3a263b,leaf:0xb16455,roof:0x5a4866,light:0xffbf91,speed:7.45,gap:2.8,order:[2,0,1,2,0,1,2]},
 {name:'Moonlight Mail',label:'THE MIDNIGHT MAIL',ground:0x486e78,bank:0x273f50,back:0x111f35,leaf:0x45758c,roof:0x373d62,light:0xc0ddff,speed:8.65,gap:2.35,order:[0,2,1,0,2,0,1,2]},
];
export const entry=15, stop=-12.35, junctions=[5,-2.4];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function railX(z,route){
 if(route===0)return stations[0].x*smooth((junctions[0]-z)/10.6);
 if(route===2)return stations[2].x*smooth((junctions[1]-z)/8.1);
 return 0;
}
const ready=(id,due)=>({id,due,z:entry,first:null,route:null,state:'waiting',dwell:0});
export function newRound(yard){
 const y=yards[yard];
 return {yard,time:0,levers:[false,false],trains:y.order.map((id,i)=>ready(id,1.05+i*y.gap)),points:0,streak:0,chain:0,done:false};
}
export function toggle(round,index){
 if(round.done||index!==0&&index!==1)return false;
 round.levers[index]=!round.levers[index];return true;
}
export function advance(round,dt){
 if(round.done||dt<=0)return [];
 const past=round.time,y=yards[round.yard],events=[];
 round.time+=dt;
 for(const t of round.trains){
  if(t.state==='waiting'&&round.time>=t.due){t.state='moving';events.push({type:'approach',train:t});}
  if(t.state==='moving'){
   t.z=Math.max(stop,entry-y.speed*(round.time-t.due));
   if(t.first===null&&t.z<=junctions[0]){
    t.first=round.levers[0];
    if(t.first)t.route=0;
    events.push({type:'point',index:0,train:t});
   }
   if(t.route===null&&t.z<=junctions[1]){
    t.route=round.levers[1]?2:1;
    events.push({type:'point',index:1,train:t});
   }
   if(t.z===stop){
    t.state='parked';
    const success=t.route===t.id;
    round.points+=Number(success);
    round.streak=success?round.streak+1:0;
    round.chain=Math.max(round.chain,round.streak);
    events.push({type:success?'arrival':'miss',train:t,streak:round.streak});
   }
  }else if(t.state==='parked'){
   t.dwell+=round.time-past;
   if(t.dwell>=1.6)t.state='cleared';
  }
 }
 if(round.trains.every(t=>t.state==='parked'||t.state==='cleared')){
  round.done=true;events.push({type:'finish'});
 }
 return events;
}
export function grade(round){
 const n=round.trains.length;
 return round.points===n?3:round.points===n-1?2:round.points===n-2?1:0;
}
export function safeCheckpoint(data){
 if(!data||!Number.isInteger(data.yard)||!yards[data.yard]||!Number.isFinite(data.time)||data.time<0||data.time>90||data.done!==false)return null;
 const r=newRound(data.yard);
 if(!Array.isArray(data.levers)||data.levers.length!==2||!data.levers.every(v=>typeof v==='boolean')||!Array.isArray(data.trains)||data.trains.length!==r.trains.length)return null;
 for(let i=0;i<r.trains.length;i++){
  const t=data.trains[i],seed=r.trains[i];
  if(!t||t.id!==seed.id||t.due!==seed.due||!['waiting','moving','parked','cleared'].includes(t.state)||![true,false,null].includes(t.first)||![0,1,2,null].includes(t.route)||!Number.isFinite(t.z)||t.z<stop||t.z>entry||!Number.isFinite(t.dwell)||t.dwell<0||t.dwell>2)return null;
  r.trains[i]={id:t.id,due:t.due,z:t.z,first:t.first,route:t.route,state:t.state,dwell:t.dwell};
 }
 for(const k of ['points','streak','chain']){
  if(!Number.isInteger(data[k])||data[k]<0||data[k]>r.trains.length)return null;
  r[k]=data[k];
 }
 r.time=data.time;r.levers=data.levers.slice();return r;
}
export function profile(raw){
 const best=yards.map((_,i)=>Number.isInteger(raw?.best?.[i])?Math.max(0,Math.min(3,raw.best[i])):0);
 return {best,rewards:{like:raw?.rewards?.like===true,comment:raw?.rewards?.comment===true},muted:raw?.muted===true};
}
export function mergeProfile(local,remote){
 const incoming=profile(remote);
 return {
  best:local.best.map((n,i)=>Math.max(n,incoming.best[i])),
  rewards:{like:local.rewards.like||incoming.rewards.like,comment:local.rewards.comment||incoming.rewards.comment},
  muted:local.muted
 };
}
