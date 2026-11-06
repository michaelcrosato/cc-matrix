from playwright.sync_api import sync_playwright
from pathlib import Path
import json,urllib.parse
root=Path(__file__).resolve().parent; info=json.loads((root/'build-info.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page();page.goto('http://127.0.0.1:40835/'+urllib.parse.quote(info['stem']+'.html'));page.wait_for_function('window.__game?.getState().ready',timeout=90000)
 result=page.evaluate('''()=>{const g=window.__game;g.action('start');g.action('pause');g.action('dev:god',true);let trace=[];const pos=()=>g.getState().players[0];function go(name,test,inp,max=600){let n=0;while(!test(pos())&&n++<max)g.step(1,inp);trace.push({name,n,p:pos(),rescued:g.getState().rescued});g.step(1,{});}
 go('walk to ladder',p=>p.x>16.8,{right:true});
 go('descend first',p=>p.y< -11.2,{down:true});
 go('gallery gap',p=>p.x>23.5,{right:true});
 go('jump gap',p=>p.x>31.8,{right:true,jump:true});
 go('rescue pip',p=>p.x>44,{right:true});
 go('next ladder',p=>p.x>46.8,{right:true});
 go('descend river',p=>p.y< -26.1,{down:true});
 go('enter river',p=>p.x>53,{right:true});
 go('dive',p=>p.y< -34,{down:true});
 go('rescue nibs',p=>p.x>73,{right:true});
 go('surface',p=>p.y> -27.5,{up:true});
 go('far bank',p=>p.x>81,{right:true,up:true,jump:true});
 go('balloon dock',p=>p.x>85.5,{right:true});
 go('catch balloon',p=>p.balloon,{up:true},1200);
 go('ride balloon',p=>p.y> -2,{up:true},1200);
 go('dismount left',p=>p.x<82,{left:true,jump:true},200);
 go('professor',p=>p.x<65,{left:true},300);
 go('first stair',p=>p.x<62.7,{left:true,jump:true},150);
 go('second stair',p=>p.x<60,{left:true,jump:true},150);
 go('third stair',p=>p.x<57.5,{left:true,jump:true},150);
 go('ridge',p=>p.x<54.5,{left:true,jump:true},150);
 go('return camp',p=>p.x<10,{left:true},600);
 return {trace,state:g.getState()};}''')
 (root/'route-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
 b.close()
