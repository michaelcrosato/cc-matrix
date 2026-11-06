import * as THREE from 'three/webgpu';

export function createArt() {
  const palette = {ink:0x172a30, navy:0x244753, teal:0x277b79, mint:0x81b6a4, cream:0xf3e3bd, gold:0xe8b655, red:0xd85b46, skin:0xf3b97b, dark:0x25353b};
  const materials = new Map(), moving = [];
  const band = new THREE.DataTexture(new Uint8Array([80,80,80,255,172,172,172,255,255,255,255,255]),3,1);
  band.needsUpdate=true; band.minFilter=band.magFilter=THREE.NearestFilter; band.colorSpace=THREE.NoColorSpace;
  const ink = new THREE.MeshBasicMaterial({color:palette.ink, side:THREE.BackSide});
  function material(color=palette.cream) {
    const key=String(color); if(!materials.has(key)) materials.set(key,new THREE.MeshToonMaterial({color,gradientMap:band}));
    return materials.get(key);
  }
  function mesh(geometry,color,parent,x=0,y=0,z=0,outline=true) {
    const m=new THREE.Mesh(geometry,typeof color==='object'?color:material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;
    if(outline){const shell=new THREE.Mesh(geometry,ink);shell.scale.setScalar(1.035);m.add(shell);}
    if(parent)parent.add(m);return m;
  }
  function box(p,x,y,z,w,h,d,c,o=true){return mesh(new THREE.BoxGeometry(w,h,d),c,p,x,y,z,o);}
  function ball(p,x,y,z,r,c,s=16){return mesh(new THREE.SphereGeometry(r,s,10),c,p,x,y,z);}
  function cyl(p,x,y,z,r,h,c,rt=r,segments=16){return mesh(new THREE.CylinderGeometry(rt,r,h,segments),c,p,x,y,z);}
  function text(p,label,x,y,z,w,h,color='#244753',bg='transparent',font='700 56px Georgia') {
    const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');
    if(bg!=='transparent'){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);}ctx.font=font;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,512,67,990);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.position.set(x,y,z);p.add(m);return m;
  }
  function rod(p,from,to,r,color) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);const m=cyl(p,...a.clone().add(b).multiplyScalar(.5).toArray(),r,d.length(),color);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;
  }
  function character(kind='cop',color) {
    const group=new THREE.Group(), rig=new THREE.Group();group.add(rig);rig.name='rig';
    const crook=kind==='thief'||kind==='crook'; const coat=color||(crook?palette.cream:0x3d83ad), pants=crook?palette.dark:palette.navy;
    const torso=box(rig,0,1.02,0,.61,.65,.36,coat);torso.name='torso';
    if(crook){for(let i=0;i<4;i++)box(rig,0,.79+i*.14,.195,.62,.065,.025,palette.dark,false);}
    else {box(rig,0,.79,.205,.62,.075,.04,palette.ink);for(let i=0;i<3;i++)ball(rig,.03,.88+i*.14,.216,.025,palette.gold,8);const badge=cyl(rig,-.18,1.18,.215,.075,.025,palette.gold,.075,5);badge.rotation.x=Math.PI/2;}
    const head=new THREE.Group();head.name='head';head.position.set(0,1.46,0);rig.add(head);
    ball(head,0,0,0,.27,palette.skin);ball(head,-.27,-.02,0,.065,palette.skin,10);ball(head,.27,-.02,0,.065,palette.skin,10);
    ball(head,0,-.025,.265,.075,palette.skin,10);
    for(const x of[-.105,.105]) {ball(head,x,.045,.238,.026,palette.ink,8);const brow=box(head,x,.105,.242,.09,.022,.025,palette.ink);brow.rotation.z=x>0?-.12:.12;}
    for(const x of[-.07,.07]){const must=ball(head,x,-.105,.244,.075,palette.dark,10);must.scale.set(1,.4,.4);}
    if(crook){cyl(head,0,.22,-.015,.3,.12,palette.dark,.23);box(head,0,.185,.25,.37,.035,.26,palette.dark);box(head,0,.15,-.04,.55,.055,.47,palette.red);}
    else {const helmet=ball(head,0,.22,-.025,.3,coat);helmet.scale.set(1,.86,1);cyl(head,0,.16,-.01,.34,.07,palette.navy);const crest=cyl(head,0,.275,.25,.063,.025,palette.gold,.063,5);crest.rotation.x=Math.PI/2;ball(head,0,.48,-.025,.055,palette.gold,8);}
    const hips=new THREE.Group();hips.name='hips';hips.position.y=.71;rig.add(hips);
    const limbs={};
    for(const [side,s] of [['L',-1],['R',1]]){
      const leg=new THREE.Group();leg.name='leg'+side;leg.position.set(s*.175,0,0);hips.add(leg);cyl(leg,0,-.23,0,.105,.48,pants,.12);box(leg,0,-.58,.075,.23,.15,.39,palette.dark);limbs['leg'+side]=leg;
      const arm=new THREE.Group();arm.name='arm'+side;arm.position.set(s*.39,1.23,0);rig.add(arm);cyl(arm,0,-.19,0,.095,.4,coat,.12);ball(arm,0,-.44,.005,.105,palette.skin,10);limbs['arm'+side]=arm;
      if(crook)for(let i=0;i<2;i++)cyl(arm,0,-.08-i*.16,.002,.1,.055,palette.dark,.1,12);
    }
    if(!crook){const baton=cyl(limbs.armR,.01,-.6,.04,.034,.54,palette.dark);baton.rotation.z=-.25;cyl(limbs.armR,.02,-.79,.04,.045,.065,palette.gold);}
    else {const sack=ball(rig,-.3,.92,-.34,.3,palette.gold,12);sack.scale.set(.85,1.12,.8);cyl(rig,-.3,1.21,-.34,.08,.15,palette.gold,.11,8);}
    const mixer=new THREE.AnimationMixer(group), actions={};
    function clip(name,duration,tracks){const c=new THREE.AnimationClip(name,duration,tracks);const a=mixer.clipAction(c);actions[name]=a;return a;}
    const N=THREE.NumberKeyframeTrack;
    clip('idle',1.8,[new N('rig.position[y]',[0,.9,1.8],[0,.035,0]),new N('head.rotation[z]',[0,.9,1.8],[-.03,.035,-.03])]);
    clip('run',.5,[new N('legL.rotation[x]',[0,.125,.25,.375,.5],[-.7,0,.7,0,-.7]),new N('legR.rotation[x]',[0,.125,.25,.375,.5],[.7,0,-.7,0,.7]),new N('armL.rotation[x]',[0,.125,.25,.375,.5],[.85,0,-.85,0,.85]),new N('armR.rotation[x]',[0,.125,.25,.375,.5],[-.85,0,.85,0,-.85]),new N('rig.position[y]',[0,.125,.25,.375,.5],[0,.075,0,.075,0]),new N('rig.rotation[z]',[0,.25,.5],[-.035,.035,-.035])]);
    clip('duck',.7,[new N('rig.scale[y]',[0,.35,.7],[.58,.55,.58]),new N('rig.scale[x]',[0,.35,.7],[1.15,1.18,1.15]),new N('armL.rotation[x]',[0,.35,.7],[-.8,-.75,-.8]),new N('armR.rotation[x]',[0,.35,.7],[-.8,-.75,-.8])]);
    clip('jump',.8,[new N('legL.rotation[x]',[0,.4,.8],[-.75,-1,-.75]),new N('legR.rotation[x]',[0,.4,.8],[.45,.6,.45]),new N('armL.rotation[x]',[0,.4,.8],[-1.6,-1.9,-1.6]),new N('armR.rotation[x]',[0,.4,.8],[-1.3,-1.6,-1.3]),new N('rig.rotation[z]',[0,.4,.8],[-.09,.08,-.09])]);
    let current='';
    function setAction(name){if(!actions[name])name='idle';if(current===name)return;const next=actions[name];next.reset().play();if(current)actions[current].fadeOut(.1);next.fadeIn(.1);current=name;}
    setAction('idle');
    return {group,mixer,actions,setAction,update(dt){mixer.update(dt);}};
  }
  function hazard(kind='radio'){
    const g=new THREE.Group();g.userData.kind=kind;
    if(kind==='cart'){
      for(const x of[-.42,.42]){const w=cyl(g,x,.14,0,.13,.12,palette.dark);w.rotation.x=Math.PI/2;}
      for(const z of[-.25,.25])for(const x of[-.46,.46])rod(g,[x,.28,z],[x*.85,.88,z],.025,palette.cream);
      box(g,0,.36,0,1.05,.09,.59,palette.red);box(g,0,.8,0,.87,.06,.59,palette.gold);
      for(let i=0;i<5;i++){const x=-.42+i*.21;rod(g,[x,.38,.29],[x*.83,.82,.29],.018,palette.cream);rod(g,[x,.38,-.29],[x*.83,.82,-.29],.018,palette.cream);}
      rod(g,[.44,.7,0],[.74,1.05,0],.035,palette.dark);rod(g,[.74,1.05,-.3],[.74,1.05,.3],.045,palette.red);
      ball(g,-.2,.66,.02,.21,palette.mint);box(g,.15,.65,.02,.32,.5,.3,palette.cream);
    } else if(kind==='ball'){
      const b=ball(g,0,.32,0,.32,palette.red,20);const stripe=mesh(new THREE.TorusGeometry(.324,.025,6,32),palette.cream,g,0,.32,0);stripe.rotation.y=.5;const stripe2=stripe.clone();stripe2.rotation.y+=Math.PI/2;g.add(stripe2);g.userData.spin=b;
    } else if(kind==='plane'){
      const body=cyl(g,0,0,0,.12,.92,palette.red,.08);body.rotation.z=Math.PI/2;
      box(g,0,.13,0,.55,.055,1.15,palette.gold);box(g,0,-.12,0,.55,.055,1.15,palette.gold);
      for(const z of[-.45,.45])rod(g,[0,-.1,z],[0,.13,z],.02,palette.dark);
      box(g,.39,.08,0,.25,.31,.045,palette.red);box(g,.39,0,0,.28,.04,.5,palette.cream);
      const prop=box(g,-.53,0,0,.04,.55,.055,palette.dark);g.userData.propeller=prop;moving.push({kind:'prop',mesh:prop});
      ball(g,-.5,0,0,.08,palette.gold,10);
    } else {
      box(g,0,.43,0,.66,.78,.36,0x916346);ball(g,0,.74,0,.33,0x916346,16).scale.set(1,.8,.6);
      const face=ball(g,0,.55,.205,.245,palette.gold,16);face.scale.set(.86,1,.1);
      for(let i=0;i<5;i++)box(g,-.16+i*.08,.52,.24,.023,.27,.025,palette.dark,false);
      for(const x of[-.19,.19]){const dial=cyl(g,x,.19,.212,.045,.035,palette.cream,.045,12);dial.rotation.x=Math.PI/2;}
      box(g,0,.75,.22,.2,.075,.025,palette.cream,false);
    }
    return g;
  }
  function loot(kind='bag'){
    const g=new THREE.Group();
    if(kind==='case'||kind==='suitcase'){box(g,0,.29,0,.62,.48,.3,palette.gold);box(g,0,.57,0,.22,.11,.14,palette.dark);for(const x of[-.2,.2])box(g,x,.29,.16,.065,.47,.035,palette.cream);}
    else {const sack=ball(g,0,.29,0,.28,palette.gold,14);sack.scale.y=1.15;cyl(g,0,.57,0,.105,.15,palette.gold,.14,8);box(g,0,.52,.02,.24,.045,.2,palette.red);text(g,'$',0,.31,.281,.32,.36,'#5d482e','transparent','700 80px Georgia');}
    const glint=mesh(new THREE.OctahedronGeometry(.075),palette.cream,g,.3,.65,.05);moving.push({kind:'loot',mesh:g,glint});return g;
  }
  function store(scene){
    const g=new THREE.Group();scene.add(g);const labels=[];const floors=[0,4.3,8.6,12.9];
    const wallColors=[0xe2bb89,0x9eb8a3,0xc99b89];
    box(g,0,6.3,-2.8,35.5,14.2,.45,palette.navy);
    for(let f=0;f<3;f++){
      const y=floors[f];box(g,0,y+1.95,-2.5,34,3.9,.18,wallColors[f],false);
      box(g,0,y+3.1,-2.32,34,.65,.13,palette.cream,false);
      for(let x=-16;x<=16;x+=4){box(g,x,y+1.55,-2.32,.16,2.95,.16,palette.cream,false);box(g,x,y+.2,-2.2,.4,.28,.28,palette.gold);}
      for(const x of[-10,-6,6,10]){
        box(g,x,y+1.38,-2.19,2.8,1.8,.12,palette.teal);
        box(g,x,y+1.3,-2.06,2.4,1.38,.08,0xcad8b9,false);
        for(let i=-1;i<=1;i++)box(g,x+i*.69,y+1.3,-1.99,.035,1.3,.02,palette.gold,false);
        box(g,x,y+.3,-1.6,2.9,.6,1,palette.navy);box(g,x,y+.65,-1.6,3,.13,1.03,palette.cream);
        if(f===0){for(const s of[-.75,0,.75]){cyl(g,x+s,y+1.03,-1.67,.11,.55,palette.red,.22);cyl(g,x+s,y+1.35,-1.67,.25,.08,palette.gold);}}
        else if(f===1){for(const s of[-.8,0,.8]){ball(g,x+s,y+.96,-1.6,.23,[palette.red,palette.gold,palette.mint][Math.round((s+.8)/.8)]);}}
        else {for(const s of[-.75,0,.75]){box(g,x+s,y+.98,-1.6,.45,.65,.32,palette.gold);box(g,x+s,y+.98,-1.42,.3,.45,.03,palette.dark,false);}}
        for(let i=0;i<8;i++){const awn=box(g,x-1.4+i*.4,y+2.2,-1.92,.4,.22,.72,i%2?palette.cream:palette.red,false);awn.rotation.x=.16;}
      }
      for(const x of[-3.5,3.5]){rod(g,[x,y+2.9,-2.1],[x,y+2.6,-1.35],.035,palette.navy);const shade=cyl(g,x,y+2.55,-1.3,.23,.23,palette.gold,.12);ball(g,x,y+2.4,-1.3,.09,palette.cream,10);}
      box(g,0,y+3.35,2.48,10.7,.58,.12,palette.cream);
      for(const x of[-4.9,4.9])rod(g,[x,y+3.6,2.48],[x,y+4.1,2.48],.018,palette.gold);
      labels.push(text(g,['01  •  HABERDASHERY','02  •  TOYS & TRINKETS','03  •  HOME & WIRELESS'][f],0,y+3.35,2.555,10.1,.4,'#244753'));
    }
    for(let f=0;f<4;f++){
      const y=floors[f];box(g,0,y-.22,-.15,35,.44,5,palette.cream);
      box(g,0,y-.21,2.38,35,.38,.12,palette.teal);box(g,0,y-.035,2.47,35,.065,.09,palette.gold,false);
      for(let x=-16.5;x<=16.5;x+=1){box(g,x,y-.24,2.46,.33,.045,.04,palette.gold,false);}
      for(let x=-16.25;x<17;x+=1.25)for(let z=-1.4;z<2;z+=1.2){if((Math.round((x+16.25)/1.25)+Math.round((z+1.4)/1.2))%2===0)box(g,x,y+.008,z,1.22,.018,1.17,0xdccda8,false);}
    }
    for(const x of[-17.2,17.2]){box(g,x,6.6,-.25,.55,14.5,5.1,palette.navy);box(g,x,6.7,2.38,.66,14.7,.13,palette.gold);for(let f=0;f<4;f++)box(g,x,floors[f]-.15,2.5,.85,.5,.3,palette.cream);}
    // Elevator shaft: the cab itself is the only moving floor element.
    box(g,0,5.95,-1.85,2.35,12.35,.45,palette.navy);
    for(let f=0;f<3;f++){box(g,0,floors[f]+1.23,-1.51,2.1,2.5,.12,palette.gold);box(g,0,floors[f]+1.2,-1.42,1.8,2.25,.12,palette.dark);text(g,'LIFT',0,floors[f]+2.65,-1.32,1.55,.32,'#244753');for(let n=0;n<3;n++)ball(g,-.21+n*.21,floors[f]+2.3,-1.22,.055,n===f?palette.gold:palette.teal,8);}
    const elevator=new THREE.Group();elevator.position.set(0,0,-.9);g.add(elevator);box(elevator,0,.06,0,1.8,.15,1.4,palette.gold);box(elevator,0,1.15,-.45,1.75,2.25,.12,palette.teal);box(elevator,0,2.35,0,1.9,.17,1.4,palette.gold);box(elevator,-.9,1.2,0,.1,2.4,1.4,palette.gold);box(elevator,.9,1.2,0,.1,2.4,1.4,palette.gold);
    const doors=[box(elevator,-.44,1.2,.58,.85,2.25,.09,palette.mint),box(elevator,.44,1.2,.58,.85,2.25,.09,palette.mint)];for(const d of doors){box(d,0,.1,.07,.035,1.4,.025,palette.gold,false);}
    for(let f=0;f<3;f++){
      const side=f%2===0?-1:1,y=floors[f];
      const start=new THREE.Vector3(side*12.2,y+.14,-.6),end=new THREE.Vector3(side*16.1,y+4.2,-.6);
      for(let i=0;i<18;i++){const t=i/18,x=THREE.MathUtils.lerp(start.x,end.x,t),yy=THREE.MathUtils.lerp(start.y,end.y,t);box(g,x,yy,-.65,.31,.2,1.15,palette.dark);box(g,x,yy+.11,-.65,.3,.035,1.16,palette.gold,false);}
      for(const z of[-1.3,.05]){rod(g,[start.x,y+.9,z],[end.x,y+5,z],.075,palette.navy);rod(g,[start.x,y+.75,z],[end.x,y+4.85,z],.035,palette.gold);}
      text(g,'↑ UP',side*14.8,y+1.15,.18,1.8,.5,'#f3e3bd');
    }
    // Rooftop garden, distant city and a large Deco store crown.
    for(let i=0;i<15;i++){const x=-30+i*4.2,h=2+(i*7%8)*.46;box(g,x,13+h*.5,-9,3.2,h,2,0x335c65,false);for(let yy=14;yy<13+h;yy+=.8)for(const dx of[-.8,0,.8])box(g,x+dx,yy,-7.98,.26,.35,.025,0xa8bb9d,false);}
    for(const x of[-10,-6,6,10]){box(g,x,13.2,-1.75,1.5,.6,.8,palette.red);for(let i=-1;i<=1;i++){const shrub=ball(g,x+i*.34,13.68,-1.75,.38,palette.teal,12);shrub.scale.y=1.3;}}
    box(g,0,15.05,-2.2,14,2.3,.45,palette.navy);box(g,0,15.05,-1.94,13.7,2.02,.05,palette.gold);box(g,0,15.05,-1.88,13.5,1.83,.05,palette.teal);
    text(g,'THE GRAND KEYSTONE',0,15.24,-1.81,12.6,.69,'#f3e3bd');text(g,'FINE GOODS  •  QUESTIONABLE SECURITY',0,14.67,-1.8,10.7,.28,'#f0c56e');
    for(const s of[-1,1]){box(g,s*7.5,14.3,-2.2,.5,3.8,.5,palette.gold);ball(g,s*7.5,16.25,-2.2,.2,palette.gold,12);for(let i=0;i<3;i++)box(g,s*(7.9+i*.25),15.6-i*.32,-2.2,.18,1.3,.3,palette.gold,false);}
    // Roof escape door.
    box(g,15.1,14,-1.55,1.5,2.2,.45,palette.navy);box(g,15.1,13.95,-1.28,1.2,1.95,.07,palette.red);text(g,'EXIT',15.1,15.32,-1.25,1.6,.4,'#f3e3bd');ball(g,15.48,13.9,-1.2,.06,palette.gold,8);
    return {group:g,elevator,doors,labels};
  }
  function tick(dt,t){for(const m of moving){if(m.kind==='prop')m.mesh.rotation.x+=dt*25;else if(m.kind==='loot'){m.glint.rotation.y+=dt*2;m.glint.scale.setScalar(.85+Math.sin(t*4+m.mesh.id)*.18);}}}
  return {character,hazard,loot,material,store,tick,palette};
}
