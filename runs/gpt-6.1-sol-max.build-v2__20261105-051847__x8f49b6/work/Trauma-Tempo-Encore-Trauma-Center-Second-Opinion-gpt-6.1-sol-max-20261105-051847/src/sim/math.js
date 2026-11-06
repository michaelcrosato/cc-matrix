export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function seeded(seed=2147){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function project(x,y,points){let best={d:Infinity,t:0,x:points[0][0],y:points[0][1]};let total=0;const lengths=[];for(let i=1;i<points.length;i++){const n=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lengths.push(n);total+=n;}let off=0;for(let i=1;i<points.length;i++){const [a,b]=points[i-1],[c,d]=points[i],dx=c-a,dy=d-b;const t=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy||1),0,1),px=a+t*dx,py=b+t*dy,n=Math.hypot(x-px,y-py);if(n<best.d)best={d:n,x:px,y:py,t:(off+t*lengths[i-1])/(total||1)};off+=lengths[i-1];}return best;}
export function pointAt(points,f){let lengths=[],total=0;for(let i=1;i<points.length;i++){let l=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lengths.push(l);total+=l;}let t=clamp(f,0,1)*total;for(let i=0;i<lengths.length;i++){if(t<=lengths[i]||i===lengths.length-1){const q=t/(lengths[i]||1);return {x:points[i][0]+(points[i+1][0]-points[i][0])*q,y:points[i][1]+(points[i+1][1]-points[i][1])*q};}t-=lengths[i];}return{x:points[0][0],y:points[0][1]};}
export const inDrape=(x,y)=>(x/1.4)**2+(y/.85)**2<=1;
export const inTray=(x,y)=>x>1.37&&x<1.89&&y>-.2&&y<.6;
export function hash(value){let n=2166136261;const s=JSON.stringify(value);for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return(n>>>0).toString(16);}
