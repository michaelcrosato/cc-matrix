# Shared by the Playwright suites.
import os, json, sys, time
from playwright.sync_api import sync_playwright
HTML=os.path.abspath('../GrandpaTurismo-GranTurismo3ASpec-claude-opus-5-5-medium-20261105-171907.html')
FL=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
PAD_STUB="""
window.__pads=[null,null];
window.__mkPad=(i)=>({index:i,id:'stub',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false})),timestamp:0});
window.__press=(i,b,v=1)=>{const p=window.__pads[i];p.buttons[b].value=v;p.buttons[b].pressed=v>0.5;};
navigator.getGamepads=()=>window.__pads;
"""
class T:
    def __init__(s): s.p=0; s.f=0
    def ok(s,c,name,extra=''):
        if c: s.p+=1
        else:
            s.f+=1; print('FAIL',name,str(extra)[:400])
        return bool(c)
    def done(s):
        print(f'__COUNT {s.p} {s.f}'); sys.exit(0)
def open_page(browser, q='', init=None, ctx_opts=None, errs=None):
    ctx=browser.new_context(**(ctx_opts or {'viewport':{'width':960,'height':540}}))
    pg=ctx.new_page()
    errs=errs if errs is not None else []
    pg.on('console',lambda m: errs.append(m.text[:300]) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)[:400]))
    if init: pg.add_init_script(init)
    pg.goto('file://'+HTML+('?'+q if q else ''))
    pg.wait_for_function('window.__GAME__!==undefined',timeout=60000)
    return pg,ctx,errs
def st(pg): return pg.evaluate('window.__GAME__.state()')
def wait(pg,expr,ms=20000):
    pg.wait_for_function(expr,timeout=ms)
def screen_is(pg,name,ms=20000): wait(pg,f"window.__GAME__.state().screen==='{name}'&&!window.__GAME__.state().loading",ms)
