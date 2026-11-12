import * as C from './core.mjs';
import {RailView} from './art.mjs';
import {RushAudio} from './audio.mjs';
import {bridge} from './sdk.mjs';


const {yards,stations,railX,newRound,toggle,advance,grade,safeCheckpoint}=C;
const $=id=>document.getElementById(id);
const visible=(id,value)=>{$(id).hidden=!value;};
const label=(id,value)=>{$(id).textContent=value;};
const game=$('game'), card=$('card'), primary=$('primary'), secondary=$('secondary');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const key='brass-signal-v1';
let saved;
try{saved=JSON.parse(localStorage.getItem(key));}catch{}
let profile=C.profile(saved?.profile), checkpoint=safeCheckpoint(saved?.round), round=null;
let mode='menu',yard=checkpoint?.yard??0,clock=0,feedbackUntil=0,previous=0,saveElapsed=0,firstIntro=true;
let resumeStarted=false, resumeOffered=!!checkpoint,graphicsReady=true;
let support={like:false,comment:false};
const sound=new RushAudio(profile.muted);
function persist(){
 try{localStorage.setItem(key,JSON.stringify({profile,round:checkpoint}));}catch{}
}
function writeProfile(data,merge){
 profile=merge?C.mergeProfile(profile,data):C.profile(data);
 persist();
}
function updateSupport(){
 const list=[];
 if(support.like)list.push(profile.rewards.like?'Brass headlamp unlocked':'Like on GameWave for a brass headlamp');
 if(support.comment)list.push(profile.rewards.comment?'Conductor’s gold cap unlocked':'Leave a direct comment for a gold cap');
 label('host-note',list.join(' · '));visible('host-note',list.length>0);
}
const sdk=bridge({read:()=>profile,write:writeProfile,changed(event){
 if(event.type==='connected'||event.type==='support'){
  support={like:!!event.like,comment:!!event.comment};
  updateSupport();
 }
 if(event.type==='cloud'||event.type==='reward'){
  updateSupport();
  if(mode==='menu'||mode==='result')routes();
  if(event.type==='reward'&&mode==='play')message(event.kind==='like'?'Brass headlamp unlocked':'Gold cap unlocked');
 }
}});
let view;
try{view=new RailView($('scene'));}
catch(error){
 graphicsReady=false;console.error(error);
}
function syncSound(){
 $('sound').setAttribute('aria-label',profile.muted?'Enable sound':'Mute sound');
 $('sound').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linejoin="round" d="M3 9h4l5-4v14l-5-4H3z"/>'+ (profile.muted?'<path d="m16 9 5 6m0-6-5 6"/>':'<path stroke-linecap="round" d="M15 8a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14"/>')+'</svg>';
}
function unlocked(i){return i===0||profile.best.slice(0,i).every(Boolean);}
function routes(){
 const root=$('routes');
 const shown=mode==='menu'&&profile.best.some(Boolean)&&!resumeOffered;
 root.hidden=!shown;root.replaceChildren();
 if(!shown)return;
 yards.forEach((y,i)=>{
  const button=document.createElement('button'), marks=document.createElement('small');
  button.className='yard-select';
  button.textContent=String(i+1).padStart(2,'0');
  button.disabled=!unlocked(i);
  button.setAttribute('aria-current',String(i===yard));
  button.setAttribute('aria-label',y.name+', '+profile.best[i]+' stars');
  marks.textContent=profile.best[i]?'★'.repeat(profile.best[i]):'–';
  button.append(marks);
  button.onclick=()=>{setYard(i);routes();label('description',yards[i].name+' · '+yards[i].order.length+' trains');};
  root.append(button);
 });
}
function setYard(i){
 yard=i;
 if(view&&view.yard!==i)view.setYard(i);
}
function buttons(p,s){
 primary.textContent=p;
 primary.disabled=!graphicsReady;
 secondary.textContent=s||'';secondary.hidden=!s;
}
function phase(next){
 mode=next;clock=0;game.dataset.phase=next;
 const play=next==='play',film=next==='intro'||next==='outro';
 card.hidden=play||film;
 visible('hud',play);visible('levers',play);visible('guide',play);
 visible('letterbox',film);visible('film',film);
 $('feedback').classList.remove('show');feedbackUntil=0;
 $('train-labels').hidden=!play;
 sound.setActive(graphicsReady&&(play||film||next==='menu'));
}
function menu(){
 phase('menu');visible('stars',false);
 label('eyebrow','A MINIATURE RAILWAY');
 label('title','BRASS SIGNAL');
 label('description',!graphicsReady?'This game needs WebGL. Try a current browser with hardware acceleration.':resumeOffered?'Your timetable is waiting.':'Throw the switches. Bring every train home.');
 buttons(resumeOffered?'Resume':'Dispatch',resumeOffered?'New shift':'');routes();updateSupport();
}
function prepare(){
 round=newRound(yard);checkpoint=null;resumeOffered=false;resumeStarted=false;sdk.prepare();persist();buildHud();
 sound.unlock();
 if(firstIntro&&!motion.matches){
  firstIntro=false;phase('intro');label('film-tag',yards[yard].label);label('film-title','The yard is yours.');sound.event('approach');
 }else start();
}
function start(){
 if(!round||!graphicsReady)return;
 phase('play');resumeOffered=false;
 if(!resumeStarted){sdk.start();resumeStarted=true;}
 checkpoint=round;persist();updateHud();
}
function restore(){
 if(!checkpoint)return;
 round=checkpoint;resumeOffered=false;resumeStarted=false;
 setYard(round.yard);sdk.prepare();sound.unlock();buildHud();start();
}
function pause(){
 if(mode!=='play')return;
 checkpoint=round;persist();phase('pause');
 visible('routes',false);visible('stars',false);
 label('eyebrow',yards[yard].name.toUpperCase());
 label('title','Paused');
 label('description',round.points+' trains home · '+round.trains.filter(t=>t.state==='waiting'||t.state==='moving').length+' to go');
 buttons('Resume','Restart');
}
function finish(){
 if(mode!=='play')return;
 sdk.end();resumeStarted=false;checkpoint=null;
 const stars=grade(round);
 profile.best[yard]=Math.max(profile.best[yard],stars);persist();sdk.save();
 sound.event(stars?'won':'lost');
 if(motion.matches){result();return;}
 phase('outro');
 label('film-tag',yards[yard].name.toUpperCase());
 label('film-title',stars?'All settled in.':'The last whistle.');
}
function result(){
 phase('result');visible('routes',false);visible('stars',true);
 const stars=grade(round);
 label('eyebrow',yards[yard].name.toUpperCase());
 label('title',stars===3?'Perfect run':stars?'Shift complete':'Try again');
 label('description',round.points+' / '+round.trains.length+' home · Best streak '+round.chain);
 label('stars','★'.repeat(stars)+'☆'.repeat(3-stars));
 $('stars').setAttribute('aria-label',stars+' of 3 stars');
 buttons(stars&&yard<yards.length-1?'Next yard':'Replay',stars&&yard<yards.length-1?'Replay':'Yards');updateSupport();
}
function buildHud(){
 const tickets=$('schedule'),badges=$('train-labels');tickets.replaceChildren();badges.replaceChildren();
 label('yard-num','SHIFT '+String(yard+1).padStart(2,'0'));label('yard-name',yards[yard].name);
 for(const t of round.trains){
  const station=stations[t.id],ticket=document.createElement('span'),badge=document.createElement('span');
  ticket.className='ticket';ticket.style.setProperty('--station',station.hex);ticket.textContent=station.mark;
  badge.className='badge';badge.style.setProperty('--station',station.hex);badge.textContent=station.mark;badge.hidden=true;
  tickets.append(ticket);badges.append(badge);
 }
}
function message(text){
 label('feedback',text);$('feedback').classList.add('show');feedbackUntil=clock+1.38;
}
function updateHud(){
 if(!round)return;
 for(const [i,t] of round.trains.entries()){
  const ticket=$('schedule').children[i],station=stations[t.id],done=t.state==='parked'||t.state==='cleared';
  const state=done?(t.route===t.id?'arrived':'missed'):t.state==='moving'?'active':'waiting';
  if(ticket.dataset.state!==state||ticket.dataset.route!==String(t.route)){
   ticket.dataset.state=state;ticket.dataset.route=String(t.route);ticket.className='ticket '+state;ticket.title=station.name+' · '+(state==='active'&&t.route!==null?'routed to '+stations[t.route].name:state);
   ticket.setAttribute('aria-label',ticket.title);ticket.textContent=state==='missed'?'×':station.mark;
  }
 }
 const focus=round.trains.find(t=>t.state==='waiting'||t.state==='moving'&&t.route===null);
 const teach=yard<2&&round.time<9&&focus;
 const desired=focus?.id;
 for(const [i,lever] of [$('lever-0'),$('lever-1')].entries()){
  const turned=round.levers[i],choice=i===0?(turned?0:null):(turned?2:1);
  const mark=choice===null?'↓':stations[choice].mark;
  const route=choice===null?'through to switch 2':stations[choice].name;
  lever.querySelector('.lever-route').textContent=mark;
  lever.style.setProperty('--route',choice===null?'#ffe2a6':stations[choice].hex);
  lever.setAttribute('aria-label','Switch '+(i+1)+', '+route);
  lever.setAttribute('aria-pressed',String(turned));
  lever.classList.toggle('pulse',!!teach&&(i===0?focus.first===null&&(desired===0)!==turned:desired!==0&&focus.route===null&&(desired===2)!==turned&&round.levers[0]===false));
 }
 const tip=teach&&desired===0&&focus.first===null&&!round.levers[0]?'Tap 1 for ● Fern':teach&&desired===2&&focus.route===null&&!round.levers[1]?'Tap 2 for ▲ Poppy':'Match each train to its station.';
 label('guide',tip);
}
function moveLever(i){
 if(mode!=='play'||!toggle(round,i))return;
 sound.unlock();sound.event('switch');
 const s=view.switches[i];view.burst(s.x,s.z,0xffde8f,false);
 checkpoint=round;persist();updateHud();
}
function placeLabel(el,x,y){
 el.style.left=x+'px';el.style.top=y+'px';
}
function project(){
 const narrow=view.width<490;
 for(const [i,s] of stations.entries()){
  const [x,y]=view.point(s.x-.12,1.57,-12.26);
  placeLabel($('station-'+i),Math.max(26,Math.min(view.width-26,x)),Math.max(view.height<480?55:66,y-12));
 }
 if(mode!=='play'||!round)return;
 for(const [i,s] of view.switches.entries()){
  const [x,y]=view.point(s.x+1.14,.65,s.z);
  const inset=narrow?31:37;
  placeLabel($('lever-'+i),Math.max(inset,Math.min(view.width-inset,x)),y+8);
 }
 for(const [i,t] of round.trains.entries()){
  const badge=$('train-labels').children[i];
  badge.hidden=t.state!=='moving';
  if(!badge.hidden){
   const [x,y]=view.point(railX(t.z,t.route??1),2.35,t.z-.4);
   placeLabel(badge,x,y-5);
  }
 }
}
function process(event){
 const {train:t}=event;
 if(event.type==='arrival'||event.type==='miss'){
  const good=event.type==='arrival';
  view.arrival(t.route,good);
  view.burst(stations[t.route].x,t.z,good?stations[t.id].light:0xf79678,good);
  sound.event(event.type,event.streak);
  message(good?(event.streak>1?'On time ×'+event.streak:stations[t.id].name+' delivered'):'Wrong platform');
 }else if(event.type==='approach')sound.event('approach');
 else if(event.type==='finish')finish();
}
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden||!graphicsReady)return;
 const dt=previous?Math.min(.055,(now-previous)/1000):0;
 previous=now;clock+=dt;
 if(mode==='intro'&&clock>=4.4)start();
 else if(mode==='outro'&&clock>=3.12)result();
 else if(mode==='play'){
  const events=advance(round,dt);
  for(const event of events)process(event);
  if(events.length&&mode==='play')updateHud();
  saveElapsed+=dt;
  if(saveElapsed>.58&&mode==='play'){saveElapsed=0;persist();}
 }
 if(feedbackUntil>0&&clock>feedbackUntil){$('feedback').classList.remove('show');feedbackUntil=0;}
 view.effects(dt);
 view.frame(mode==='result'?'outro':mode,mode==='result'?3.12:clock,round,profile);
 project();
}
primary.onclick=()=>{
 if(mode==='menu'){if(resumeOffered)restore();else prepare();}
 else if(mode==='pause'){sound.unlock();start();}
 else if(mode==='result'){if(grade(round)&&yard<yards.length-1)setYard(yard+1);prepare();}
};
secondary.onclick=()=>{
 if(mode==='menu'){checkpoint=null;resumeOffered=false;persist();prepare();}
 else if(mode==='pause'){sdk.end();prepare();}
 else if(mode==='result'){
  if(grade(round)&&yard<yards.length-1)prepare();
  else {round=null;menu();}
 }
};
$('pause').onclick=pause;
$('skip').onclick=()=>{if(mode==='intro')start();else if(mode==='outro')result();};
for(let i=0;i<2;i++)$('lever-'+i).onclick=()=>moveLever(i);
$('sound').onclick=()=>{profile.muted=!profile.muted;sound.mute(profile.muted);syncSound();persist();};
document.addEventListener('keydown',e=>{
 if(e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.key==='1'||e.key==='2'){e.preventDefault();moveLever(Number(e.key)-1);}
 if(e.key==='Escape'&&mode==='play')pause();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();sound.setActive(false);}else{previous=0;sound.setActive(['play','menu','intro','outro'].includes(mode));}});
window.addEventListener('pagehide',e=>{pause();persist();if(!e.persisted)sdk.stop();});
if(view){
 new ResizeObserver(()=>view.resize()).observe($('scene'));
 view.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();graphicsReady=false;primary.disabled=true;label('description','Reconnecting to the graphics device…');});
 view.renderer.domElement.addEventListener('webglcontextrestored',()=>{graphicsReady=true;view.resize();if(mode==='pause')primary.disabled=false;else if(mode==='menu')menu();});
}
setYard(yard);syncSound();menu();requestAnimationFrame(frame);




