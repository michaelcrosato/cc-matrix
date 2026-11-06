export function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function rng(seed=14) { let s=typeof seed==='string'?hash(seed):seed>>>0; const f=()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; f.state=()=>s;f.restore=n=>s=n>>>0;return f; }
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
