from pathlib import Path
p=Path('labs/game/main.ts');s=p.read_text()
marker='if (info && hub) ownCard();'
head,tail=s.split(marker,1)
view_start=tail.index('    onView: (action) => {')
view_end=tail.index('    onFrame: frame,',view_start)
view=tail[view_start:view_end]
view_func=view.replace('    onView: (action) => {','function viewAction(action:string):void {',1)
view_func=view_func.rsplit('    },',1)[0]+'}\n'
tail=tail[:view_start]+'    onView: options.onView,\n'+tail[view_end:]
tail=tail.replace('onFrame: frame','onFrame: options.frame').replace('    cameraInput,','    cameraInput:options.cameraInput,')
tail=tail.replace('sample: sampleWire','sample: options.sample').replace('  director.last = performance.now();','  options.ready();')
boot='''/** @file Renderer and AI Hub startup. Simulation readiness is reported before GPU warm-up completes. */
import {createEngine,createHeadless,type EngineFrame,type CameraInput} from '../../engine';
import {hub,info,ownCard} from './net/session';
import {world} from './scenes/world';
import {audio} from './sounds/page';
import {startLockstep,result,type Wire} from './net/lockstep';
import type {Context} from './ui/context';
export async function boot(ctx:Context,options:{frame:(f:EngineFrame)=>void;sample:()=>Wire;cameraInput:()=>CameraInput|undefined;onView:(action:string)=>void;ready:()=>void}):Promise<void>{
const search=new URLSearchParams(location.search),store=ctx.store;
let ended=false,netStop:(()=>void)|null=null;
if(info&&hub)ownCard();
'''+tail+'\n}\n'
Path('labs/game/boot.ts').write_text(boot)
head=head.replace("import { hub, info, ownCard } from './net/session';","import { info } from './net/session';\nimport {boot} from './boot';")
head=head.replace('createEngine, createHeadless, createStore,','createStore,')
head=head.replace("const search = new URLSearchParams(location.search),\n  store = createStore",'const store = createStore')
head+=view_func+'\nawait boot(ctx,{frame,sample:sampleWire,cameraInput,onView:viewAction,ready:()=>{director.last=performance.now();}});\n'
p.write_text(head)
css=Path('labs/game/ui/style.css').read_text();parts=[];depth=0;start=0
for i,c in enumerate(css):
 if c=='{':depth+=1
 elif c=='}':
  depth-=1
  if depth==0:parts.append(css[start:i+1]);start=i+1
parts.append(css[start:])
chunks=[];current=''
for block in parts:
 if current.count('\n')+block.count('\n')>290 and current:chunks.append(current);current=''
 current+=block
if current.strip():chunks.append(current)
for i,chunk in enumerate(chunks):Path(f'labs/game/ui/style-{i}.css').write_text(f'/** @file Bar Cry presentation, stylesheet part {i+1}. */\n'+chunk.strip()+'\n')
Path('labs/game/ui/style.css').write_text('/** @file The complete TV-readable game skin. */\n'+''.join(f'@import "./style-{i}.css";\n' for i in range(len(chunks))))
print(len(chunks),'CSS modules')
