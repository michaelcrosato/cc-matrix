from playwright.sync_api import sync_playwright
import pathlib,json
root=pathlib.Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=browser.new_page(viewport={'width':1920,'height':1080});errors=[];warnings=[]
 page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR:',str(e),flush=True)));page.on('console',lambda m:warnings.append(m.text) if m.type in ['warning','error'] else None)
 url=(root.parent/(root.name+'.html')).as_uri()+'?webgl=1';page.goto(url);page.wait_for_function('window.__hockey?.frames>8',timeout=45000)
 page.evaluate('__hockey.setIdle(0)');page.screenshot(path=str(root/'scene-dev/final-title.png'))
 page.click('[data-action="quick"]');page.click('[data-action="startQuick"]');page.wait_for_timeout(4000)
 page.screenshot(path=str(root/'scene-dev/final-play.png'))
 print(json.dumps({'title':page.title(),'backend':page.evaluate('__hockey.backend'),'view':page.evaluate('__hockey.view'),'errors':errors,'warnings':warnings[:20],'renderInfo':page.evaluate('({calls:__hockey.art.renderer.info.render.calls,geometries:__hockey.art.renderer.info.memory.geometries,textures:__hockey.art.renderer.info.memory.textures})')}))
 # Simulate a goal to view celebration and check overlays without waiting for an AI goal.
 page.evaluate('__hockey.game.phase="play";__hockey.game.score(0)');page.wait_for_timeout(300);page.screenshot(path=str(root/'scene-dev/final-goal.png'))
 browser.close()
