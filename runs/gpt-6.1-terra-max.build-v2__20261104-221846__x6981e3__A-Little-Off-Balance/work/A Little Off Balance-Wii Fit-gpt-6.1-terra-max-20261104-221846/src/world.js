import { Engine, THREE, toonMaterial, withUrlOptions } from '../pixel-engine.js';
import { TITLE } from './data/title.js';

const { BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, Mesh, Group, Vector3 } = THREE;

class IslandScene {
  name = TITLE;
  target = new Vector3(0, .6, 0);
  constructor(game) { this.game = game; }
  setup({ scene, engine }) {
    engine.sun.intensity = 1.8;
    const material = color => toonMaterial(color);
    const box = (parent, color, size, position) => {
      const mesh = new Mesh(new BoxGeometry(...size), material(color));
      mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const cylinder = (parent, color, top, bottom, height, position, sides = 24) => {
      const mesh = new Mesh(new CylinderGeometry(top, bottom, height, sides), material(color));
      mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    cylinder(scene, 0xc8a578, 5.6, 5.15, .65, [0, -.38, 0], 48);
    cylinder(scene, 0x8cbe8b, 5.5, 5.6, .18, [0, 0, 0], 48);
    cylinder(scene, 0xf5e3bc, 2.45, 2.45, .035, [0, .11, .1], 48);
    for (const [x,z,scale] of [[-4,-2,1.1],[-3.8,2.5,.8],[3.5,-2.8,1],[4.2,2,.85],[-1,-4.4,.8]]) {
      cylinder(scene, 0x9a795d, .12, .18, 1.2*scale, [x,.6*scale,z], 8);
      const crown = new Mesh(new SphereGeometry(.65*scale, 9, 7), material(0x5c9c70)); crown.position.set(x,1.45*scale,z); crown.castShadow=true; scene.add(crown);
    }
    for (const [x,z,color] of [[-2.7,-2.5,0xe38c70],[2.5,-2.7,0xe9b96f],[3.1,.45,0x82aec1]]) {
      box(scene, 0xf7e8cf, [1.4,1.1,1.15], [x,.67,z]);
      const roof=new Mesh(new ConeGeometry(1.14,.65,4),material(color)); roof.position.set(x,1.53,z); roof.rotation.y=Math.PI/4; roof.castShadow=true; scene.add(roof);
      box(scene,0x759b91,[.25,.38,.03],[x,.65,z+.59]);
    }
    cylinder(scene,0x8cb7ba,.75,.75,.09,[2.4,.13,2.15]);
    const board=box(scene,0xf8f4df,[.75,.15,.55],[-.3,.2,.5]); board.rotation.y=-.25;
    this.hero=new Group(); this.hero.position.set(-.3,.3,.5); scene.add(this.hero);
    cylinder(this.hero,0xe8866b,.27,.34,.65,[0,.58,0],12);
    const head=new Mesh(new SphereGeometry(.29,12,10),material(0xf1c29d));head.position.set(0,1.13,0);this.hero.add(head);
    box(this.hero,0x455d59,[.12,.42,.12],[-.17,.04,0]);box(this.hero,0x455d59,[.12,.42,.12],[.17,.04,0]);
    const left=box(this.hero,0xe8b995,[.12,.5,.12],[-.36,.64,0]);left.rotation.z=-.7;
    const right=box(this.hero,0xe8b995,[.12,.5,.12],[.36,.64,0]);right.rotation.z=.7;
    this.mixer=new THREE.AnimationMixer(this.hero);
    this.mixer.clipAction(new THREE.AnimationClip('idle',2,[new THREE.NumberKeyframeTrack('.position[y]',[0,1,2],[.3,.34,.3])])).play();
    const ounce=box(scene,0xf9faf1,[.72,.45,.53],[.9,.35,1.3]);
    box(scene,0x9cc5b6,[.38,.08,.015],[.9,.42,1.58]); ounce.rotation.y=-.2;
  }
  update(ctx, dt) {
    this.mixer?.update(dt);
    if (this.hero && this.game.session) {
      this.hero.rotation.z = -this.game.session.dot.x*.27;
      this.hero.rotation.x = this.game.session.dot.y*.2;
    } else if (this.hero) { this.hero.rotation.z *= .95; this.hero.rotation.x *= .95; }
    ctx.hud.clear();
  }
  cameraTarget() { return this.target; }
  status() { return `island: ${this.game.screen}`; }
}

export async function startWorld(game) {
  if (!navigator.gpu) return;
  try { if (!await navigator.gpu.requestAdapter()) return; } catch { return; }
  return Engine.start(new IslandScene(game), withUrlOptions({container:document.getElementById('world'),aspect:'fill',touch:false,background:0xc9e8dc,camera:{preset:'iso',zoom:1.05}}));
}
