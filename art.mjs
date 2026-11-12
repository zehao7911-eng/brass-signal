import {yards,stations,railX} from './core.mjs';
const T=globalThis.THREE;
const {PI,sin,cos,max,min}=Math;
const X=new T.Vector3(1,0,0), Y=new T.Vector3(0,1,0), Z=new T.Vector3(0,0,1);
const v=(x,y,z)=>new T.Vector3(x,y,z);
const lerp=(a,b,f)=>a+(b-a)*f;
const ease=f=>f*f*(3-2*f);
const unit={
 box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(.5,14,9),
 cyl:new T.CylinderGeometry(.5,.5,1,16),cone:new T.CylinderGeometry(.19,.5,1,12),
 gold:new T.TorusGeometry(.43,.075,8,24),leaf:new T.DodecahedronGeometry(.5,1),
 pine:new T.ConeGeometry(.5,1,8), roof:new T.CylinderGeometry(1,1,1,3)
};
const materials=new Map();
function mat(color,finish='paint'){
 const k=color+':'+finish;
 if(!materials.has(k)){
  const c=new T.Color(color).convertSRGBToLinear();
  materials.set(k,new T.MeshStandardMaterial({color:c,roughness:finish==='metal'?.36:finish==='glow'?.48:.81,metalness:finish==='metal'?.43:.04,emissive:finish==='glow'?c:0,emissiveIntensity:finish==='glow'?.55:0}));
 }
 return materials.get(k);
}
const CREAM=0xffe4b5,BRASS=0xc79449, STEEL=0xb4c3c4,INK=0x233540,WOOD=0x775144,DARK=0x44352f;
function add(p,g,color,x,y,z,a,b,c,rx=0,ry=0,rz=0,finish='paint'){
 const o=new T.Mesh(unit[g]??g,mat(color,finish));o.position.set(x,y,z);o.scale.set(a,b,c);o.rotation.set(rx,ry,rz);p.add(o);return o;
}
const cube=(p,c,x,y,z,w,h,d,rz=0)=>add(p,'box',c,x,y,z,w,h,d,0,0,rz);
const ball=(p,c,x,y,z,w,h,d)=>add(p,'ball',c,x,y,z,w,h,d);
const tube=(p,c,x,y,z,w,h,d,rx=0,rz=0,finish='paint')=>add(p,'cyl',c,x,y,z,w,h,d,rx,0,rz,finish);
function bar(p,c,a,b,w,d=w,finish='paint'){
 const o=add(p,'box',c,0,0,0,w,1,d,0,0,0,finish);o.position.copy(a).lerp(b,.5);
 o.scale.y=a.distanceTo(b);o.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());return o;
}
function batch(group){
 group.updateMatrixWorld(true);
 const entries=new Map();
 for(const mesh of [...group.children]){
  if(!mesh.isMesh)continue;
  const key=mesh.geometry.id+':'+mesh.material.id;
  const list=entries.get(key)??[];list.push(mesh);entries.set(key,list);
 }
 for(const list of entries.values()){
  if(list.length<2)continue;
  const {geometry,material}=list[0],o=new T.InstancedMesh(geometry,material,list.length);
  for(let i=0;i<list.length;i++){o.setMatrixAt(i,list[i].matrix);group.remove(list[i]);}
  o.computeBoundingSphere?.();group.add(o);
 }
}
function seed(n){return()=>{n=(Math.imul(n,1664525)+1013904223)|0;return (n>>>0)/4294967296;};}
function tone(color,delta){return new T.Color(color).multiplyScalar(Math.round(delta*15)/15).getHex();}
function tracks(p){
 const paths=[[1,17.25,-14.2],[0,5,-14.2],[2,-2.4,-14.2]];
 for(const [lane,start,end] of paths){
  const prev=.075,point=z=>railX(z,lane),heading=z=>Math.atan2(point(z+prev)-point(z-prev),2*prev);
  for(let z=start;z>end;z-=.61){
   if(lane!==1&&Math.abs(point(z))<.47)continue;
   const h=heading(z),x=point(z);
   add(p,'box',WOOD,x,.105,z,1.42,.19,.23,0,h);
   add(p,'box',0x9e7057,x,.203,z,1.32,.027,.18,0,h);
   for(const k of [-.46,.46]){
    const xx=x+k*cos(h),zz=z-k*sin(h);
    tube(p,0x746760,xx,.226,zz,.09,.045,.09);
   }
  }
  for(const k of [-.46,.46]){
   const points=[];
   for(let z=start;z>end;z-=.24){
    if(lane!==1&&Math.abs(point(z))<.095)continue;
    const h=heading(z);points.push(v(point(z)+k*cos(h),.25,z-k*sin(h)));
   }
   points.push(v(point(end)+k,.25,end));
   const curve=new T.CatmullRomCurve3(points);
   add(p,new T.TubeGeometry(curve,points.length,.045,6,false),STEEL,0,0,0,1,1,1,0,0,0,'metal');
  }
 }
}
function lamp(p,x,z,lit=0xffdb95){
 const c=INK;
 tube(p,c,x,.12,z,.32,.23,.32);tube(p,c,x,.83,z,.12,1.42,.12);
 tube(p,BRASS,x,1.37,z,.2,.085,.2);tube(p,c,x,1.51,z,.30,.10,.30);
 add(p,'cyl',lit,x,1.68,z,.24,.27,.24,0,0,0,'glow');
 add(p,'cone',c,x,1.87,z,.39,.15,.39);
 ball(p,BRASS,x,1.99,z,.115,.115,.115);
 for(const u of [-.103,.103])for(const w of [-.103,.103])cube(p,c,x+u,1.68,z+w,.024,.28,.024);
}
function tree(p,x,z,h,c,rand,pine=false){
 const trunk=0x775247;
 tube(p,trunk,x,h*.36,z,h*.16,h*.73,h*.16);
 if(pine){
  for(let i=0;i<3;i++)add(p,'pine',tone(c,.8+i*.17),x,h*(.55+i*.21),z,h*(.94-i*.18),h*.60,h*(.94-i*.18));
 }else{
  const cloud=(ox,oy,oz,s,k)=>add(p,'leaf',tone(c,k),x+ox*h,h*oy,z+oz*h,h*s,h*s*.88,h*s,rand(),rand()*6,rand());
  cloud(0,.96,0,1,.83);cloud(-.27,1.07,-.08,.69,1.16);cloud(.24,.93,.18,.70,1.05);cloud(.10,1.25,.03,.70,1.25);cloud(-.14,.91,.28,.64,.98);
 }
}
function crate(p,x,y,z,size){
 const s=size;
 cube(p,0xa97855,x,y+s*.5,z,s,s,s);
 for(const k of [-.38,.38]){
  cube(p,0xd5a271,x+k*s,y+s*.5,z+s*.51,s*.12,s,s*.045);
  cube(p,0xd5a271,x,y+s*.5,z+k*s,s*1.018,s*.10,s*.07);
 }
 bar(p,0xc49568,v(x-s*.38,y+s*.13,z+s*.53),v(x+s*.39,y+s*.87,z+s*.53),s*.10,s*.055);
}
function terminal(p,station,index,yard){
 const x=station.x,z=-12.5, side=index===2?-1:1,wall=tone(station.color,.73);
 cube(p,0x596269,x+side*1.41,.15,z,1.36,.29,4.36);
 cube(p,0x9e9f8b,x+side*1.41,.31,z,1.42,.075,4.40);
 for(let i=0;i<10;i++){
  cube(p,0xd1bc8f,x+side*.76,.365,z-1.97+i*.43,.15,.052,.39);
  cube(p,0x777a75,x+side*1.40,.354,z-1.97+i*.43,1.10,.024,.016);
 }
 cube(p,0xa18166,x+side*1.98,.78,z-1.23,.85,.88,1.84);
 cube(p,wall,x+side*1.98,1.05,z-1.26,.91,.96,1.80);
 for(const i of [-1,1]){
  const xx=x+side*1.98,zz=z-1.27+i*.49;
  cube(p,INK,xx,1.06,zz,1,.50,.41);
  add(p,'box',0xffd584,xx,1.06,zz,1.015,.40,.32,0,0,0,'glow');
  cube(p,wall,xx,1.06,zz,1.03,.034,.32);cube(p,wall,xx,1.06,zz,1.03,.40,.032);
 }
 for(const zz of [z-2,z-.66,z+.78,z+1.83]){
  for(const xx of [x+side*.86,x+side*2.01]){
   cube(p,0x354649,xx,.99,zz,.095,1.33,.095);
   cube(p,BRASS,xx,.46,zz,.16,.25,.16);
  }
  bar(p,CREAM,v(x+side*.84,1.62,zz),v(x+side*1.46,1.95,zz),.082);
  bar(p,CREAM,v(x+side*1.46,1.95,zz),v(x+side*2.14,1.62,zz),.082);
 }
 for(const k of [-1,1]){
  const xx=x+side*1.49+k*.37;
  cube(p,wall,xx,1.86,z-.09,.84,.115,4.31,k*-.37);
  for(let j=0;j<13;j++)cube(p,tone(station.color,.87),xx,1.923,z-2.16+j*.34,.80,.05,.026,k*-.37);
 }
 tube(p,BRASS,x+side*1.49,2.015,z-.09,.08,4.4,.08,PI/2);
 const fx=x-.4;
 for(const k of [-1,1]){
  tube(p,INK,x+k*.48,.43,-14.53,.14,.86,.14);
  bar(p,DARK,v(x+k*.49,.12,-13.93),v(x+k*.49,.63,-14.50),.10);
 }
 cube(p,BRASS,x,.65,-14.48,1.26,.21,.16);
 const mark=(p,c,x,y,z)=>index===0?add(p,'ball',c,x,y,z,.29,.29,.12):index===1?cube(p,c,x,y,z,.22,.22,.12,PI/4):add(p,'roof',c,x,y,z,.185,.12,.185,PI/2);
 mark(p,station.light,fx,1.8,z+1.91);
 tube(p,INK,fx,1.01,z+1.91,.09,1.70,.09);
 crate(p,x+side*1.64,.36,z+1.18,.36);
 lamp(p,x-side*1.10,z-1.40);
}
function shed(p,yard){
 const z=15.85, wall=yard.roof;
 for(const x of [-1.45,1.45]){
  cube(p,0xb89473,x,1.06,z,.22,2.14,3.58);
  for(let i=0;i<7;i++)cube(p,tone(wall,.88+i*.028),x,.26+i*.29,z,.245,.24,3.67);
  for(const zz of [14.00,15.85,17.62])cube(p,CREAM,x,1.02,zz,.21,2.04,.14);
 }
 for(const [k,x] of [[-1,-.80],[1,.80]]){
  cube(p,wall,x,2.51,z,1.76,.18,3.96,-k*.45);
  for(let n=0;n<15;n++)cube(p,tone(wall,1.35),x,2.62,z-1.87+n*.27,1.73,.034,.025,-k*.45);
  bar(p,CREAM,v(k*1.58,2.13,13.94),v(0,2.95,13.94),.115);
  bar(p,CREAM,v(k*1.58,2.13,17.77),v(0,2.95,17.77),.095);
 }
 tube(p,BRASS,0,2.97,z,.10,4.03,.10,PI/2);
 cube(p,CREAM,0,2.04,14.02,2.87,.18,.16);
 cube(p,INK,0,2.23,13.87,.84,.25,.05);
 for(const x of [-.27,0,.27])ball(p,BRASS,x,2.23,13.83,.07,.07,.07);
 lamp(p,-2.13,14.34);crate(p,2.16,0,14.88,.55);crate(p,2.12,0,15.55,.49);
}
function landscape(p,yard,index){
 const rand=seed(8030+index*71);
 cube(p,yard.bank,0,-.73,.52,17.4,1.05,36.7);
 cube(p,tone(yard.bank,1.18),0,-.23,.52,17.6,.18,36.85);
 cube(p,yard.ground,0,-.135,.52,17.49,.265,36.78);
 for(const s of [-1,1]){
  for(let i=0;i<17;i++){
   const z=-16.9+i*2.10,x=s*8.44;
   cube(p,tone(yard.bank,1.03+(i%3)*.105),x,-.29,z,.32,.38,2.05);
   cube(p,tone(yard.bank,1.23+(i%3)*.09),x,-.04,z,.45,.12,2.09);
  }
 }
 for(let i=0;i<20;i++){
  const s=i<10?-1:1,z=12.45-(i%10)*1.27;
  const x=s*(3.35+sin(z*.33)*.61);
  add(p,'leaf',tone(yard.ground,1.12+(i%3)*.05),x,.022,z,1.22,.045,1.39,0,i*.61);
  for(let j=0;j<3;j++){
   const scale=.12+rand()*.21;
   ball(p,0xb4a295,x+(rand()-.5)*.9,.043,z+(rand()-.5)*.8,scale,scale*.28,scale*.67);
  }
 }
 for(const [x,z] of [[3.7,12.4],[-4.3,8.3],[5.4,-1.1],[-6.4,-7.9],[2.9,-11.1]]){
  for(let i=0;i<5;i++){
   const px=x+sin(i*3)*.53,pz=z+cos(i*3)*.56,h=.17+(i%3)*.16;
   for(let j=0;j<5;j++)add(p,'ball',tone(yard.leaf,1.18+(j%3)*.17),px+sin(j*1.28)*h*.29,h*.49,pz+cos(j*1.28)*h*.29,h*.26,h*.95,h*.30,cos(j*1.28)*.55,j*1.28,sin(j*1.28)*.57);
   if(i%2===1)ball(p,index===2?0xa2aee4:0xf8cb88,px,h*.99,pz,.115,.084,.115);
  }
 }
 for(const [x,z] of [[2.65,10.95],[-3.18,14.47],[5.57,-3.35]]){
  crate(p,x,0,z,.56);crate(p,x+.52,0,z+.19,.43);
  tube(p,0x886354,x-.49,.23,z-.24,.40,.46,.40);
  for(const h of [.085,.39])tube(p,INK,x-.49,h,z-.24,.414,.049,.414);
 }
 const color=[0xc8ba9d,0xe2ab80,0x979bad,0xd1ac81,0x86a5ae][index];
 for(const [lane,start,end] of [[1,17.2,-14.2],[0,5,-14.2],[2,-2.4,-14.2]]){
  for(let z=start;z>end;z-=.55){
   const x=railX(z,lane);
   if(lane!==1&&Math.abs(x)<.55)continue;
   for(let i=0;i<4;i++){
    const k=(i<2?-1:1)*(.72+rand()*.23);
    add(p,'leaf',tone(color,.60+rand()*.63),x+k,.035,z+(rand()-.5)*.42,.09+rand()*.13,.07+rand()*.06,.14,0,rand()*6);
   }
  }
 }
 for(let i=0;i<185;i++){
  const x=(rand()-.5)*16.8,z=(rand()-.5)*35+1;
  if([0,1,2].some(l=>Math.abs(railX(z,l)-x)<1.55)||z<-10&&z>-15||z>13&&Math.abs(x)<3)continue;
  const size=.13+rand()*.43;
  add(p,'leaf',tone(yard.ground,.78+rand()*.45),x,.015,z,size,.035,size*1.44,0,rand()*6);
  if(rand()<.52)for(let j=0;j<3;j++){
   const px=x+(rand()-.5)*.28,pz=z+(rand()-.5)*.3,h=.09+rand()*.17;
   add(p,'pine',tone(yard.leaf,.86+rand()*.64),px,h*.47,pz,.055,h,.065,0,rand()*6,(rand()-.5)*.49);
   if(index!==2&&rand()<.24)ball(p,index===1?0xffb4a2:0xffda82,px,h*.98,pz,.09,.077,.09);
  }
 }
 for(const s of [-1,1]){
  for(let i=0;i<16;i++){
   const z=-16+i*2.18+rand()*.9,x=s*(7.28+rand()*1.02);
   if(index===1&&i>3&&i<11){
    tree(p,x,z,1.45+rand()*.32,yard.leaf,rand);
    for(let k=0;k<6;k++)ball(p,0xf4b279,x+sin(k*2.4)*.50,1.48+rand()*.47,z+cos(k*2.4)*.51,.17,.17,.17);
   }else if(i%3!==1||rand()<.62)tree(p,x,z,1.15+rand()*1.36,tone(yard.leaf,.86+rand()*.34),rand,index>1);
   if(i%2===0){
    const h=.21+rand()*.4;
    add(p,'leaf',tone(yard.bank,1.22+rand()*.44),s*(6.8+rand()*1.1),h*.2,z-.8,h*1.7,h,h*1.5,rand(),rand()*6);
   }
  }
  for(const z of [-7,2.25,10.5])lamp(p,s*6.52,z);
 }
 // A distinct scenic landmark in each district.
 const x=index%2===0?-4.8:4.8,z=9;
 if(index===0){
  for(const xx of [-.62,.62])for(const zz of [-.61,.61])cube(p,WOOD,x+xx,1.02,z+zz,.17,2.04,.17);
  for(const s of [-1,1]){
   bar(p,BRASS,v(x-.62,.19,z+s*.61),v(x+.62,1.83,z+s*.61),.08);
   bar(p,BRASS,v(x-.62,1.83,z+s*.61),v(x+.62,.19,z+s*.61),.08);
  }
  tube(p,0x91a5a2,x,2.52,z,1.63,1.25,1.63);
  for(const h of [1.96,2.13,2.88,3.10])tube(p,BRASS,x,h,z,1.69,.066,1.69);
  add(p,'cone',yard.roof,x,3.20,z,1.83,.31,1.83);
 }else if(index===1){
  for(let row=0;row<2;row++)for(let col=0;col<3;col++)crate(p,x+col*.56-.55,row*.5,z,.49);
  cube(p,CREAM,x,1.62,z-.30,2.07,.12,1.19);
  for(let i=0;i<6;i++)cube(p,i%2?0xe07765:CREAM,x-.88+i*.35,1.58,z+.30,.35,.10,.29);
  for(const k of [-1,1])cube(p,WOOD,x+k*.88,.81,z-.5,.09,1.62,.09);
 }else{
  tube(p,0x7d8588,x,.22,z,1.5,.44,1.5);
  add(p,'cone',0xd3a783,x,1.32,z,1.13,1.90,1.13,0,0,PI);
  tube(p,INK,x,2.33,z,1.18,.18,1.18);
  add(p,'cyl',0xffdb9a,x,2.63,z,.67,.43,.67,0,0,0,'glow');
  add(p,'cone',yard.roof,x,2.98,z,1.19,.28,1.19);
 }
 for(let i=0;i<24;i++){
  const z=-16+i*1.42,x=-8.25;
  cube(p,tone(yard.bank,1.41),x,.29,z,.105,.57,.105);
  if(i<23)cube(p,tone(yard.bank,1.19),x,.41,z+.71,.06,.085,1.42);
 }
}
function turnout(p,i){
 const x=1.76,z=i===0?5:-2.4;
 cube(p,DARK,x,.105,z,.69,.22,.65);
 cube(p,0x647071,x,.22,z,.56,.09,.54);
 tube(p,BRASS,x,.31,z,.23,.16,.23);
 const lever=new T.Group();lever.position.set(x,.38,z);p.add(lever);
 tube(lever,STEEL,0,.27,0,.098,.59,.098,0,0,'metal');
 ball(lever,0xe48246,0,.59,0,.27,.25,.24);
 tube(p,INK,x,.73,z-.51,.11,1.46,.11);
 ball(p,INK,x,1.45,z-.51,.38,.40,.29);
 const lens=add(p,'ball',stations[1].light,x,1.48,z-.37,.225,.235,.09,0,0,0,'glow');
 bar(p,0x756d60,v(.63,.15,z+.20),v(x-.17,.15,z+.20),.085);
 for(const xx of [.78,1.07,1.37])tube(p,BRASS,xx,.145,z+.20,.13,.13,.13);
 const blades=[];
 for(const k of [-.46,.46]){
  const blade=new T.Group();blade.position.set(k,.28,z+.72);p.add(blade);
  cube(blade,BRASS,0,0,-.81,.055,.055,1.62);
  blades.push(blade);
 }
 return {lever,lens,blades,x,z};
}
function train(p,index){
 const station=stations[index],c=station.color,dark=tone(c,.39),rim=tone(c,1.17);
 const root=new T.Group(),body=new T.Group();p.add(root);root.add(body);
 const axle=[];
 cube(body,INK,0,.63,0,1.17,.19,2.68);
 cube(body,dark,0,.76,-.05,1.23,.14,2.55);
 tube(body,c,0,1.19,-.40,.86,1.67,.86,PI/2);
 tube(body,dark,0,1.19,-1.24,.88,.18,.88,PI/2);
 for(const z of [-.97,-.43,.15])tube(body,BRASS,0,1.19,z,.891,.055,.891,PI/2,0,'metal');
 tube(body,INK,0,1.19,-1.36,.70,.09,.70,PI/2);
 add(body,'gold',BRASS,0,1.19,-1.423,.70,.70,.62,0,0,0,'metal');
 ball(body,BRASS,0,1.19,-1.46,.12,.12,.09);
 for(const i of [-1,1]){
  tube(body,BRASS,i*.54,.89,-.43,.055,1.50,.055,PI/2,0,'metal');
  tube(body,INK,i*.57,.60,-1.17,.30,.35,.30,PI/2);
  tube(body,STEEL,i*.57,.60,-1.38,.20,.10,.20,PI/2,0,'metal');
  cube(body,c,i*.48,1.27,.79,.13,1.0,.81);
  cube(body,BRASS,i*.55,1.43,.70,.033,.56,.53);
  cube(body,INK,i*.573,1.43,.70,.035,.47,.44);
  add(body,'box',0x94c7c4,i*.595,1.43,.70,.025,.39,.37,0,0,0,'glow');
  cube(body,dark,i*.617,1.43,.70,.022,.39,.036);
  cube(body,dark,i*.40,1.26,1.20,.30,1.02,.105);
  cube(body,BRASS,i*.34,.55,1.24,.32,.10,.26);
  cube(body,CREAM,i*.34,.47,1.24,.28,.056,.21);
  cube(body,rim,i*.23,1.82,.76,.52,.16,1.05,i*-.16);
 }
 cube(body,dark,0,1.78,.76,1.22,.16,1.16);
 cube(body,BRASS,0,1.86,.76,.92,.06,1.10);
 tube(body,BRASS,0,1.75,-.89,.26,.37,.26,0,0,'metal');
 tube(body,dark,0,1.86,-.89,.22,.36,.22);
 add(body,'cone',dark,0,2.04,-.89,.42,.19,.42,0,0,PI);
 tube(body,INK,0,2.15,-.89,.36,.059,.36);
 tube(body,BRASS,0,1.65,-.10,.32,.21,.32,0,0,'metal');
 ball(body,BRASS,0,1.77,-.10,.34,.20,.34);
 tube(body,BRASS,0,1.69,-1.33,.31,.25,.31,PI/2,0,'metal');
 const headlight=add(body,'ball',station.light,0,1.69,-1.479,.224,.224,.11,0,0,0,'glow');
 cube(body,c,0,.59,-1.37,1.27,.17,.18);
 for(let k=-3;k<=3;k++)bar(body,k%2?INK:BRASS,v(k*.175,.38,-1.61),v(k*.16,.63,-1.33),.062);
 cube(body,BRASS,0,.36,-1.60,1.27,.055,.095);
 for(const side of [-1,1]){
  const rods=[];
  for(let i=0;i<3;i++){
   const w=new T.Group(),z=-.85+i*.73;
   w.position.set(side*.56,.356,z);root.add(w);
   tube(w,INK,0,0,0,.689,.15,.689,0,PI/2);
   tube(w,STEEL,side*.065,0,0,.628,.10,.628,0,PI/2,'metal');
   tube(w,dark,side*.127,0,0,.526,.038,.526,0,PI/2);
   for(let n=0;n<7;n++){
    const angle=n*PI*2/7;
    bar(w,BRASS,v(side*.15,0,0),v(side*.15,sin(angle)*.258,cos(angle)*.258),.036);
   }
   tube(w,BRASS,side*.17,0,0,.151,.068,.151,0,PI/2,'metal');
   ball(w,STEEL,side*.19,.14,0,.08,.094,.094);
   batch(w);axle.push(w);
  }
  const rod=cube(root,STEEL,side*.766,.356,-.121,.055,.062,1.56);
  rods.push(rod);
  const link=cube(root,BRASS,side*.806,.356,-.45,.034,.047,1.07);
  axle.push({rod,link,side});
 }
 batch(body);
 const puff=new T.Group();root.add(puff);const clouds=[];
 for(let i=0;i<8;i++){const mesh=ball(puff,0xffe5cb,0,0,0,.1,.1,.1);mesh.material=new T.MeshBasicMaterial({color:0xffe9d6,transparent:true,depthWrite:false});clouds.push(mesh);}
 return {root,body,axle,clouds,station,headlight};
}
export class RailView{
 constructor(container){
  this.container=container;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.outputEncoding=T.sRGBEncoding;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  container.append(this.renderer.domElement);
  this.scene=new T.Scene();
  this.camera=new T.OrthographicCamera(-1,1,1,-1,.05,160);
  this.hemi=new T.HemisphereLight(0xffebd6,0x617d91,1.45);
  this.sun=new T.DirectionalLight(0xffe3ac,2.15);this.sun.position.set(-10,18,7);
  this.sun.castShadow=true;
  const shadow=this.sun.shadow;
  shadow.mapSize.set(1536,1536);shadow.autoUpdate=false;shadow.normalBias=.028;shadow.bias=-.00022;
  Object.assign(shadow.camera,{left:-18,right:18,top:23,bottom:-23,near:.8,far:52});shadow.camera.updateProjectionMatrix();
  this.bounce=new T.DirectionalLight(0xb7ddff,.62);this.bounce.position.set(11,6,-14);
  this.scene.add(this.hemi,this.sun,this.bounce);
  this.world=new T.Group();this.scene.add(this.world);
  this.dynamics=new T.Group();this.scene.add(this.dynamics);
  this.engines=Array.from({length:9},(_,i)=>train(this.dynamics,i%3));
  this.introEngine=this.engines[0];
  this.spark=new T.InstancedMesh(unit.ball,mat(0xffe398,'glow'),112);
  this.spark.frustumCulled=false;this.scene.add(this.spark);
  this.particles=[];this.dummy=new T.Object3D();
  const ctx=document.createElement('canvas');ctx.width=ctx.height=64;
  const g=ctx.getContext('2d'),a=g.createRadialGradient(32,32,2,32,32,32);
  a.addColorStop(0,'rgba(13,24,30,.55)');a.addColorStop(.44,'rgba(13,24,30,.35)');a.addColorStop(1,'rgba(13,24,30,0)');
  g.fillStyle=a;g.fillRect(0,0,64,64);
  const texture=new T.CanvasTexture(ctx);this.shadowMat=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  this.shadowGeo=new T.PlaneGeometry(1,1);
  for(const e of this.engines){e.shadow=this.shadow(this.dynamics,0,0,2.6,3.45);}
  this.resize();this.setYard(0);
 }
 shadow(p,x,z,w,h){
  const m=new T.Mesh(this.shadowGeo,this.shadowMat);m.position.set(x,.012,z);m.rotation.x=-PI/2;m.scale.set(w,h,1);p.add(m);return m;
 }
 resize(){
  const width=this.container.clientWidth||1,height=this.container.clientHeight||1;
  this.width=width;this.height=height;this.aspect=width/height;
  const device=window.devicePixelRatio||1;
  this.renderer.setPixelRatio(min(device,width<700?1.55:1.75,Math.sqrt(2600000/(width*height))));
  this.renderer.setSize(width,height,false);
 }
 setYard(index){
  const old=this.world;this.scene.remove(old);
  old.traverse(o=>{if(o.geometry&&!Object.values(unit).includes(o.geometry)&&o.geometry!==this.shadowGeo)o.geometry.dispose();o.dispose?.();});
  this.world=new T.Group();this.scene.add(this.world);
  const yard=yards[index];this.yard=index;
  this.scene.background=new T.Color(yard.back);
  this.scene.fog=new T.Fog(yard.back,52,102);
  this.sun.color.set(yard.light);this.hemi.intensity=index===2||index===4?1.27:1.48;
  this.sun.intensity=index===2||index===4?1.32:1.77;
  const decor=new T.Group();this.world.add(decor);
  landscape(decor,yard,index);tracks(decor);shed(decor,yard);stations.forEach((s,i)=>terminal(decor,s,i,yard));
  this.shadow(this.world,0,15.65,5.3,4.6);
  for(const s of stations)this.shadow(this.world,s.x+1.18,-12.7,3.9,5.2);
  const operator=new T.Group();operator.position.set(3.00,0,12.3);this.world.add(operator);
  cube(operator,0x846759,0,.10,0,.98,.2,.84);
  for(const s of [-1,1]){
   ball(operator,INK,s*.14,.23,.035,.23,.18,.31);
   tube(operator,0x425564,s*.13,.40,0,.16,.32,.16);
  }
  ball(operator,0x457979,0,.66,0,.52,.47,.39);
  cube(operator,CREAM,0,.72,-.185,.20,.24,.018);
  ball(operator,0xd79a73,0,1.03,0,.41,.39,.36);
  ball(operator,0x4b3636,0,1.12,.079,.43,.23,.30);
  tube(operator,0x304c53,0,1.22,0,.42,.13,.39);tube(operator,BRASS,0,1.159,0,.46,.036,.43);
  for(const k of [-1,1])ball(operator,INK,k*.078,1.046,-.169,.036,.043,.021);
  this.cap=add(operator,'ball',0x304c53,0,1.15,-.16,.42,.055,.27);
  this.arm=new T.Group();this.arm.position.set(.26,.78,0);operator.add(this.arm);
  tube(this.arm,0x457979,0,.14,0,.14,.31,.14);
  ball(this.arm,0xd79a73,0,.32,0,.16,.18,.15);
  bar(this.arm,BRASS,v(0,.31,0),v(0,.55,0),.034);
  add(this.arm,'box',0xf6ab56,.135,.54,0,.28,.18,.045,0,0,-.1);
  this.switches=[turnout(this.world,0),turnout(this.world,1)];
  this.arrivals=[];
  for(const station of stations){
   const x=station.x-.69,z=-12.87;
   tube(this.world,INK,x,.55,z,.07,1.10,.07);
   tube(this.world,BRASS,x,1.00,z,.16,.08,.16);
   const bulb=ball(this.world,0x646b67,x,1.12,z,.18,.22,.18);
   this.arrivals.push({bulb,time:0});
  }
  this.guides=[];
  const path=(start,end,lane,tint)=>{
   const group=new T.Group();
   this.world.add(group);
   for(let z=start;z>end;z-=.51){
    const x=railX(z,lane);
    const h=Math.atan2(railX(z+.1,lane)-railX(z-.1,lane),.2);
    add(group,'box',tint,x,.247,z,.098,.018,.27,0,h,0,'glow');
   }
   batch(group);
   return group;
  };
  this.guides.push(path(4.77,-10.9,0,stations[0].color),path(4.77,-2.40,1,0xfedbaa),path(-2.63,-10.9,1,stations[1].color),path(-2.63,-10.9,2,stations[2].color));
  batch(decor);
  for(const mesh of decor.children){
   mesh.castShadow=mesh.geometry!==unit.box||mesh.isInstancedMesh||mesh.position.y>=.22;
   mesh.receiveShadow=true;
  }
  this.sun.shadow.needsUpdate=true;
  this.particles.length=0;
 }
 frame(mode,clock,round,profile){
  const aspect=this.aspect,vertical=aspect<.95,landscape=aspect>=1.10;
  const wideHeight=max(landscape?29.7:32.5,19.7/aspect), playHeight=vertical?max(35.2,18.4/aspect):wideHeight;
  const playTarget=v(0,.13,1.10), playEye=v(vertical?3.2:landscape?23.6:5.1,32,landscape?17.5:21.6);
  let target=playTarget,eye=playEye,height=playHeight;
  this.cap.material=mat(profile.rewards?.comment?0xefad63:0x304c53,'paint');
  for(const e of this.engines)e.headlight.material=mat(profile.rewards?.like?0xffdc8c:e.station.light,'glow');
  this.arm.rotation.z=-.45;
  this.arm.rotation.x=.14;
  if(mode==='intro'){
   const f=Math.min(1,clock/4.4),z=16.2-6.4*f,k=ease(max(0,(f-.37)/.63));
   target=v(-.23,1.04,z-.28).lerp(playTarget,k);
   eye=v(5.8,4.2,z-7.2).lerp(playEye,k);height=lerp(vertical?8.9:7.5,playHeight,k);
   this.arm.rotation.z=.38+sin(f*23)*.40;
   this.parkAll();this.place(this.introEngine,0,z,0,clock,true);
  }else if(mode==='outro'&&round){
   const t=round.trains.at(-1),z=t.z,tx=stations[t.route??t.id].x;
   const blend=ease(min(1,clock/.9)), slide=min(1,clock/3);
   target=v(tx,.95,z+.18).lerp(playTarget,1-blend);
   eye=v(tx+4.25-slide*1.3,5.3-slide*.4,z-5.9).lerp(playEye,1-blend);
   height=lerp(playHeight,vertical?8.4:6.7,blend);
   this.drawRound(round,clock,true);
  }else if(mode==='menu'){
   const z=10.7+cos(clock*.44)*1.1;
   this.parkAll();this.place(this.introEngine,0,z,0,clock,true);
   target=v(vertical?0:-2.7,.94,vertical?z+.9:z+.1);
   eye=v(7.4,6.7,z-7.8);height=vertical?12.1:12.0;
   this.arm.rotation.z=.18+sin(clock*2)*.31;
  }else if(round)this.drawRound(round,clock);
  else this.parkAll();
  this.introEngine.body.rotation.z=mode==='intro'?sin(clock*14)*.009:0;
  this.camera.position.copy(eye);
  this.camera.left=-height*aspect/2;this.camera.right=height*aspect/2;this.camera.top=height/2;this.camera.bottom=-height/2;
  this.camera.updateProjectionMatrix();this.camera.lookAt(target);
  this.camera.updateMatrixWorld();
  this.updateLevers(round?.levers??[false,false],mode);
  this.renderer.render(this.scene,this.camera);
 }
 updateLevers(state,mode){
  this.guides.forEach((guide,i)=>{guide.visible=(mode==="play"||mode==="pause")&&i%2===Number(i<2?!state[0]:state[1]);});
  for(const [i,s] of this.switches.entries()){
   const target=state[i]?(i===0?-.60:.60):0;
   s.lever.rotation.z=lerp(s.lever.rotation.z,-target,.24);
   s.lens.material=mat(stations[state[i]?(i===0?0:2):1].light,'glow');
   for(const b of s.blades)b.rotation.y=lerp(b.rotation.y,-target*.28,.25);
  }
 }
 point(x,y,z){
  const a=v(x,y,z).project(this.camera);
  return [(a.x*.5+.5)*this.width,(-a.y*.5+.5)*this.height];
 }
 parkAll(){for(const e of this.engines){e.root.visible=false;e.shadow.visible=false;}}
 drawRound(round,clock,final=false){
  this.parkAll();
  const used=[0,0,0];
  for(const t of round.trains){
   if(t.state==='waiting'||t.state==='cleared'||final&&t!==round.trains.at(-1))continue;
   const e=this.engines[t.id+3*used[t.id]++];
   if(!e)continue;
   this.place(e,t.route??1,t.z,t.state==='moving'?(15-t.z)*3.0:82,clock,t.state==='moving',t.state==='parked'&&!final?min(1,(1.63-t.dwell)*3):1);
  }
 }
 place(e,route,z,turn,clock,moving,scale=1){
  const x=railX(z,route),angle=Math.atan2(railX(z+.12,route)-railX(z-.12,route),.24);
  e.root.visible=e.shadow.visible=true;e.root.position.set(x,0,z);e.root.rotation.y=angle;e.root.scale.setScalar(scale);
  e.shadow.position.set(x,.013,z);e.shadow.rotation.z=-angle;e.shadow.scale.set(2.25*scale,3.3*scale,1);
  for(const a of e.axle){
   if(a.rod){
    a.rod.position.y=.356+.14*cos(turn);a.rod.position.z=-.121+.14*sin(turn);
    a.link.rotation.x=sin(turn)*.15;
   }else a.rotation.x=turn;
  }
  for(let i=0;i<e.clouds.length;i++){
   const m=e.clouds[i],f=(clock*(moving?1.07:.48)+i/e.clouds.length)%1;
   m.visible=i<(moving?8:4);
   m.position.set(sin(i*2.5+f*4)*f*.20,2.12+f*(moving?1.12:.67),-.89+f*(moving?2.30:.40));
   m.scale.setScalar(.11+f*.53);m.material.opacity=(1-f)*.43;
  }
 }
 arrival(route,success){const a=this.arrivals[route];a.color=success?stations[route].light:0xff7056;a.time=1.7;}
 burst(x,z,color,strong){
  for(let i=0;i<(strong?29:13)&&this.particles.length<112;i++){
   const a=Math.random()*PI*2, d=.55+Math.random()*2.9;
   this.particles.push({x,y:.85+Math.random()*.72,z,u:cos(a)*d,w:sin(a)*d,v:1.2+Math.random()*3.3,t:0,life:.46+Math.random()*.83,color});
  }
 }
 effects(dt){
  for(const p of this.particles){p.t+=dt;p.x+=p.u*dt;p.z+=p.w*dt;p.y+=p.v*dt;p.v-=5*dt;}
  this.particles=this.particles.filter(p=>p.t<p.life);
  for(const a of this.arrivals){
   a.time=max(0,a.time-dt);
   a.bulb.material=a.time>0?mat(a.color,'glow'):mat(0x646b67);
   a.bulb.scale.setScalar(a.time>0?.20+sin(a.time*15)*.03:.18);
  }
  const color=new T.Color();
  this.spark.count=this.particles.length;
  for(const [i,p] of this.particles.entries()){
   this.dummy.position.set(p.x,p.y,p.z);this.dummy.scale.setScalar((1-p.t/p.life)*.15+.03);
   this.dummy.updateMatrix();this.spark.setMatrixAt(i,this.dummy.matrix);
   this.spark.setColorAt(i,color.set(p.color).convertSRGBToLinear());
  }
  this.spark.instanceMatrix.needsUpdate=true;if(this.spark.instanceColor)this.spark.instanceColor.needsUpdate=true;
 }
}





