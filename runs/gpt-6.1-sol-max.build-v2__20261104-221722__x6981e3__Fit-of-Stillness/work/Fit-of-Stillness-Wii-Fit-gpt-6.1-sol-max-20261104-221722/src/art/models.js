import { model, ModelCatalog, MODEL_LIBRARY } from '../../pixel-engine.js';
export const ounce = model({
  id: 'ounce', about: 'Ounce: a mint retro bathroom scale whose round dial is its face', tags: ['character'], size: [1.1, 1.05, 1.1],
  palette: { body: 'cyan', base: 'teal', tread: 'sky', face: 'white', rim: 'slate', tick: 'mist', needle: 'red', eye: 'ink' },
  parts: [
    { name: 'base', box: [1.04, 0.08, 1.04], at: [0, 0.04, 0], c: 'base' },
    { name: 'plate', box: [0.96, 0.2, 0.96], at: [0, 0.18, 0], c: 'body' },
    { mirror: [{ name: 'tread', box: [0.3, 0.03, 0.42], at: [0.22, 0.295, -0.22], c: 'tread' }], axis: 'x' },
    { group: [
        { name: 'neck', box: [0.5, 0.42, 0.14], at: [0, 0.21, 0], c: 'body' },
        { group: [
            { name: 'rim', cyl: [0.78, 0.1, 0.78], at: [0, 0, 0], c: 'rim', seg: 14 },
            { name: 'dial', cyl: [0.66, 0.04, 0.66], at: [0, 0.06, 0], c: 'face', seg: 14 },
            ...[-60, -30, 0, 30, 60].map((a) => ({ box: [0.06, 0.03, 0.09], at: [Math.sin(a * Math.PI / 180) * 0.26, 0.085, -Math.cos(a * Math.PI / 180) * 0.26], rot: [0, -a, 0], c: 'tick' })),
            { mirror: [{ name: 'eye', box: [0.08, 0.03, 0.11], at: [0.12, 0.09, -0.07], c: 'eye' }], axis: 'x' },
            { group: [{ name: 'needleBar', box: [0.06, 0.03, 0.22], at: [0, 0, 0.1], c: 'needle' }, { name: 'hub', cyl: [0.07, 0.04, 0.07], at: [0, 0, 0], c: 'needle', seg: 8 }], name: 'needle', pivot: true, at: [0, 0.1, 0.1], rot: [0, 180, 0] },
          ], name: 'face', pivot: true, at: [0, 0.5, 0.08], rot: [72, 0, 0] },
      ], name: 'head', pivot: true, at: [0, 0.26, 0.2] },
  ],
});
const def = (id,about,palette,parts,extra={})=>model({id,about,tags:['tare-island'],palette,parts,...extra});
export const palm = def('tare-palm','A curved palm with six broad folded fronds',{trunk:'orange',leaf:'teal',light:'green'},[
 {tube:[[0,0,0],[.08,1.3,0],[.25,2.6,0],[.55,4,0]],r:[.23,.15],c:'trunk',seg:6},
 ...Array.from({length:6},(_,i)=>({group:[{slab:[[0,0],[.35,.25],[1.6,-.22],[2,-.85],[.9,-.4]],depth:.08,c:i%2?'leaf':'light',at:[0,0,0]}],at:[.55,3.9,0],rot:[0,i*60,0]})),
 ...[-.16,.16].map(x=>({ball:[.32,.36,.32],at:[.55+x,3.7,.12],c:'trunk',seg:6}))
],{floats:true});
export const pavilion = def('tare-pavilion','A white open-air pavilion with a sky blue folded roof',{stone:'white',base:'mist',roof:'sky',trim:'teal'},[
 {box:[5.6,.24,4.8],at:[0,.12,0],c:'base'}, {box:[5.3,.12,4.5],at:[0,.3,0],c:'stone'},
 ...[-2.3,2.3].flatMap(x=>[-1.9,1.9].map(z=>({cyl:[.22,2.9,.22],at:[x,1.8,z],c:'stone',seg:6}))),
 {cone:[6.3,1.2,5.5],at:[0,3.7,0],c:'roof',seg:4}, {box:[5.7,.2,4.9],at:[0,3.13,0],c:'trim'}
]);
export const kettlebell = def('kettlebell-volcano','A dormant kettlebell volcano with a thick handle',{rock:'teal',rim:'slate',crater:'orange'},[
 {ball:[9,6.8,9],at:[0,3.1,0],c:'rock',seg:10}, {torus:[6,1.15,6],at:[0,7.7,0],rot:[90,0,0],c:'rim',seg:10}, {cyl:[2.1,.25,2.1],at:[0,6.52,0],c:'crater',seg:8}
],{floats:true});
export const roller = def('foam-roller-hill','An oversized foam roller with visible rings',{body:'plum',stripe:'sky'},[
 {cyl:[5.6,10,5.6],at:[0,2.8,0],rot:[0,0,90],c:'body',seg:10},...[-3.8,-1.8,.2,2.2,4.2].map(x=>({cyl:[5.72,.18,5.72],at:[x,2.8,0],rot:[0,0,90],c:'stripe',seg:10}))
],{floats:true});
export const dumbbell = def('tare-dumbbell','A very large dumbbell that doubles as a bridge',{metal:'slate',bar:'mist',cap:'teal'},[
 {cyl:[.55,8,.55],at:[0,1.4,0],rot:[0,0,90],c:'bar',seg:8},...[-3.1,3.1].flatMap(x=>[{cyl:[2.8,1.15,2.8],at:[x,1.4,0],rot:[0,0,90],c:'metal',seg:10},{cyl:[2.2,.1,2.2],at:[x+Math.sign(x)*.6,1.4,0],rot:[0,0,90],c:'cap',seg:10}])
]);
export const mat = def('yoga-mat','A thick yoga mat with a contrasting end stripe',{body:'sky',edge:'white'},[{box:[1.5,.08,2.3],at:[0,.04,0],c:'body'},{box:[1.5,.015,.1],at:[0,.088,.85],c:'edge'}]);
export const jar = def('sweat-jar','A tall glazed jar that collects metaphorical effort',{base:'mist',glass:'sky',lid:'teal',label:'white'},[
 {cyl:[2.4,.25,2.4],at:[0,.125,0],c:'base',seg:12},{lathe:[[.85,0],[.95,.1],[.95,2.1],[.75,2.4],[.75,2.55]],at:[0,.25,0],c:'glass',seg:12},{cyl:[1.65,.18,1.65],at:[0,2.9,0],c:'lid',seg:12},{box:[1,.6,.08],at:[0,1.25,.94],c:'label'},{box:[.12,1.6,.08],at:[-.58,1.6,.85],c:'label'}
]);
export const hoop = def('exercise-hoop','A coral exercise hoop',{plastic:'orange'},[{torus:[1.5,.07,1.5],at:[0,.04,0],c:'plastic',seg:16}]);
export const coconut = def('flying-coconut','A faceted coconut with three eyes',{shell:'orange',eye:'plum'},[{ball:[.36,.36,.36],at:[0,.18,0],c:'shell',seg:8},...[-.07,.07].map(x=>({box:[.06,.06,.03],at:[x,.21,.17],c:'eye'})),{box:[.06,.06,.03],at:[0,.12,.17],c:'eye'}]);
export const flip = def('flying-flip-flop','Footwear with no respect for personal space',{sole:'plum',strap:'sky'},[{box:[.24,.08,.48],at:[0,.04,0],c:'sole'},{tube:[[-.1,.09,0],[0,.19,.16],[.1,.09,0]],r:.04,c:'strap',seg:4}]);
export const pineapple = def('golden-pineapple','A golden pineapple with a stiff green crown',{fruit:'sand',leaf:'teal'},[{ball:[.38,.52,.38],at:[0,.26,0],c:'fruit',seg:8},{cone:[.35,.32,.35],at:[0,.64,0],c:'leaf',seg:5}]);
export const kevin = def('kevin','Kevin the seagull, a member of staff',{feather:'white',wing:'mist',beak:'orange',eye:'ink'},[
 {ball:[.45,.3,.6],at:[0,.32,0],c:'feather',seg:8},{ball:[.26,.27,.26],at:[0,.52,.22],c:'feather',seg:8},{cone:[.14,.26,.14],at:[0,.48,.43],rot:[90,0,0],c:'beak',seg:4},...[-1,1].flatMap(s=>[{box:[.035,.055,.03],at:[s*.11,.56,.3],c:'eye'},{group:[{ball:[.45,.09,.4],at:[s*.18,0,0],c:'wing',seg:6}],at:[s*.17,.37,0],name:s>0?'wingR':'wingL',pivot:true},{box:[.07,.16,.16],at:[s*.11,.1,.1],c:'beak'}])
]);
export const hammock = def('tare-hammock','A striped hammock between two short supports',{post:'orange',cloth:'sky',stripe:'white'},[
 ...[-1.8,1.8].map(x=>({cyl:[.16,1.6,.16],at:[x,.8,0],c:'post',seg:6})),{tube:[[-1.8,1.5,0],[-1,.8,0],[0,.65,0],[1,.8,0],[1.8,1.5,0]],r:.42,c:'cloth',seg:6}, ...[-.7,0,.7].map(x=>({box:[.09,.08,.78],at:[x,.8-Math.abs(x)*.02,0],c:'stripe'}))
]);
export const locker = def('tare-lockers','Three sky-blue lockers with vent slits',{body:'sky',edge:'white',detail:'teal'},[
 {box:[2.6,2.25,.85],at:[0,1.125,0],c:'edge'},...[-.83,0,.83].flatMap(x=>[{box:[.76,2.05,.08],at:[x,1.12,.46],c:'body'},...[1.65,1.78,1.91].map(y=>({box:[.42,.06,.035],at:[x,y,.52],c:'detail'})),{box:[.07,.21,.06],at:[x+.23,1.05,.53],c:'detail'}])
]);
export const ferry = def('tare-ferry','A small white and teal arrival ferry',{hull:'white',trim:'teal',window:'sky',stack:'orange'},[
 {ball:[4,1,6],at:[0,.5,0],c:'hull',seg:8},{box:[3.3,.25,5.3],at:[0,.97,0],c:'trim'},{box:[2.5,1.5,2.6],at:[0,1.8,-.5],c:'hull'},...[-1,0,1].map(x=>({box:[.6,.55,.06],at:[x,2,-1.83],c:'window'})),{cyl:[.6,1.1,.6],at:[0,3,-.9],c:'stack',seg:6}
]);
export const scooter = def('coach-scooter','Coach Plumb\'s small white mobility scooter',{body:'white',tyre:'slate',seat:'teal'},[
 {box:[.7,.3,1.3],at:[0,.35,0],c:'body'},...[-.4,.4].flatMap(x=>[-.4,.4].map(z=>({cyl:[.32,.14,.32],at:[x,.18,z],rot:[0,0,90],c:'tyre',seg:8}))),{box:[.6,.1,.5],at:[0,.7,-.25],c:'seat'},{box:[.6,.45,.1],at:[0,.95,-.48],c:'seat'},{box:[.06,.6,.06],at:[0,.8,.45],c:'body'},{box:[.6,.07,.07],at:[0,1.12,.45],c:'tyre'}
]);
export const catapult = def('dennis-catapult','Dennis runs this apparatus without certification',{wood:'orange',brace:'plum',bowl:'sand'},[
 {box:[1.3,.18,1.5],at:[0,.2,0],c:'wood'},...[-.5,.5].map(x=>({box:[.16,1.5,.16],at:[x,.9,0],c:'brace'})),{box:[1.2,.15,.15],at:[0,1.5,0],c:'wood'},{box:[.16,.16,2],at:[0,1.55,.1],rot:[-25,0,0],c:'wood'},{ball:[.5,.2,.5],at:[0,1.98,1],c:'bowl',seg:8}
]);
export const stepPlatform = def('step-platform','A low aerobic step with two white endcaps',{body:'teal',trim:'white'},[{box:[1.4,.22,.85],at:[0,.11,0],c:'body'},...[-.58,.58].map(x=>({box:[.18,.06,.85],at:[x,.25,0],c:'trim'}))]);
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(),ounce,palm,pavilion,kettlebell,roller,dumbbell,mat,jar,hoop,coconut,flip,pineapple,kevin,hammock,locker,ferry,scooter,catapult,stepPlatform]);
export const OWN_MODELS = [ounce,palm,pavilion,kettlebell,roller,dumbbell,mat,jar,hoop,coconut,flip,pineapple,kevin,hammock,locker,ferry,scooter,catapult,stepPlatform];
