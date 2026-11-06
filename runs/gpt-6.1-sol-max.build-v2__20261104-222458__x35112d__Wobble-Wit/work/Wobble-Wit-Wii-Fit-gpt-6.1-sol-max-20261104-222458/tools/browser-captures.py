from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];pagefile=root.parent/'Wobble-Wit-Wii-Fit-gpt-6.1-sol-max-20261104-222458.html';out=root/'out/browser';out.mkdir(exist_ok=True);report=[]
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader'])
 try:
  for name,vp,device in [('phone-small',(375,667),'Pixel 10'),('phone-landscape',(667,375),'Pixel 10'),('tablet',(1024,768),'Galaxy Tab S9'),('laptop',(1366,768),None),('tv',(1920,1080),None),('ultrawide',(2560,1080),None)]:
   if len(sys.argv)>1 and name not in sys.argv[1:]:continue
   opts={k:v for k,v in pw.devices[device].items()if k!='default_browser_type'}if device else{};opts.update(viewport={'width':vp[0],'height':vp[1]},device_scale_factor=1);ctx=b.new_context(**opts);p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(pagefile.as_uri());p.wait_for_function('window.__gameStatus',timeout=120000)
   if not device:p.keyboard.press('z');p.wait_for_function('JSON.parse(__gameStatus).screen==="Title"',timeout=60000)
   else:p.locator('#touch-card').wait_for(state='visible',timeout=30000)
   p.screenshot(path=str(out/f'{name}.png'),timeout=120000,animations='disabled');report.append({'name':name,'viewport':vp,'errors':errors,'overflow':p.evaluate('document.documentElement.scrollWidth>innerWidth+1')});ctx.close();(out/'report.json').write_text(json.dumps(report,indent=2))
 finally:b.close()
(out/'report.json').write_text(json.dumps(report,indent=2));print(f'{len(report)} browser compositions captured')
