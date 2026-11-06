#!/usr/bin/env python3
# Chromium on file:// the built HTML. Prints only failures and a count.
import sys, os, glob, json, time
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); url='file://'+html
fails=[];n=0
def ok(name,v,info=''):
    global n; n+=1
    if not v: fails.append(f'{name} {info}')
PAD="""(()=>{const b=()=>({pressed:false,touched:false,value:0});window.__pad={id:'Stub DualSense',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:18},b),vibrationActuator:{playEffect:()=>Promise.resolve('complete')}};window.__padOn=false;const g=navigator.getGamepads.bind(navigator);navigator.getGamepads=()=>window.__padOn?[window.__pad,null,null,null]:[null,null,null,null];})();"""
READY="window.__GAME__ && window.__PIXEL_READY__"
def boot(ctx,errs,pad=False):
    pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.on('console',lambda m:errs.append('console '+m.text[:300]) if m.type=='error' else None)
    if pad: pg.add_init_script(PAD)
    pg.goto(url); pg.wait_for_function(READY,timeout=90000); pg.evaluate('window.__PIXEL_READY__.then(()=>1)')
    return pg
S=lambda pg,n=2: pg.evaluate(f'window.__PIXEL_ENGINE__.step({n})')
M=lambda pg: pg.evaluate('window.__GAME__.ui.model()')
GS=lambda pg,e: pg.evaluate('(()=>{const G=window.__GAME__.G;const w=G.world;return '+e+'})()')
def key(pg,k,frames=6):
    pg.keyboard.press(k); S(pg,frames)
def padpress(pg,i,frames=6):
    pg.evaluate(f'window.__padOn=true;window.__pad.buttons[{i}].pressed=true;window.__pad.buttons[{i}].value=1'); S(pg,3)
    pg.evaluate(f'window.__pad.buttons[{i}].pressed=false;window.__pad.buttons[{i}].value=0'); S(pg,frames)
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS)
    # --- Boot, engine bytes, audio default
    errs=[]; ctx=b.new_context(viewport={'width':960,'height':540}); pg=boot(ctx,errs,pad=True)
    S(pg,10); ok('title up',M(pg)['screen']=='title',M(pg))
    src=open(os.path.join(root,'kit','pixel-engine.js'),encoding='utf8').read()
    ok('engine unchanged in the page',pg.evaluate("document.getElementById('pixel-engine-src').textContent")==src)
    ok('single file: no external scripts',pg.evaluate("[...document.scripts].every(s=>!s.src)"))
    ok('music 10% on a fresh profile',abs(pg.evaluate('window.__PIXEL_ENGINE__.audio.volume.music')-0.1)<1e-6,pg.evaluate('window.__PIXEL_ENGINE__.audio.volume.music'))
    ok('no continue on a fresh profile',not any('Continue'==x for x in M(pg)['items']))
    ok('all title items',M(pg)['items']==['New Arrival','Visit','Settings','About'],M(pg))
    # --- Settings reset restores 10%
    pg.evaluate("window.__GAME__.G.ctx.audio.setVolume('music',0.7)")
    key(pg,'ArrowDown');key(pg,'ArrowDown');ok('kb nav moves focus',M(pg)['focus']=='Settings',M(pg));key(pg,'Enter');ok('settings opens',M(pg)['screen']=='settings',M(pg))
    its=M(pg)['items']; ok('settings has all items',all(x in its for x in ['Music','Effects','Voices','Voice style','Text speed','Controller glyphs','Rumble','Camera shake','Clock','Fullscreen','Picture: pixel size','Picture: quality','Reset to defaults']),its)
    for i in range(its.index('Reset to defaults')): key(pg,'ArrowDown',3)
    ok('focus reset',M(pg)['focus']=='Reset to defaults',M(pg)); key(pg,'Enter')
    ok('Settings Reset restores 10%',abs(pg.evaluate('window.__PIXEL_ENGINE__.audio.volume.music')-0.1)<1e-6,pg.evaluate('window.__PIXEL_ENGINE__.audio.volume.music'))
    key(pg,'Escape'); ok('back to title',M(pg)['screen']=='title',M(pg))
    # --- Prompts follow the last device; Xbox option
    ok('kb glyph',pg.evaluate("window.__GAME__.UI.ctrl.device")=='kb')
    padpress(pg,13); ok('pad makes the last device pad',pg.evaluate("window.__GAME__.UI.ctrl.device")=='pad',pg.evaluate("window.__GAME__.UI.ctrl.device"))
    pg.mouse.move(400,300); S(pg,3); pg.mouse.move(480,300); S(pg,3); ok('mouse moves cursor',pg.evaluate("window.__GAME__.UI.ctrl.mouseVisible")==True); key(pg,'ArrowDown',3); ok('key after mouse',pg.evaluate("window.__GAME__.UI.ctrl.device")=='kb')
    # --- Mouse: hover moves focus, click activates
    pg.evaluate("window.__GAME__.G.ctrl.mouseVisible=false"); h=pg.evaluate("window.__GAME__.UI.hits.filter(x=>typeof x.id==='number').map(x=>[x.id,x.x,x.y,x.w,x.h])")
    if h:
        cell=h[-1]; sc=960/480; pg.mouse.move((cell[1]+20)*sc,(cell[2]+6)*sc); S(pg,3); ok('hover moves focus',M(pg)['focus']=='About',M(pg)); pg.mouse.down(); S(pg,2); pg.mouse.up(); S(pg,4); ok('click activates',M(pg)['screen']=='about',M(pg))
        about=M(pg)['items']; ok('about pages',all(x in about for x in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback','Cast','Licences']),about)
        texts=pg.evaluate("window.__GAME__.UI.top.content().map(l=>l.t).join(' | ')")
        for fld in ['Date','Source','Plan','Genre and Perspective','Tech','Art Direction','Animation','Audio','Online','Testing','Research','Environment','Model','Usage','added on import','Animal Crossing: City Folk']: ok('about has '+fld,fld in texts)
        key(pg,'Escape')
    # --- Attract at 10 s; a key, a button, a mouse move each exit it; save untouched
    pg.evaluate("localStorage.setItem('sillyfolk:probe','x')"); before=pg.evaluate("localStorage.getItem('sillyfolk:save')")
    def to_attract():
        S(pg,3); pg.evaluate('window.__GAME__.game.idle=0'); S(pg,300); ok('no attract before 10s',GS(pg,'G.mode')=='title',GS(pg,'G.mode')); S(pg,330); ok('attract after 10s',GS(pg,'G.mode')=='attract',GS(pg,'G.mode'))
    to_attract(); S(pg,120); key(pg,'KeyK',3); ok('a key exits attract',GS(pg,'G.mode')=='title',GS(pg,'G.mode'))
    to_attract(); S(pg,60); padpress(pg,1,3); ok('a pad button exits attract',GS(pg,'G.mode')=='title',GS(pg,'G.mode')); pg.evaluate('window.__padOn=false')
    to_attract(); S(pg,60); pg.mouse.move(300,200); S(pg,2); pg.mouse.move(340,240); S(pg,3); ok('a mouse move exits attract',GS(pg,'G.mode')=='title',GS(pg,'G.mode'))
    ok('player save untouched',pg.evaluate("localStorage.getItem('sillyfolk:save')")==before)
    # Attract keeps looping without errors
    S(pg,3); pg.evaluate('window.__GAME__.game.idle=0'); S(pg,620); places=set()
    for i in range(70):
        S(pg,240); places.add(GS(pg,'w.p.place'))
    ok('attract tours places',{'town','store','home','museum','city','salon','auction'}<=places or len(places)>=5,places); ok('attract no game errors',pg.evaluate('window.__PIXEL_ENGINE__.errors.length')==0,pg.evaluate('window.__PIXEL_ENGINE__.errors'))
    key(pg,'KeyK',4)
    # --- Pad drives title → play → pause
    pg.evaluate('window.__padOn=true'); S(pg,3); padpress(pg,13); padpress(pg,12); ok('pad focus on New Arrival',M(pg)['focus']=='New Arrival',M(pg)); padpress(pg,0); ok('clock choice',M(pg)['screen']=='clockChoice',M(pg)); padpress(pg,0,3); S(pg,60)
    ok('play mode',GS(pg,'G.mode')=='play',GS(pg,'G.mode'))
    guard=0
    while GS(pg,'!!window.__GAME__.Script.active') and guard<500:
        guard+=1; m=M(pg)
        if m['screen']=='keyboard':
            pg.evaluate("(()=>{const t=window.__GAME__.UI.top;t.text='Pad';t.finish()})()"); S(pg,4)
        elif m['screen'] is None: S(pg,6)
        else: padpress(pg,0,2)
    S(pg,30); ok('intro ends in the village',GS(pg,'w.name')=='Pad' and GS(pg,'w.p.debt')==8000,[GS(pg,'w.name'),GS(pg,'w.p.debt')])
    padpress(pg,9); ok('Options pauses',M(pg)['screen']=='pause',M(pg)); ok('pause items',M(pg)['items']==['Resume','Map','Almanac','Settings','Save & Quit to Title','About','Dev Mode'],M(pg))
    glyph=GS(pg,'window.__GAME__.UI.top.prompts?.[0]?.[0]'); ok('pause prompts present',glyph=='confirm',glyph)
    # --- Xbox glyph option
    ok('ps by default',GS(pg,'window.__GAME__.UI.xbox')==False); pg.evaluate("(()=>{const T=window.__GAME__.G;})()")
    # --- Dev mode: slider changes behaviour; Reset All restores
    for i in range(6): padpress(pg,13,2)
    ok('focus Dev Mode',M(pg)['focus']=='Dev Mode',M(pg)); padpress(pg,0); ok('dev opens',M(pg)['screen']=='dev',M(pg)); ok('dev pages',M(pg)['items']==['Time','World','Player','Neighbours','Events','Collections','Debug','Save','Balance'],M(pg))
    for i in range(8): padpress(pg,13,2)
    padpress(pg,0); ok('balance page',M(pg)['screen']=='dev-Balance',M(pg)); its=M(pg)['items']; ok('sliders present',all(x in its for x in ['Reset All','Game minutes per real second','Camera zoom','Bite window (s)','Hybrid chance','Text speed (chars/s)']),its)
    v0=pg.evaluate('window.__GAME__.tuning.run'); idx=its.index('Run speed (m/s)')
    for i in range(idx): padpress(pg,13,2)
    ok('focus run slider',M(pg)['focus']=='Run speed (m/s)',M(pg)); padpress(pg,15,2);padpress(pg,15,2); v1=pg.evaluate('window.__GAME__.tuning.run'); ok('slider moves live',v1>v0,[v0,v1])
    # behaviour: faster run covers more ground
    pg.evaluate("window.__GAME__.G.UI_saved=1")
    for i in range(idx): padpress(pg,12,2)
    ok('focus reset all',M(pg)['focus']=='Reset All',M(pg)); padpress(pg,0,3); ok('Reset All restores',pg.evaluate('window.__GAME__.tuning.run')==v0,pg.evaluate('window.__GAME__.tuning.run'))
    pg.evaluate("window.__GAME__.UI.clear()"); pg.evaluate('window.__padOn=false'); key(pg,'KeyW',3)
    # Behaviour test for slider
    def runDist(speed):
        pg.evaluate(f"window.__GAME__.tuning.run={speed}"); pg.evaluate("window.__GAME__.actions.teleport(30,30)")
        pg.evaluate("(()=>{const i=window.__PIXEL_ENGINE__.input;i.setKey('KeyD',true);i.setKey('ShiftLeft',true)})()"); S(pg,60); pg.evaluate("(()=>{const i=window.__PIXEL_ENGINE__.input;i.setKey('KeyD',false);i.setKey('ShiftLeft',false)})()"); return GS(pg,'Math.hypot(w.p.x-30,w.p.z-30)')
    d6=runDist(6); d12=runDist(12); ok('run slider changes behaviour',d12>d6*1.5,[d6,d12]); pg.evaluate("window.__GAME__.tuning.run=6")
    # --- Keyboard and mouse play the same game
    pg.evaluate("window.__GAME__.actions.teleport(30,30)"); S(pg,4); x0=GS(pg,'w.p.x'); key(pg,'KeyD',20); pg.keyboard.down('KeyD'); S(pg,30); pg.keyboard.up('KeyD'); S(pg,2); ok('WASD moves',GS(pg,'w.p.x')!=x0 or GS(pg,'w.p.z')!=30)
    pos=GS(pg,'[w.p.x,w.p.z]'); pg.mouse.move(700,300); S(pg,3); pg.mouse.down(); S(pg,3); pg.mouse.up(); S(pg,60); ok('click to walk',GS(pg,'Math.hypot(w.p.x-%f,w.p.z-%f)'%(pos[0],pos[1]))>0.5,GS(pg,'[w.p.x,w.p.z]'))
    key(pg,'Tab'); ok('Tab opens Pockets',M(pg)['screen']=='pockets',M(pg)); key(pg,'Tab'); ok('Tab closes',M(pg)['screen'] is None,M(pg)); key(pg,'KeyM'); ok('M opens map',M(pg)['screen']=='map',M(pg)); key(pg,'Escape'); key(pg,'KeyJ'); ok('J opens Almanac',M(pg)['screen']=='almanac',M(pg)); key(pg,'Escape'); key(pg,'KeyG'); ok('G opens emotes',M(pg)['screen']=='emotes',M(pg)); key(pg,'Escape'); key(pg,'Escape'); ok('Esc pauses',M(pg)['screen']=='pause',M(pg))
    # Dev tools that do real work: free camera moves the view, not you; a recording replays
    pg.evaluate("window.__GAME__.UI.clear();window.__GAME__.G.freeCam=true"); S(pg,3); p0=GS(pg,'[w.p.x,w.p.z]'); pg.evaluate("window.__PIXEL_ENGINE__.input.setKey('KeyD',true)"); S(pg,40); pg.evaluate("window.__PIXEL_ENGINE__.input.setKey('KeyD',false)"); S(pg,2); ok('free camera moves the view',GS(pg,'G.freeFocus && Math.hypot(G.freeFocus[0]-w.p.x,G.freeFocus[1]-w.p.z)>2')==True); ok('free camera leaves you',GS(pg,'[w.p.x,w.p.z]')==p0); pg.evaluate("window.__GAME__.G.freeCam=false"); S(pg,2)
    keep=pg.evaluate("localStorage.getItem('sillyfolk:save')"); r0=pg.evaluate("(async()=>{const G=window.__GAME__.G;const r=window.__PIXEL_ENGINE__.recording();r.frames=r.frames.slice(0,120);await G.replayRecording(r);return window.__PIXEL_ENGINE__.errors.length})()"); ok('recording replays',r0==0,r0); ok('replay leaves the save',pg.evaluate("localStorage.getItem('sillyfolk:save')")==keep); pg.wait_for_function('window.__GAME__&&window.__GAME__.G.mode',timeout=30000); pg.evaluate('window.__PIXEL_ENGINE__.manual=true'); pg.evaluate("window.__GAME__.actions.newGame({skipIntro:true,instant:true,seed:'after',name:'B',town:'C'})"); S(pg,5); pg.evaluate("window.__GAME__.G.ctrl.mouseVisible=false"); key(pg,'Escape'); ok('pause after replay',M(pg)['screen']=='pause',M(pg))
    # Glyphs: Xbox setting via settings menu
    # Glyphs by real device and the real Settings item
    pg.evaluate("window.__padOn=true"); padpress(pg,4,3); S(pg,2); ok('PlayStation glyphs on a pad',GS(pg,'G.promptSig()')=='ps',GS(pg,'G.promptSig()'))
    key_items=M(pg)['items']; pg.evaluate("window.__GAME__.UI.push(window.__GAME__.G.settingsS())"); S(pg,3); its=M(pg)['items']
    for i in range(its.index('Controller glyphs')): padpress(pg,13,2)
    ok('focus glyph setting',M(pg)['focus']=='Controller glyphs',M(pg)); padpress(pg,15,3); ok('Xbox glyphs from Settings',GS(pg,'G.promptSig()')=='xbox',GS(pg,'G.promptSig()')); ok('setting saved',json.loads(pg.evaluate("localStorage.getItem('sillyfolk:settings')"))['xbox']==True); padpress(pg,14,3); ok('back to PlayStation',GS(pg,'G.promptSig()')=='ps'); padpress(pg,1,3); pg.evaluate("window.__padOn=false"); key(pg,'KeyK',3); ok('keys after pad',GS(pg,'G.promptSig()')=='kb',GS(pg,'G.promptSig()'))
    # Mouse: the HUD icons open their screens
    pg.evaluate("window.__GAME__.UI.clear()"); pg.mouse.move(100,100); S(pg,2); pg.mouse.move(120,120); S(pg,3); rects=pg.evaluate("window.__GAME__.game.iconRects")
    ok('mouse icons shown',[r['id'] for r in rects]==['pockets','map','almanac','emotes'],rects)
    for r in rects:
        pg.mouse.move((r['x']+4)*2,(r['y']+6)*2); S(pg,3); pg.mouse.down(); S(pg,2); pg.mouse.up(); S(pg,3); ok('click opens '+r['id'],M(pg)['screen']==r['id'],M(pg)); pg.evaluate("window.__GAME__.UI.clear()"); S(pg,3)
    pg.evaluate("window.__GAME__.G.ctrl.mouseVisible=false"); key(pg,'Escape')
    # Save & Quit, Continue appears
    pg.evaluate("window.__GAME__.G.saveAndQuit()"); S(pg,10); ok('quit to title',M(pg)['screen']=='title',M(pg)); ok('Continue appears',M(pg)['items'][0]=='Continue',M(pg)); ok('clean exit flag',pg.evaluate("localStorage.getItem('sillyfolk:session')")=='clean')
    # --- Audio: analyser on the master shows music and voices above silence
    pg.evaluate('window.__PIXEL_ENGINE__.manual=false'); pg.keyboard.press('KeyK'); pg.wait_for_timeout(1500)
    pg.evaluate("""()=>{const a=window.__PIXEL_ENGINE__.audio;const an=a.context.createAnalyser();an.fftSize=2048;(a.master||a.output).connect(an);window.__an=an;}""")
    def rms():
        return pg.evaluate("""async()=>{let best=0;for(let k=0;k<25;k++){const d=new Float32Array(window.__an.fftSize);window.__an.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;best=Math.max(best,Math.sqrt(s/d.length));await new Promise(r=>setTimeout(r,120));}return best}""")
    r=rms(); ok('music audible on master',r>0.001,r)
    pg.evaluate("window.__PIXEL_ENGINE__.audio.setVolume('music',0)"); pg.evaluate("window.__GAME__.actions.newGame({skipIntro:true,instant:true,seed:'aud',name:'A',town:'B'})"); pg.wait_for_timeout(1500); c0=pg.evaluate("Object.keys(window.__PIXEL_ENGINE__.audio.counts).filter(k=>k.startsWith('v')).length"); pg.evaluate("window.__GAME__.actions.talk('dorrit')"); r=rms(); ok('voices audible on master',r>0.001,r); c1=pg.evaluate("Object.keys(window.__PIXEL_ENGINE__.audio.counts).filter(k=>/^v\\d_/.test(k)).length"); ok('syllables played',c1>0,c1)
    pg.evaluate("window.__GAME__.UI.clear();window.__GAME__.Script.clear()")
    ok('no page errors',len(errs)==0,errs[:4]); ok('no engine errors',pg.evaluate('window.__PIXEL_ENGINE__.errors.length')==0,pg.evaluate('window.__PIXEL_ENGINE__.errors')); ctx.close()
    # --- Touch-only profiles
    for name in ['Pixel 7','iPad Pro 11']:
        errs=[]; d=dict(p.devices[name]); ctx=b.new_context(**{k:v for k,v in d.items() if k not in('default_browser_type',)}); pg=boot(ctx,errs); S(pg,8)
        ok(name+': touch-only detected',GS(pg,'G.touchOnly')==True,GS(pg,'G.touchOnly')); ok(name+': no touch controls',pg.evaluate('window.__PIXEL_ENGINE__.touch==null'))
        gear=pg.evaluate("[...document.querySelectorAll('button,[role=button],div')].some(e=>(e.textContent||'').trim()==='⚙')"); ok(name+': gear shows',gear)
        pg.evaluate('window.__PIXEL_ENGINE__.manual=false'); pg.wait_for_timeout(300)
        box=pg.evaluate("(()=>{const e=[...document.querySelectorAll('button,[role=button],div')].filter(e=>(e.textContent||'').trim()==='⚙').pop();const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()"); pg.touchscreen.tap(box[0],box[1]); pg.wait_for_timeout(500); ok(name+': tap opens settings',pg.evaluate('window.__PIXEL_ENGINE__.settings.isOpen')==True); pg.evaluate('window.__PIXEL_ENGINE__.settings.close()')
        pg.evaluate('window.__GAME__.game.idle=0'); S(pg,640); ok(name+': attract runs',GS(pg,'G.mode')=='attract',GS(pg,'G.mode')); S(pg,120); pg.evaluate('window.__PIXEL_ENGINE__.manual=false'); pg.touchscreen.tap(100,100); pg.wait_for_timeout(600); ok(name+': tap exits attract',GS(pg,'G.mode')=='title',GS(pg,'G.mode'))
        pg.evaluate('window.__PIXEL_ENGINE__.settings.close()'); pg.keyboard.press('KeyK'); pg.wait_for_timeout(300); ok(name+': key clears notice',GS(pg,'G.touchCleared')==True,GS(pg,'G.touchCleared')); ok(name+': no page errors',len(errs)==0,errs[:3]); ctx.close()
    b.close()
    # --- WebKit: friendly no-WebGPU message
    wk=p.webkit.launch(); pg=wk.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200])); pg.goto(url); pg.wait_for_timeout(6000); txt=pg.evaluate('document.body.innerText'); hasGPU=pg.evaluate('!!navigator.gpu')
    if not hasGPU: ok('webkit friendly message','WebGPU' in txt,txt[:200]); ok('webkit no uncaught error',len(errs)==0,errs[:3])
    wk.close()
for f in fails[:50]: print('browser FAIL',f)
print(f'browser: {n-len(fails)}/{n} passed'); sys.exit(1 if fails else 0)
