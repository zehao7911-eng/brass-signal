import assert from 'node:assert/strict';
import {advance,entry,grade,junctions,mergeProfile,newRound,profile,railX,safeCheckpoint,stations,stop,toggle,yards} from './core.mjs';
let count=0;
function check(ok,message){assert(ok,message);count++;}
for(let i=0;i<yards.length;i++){
 let r=newRound(i),arrivals=0,finished=0,restored=false;
 for(let frame=0;frame<3000&&!r.done;frame++){
  const dt=1/60;
  for(const t of r.trains){
   if(t.state!=='moving')continue;
   const predicted=t.z-yards[i].speed*dt;
   if(t.first===null&&predicted<=junctions[0]&&r.levers[0]!== (t.id===0))toggle(r,0);
   if(t.first===false&&t.route===null&&predicted<=junctions[1]&&r.levers[1]!== (t.id===2))toggle(r,1);
  }
  for(const e of advance(r,dt)){
   if(e.type==='arrival')arrivals++;
   if(e.type==='finish')finished++;
   check(e.type!=='miss','Correct routing should never miss');
  }
  if(!restored&&r.trains.some(t=>t.state==='moving'&&t.route!==null)){
   const checkpoint=JSON.parse(JSON.stringify(r));
   r=safeCheckpoint(checkpoint);assert.deepEqual(r,checkpoint);restored=true;
  }
 }
 check(grade(r)===3&&r.chain===yards[i].order.length&&restored,'Perfect shift survives reload');
 check(arrivals===yards[i].order.length&&finished===1&&advance(r,1).length===0,'Arrivals and terminal event exactly once');
}
const r=newRound(0);
advance(r,3.5);
check(r.trains[0].first===false&&r.trains[0].route===null,'First turnout locks independently');
toggle(r,0);toggle(r,1);advance(r,1.5);
check(r.trains[0].route===2&&r.trains[0].first===false,'Second turnout selects exit');
toggle(r,1);advance(r,2);
check(r.trains[0].route===2&&r.points===0,'Committed route survives switching and misses score zero');
check([0,1,2].every(i=>railX(entry,i)===0&&railX(stop,i)===stations[i].x),'Rails connect the shed to all terminals');
check(safeCheckpoint({...r,time:Infinity})===null&&safeCheckpoint({...r,levers:[true]})===null,'Reject malformed checkpoint');
assert.deepEqual(mergeProfile(profile({best:[3],muted:true}),profile({best:[1,2],rewards:{like:true}})),{best:[3,2,0,0,0],muted:true,rewards:{like:true,comment:false}});
console.log(count+' railway checks plus checkpoint and profile assertions');
