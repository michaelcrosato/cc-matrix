import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PROJECT=json.loads((ROOT/'project.json').read_text())
ARTIFACT=ROOT.parent/(PROJECT['base']+'.html')
OUT=ROOT/'build'/'screenshots';OUT.mkdir(parents=True,exist_ok=True)
SMOKE='--smoke' in sys.argv
passed=failed=0;failures=[];details={}
def check(name,ok,detail=''):
    global passed,failed
    if ok:passed+=1
    else:
        failed+=1;failures.append(name+(': '+str(detail) if detail else ''))
def run(name,fn):
    try:fn()
    except Exception as e:check(name,False,str(e))
def wait_title(page):page.wait_for_function('window.mix && mix.screen === "title"')
def title(page):
    page.evaluate('mix.showTitle()');wait_title(page)
def press(page,code):
    page.keyboard.press(code);page.wait_for_timeout(80)
def start(page):
    page.get_by_role('button',name='Play solo',exact=True).click();page.wait_for_function('mix.screen === "play"');page.wait_for_timeout(2700)
def state_errors(page):return page.evaluate('game.errors.map(e=>e.message)')
PAD_STUB="""window.__pads=[];navigator.getGamepads=()=>window.__pads.map((p,i)=>p?({id:'Stand-in standard controller '+i,index:i,connected:true,mapping:'standard',timestamp:performance.now(),axes:p.axes,buttons:p.buttons.map(v=>({pressed:!!v,touched:!!v,value:v?1:0}))}):null);window.padConnect=(i)=>{__pads[i]={axes:[0,0,0,0],buttons:Array(17).fill(0)}};"""
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    try:
        ctx=browser.new_context(viewport={'width':1920,'height':1080})
        page=ctx.new_page();errors=[];requests=[];resource_failures=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.on('requestfailed',lambda r:resource_failures.append(r.url))
        page.goto(ARTIFACT.as_uri()+'?test=1');page.wait_for_function('window.game && window.mix',timeout=20000);page.wait_for_timeout(1000)
        check('single-file boot makes no companion or CDN requests',not resource_failures and all(u.startswith(ARTIFACT.as_uri()) or u.startswith('data:') for u in requests),requests)
        check('direct-file title boots',page.evaluate('mix.screen==="title"&&!AIHub.active'))
        check('music default is one ten-percent bus',page.evaluate('game.settings.music===.1&&game.audio.musicVolume===.1'))
        check('inactive toast stays fully hidden',page.evaluate('getComputedStyle(mix.ui._els.toast).visibility==="hidden"'))
        check('title actions and footer fit the TV safe area',page.evaluate('Array.from(document.querySelectorAll(".esh-ttl button,.esh-ttl .esh-tags,.esh-ttl>div>.esh-m")).every(e=>{const b=e.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight-4&&b.right<=innerWidth})'))
        page.screenshot(path=str(OUT/'title-tv.png'))
        page.get_by_role('button',name='How to play',exact=True).hover()
        check('pointer hover does not unlock audio before a user gesture',page.evaluate('!mix.sound.unlocked&&!game.audio.ctx'))
        check('mouse hover moves native menu focus',page.evaluate('document.activeElement.textContent==="How to play"'))
        start(page)
        before=page.evaluate('mix.world.players[0].m.x');page.keyboard.down('KeyD');page.wait_for_timeout(450);page.keyboard.up('KeyD');page.wait_for_timeout(220)
        check('keyboard movement is continuous and release settles',page.evaluate('mix.world.players[0].m.x')>before+1 and page.evaluate('!mix.world.players[0].m.moving'))
        page.screenshot(path=str(OUT/'play-tv.png'))
        page.keyboard.press('Escape');page.wait_for_function('game.paused&&mix.ui.screen==="pause"');tick=page.evaluate('mix.world.tick');apos=page.evaluate('game.audio.pos.t');page.wait_for_timeout(200)
        check('standalone pause freezes world and synchronized score',page.evaluate('mix.world.tick')==tick and abs(page.evaluate('game.audio.pos.t')-apos)<.01)
        if not SMOKE:
            page.get_by_role('button',name='Developer tools',exact=True).click()
            check('developer tools visibly mark assisted runs',page.evaluate('mix.world.assisted&&mix.ui.screen==="developer"'))
            page.locator('input[type=range]').first.evaluate("el=>{el.value='8';el.dispatchEvent(new Event('input',{bubbles:true}))}")
            check('live speed slider changes authoritative tuning',page.evaluate('mix.world.tuning.playerSpeed===8'))
            page.get_by_role('button',name='Reset all tuning',exact=True).click()
            check('developer defaults reset all gameplay parameters',page.evaluate('Object.keys(Mix.DEFAULTS).every(k=>mix.world.tuning[k]===Mix.DEFAULTS[k])'))
            page.evaluate('mix.ui.hide();game.resume()');page.keyboard.down('KeyD');page.wait_for_timeout(120);page.keyboard.up('KeyD')
            check('resuming developer tools restores pause and speed',page.evaluate('!game.paused&&mix.world.players[0].m.speed===6'))
            # Test the final artifact's exact simulation, normal lives and legal intentions, including stage transitions.
            title(page);start(page)
            result=page.evaluate("game.debug.command('bot-play',{seconds:1000})")
            check('final HTML whole-campaign legal-intent playthrough',result['ok'] and result['state']['stats']['caught']==72 and not result['state']['assisted'] and result['state']['lives']>0,result.get('state',{}).get('phase'))
            details['browserCampaign']={'time':result['state']['elapsed'],'lives':result['state']['lives'],'stages':result['state']['stats']['finals']}
            page.wait_for_function('mix.ui.screen==="results"');page.screenshot(path=str(OUT/'victory-tv.png'))
            page.get_by_role('button',name='Play again',exact=True).click();page.wait_for_function('mix.world.phase==="intro"&&mix.ui.screen===null')
            check('retry resets food lives assistance and temporary timers',page.evaluate('mix.world.remaining===12&&mix.world.lives===5&&!mix.world.assisted&&mix.world.power===0&&mix.world.chain===0'))
            # Generated signals: render every effect through native synthesis and all formant vowels offline.
            audio=page.evaluate("""async()=>{
              const a=game.audio,prev={ctx:a.ctx,waves:a._waves},rate=24000,entries=Object.entries(Mix.SFX),off=new OfflineAudioContext(1,rate*(entries.length+2),rate),bus=off.createGain();bus.connect(off.destination);a.ctx=off;a._waves={};
              try{entries.forEach(([name,voice],i)=>a._voice(voice,bus,i+.01,1,false));for(let i=0;i<4;i++)Mix.phoneme(off,bus,entries.length+.05+i*.15,230+i*24,.12,.18,i);}finally{a.ctx=prev.ctx;a._waves=prev.waves;}
              const b=await off.startRendering(),d=b.getChannelData(0),levels=entries.map((e,i)=>{let max=0,sum=0;for(let j=i*rate;j<(i+1)*rate;j++){max=Math.max(max,Math.abs(d[j]));sum+=d[j]*d[j];}return {name:e[0],peak:max,rms:Math.sqrt(sum/rate)}});let peak=0,finite=true;for(const v of d){if(!Number.isFinite(v))finite=false;peak=Math.max(peak,Math.abs(v));}let voice=0;for(let i=entries.length*rate;i<d.length;i++)voice+=d[i]*d[i];return {finite,peak,levels,voice,defaultGain:game.settings.music,buses:!!a.bus('music')&&!!a.bus('sfx')&&!!a.bus('voice')};
            }""")
            check('procedural SFX and voice render finite bounded non-silent signals',audio['finite'] and 0<audio['peak']<.85 and all(v['rms']>.0001 for v in audio['levels']) and audio['voice']>0,audio)
            check('music SFX and voice route through separate native buses',audio['buses'])
            details['audio']=audio
            # Native persistent settings and paginated, complete metadata.
            title(page);page.get_by_role('button',name='Settings & credits',exact=True).click();page.get_by_role('button',name='Settings',exact=True).click()
            page.evaluate("game.settings.set('music',.32);game.settings.set('glyphs','xbox')");page.reload();wait_title(page)
            check('native settings survive reload',page.evaluate('game.settings.music===.32&&game.settings.glyphs==="xbox"'))
            page.evaluate("game.settings.reset('Sound');game.settings.set('glyphs','playstation')")
            check('native Sound reset restores ten percent music',page.evaluate('game.settings.music===.1'))
            page.get_by_role('button',name='Settings & credits',exact=True).click();page.get_by_role('button',name='About & credits',exact=True).click();seen=[]
            for i in range(12):
                seen.append(page.locator('.esh-sh').inner_text());n=page.get_by_role('button',name='Next',exact=True)
                if n.count()==0:break
                n.click()
            text='\n'.join(seen)
            check('About includes all mandated information and feedback',all(k in text for k in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback','added on import','gpt-6.1-sol','PLAN.md']))
            check('credits use paginated TV screens',len(seen)>=10)
            page.screenshot(path=str(OUT/'credits-tv.png'))
            # Edit -> validate -> save -> load -> export -> import -> play -> return through real screens.
            title(page);page.get_by_role('button',name='Maze workshop',exact=True).click();page.wait_for_function('mix.screen==="editor"')
            press(page,'ArrowLeft');press(page,'ArrowUp');original=page.evaluate('mix.editor.data.rows.join("")');press(page,'Space');changed=page.evaluate('mix.editor.data.rows.join("")');check('controller-style workshop editing changes a real cell',changed!=original)
            press(page,'KeyZ');check('workshop undo restores the prior board',page.evaluate('mix.editor.data.rows.join("")')==original)
            press(page,'KeyY');check('workshop redo restores the edit',page.evaluate('mix.editor.data.rows.join("")')==changed)
            press(page,'ArrowRight');press(page,'Space');second_edit=page.evaluate('mix.editor.data.rows.join("")');press(page,'Control+KeyZ');check('Ctrl+Z performs exactly one undo',page.evaluate('mix.editor.data.rows.join("")')==changed and second_edit!=changed);press(page,'Control+KeyY');check('Ctrl+Y performs exactly one redo',page.evaluate('mix.editor.data.rows.join("")')==second_edit);press(page,'Control+KeyZ')
            page.get_by_role('button',name='Workshop menu',exact=True).click();page.get_by_role('button',name='Save / load slots',exact=True).click();page.get_by_role('button',name='Save slot 1',exact=True).click();check('workshop slot save validates and persists',page.evaluate('mix.profile.data.boards[0]!==null'))
            page.get_by_role('button',name='Load 1:',exact=False).click();check('workshop reload retains saved rows',page.evaluate('mix.editor.data.rows.join("")')==changed)
            page.get_by_role('button',name='Back',exact=True).first.click();page.get_by_role('button',name='Export / import maze code',exact=True).click();code=page.get_by_role('textbox',name='Maze code').input_value();page.get_by_role('textbox',name='Maze code').fill('{bad code');page.get_by_role('button',name='Import this code',exact=True).click();check('invalid UI import retains the current valid maze',page.evaluate('mix.editor.data.rows.join("")')==changed and page.evaluate('mix.editor.message.includes("unchanged")'))
            page.get_by_role('textbox',name='Maze code').fill(code);page.get_by_role('button',name='Import this code',exact=True).click();check('valid UI code import completes a schema roundtrip',page.evaluate('mix.editor.message.includes("validated")'))
            page.get_by_role('button',name='Back',exact=True).first.click();page.get_by_role('button',name='Playtest maze',exact=True).click();page.wait_for_function('mix.screen==="play"&&mix.world.mode==="custom"')
            result=page.evaluate("game.debug.command('bot-play',{seconds:300})");check('workshop playtest uses the complete normal rule set',result['ok'] and result['state']['stats']['caught']==12)
            page.wait_for_function('mix.ui.screen==="results"');page.get_by_role('button',name='Return to workshop',exact=True).click();page.wait_for_function('mix.screen==="editor"');check('playtest return preserves the editable board',page.evaluate('mix.editor.data.rows.join("")')==changed)
            page.screenshot(path=str(OUT/'workshop-tv.png'))
            # Ten real idle seconds, input consumption, repeated loops and no record pollution.
            title(page);saved=page.evaluate('JSON.stringify(mix.profile.data)');page.wait_for_timeout(9200);check('title waits the full idle interval',page.evaluate('mix.screen==="title"'));page.wait_for_function('mix.screen==="attract"',timeout=4000)
            check('ten-second attract automatically begins',page.evaluate('mix.screen==="attract"'))
            page.evaluate('game.audio.mute(true);game.advance(87.2,{draw:false})');check('attract cycles all mechanics and reaches its finale celebration',page.evaluate('mix.screen==="attract"&&mix.attractPart===4&&mix.world.stageIndex===5&&mix.attractCelebrated'));page.evaluate('game.audio.mute(!game.settings.sound)')
            page.keyboard.press('Enter');page.wait_for_function('mix.screen==="title"');page.wait_for_timeout(200);check('attract exit consumes the start press',page.evaluate('mix.screen==="title"&&mix.ui.screen==="title"'))
            for i in range(2):
                page.evaluate('game.advance(10.2,{draw:false})');page.wait_for_function('mix.screen==="attract"');page.mouse.move(240+i*10,150+i*10,steps=30);page.wait_for_timeout(30);check('continuous mouse movement exits attract immediately '+str(i+1),page.evaluate('mix.screen==="title"'));page.wait_for_function('mix.screen==="title"')
            check('repeated attract loops leave records and unlocks untouched',page.evaluate('JSON.stringify(mix.profile.data)')==saved)
        check('native engine and browser remain free of errors',not state_errors(page) and not errors,{'native':state_errors(page),'browser':errors})
        ctx.close()
        if not SMOKE:
            # Standard-mapping gamepad stand-in, two seats, last-device labels, chord and disconnect.
            padctx=browser.new_context(viewport={'width':1280,'height':800});padctx.add_init_script(PAD_STUB);pg=padctx.new_page();pg.goto(ARTIFACT.as_uri()+'?test=1');wait_title(pg)
            pg.evaluate('padConnect(0);__pads[0].buttons[0]=1');pg.wait_for_timeout(120);pg.evaluate('__pads[0].buttons[0]=0');pg.wait_for_function('mix.screen==="play"');pg.wait_for_timeout(2600)
            check('standard pad can start without a mouse',pg.evaluate('game.input.lastDevice==="gamepad"'))
            pg.evaluate('__pads[0].axes=[1,0,0,0]');pg.wait_for_timeout(360);pg.evaluate('__pads[0].axes=[0,0,0,0]');check('left stick steers the ordinary hero',pg.evaluate('mix.world.players[0].m.x>2'))
            check('PlayStation prompts follow the last pad input',pg.evaluate('game.input.label("chirp").includes("✕")||game.input.label("chirp").includes("×")'))
            pg.evaluate('game.settings.set("glyphs","xbox")');check('Xbox glyph choice changes actual action prompts',pg.evaluate('game.input.label("chirp")==="A"'))
            pg.evaluate('__pads[0].buttons[8]=1;__pads[0].buttons[9]=1');pg.wait_for_timeout(100);check('Create plus Options remains reserved for Hub',pg.evaluate('!game.paused'));pg.evaluate('__pads[0].buttons[8]=0;__pads[0].buttons[9]=0')
            pg.evaluate('__pads[0]=null');pg.wait_for_timeout(150);check('controller loss safely pauses standalone',pg.evaluate('game.paused'))
            title(pg);pg.evaluate('padConnect(0);padConnect(1)');pg.get_by_role('button',name='Play together',exact=True).click();pg.get_by_role('button',name='Two controllers',exact=True).click();pg.wait_for_function('mix.screen==="play"');pg.wait_for_timeout(2600)
            check('two local pad seats have distinct device assignments',pg.evaluate('game.players.length===2&&game.players[0].pad===0&&game.players[1].pad===1'))
            pg.evaluate('__pads[0].axes=[1,0,0,0];__pads[1].axes=[-1,0,0,0]');pg.wait_for_timeout(300);pg.evaluate('__pads[0].axes=[0,0,0,0];__pads[1].axes=[0,0,0,0]');check('simultaneous local heroes both respond',pg.evaluate('mix.world.players[0].m.x>1&&mix.world.players[1].m.x<19'))
            pg.screenshot(path=str(OUT/'coop-tv.png'));check('pad stand-in raises no native errors',not state_errors(pg),state_errors(pg));padctx.close()
            # Phone/tablet stand-ins, pointer cancellation and a second finger on chirp.
            for name,device in [('phone',p.devices['iPhone 13']),('tablet',p.devices['iPad (gen 7)'])]:
                touchctx=browser.new_context(**device);tp=touchctx.new_page();tp.goto(ARTIFACT.as_uri()+'?test=1');wait_title(tp);tp.screenshot(path=str(OUT/(name+'-title.png')))
                check(name+' menu actions fit viewport',tp.evaluate('Array.from(document.querySelectorAll(".esh-ttl button")).every(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight})'))
                tp.get_by_role('button',name='Play solo',exact=True).tap();tp.wait_for_function('mix.screen==="play"');tp.wait_for_timeout(2600)
                cdp=touchctx.new_cdp_session(tp);point=tp.evaluate('({x:innerWidth*.28,y:innerHeight*.65})');held={'x':point['x']+60,'y':point['y'],'id':91}
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[dict(point,id=91)]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[held]});tp.wait_for_timeout(300)
                check(name+' invisible drag steering moves hero',tp.evaluate('mix.world.players[0].m.x>1.5&&game.input.lastDevice==="touch"'))
                touch_id=tp.evaluate('mix.touch?.id')
                tp.evaluate("game.debug.command('stage',{index:3});mix.world.phase='playing';game.settings.set('autoChirp',false);mix.world.players[0].chirp=0;mix.world.reveal=0;mix.intentCache[0].a=false;mix.lastHUD='';mix.hud()")
                tp.wait_for_timeout(60);button=tp.locator('.mix-chirp').bounding_box();second={'x':button['x']+button['width']/2,'y':button['y']+button['height']/2,'id':92}
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[held,second]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[second]});tp.wait_for_timeout(120)
                check(name+' second finger chirps without losing steering contact',tp.evaluate('mix.touch?.id')==touch_id and tp.evaluate('mix.world.reveal>0'))
                cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});tp.wait_for_timeout(250)
                check(name+' pointer cancellation clears movement',tp.evaluate('mix.touch===null&&mix.intentCache[0].d===-1'))
                tp.screenshot(path=str(OUT/(name+'-play.png')));check(name+' native controls are error-free',not state_errors(tp),state_errors(tp));touchctx.close()
    except Exception as e:
        check('browser suite completed',False,str(e))
    finally:
        browser.close()
# A focused independent browser-engine pass; device profiles are stand-ins, not physical iOS claims.
if not SMOKE:
    with sync_playwright() as p:
        wk=p.webkit.launch(headless=True)
        try:
            c=wk.new_context(**p.devices['iPhone 13']);pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(ARTIFACT.as_uri()+'?test=1');wait_title(pg);pg.get_by_role('button',name='Play solo',exact=True).tap();pg.wait_for_function('mix.screen==="play"');pg.wait_for_timeout(2700);check('WebKit phone-profile boot and play',not errs and not state_errors(pg),errs);c.close()
        except Exception as e:check('WebKit focused pass',False,str(e))
        finally:wk.close()
report={'passed':passed,'failed':failed,'skipped':0,'failures':failures,'details':details}
(ROOT/'build/reports/browser.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
