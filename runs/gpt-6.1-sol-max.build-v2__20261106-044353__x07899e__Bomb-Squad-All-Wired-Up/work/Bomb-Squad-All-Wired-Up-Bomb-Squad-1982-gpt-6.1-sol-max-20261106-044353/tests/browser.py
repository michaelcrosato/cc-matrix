"""Final-artifact acceptance. UI actions never write authoritative game state."""
import contextlib
import fcntl
import functools
import http.server
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import time
import traceback
import urllib.parse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
RUN=json.loads((ROOT/'run.json').read_text())
ARTIFACT=ROOT.parent/(RUN['slug']+'.html')
GROUPS=set(sys.argv[1:])
RESULT={'passed':0,'failures':[],'observations':{}}


def check(name, fn):
    try:
        detail=fn()
        RESULT['passed']+=1
        if detail is not None: RESULT['observations'][name]=detail
    except Exception:
        RESULT['failures'].append({'name':name,'error':traceback.format_exc()})


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass


@contextlib.contextmanager
def server():
    handler=functools.partial(QuietHandler,directory=str(ROOT.parent))
    srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
    thread=threading.Thread(target=srv.serve_forever,daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{srv.server_address[1]}'
    finally:
        srv.shutdown();srv.server_close();thread.join(timeout=3)


def wait(page,expr,timeout=10000):
    page.wait_for_function(expr,timeout=timeout)


def snap(page): return page.evaluate('__game.debug.snapshot()')
def state(page): return page.evaluate('__wired.state() && __game.debug.snapshot().state')
def clean(page):
    assert page.title()==RUN['title']
    assert page.evaluate('__game.errors')==[]


def new_page(browser,url=None,**kwargs):
    context=browser.new_context(viewport={'width':1920,'height':1080},**kwargs)
    page=context.new_page();page.set_default_timeout(12000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url or ARTIFACT.as_uri());wait(page,'!!window.__wired')
    wait(page,'__wired.ui.screen === "title" || __wired.net.mode === "hub"')
    page._errors=errors
    return context,page


def button(page,name):
    page.get_by_role('button',name=name,exact=True).first.click()
    page.wait_for_timeout(65)


def key(page,k):
    page.keyboard.press(k);page.wait_for_timeout(45)
    if k in ['1','2','3','4'] and page.evaluate('__wired.menuPage')=='board':
        wait(page,f'__wired.tool === {int(k)-1}')
    if page.evaluate('__wired.net.mode')!='solo':wait(page,'__wired.net.pending.size === 0')


def choose_case(page,id):
    button(page,'Case files')
    names={'training':'00 · A little wire practice','waterfront':'01 · The last ferry','relay':'02 · A current affair','central':'03 · The final countdown'}
    # Completed cases gain a checkmark; choose by the stable prefix.
    page.get_by_role('button',name=names[id],exact=False).click()
    button(page,'Start guided repair' if id=='training' else 'Open the device')
    wait(page,'__game.sceneName === "field"')


def open_board(page,board_id):
    s=state(page);b=next(b for b in s['boards'] if b['id']==board_id)
    if page.evaluate('__wired.boardId')==board_id and page.evaluate('__wired.ui.screen') is None:return
    if page.evaluate('__wired.menuPage')!='evidence':key(page,'Tab')
    locator=page.get_by_role('button',name=b['name'],exact=False)
    locator.click();wait(page,'__wired.menuPage === "board"')
    if page.evaluate('__wired.net.mode')!='solo':
        wait(page,f'__wired.currentBoard() && __wired.currentBoard().owner === __wired.net.me')


def point(page,target_id):
    data=page.evaluate('''id=>{const a=__wired,t=a.targets().find(t=>t.id===id);if(!t)throw Error('Target absent '+id);const p=a.project(t),s=a.g.screen,c=s.canvas.getBoundingClientRect();return [c.left+(p[0]*s.S+s.OX)/s.dpr,c.top+(p[1]*s.S+s.OY)/s.dpr];}''',target_id)
    assert all(math.isfinite(v) for v in data)
    if isinstance(page,FramePlayer):
        ox,oy=page.offset();data=[data[0]+ox,data[1]+oy]
    return data


def click_target(page,id,tool=None,touch=False):
    if tool is not None:key(page,str(tool+1))
    x,y=point(page,id)
    if touch:page.touchscreen.tap(x,y)
    else:page.mouse.click(x,y)
    page.wait_for_timeout(75)
    if page.evaluate('__wired.net.mode')!='solo':
        wait(page,'__wired.net.pending.size === 0')
    return x,y


def hold_target(page,id,tool=2,touch=False):
    if touch:
        click_target(page,id,touch=True)
        wait(page,'!__wired.hold',10000)
        return
    key(page,str(tool+1));x,y=point(page,id);page.mouse.move(x,y);page.mouse.down()
    try:
        try:wait(page,'!!__wired.currentBoard()?.hold')
        except Exception:raise AssertionError({'board':page.evaluate('__wired.currentBoard()'),'view':page.evaluate('__wired.menuPage'),'caption':page.evaluate('__wired.caption'),'net':page.evaluate('({me:__wired.net.me,pending:[...__wired.net.pending.keys()],ended:__wired.net.ended})')})
        if tool==3:
            try:wait(page,'!__wired.currentBoard().fire',10000)
            except Exception:raise AssertionError({'fireDidNotClear':page.evaluate('__wired.currentBoard()'),'snapshot':snap(page),'localHold':page.evaluate('__wired.hold'),'input':page.evaluate('[...__game.input.held]'),'caption':page.evaluate('__wired.caption')})
        else:wait(page,'__wired.state().time-__wired.currentBoard().hold.start >= __wired.state().tuning.safeMin + .13')
    finally:page.mouse.up()
    page.wait_for_timeout(95)
    if page.evaluate('__wired.net.mode')!='solo':page.wait_for_timeout(200)


def do_recovery(page):
    b=page.evaluate('__wired.currentBoard()');guard=next(p for p in b['components'] if p['id'] not in b['order'])
    click_target(page,guard['id']+':0',0)
    assert page.evaluate('!!__wired.currentBoard().fault')
    hold_target(page,guard['id']+':0')
    wait(page,'!__wired.currentBoard().fault')


def repair_board(page,id,recovery=False,wrong=False,touch=False):
    open_board(page,id)
    if recovery:do_recovery(page)
    limit=0
    while True:
        limit+=1;assert limit<70,'Repair driver stranded'
        s=state(page);b=next(b for b in s['boards'] if b['id']==id)
        if b['done']:return
        if b['fire']:
            hold_target(page,'fire',3,touch=touch);continue
        c=next(c for c in b['components'] if c['id']==b['order'][b['job']])
        cid=c['id']
        if c['phase']=='attached':
            for terminal in [0,1]:
                if c['leads'][terminal]!=1:click_target(page,cid+':'+str(terminal),0,touch)
            click_target(page,cid,1,touch)
        elif c['phase']=='empty':
            available=[sp for sp in b['stock'] if sum(p.get('spare')==sp['id'] and p['phase'] in ['placed','stable'] for p in b['components'])<sp.get('qty',1)]
            if c['mode']=='jumper':chosen=next(sp for sp in available if sp['shape']=='jumper')
            else:
                # Diagnose once, then use the rule now printed on the player's work order.
                if not b['ruleKnown']:
                    sp=available[0]
                    click_target(page,sp['id'],1,touch)
                    if touch:click_target(page,'test',touch=True)
                    else:key(page,'e')
                    page.wait_for_timeout(100)
                    tested=page.evaluate('__wired.currentBoard().tests.at(-1)')
                    assert tested and tested['spare']==sp['id'], {'expected':sp['id'],'tested':tested,'board':page.evaluate('__wired.currentBoard()'),'focus':page.evaluate('__wired.target()'),'page':page.evaluate('__wired.menuPage')}
                    b=page.evaluate('__wired.currentBoard()')
                assert b['ruleKnown']
                chosen=next((sp for sp in available if sp[b['rule']]==c[b['rule']]),None)
                assert chosen,'No usable spare'
            click_target(page,chosen['id'],1,touch)
            if wrong:
                bad=next((sp for sp in available if sp['id']!=chosen['id']),None)
                if bad:
                    # Only force a wrong part if diagnostics prove it wrong.
                    click_target(page,bad['id'],1,touch)
                    if touch:click_target(page,'test',touch=True)
                    else:key(page,'e')
                    if not page.evaluate('__wired.currentBoard().tests.at(-1).pass'):
                        click_target(page,cid,1,touch)
                        assert page.evaluate('__wired.currentBoard().components.find(c=>c.id==="'+cid+'").phase')=='wrong'
                        click_target(page,cid,1,touch)
                    click_target(page,chosen['id'],1,touch)
                wrong=False
            click_target(page,cid,1,touch)
        elif c['phase']=='placed':
            for terminal in [0,1]:
                bb=page.evaluate('__wired.currentBoard()')
                cc=next(p for p in bb['components'] if p['id']==cid)
                if cc['leads'][terminal]!=2:
                    if bb['fire']:break
                    hold_target(page,cid+':'+str(terminal),2,touch)
                    if page.evaluate('__wired.currentBoard()?.done'):break
        elif c['phase']=='wrong':click_target(page,cid,1,touch)
        else:raise AssertionError('Unknown nonterminal state '+c['phase'])
        if page.evaluate('__wired.net.mode')!='solo':page.wait_for_timeout(200)


def infer_code(page):
    return page.evaluate('''()=>__wired.state().evidence.map(cells=>{const ds=Wired.candidates(cells);if(ds.length!==1)throw Error('Evidence still ambiguous '+ds);return ds[0];})''')


def submit(page,code):
    if page.evaluate('__wired.menuPage')!='evidence':key(page,'Tab')
    button(page,'Dial disarm code')
    for i,d in enumerate(code):
        for j in range(d):button(page,'Increase digit')
        if i<len(code)-1:button(page,'Next digit')
    button(page,'Prepare transmission')
    # The default focus returns to evidence; transmission always needs a separate act.
    button(page,'Transmit code '+''.join(str(d) for d in code))


def smoke(browser):
    ctx,page=new_page(browser)
    try:
        page.wait_for_timeout(300);clean(page)
        page.screenshot(path=str(ROOT/'evidence/title.png'))
        assert page.locator('.wired-hud').is_hidden()
        title_box=page.locator('.esh-ttl>div').bounding_box()
        assert title_box['y']>=0 and title_box['y']+title_box['height']<=1081
        button(page,'Begin dispatch');button(page,'Start guided repair')
        open_board(page,'B1');page.wait_for_timeout(150)
        page.screenshot(path=str(ROOT/'evidence/board.png'))
        click_target(page,'C1:1',0)
        assert page.evaluate('__wired.currentBoard().components[0].leads')==[0,1]
        assert page.evaluate('__wired.focus')==1
        key(page,'Escape');wait(page,'__wired.ui.screen === "pause"')
        before=state(page)['remaining'];page.wait_for_timeout(200);assert abs(state(page)['remaining']-before)<.02
        button(page,'Settings');assert page.get_by_text('Music',exact=True).count()>0
        button(page,'Back');button(page,'Resume')
        clean(page);assert not page._errors,page._errors
        return {'browser':page.evaluate('navigator.userAgent'),'fileURL':True,'mouseActualTarget':True,'pause':True}
    finally:ctx.close()


def campaign(browser):
    ctx,page=new_page(browser)
    try:
        button(page,'Begin dispatch');button(page,'Start guided repair')
        cases=['training','waterfront','relay','central'];evidence=[]
        for n,id in enumerate(cases):
            if n:
                # Results advance through the actual authored campaign.
                label={'waterfront':'Next dispatch · The last ferry','relay':'Next dispatch · A current affair','central':'Next dispatch · The final countdown'}[id]
                button(page,label);button(page,'Open the device')
            s=state(page)
            for i,b in enumerate(s['boards']):
                repair_board(page,b['id'],recovery=id=='waterfront' and i==0,wrong=id=='relay' and i==1)
            code=infer_code(page);s=state(page)
            assert not s['modified'] and not s['assisted']
            page.screenshot(path=str(ROOT/f'evidence/{id}-evidence.png'))
            submit(page,code);wait(page,'__wired.menuPage === "results"')
            result=state(page)['outcome'];assert result['won'],result
            assert not result['modified'] and not result['assisted']
            page.wait_for_timeout(300);page.screenshot(path=str(ROOT/f'evidence/{id}-success.png'))
            evidence.append({'case':id,'codeInferred':code,'outcome':result,'timeRemaining':state(page)['remaining']})
        button(page,'Watch the ending');button(page,'Continue');button(page,'Continue');button(page,'Acknowledgments')
        assert page.get_by_role('heading',name='Source Information',exact=True).count()==1
        for _ in range(5):button(page,'Next page')
        assert page.get_by_role('heading',name='Testing Feedback',exact=True).count()==1
        assert page.evaluate('__wired.progress.finished.length')==4
        assert page.evaluate('__game.errors')==[]
        assert not page._errors,page._errors
        return {'cases':evidence,'input':'actual keyboard and mouse','noStateWrites':True,'creditsReached':True}
    finally:ctx.close()


def audio_test(browser):
    ctx,page=new_page(browser)
    try:
        assert page.evaluate('__game.settings.music')==.1
        button(page,'Field manual');wait(page,'__game.audio.ready')
        result=page.evaluate('''async()=>{
          const a=__game.audio,ctx=new OfflineAudioContext(1,22050,22050),bus=ctx.createGain();bus.connect(ctx.destination);
          Wired.syllable(ctx,bus,.02,280,.12,.3,false);Wired.syllable(ctx,bus,.2,130,.2,.3,true);
          const buffer=await ctx.startRendering(),data=buffer.getChannelData(0);let max=0,sum=0,finite=true;for(const x of data){max=Math.max(max,Math.abs(x));sum+=x*x;if(!Number.isFinite(x))finite=false;}
          return {musicDefault:__game.settings.default('music'),music:a.musicVolume,musicGain:a._musBus.gain.value,voice:a.voiceVolume,finite,peak:max,rms:Math.sqrt(sum/data.length)};
        }''')
        assert result['music']==.1 and result['musicDefault']==.1
        assert result['finite'] and result['peak']>.001 and result['rms']>.0001
        page.evaluate('__game.settings.set("sound",false)')
        assert page.evaluate('__game.audio._master.gain.value')==0
        page.evaluate('__game.settings.set("sound",true)')
        page.evaluate('__wired.sound.say("urgent instruction", "nell", 3)')
        assert not page.evaluate('__wired.sound.say("unimportant taunt", "vex", 0)')
        return result
    finally:ctx.close()


def attract(browser):
    ctx,page=new_page(browser)
    try:
        before=page.evaluate('JSON.stringify(__wired.progress)')
        page.mouse.move(1000,850)
        page.wait_for_timeout(10500);wait(page,'__wired.attract',4000)
        page.wait_for_timeout(5500)
        assert page.evaluate('__wired.demo.s.boards[0].components[0].phase') in ['placed','stable']
        key(page,'Space');wait(page,'__game.sceneName === "title"')
        page.wait_for_timeout(250)
        assert page.evaluate('__wired.ui.screen')=='title'
        assert page.evaluate('JSON.stringify(__wired.progress)')==before
        assert page.evaluate('__wired.net.peer') is None
        assert page.locator('.wired-hud').is_hidden()
        return {'idleSeconds':10,'actualRepairSimulation':True,'wakeConsumed':True,'savesUnchanged':True}
    finally:ctx.close()


def pad_test(browser):
    ctx=browser.new_context(viewport={'width':1920,'height':1080})
    ctx.add_init_script('''window.testPad={id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',timestamp:0,buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),axes:[0,0,0,0]};navigator.getGamepads=()=>[window.testPad];window.padSet=(n,on)=>{testPad.buttons[n]={pressed:on,touched:on,value:on?1:0};testPad.timestamp++;};''')
    page=ctx.new_page();page.goto(ARTIFACT.as_uri());wait(page,'!!window.__wired')
    def pad(n):
        page.evaluate('n=>padSet(n,true)',n);page.wait_for_timeout(90);page.evaluate('n=>padSet(n,false)',n);page.wait_for_timeout(90)
    def choose(label):
        for _ in range(25):
            if page.evaluate('document.activeElement && document.activeElement.textContent')==label:
                pad(0);return
            pad(13)
        raise AssertionError('Controller could not focus '+label)
    def solder_pad():
        page.evaluate('padSet(0,true)')
        wait(page,'!!__wired.currentBoard()?.hold')
        wait(page,'__wired.state().time-__wired.currentBoard().hold.start >= .64')
        page.evaluate('padSet(0,false)');page.wait_for_timeout(130)
    try:
        pad(0);wait(page,'__wired.menuPage === "brief"');pad(0);wait(page,'__wired.menuPage === "evidence"');pad(0);wait(page,'__wired.menuPage === "board"')
        assert page.evaluate('__wired.sound.active'), 'Controller-first play did not activate the generated soundscape'
        assert page.evaluate('__game.input.label("apply")')=='✕'
        pad(0);assert page.evaluate('__wired.currentBoard().components[0].leads[0]')==1
        pad(15);pad(15);assert page.evaluate('__wired.target().id')=='C1:1'
        pad(0);assert page.evaluate('__wired.currentBoard().components[0].leads')==[1,1]
        pad(5);assert page.evaluate('__wired.tool')==1
        pad(14);pad(0);assert page.evaluate('__wired.currentBoard().components[0].phase')=='empty'
        pad(12);pad(0);assert page.evaluate('__wired.currentBoard().held') is not None
        pad(13);pad(0);assert page.evaluate('__wired.currentBoard().components[0].phase')=='placed'
        pad(5);solder_pad();pad(15);pad(15);solder_pad()
        wait(page,'__wired.state().completed === 1')
        code=infer_code(page)
        choose('Dial disarm code')
        choose('Increase digit')
        assert page.evaluate('document.activeElement.textContent')=='Increase digit'
        for _ in range((code[0]+9)%10):pad(0)
        choose('Prepare transmission');choose('Transmit code '+str(code[0]))
        wait(page,'__wired.menuPage === "results"');assert state(page)['outcome']['won']
        button(page,'Retry same seed');open_board(page,'B1')
        pad(9);wait(page,'__wired.ui.screen === "pause"')
        button(page,'Controls')
        page.evaluate('__game.settings.set("glyphs","xbox")')
        assert page.evaluate('__game.input.label("apply","gamepad")')=='A'
        page.evaluate('__game.settings.set("glyphs","playstation")')
        assert page.evaluate('__game.input.label("apply","gamepad")')=='✕'
        page.evaluate('testPad.connected=false');page.wait_for_timeout(150)
        page.evaluate('testPad.connected=true');pad(0)
        clean(page)
        return {'standardMapping':True,'fullPracticeDisposal':True,'sameScreenFocusRetained':True,'defaultGlyphs':'PlayStation','xboxOption':True,'physicalHardware':False}
    finally:ctx.close()


def touch_test(p,browser):
    device=p.devices['iPhone 13'];ctx=browser.new_context(**device)
    page=ctx.new_page();page.goto(ARTIFACT.as_uri());wait(page,'!!window.__wired')
    try:
        button(page,'Begin dispatch');button(page,'Start guided repair');repair_board(page,'B1',touch=True)
        assert state(page)['completed']==1 and state(page)['assisted']
        page.screenshot(path=str(ROOT/'evidence/touch-phone.png'))
        clean(page);return {'profile':'iPhone 13','browser':'Chromium','tapRepair':True,'assistedSolder':True,'physicalDevice':False}
    finally:ctx.close()


def tablet_test(p,browser):
    device=p.devices['iPad Pro 11'];ctx=browser.new_context(**device)
    page=ctx.new_page();page.goto(ARTIFACT.as_uri());wait(page,'!!window.__wired')
    try:
        button(page,'Begin dispatch');button(page,'Start guided repair');repair_board(page,'B1',touch=True)
        assert state(page)['completed']==1 and state(page)['assisted']
        button(page,'Digit reference')
        page.set_viewport_size({'width':1194,'height':834});page.wait_for_timeout(300)
        page.screenshot(path=str(ROOT/'evidence/touch-tablet-landscape.png'))
        assert page.evaluate('__game.screen.W > __game.screen.H')
        clean(page)
        return {'profile':'iPad Pro 11','browser':'Chromium','tapRepair':True,'orientationReflow':True,'physicalDevice':False}
    finally:ctx.close()


def package_test(p,browser):
    html=ARTIFACT.read_text();hub=(ROOT/'vendor/session.js').read_text();first=html.split('<script>',1)[1].split('</script>',1)[0]
    assert first==hub,'Official Hub client changed or not the first script'
    assert '<meta charset="utf-8">\n<script>'+hub in html
    assert 'src="src/' not in html and 'file:///home/' not in html
    assert '.wav' not in html.split('/* Original content.')[1], 'Game references audio files'
    report=json.loads((ROOT.parent/'exit-interview.json').read_text())
    assert set(report)=={'sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub'}
    assert set(report['sourceInformation'])=={'date','source','plan','genre','perspective','tech','artDirection','animation','audio','online','testing','research','environment','model','usage'}
    assert all(isinstance(v,str) and v for v in report['sourceInformation'].values())
    assert report['sourceInformation']['usage']=='added on import'
    assert report['sourceInformation']['plan']=='PLAN.md'
    assert [len(report[k]) for k in ['testingFeedback','engineFeedback','promptFeedback']]==[4,6,4]
    assert report['aiHub']['name']==RUN['title'] and report['aiHub']['type']=='Game'
    assert report['aiHub']['genre']=='Puzzle' and report['aiHub']['players']=='1–4'
    assert 3<=len(report['aiHub']['tags'])<=6 and all(t==t.lower() for t in report['aiHub']['tags'])
    with server() as base:
        ctx,page=new_page(browser,base+'/'+urllib.parse.quote(ARTIFACT.name))
        try:clean(page);assert page.title()==RUN['title'];assert page.evaluate('Wired.REPORT')==report
        finally:ctx.close()
    # A copy outside the development tree proves the one-file handoff.
    isolated=ROOT/'evidence/isolated';isolated.mkdir(exist_ok=True)
    copy=isolated/'game.html';shutil.copy2(ARTIFACT,copy)
    ctx,page=new_page(browser,copy.as_uri())
    try:clean(page);assert page.evaluate('__game.settings.music')==.1
    finally:ctx.close()
    versions={'Chromium':browser.version}
    for engine in ['firefox','webkit']:
        b=getattr(p,engine).launch(headless=True)
        versions[engine]=b.version
        try:
            ctx,page=new_page(b)
            try:clean(page);button(page,'Begin dispatch');button(page,'Start guided repair');open_board(page,'B1');click_target(page,'C1:0',0);assert page.evaluate('__wired.currentBoard().components[0].leads[0]')==1;clean(page)
            finally:ctx.close()
        finally:b.close()
    return {'singleFile':True,'hubByteForByte':True,'loopback':True,'browsers':['Chromium','Firefox','WebKit'],'versions':versions}


def authoring_test(browser):
    ctx,page=new_page(browser)
    try:
        button(page,'Begin dispatch');button(page,'Start guided repair');open_board(page,'B1')
        key(page,'Escape');button(page,'Developer tools');button(page,'Live tuning sliders')
        slider=page.locator('.esh-row').filter(has=page.locator('span',has_text='Iron heat per second')).locator('input').first
        slider.focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(120)
        assert state(page)['tuning']['heatGain']>30
        assert state(page)['modified']
        button(page,'Reset authored defaults');assert state(page)['tuning']['heatGain']==30
        button(page,'Back');button(page,'Board / case authoring')
        button(page,'Add component')
        # These are real native-shell input events; the authoring panel owns all writes.
        xslider=page.locator('.esh-row').filter(has=page.locator('span',has_text='Component X')).locator('input').first
        xslider.evaluate('el=>{el.value="134";el.dispatchEvent(new Event("input",{bubbles:true}));}')
        button(page,'Toggle job in order');button(page,'Rebuild unambiguous spare tray');button(page,'Fill complete evidence stencil')
        button(page,'Validate scratch board')
        assert 'VALID' in page.locator('.esh-mod').inner_text()
        page.wait_for_timeout(300);page.screenshot(path=str(ROOT/'evidence/editor.png'))
        button(page,'Export JSON')
        text=page.get_by_role('textbox',name='Board JSON').input_value();data=json.loads(text)
        assert data['format']=='wired-board' and data['version']==1
        assert len(data['board']['components'])==5 and 'C5' in data['board']['order']
        button(page,'Back to workshop');button(page,'Import JSON')
        page.get_by_role('textbox',name='Board JSON').fill(text)
        button(page,'Import text');assert page.evaluate('__wired.editor.data.board.components.length')==5
        button(page,'Close');wait(page,'!__wired.ui.screen && __wired.editorPreview === null')
        assert len(state(page)['boards'][0]['components'])==4
        key(page,'Escape');button(page,'Developer tools');button(page,'Board / case authoring')
        button(page,'Import JSON');page.get_by_role('textbox',name='Board JSON').fill(text);button(page,'Import text')
        button(page,'Playtest scratch copy');repair_board(page,'B1')
        submit(page,infer_code(page));wait(page,'__wired.menuPage === "results"')
        assert state(page)['outcome']['modified']
        assert 'DEVELOPER MODIFIED' in page.locator('.esh-mod').inner_text()
        assert page.evaluate('__wired.progress.finished.length')==0
        clean(page)
        return {'addedComponent':'C5','versionedRoundtrip':True,'validated':True,'scratchDisposal':True,'campaignTemplatesSafe':True}
    finally:ctx.close()


def failure_test(browser):
    ctx,page=new_page(browser)
    try:
        choose_case(page,'training');repair_board(page,'B1');correct=infer_code(page)[0]
        submit(page,[(correct+1)%10]);wait(page,'__wired.menuPage === "results"')
        assert state(page)['outcome']['cause']=='Wrong code confirmed'
        old_seed=state(page)['seed'];button(page,'Retry same seed')
        assert state(page)['seed']==old_seed and not state(page)['outcome']
        # Pause-accessible time scale accelerates an actual expiry without writing the fuse.
        open_board(page,'B1');key(page,'Escape');button(page,'Developer tools');button(page,'Live tuning sliders')
        slider=page.locator('.esh-row').filter(has=page.locator('span',has_text='Simulation speed')).locator('input').first
        slider.evaluate('el=>{el.value="3";el.dispatchEvent(new Event("input",{bubbles:true}));}')
        button(page,'Back');button(page,'Back');button(page,'Resume')
        # Native fixed-step advance is the documented headless clock, not a state write.
        page.evaluate('__game.advance(65)')
        wait(page,'__wired.menuPage === "results"')
        assert state(page)['outcome']['cause']=='Fuse expired'
        page.wait_for_timeout(300);page.screenshot(path=str(ROOT/'evidence/failure.png'))
        clean(page)
        return {'wrongCode':True,'sameSeedRetry':True,'expiry':True,'terminalOutcomeOnce':True}
    finally:ctx.close()


def peer_round(browser,url,complete=True,edgecases=False):
    # Both pages use the exact shipped interface and real RTCDataConnections.
    context=browser.new_context(viewport={'width':1280,'height':720})
    host=context.new_page();guest=context.new_page()
    for page in [host,guest]:
        page.set_default_timeout(15000);page.goto(url);wait(page,'!!window.__wired')
    try:
        button(host,'Co-op dispatch');button(host,'Host a room')
        wait(host,'__wired.net.peer && __wired.net.peer.open',20000)
        room=host.evaluate('__wired.net.room')
        button(guest,'Co-op dispatch');button(guest,'Join a room')
        guest.get_by_role('textbox',name='Room code',exact=True).fill(room)
        button(guest,'Connect to room');wait(guest,'__wired.net.me === "p1"',25000)
        wait(host,'__wired.net.seats.length === 2')
        edge_results={}
        if edgecases:
            observer=context.new_page();observer.goto(url);wait(observer,'!!window.__wired')
            edge_results=observer.evaluate('''async room=>{
              const peers=[];
              async function admit(version){return await new Promise((resolve,reject)=>{
                const peer=new Peer(undefined,__wired.net.peerOptions());peers.push(peer);
                const timer=setTimeout(()=>reject(Error('Admission timeout')),9000);
                peer.on('error',e=>{clearTimeout(timer);reject(Error(e.message));});
                peer.on('open',()=>{const c=peer.connect('bsawu-'+room.toLowerCase(),{reliable:true,serialization:'json'});c.on('open',()=>c.send({kind:'admit',version,content:Wired.CONTENT,token:Wired.roomCode()+Wired.roomCode()}));c.on('data',p=>{if(['admitted','reject'].includes(p.kind)){clearTimeout(timer);resolve(p);}});});
              });}
              try{const wrong=await admit('incompatible-version');if(wrong.kind!=='reject'||!wrong.why.includes('version'))throw Error('Version mismatch admitted');await admit(Wired.VERSION);await admit(Wired.VERSION);const full=await admit(Wired.VERSION);if(full.kind!=='reject'||!full.why.includes('full'))throw Error('Fifth seat admitted');return {versionRejected:true,fullRoomRejected:true};}
              finally{for(const peer of peers)peer.destroy();}
            }''',room)
            wait(host,'__wired.net.seats.length === 2')
            button(observer,'Co-op dispatch');button(observer,'Join a room')
            missing=observer.evaluate('Wired.roomCode()')
            observer.get_by_role('textbox',name='Room code',exact=True).fill(missing)
            button(observer,'Connect to room')
            wait(observer,'__wired.net.status.includes("peer-unavailable")',12000)
            edge_results['unavailableRoomActionable']=True
            observer.evaluate('__wired.net.cleanup()');observer.close()
        button(host,'Dispatch: waterfront')
        wait(guest,'__wired.net.state && !__wired.net.syncing && __wired.net.state.boards.length === 4')
        before_fuse=state(host)['remaining']
        host.evaluate('__game.stop()');host.wait_for_timeout(350)
        assert state(host)['remaining'] < before_fuse-.25
        host.evaluate('__game.start()')
        repair_board(host,'B1');repair_board(guest,'B2')
        wait(host,'__wired.state().completed === 2');wait(guest,'__wired.state().completed === 2')
        wait(host,'[...document.querySelectorAll(".esh-btns button")].some(b=>b.textContent==="Dial disarm code" && !b.disabled)')
        assert host.evaluate('__wired.net.mode')=='peer'
        assert guest.evaluate('__wired.net.conn.peerConnection.connectionState')=='connected'
        for page in [host,guest]:assert page.evaluate('__game.errors')==[]
        detail={'room':room,'actualWebRTC':True,'differentSeatsRepaired':True,'automaticCodeUnlock':True,'clockIndependentOfRendering':True,'authority':host.evaluate('__wired.net.authority'),**edge_results}
        if complete:
            repair_board(host,'B3');repair_board(guest,'B4')
            wait(host,'__wired.state().completed === 4');wait(guest,'__wired.state().completed === 4')
            code=infer_code(host);assert infer_code(guest)==code
            submit(host,code);wait(guest,'__wired.ui.screen === "vote"')
            button(guest,'Accept transmission')
            wait(host,'!!__wired.state().outcome');wait(guest,'!!__wired.state().outcome')
            assert state(host)['outcome']['won'] and state(guest)['outcome']['won']
            def canonical(page):
                return page.evaluate('''()=>{const s=__wired.state();return {id:s.id,evidence:s.evidence,completed:s.completed,boards:s.boards.map(b=>({id:b.id,done:b.done,job:b.job,components:b.components})),outcome:s.outcome};}''')
            assert canonical(host)==canonical(guest)
            detail.update({'sharedDisposal':True,'canonicalAgreement':True})
            previous_epoch=host.evaluate('__wired.net.epoch')
            button(host,'Retry with crew')
            wait(guest,f'__wired.net.epoch > {previous_epoch} && !__wired.net.syncing && !__wired.state().outcome')
            open_board(guest,'B2');click_target(guest,'C1:0',0)
            wait(host,'__wired.state().boards[1].components[0].leads[0] === 1')
            # The ordinary native quit path closes the owned peer, then the room token rejoins.
            key(guest,'Escape');button(guest,'Quit to title');button(guest,'Quit')
            wait(guest,'__wired.ui.screen === "title"')
            wait(host,'__wired.net.seats.length === 1 && __wired.state().boards[1].owner === null')
            button(guest,'Co-op dispatch');button(guest,'Join a room')
            guest.get_by_role('textbox',name='Room code',exact=True).fill(room)
            button(guest,'Connect to room')
            wait(guest,'__wired.net.me === "p1" && __wired.net.state && !__wired.net.syncing')
            assert state(guest)['boards'][1]['components'][0]['leads'][0]==1
            assert state(guest)['party']==2
            detail.update({'crewReplay':True,'snapshotRejoin':True,'partialBoardPreserved':True,'workloadLocked':True})
        return detail
    finally:
        for page in [host,guest]:
            if not page.is_closed():page.evaluate('__wired.net.cleanup()')
        context.close()


def peer_test(browser):
    observations={}
    # The secure cloud route is tested separately from the deterministic fixture.
    try:
        observations['cloud']=peer_round(browser,ARTIFACT.as_uri())
    except Exception as e:
        observations['cloud']={'passed':False,'boundary':str(e).splitlines()[0]}
    proc=subprocess.Popen(['node','tools/peer-fixture.mjs'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try:
        fixture=json.loads(proc.stdout.readline())
        url=ARTIFACT.as_uri()+'?signal='+urllib.parse.quote(fixture['url'],safe='')
        observations['localSignaling']=peer_round(browser,url,edgecases=True)
        observations['localSignaling']['fixturePID']=fixture['pid']
    finally:
        proc.terminate()
        try:proc.wait(timeout=5)
        except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
    (ROOT/'evidence/peer.json').write_text(json.dumps(observations,indent=2))
    return observations


class FramePlayer:
    def __init__(self,page,frame):
        self.parent=page;self.frame=frame;self.mouse=page.mouse
        self.keyboard=self
    def press(self,key):
        self.frame.frame_element().focus()
        self.frame.locator('body').press(key)
    def evaluate(self,*args,**kwargs):return self.frame.evaluate(*args,**kwargs)
    def wait_for_timeout(self,*args,**kwargs):return self.parent.wait_for_timeout(*args,**kwargs)
    def wait_for_function(self,*args,**kwargs):return self.frame.wait_for_function(*args,**kwargs)
    def get_by_role(self,*args,**kwargs):return self.frame.get_by_role(*args,**kwargs)
    def offset(self):
        b=self.frame.frame_element().bounding_box();return b['x'],b['y']


def hub_playthrough(browser,base):
    context=browser.new_context(viewport={'width':2200,'height':1300});page=context.new_page()
    try:
        harness=base+'/'+RUN['slug']+'/vendor/hub-upstream/lib/hub/harness.html'
        page.goto(harness+'?game='+urllib.parse.quote('/'+ARTIFACT.name)+'&players=2&latency=30&jitter=10&loss=0&limit=180&seed=47')
        page.get_by_role('button',name='New round',exact=True).click()
        wait(page,'document.querySelectorAll("iframe").length === 2')
        frames=page.frames[1:]
        for frame in frames:frame.wait_for_function('window.__wired && __wired.net.mode === "hub"')
        # Each frame stands in for a separate device. Passive native-menu refreshes
        # must not steal the other simulated device's one shared OS keyboard focus.
        # This changes only the harness stand-in, never game state or commands.
        for frame in frames:
            frame.evaluate('''()=>{const nativeFocus=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(...args){if(parent.document.activeElement===frameElement)return nativeFocus.apply(this,args);};}''')
        page.get_by_role('button',name='Start now',exact=True).click()
        for frame in frames:frame.wait_for_function('__wired.net.state && !__wired.net.syncing')
        players=[FramePlayer(page,frame) for frame in frames]
        s=state(players[0])
        for i,b in enumerate(s['boards']):repair_board(players[i%2],b['id'])
        for player in players:wait(player,'__wired.state().completed === 4')
        code=infer_code(players[0]);assert infer_code(players[1])==code
        submit(players[0],code);wait(players[1],'__wired.ui.screen === "vote"')
        button(players[1],'Accept transmission')
        for player in players:wait(player,'__wired.net.ended')
        states=[state(player) for player in players]
        assert all(s['outcome']['won'] for s in states)
        assert states[0]['evidence']==states[1]['evidence']
        assert states[0]['completed']==states[1]['completed']==4
        assert all(player.evaluate('__game.errors')==[] for player in players)
        return {'players':2,'ordinaryInput':True,'sharedDisposal':True,'completed':4,'canonicalEvidenceAgreement':True,'code':code,'secondsRemaining':states[0]['remaining']}
    finally:context.close()


def hub_tests(browser):
    reports=[]
    with server() as base:
        for players,scenario,extra in [(2,'standard',''),(4,'standard','&latency=150&jitter=50&loss=5'),(2,'host-leave',''),(2,'server','')]:
            context=browser.new_context(viewport={'width':1920,'height':1080});page=context.new_page()
            try:
                harness=base+'/'+RUN['slug']+'/vendor/hub-upstream/lib/hub/harness.html'
                page.goto(harness+'?game='+urllib.parse.quote('/'+ARTIFACT.name)+'&players='+str(players)+'&scenario='+scenario+'&auto=1&play=5000'+extra)
                wait(page,'document.body.dataset.complete === "true"',65000)
                report=page.evaluate('window.__hubCheck');reports.append(report)
                assert report['pass'],json.dumps(report['checks'],indent=2)
                frames=[f for f in page.frames if f!=page.main_frame and f.evaluate('!!window.__wired')]
                assert frames
                states=[f.evaluate('__wired.net.state && ({id:__wired.net.state.id,completed:__wired.net.state.completed,outcome:__wired.net.state.outcome})') for f in frames]
                if scenario!='host-leave':assert all(s and s['id']==states[0]['id'] for s in states),states
                for frame in frames:
                    assert frame.evaluate('__game.errors')==[]
                    assert frame.evaluate('__wired.net.ended')
                    assert frame.evaluate('__wired.sound.stopped')
                    assert frame.evaluate('__wired.net.peer === null')
                reports[-1]['gameStates']=states
            finally:context.close()
        playthrough=hub_playthrough(browser,base)
    (ROOT/'evidence/hub.json').write_text(json.dumps(reports,indent=2))
    (ROOT/'evidence/hub-playthrough.json').write_text(json.dumps(playthrough,indent=2))
    return [{'players':r['players'],'scenario':r['scenario'],'pass':r['pass']} for r in reports]


lock_path=ROOT/'.cache/browser-verification.lock'
lock_path.parent.mkdir(exist_ok=True)
browser_lock=lock_path.open('w')
fcntl.flock(browser_lock,fcntl.LOCK_EX)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        RESULT['observations']['chromiumVersion']=browser.version
        if 'browser' in GROUPS:
            check('standalone final HTML, mouse targets, native pause and title layout',lambda:smoke(browser))
            check('ten-second attract, actual repair, isolated save and consumed wake',lambda:attract(browser))
        if 'campaign' in GROUPS:check('fresh ordinary-input training and entire campaign to ending and credits',lambda:campaign(browser))
        if 'controller' in GROUPS:check('standard gamepad focus, tool cycle, glyphs and reconnection',lambda:pad_test(browser))
        if 'touch' in GROUPS:check('emulated touch repair and assisted joint hold',lambda:touch_test(p,browser))
        if 'touch' in GROUPS:check('emulated tablet repair and landscape reference reflow',lambda:tablet_test(p,browser))
        if 'audio' in GROUPS:check('synthesized audio, actual default gains, mute and voice priority',lambda:audio_test(browser))
        if 'authoring' in GROUPS:check('native live tuning and authored component export/import/playtest',lambda:authoring_test(browser))
        if 'recovery' in GROUPS:check('confirmed wrong code, seed fidelity and actual fuse expiry',lambda:failure_test(browser))
        if 'hub' in GROUPS:check('official Hub conformance: two, four impaired, host leave, authority-only server',lambda:hub_tests(browser))
        if 'hubplay' in GROUPS:
            def just_hub_play():
                with server() as base:return hub_playthrough(browser,base)
            check('ordinary-input Hub shared disposal',just_hub_play)
        if 'peer' in GROUPS:check('standalone peer host/join test',lambda:peer_test(browser))
        if 'package' in GROUPS:check('single file, client hash, isolated copy, HTTP and browser compatibility',lambda:package_test(p,browser))
    finally:browser.close()
(ROOT/'evidence'/('browser-'+'-'.join(sorted(GROUPS))+'.json')).write_text(json.dumps(RESULT,indent=2))
print(json.dumps(RESULT))
sys.exit(1 if RESULT['failures'] else 0)
