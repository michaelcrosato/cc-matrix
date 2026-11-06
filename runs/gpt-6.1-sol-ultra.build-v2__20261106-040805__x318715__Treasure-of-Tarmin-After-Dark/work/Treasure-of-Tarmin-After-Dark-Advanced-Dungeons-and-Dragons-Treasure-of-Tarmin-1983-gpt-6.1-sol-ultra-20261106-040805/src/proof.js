import '../vendor/engine/my-3d2dge.js';
import '../vendor/engine/my-3d2dge-3d.js';
const E=My3D2dge;
const game=new E.Game({canvas:'screen',res:'ps1',expand:true,bg:null,autoPause:false,menu:{settings:E.World3D.SETTINGS}});
window.game=game;
(async()=>{try{await E.World3D.init(game);const world=new E.World3D(game,{level:{rows:['######','#....#','#....#','#....#','######'],ground:'flagstone'},camera:{mode:'fixed'},ambient:['#9088aa','#40364a',3],lights:1});world.camera.fixed={x:40,y:46,z:25,yaw:-Math.PI/2,pitch:0,fov:70};world.shape('chest',45,24,0);const lamp=world.light({color:'#ffbf80',reach:130,power:16});lamp.x=40;lamp.y=40;lamp.z=25;game.start({update(dt){world.step(dt)},draw(r){world.draw(r)}});document.querySelector('#ui').innerHTML='<div class="loading">World3D packaging proof ready</div>';window.proofReady=true;}catch(e){document.querySelector('#ui').textContent=e.message;throw e;}})();
