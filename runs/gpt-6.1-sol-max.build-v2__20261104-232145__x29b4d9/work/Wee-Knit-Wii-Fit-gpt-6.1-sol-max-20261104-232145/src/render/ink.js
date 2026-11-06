import * as T from 'three/webgpu';
import {uniform,vec4,positionLocal,normalLocal,cameraProjectionMatrix,modelViewMatrix,normalize,time,sin} from 'three/tsl';
// Draw the ink hull and the cel surface together. This keeps newly built sets in
// the same native render traversal as the scenery, lights and moving characters.
export function makeInk(renderer,scene,camera){
 const u={hull:uniform(.0028),width:uniform(1.2),boil:uniform(.35),grain:uniform(.015),near:uniform(camera.near),far:uniform(camera.far),ink:uniform(new T.Color(0x26232e))},stats={sceneFrames:0},outlines=new WeakMap();
 function outlineFor(original){let m=outlines.get(original);if(m)return m;m=new T.NodeMaterial();m.name='Retreat ink hull';m.side=T.BackSide;const mvp=cameraProjectionMatrix.mul(modelViewMatrix),p=mvp.mul(vec4(positionLocal,1)),p2=mvp.mul(vec4(positionLocal.add(normalLocal.negate()),1)),n=normalize(p.sub(p2)),boil=sin(time.mul(8)).mul(u.boil).mul(.08).add(1);m.vertexNode=p.add(n.mul(u.hull).mul(u.width.div(1.2)).mul(boil).mul(p.w));m.colorNode=vec4(u.ink,1);outlines.set(original,m);return m;}
 const render=()=>{const previous=renderer.getRenderObjectFunction();renderer.setRenderObjectFunction((object,sc,cam,geometry,material,group,lights,clip)=>{if(material.isMeshToonNodeMaterial&&material.wireframe===false&&u.hull.value>0)renderer.renderObject(object,sc,cam,geometry,outlineFor(material),group,lights,clip);renderer.renderObject(object,sc,cam,geometry,material,group,lights,clip);});renderer.render(scene,camera);renderer.setRenderObjectFunction(previous);stats.sceneFrames++;};
 return {u,stats,scene,render};
}
