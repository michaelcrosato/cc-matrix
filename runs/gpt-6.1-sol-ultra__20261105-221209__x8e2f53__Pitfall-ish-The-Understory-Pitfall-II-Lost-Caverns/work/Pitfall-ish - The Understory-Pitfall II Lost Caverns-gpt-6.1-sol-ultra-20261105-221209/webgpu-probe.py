from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import quote
import argparse,json,time

folder=Path(__file__).resolve().parent
info=json.loads((folder/'build-info.json').read_text())
parser=argparse.ArgumentParser();parser.add_argument('variant',choices=['baseline','angle','vulkan','xvfb','webgl','dawn','full','bare','mesa','retain']);args=parser.parse_args()
flags={
 'baseline':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'],
 'angle':['--enable-unsafe-webgpu','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader'],
 'vulkan':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-vulkan-surface','--disable-gpu-sandbox'],
 'xvfb':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'],
 'webgl':['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
 'retain':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'],
 'full':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'],
 'bare':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'],
 'mesa':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=vulkan','--ignore-gpu-blocklist'],
 'dawn':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--enable-dawn-features=allow_unsafe_apis','--disable-gpu-sandbox'],
}[args.variant]
url='http://127.0.0.1:40835/'+quote(info['stem']+'.html')
logs=[];result={'variant':args.variant}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=args.variant!='xvfb',args=flags,channel='chromium' if args.variant=='full' else None)
 page=browser.new_page(viewport={'width':1280,'height':720})
 page.on('console',lambda m: logs.append(m.type+': '+m.text[:700]) if m.type in ['error','warning'] else None)
 page.on('pageerror',lambda e: logs.append('pageerror: '+str(e)[:700]))
 page.add_init_script('''(() => {
 window.__gpuDiag={supported:!!navigator.gpu,errors:[],lost:null};
 if(navigator.gpu){const request=navigator.gpu.requestAdapter.bind(navigator.gpu);navigator.gpu.requestAdapter=async(...a)=>{const ad=await request(...a);if(!ad)return ad;window.__gpuDiag.adapter={vendor:ad.info?.vendor,device:ad.info?.device,description:ad.info?.description};const rd=ad.requestDevice.bind(ad);ad.requestDevice=async(...a)=>{const d=await rd(...a);window.__gpuDevice=d;d.addEventListener('uncapturederror',e=>window.__gpuDiag.errors.push(e.error.message));d.lost.then(i=>window.__gpuDiag.lost={reason:i.reason,message:i.message});return d;};return ad;};}
})()''')
 if args.variant=='retain':
  page.add_init_script('''(()=>{window.__retainedGPU=navigator.gpu;const r=navigator.gpu.requestAdapter.bind(navigator.gpu);navigator.gpu.requestAdapter=async(...a)=>{const ad=await r(...a);window.__retainedAdapter=ad;return ad;};})()''')
 if args.variant=='bare':
  page.add_init_script('''(()=>{const r=navigator.gpu.requestAdapter.bind(navigator.gpu);navigator.gpu.requestAdapter=async(...a)=>{const ad=await r(...a);if(!ad)return ad;const rd=ad.requestDevice.bind(ad);ad.requestDevice=async(...a)=>rd({...a[0],requiredFeatures:[]});return ad;};})()''')
 if args.variant=='webgl':
  html=(folder.parent/(info['stem']+'.html')).read_text().replace('antialias:!0,alpha:!1','antialias:!0,alpha:!1,forceWebGL:!0')
  page.route('**/*.html',lambda route:route.fulfill(status=200,content_type='text/html',body=html))
 try:
  page.goto(url,wait_until='domcontentloaded',timeout=30000)
  assert page.title()==info['title'],page.title()
  page.wait_for_function('window.__bootError||window.__game?.getState().ready',timeout=90000)
  result['state']=page.evaluate('window.__game?.getState()')
  result['bootError']=page.evaluate('window.__bootError||null')
  if result['state'] and result['state']['ready']:
   page.evaluate('window.__game.action("start")')
   page.wait_for_timeout(3000)
   result['state']=page.evaluate('window.__game?.getState()')
   result['gpu']=page.evaluate('window.__gpuDiag')
   page.screenshot(path=str(folder/('probe-'+args.variant+'.png')))
   result['pngBytes']=(folder/('probe-'+args.variant+'.png')).stat().st_size
  result['logs']=logs
 except Exception as e:
  result['exception']=str(e)
  result['logs']=logs
  result['gpu']=page.evaluate('window.__gpuDiag').copy() if not page.is_closed() else None
 browser.close()
print(json.dumps(result))
