import fs from 'node:fs';
import {sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub} from './credits.js';
sourceInformation.testing='Headless scripted full-story playthrough; keyboard, emulated standard gamepad and multitouch; offline/live Web Audio analysis; two-page co-op and direct WebRTC; upstream AI Hub standard, dedicated-server and host-departure harnesses with latency/loss; file:// launch; 1920×1080 WebGL compatibility screenshots for visual inspection. Physical-controller, real-phone and TV behavior: unknown.';
testingFeedback.splice(0,4,
 '17 distinct root-cause issues were caught by automated tests, visual checks and code review; all were corrected.',
 '3 were game-breaking in their affected mode: duplicate bundled imports prevented startup, dedicated-server seat mapping prevented correct player control, and guest menu/restart authority could block or fork co-op. All were corrected.',
 'The complete scripted story playthrough combined with the actual upstream AI Hub harness: these checked the ending, shared puzzle input, authoritative co-op, dedicated-server control and round lifecycle.',
 'The initial WebGPU screenshot was least helpful because this headless environment returned a blank GPU canvas; engine/state checks and the renderer’s WebGL compatibility screenshots supplied useful evidence instead.'
);
engineFeedback.splice(0,6,
 'Three.js made the miniature world easy to compose, and native AnimationMixer clips and WebGPURenderer worked together with the procedural art.',
 'Yes. MeshToonMaterial rejected a flatShading option, so faceted geometry supplies that shape. Headless WebGPU screenshots were blank, so visual inspection used the same renderer’s WebGL compatibility backend while gameplay tests verified actual WebGPU.',
 'The adventure state machine, controller-first UI, procedural characters and audio, and host-authoritative shared-world co-op with standalone connection exchange.',
 'Keeping physics, animation, menus, shared puzzle input and the Hub dedicated-server lifecycle consistent in a portable single HTML file.',
 'none',
 'Provide a compact built-in example that combines WebGPU, a Rapier character, native animation, controller menus and shared-world networking.'
);
promptFeedback.splice(0,4,
 'The source, controller-first goal and code-only audio requirement gave the adventure a clear personality while leaving room for original mechanics.',
 'The no-internet-research instruction appeared alongside a required online integration link. Only the explicitly requested integration code and dependencies were downloaded; film and design research remained native model knowledge.',
 'Delivering the full three-act adventure, procedural art and music, accessible input, two networking paths and a reviewed single-file package together.',
 'Clarify that dependency and required-integration downloads are allowed, and specify the preferred player count and approximate demo length.'
);
aiHub.controls='Move: WASD/arrows or left stick; click to ride; interact: E/Cross; glow or lift: Space/Square; sneak or boost: Shift/L2; camera: drag/right stick; pause: Esc/Options; signal: 1/2/3 or Square/Cross/Circle; touch: invisible stick, context action and assisted flight.';
let source=fs.readFileSync('credits.js','utf8');
for(const [name,value] of Object.entries({sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub})){
 const regex=new RegExp('export const '+name+' = [\\s\\S]*?;(?=\\n\\n)');
 if(!regex.test(source))throw new Error('Cannot update '+name);
 source=source.replace(regex,'export const '+name+' = '+JSON.stringify(value,null,2)+';');
}
fs.writeFileSync('credits.js',source);
const data={sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub};
fs.writeFileSync('../exit-interview.json',JSON.stringify(data,null,2)+'\n');
JSON.parse(fs.readFileSync('../exit-interview.json','utf8'));
console.log('Exit interview saved and parsed.');
