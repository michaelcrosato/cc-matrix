/* All sound is synthesized. No samples, streams, or prerecorded voices. */
export class Sound {
  constructor() {
    this.ctx = null; this.musicVolume = .1; this.effectsVolume = .7; this.muted = false;
    this.counts = {}; this.noteIndex = 0; this.nextNote = 0; this.running = false; this.rotor = null;
  }
  async unlock() {
    if (!this.ctx) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return false;
      this.ctx = new Audio(); this.master = this.ctx.createGain(); this.master.gain.value = .65;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain(); this.music.gain.value = this.musicVolume; this.music.connect(this.master);
      this.effects = this.ctx.createGain(); this.effects.gain.value = this.effectsVolume; this.effects.connect(this.master);
      this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 256; this.master.connect(this.analyser);
      this.noise = this.makeNoise(this.ctx, 2);
      const reverb = this.ctx.createConvolver(); reverb.buffer = this.makeImpulse(this.ctx);
      const wet = this.ctx.createGain(); wet.gain.value = .16; reverb.connect(wet); wet.connect(this.master);
      this.reverb = reverb; this.music.connect(reverb);
      this.makeRotor(); this.nextNote = this.ctx.currentTime + .15;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return true;
  }
  makeNoise(ctx, seconds) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), a = b.getChannelData(0);
    let previous = 0;
    for (let i=0;i<a.length;i++) { const white = Math.random()*2-1; previous=(previous+.15*white)/1.15; a[i]=previous*3; }
    return b;
  }
  makeImpulse(ctx) {
    const b=ctx.createBuffer(2,ctx.sampleRate*1.8,ctx.sampleRate);
    for(let ch=0;ch<2;ch++){const a=b.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3);}
    return b;
  }
  makeRotor() {
    const c=this.ctx, o=c.createOscillator(), filter=c.createBiquadFilter(), gain=c.createGain();
    o.type='sawtooth';o.frequency.value=56;filter.type='lowpass';filter.frequency.value=310;gain.gain.value=0;
    o.connect(filter);filter.connect(gain);gain.connect(this.effects);o.start();
    const lfo=c.createOscillator(), amplitude=c.createGain();lfo.frequency.value=17;amplitude.gain.value=.017;
    lfo.connect(amplitude);amplitude.connect(gain.gain);lfo.start();
    this.rotor={o,gain,lfo,amplitude};
  }
  tone(frequency,duration=.2,volume=.15,type='sine',target=frequency,when=0,bus=null,ctx=null) {
    const c=ctx||this.ctx;if(!c)return;
    const t=when||c.currentTime, o=c.createOscillator(), g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(Math.max(20,frequency),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,target),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(bus||this.effects||c.destination);o.start(t);o.stop(t+duration+.01);
  }
  burst(duration=.4,volume=.3,frequency=500,when=0,ctx=null,bus=null) {
    const c=ctx||this.ctx;if(!c)return;const t=when||c.currentTime;
    const n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=(c===this.ctx?this.noise:this.makeNoise(c,2));
    f.type='lowpass';f.frequency.setValueAtTime(frequency,t);f.frequency.exponentialRampToValueAtTime(45,t+duration);
    g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    n.connect(f);f.connect(g);g.connect(bus||this.effects||c.destination);n.start(t);n.stop(t+duration);
  }
  speak(phrase=0) {
    if(!this.ctx)return;const c=this.ctx,start=c.currentTime;
    const syllables=[520,730,580,880,650,1020,700];
    for(let i=0;i<5;i++) {
      const t=start+i*.092, o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(170+((i*47+phrase*31)%140),t);o.frequency.linearRampToValueAtTime(260+(i%2)*80,t+.075);
      f.type='bandpass';f.frequency.value=syllables[(i+phrase)%syllables.length];f.Q.value=4;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13,t+.015);g.gain.linearRampToValueAtTime(0,t+.073);
      o.connect(f);f.connect(g);g.connect(this.effects);o.start(t);o.stop(t+.08);
    }
  }
  event(type,data={}) {
    this.counts[type]=(this.counts[type]||0)+1;
    if(!this.ctx||this.muted)return;
    const t=this.ctx.currentTime;
    if(type==='fire') { this.tone(1000,.12,.12,'square',310);this.tone(1700,.08,.035,'triangle',600); }
    else if(type==='bomb') {this.tone(460,.1,.16,'square',300);this.tone(800,.08,.08,'sine',800,t+.13);}
    else if(type==='explode'||type==='wallBreak') {this.burst(.8,.72,1700);this.tone(93,.65,.5,'sine',25);this.tone(210,.18,.17,'sawtooth',42);}
    else if(type==='enemyDown') {this.tone(370,.2,.2,'triangle',70);this.burst(.1,.1,1800);}
    else if(type==='hurt') {this.tone(150,.3,.27,'sawtooth',60);this.burst(.18,.18,700);}
    else if(type==='rescue') { [0,4,7,12].forEach((n,i)=>this.tone(440*2**(n/12),.27,.16,'triangle',440*2**(n/12),t+i*.08));this.speak(this.counts[type]%5); }
    else if(type==='pickup') {[660,880,1320].forEach((n,i)=>this.tone(n,.14,.15,'sine',n,t+i*.05));}
    else if(type==='lampBreak') {this.burst(.18,.18,3800);this.tone(1600,.08,.05,'sine',130);}
    else if(type==='missionComplete'||type==='victory') {[0,4,7,12,7,12,16].forEach((n,i)=>this.tone(330*2**(n/12),.45,.18,'triangle',330*2**(n/12),t+i*.12));this.speak(2);}
    else if(type==='gameover') {[330,294,246,165].forEach((n,i)=>this.tone(n,.5,.16,'triangle',n,t+i*.2));}
    else if(type==='menu'||type==='focus')this.tone(type==='focus'?530:740,.065,.06,'sine',type==='focus'?600:920);
    else if(type==='levelStart') {this.speak(0);this.tone(160,.7,.12,'sine',320);}
  }
  scheduleMusic() {
    if(!this.ctx)return;const c=this.ctx;
    const melody=[0,7,12,14,10,7,3,7,0,7,15,14,12,7,3,-2];
    while(this.nextNote<c.currentTime+.2){
      const i=this.noteIndex++, n=melody[i%melody.length], f=146.832*2**(n/12),t=this.nextNote;
      this.tone(f,1.2,.17,'triangle',f,t,this.music);
      if(i%4===0){const bass=73.416*2**(([0,-2,3,-5][Math.floor(i/16)%4])/12);this.tone(bass,1.8,.2,'sine',bass,t,this.music);this.tone(bass*2,1.5,.075,'triangle',bass*2,t,this.music);}
      if(i%2===0)this.tone(f*2,.15,.035,'sine',f*2,t,this.music);
      this.nextNote+=.36;
    }
  }
  update(dt,players=[],playing=false) {
    this.running=playing;
    if(!this.ctx)return;
    if(this.nextNote<this.ctx.currentTime-.5)this.nextNote=this.ctx.currentTime+.02;
    if(!this.muted)this.scheduleMusic();
    const hover=playing&&players.some(p=>p.thrust&&p.hp>0);
    this.rotor.gain.gain.setTargetAtTime(hover&&!this.muted?.045:0,this.ctx.currentTime,.08);
    this.rotor.amplitude.gain.setTargetAtTime(hover&&!this.muted?.017:0,this.ctx.currentTime,.08);
    this.rotor.o.frequency.setTargetAtTime(hover?70:44,this.ctx.currentTime,.1);
  }
  setMusic(value) {this.musicVolume=Math.max(0,Math.min(1,Number(value)));if(this.music)this.music.gain.setTargetAtTime(this.musicVolume,this.ctx.currentTime,.05);}
  setEffects(value) {this.effectsVolume=Math.max(0,Math.min(1,Number(value)));if(this.effects)this.effects.gain.setTargetAtTime(this.effectsVolume,this.ctx.currentTime,.05);}
  mute(value) {this.muted=!!value;if(this.master)this.master.gain.setTargetAtTime(this.muted?0:.65,this.ctx.currentTime,.04);}
  diagnostics() {
    let rms=0;if(this.analyser){const a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);rms=Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);}
    return {state:this.ctx?.state||'locked',musicVolume:this.musicVolume,effectsVolume:this.effectsVolume,muted:this.muted,events:{...this.counts},notes:this.noteIndex,rms};
  }
  async renderProbe() {
    const c=new OfflineAudioContext(1,44100,44100);
    this.tone(440,.4,.2,'triangle',880,.01,c.destination,c);this.burst(.3,.1,700,.45,c,c.destination);
    const b=await c.startRendering(),a=b.getChannelData(0);let sum=0,peak=0;for(const v of a){sum+=v*v;peak=Math.max(peak,Math.abs(v));}
    return {rms:Math.sqrt(sum/a.length),peak,samples:a.length,finite:a.every(Number.isFinite)};
  }
  dispose() {if(this.ctx)this.ctx.close();this.ctx=null;}
}
