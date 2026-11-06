(() => {
const G=window.GAME;
const voices={vale:[340,.055,'triangle'],quill:[105,.095,'sawtooth'],oyelaran:[170,.09,'triangle'],sokolova:[150,.08,'sawtooth'],percy:[210,.07,'square'],odalys:[300,.05,'triangle'],hale:[125,.11,'sine'],clementine:[390,.09,'sine'],patient:[185,.08,'triangle']};
const formants={a:[730,1090],e:[530,1840],i:[270,2290],o:[570,840],u:[300,870]};
function babble(audio,id,ch='a',index=0){if(index%2||/\s/.test(ch))return;const bus=audio.bus('voice'),ctx=audio.ctx;if(!bus||!ctx)return;
 const [base,dur,wave]=voices[id]||voices.patient,now=ctx.currentTime,freq=base*(1+((ch.charCodeAt(0)*37%12)-6)/48),v=formants[ch.toLowerCase()]||formants[['a','e','i','o','u'][ch.charCodeAt(0)%5]],osc=ctx.createOscillator(),amp=ctx.createGain();
 osc.type=wave;osc.frequency.setValueAtTime(freq,now);osc.frequency.linearRampToValueAtTime(freq*(ch==='?'?1.2:ch==='.'?.85:1.04),now+dur);amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(.075,now+.006);amp.gain.setValueAtTime(.075,now+dur*.6);amp.gain.linearRampToValueAtTime(0,now+dur+.02);
 for(const f of v){const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=f;filter.Q.value=5;osc.connect(filter);filter.connect(amp);}amp.connect(bus);osc.start(now);osc.stop(now+dur+.03);
}
function choir(audio,freq=146,dur=.7,pan=0,kind='legato'){
 const bus=audio.bus('sfx'),ctx=audio.ctx;if(!ctx||!bus)return;
 const now=ctx.currentTime,amp=ctx.createGain(),filter=ctx.createBiquadFilter(),panNode=ctx.createStereoPanner();filter.type='bandpass';filter.frequency.setValueAtTime(730,now);filter.frequency.exponentialRampToValueAtTime(300,now+dur);filter.Q.value=3.5;panNode.pan.value=pan;
 amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(.022,now+.03);amp.gain.exponentialRampToValueAtTime(.001,now+dur);filter.connect(amp);amp.connect(panNode);panNode.connect(bus);
 for(const detune of [-8,0,8]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=freq;o.detune.value=detune;o.connect(filter);o.start(now);o.stop(now+dur+.03);}
 if(kind==='tremolo'){const l=ctx.createOscillator(),a=ctx.createGain();l.frequency.value=9;a.gain.value=.012;l.connect(a);a.connect(amp.gain);l.start();l.stop(now+dur);}
}
const motif='D4 - A4 . F4 - E4 . D4 - . . A3 . . . | F4 - A4 . E4 - D4 . C4 - . . A3 . . .';
const songs={
 title:{bpm:76,steps:4,tracks:[{name:'melody',wave:'triangle',vol:.11,notes:motif},{name:'bass',wave:'sine',vol:.22,notes:'D2 - - - - - - - Bb1 - - - - - - - | G2 - - - - - - - A2 - - - - - - -'}]},
 ward:{bpm:94,steps:4,tracks:[{wave:'piano',vol:.13,notes:'D4 . F4 . A4 - E4 . D4 . . . A3 . . . | C4 . E4 . G4 - A4 . F4 - . . E4 . . .'},{wave:'sine',vol:.24,notes:'D2 . . A2 . . F2 . Bb1 . . F2 . . A2 .'}]},
 tension:{bpm:89,steps:4,tracks:[{wave:'sine',vol:.25,notes:'D2 . . . D2 . . . C2 . . . A1 . . .'},{wave:'triangle',vol:.07,notes:'A3 - - . F3 - - . E3 - - . D3 - - .'}]},
 op:{bpm:128,steps:4,tracks:[{name:'bass',wave:'triangle',vol:.19,notes:'D2 . D3 . A2 . D3 . Bb1 . F2 . A1 . E2 .'},{name:'lead',wave:'triangle',vol:.08,notes:motif},{name:'drums',wave:'drums',vol:.09,on:false,notes:'k . h . s . h . k . h k s . h .'}]},
 boss:{bpm:138,steps:4,tracks:[{name:'bass',wave:'saw',vol:.1,notes:'D2 . D2 . C2 . A1 . Bb1 . Bb1 . A1 . C2 .'},{name:'lead',wave:'triangle',vol:.08,notes:'D4 - Ab3 . B3 - C4 . D4 - . . Ab4 - . . | F4 - Eb4 . C4 - Db4 . A3 - . . C4 - . .'},{name:'drums',wave:'drums',vol:.12,notes:'k h . h s h . h k h k h s . h h'}]},
 final:{bpm:132,steps:4,tracks:[{name:'bass',wave:'triangle',vol:.17,notes:'D2 . A2 . D3 . A2 . C2 . G2 . C3 . G2 .'},{name:'lead',wave:'piano',vol:.11,notes:motif},{name:'drums',wave:'drums',vol:.08,notes:'k . h . s . h . k . h k s . h .'}]},
 closed:{bpm:112,steps:4,tracks:[{wave:'piano',vol:.25,notes:'D4 F4 A4 D5 - - - -'},{wave:'sine',vol:.3,notes:'D2 - - - - - - -'}]},
 lost:{bpm:66,steps:4,tracks:[{wave:'triangle',vol:.17,notes:'A3 - Ab3 - G3 - D3 - - - - -'}]}
};
function install(game){const a=game.audio;
 a.instrument('piano',(ctx,bus,time,freq,dur,vol)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(vol*.7,time);g.gain.exponentialRampToValueAtTime(.0001,time+Math.max(.08,dur));o.connect(g);g.connect(bus);o.start(time);o.stop(time+dur+.04);});
 const defs={tool:{wave:'noise',freq:1600,to:500,dur:.045,vol:.14},grip:{wave:'sine',freq:950,to:680,dur:.055,vol:.16},free:{wave:'triangle',freq:1900,to:1200,dur:.12,vol:.16},stitch:{wave:'triangle',freq:480,to:1000,dur:.085,vol:.18},inject:{wave:'noise',freq:1700,to:650,dur:.17,vol:.09},drain:{wave:'sine',freq:160,to:450,dur:.18,vol:.1},slip:{wave:'noise',freq:170,to:50,dur:.14,vol:.23},tear:{wave:'noise',freq:800,to:80,dur:.18,vol:.25},reveal:{wave:'sine',freq:650,to:1550,dur:.2,vol:.13},breath:{wave:'sine',freq:380,to:85,dur:.7,vol:.16},rewind:{wave:'saw',freq:1200,to:100,dur:.7,vol:.09},shock:{wave:'noise',freq:100,to:2200,dur:.3,vol:.3},blue:{wave:'sine',freq:760,dur:.7,vol:.16},char:{wave:'noise',freq:2700,dur:.09,vol:.09},overheat:{wave:'square',freq:120,to:70,dur:.22,vol:.12},closed:{wave:'triangle',freq:523,arp:[0,4,7,12],step:.13,dur:.6,vol:.2},lost:{wave:'sine',freq:440,to:220,dur:.8,vol:.15},oneBeep:{wave:'sine',freq:880,dur:.12,vol:.18}};
 Object.entries(defs).forEach(([k,v])=>a.define('surgical-'+k,v));
 let track='',beat=-1,choirTime=0,toolSound=0,alarm=-1,wasStatic=false,restoreTrack='final';
 const music=name=>{if(name===track)return;track=name;a.music(name?songs[name]:null,{fade:.6});};
 function present(events){for(const e of events){if(defs[e.k])a.sfx('surgical-'+e.k);if(e.k==='grade')a.sfx({wave:'triangle',freq:e.grade==='Textbook'?1046:e.grade==='Clean'?698:220,arp:e.grade==='Textbook'?[0,7]:[0],step:.07,dur:.15,vol:.14});if(e.k==='silence')music(null);}}
 function tick(S,dt){if(!S)return;const ph=G.Op.phaseDef(S),silent=ph?.silent||S.flags.silence>0;
  if(silent){music(null);const note=S.objects.find(o=>o.type==='lastnote'&&!o.done);if(note&&S.players.some(p=>p.grab?.id===note.id)){toolSound-=dt;if(toolSound<=0){toolSound=.14;choir(a,240+note.progress*1050,.2,0,'lastnote');}}return;}
  const quiet=ph?.static&&S.phaseTime%20<15;if(quiet&&!wasStatic){restoreTrack=track||'final';music(null);}if(!quiet&&wasStatic)music(restoreTrack);wasStatic=quiet;
  const b=Math.floor(S.worldTime/.9);if(b!==beat&&S.mode==='operating'){beat=b;if(!quiet){a.sfx({wave:'sine',freq:650+S.vitals*3,dur:.065,vol:.08});}if(S.vitals<30){a.sfx({wave:'sine',freq:80,to:42,dur:.12,vol:.18});game.input.rumble(.4,.08);}}
  if(S.mode==='operating'&&track){a.tempo(S.slow?67:S.vitals<30?150:128);a.layer('lead',S.slow?0:.08,.3);a.layer('drums',S.vitals<40?.12:Math.min(.07,S.phase*.012),.5);}
  choirTime-=dt;const strain=S.objects.find(o=>!o.done&&G.strains[o.type]);if(strain&&choirTime<=0){choirTime=strain.type==='bead'?.4:1.4;choir(a,strain.type==='fermata'?164:strain.type==='tremolo'?146:110+(strain.id%5)*22,.8,(strain.x-213)/190,strain.type);}
  toolSound-=dt;const p=S.players[0];if(!quiet&&p?.trig>.3&&toolSound<=0){toolSound=.17;if([1,5,6,7].includes(p.tool))a.sfx({wave:p.tool===7?'sine':'noise',freq:[0,1700,0,0,0,3200,120,1100][p.tool],to:p.tool===6?250:undefined,dur:.13,vol:p.tool===7?.035:.045});}
  if(ph?.static&&Math.floor(S.elapsed/3)!==alarm){alarm=Math.floor(S.elapsed/3);babble(a,'quill','a',0);}
 }
 G.Sound={music,present,tick,babble:(id,ch,i)=>babble(a,id,ch,i),choir:(f,d,p,k)=>choir(a,f,d,p,k),stop(){music(null);a.mute(true);},songs};return G.Sound;
}
G.Audio={install,babble,choir,voices,songs};
})();
