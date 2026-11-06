#!/usr/bin/env python3
"""One-browser gameplay verification. Prints failures and one count only."""
import json
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SELECTION = json.loads((ROOT / 'title-selection.json').read_text())
GAME = (ROOT.parent / (SELECTION['basename'] + '.html')).as_uri()
RESULT = {'checks': [], 'campaign': {}, 'errors': []}


def check(name, condition, detail=None):
    ok = bool(condition)
    RESULT['checks'].append({'name': name, 'pass': ok, 'detail': detail})
    if not ok:
        print('FAIL: ' + name + (': ' + str(detail) if detail is not None else ''))
    return ok


PAD_STUB = """(() => {
  window.__testPad={id:'Playwright standard pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__testPad]});
})();"""


def state(page):
    return page.evaluate('window.__game.state()')


def pad_button(page, index):
    page.evaluate('(i)=>{__testPad.buttons[i]={pressed:true,touched:true,value:1};__testPad.timestamp=performance.now();}', index)
    page.wait_for_timeout(220)
    page.evaluate('(i)=>{__testPad.buttons[i]={pressed:false,touched:false,value:0};}', index)
    page.wait_for_timeout(160)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--disable-dev-shm-usage'])
    context = browser.new_context(viewport={'width':1280,'height':720})
    page = context.new_page()
    page.add_init_script(PAD_STUB)
    page.on('pageerror', lambda error: RESULT['errors'].append(str(error)))
    try:
        page.goto(GAME, wait_until='load', timeout=60000)
        page.wait_for_function('window.__game && window.__game.state().ready', timeout=60000)
        initial = state(page)
        check('file:// boots into title', initial['ready'] and initial['mode']=='title' and initial['screen']=='title')
        check('WebGPU renderer initialized', initial['backend']=='WebGPU', initial['backend'])
        check('music starts at ten percent', initial['audio']['musicVolume']==0.1, initial['audio'])

        probe = page.evaluate("source=>import(URL.createObjectURL(new Blob([source],{type:'text/javascript'}))).then(module=>module.renderAudioProbe())", (ROOT/'audio.js').read_text())
        RESULT['audioProbe']=probe
        check('procedural audio renders finite non-silent output', probe.get('supported') and probe.get('finite') and 0.005<probe.get('rms',0)<0.5 and 0<probe.get('peak',0)<=1, probe)

        # Exact simulation stepping drives the actual Rapier collision world.
        page.evaluate('__game.start();__game.step(1)')
        before = state(page)
        page.keyboard.down('d')
        page.evaluate('__game.step(30)')
        page.keyboard.up('d')
        moved = state(page)
        check('keyboard moves ship through normal input', moved['ships'][0]['x']>before['ships'][0]['x']+3, moved['ships'])
        page.keyboard.down('Space')
        page.evaluate('__game.step(70)')
        page.keyboard.up('Space')
        check('keyboard firing creates shots and physics bodies', state(page)['shots']>0 and state(page)['physicsBodies']>1)
        page.keyboard.press('Escape')
        paused = state(page)
        page.evaluate('__game.step(60)')
        check('pause menu freezes simulation', paused['mode']=='paused' and paused['screen']=='pause' and state(page)['elapsed']==paused['elapsed'])
        page.locator('[data-screen="pause"] [data-action="dev"]').click()
        check('developer tools reachable from pause', state(page)['screen']=='dev')
        page.locator('[data-tune="enemySpeed"]').evaluate('(el)=>{el.value="1.75";el.dispatchEvent(new Event("input",{bubbles:true}));}')
        page.locator('[data-tune="damage"]').evaluate('(el)=>{el.value="2.5";el.dispatchEvent(new Event("input",{bubbles:true}));}')
        check('balance sliders update live state', state(page)['tuning']['enemySpeed']==1.75 and state(page)['tuning']['damage']==2.5)
        page.locator('[data-screen="dev"] [data-action="god"]').click()
        page.locator('[data-screen="dev"] [data-action="auto"]').click()
        check('developer toggles update live state', state(page)['tuning']['invincible'] and state(page)['tuning']['autoplay'])
        page.locator('[data-screen="dev"] [data-action="reset"]').click()
        defaults = state(page)['tuning']
        check('developer reset restores every default', defaults=={'enemySpeed':1,'bulletSpeed':1,'fireRate':1,'damage':1,'invincible':False,'autoplay':False}, defaults)
        page.keyboard.press('Escape')
        page.locator('[data-screen="pause"] [data-action="about"]').click()
        credits=page.locator('[data-screen="about"] .modal')
        check('credits open at the beginning',credits.evaluate('el=>el.scrollTop')==0)
        page.evaluate('__testPad.axes[3]=1')
        page.wait_for_timeout(260)
        page.evaluate('__testPad.axes[3]=0')
        scrolled=credits.evaluate('el=>el.scrollTop')
        check('controller right stick scrolls long credits',scrolled>0,scrolled)
        page.keyboard.press('PageUp')
        page.wait_for_timeout(60)
        check('PageUp scrolls long credits toward the beginning',credits.evaluate('el=>el.scrollTop')<scrolled,credits.evaluate('el=>el.scrollTop'))
        page.keyboard.press('Escape')
        page.keyboard.press('Escape')
        check('back returns from developer tools and credits through pause to play', state(page)['mode']=='playing' and state(page)['screen'] is None)

        # Actual campaign, with invulnerability and stronger shots but no clear/skip APIs.
        page.evaluate('__game.start();__game.tune({invincible:true,autoplay:true,fireRate:2,damage:2});__game.dash(1)')
        seen_waves=set()
        first_hit=None
        max_power=0
        for chunk in range(67):
            page.evaluate('__game.step(600)')
            current=state(page)
            seen_waves.add(current['wave'])
            max_power=max(max_power,current['ships'][0]['power'])
            if first_hit is None and current['hits']>0:
                first_hit={'elapsed':current['elapsed'],'shots':current['shots'],'hits':current['hits'],'kills':current['kills']}
            if current['mode'] in ('victory','defeat'):
                break
        campaign=state(page)
        RESULT['campaign']={'wavesSeen':sorted(seen_waves),'firstHit':first_hit,'state':campaign,'maxPowerObserved':max_power}
        check('friendly shots hit and kill through Rapier', first_hit is not None and first_hit['shots']>0 and first_hit['kills']>0, first_hit)
        check('scripted playthrough wins all six nights', campaign['mode']=='victory' and campaign['wave']>=6, {'mode':campaign['mode'],'wave':campaign['wave'],'elapsed':campaign['elapsed'],'enemies':campaign['enemies']})
        check('splitting demons exercised', campaign['runStats']['splits']>10, campaign['runStats'])
        check('real pickup collisions exercised', campaign['runStats']['pickups']>0, campaign['runStats'])
        check('dash and pulse mechanics exercised', campaign['runStats']['dashes']>0 and campaign['runStats']['pulses']>0, campaign['runStats'])
        check('all three boss phases exercised', campaign['runStats']['bossPhases']>=3, campaign['runStats'])
        check('victory offers replay with populated score', campaign['screen']=='results' and campaign['score']>0 and page.locator('#result-score').inner_text()!='000000')

        regression_runs=[]
        for attempt in range(2):
            page.evaluate('__game.start();__game.tune({invincible:true,autoplay:true,fireRate:2,damage:2})')
            for chunk in range(67):
                page.evaluate('__game.step(600)')
                sample=state(page)
                if sample['mode'] in ('victory','defeat'):
                    break
            regression_runs.append({key:sample[key] for key in ['mode','wave','elapsed','kills','runStats']})
        RESULT['campaignRegressions']=regression_runs
        check('two additional campaign runs finish without a stalled formation',all(run['mode']=='victory' for run in regression_runs),regression_runs)
        page.evaluate('__game.tune({invincible:false,autoplay:false,fireRate:1,damage:1});__game.attract()')
        for chunk in range(67):
            page.evaluate('__game.step(600)')
            demo=state(page)
            if demo['mode'] in ('victory','defeat'):
                break
        RESULT['attractPlaythrough']={key:demo[key] for key in ['mode','wave','elapsed','kills','runStats']}
        check('attract AI completes campaign at default weapon settings',demo['mode']=='victory',RESULT['attractPlaythrough'])
        check('attract showcases splitting pickups pulse dash and all boss phases',demo['runStats']['splits']>0 and demo['runStats']['pickups']>0 and demo['runStats']['pulses']>0 and demo['runStats']['dashes']>0 and demo['runStats']['bossPhases']>=3,demo['runStats'])

        # Co-op and failure/recovery are checked separately from the campaign.
        page.evaluate('__game.tune({invincible:false,autoplay:false,fireRate:1,damage:1});__game.start({coop:true});__game.step(1)')
        coop=state(page)
        page.keyboard.down('l')
        page.keyboard.down('i')
        page.evaluate('__game.step(30)')
        page.keyboard.up('l')
        page.keyboard.up('i')
        check('local co-op has independently controlled ships', len(coop['ships'])==2 and state(page)['ships'][1]['x']>coop['ships'][1]['x']+3 and state(page)['shots']>0)
        page.evaluate('for(let i=0;i<5;i++)__game.damage();__game.step(430)')
        check('downed co-op wingmate revives while partner survives', state(page)['mode']=='playing' and state(page)['ships'][0]['hp']==3, state(page)['ships'])
        page.evaluate('__game.start();for(let i=0;i<5;i++)__game.damage()')
        check('lost hull ends solo run with retry menu', state(page)['mode']=='defeat' and state(page)['screen']=='results')

        # Poll the standard mapping using the real controller code.
        page.evaluate('__game.title()')
        pad_button(page,13)
        focused_actions=page.locator('[data-screen="title"] button.selected').evaluate_all('els=>els.map(el=>el.dataset.action)')
        check('controller navigates title focus', focused_actions==['coop'], {'focus':focused_actions,'lastInput':state(page)['lastInput']})
        pad_button(page,0)
        accepted=state(page)['mode']=='playing' and len(state(page)['ships'])==2
        check('controller accepts focused menu item', accepted, {'screen':state(page)['screen'],'mode':state(page)['mode'],'ships':len(state(page)['ships'])})
        if not accepted:
            # Isolate later input checks after reporting the menu regression.
            page.evaluate('__game.start({coop:true})')
        page.evaluate('__testPad.axes[0]=-1;__testPad.buttons[0]={pressed:true,touched:true,value:1};__game.step(30);__testPad.axes[0]=0;__testPad.buttons[0]={pressed:false,touched:false,value:0}')
        controller=state(page)
        check('standard controller moves and fires', controller['ships'][0]['x']<-3 and controller['shots']>0, controller['ships'])
        check('controller switches on-screen prompts', controller['lastInput']=='pad' and '✕' in page.locator('#power-label').inner_text(), page.locator('#power-label').inner_text())
        pad_button(page,9)
        check('Options opens pause menu', state(page)['screen']=='pause')
        page.locator('[data-screen="pause"] [data-action="settings"]').click()
        page.locator('[data-screen="settings"] [data-action="glyphs"]').click()
        check('Xbox glyph preference is live', page.evaluate('__game.settings.glyphs')=='xbox')
        page.keyboard.press('Escape')
        page.keyboard.press('Escape')
        page.evaluate('__game.title();__game.live()')
        page.wait_for_function('__game.state().isAttract',timeout=14000)
        check('ten second idle starts AI attract mode', state(page)['isAttract'] and state(page)['mode']=='playing')
        page.keyboard.press('Space')
        check('any input exits attract mode to title', state(page)['mode']=='title' and not state(page)['isAttract'])
        check('audio events and synthesizer ran after input', state(page)['audio']['scheduledNotes']>0 and state(page)['audio']['state']=='running', state(page)['audio'])
        check('gameplay emitted no browser errors', not RESULT['errors'], RESULT['errors'])
    except Exception as error:
        check('gameplay test completed without exception',False,str(error))
        RESULT['exception']=traceback.format_exc()
    finally:
        context.close()

    # Touch gets its own fresh phone context in the same browser.
    touch_context=browser.new_context(**playwright.devices['iPhone 13'])
    touch_page=touch_context.new_page()
    touch_page.on('pageerror',lambda error:RESULT['errors'].append(str(error)))
    try:
        touch_page.goto(GAME,wait_until='load',timeout=60000)
        touch_page.wait_for_function('window.__game && __game.state().ready',timeout=60000)
        touch_page.locator('[data-action="solo"]').tap()
        touch_page.evaluate('__game.step(1)')
        touch_page.dispatch_event('canvas','touchstart',{'touches':[{'identifier':1,'clientX':120,'clientY':400}],'changedTouches':[{'identifier':1,'clientX':120,'clientY':400}]})
        touch_page.dispatch_event('canvas','touchmove',{'touches':[{'identifier':1,'clientX':220,'clientY':400}],'changedTouches':[{'identifier':1,'clientX':220,'clientY':400}]})
        touch_page.evaluate('__game.step(30)')
        touch=state(touch_page)
        check('phone touch drag steers and autofires',touch['lastInput']=='touch' and touch['ships'][0]['x']>3 and touch['shots']>0,touch['ships'])
        touch_page.dispatch_event('canvas','touchstart',{'touches':[{'identifier':1,'clientX':220,'clientY':400},{'identifier':2,'clientX':300,'clientY':400}],'changedTouches':[{'identifier':2,'clientX':300,'clientY':400}]})
        touch_page.evaluate('__game.step(1)')
        check('multitouch triggers dash',state(touch_page)['runStats']['dashes']>0,state(touch_page)['runStats'])
        touch_page.locator('#touch-pulse').tap()
        touch_page.evaluate('__game.step(1)')
        check('contact pulse action works',state(touch_page)['runStats']['pulses']>0,state(touch_page)['runStats'])
        touch_page.locator('#touch-menu').tap()
        check('touch menu opens pause',state(touch_page)['screen']=='pause')
    except Exception as error:
        check('touch test completed without exception',False,str(error))
        RESULT['touchException']=traceback.format_exc()
    finally:
        touch_context.close()
        browser.close()

RESULT['passed']=sum(check['pass'] for check in RESULT['checks'])
RESULT['failed']=len(RESULT['checks'])-RESULT['passed']
(ROOT/'gameplay-test-results.json').write_text(json.dumps(RESULT,indent=2))
print(f"Gameplay: {RESULT['passed']}/{len(RESULT['checks'])} checks passed")
raise SystemExit(1 if RESULT['failed'] else 0)
