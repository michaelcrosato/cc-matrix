from pathlib import Path
import json
import shutil
import traceback
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
checks = []
failures = []

def check(name, fn):
    try:
        detail = fn()
        checks.append({'name': name, 'pass': True, 'detail': detail})
    except Exception as exc:
        failures.append(name)
        checks.append({'name': name, 'pass': False, 'error': traceback.format_exc()})
        print(f'FAIL {name}: {exc}')

def require(value, message='assertion failed'):
    if not value:
        raise AssertionError(message)

PAD_SCRIPT = '''window.testPads=[];navigator.getGamepads=()=>window.testPads;
window.pad=(i)=>{const p={id:'DualSense standard',index:i,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};window.testPads[i]=p;return p;};'''

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    portable = ROOT / 'tests' / 'portable'
    portable.mkdir(exist_ok=True)
    shutil.copyfile(ROOT / 'game.html', portable / 'release.html')
    context = browser.new_context(viewport={'width': 1920, 'height': 1080}, offline=True)
    context.add_init_script(PAD_SCRIPT)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto((portable / 'release.html').as_uri() + '?backend=webgl')
    page.wait_for_function('window.Bomber?.ready', timeout=60000)
    page.evaluate('__game.stop()')

    def package():
        require(page.title() == 'B-17 Bomber Buddy')
        require(page.evaluate('My3D2dge.version') == '0.89.1')
        require(page.evaluate('__game.settings.music') == .1)
        require(page.evaluate('__game.settings.glyphs') == 'playstation')
        require(page.get_by_role('button', name='Play', exact=True).is_visible())
        require(not errors, str(errors))
        page.screenshot(path=str(ROOT / 'docs' / 'title.png'))
    check('Offline single-file package boots away from source with WebGL 2', package)

    def ui_launch():
        page.get_by_role('button', name='Play', exact=True).click()
        page.evaluate('__game.advance(.05,{draw:true})')
        require(page.evaluate('Bomber.mode') == 'brief')
        page.get_by_role('button', name='Route: DIRECT', exact=True).click()
        require(page.evaluate('Bomber.setup.route') == 'dogleg')
        page.get_by_role('button', name='Route: DOGLEG', exact=True).click()
        page.screenshot(path=str(ROOT / 'docs' / 'briefing.png'))
        page.get_by_role('button', name='Launch sortie', exact=True).click()
        page.keyboard.down('e')
        page.evaluate('__game.advance(18)')
        page.keyboard.up('e')
        page.evaluate('__game.advance(.1,{draw:true})')
        require(page.evaluate('Bomber.sim.aircraft.airborne'))
        require(not page.evaluate('Bomber.sim.ended'))
        page.screenshot(path=str(ROOT / 'docs' / 'cockpit.png'))
    check('Public menus and browser keyboard launch a real aircraft', ui_launch)

    def full_sortie():
        result = page.evaluate('''()=>{
          const game=__game,I=game.input,app=Bomber;app.mouseMoved=true;
          const route=(index)=>{I.clear();I.tap('map');game.advance(.025);for(let n=0;n<4&&app.contexts[0].mapIndex!==index;n++){I.tap('down');game.advance(.025);}I.tap('confirm');game.advance(.025);I.clear();};
          for(let n=0;n<7300&&!app.sim.ended;n++){
            const s=app.sim,a=s.aircraft,p=s.player(0),harbor=s.targets[0],near=Math.hypot(a.x-harbor.x,a.y-harbor.y)<2300*16;
            if(s.primaryComplete()&&!s.returning){route(0);continue;}
            const foe=s.enemies.find(e=>e.alive&&e.age>=0&&e.age<24),flak=s.flak.find(f=>!f.burst&&f.time>0);
            let seat='pilot';if(!s.primaryComplete()&&near)seat='bombs';else if(foe)seat=['nose','starboard','tail','port'][foe.bearing];if(flak)seat='pilot';
            const pred=near?s.predict():null;if(near&&!s.primaryComplete()&&harbor.parts.some(q=>!q.dead&&Math.hypot(pred.x-q.x,pred.y-q.y)<700*16))seat='bombs';
            if(p.station!==seat&&p.pending!==seat)I.tap(seat==='bombs'?'bombsight':seat);
            if(!flak&&!a.nav){route(s.returning?0:1);continue;}
            I.hold('down',!!flak&&p.station==='pilot');I.hold('throttleUp',a.throttle<.87);
            I.hold('fire',!!foe&&!!s.guns[p.station]&&!p.transition);
            if(foe&&s.guns[p.station]){
              const angle=['nose','starboard','tail','port'].indexOf(p.station)*Math.PI/2,lead=Math.hypot(foe.x-a.x,foe.y-a.y,foe.z-a.z)/(860*16);
              const dx=foe.x+(foe.vx-a.vx)*lead-a.x,dy=foe.y+(foe.vy-a.vy)*lead-a.y,dz=foe.z+(foe.vz-a.vz)*lead-a.z;
              const yaw=Math.atan2(Math.sin(Math.atan2(dy,dx)-a.heading-angle),Math.cos(Math.atan2(dy,dx)-a.heading-angle));const pitch=Math.atan2(dz,Math.hypot(dx,dy))-a.pitch;
              I.feed('move',game.W/2+yaw/.8*game.W/2,game.H/2-pitch/.6*game.H/2,{touch:false});I.lastDevice='mouse';
            }
            if(p.station==='bombs'&&!p.transition){if(!a.doorsOpen)I.tap('doors');const q=s.predict();if(harbor.parts.some(t=>!t.dead&&Math.hypot(q.x-t.x,q.y-t.y)<110*16))I.tap('fire');}
            if(a.fire>=0&&a.extinguisher)I.tap('extinguish');
            game.advance(.1);
          }
          I.clear();game.advance(.05,{draw:true});return {result:app.sim.result,stats:app.sim.stats,errors:game.errors,history:app.sim.history.filter(e=>['wave','release','target','phase'].includes(e.type))};
        }''')
        require(result['result'] and result['result']['won'], str(result))
        require(result['stats']['defense'] > 0, str(result))
        require(not result['errors'], str(result['errors']))
        page.screenshot(path=str(ROOT / 'docs' / 'debrief.png'))
        return result
    check('Complete sortie through native inputs, mouse feed, map and release', full_sortie)

    def dev_pause():
        page.get_by_role('button', name='Repair, rearm & fly again', exact=True).click()
        page.evaluate('__game.advance(.1)')
        page.keyboard.press('Escape')
        page.evaluate('__game.advance(.1)')
        require(page.evaluate('__game.paused'))
        page.get_by_role('button', name='Dev Mode', exact=True).click()
        old = page.evaluate('Bomber.sim.time')
        page.evaluate('__game.advance(2)')
        require(page.evaluate('Bomber.sim.time') == old)
        row = page.locator('.esh-row').filter(has_text='Fuel consumption')
        row.locator('input').fill('0.5')
        require(page.evaluate('Bomber.sim.balance.fuelBurn') == .5)
        page.get_by_role('button', name='Step simulation 1/120 s', exact=True).click()
        require(page.evaluate('Bomber.sim.time') > old)
        page.get_by_role('button', name='Reset live balance', exact=True).click()
        require(page.evaluate('Bomber.sim.balance.fuelBurn') == 1)
        page.get_by_role('button', name='Jump: bomb approach', exact=True).click()
        page.evaluate('__game.advance(.05)')
        page.keyboard.press('3')
        page.evaluate('__game.advance(.4,{draw:true})')
        require(page.evaluate('Bomber.sim.player(0).station') == 'bombs')
        page.screenshot(path=str(ROOT / 'docs' / 'bombsight.png'))
    check('Pause freezes, live balance resets, step and mission jump work', dev_pause)

    def stations():
        for key, seat in [('4','nose'),('5','starboard'),('6','tail'),('7','port')]:
            page.keyboard.press(key)
            page.evaluate('__game.advance(.4,{draw:true})')
            require(page.evaluate('Bomber.sim.player(0).station') == seat)
            page.screenshot(path=str(ROOT / 'docs' / ('gun-'+seat+'.png')))
        page.keyboard.press('m')
        page.evaluate('__game.advance(.1)')
        before = page.evaluate('Bomber.sim.aircraft.fuel')
        page.evaluate('__game.advance(2)')
        require(page.evaluate('Bomber.sim.aircraft.fuel') < before)
        page.keyboard.press('Escape')
        page.evaluate('__game.advance(.1)')
        require(not page.evaluate('__game.paused'))
        require(not page.evaluate('Bomber.contexts[0].map'))
    check('Four physical gun views, moving map and cancel route', stations)

    def map_and_cancel():
        old=page.evaluate('Bomber.sim.player(0).station')
        page.keyboard.press('3');page.evaluate('__game.advance(.05)');page.keyboard.press('Escape');page.evaluate('__game.advance(.1)')
        require(page.evaluate('Bomber.sim.player(0).station')==old)
        require(not page.evaluate('__game.paused'))
        page.keyboard.press('m');page.evaluate('__game.advance(.05,{draw:true})')
        bounds=page.locator('#screen').bounding_box()
        page.mouse.click(bounds['x']+106/640*bounds['width'],bounds['y']+107/360*bounds['height'])
        page.evaluate('__game.advance(.05)')
        require(page.evaluate('!!Bomber.contexts[0].mapPoint'))
        page.keyboard.press('Enter');page.evaluate('__game.advance(.05)')
        require(page.evaluate('Bomber.sim.routeName')=='point')
        page.keyboard.press('Escape');page.evaluate('__game.advance(.1)')
        page.get_by_role('button',name='Dev Mode',exact=True).click()
        page.get_by_role('button',name='Free exterior camera: OFF',exact=True).click()
        page.locator('.esh-btns').get_by_role('button',name='Back',exact=True).click()
        page.get_by_role('button',name='Resume',exact=True).click()
        page.evaluate('__game.advance(.1,{draw:true})')
        before=page.evaluate('({...Bomber.view.freePose})')
        page.keyboard.down('w');page.evaluate('__game.advance(1)');page.keyboard.up('w')
        after=page.evaluate('({...Bomber.view.freePose})')
        require(abs(after['x']-before['x'])+abs(after['y']-before['y'])>10)
        page.keyboard.press('v');page.evaluate('__game.advance(.05)')
        require(not page.evaluate('Bomber.sim.cheats.freeCamera'))
    check('Map click commits a custom waypoint; transitions cancel; free camera flies',map_and_cancel)

    def coop():
        page.evaluate('Bomber.toTitle();__game.advance(.05);pad(0);pad(1);__game.input.pad=0;__game.advance(.05)')
        page.get_by_role('button', name='Co-op', exact=True).click()
        page.get_by_role('button', name='Ready crew → briefing', exact=True).click()
        page.get_by_role('button', name='Launch sortie', exact=True).click()
        page.evaluate('__game.advance(.5,{draw:true})')
        require(page.evaluate('__game.viewports.length') == 2)
        require(page.evaluate('Bomber.sim.players.length') == 2)
        page.evaluate('testPads[0].axes[0]=.8;testPads[1].axes[2]=-.6;testPads[1].buttons[7]={pressed:true,value:1};__game.advance(.4,{draw:true})')
        require(page.evaluate('Bomber.sim.aircraft.bank') > 0)
        require(page.evaluate('Bomber.sim.player(1).aimYaw') < 0)
        require(page.evaluate('Bomber.sim.guns.tail.ammo') < 480)
        page.screenshot(path=str(ROOT / 'docs' / 'couch-coop.png'))
        page.evaluate('testPads[0].axes[0]=0;testPads[1].axes[2]=0;testPads[1].buttons[7]={pressed:false,value:0};testPads[1].buttons[9]={pressed:true,value:1};__game.advance(.1)')
        require(page.evaluate('__game.paused'))
        require(page.evaluate('__game.pausedBy') == 2)
        page.evaluate('testPads[1].buttons[9]={pressed:false,value:0};__game.advance(.1);testPads[1].buttons[0]={pressed:true,value:1};__game.advance(.1)')
        require(not page.evaluate('__game.paused'))
        page.evaluate('testPads[0].buttons[4]={pressed:true,value:1};testPads[0].buttons[5]={pressed:true,value:1};__game.advance(1.7);testPads[0].buttons[4]={pressed:false,value:0};testPads[0].buttons[5]={pressed:false,value:0}')
        require(page.evaluate('Bomber.sim.aircraft.bombs')==0)
        page.evaluate('testPads[1].buttons[0]={pressed:false,value:0};testPads[1].connected=false;__game.advance(.1)')
        require(page.evaluate('Bomber.sim.owners.tail') is None)
        require(page.evaluate('Bomber.sim.players.length') == 1)
        page.evaluate('Bomber.toTitle();__game.advance(.1);testPads=[];pad(0);__game.input.lastDevice="keyboard";Bomber.coop=true;Bomber.startSortie();__game.advance(.1);testPads[0].axes[2]=.6;testPads[0].buttons[7]={pressed:true,value:1}')
        page.keyboard.down('a');page.evaluate('__game.advance(.4)');page.keyboard.up('a')
        require(page.evaluate('__game.input.pad') is None)
        require(page.evaluate('Bomber.sim.aircraft.bank')<0)
        require(page.evaluate('Bomber.sim.player(1).aimYaw')>0)
        page.evaluate('__game.settings.set("glyphs","xbox")')
        require(page.evaluate('__game.players[1].label("fire")')=='RT')
        page.evaluate('__game.settings.set("glyphs","playstation");testPads[0].axes[2]=0;testPads[0].buttons[7]={pressed:false,value:0}')
        return page.evaluate('Bomber.inspect().native')
    check('Two pads, split views, input isolation, pause owner and disconnect', coop)

    def audio():
        page.evaluate('Bomber.toTitle();__game.advance(.1);testPads=[];Bomber.startSortie();__game.advance(.1)')
        page.keyboard.press('e')
        page.evaluate('__game.advance(.2)')
        page.wait_for_timeout(250)
        data=page.evaluate('Bomber.sound.inspect()')
        require(data['engines'] == 4, str(data))
        require(data['musicGain'] == .1, str(data))
        require(data['peak'] > 0, str(data))
        page.evaluate('Bomber.sim.finish("deadline");__game.advance(.1)')
        data=page.evaluate('Bomber.sound.inspect()')
        require(data['sources'] == 0 and data['stopped'], str(data))
        return data
    check('Web Audio analyser receives synthesis and terminal cleanup is silent', audio)

    def attract():
        page.evaluate('Bomber.toTitle();__game.advance(.1);Bomber.idle=performance.now()-10001;__game.advance(.1)')
        require(page.evaluate('Bomber.mode') == 'attract')
        page.evaluate('__game.advance(49,{draw:false})')
        beats=page.evaluate('[...new Set([...(Bomber.attractLastBeats||[]),...Bomber.attractBeats])]')
        require(all(b in beats for b in ['takeoff','wave','flak-warning','release','impact']), str(beats))
        page.keyboard.press('Enter')
        page.evaluate('__game.advance(.1)')
        require(page.evaluate('Bomber.mode') == 'title')
        require(page.evaluate('Bomber.ui.screen') == 'title')
        require(not page.evaluate('Bomber.sim.cheated'))
        return beats
    check('Ten-second attract entry, real showcase and consumed exit input', attract)
    check('No browser or native errors', lambda: require(not errors and not page.evaluate('__game.errors.length'), str(errors)))
    context.close()

    def touch():
        ctx=browser.new_context(**pw.devices['iPhone 13'],offline=True)
        p=ctx.new_page();p.goto((portable/'release.html').as_uri()+'?backend=webgl');p.wait_for_function('window.Bomber?.ready',timeout=60000);p.evaluate('__game.stop()')
        p.get_by_role('button',name='Play',exact=True).tap();p.get_by_role('button',name='Launch sortie',exact=True).tap();p.evaluate('__game.advance(.4,{draw:true})')
        require(p.evaluate('Bomber.sim.aircraft.throttle')>.8)
        p.get_by_role('button',name='Station',exact=True).tap();p.get_by_role('button',name='Bombardier',exact=True).tap();p.evaluate('__game.advance(.4,{draw:true})')
        require(p.evaluate('Bomber.sim.player(0).station')=='bombs')
        p.get_by_role('button',name='Open doors',exact=True).tap();p.evaluate('__game.advance(2,{draw:true})')
        p.get_by_role('button',name='Station',exact=True).tap();p.get_by_role('button',name='Pilot',exact=True).tap();p.evaluate('__game.advance(.4,{draw:true})')
        cdp=ctx.new_cdp_session(p)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':60,'y':380,'id':1},{'x':310,'y':380,'id':2}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':100,'y':400,'id':1},{'x':350,'y':350,'id':2}]})
        p.evaluate('__game.advance(.2)')
        require(p.evaluate('Bomber.touchPoints.size')==2)
        require(p.evaluate('Bomber.touchMove[0]')>.2)
        require(p.evaluate('Bomber.touchAim[0]')>.2)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        p.evaluate('__game.advance(.1,{draw:true})')
        require(p.evaluate('Bomber.touchPoints.size')==0)
        p.screenshot(path=str(ROOT/'docs'/'phone.png'))
        p.get_by_role('button',name='Station',exact=True).tap();p.get_by_role('button',name='Emergency actions',exact=True).tap()
        hold=p.get_by_role('button',name='Hold to jettison payload',exact=True).bounding_box()
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':hold['x']+hold['width']/2,'y':hold['y']+hold['height']/2,'id':3}]})
        p.evaluate('__game.advance(1.7)')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        require(p.evaluate('Bomber.sim.aircraft.bombs')==0)
        require(p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        ctx.close()
    check('Touch phone: same menus, station action and doors without a pad overlay',touch)
    browser.close()

(ROOT/'docs'/'browser-verification.json').write_text(json.dumps({'count':len(checks),'failed':len(failures),'checks':checks},indent=2))
print(f'{len(checks)-len(failures)}/{len(checks)} browser checks passed; {len(failures)} failures')
raise SystemExit(bool(failures))
