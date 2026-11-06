export function tone(ctx,bus,{at=ctx.currentTime,freq=440,end=freq,dur=.16,type='triangle',level=.15,pan=0}={}){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(Math.max(20,freq),at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+dur);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+dur);osc.connect(gain);
  if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;gain.connect(p);p.connect(bus);osc.onended=()=>{osc.disconnect();gain.disconnect();p.disconnect();};}else{gain.connect(bus);osc.onended=()=>{osc.disconnect();gain.disconnect();};}osc.start(at);osc.stop(at+dur+.01);
}
export function noise(ctx,bus,at,dur=.1,level=.12){const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*dur),ctx.sampleRate);const data=buffer.getChannelData(0);let n=17;for(let i=0;i<data.length;i++){n=(n*16807)%2147483647;data[i]=(n/2147483647*2-1)*(1-i/data.length);}const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();s.buffer=buffer;f.type='highpass';f.frequency.value=1400;g.gain.value=level;s.connect(f);f.connect(g);g.connect(bus);s.start(at);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
export function voice(ctx,bus,at=ctx.currentTime,pitch=1){for(let i=0;i<5;i++){const a=at+i*.075,f=(320+[0,150,45,260,80][i])*pitch;tone(ctx,bus,{at:a,freq:f,end:f*1.2,dur:.065,type:i%2?'square':'sawtooth',level:.035});tone(ctx,bus,{at:a,freq:f*2.8,end:f*2.2,dur:.06,type:'sine',level:.04});}}
export function sfx(ctx,bus,kind,at=ctx.currentTime){
  const t=(freq,end,dur,type='triangle',level=.13,offset=0)=>tone(ctx,bus,{at:at+offset,freq,end,dur,type,level});
  if(kind==='shot')t(780,210,.075,'square',.04);
  else if(kind==='kill'||kind==='burst'){t(145,45,.16,'triangle',.18);noise(ctx,bus,at,.1,.065);}
  else if(kind==='hit'){t(120,35,.35,'sawtooth',.14);noise(ctx,bus,at,.3,.15);}
  else if(kind==='pulse'){t(160,1300,.34,'sine',.18);t(105,650,.42,'triangle',.1);}
  else if(kind==='pickup'){t(420,890,.16);t(670,1160,.16,'triangle',.12,.1);voice(ctx,bus,at+.1,1.35);}
  else if(kind==='pair'||kind==='dock'){[523,659,784,1047].forEach((f,i)=>t(f,f,.27,'triangle',.1,i*.09));if(kind==='pair')voice(ctx,bus,at+.35,.95);}
  else if(kind==='warning'){t(640,640,.07,'sine',.055);t(640,640,.07,'sine',.055,.14);}
  else if(kind==='menu')t(680,850,.05,'sine',.07);
  else if(kind==='launch'){t(160,760,.9,'triangle',.15);noise(ctx,bus,at,.7,.08);}
  else if(kind==='victory'){[523,659,784,1047,988,1047].forEach((f,i)=>t(f,f,.45,'triangle',.15,i*.16));voice(ctx,bus,at+1.1,1.1);}
  else if(kind==='defeat'){[440,392,330,220].forEach((f,i)=>t(f,f,.5,'triangle',.12,i*.22));}
}
export class Audio {
  constructor(){this.music=.1;this.effects=.7;this.muted=false;this.enabled=false;this.step=0;this.next=0;this.phase='title';}
  unlock(){if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.65;this.master.connect(this.ctx.destination);this.musicBus=this.ctx.createGain();this.musicBus.gain.value=this.music;this.musicBus.connect(this.master);this.fxBus=this.ctx.createGain();this.fxBus.gain.value=this.effects;this.fxBus.connect(this.master);this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=512;this.master.connect(this.analyser);this.next=this.ctx.currentTime+.08;}this.enabled=true;this.ctx.resume().catch(()=>{});}
  setVolumes(music,effects){this.music=music;this.effects=effects;if(this.ctx){this.musicBus.gain.setTargetAtTime(music,this.ctx.currentTime,.05);this.fxBus.gain.setTargetAtTime(effects,this.ctx.currentTime,.05);}}
  mute(value){this.muted=value;if(this.ctx)this.master.gain.setTargetAtTime(value?0:.65,this.ctx.currentTime,.025);}
  play(kind){if(this.ctx&&this.enabled&&!this.muted)sfx(this.ctx,this.fxBus,kind);}
  gibberish(pitch=1){if(this.ctx&&this.enabled&&!this.muted)voice(this.ctx,this.fxBus,this.ctx.currentTime,pitch);}
  update(){
    if(!this.ctx||!this.enabled||this.muted||this.ctx.state!=='running')return;if(this.next<this.ctx.currentTime-.2)this.next=this.ctx.currentTime+.04;
    const bpm=this.phase==='defense'?112:this.phase==='rescue'?96:88,beat=60/bpm/4;const chords=[[0,4,7,11],[5,9,12,16],[9,12,16,19],[7,11,14,17]];
    while(this.next<this.ctx.currentTime+.15){const step=this.step++,chord=chords[Math.floor(step/32)%4],pattern=[0,2,1,3,2,1,0,2];const n=chord[pattern[step%8]]+60, f=440*2**((n-69)/12);
      tone(this.ctx,this.musicBus,{at:this.next,freq:f,end:f*.998,dur:beat*2.6,type:'triangle',level:.16,pan:step%2?-.25:.25});
      if(step%8===0)tone(this.ctx,this.musicBus,{at:this.next,freq:440*2**((chord[0]+36-69)/12),dur:beat*7,type:'sine',level:.26});
      if(step%4===2)noise(this.ctx,this.musicBus,this.next,.025,.025);if(step%8===0)tone(this.ctx,this.musicBus,{at:this.next,freq:115,end:38,dur:.11,type:'sine',level:.25});this.next+=beat;
    }
  }
  async offlineProbe(){const ctx=new OfflineAudioContext(2,44100*2,44100),bus=ctx.createGain();bus.gain.value=.65;bus.connect(ctx.destination);sfx(ctx,bus,'pickup',.05);sfx(ctx,bus,'pulse',.75);tone(ctx,bus,{at:1.3,freq:523,dur:.4,level:.1});const out=await ctx.startRendering();const data=out.getChannelData(0);let sum=0,peak=0;for(const v of data){sum+=v*v;peak=Math.max(peak,Math.abs(v));}return {rms:Math.sqrt(sum/data.length),peak,samples:data.length,defaultMusic:.1};}
}
