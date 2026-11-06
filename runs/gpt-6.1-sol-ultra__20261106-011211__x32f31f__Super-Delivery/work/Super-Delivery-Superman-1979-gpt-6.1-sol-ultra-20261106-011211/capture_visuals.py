"""Capture UI and art through the WebGL stand-in because this host omits WebGPU canvas pixels from screenshots. Real WebGPU is verified separately by engine frame/draw counters."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=False,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--disable-vulkan-surface','--disable-gpu-sandbox','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
 page.add_init_script("Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true})");errors=[];page.on('pageerror',lambda e:(errors.append(str(e)), print('PAGE ERROR',e,flush=True)))
 game=Path.cwd().parent/(Path.cwd().name+'.html')
 page.goto(game.as_uri());page.wait_for_function('window.__gameReady || window.__bootError',timeout=30000);print('BOOT',page.evaluate('window.__bootError || window.__gameReady'),flush=True)
 page.wait_for_timeout(3000);page.screenshot(path='game-title.png')
 page.evaluate('window.__game.start();window.__game.teleport(-22,0,0);window.__game.interact();window.__game.teleport(-22,6,11)')
 page.wait_for_timeout(2200);page.screenshot(path='game-play.png')
 page.evaluate('window.__game.teleport(0,31,15)')
 page.wait_for_timeout(1600);page.screenshot(path='game-bridge.png')
 print(json.dumps({'errors':errors,'engine':page.evaluate('window.__game.engine')}))
 b.close()
