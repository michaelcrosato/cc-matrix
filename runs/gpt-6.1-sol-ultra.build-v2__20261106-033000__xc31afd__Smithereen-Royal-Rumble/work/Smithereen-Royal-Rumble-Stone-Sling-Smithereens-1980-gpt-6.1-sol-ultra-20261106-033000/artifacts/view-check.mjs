import '../vendor/engine/my-3d2dge.js';
import {createWorld,command,step} from '../src/sim.js';
import {createView} from '../src/view.js';
import {createAudio} from '../src/audio.js';
const E=globalThis.My3D2dge;
const game=new E.Game({headless:true,draw:true,loop:false,res:[640,360],expand:true,view:'side',input:{},menu:false,corner:false,autoPause:false});
let world=createWorld({court:0});
const app={world,game,screen:'play',mode:'quick',settings:{music:.1,effects:.7,voice:.45,reducedMotion:false,glyphs:'PlayStation',fire1:'Space'},device:'keyboard',dev:{},caption:'HOLD TO WIND · RELEASE TO THROW'};
const view=createView(E,game),audio=createAudio(E,game);
game.start({update(dt){step(app.world,dt);view.update(dt,app);audio.update(dt,app);},draw:r=>view.draw(r,app)});
for(let court=0;court<5;court++){
 app.world=createWorld({court});view.clear();game.advance(1/30,{draw:true});command(app.world,0,{type:'begin'});game.advance(.8,{draw:true});command(app.world,0,{type:'release'});game.advance(3,{draw:true});
}
console.log(JSON.stringify({errors:game.errors,view:view.diagnostics(),audio:audio.diagnostics()}));game.dispose();
