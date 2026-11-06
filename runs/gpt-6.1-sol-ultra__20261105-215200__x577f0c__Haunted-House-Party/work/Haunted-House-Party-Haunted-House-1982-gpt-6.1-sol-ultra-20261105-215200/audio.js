// All sound is synthesized. No samples, music files, or speech recordings.
export function createAudio() {
  let context=null, master=null, musicBus=null, effectBus=null, analyser=null, reverb=null;
  let musicVolume=.1, sfxVolume=.65, nextBeat=0, beat=0, activeVoices=0, played=0, unlocked=false, stopped=false;
  const counts={};
  const midi=n=>440*Math.pow(2,(n-69)/12);
  const sequence=[69,76,72,68,74,71,67,74,70,66,72,69,65,72,69,68,71,76,69,72,77,68,71,74];
  function envelope(ctx,dest,start,duration,volume=.2,attack=.008) {
    const g=ctx.createGain();g.gain.setValueAtTime(.00001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),start+attack);g.gain.exponentialRampToValueAtTime(.00001,start+Math.max(duration,attack+.01));g.connect(dest);return g;
  }
  function tone(ctx,dest,start,freq,duration,volume=.15,type='sine',endFreq=freq,detune=0) {
    const o=ctx.createOscillator(),g=envelope(ctx,dest,start,duration,volume);o.type=type;o.frequency.setValueAtTime(Math.max(12,freq),start);o.frequency.exponentialRampToValueAtTime(Math.max(12,endFreq),start+duration);o.detune.value=detune;o.connect(g);o.start(start);o.stop(start+duration+.03);
    if(ctx===context){activeVoices++;o.onended=()=>{activeVoices--;g.disconnect();};}return o;
  }
  function noise(ctx,dest,start,duration,volume=.12,filter=1000,kind='lowpass') {
    const length=Math.max(1,Math.ceil(ctx.sampleRate*duration)),b=ctx.createBuffer(1,length,ctx.sampleRate),data=b.getChannelData(0);let seed=117;
    for(let i=0;i<length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=(seed/2147483648)*.85;}
    const source=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=envelope(ctx,dest,start,duration,volume,.015);f.type=kind;f.frequency.value=filter;f.Q.value=.6;source.buffer=b;source.connect(f);f.connect(g);source.start(start);source.stop(start+duration+.03);return source;
  }
  function voice(ctx,dest,start,pitch=1) {
    const syllables=[360,540,420,660,460];
    syllables.forEach((freq,i)=>{
      const t=start+i*.088,f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=850+(i%3)*420;f.Q.value=3;f.connect(dest);
      tone(ctx,f,t,freq*pitch,.082,.18,'sawtooth',freq*pitch*(i%2?1.12:.88));
      tone(ctx,dest,t,freq*pitch*.5,.075,.035,'triangle');
    });
  }
  function synth(name,ctx,dest,start,options={}) {
    const pitch=options.pitch||1;
    switch(name) {
      case 'match': noise(ctx,dest,start,.13,.35,4900,'highpass');tone(ctx,dest,start+.015,1450,.11,.09,'triangle',700);break;
      case 'step': noise(ctx,dest,start,.065,.14,500);tone(ctx,dest,start,82,.075,.1,'sine',48);break;
      case 'door':tone(ctx,dest,start,105,.38,.16,'sawtooth',72);noise(ctx,dest,start+.23,.12,.27,450);break;
      case 'unlock': [74,81,86].forEach((n,i)=>tone(ctx,dest,start+i*.075,midi(n),.4,.17,'sine'));noise(ctx,dest,start,.09,.12,2400);break;
      case 'pickup': [72,76,79].forEach((n,i)=>tone(ctx,dest,start+i*.06,midi(n)*pitch,.34,.15,'triangle'));break;
      case 'merge':[69,72,76,81,88].forEach((n,i)=>{tone(ctx,dest,start+i*.09,midi(n),.65,.14,'sine');tone(ctx,dest,start+i*.09,midi(n)*2,.3,.025,'triangle');});break;
      case 'stairs': [57,60,64,69].map(n=>options.down?126-n:n).forEach((n,i)=>tone(ctx,dest,start+i*.11,midi(n),.35,.14,'triangle'));break;
      case 'wind':noise(ctx,dest,start,1.25,.24,580);tone(ctx,dest,start,220,.75,.05,'sine',110);break;
      case 'hurt':noise(ctx,dest,start,.48,.33,750);tone(ctx,dest,start,166,.6,.23,'sawtooth',48);[0,1,2].forEach(i=>tone(ctx,dest,start+i*.09,580-i*120,.1,.1,'triangle',220));break;
      case 'dash':noise(ctx,dest,start,.25,.19,1700,'bandpass');tone(ctx,dest,start,190,.21,.12,'sine',650);break;
      case 'win': [57,64,69,72,76,81,88].forEach((n,i)=>{tone(ctx,dest,start+i*.14,midi(n),1.2,.15,'triangle');tone(ctx,dest,start+i*.14,midi(n)*.5,.9,.08,'sine');});voice(ctx,dest,start+.35,1.2);break;
      case 'lose': [64,60,56,45].forEach((n,i)=>tone(ctx,dest,start+i*.23,midi(n),.8,.18,'triangle'));break;
      case 'ui':tone(ctx,dest,start,640,.065,.12,'sine',810);break;
      case 'voice':voice(ctx,dest,start,pitch);break;
      case 'thunder':noise(ctx,dest,start,1.7,.38,240);noise(ctx,dest,start+.05,.25,.2,1700);break;
      case 'ghost':tone(ctx,dest,start,440,.75,.1,'sine',240);tone(ctx,dest,start,447,.75,.065,'sine',245);break;
    }
  }
  function init() {
    if(context)return;
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return;
    context=new AudioContextClass();master=context.createGain();master.gain.value=.78;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=15;limiter.ratio.value=9;limiter.attack.value=.003;limiter.release.value=.15;
    analyser=context.createAnalyser();analyser.fftSize=512;master.connect(limiter);limiter.connect(analyser);analyser.connect(context.destination);
    musicBus=context.createGain();musicBus.gain.value=musicVolume;musicBus.connect(master);
    effectBus=context.createGain();effectBus.gain.value=sfxVolume;effectBus.connect(master);
    reverb=context.createConvolver();const impulse=context.createBuffer(2,context.sampleRate*1.65,context.sampleRate);
    for(let c=0;c<2;c++){const d=impulse.getChannelData(c);let seed=23+c;for(let i=0;i<d.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;d[i]=(seed/2147483648)*Math.pow(1-i/d.length,3)*.22;}}
    reverb.buffer=impulse;const send=context.createGain();send.gain.value=.13;effectBus.connect(send);musicBus.connect(send);send.connect(reverb);reverb.connect(master);nextBeat=context.currentTime+.1;
  }
  function scheduleWaltz(start,index) {
    const n=sequence[index%sequence.length],measure=Math.floor(index/3),base=[45,41,44,40][Math.floor(measure/2)%4];
    tone(context,musicBus,start,midi(n),1.1,.22,'sine');tone(context,musicBus,start,midi(n)*2,.56,.03,'triangle',midi(n)*2,-8);
    if(index%3===0){tone(context,musicBus,start,midi(base),1.4,.18,'triangle');tone(context,musicBus,start,midi(base)*.5,1.1,.11,'sine');}
    else {const chord=index%3===1?[base+12,base+15,base+19]:[base+12,base+16,base+20];chord.forEach(v=>tone(context,musicBus,start,midi(v),.5,.035,'triangle'));}
    noise(context,musicBus,start,.025,.027,1800,'highpass');
  }
  return {
    async unlock(){init();if(!context)return false;try{await context.resume();unlocked=true;stopped=false;nextBeat=Math.max(nextBeat,context.currentTime+.06);return true;}catch{return false;}},
    setVolume(music,sfx){musicVolume=Math.max(0,Math.min(1,Number(music)||0));sfxVolume=Math.max(0,Math.min(1,Number(sfx)||0));if(context){musicBus.gain.setTargetAtTime(musicVolume,context.currentTime,.05);effectBus.gain.setTargetAtTime(sfxVolume,context.currentTime,.05);}},
    play(name,options={}){if(!context||context.state!=='running'||stopped)return;played++;counts[name]=(counts[name]||0)+1;let dest=effectBus;if(options.pan!==undefined&&context.createStereoPanner){dest=context.createStereoPanner();dest.pan.value=Math.max(-1,Math.min(1,options.pan));dest.connect(effectBus);}synth(name,context,dest,context.currentTime+.003,options);},
    update(state,dt){if(!context||context.state!=='running'||stopped)return;if(state?.phase==='ended'){this.stop();return;}if(nextBeat<context.currentTime-.8)nextBeat=context.currentTime+.05;let budget=4;while(nextBeat<context.currentTime+.2&&budget-->0){scheduleWaltz(nextBeat,beat++);nextBeat+=.43;}},
    stop(){stopped=true;if(master&&context)master.gain.setTargetAtTime(0,context.currentTime,.08);},
    resume(){stopped=false;if(master&&context)master.gain.setTargetAtTime(.78,context.currentTime,.08);},
    stats(){let peak=0,rms=0;if(analyser){const d=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(d);for(const n of d){peak=Math.max(peak,Math.abs(n));rms+=n*n;}rms=Math.sqrt(rms/d.length);}return {unlocked,state:context?.state||'locked',musicVolume,sfxVolume,activeVoices,played,counts:{...counts},peak,rms};},
    async testOffline(){const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Offline)return {error:'OfflineAudioContext unavailable'};const c=new Offline(2,48000*3,48000),dest=c.createGain();dest.gain.value=.45;dest.connect(c.destination);const names=['match','step','door','unlock','pickup','merge','stairs','wind','hurt','dash','win','lose','ui','voice','thunder','ghost'];names.forEach((name,i)=>synth(name,c,dest,.03+i*.1,{down:i%2===0}));const buffer=await c.startRendering(),data=buffer.getChannelData(0);let peak=0,power=0,nonZeroSamples=0,finite=true;for(const value of data){peak=Math.max(peak,Math.abs(value));power+=value*value;if(Math.abs(value)>1e-7)nonZeroSamples++;if(!Number.isFinite(value))finite=false;}return {peak,rms:Math.sqrt(power/data.length),nonZeroSamples,duration:buffer.duration,sampleRate:buffer.sampleRate,finite,soundsRendered:names.length};},
    dispose(){context?.close();context=null;unlocked=false;}
  };
}
