// Original geometric artwork. Three.js r180 WebGPU/TSL renderer; no image assets.
export class BattlefieldView {
  constructor(THREE, TSL, canvas) {
    this.T = THREE; this.N = TSL; this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf6dfbb);
    this.camera = new THREE.OrthographicCamera(-26,26,25,-3,0.1,220);
    this.camera.position.set(0,16,48); this.camera.lookAt(0,10,0);
    this.baseCamera = this.camera.position.clone();
    this.entities = new Map(); this.shots = new Map(); this.players = [];
    this.mixers = []; this.ambientMixers = []; this.fx = []; this.waves = []; this.clouds = [];
    this.materials = new Map(); this.clock = 0; this.backend = 'initializing';
    this.ink = new THREE.LineBasicMaterial({color:0x153d43,transparent:true,opacity:0.88});
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0,0,1),0);
    this.root = new THREE.Group(); this.scene.add(this.root);
  }
  async init() {
    const T=this.T;
    this.renderer = new T.WebGPURenderer({canvas:this.canvas,antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.NoToneMapping;
    await this.renderer.init();
    this.backend=this.renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL2 fallback';
    this.buildCoast(); this.resize();
    return this;
  }
  mat(hex, flat=false) {
    const key=hex+':'+flat;if(this.materials.has(key))return this.materials.get(key);
    const T=this.T,N=this.N;let m;
    if(!flat && T.MeshBasicNodeMaterial && N?.normalWorld) {
      m=new T.MeshBasicNodeMaterial();
      const shade=N.normalWorld.dot(N.vec3(-0.35,0.8,0.45)).max(0).mul(3).floor().div(3).mul(0.34).add(0.66);
      m.colorNode=N.color(hex).mul(shade);
    } else m=new T.MeshBasicMaterial({color:hex});
    this.materials.set(key,m);return m;
  }
  mesh(g,color,parent,x=0,y=0,z=0,outline=true) {
    const T=this.T,m=new T.Mesh(g,this.mat(color));m.position.set(x,y,z);parent?.add(m);
    if(outline) {const e=new T.LineSegments(new T.EdgesGeometry(g,28),this.ink);m.add(e);}
    return m;
  }
  box(parent,w,h,d,color,x=0,y=0,z=0,outline=true){return this.mesh(new this.T.BoxGeometry(w,h,d),color,parent,x,y,z,outline);}
  ball(parent,x,y,z,sx,sy,sz,color,outline=true) {
    const m=this.mesh(new this.T.SphereGeometry(1,12,8),color,parent,x,y,z,outline);m.scale.set(sx,sy,sz);return m;
  }
  cyl(parent,r1,r2,h,color,x=0,y=0,z=0,n=12){return this.mesh(new this.T.CylinderGeometry(r1,r2,h,n),color,parent,x,y,z);}
  shape(parent,points,depth,color,x=0,y=0,z=0) {
    const s=new this.T.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();
    return this.mesh(new this.T.ExtrudeGeometry(s,{depth,bevelEnabled:false}),color,parent,x,y,z-depth/2);
  }
  line(parent,points,color=0xd9f1df,opacity=1) {
    const T=this.T;const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));
    const l=new T.Line(g,new T.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(l);return l;
  }
  spin(root,part,axis='x',speed=1) {
    const T=this.T;part.name='rotor'+Math.floor(Math.random()*1e9);
    const mixer=new T.AnimationMixer(root);
    const track=new T.NumberKeyframeTrack(part.name+'.rotation['+axis+']',[0,1],[0,Math.PI*2]);
    mixer.clipAction(new T.AnimationClip('propeller',1,[track])).play();mixer.timeScale=speed;
    root.userData.mixers ||= [];root.userData.mixers.push(mixer);return mixer;
  }
  buildCoast() {
    const T=this.T,r=this.root;
    // Large sunrise disc, offset rings and etched rays.
    const sun=new T.Group();sun.position.set(17.5,18,-48);r.add(sun);
    const disc=this.mesh(new T.CircleGeometry(5.2,64),0xf7b66f,sun,0,0,0,false);
    const halo=this.mesh(new T.RingGeometry(5.9,5.97,80),0xf8c98c,sun,0,0,-.1,false);
    for(let i=0;i<14;i++){const a=i*Math.PI*2/14;this.line(sun,[[Math.cos(a)*6.5,Math.sin(a)*6.5,0],[Math.cos(a)*7.35,Math.sin(a)*7.35,0]],0xecc38d,.7);}
    // A painted deep-water backing keeps tall portrait views inside the diorama.
    const deepWater=new T.Mesh(new T.PlaneGeometry(180,180),this.mat(0x1d6c74,true));
    deepWater.position.set(0,-95,-50);r.add(deepWater);
    // Painted horizon, ocean horizontal planes and long whitecaps.
    const sea=this.mesh(new T.PlaneGeometry(140,120),0x318b8c,r,0,-.34,20,false);sea.rotation.x=-Math.PI/2;
    for(let i=0;i<18;i++){
      const strip=this.mesh(new T.PlaneGeometry(140,3.8),[0x7bb6a7,0x58a39b,0x4d9e98,0x3e9293,0x318b8c,0x2b8389,0x277d83,0x23777e,0x1f727b][Math.min(i,8)],r,0,-.29,-36+i*7,false);strip.rotation.x=-Math.PI/2;
    }
    for(let i=0;i<125;i++){
      const x=((i*17.79)%91)-45.5,z=-35+((i*11.41)%64),len=.2+(i%6)*.39;
      const wave=this.box(r,len,.025,.075,i%4===0?0xc9e5ce:0x78b9aa,x,-.18,z,false);
      this.waves.push({mesh:wave,phase:i*.6,x,z});
    }
    // Layered paper-cut headlands.
    const far=new T.Group();r.add(far);
    this.shape(far,[[-44,0],[-44,2],[-37,2.7],[-31,3],[-28,2],[-23,2.2],[-19,.7],[-13,.4],[-9,0]],1,0x7fa99a,0,0,-38);
    this.shape(far,[[13,0],[17,1.1],[22,1.3],[24,2.3],[28,2.5],[33,1.8],[40,2.8],[46,2],[46,0]],1,0x7fa99a,0,0,-35);
    this.shape(far,[[-35,0],[-35,1],[-31,1.6],[-29,2.5],[-25,1.9],[-22,1.2],[-20,.6],[-17,0]],1,0x4e8a82,0,0,-22);
    this.shape(far,[[18,0],[21,1.6],[26,2.4],[29,1.8],[33,2.2],[38,1],[40,0]],1,0x4e8a82,0,0,-24);
    this.lighthouse(20.5,-15,1.1);
    this.lighthouse(-24,-24,.65);
    // Puffy, lightly inked clouds; custom keyframed gentle breathing.
    for(let i=0;i<10;i++){
      const c=new T.Group();c.position.set(-35+i*8.6,11+(i*3.1)%10,-28-(i%3)*6);r.add(c);
      const s=.7+(i%3)*.28;c.scale.setScalar(s);
      this.ball(c,0,0,0,2.2,.55,.5,0xfaf0d5,false);this.ball(c,-.9,.35,-.05,.85,.7,.45,0xfaf0d5,false);this.ball(c,.5,.55,-.05,1.1,.9,.55,0xfaf0d5,false);
      this.line(c,[[-2,0,.55],[-.8,-.13,.55],[.6,-.1,.55],[1.7,0,.55]],0xe6cfa8,.6);
      this.clouds.push({mesh:c,x:c.position.x,phase:i});
    }
    // Two little defended islands, timber piers and ammunition crates.
    this.island(-6,1);this.island(6,2);
    const buoy=new T.Group();buoy.position.set(15,-.03,1.8);r.add(buoy);
    this.cyl(buoy,.5,.7,.28,0xf0dbaf,0,.1,0);this.cyl(buoy,.29,.4,1.1,0xdf604c,0,.7,0);
    this.cyl(buoy,.32,.32,.22,0xf8efd6,0,.85,0);this.cyl(buoy,.12,.15,.5,0x193d43,0,1.44,0);
    this.ball(buoy,0,1.73,0,.16,.16,.16,0xf9c675);
    const mix=new T.AnimationMixer(buoy);
    mix.clipAction(new T.AnimationClip('buoy-bob',3,[new T.NumberKeyframeTrack('.position[y]',[0,1.5,3],[0,.13,0]),new T.NumberKeyframeTrack('.rotation[z]',[0,1.5,3],[-.06,.06,-.06])])).play();this.ambientMixers.push(mix);
    for(let i=0;i<8;i++)this.seagull(-24+i*7,8+(i%3)*.8,-18-i);
    // Foreground dark rocks make the diorama read as a physical miniature.
    for(let i=0;i<13;i++){
      const x=-35+i*6.1;
      if(Math.abs(x)<12)continue;
      const rock=this.mesh(new T.DodecahedronGeometry(1.3,0),0x24575c,r,x,-1.7,12);rock.scale.set(1.6,.8,1);
    }
  }
  lighthouse(x,z,scale) {
    const T=this.T,g=new T.Group();g.position.set(x,.1,z);g.scale.setScalar(scale);this.root.add(g);
    for(let i=0;i<9;i++){
      const a=i*2.4;const rock=this.mesh(new T.DodecahedronGeometry(.9,0),0x426b65,g,Math.sin(a)*1.65,-.1,Math.cos(a)*1.1);rock.scale.set(1.5,.65,1);
    }
    this.cyl(g,1.7,2.0,.35,0xc4ba8c,0,.15,0);
    for(let i=0;i<5;i++)this.cyl(g,.53-i*.035,.57-i*.035,.8,i%2===0?0xf8edcc:0xd8684e,0,.65+i*.8,0);
    this.cyl(g,.77,.7,.18,0x193f46,0,4.35,0);
    this.cyl(g,.48,.48,.75,0xefc778,0,4.78,0,8);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;this.box(g,.055,.8,.055,0x1b454b,Math.sin(a)*.5,4.8,Math.cos(a)*.5);
    }
    this.cyl(g,0,.82,.6,0xd26049,0,5.48,0,8);
    this.cyl(g,.05,.05,.45,0x1b454b,0,5.97,0);
    this.box(g,.32,.65,.1,0x254f50,0,.66,.56);
    for(let i=0;i<3;i++)this.box(g,.18,.35,.1,0x244e4c,0,1.8+i*.9,.53-i*.03);
    this.box(g,2,.25,1.3,0xead8b1,-1.5,.5,.1);this.box(g,2.2,.28,1.5,0xcc7657,-1.5,.8,.1);
  }
  island(x,index) {
    const T=this.T,g=new T.Group();g.position.set(x,0,0);this.root.add(g);
    this.cyl(g,2.75,3.05,.45,0xd5bd83,0,-.08,0,12);
    for(let i=0;i<12;i++){
      const a=i*2.399;const rock=this.mesh(new T.DodecahedronGeometry(.6+i%3*.16,0),i%3===0?0x88a08a:0x53796d,g,Math.cos(a)*2.35,-.04,Math.sin(a)*1.9);rock.scale.set(1.4,.7,1);
    }
    const turf=this.cyl(g,2.3,2.45,.14,0xa7ad78,0,.2,0,12);
    this.cyl(g,1.2,1.3,.28,0xd8c999,0,.38,0,16);
    this.cyl(g,1.1,1.15,.12,0x264e50,0,.58,0,16);
    // Side bunkers, striped ammo boxes, wood jetty.
    this.box(g,1.1,.65,.9,0xe9d5aa,-1.65,.6,-.15);this.box(g,1.25,.14,1.1,0x365f59,-1.65,.97,-.15);
    for(let j=0;j<2;j++){
      this.box(g,.52,.48,.54,0xa78353,1.48+j*.35,.59,-.4-j*.35);
      this.box(g,.08,.5,.56,0xead6a3,1.48+j*.35,.59,-.4-j*.35);
    }
    for(let j=0;j<6;j++)this.box(g,.47,.12,1.15,0xaf875d,2.6+j*.48,.15,.3);
    for(const dx of [2.6,4.9])for(const dz of [-.3,.9])this.cyl(g,.09,.1,1.1,0x6c6250,dx,-.1,dz,6);
    const flagpole=this.cyl(g,.035,.04,2.1,0x204a4b,-2.05,1.28,-.7,6);
    const f=this.shape(g,[[0,0],[.8,-.12],[.7,-.54],[0,-.47]],.025,index===1?0xf1b755:0x6cc6b9,-2.02,2.3,-.68);
    f.name='flag'+index;
    const mixer=new T.AnimationMixer(f);mixer.clipAction(new T.AnimationClip('flag flutter',1.3,[new T.NumberKeyframeTrack('.rotation[y]',[0,.65,1.3],[-.2,.2,-.2])])).play();this.ambientMixers.push(mixer);
  }
  seagull(x,y,z) {
    const T=this.T,g=new T.Group();g.position.set(x,y,z);this.root.add(g);
    const l=this.shape(g,[[-.8,.1],[0,0],[-.35,.25]],.035,0xf5ebcc,0,0,0);
    const r=this.shape(g,[[0,0],[.8,.1],[.35,.25]],.035,0xf5ebcc,0,0,0);
    l.name='leftWing';r.name='rightWing';
    const mix=new T.AnimationMixer(g);mix.clipAction(new T.AnimationClip('gull flight',1.1,[new T.NumberKeyframeTrack('leftWing.rotation[x]',[0,.55,1.1],[-.4,.7,-.4]),new T.NumberKeyframeTrack('rightWing.rotation[x]',[0,.55,1.1],[.4,-.7,.4])])).play();this.ambientMixers.push(mix);
  }
  makePlane(type='scout') {
    const T=this.T,g=new T.Group(),large=type==='bomber',col=large?0xd35746:0xec7959;
    const fus=this.cyl(g,.34,.48,2.4,col);fus.rotation.z=-Math.PI/2;
    this.ball(g,1.24,0,0,.35,.33,.34,0xf3d49d);
    this.ball(g,.35,.35,0,.48,.28,.33,0x316776);
    const wing=this.box(g,.9,.13,3.25,col,-.15,.13,0);wing.rotation.y=.12;
    this.box(g,.75,.12,1.45,0xf2bd75,-1.1,.12,0);
    const fin=this.shape(g,[[-.6,0],[.1,0],[-.45,.83]],.18,col,-.82,.1,0);
    // Ochre wing tips, black landing wheels, blue-white roundels.
    this.box(g,.91,.14,.24,0xf4d495,-.15,.14,1.5);this.box(g,.91,.14,.24,0xf4d495,-.15,.14,-1.5);
    for(const z of [-.46,.46]){const wheel=this.cyl(g,.18,.18,.12,0x22474b,-.2,-.48,z,12);wheel.rotation.x=Math.PI/2;}
    const round=this.mesh(new T.CircleGeometry(.2,20),0xf4e9ca,g,-.45,0,.47,false);
    this.mesh(new T.CircleGeometry(.11,20),0x284e56,g,-.45,0,.475,false);
    const prop=new T.Group();prop.position.x=1.53;g.add(prop);
    this.box(prop,.07,1.65,.12,0x254951);this.box(prop,.07,.13,1.65,0x254951);this.ball(prop,.05,0,0,.15,.15,.15,0xe9b65e);
    this.spin(g,prop,'x',5);
    if(large){g.scale.set(1.65,1.35,1.3);for(const z of [-1,1]){this.ball(g,-.1,-.1,z,.6,.25,.25,0x973f39);}}
    return g;
  }
  makeHeli() {
    const T=this.T,g=new T.Group();
    this.ball(g,0,0,0,1.1,.64,.6,0xdcb460);this.ball(g,.65,.15,.1,.52,.4,.52,0x326b75);
    this.box(g,1.9,.16,.19,0xcea351,-1.55,.15,0);
    this.shape(g,[[0,0],[.55,0],[.2,.7]],.1,0xdf7956,-2.5,.2,0);
    for(const z of [-.55,.55]){this.box(g,1.8,.08,.08,0x24505a,0,-.83,z);for(const x of [-.6,.6])this.box(g,.08,.4,.08,0x24505a,x,-.63,z);}
    this.cyl(g,.08,.08,.5,0x214a50,0,.78,0);
    const rotor=new T.Group();rotor.position.y=1.06;g.add(rotor);this.box(rotor,4.1,.045,.13,0x1d454b);this.box(rotor,.13,.045,4.1,0x1d454b);this.spin(g,rotor,'y',3.2);
    const tail=new T.Group();tail.position.set(-2.45,.25,.1);g.add(tail);this.box(tail,.08,1,.05,0x254951);this.box(tail,1,.08,.05,0x254951);this.spin(g,tail,'z',5);
    return g;
  }
  makeShip(type) {
    const T=this.T,g=new T.Group(),patrol=type==='patrol';
    this.shape(g,[[-2.25,.25],[-1.6,-.58],[1.5,-.58],[2.4,.25]],1.0,patrol?0x49877c:0x466d6d);
    this.box(g,3.9,.16,1.15,0xdbc88e,0,.32,0);this.box(g,3.4,.09,1.16,0xe8e0ba,0,.18,0);
    this.box(g,1.3,.8,.86,0xe1d2a3,-.45,.8,0);this.box(g,1.8,.13,1.15,0x274f54,-.45,1.26,0);
    for(const x of [-.8,-.3,.2])this.box(g,.28,.28,.05,0x2c6471,x,.93,.46);
    this.box(g,.52,.38,.55,0xcc7654,-1.1,1.45,0);this.box(g,.58,.12,.61,0x234b50,-1.1,1.68,0);
    const mast=this.cyl(g,.035,.035,1.2,0x284f51,-.3,1.87,0,6);this.box(g,1,.04,.04,0x284f51,-.3,2.3,0);
    this.shape(g,[[0,0],[.7,-.08],[0,-.35]],.03,0xe17b57,-.29,2.4,.02);
    this.cyl(g,.28,.36,.27,0x2d5d5d,1.2,.56,0);
    this.box(g,.9,.13,.16,0x244b4e,1.5,.76,0);
    for(let i=0;i<5;i++)this.ball(g,-1.4+i*.65,-.03,.54,.07,.07,.03,0xe9cb83,false);
    for(const z of [-.5,.5])for(const x of [-1.7,-.8,.1,1,1.7])this.cyl(g,.025,.025,.35,0x305a58,x,.55,z,5);
    this.line(g,[[-2,.72,.5],[1.9,.72,.5]],0x305a58);
    const wake=new T.Group();g.add(wake);for(let j=0;j<3;j++)this.line(wake,[[-2-j*.5,-.48,.6+j*.2],[-3.5-j*.5,-.48,.4+j*.3]],0xb7ddc9,.8);
    if(patrol)g.scale.setScalar(.78);return g;
  }
  makeBlimp() {
    const T=this.T,g=new T.Group();this.ball(g,0,0,0,2.7,1.0,.85,0xe8b35c);
    for(const x of [-1.3,0,1.3]){const ring=this.mesh(new T.TorusGeometry(.91,.022,4,28),0xba854c,g,x,0,0,false);ring.rotation.y=Math.PI/2;ring.scale.set(1,.9,1);}
    this.box(g,1.1,.45,.55,0x56766b,0,-1.05,0);
    this.shape(g,[[-.5,0],[.6,0],[.2,.85]],.1,0xc47c4d,-2,.2,0);
    this.box(g,.8,.1,1.8,0xc47c4d,-2.05,0,0);
    this.box(g,1.7,.13,1.72,0xf6d58d,.2,0,0);
    return g;
  }
  makeMine() {
    const T=this.T,g=new T.Group();this.ball(g,0,0,0,.54,.54,.54,0x3b5f5e);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const spike=this.cyl(g,.07,.12,.4,0x2b4e50,Math.cos(a)*.61,Math.sin(a)*.61,0,6);spike.rotation.z=a-Math.PI/2;}
    this.ball(g,0,0,.53,.16,.16,.08,0xefaa65);return g;
  }
  makeBoss() {
    const T=this.T,g=new T.Group();
    this.ball(g,0,.3,0,5.0,1.25,1.05,0x365f62);
    this.box(g,8.4,.28,2.2,0xe0c18a,0,.65,0);
    this.box(g,6.2,.26,2.35,0xc15d48,0,.88,0);
    this.shape(g,[[-5,0],[-3.8,.1],[-4.4,2]],.23,0xd16b4c,0,.55,0);
    this.box(g,1.4,1.25,1.2,0xd8c69a,-1.9,1.47,0);
    this.box(g,1.75,.18,1.45,0x1e454d,-1.9,2.16,0);
    this.box(g,1.25,.35,1.26,0x467d83,-1.9,1.62,0);
    for(const x of [-3,0,3]){
      const pod=new T.Group();pod.position.set(x,-.8,0);g.add(pod);
      this.ball(pod,0,0,0,.55,.5,.75,0xd78652);this.cyl(pod,.24,.3,.55,0x2d4b4d,0,-.5,.25);
      const prop=new T.Group();prop.position.set(x,0,1.1);g.add(prop);this.box(prop,1.6,.13,.06,0x203f45);this.box(prop,.13,1.6,.06,0x203f45);this.spin(g,prop,'z',3.5);
    }
    for(const x of [-3.6,-2.8,-2,-1.2,-.4,.4,1.2,2,2.8,3.6])this.ball(g,x,-.05,1,.095,.095,.035,0xf2da9b,false);
    for(const x of [1.9,3.3])this.box(g,.55,.07,1.9,0xf2dfb2,x,1.04,0);
    return g;
  }
  makeEnemy(type) {
    const g=type==='heli'?this.makeHeli():type==='ship'||type==='patrol'?this.makeShip(type):type==='blimp'?this.makeBlimp():type==='mine'?this.makeMine():type==='boss'?this.makeBoss():this.makePlane(type);
    g.userData.type=type;this.scene.add(g);return g;
  }
  makePlayer(i) {
    const T=this.T,g=new T.Group(),col=i===0?0xefb55a:0x6ec8b6;
    this.scene.add(g);
    this.cyl(g,.78,.93,.5,0x28575b,0,-.8,0,16);
    this.ball(g,0,-.42,0,.9,.55,.72,col);
    this.box(g,.5,.25,.7,0x244f56,-.62,-.35,.05);
    this.box(g,.14,.43,1.18,0xf2dfad,.2,-.3,0);
    const pivot=new T.Group();g.add(pivot);g.userData.pivot=pivot;
    const barrel=new T.Group();pivot.add(barrel);barrel.name='barrel';g.userData.barrel=barrel;
    this.box(barrel,1.8,.35,.38,col,.85,0,0);this.box(barrel,.36,.48,.5,0x24464c,1.7,0,0);
    this.box(barrel,.12,.31,.32,0xf0dba6,1.94,0,0);
    this.ball(g,0,0,.45,.3,.3,.08,0x234b51);
    const flash=this.mesh(new T.SphereGeometry(1,6,4),0xffe6a0,barrel,2.17,0,0,false);flash.scale.set(.4,.35,.35);flash.visible=false;g.userData.flash=flash;
    const mixer=new T.AnimationMixer(barrel);
    const action=mixer.clipAction(new T.AnimationClip('cannon recoil',.18,[new T.NumberKeyframeTrack('.position[x]',[0,.04,.18],[0,-.24,0])]));action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;g.userData.recoil=action;g.userData.mixers=[mixer];g.userData.lastFlash=0;
    const aim=new T.Group();this.scene.add(aim);g.userData.aim=aim;
    for(let j=0;j<8;j++)this.ball(aim,3+j*1.05,0,0,.055,.055,.055,col,false);
    const ret=this.mesh(new T.RingGeometry(.28,.34,28),col,aim,11.5,0,0,false);g.userData.reticle=ret;
    return g;
  }
  syncEntities(state) {
    const active=new Set();
    for(const e of state.enemies||[]){active.add(e.id);if(!this.entities.has(e.id))this.entities.set(e.id,this.makeEnemy(e.type));}
    for(const [id,g]of this.entities)if(!active.has(id)){this.removeObject(g);this.entities.delete(id);}
    const shots=new Set();
    for(const p of state.projectiles||[]){shots.add(p.id);if(!this.shots.has(p.id)){
      const T=this.T,g=new T.Group(),hostile=p.kind==='bomb',color=hostile?0xe87354:p.kind==='torpedo'?0x8ae3c8:0xffdf8c;
      const body=this.ball(g,0,0,0,hostile?.15:.11,hostile?.29:.2,.12,color,false);
      const trail=this.box(g,.085,p.kind==='torpedo'?.7:.5,.06,color,0,-.35,0,false);g.userData.trail=trail;
      if(hostile){this.box(g,.4,.1,.1,0x733f3d,0,.22,0);this.ball(g,0,-.15,.1,.07,.07,.05,0xffd189,false);}
      this.scene.add(g);this.shots.set(p.id,g);
    }}
    for(const[id,g]of this.shots)if(!shots.has(id)){this.removeObject(g);this.shots.delete(id);}
  }
  update(dt,state={}) {
    dt=Math.min(dt,.1);this.clock+=dt;const t=this.clock;
    if(this.currentMode!==state.mode){this.currentMode=state.mode;if((this.width/this.height)<1)this.resize();}
    this.syncEntities(state);
    this.ambientMixers.forEach(m=>m.update(dt));
    this.clouds.forEach(c=>{c.mesh.position.x=c.x+Math.sin(t*.025+c.phase)*1.6;});
    this.waves.forEach(w=>{w.mesh.position.x=w.x+Math.sin(t*.6+w.phase)*.45;w.mesh.scale.x=.8+Math.sin(t+w.phase)*.16;});
    (state.players||[]).forEach((p,i)=>{
      const g=this.players[i]||(this.players[i]=this.makePlayer(i));g.visible=p.active!==false;
      g.position.set(p.x??(i?6:-6),1.8,0);g.userData.pivot.rotation.z=p.angle??1.2;
      g.userData.aim.position.copy(g.position);g.userData.aim.rotation.z=p.angle??1.2;
      g.userData.aim.visible=g.visible&&(state.mode==='play'||state.mode==='attract');
      const flash=Number(p.flash)||0;if(flash>g.userData.lastFlash || (flash>0&&g.userData.lastFlash<=0)){g.userData.recoil.reset().play();}
      g.userData.lastFlash=flash;g.userData.flash.visible=flash>0;
      g.userData.mixers.forEach(m=>m.update(dt));
      g.userData.reticle.rotation.z=t*1.5;
    });
    for(let i=(state.players||[]).length;i<this.players.length;i++){this.players[i].visible=false;this.players[i].userData.aim.visible=false;}
    for(const e of state.enemies||[]){const g=this.entities.get(e.id);if(!g)continue;
      g.position.set(e.x,e.y,0);g.rotation.y=(e.dir??1)<0?Math.PI:0;
      const isShip=e.type==='ship'||e.type==='patrol';
      g.rotation.z=Math.sin(t*2+Number(e.id||0))*(isShip?.025:e.type==='mine'?.15:.035);
      if(e.type==='blimp')g.rotation.z=Math.sin(t+e.x)*.025;
      if(e.type==='boss')g.rotation.z=Math.sin(t*.9)*.025;
      g.userData.mixers?.forEach(m=>m.update(dt));
    }
    for(const p of state.projectiles||[]){const g=this.shots.get(p.id);if(!g)continue;g.position.set(p.x,p.y,.5);g.rotation.z=Math.atan2(p.vy??1,p.vx??0)-Math.PI/2;}
    for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.age+=dt;const a=f.age/f.life;
      if(a>=1){this.removeObject(f.group);this.fx.splice(i,1);continue;}
      for(const q of f.parts){q.mesh.position.x+=q.vx*dt;q.mesh.position.y+=q.vy*dt;q.vy-=q.gravity*dt;q.mesh.rotation.z+=q.spin*dt;q.mesh.scale.multiplyScalar(Math.max(.01,1-dt*q.shrink));}
      if(f.ring){f.ring.scale.setScalar(1+a*f.expand);f.ring.material.opacity=(1-a)*.9;}
      if(f.star){f.star.rotation.z+=dt*.7;f.star.scale.setScalar(Math.max(.01,1-a));}
    }
    const shake=Number(state.shake)||0;this.camera.position.copy(this.baseCamera);this.camera.position.x+=Math.sin(t*100)*shake*.12;this.camera.position.y+=Math.cos(t*113)*shake*.1;
    this.camera.updateMatrixWorld();
  }
  effect(type,x,y,color) {
    const T=this.T,g=new T.Group();g.position.set(x,y,1.2);this.scene.add(g);
    const big=type==='explosion'||type==='salvo',splash=type==='splash',heal=type==='heal',life=big?.85:.45;
    const f={group:g,age:0,life,parts:[],expand:big?5:3};
    const mat=new T.MeshBasicMaterial({color:color??(heal?0x8bdfb7:splash?0xd7ecd3:0xffce76),transparent:true,opacity:.9,side:T.DoubleSide});
    const ring=new T.Mesh(new T.RingGeometry(.16,.21,32),mat);g.add(ring);f.ring=ring;
    if(!splash&&!heal){const shape=new T.Shape();for(let i=0;i<20;i++){const a=i*Math.PI/10,r=i%2?.35:big?1.05:.48;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();const star=new T.Mesh(new T.ShapeGeometry(shape),this.mat(0xffe4a0,true));g.add(star);f.star=star;}
    const count=big?18:splash?10:7;
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count,sp=(big?3.5:2)*(1+(i%3)*.3);
      const mesh=this.mesh(new T.DodecahedronGeometry((big?.18:.09)*(1+(i%3)*.3),0),i%3===0?0xe0774b:splash?0xc5e5d2:heal?0x79c9ac:0xffc879,g,0,0,0,false);
      f.parts.push({mesh,vx:Math.cos(a)*sp,vy:splash?Math.abs(Math.sin(a))*sp:Math.sin(a)*sp,gravity:splash?7:big?2:0,spin:i%2?3:-3,shrink:big?1.3:.9});
    }
    this.fx.push(f);
  }
  resize() {
    if(!this.renderer)return;const w=this.canvas.clientWidth||window.innerWidth,h=this.canvas.clientHeight||window.innerHeight;
    this.width=w;this.height=h;this.renderer.setSize(w,h,false);
    const aspect=w/h,portraitAction=aspect<1&&['play','attract','result'].includes(this.currentMode),worldW=portraitAction?23:Math.max(53,28.6*aspect),worldH=worldW/aspect;
    this.camera.left=-worldW/2;this.camera.right=worldW/2;this.camera.top=worldH/2;this.camera.bottom=-worldH/2;
    this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  }
  screenToWorld(clientX,clientY) {
    const rect=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new this.T.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);
    const v=new this.T.Vector3();this.ray.ray.intersectPlane(this.plane,v);return{x:v.x,y:v.y};
  }
  worldToScreen(x,y) {
    const v=new this.T.Vector3(x,y,0).project(this.camera),r=this.canvas.getBoundingClientRect();return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};
  }
  render(){this.renderer?.render(this.scene,this.camera);}
  removeObject(o){this.scene.remove(o);o.userData.mixers?.forEach(m=>m.stopAllAction());o.traverse(c=>{c.geometry?.dispose();if(c.material?.transparent&&c.material!==this.ink)c.material.dispose();});}
  dispose(){for(const f of this.fx)this.removeObject(f.group);this.scene.traverse(o=>o.geometry?.dispose());this.materials.forEach(m=>m.dispose());this.ink.dispose();this.renderer?.dispose();}
}
