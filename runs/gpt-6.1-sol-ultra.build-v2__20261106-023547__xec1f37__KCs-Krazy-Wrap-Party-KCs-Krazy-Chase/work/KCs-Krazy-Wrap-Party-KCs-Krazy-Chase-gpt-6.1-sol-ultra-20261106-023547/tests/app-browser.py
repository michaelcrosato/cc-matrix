"""Real assembled page, native screens, standard-pad and touch stand-ins."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
PROJECT = json.loads((DEV / 'project.json').read_text())
URL = (DEV.parent / (PROJECT['slug'] + '.html')).as_uri()
PAD = """window.testPads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.testPads});
window.makePad=(index)=>({index,id:'DualSense standard stand-in '+index,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))});"""

def run():
    checks=[]; errors=[]; requests=[]
    def check(name, ok, detail=''):
        checks.append({'name':name,'pass':bool(ok),'detail':detail})
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        ctx=browser.new_context(viewport={'width':1920,'height':1080})
        ctx.add_init_script(PAD)
        page=ctx.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:requests.append(r.url))
        page.goto(URL);page.wait_for_function('window.__garden?.game')
        page.evaluate('window.__garden.game.stop()')
        def advance(s=.05):page.evaluate('(s)=>__garden.game.advance(s,{draw:true})',s)
        def snap():return page.evaluate('__garden.debug.snapshot()')
        def select(label,touch=False):
            data=page.evaluate('''(label)=>{const a=__garden,d=a.debug.snapshot(),i=d.menu.items.indexOf(label),b=d.menu.rows[i],s=a.game.screen,rc=s.canvas.getBoundingClientRect();if(!b)throw Error('Missing menu '+label);return [(s.OX+(b[0]+b[2]/2)*s.S)/s.dpr+rc.left,(s.OY+(b[1]+b[3]/2)*s.S)/s.dpr+rc.top];}''',label)
            if touch:page.touchscreen.tap(*data)
            else:page.mouse.click(*data)
            advance()
        advance()
        check('final file:// artifact opens native title',snap()['mode']=='title')
        check('fresh music is 10 percent',snap()['audio']['musicVolume']==.1)
        # Hover comes from a real mouse event and moves the native focus.
        p=page.evaluate('''()=>{const b=__garden.debug.snapshot().menu.rows[2],s=__garden.game.screen;return [(s.OX+(b[0]+20)*s.S)/s.dpr,(s.OY+(b[1]+10)*s.S)/s.dpr]}''')
        page.mouse.move(*p);advance();check('mouse hover focuses native menu',snap()['menu']['i']==2)
        select('Settings');check('settings opens through title',snap()['shell']=='settings')
        page.keyboard.press('Escape');advance();check('settings back returns to title',snap()['shell'] is None and snap()['mode']=='title')
        select('About / Credits');about=page.locator('.esh').inner_text()
        check('About contains all required reporting sections',all(x.lower() in about.lower() for x in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback','added on import']))
        page.get_by_role('button',name='Source Information',exact=True).click();advance()
        check('controller-readable credits pages contain actual source metadata','PLAN.md' in page.locator('.esh').inner_text())
        page.get_by_role('button',name='Back to credits',exact=True).click();advance()
        page.keyboard.press('Escape');advance()
        select('Play');check('Play reaches movement immediately',snap()['mode']=='play' and snap()['status']=='playing')
        before=snap()['players'][0];page.keyboard.down('d');advance(.3);page.keyboard.up('d');advance()
        check('ordinary WASD moves keeper',snap()['players'][0]['x']>before['x'])
        # Preview clicking plants without requiring a modifier.
        page.evaluate('''()=>{const a=__garden,p=a.world.players[0],c=GardenSim.plantCell(a.world,p),l=a.view.layout(a.world),s=a.game.screen;window.plantPoint=[(s.OX+(l.x+(c[0]+.5)*l.cell)*s.S)/s.dpr,(s.OY+(l.y+(c[1]+.5)*l.cell)*s.S)/s.dpr];}''')
        page.mouse.click(*page.evaluate('plantPoint'));advance()
        check('clicking legal placement preview plants once',page.evaluate('__garden.world.stats.plants')==1)
        page.keyboard.press('Escape');advance();check('native pause opens and freezes standalone',snap()['paused'] and snap()['shell']=='pause')
        tick=snap()['tick'];advance(.4);check('pause stops simulation ticks',snap()['tick']==tick)
        page.get_by_role('button',name='Developer Tools',exact=True).click();advance()
        check('pause reaches Developer Tools',snap()['shell']=='dev')
        page.get_by_role('button',name='Live tuning sliders',exact=True).click();advance()
        sliders=page.locator('input[type=range]');check('all nine live sliders are present',sliders.count()==9)
        specifications=[('Keeper speed','playerSpeed',6.1),('Crawler speed','crawlerSpeed',3.9),('Sentry speed','sentrySpeed',4.7),('Sentry aggression','aggression',1.2),('Fright window','frightDuration',7),('Sentry recovery','recoveryDuration',3.5),('Bait chew','chewDuration',1.3),('Bite cooldown','biteCooldown',.7),('Team life cap','lives',5)]
        for label,key,value in specifications:
            page.get_by_role('slider',name=label,exact=True).fill(str(value));advance()
            check('live slider '+key+' changes simulation',abs(snap()['tuning'][key]-value)<.001)
        check('life count changes immediately and run is modified',snap()['lives']==5 and snap()['modified'])
        page.get_by_role('button',name='Reset Defaults',exact=True).click();advance()
        check('Reset Defaults restores complete tuning',page.evaluate('JSON.stringify(__garden.world.tuning)===JSON.stringify(GardenSim.defaults)'))
        page.get_by_role('slider',name='Keeper speed',exact=True).fill('7');advance()
        page.get_by_role('button',name='Back',exact=True).first.click();advance()
        page.get_by_role('button',name='Freeze simulation',exact=True).click();advance()
        page.evaluate('__garden.game.shell.hide();__garden.game.resume();__garden.debug.start()');advance(.15)
        check('New Run clears developer freeze and modified state',snap()['tick']>0 and not snap()['modified'])
        page.evaluate('__garden.debug.dev()');advance()
        page.get_by_role('button',name='Live tuning sliders',exact=True).click();advance()
        check('fresh-world developer sliders match actual default tuning',float(page.get_by_role('slider',name='Keeper speed',exact=True).input_value())==5.2 and not snap()['modified'])
        def clear_delay():
            page.evaluate('__garden.game.shell.hide();__garden.game.resume();__garden.debug.start();__garden.world.modified=true;__garden.world.status="clear"')
            advance(.05)
        clear_delay();page.keyboard.press('Escape');advance()
        page.get_by_role('button',name='Retry garden',exact=True).click();advance(1)
        check('Retry during clear delay cannot open a stale garden report',snap()['mode']=='play' and snap()['status']=='playing')
        clear_delay();page.evaluate('__garden.debug.dev()');advance()
        page.get_by_role('button',name='Choose garden',exact=True).click();advance()
        page.get_by_role('button',name='The Nibble Nursery',exact=True).click();advance()
        page.evaluate('__garden.world.status="clear"');advance(1)
        check('developer garden replacement resets clear transition latch',snap()['mode']=='report')
        clear_delay();page.evaluate('__garden.debug.dev()');advance()
        page.get_by_role('button',name='Reset actors',exact=True).click();advance()
        page.evaluate('__garden.world.status="clear"');advance(1)
        check('developer actor reset preserves future clear reports',snap()['mode']=='report')
        page.evaluate('__garden.game.shell.hide();__garden.game.resume();__garden.debug.title()');advance()
        select('Maze Workshop');check('workshop is playable native screen',snap()['mode']=='workshop')
        page.keyboard.press('Escape');advance();check('workshop Tools reachable by keyboard',snap()['shell']=='workshop')
        page.get_by_role('button',name='Validate',exact=True).click();advance();check('workshop template validates', 'approved' in page.locator('.esh').inner_text())
        page.get_by_role('button',name='Save / Load',exact=True).click();advance()
        page.get_by_role('button',name='Save garden 1',exact=True).click();advance()
        page.get_by_role('button',name='Load Wrap Garden 1',exact=True).click();advance();check('workshop save reload preserves named creation',snap()['mode']=='workshop' and snap()['shell'] is None)
        page.keyboard.press('Escape');advance();page.get_by_role('button',name='Playtest',exact=True).click();advance()
        check('workshop playtest shares simulation and protects records',snap()['mode']=='play' and snap()['custom'] and snap()['modified'])
        page.keyboard.press('Escape');advance();page.get_by_role('button',name='Return to workshop',exact=True).click();advance()
        check('return from playtest preserves edits',snap()['mode']=='workshop' and 'Wrap Garden 1' in page.evaluate('__garden.debug.workshopData()'))
        # Exact ten-second attract onset and consumed wake event.
        page.evaluate('__garden.debug.title()');advance(9.9);check('attract stays off before ten seconds',snap()['mode']=='title')
        advance(.2);check('attract starts after ten idle seconds',snap()['mode']=='attract')
        advance(62);check('attract tours two-crawler co-op scene',len(snap()['tails'])==2 and len(snap()['players'])==2)
        check('attract demonstrates bite catch wrap bait and co-op',all(snap()['attract'].values()),snap()['attract'])
        page.mouse.move(100,200);advance();check('mouse movement exits attract without starting play',snap()['mode']=='title')
        # Explicitly assigned independent physical pads.
        page.evaluate('testPads=[makePad(0),makePad(1)]');advance()
        select('Local Co-op');select('Two controllers');check('two pads create two simultaneous keepers',len(snap()['players'])==2)
        before=snap()['players'];page.evaluate('testPads[0].axes=[1,0,0,0];testPads[1].axes=[0,-1,0,0]');advance(.15)
        after=snap()['players'];check('two physical pads steer separate seats',after[0]['x']>before[0]['x'] and after[1]['y']<before[1]['y'])
        page.evaluate('testPads[0].axes=[0,0,0,0];testPads[1].axes=[0,0,0,0];__garden.game.settings.set("glyphs","xbox")');advance()
        check('Xbox prompt option follows last controller input',page.evaluate('__garden.game.input.label("plant")')=='A')
        page.evaluate('testPads[1].connected=false');advance();check('controller disconnect pauses standalone',snap()['paused'])
        page.get_by_role('button',name='Continue solo',exact=True).click();advance();check('disconnect can continue safely solo',len(snap()['players'])==1 and not snap()['paused'])
        page.evaluate('__garden.debug.title();testPads=[makePad(0)]');advance();select('Local Co-op');select('Keyboard + pad')
        check('keyboard and pad are assigned distinct seats',page.evaluate('__garden.game.input.pad===null && __garden.game.players[1].pad===0'))
        ctx.close()
        # Run a full campaign using a standard-mapped pad stub. The bot chooses only
        # directions/buttons; it never mutates world state or tunes the game.
        ctx=browser.new_context(viewport={'width':1280,'height':720});ctx.add_init_script(PAD);page=ctx.new_page();page.goto(URL);page.wait_for_function('window.__garden?.game');page.evaluate('__garden.game.stop()')
        campaign=page.evaluate('''()=>{
          const a=__garden,g=a.game;testPads=[makePad(0)];g.settings.set('sound',false);
          const button=(v)=>testPads[0].buttons[0]={pressed:v,touched:v,value:v?1:0};
          button(true);g.advance(1/60);button(false);g.advance(1/60);
          let reports=0,steps=0;
          for(;steps<14000;steps++){
            if(a.mode==='report') {reports++;button(false);testPads[0].axes=[0,0,0,0];g.advance(1/60);button(true);g.advance(1/60);button(false);g.advance(1/60);}
            if(a.mode==='victory'||a.mode==='defeat')break;
            const c=GardenSim.bot(a.world,1);testPads[0].axes=[...(c.dir||[0,0]),0,0];button(!!c.plant);g.advance(1/60);
          }
          testPads[0].axes=[0,0,0,0];button(false);g.advance(1/60,{draw:true});
          return {mode:a.mode,reports,steps,bites:a.world.stats.bites,modified:a.world.modified,errors:g.errors};
        }''')
        check('controller-only ordinary input campaign reaches true ending',campaign['mode']=='victory' and campaign['reports']==5,campaign)
        check('campaign ending clears all 47 tails without developer changes',campaign['bites']==47 and not campaign['modified'],campaign)
        check('full controller campaign has no engine errors',not campaign['errors'])
        record=page.evaluate('''()=>{const a=__garden,g=a.game,p=testPads[0];for(let i=0;i<3;i++){p.buttons[0]={pressed:false,value:0};g.advance(1/60);p.buttons[0]={pressed:true,value:1};g.advance(1/60);}p.buttons[0]={pressed:false,value:0};g.advance(1/60);return {entry:a.arcade.entry,records:a.arcade.table('solo')};}''')
        check('controller character picker saves solo score and name',record['entry'] is None and len(record['records'])==1 and record['records'][0]['score']>0)
        (DEV/'artifacts/controller-campaign.json').write_text(json.dumps(campaign,indent=2))
        ctx.close()
        # Phone/touch routes retain the full maze and no permanent giant deck.
        for profile in ['iPhone 13','iPhone 13 landscape','iPad (gen 7)']:
            ctx=browser.new_context(**pw.devices[profile]);page=ctx.new_page();page.goto(URL);page.wait_for_function('window.__garden?.game');page.evaluate('__garden.game.stop()');advance()
            select('Play',True)
            check(profile+' touch title reaches play',snap()['mode']=='play')
            b=page.evaluate('__garden.view.layout(__garden.world)');wh=page.evaluate('[__garden.game.screen.W,__garden.game.screen.H]')
            check(profile+' complete maze remains visible',b['x']>=0 and b['y']>=0 and b['x']+b['w']<=wh[0] and b['y']+b['h']<=wh[1])
            # Chromium dispatches real multitouch pointer sequences to native input.
            before=snap()['players'][0]
            cdp=ctx.new_cdp_session(page)
            height=page.viewport_size['height'];y=height-130
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':40,'y':y,'id':11}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':110,'y':y,'id':11}]})
            advance(.12)
            plant=page.locator('button[data-act=plant]').bounding_box()
            if plant:
                xx=plant['x']+plant['width']/2;yy=plant['y']+plant['height']/2
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':110,'y':y,'id':11},{'x':xx,'y':yy,'id':12}]})
                advance(.03)
                cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[{'x':110,'y':y,'id':11}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});advance()
            check(profile+' multitouch steering and planting works',page.evaluate('__garden.world.stats.plants')>=1 and snap()['players'][0]['x']>before['x'])
            page.screenshot(path=str(DEV/'artifacts'/('touch-'+profile.replace(' ','-').replace('(','').replace(')','')+'.png')))
            ctx.close()
        browser.close()
        # WebKit on a phone profile is explicitly a stand-in, not iOS Safari.
        browser=pw.webkit.launch(headless=True);ctx=browser.new_context(**pw.devices['iPhone 13']);page=ctx.new_page();page.goto(URL);page.wait_for_function('window.__garden?.game');page.evaluate('__garden.game.stop()');advance();select('Play',True)
        check('WebKit phone stand-in opens and plays assembled artifact',snap()['mode']=='play' and not snap()['errors'])
        ctx.close();browser.close()
    check('no page errors across ordinary device routes',not errors,errors)
    check('no audio files or project-relative module fetches',all(not any(x in u.lower() for x in ['.mp3','.wav','.ogg','/src/','/vendor/']) for u in requests))
    result={'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'failures':[c['name']+': '+str(c['detail']) for c in checks if not c['pass']],'checks':checks}
    (DEV/'artifacts/app-browser.json').write_text(json.dumps(result,indent=2))
    return result

if __name__=='__main__':
    result=run()
    for failure in result['failures']:print('FAIL '+failure)
    print(f"{result['passed']} passed, {result['failed']} failed (application browser)")
    raise SystemExit(1 if result['failed'] else 0)
