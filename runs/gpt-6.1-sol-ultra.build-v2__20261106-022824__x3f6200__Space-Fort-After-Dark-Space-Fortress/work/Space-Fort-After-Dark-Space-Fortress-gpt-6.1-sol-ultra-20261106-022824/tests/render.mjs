import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function runRenderTests() {
	const failures = [];
	let count = 0;
	const quiet = {
		log() {},
		warn(...v) {
			failures.push("Engine warning: " + v.join(" "));
		},
		error(...v) {
			failures.push("Engine console error: " + v.join(" "));
		},
	};
	const ctx = { console: quiet };
	vm.createContext(ctx);
	for (const f of [
		"vendor/engine-repo/dist/handoff/my-3d2dge.js",
		"src/world.js",
		"src/render.js",
	])
		vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, {
			filename: f,
		});
	ctx.check = (label, condition) => {
		count++;
		if (!condition) failures.push(label);
	};
	vm.runInContext(
		`
const game=new My3D2dge.Game({headless:true,draw:true,res:[960,540],expand:false,view:'overhead',menu:false});
const renderer=new SF.Renderer(game);const w=new SF.World({players:Array.from({length:4},(_,id)=>({id,seat:id,name:'P'+id}))});
let title=false;game.start({update(){game.focus(480,270,0)},draw(r){renderer.draw(r,w.s,{title,debug:true,reducedFlashes:true})}});
for(const act of [0,1,2]){w.s.act=act;w.s.state='play';w.s.time=5;w.s.enemies=[];
for(const [i,type] of ['hunter','bomber','scout','anchor','rammer','tractor','dive','relay'].entries()){const e=w.spawn(type,70+i*110,130);e.t=4;e.telegraph=0;e.cycle=4;}
w.s.boss=act===2?{x:480,y:125,phase:act,cycle:1,hp:100,maxHp:200,components:[{x:420,y:145,hp:4,maxHp:6,open:true,type:'emitter'},{x:540,y:145,hp:0,maxHp:6,open:true,type:'emitter'}]}:null;
for(const p of w.s.players){p.boostT=1;p.invuln=1;}w.s.objective.radiators=[true,false,true,false];w.s.objective.heat=89;
w.s.events=[{id:991,kind:'pulse',x:400,y:400},{id:992,kind:'kill',x:200,y:200}];const before=JSON.stringify(w.s);game.advance(.1);
check('Act '+act+' draw preserves simulation/RNG',before===JSON.stringify(w.s));}
for(const phase of [0,1,2]){w.s.boss.phase=phase;w.s.boss.cycle=phase===0?1:phase===1?3:.7;game.advance(.1);check('Boss phase '+phase+' draws without engine errors',game.errors.length===0);}
title=true;game.advance(.1);check('Title native art draws',game.errors.length===0);renderer.reset();check('Transient reset clears history',renderer.effects.length===0&&renderer.eventIds.size===0);
const before=JSON.stringify(w.s);game.advance(.1);check('Title draw preserves world',before===JSON.stringify(w.s));game.dispose();
`,
		ctx,
	);
	return { passed: count - failures.length, failed: failures.length, failures };
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
	const result = runRenderTests();
	for (const failure of result.failures)
		console.error("FAIL render: " + failure);
	console.log(`${result.passed} passed, ${result.failed} failed`);
	if (result.failed) process.exitCode = 1;
}
