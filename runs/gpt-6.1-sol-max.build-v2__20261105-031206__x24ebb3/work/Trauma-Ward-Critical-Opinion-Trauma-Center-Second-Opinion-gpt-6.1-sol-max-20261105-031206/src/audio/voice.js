const VOWELS=[[730,1090,2440],[530,1840,2480],[270,2290,3010],[570,840,2410],[300,870,2240]];
export function syllable(timbre=0,vowel=0,onset=0,rate=22050){
 const n=Math.floor(rate*.115),pcm=new Float32Array(n),f0=[190,142,112][timbre],formants=VOWELS[vowel];let seed=57+vowel*79+onset;
 const harmonics=[];for(let k=1;k<45;k++){const f=k*f0;let amp=.05/k;for(let j=0;j<3;j++)amp+=Math.exp(-(((f-formants[j])/(120+j*95))**2))/(j+1);harmonics.push(amp/k**.3);}
 for(let i=0;i<n;i++){
  const t=i/rate,envelope=Math.min(1,t/.012)*Math.min(1,(.115-t)/.025);let v=0;
  for(let k=1;k<=harmonics.length;k++)v+=Math.sin(Math.PI*2*f0*k*t+.035*Math.sin(t*80))*harmonics[k-1];
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const consonant=t<.025?((seed/4294967296-.5)*(.025-t)*9*(onset===2?1:.25)):0;
  pcm[i]=Math.tanh((v*.35+consonant)*envelope)*.65;
 }return pcm;
}
export function wavBytes(pcm,rate=22050){
 const bytes=new Uint8Array(44+pcm.length*2),v=new DataView(bytes.buffer),put=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
 put(0,'RIFF');v.setUint32(4,36+pcm.length*2,true);put(8,'WAVE');put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);put(36,'data');v.setUint32(40,pcm.length*2,true);
 for(let i=0;i<pcm.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),true);return bytes;
}
export function wavURL(pcm){const a=wavBytes(pcm);let s='';for(const b of a)s+=String.fromCharCode(b);return'data:audio/wav;base64,'+(typeof btoa==='function'?btoa(s):Buffer.from(a).toString('base64'));}
