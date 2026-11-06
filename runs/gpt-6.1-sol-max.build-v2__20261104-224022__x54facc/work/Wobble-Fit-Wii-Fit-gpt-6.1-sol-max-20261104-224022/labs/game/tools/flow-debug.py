# @file Focused input-flow diagnosis, independent of visual timing.
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(args=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':720})
 page.add_init_script("window.__pad={id:'DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__pad]")
 page.on('pageerror',lambda e:print('ERROR',e,flush=True))
 page.goto((Path.cwd().parent/'Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html').as_uri())
 page.wait_for_function('__engine.ready',timeout=90000)
 def dump(label): print(label,json.dumps(page.evaluate('({game:__game,heading:document.querySelector("#shell h1")?.innerText,errors:__engine.errors,pads:navigator.getGamepads(),fake:window.__pad,src:navigator.getGamepads.toString()})')),flush=True)
 dump('boot')
 for key in ['Enter','ArrowDown','ArrowDown','Enter','Enter','Escape']:
  page.keyboard.press(key);page.wait_for_timeout(750);dump(key)
 page.evaluate('__pad.buttons[13]={pressed:true,value:1}');page.wait_for_timeout(600);dump('pad')
 b.close()
