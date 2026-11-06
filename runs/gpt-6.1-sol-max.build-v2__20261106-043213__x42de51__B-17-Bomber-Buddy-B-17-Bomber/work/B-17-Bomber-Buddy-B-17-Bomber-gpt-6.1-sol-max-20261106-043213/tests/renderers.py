from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
reports=[]
with sync_playwright() as pw:
    for name,browser_type,args,profile in [
        ('Chromium WebGPU',pw.chromium,['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'],{'viewport':{'width':1280,'height':720}}),
        ('WebKit WebGL 2 tablet',pw.webkit,[],pw.devices['iPad (gen 7)']),
        ('Firefox unsupported-renderer message',pw.firefox,[],{'viewport':{'width':1280,'height':720}})
    ]:
        browser=None
        try:
            browser=browser_type.launch(headless=True,args=args)
            context=browser.new_context(**profile)
            page=context.new_page()
            page.goto((ROOT/'game.html').as_uri()+('' if 'WebGPU' in name else '?backend=webgl'))
            page.wait_for_function('window.Bomber?.ready||document.querySelector("#loading h1")?.textContent==="AIRFIELD CLOSED"',timeout=60000)
            ready=page.evaluate('!!window.Bomber?.ready')
            if 'Firefox' in name:
                assert ready or 'WebGL 2 or WebGPU' in page.locator('#load-status').inner_text()
                result={'message':page.locator('#load-status').all_text_contents()}
            else:
                assert ready,'Renderer initialization failed: '+str(page.locator('#load-status').all_text_contents())
                page.evaluate('__game.stop();Bomber.startSortie("bombing");__game.advance(1,{draw:true})')
                result=page.evaluate('({backend:My3D2dge.World3D.backend,errors:__game.errors,time:Bomber.sim.time,camera:Bomber.view.world.camera.pose})')
                assert not result['errors'],str(result['errors'])
                assert result['time']>.8
                if 'WebGPU' in name:
                    assert result['backend']=='WebGPU',str(result)
                page.screenshot(path=str(ROOT/'docs'/('webkit-tablet.png' if 'WebKit' in name else 'webgpu.png')))
            reports.append({'name':name,'pass':True,'result':result})
        except Exception as e:
            reports.append({'name':name,'pass':False,'error':str(e)})
            print('FAIL '+name+': '+str(e))
        finally:
            if browser:browser.close()
(ROOT/'docs'/'renderer-verification.json').write_text(json.dumps(reports,indent=2))
failed=sum(not q['pass'] for q in reports)
print(f'{len(reports)-failed}/{len(reports)} renderer checks passed; {failed} failures')
raise SystemExit(bool(failed))
