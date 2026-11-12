export class RushAudio {
  constructor(muted=false){this.muted=muted;this.active=false;this.playing=false;this.generation=0;}

  async unlock(){
    if(this.muted)return;
    try{
      if(!this.ctx){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)return;
        this.ctx=new Audio();
        this.master=this.ctx.createGain();this.master.gain.value=.64;
        const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-17;limiter.ratio.value=7;
        this.master.connect(limiter).connect(this.ctx.destination);
        this.music=this.ctx.createGain();this.music.gain.value=0;this.music.connect(this.master);
        this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.4,this.ctx.sampleRate);
        const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      if(this.ctx.state!=='running')await this.ctx.resume();
      this.sync();
    }catch{}
  }

  setActive(value){this.active=value;this.sync();}
  mute(value){this.muted=value;this.sync();if(!value)this.unlock();}

  sync(){
    if(!this.ctx)return;
    const now=this.ctx.currentTime,wanted=this.active&&!this.muted&&this.ctx.state==='running';
    this.master.gain.setTargetAtTime(this.muted?0:.64,now,.026);
    if(wanted===this.playing)return;
    this.playing=wanted;
    const id=++this.generation;
    this.music.gain.cancelScheduledValues(now);this.music.gain.setTargetAtTime(wanted?.72:0,now,.08);
    if(!wanted){clearInterval(this.timer);return;}
    this.next=now+.045;this.step=0;
    const schedule=()=>{
      if(this.generation!==id)return;
      if(this.next<this.ctx.currentTime-.15)this.next=this.ctx.currentTime+.025;
      while(this.next<this.ctx.currentTime+.105){this.beat(this.next,this.step++);this.next+=60/106/4;}
    };
    schedule();this.timer=setInterval(schedule,27);
  }

  tone(t,freq,duration,amp,type='sine',end=freq,bus=this.master,lowpass){
    const c=this.ctx,osc=c.createOscillator(),gain=c.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(end,t+duration*.7);
    gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(amp,t+.007);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    if(lowpass){const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=lowpass;osc.connect(filter).connect(gain);}
    else osc.connect(gain);
    gain.connect(bus);osc.start(t);osc.stop(t+duration+.01);
  }

  grit(t,duration,amp,cut,bus=this.master,type='highpass'){
    const c=this.ctx,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;
    filter.type=type;filter.frequency.value=cut;filter.Q.value=.7;
    gain.gain.setValueAtTime(amp,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    source.connect(filter).connect(gain).connect(bus);source.start(t);source.stop(t+duration+.01);
  }

  beat(t,n){
    const s=n%16,bar=Math.floor(n/16)%8,bus=this.music;
    const chords=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59],[48,55,60,67],[50,57,62,65],[41,48,53,60],[43,50,55,62]];
    const f=note=>440*2**((note-69)/12),chord=chords[bar],notes=[0,3,6,9,12,14];
    if(s===0||s===8)this.tone(t,f(chord[s===0?0:1]),.58,.10,'sine',f(chord[s===0?0:1]),bus);
    if(s%4===2){
      for(const note of chord.slice(1))this.tone(t,f(note),.31,.027,'triangle',f(note),bus,1250);
      this.grit(t,.039,.023,1200,bus);
    }
    if(notes.includes(s)){
      const note=chord[[3,2,1,2,3,2][notes.indexOf(s)]]+12;
      this.tone(t,f(note),.26,.038,'sine',f(note),bus);
    }
  }

  event(type,chain=1){
    if(!this.ctx||this.muted||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime+.009;
    if(type==='switch'){
      this.grit(t,.079,.21,1350,this.master,'bandpass');
      this.tone(t,133,.087,.21,'triangle',85);
      this.tone(t+.032,490,.12,.09,'triangle',395);
    }else if(type==='approach'){
      for(const [freq,amp] of [[330,.05],[407,.072],[660,.045]])this.tone(t,freq,.41,amp,'sine',freq*.986);
      this.grit(t,.29,.105,895,this.master,'bandpass');
    }else if(type==='arrival'){
      const k=Math.min(5,chain),root=392*2**(k/12);
      [1,1.26,1.5,2].forEach((v,i)=>this.tone(t+i*.051,root*v,.27,.13,'triangle',root*v));
      this.grit(t,.22,.16,630,this.master,'bandpass');
    }else if(type==='miss'){
      this.tone(t,247,.29,.18,'triangle',184);this.grit(t,.21,.11,460,this.master,'bandpass');
    }else if(type==='won'){
      [392,494,587,784,988].forEach((f,i)=>this.tone(t+i*.075,f,.34,.14,'triangle',f));
    }else if(type==='lost'){
      [349,294,233].forEach((f,i)=>this.tone(t+i*.12,f,.30,.11,'triangle',f));
    }
  }
}
