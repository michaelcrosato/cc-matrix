(() => {
const E=My3D2dge,G=window.GAME,{px}=E;
const steel='#b8d8de',hi='#f2ffef',dark='#384d67';
function instrument(g,tool,x,y,held=0,color='#b4ddd4',charge=0,heat=0,icon=false){
 const dx=icon?10:20,dy=icon?12:30,X=x+dx,Y=y+dy;
 const line=(a,b,c,d,col=steel,w=2)=>px.line(g,a,b,c,d,col,w);
 if(!icon){px.poly(g,[[X-7,Y-2],[X+1,Y-7],[X+9,Y-2],[X+16,Y+10],[X+6,Y+17],[X-3,Y+12],[X-9,Y+3]],E.tones(color).sh);px.poly(g,[[X-6,Y-3],[X+1,Y-6],[X+7,Y-2],[X+12,Y+8],[X+5,Y+12],[X-2,Y+8]],color);line(X+2,Y-1,X+5,Y+7,E.tones(color).lt,2);}
 if(tool===0){const gap=held?1:4;line(x,y,x+dx-gap,y+dy,hi,2);line(x,y,x+dx+gap,y+dy,steel,2);line(x+dx-gap,y+dy,x+dx+gap,y+dy,dark,2);}
 if(tool===1){line(x+4,y+5,X,Y,dark,4);line(x+4,y+5,X,Y,steel,2);px.poly(g,[[x,y],[x+3,y+10],[x+8,y+9],[x+5,y+1]],hi);}
 if(tool===2){line(x+4,y+4,X,Y,steel,2);px.line(g,x,y,x-3,y+4,hi,1);px.line(g,x-3,y+4,x+1,y+8,hi,1);if(held){line(x,y,x-18,y+8,'#98d3ff',1);line(x-18,y+8,x-21,y+5,'#638fdf',1);}}
 if(tool===3){line(x+5,y+7,X,Y,'#7dcccc',5);line(x+5,y+7,X,Y,'#ddf6d0',3);px.disc(g,x,y,3,'#87e2b6');px.dot(g,x-1,y-1,hi);}
 if(tool===4){line(x,y,x+5,y+8,hi,1);px.poly(g,[[x+2,y+8],[x+7,y+4],[x+18,y+19],[x+13,y+23]],dark);px.poly(g,[[x+4,y+8],[x+7,y+7],[x+15,y+19],[x+13,y+21]],'#ddf0dc');line(x+7,y+10,x+7+6*charge,y+10+8*charge,'#7bddca',3);line(x+15,y+20,X+4,Y+4,steel,2);line(X-2,Y+5,X+5,Y,hi,2);}
 if(tool===5){line(x,y,X,Y,dark,5);line(x,y,X,Y,steel,2);px.disc(g,x,y,held?2:1,held?'#ffda83':'#f1a66f');if(held){px.dot(g,x-2,y-2,'#fff6c6');px.dot(g,x+2,y-1,'#ffb96c');}}
 if(tool===6){line(x,y,X,Y,dark,6);line(x,y,X,Y,'#84b7c4',3);px.ell(g,x,y,3,2,hi);px.ell(g,x,y,1,1,'#1a2f47');}
 if(tool===7){line(x+5,y+5,X,Y,dark,4);px.ell(g,x,y,7,5,'#286b77');px.ell(g,x-1,y-1,5,3,'#83d4cf');line(x-5,y-1,x+3,y-1,hi,1);}
}
function circle(g,x,y,r,color,width=1,start=0,end=Math.PI*2,dashed=false){const n=Math.max(12,Math.ceil(r*3)),step=(end-start)/n;for(let i=0;i<n;i++){if(dashed&&i%3===2)continue;const a=start+i*step,b=a+step;px.line(g,x+Math.cos(a)*r,y+Math.sin(a)*r,x+Math.cos(b)*r,y+Math.sin(b)*r,color,width);}}
function cap(g,label,x,y,color='#d5e9df'){const w=E.font.width(label)+8;E.ui.box(g,x,y,w,13,{bg:'#102e37',border:color});E.font.text(g,label,x+4,y+3,color,{outline:false});return w;}
G.Instruments={draw:instrument,circle,cap};
})();
