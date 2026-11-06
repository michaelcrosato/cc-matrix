(() => {
const G=window.G,A=G.game.audio;
const melodies=[
 'C5 . E5 - G5 . E5 . D5 - . . G4 . B4 .',
 'F4 - A4 . C5 . A4 . G4 . E4 - C5 . D5 .',
 'A4 . C5 - E5 . D5 . C5 - A4 . G4 . E4 .',
 'D5 - . A4 . F5 - E5 D5 . C5 . A4 . G4 .',
 'G4 . D5 . B4 . G4 . A4 - C5 . D5 . B4 .',
 'E5 . G5 . A5 - G5 . E5 . D5 . C5 - . .',
 'C5 . G4 . E5 . D5 . F5 . E5 . D5 . B4 .',
 'A4 . E5 . G5 . E5 . D5 . C5 . B4 . G4 .',
 'F5 . E5 . C5 - A4 . G4 . A4 . D5 . C5 .',
 'D5 . A4 . F5 . E5 . A5 - G5 . E5 . C5 .',
 'B4 . D5 . G5 . D5 . A4 . C5 . E5 . C5 .',
 'E5 - D5 . C5 . G4 . A4 - C5 . D5 - . .',
 'C5 . E5 . G5 - A5 . G5 . E5 . D5 . C5 .',
 'F4 - . . A4 - C5 . E5 - D5 . C5 - . .'
];
G.SONGS={};['studio','island','dusk','yoga','iron','step','step2','jog','ski','tray','laundry','festival','ending','raft'].forEach((id,i)=>{
 G.SONGS[id]={bpm:[88,104,76,72,96,100,120,112,116,92,108,112,68,70][i],steps:4,tracks:[{name:'keys',wave:'sine',vol:.22,gate:.65,notes:melodies[i]+' | '+melodies[(i+3)%14]},{name:'bass',wave:'triangle',vol:.16,gate:.8,notes:['C3 - . . G2 - . . A2 - . . F3 - . .','F2 - . . C3 - . . D3 - . . G2 - . .'][i%2]},{name:'air',wave:'triangle',vol:.045,gate:1,notes:'C6 - - - . . . . E6 - - - . . . .',on:true},{name:'brush',wave:'drums',vol:.07,notes:i===3||i===13?'h . . . . . . .':'k . h . . . h . k . h . c . h .'}]};
});
const sfx={boop:{wave:'sine',freq:523,to:784,dur:.17,vol:.32,arp:[0,7],step:.08},chime:{wave:'sine',freq:880,to:1320,dur:.17,vol:.15},creak:{wave:'triangle',freq:75,to:52,dur:.18,vol:.12},stumble:{wave:'noise',freq:500,to:100,dur:.2,vol:.14},clink:{wave:'sine',freq:1500,to:2000,dur:.15,vol:.17},gull:{wave:'triangle',freq:1100,to:650,dur:.24,vol:.12,vib:[12,.06]},flame:{wave:'noise',freq:900,to:1800,dur:.1,vol:.05},whirr:{wave:'sine',freq:220,to:440,dur:.12,vol:.05},carve:{wave:'noise',freq:1300,to:400,dur:.16,vol:.09},plop:{wave:'sine',freq:600,to:160,dur:.13,vol:.2},stamp:{wave:'triangle',freq:250,to:650,dur:.13,vol:.2},tick:{wave:'sine',freq:740,to:900,dur:.045,vol:.12},pick:{wave:'sine',freq:660,to:990,dur:.12,vol:.18},beat:{wave:'sine',freq:1350,to:800,dur:.035,vol:.18}};
for(const [k,v]of Object.entries(sfx))A.define(k,v);
G.music=id=>{if(G.lastSong===id&&A.song)return;G.lastSong=id;A.music(G.SONGS[id]||G.SONGS.studio,{sync:true,fade:.45});};
G.jingle=n=>A.sting({bpm:150,steps:4,loop:false,len:12,tracks:[{wave:'sine',vol:.25,notes:n>=3?'C5 E5 G5 C6 - - E6 - - - . .':n===2?'C5 . E5 . G5 - - - . . . .':'C5 . E5 - - - . . . . . .'},{wave:'triangle',vol:.1,notes:'C3 - - - G3 - - - C4 - - -'}]});
G.VOICES={Tare:[640,'sine'],Birch:[125,'triangle'],Alder:[310,'triangle'],Gertrude:[430,'sine'],Dennis:[180,'triangle'],Marisol:[360,'sine'],'Young Kevin':[220,'triangle'],'Mr. Okafor':[165,'sine'],Lou:[110,'sine']};
G.babble=(name,ch,providedCtx,providedBus)=>{
 if(!/[a-z0-9]/i.test(ch))return null;
 const ctx=providedCtx||A.ctx;if(!ctx)return null;
 const bus=providedBus||A.bus('voice');if(!bus)return null;
 const v=G.VOICES[name]||[290,'triangle'],code=ch.toLowerCase().charCodeAt(0),vowel=/[aeiou]/i.test(ch),dur=vowel?.09:.06,t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain(),f=ctx.createBiquadFilter();
 osc.type=v[1];osc.frequency.setValueAtTime(v[0]*(.83+(code%13)*.041),t);osc.frequency.exponentialRampToValueAtTime(v[0]*(.92+(code%7)*.038),t+dur);
 f.type='bandpass';f.frequency.value=vowel?1100+(code%5)*240:700+(code%9)*130;f.Q.value=.7;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.15,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+dur);
 osc.connect(f);f.connect(gain);gain.connect(bus);osc.start(t);osc.stop(t+dur+.01);return osc;
};
A.onBeat(()=>{const ctx=G.context;if(ctx?.a.family==='step'&&G.sessionPhase==='play'){A.sfx('beat');if((A.pos.beat|0)%4===0)G.babble(G.member.instructor,'ta');}});
G.talk=new G.E.Dialog(G.game,{speed:32,lines:2,color:G.palette.ink,nameColor:G.palette.cyan,bg:['#ffffff','#edf7f7'],border:'#bedfe0',voice:(ch,i,talk)=>G.babble(talk.name,ch)});G.talk.shadow=null;
})();
(() => {
const G=window.G,A=G.game.audio;
G.balanceTone=()=>{const ctx=A.ctx;if(!ctx)return null;const osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();osc.type='sine';osc.frequency.value=220;gain.gain.value=.055;osc.connect(gain);gain.connect(pan);pan.connect(A.bus('sfx'));osc.start();return {set(x,y){osc.frequency.setTargetAtTime(220*Math.pow(2,y*.5),ctx.currentTime,.06);pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,x)),ctx.currentTime,.06);},stop(){try{osc.stop();}catch(e){}}};};
})();
