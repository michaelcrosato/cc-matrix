import json, pathlib, sys
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent
HTML=ROOT.parent/(ROOT.name+'.html')
failures=[]; checks=0

def require(v,msg):
    if not v: raise AssertionError(msg)

def check(name,fn):
    global checks
    checks+=1
    try: fn()
    except Exception as e:
        failures.append(name+': '+str(e).splitlines()[0]);print('FAIL '+failures[-1],flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
    ctx=browser.new_context(viewport={'width':1600,'height':1000})
    page=ctx.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''window.__pad={id:'Test Standard Gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};navigator.getGamepads=()=>[window.__pad];''')
    page.goto(HTML.as_uri(),wait_until='load');
    try: page.wait_for_function('window.__hockey && __hockey.frames>3',timeout=60000)
    except Exception:
        failures.append('boot: '+page.locator('#loading').inner_text())
        print('\n'.join(failures)); print('0 passed, 1 failed'); browser.close();sys.exit(1)
    def presspad(n,held=100):
        page.evaluate('(n)=>{__pad.buttons[n]={pressed:true,touched:true,value:1}}',n);page.wait_for_timeout(held)
        page.evaluate('(n)=>{__pad.buttons[n]={pressed:false,touched:false,value:0}}',n);page.wait_for_timeout(100)
    def boot():
        require(page.title().startswith('Hockey Ruckus'),'correct game page')
        require(page.evaluate('__hockey.backend')=='WebGPU','native WebGPU backend')
        require(page.locator('.titlePanel h1').inner_text().replace('\n','')=='HOCKEYRUCKUS','title')
        require(page.evaluate('__hockey.art.players.length')==4,'four animated skaters')
        require(not errors,'page errors: '+repr(errors))
    check('native WebGPU boot, correct page and animated rink',boot)
    def controller_menu():
        presspad(0);require(page.evaluate('__hockey.view')=='cup','cross selects cup')
        presspad(0);require(page.evaluate('__hockey.view')=='play','cross starts cup')
        require(page.evaluate('__hockey.input.type')=='gamepad','pad detected')
        require(page.locator('[data-prompt="shoot"]').first.inner_text()=='×','PlayStation glyph')
        page.evaluate('__hockey.game.phase="play";__hockey.game.owner=-1;__hockey.game.selected[0]=1;__hockey.game.switchLock[0]=2')
        before=page.evaluate('__hockey.game.players[1].x')
        page.evaluate('__pad.axes[0]=1');page.wait_for_function(f'__hockey.game.players[1].x>{before+1}',timeout=7000);page.evaluate('__pad.axes[0]=0');
        require(page.evaluate('__hockey.game.players[1].x')>before+1,'left stick moves selected skater')
    check('controller menus, glyphs and skating',controller_menu)
    def keyboard_mouse():
        page.evaluate('__hockey.game.takePuck(1);__hockey.game.ai=[false,false];__hockey.game.players[1].x=6;__hockey.game.players[1].z=0')
        page.keyboard.down('Space');page.wait_for_function('__hockey.game.players[1].charge>.25',timeout=7000)
        require(page.evaluate('__hockey.game.players[1].charge')>.25,'held shot charges')
        page.keyboard.up('Space');page.wait_for_timeout(130)
        require(page.evaluate('__hockey.game.stats[0].shots')>=1,'release fires a shot')
        require(page.locator('[data-prompt="shoot"]').first.inner_text()=='SPACE','keyboard prompt switches')
        page.evaluate('__hockey.game.takePuck(1)')
        page.mouse.move(1300,500);page.mouse.down();page.wait_for_timeout(250);page.mouse.up();page.wait_for_timeout(80)
        require(page.evaluate('__hockey.game.stats[0].shots')>=2,'mouse shoots')
        page.evaluate('__hockey.game.takePuck(1)');page.keyboard.press('e');page.wait_for_timeout(100)
        require(page.evaluate('__hockey.game.stats[0].passes')>=1,'keyboard passes')
    check('keyboard and mouse charge, release, aiming and pass',keyboard_mouse)
    def shot_guide():
        page.evaluate('__hockey.act("startLocal");__hockey.game.phase="play";__hockey.game.players[3].x=6;__hockey.game.players[3].z=-4;__hockey.game.takePuck(3)')
        page.keyboard.down('j')
        page.wait_for_function('__hockey.game.players[3].charge>.2',timeout=5000)
        direction=page.evaluate('({x:Math.cos(-__hockey.art.aim.rotation.y),z:Math.sin(-__hockey.art.aim.rotation.y)})')
        require(direction['x']<0 and direction['z']>0,'away aim guide faces left and into rink')
        page.keyboard.up('j');page.wait_for_function('__hockey.game.stats[1].shots>0',timeout=4000)
        velocity=page.evaluate('__hockey.game.puck')
        require(velocity['vx']<0 and velocity['vz']>0,'actual away shot follows guide')
    check('away-team shot guide matches the shared 32-angle shot calculation',shot_guide)
    def pause_dev():
        page.keyboard.press('Escape');require(page.evaluate('__hockey.paused'),'pause enters')
        seconds=page.evaluate('__hockey.game.seconds');page.wait_for_timeout(220)
        require(page.evaluate('__hockey.game.seconds')==seconds,'offline clock stops')
        page.get_by_role('button',name='DEV BENCH',exact=True).click()
        page.locator('[data-param="skateSpeed"]').fill('13')
        require(page.evaluate('__hockey.game.params.skateSpeed')==13,'slider applies live')
        page.get_by_role('button',name='RESET DEFAULTS',exact=True).click()
        require(page.evaluate('__hockey.game.params.skateSpeed')==8.6,'default reset')
        page.get_by_role('button',name='BACK TO PAUSE',exact=True).click()
        page.get_by_role('button',name='SETTINGS',exact=True).click()
        page.get_by_role('button',name='PlayStation',exact=True).click()
        require(page.get_by_role('button',name='Xbox',exact=True).count()==1,'Xbox toggle')
        page.get_by_role('button',name='Xbox',exact=True).click()
        page.get_by_role('button',name='BACK',exact=True).click()
        page.get_by_role('button',name='BACK ON THE ICE',exact=False).click()
        require(page.evaluate('__hockey.view')=='play' and not page.evaluate('__hockey.paused'),'resume')
    check('pause freezes game, live dev sliders, reset, settings and resume',pause_dev)
    def attract():
        page.evaluate('__hockey.act("title");__hockey.setIdle(10.1)');page.wait_for_timeout(150)
        require(page.evaluate('__hockey.attract'),'attract starts after ten seconds')
        before=page.evaluate('__hockey.game.elapsed');page.wait_for_timeout(400)
        require(page.evaluate('__hockey.game.elapsed')>before,'AI demo plays')
        page.keyboard.press('Escape');page.wait_for_timeout(70)
        require(page.evaluate('__hockey.view')=='title' and not page.evaluate('__hockey.attract'),'any input exits demo')
    check('ten-second AI attract mode and input exit',attract)
    def practice():
        page.evaluate('__hockey.act("startPractice")');require(page.evaluate('__hockey.game.trainingStep')==0,'practice starts')
        page.keyboard.down('d');page.wait_for_function('__hockey.game.trainingStep===1',timeout=7000);page.keyboard.up('d');page.wait_for_timeout(100)
        require(page.evaluate('__hockey.game.trainingStep')==1,'move lesson completes')
        page.keyboard.press('e');page.wait_for_function('__hockey.game.trainingStep===2',timeout=3000)
        require(page.evaluate('__hockey.game.trainingStep')==2,'pass lesson completes')
        page.keyboard.down('Space');page.wait_for_function('__hockey.game.players[1].charge>.25',timeout=5000);page.keyboard.up('Space');page.wait_for_function('__hockey.game.trainingStep===3',timeout=3000)
        require(page.evaluate('__hockey.game.trainingStep')==3,'shot lesson completes')
        page.keyboard.press('ShiftLeft');page.wait_for_function('__hockey.game.trainingStep===4',timeout=3000)
        require(page.evaluate('__hockey.game.trainingStep')==4,'check lesson completes')
        page.mouse.move(1370,510);page.keyboard.down('Space');page.wait_for_timeout(500);page.keyboard.up('Space')
        page.wait_for_function('__hockey.view==="result"',timeout=6000)
        require(page.get_by_text('READY TO RUCKUS.',exact=True).count()==1,'practice complete screen')
    check('full guided practice through real keyboard controls',practice)
    def cup_playthrough():
        page.evaluate('__hockey.act("title");__hockey.act("startCup")')
        for round_number in range(3):
            require(page.evaluate('__hockey.game.round')==round_number,'correct cup round')
            page.evaluate('''()=>{const g=__hockey.game;g.ai=[false,false];g.phase='play';g.owner=-1;g.noPickup=2;g.body.setTranslation({x:17.8,y:.25,z:0},true);g.body.setLinvel({x:20,y:0,z:0},true)}''')
            page.wait_for_function('__hockey.game.scores[0]===1',timeout=5000)
            page.evaluate('__hockey.game.phase="play";__hockey.game.seconds=.05')
            page.wait_for_function('__hockey.view==="result"',timeout=5000)
            if round_number<2:
                page.get_by_role('button',name='NEXT RINK',exact=False).click()
            else:
                require(page.get_by_text('THE TIN IS YOURS!',exact=True).count()==1,'cup champion screen')
                require(page.evaluate('JSON.parse(localStorage.getItem("hr-cup"))') is True,'champion saved')
        page.get_by_role('button',name='BACK TO THE CLUBHOUSE',exact=True).click()
        page.evaluate('__hockey.act("startCup");__hockey.game.scores=[0,1];__hockey.game.seconds=.01;__hockey.game.phase="play"')
        page.wait_for_function('__hockey.view==="result"',timeout=5000)
        page.get_by_role('button',name='REMATCH',exact=False).click()
        require(page.evaluate('__hockey.game.round===0 && __hockey.game.scores[0]===0 && __hockey.view==="play"'),'cup loss retries same rink')
        page.evaluate('__hockey.act("title")')
    check('entire three-rink cup progression, trophy, save and loss retry',cup_playthrough)
    def about():
        page.evaluate('__hockey.act("title");__hockey.act("about")')
        for h in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback']:
            require(page.get_by_text(h,exact=True).count()==1,'credits '+h)
        require(page.get_by_text('added on import',exact=True).count()==1,'usage placeholder specified')
        page.evaluate('__hockey.act("title")')
    check('required source and feedback in About screen',about)
    def audio():
        result=page.evaluate('__hockey.renderAudioProbe()')
        require(result['musicVolume']==.1,'default 10% music')
        for k in ['music','effects','voice']:
            require(result[k]['rms']>.0001,k+' audible samples')
            require(result[k]['peak']<1,k+' unclipped')
            require(result[k]['nonFinite']==0,k+' finite')
    check('offline synthesized music, effects and gibberish voice',audio)
    def stability():
        require(not errors,'runtime errors: '+repr(errors))
        require(page.evaluate('__hockey.frames')>100,'render loop remains live')
    check('assembled app remains free of runtime exceptions',stability)
    ctx.close()
    ctx=browser.new_context(viewport={'width':844,'height':390},has_touch=True,is_mobile=True,device_scale_factor=1)
    page=ctx.new_page();page.goto(HTML.as_uri());page.wait_for_function('window.__hockey',timeout=60000)
    def touch():
        for button in page.locator('.titlePanel button').all():
            box=button.bounding_box();require(box['y']>=0 and box['y']+box['height']<=390,'landscape title fits')
        page.evaluate('__hockey.act("startPractice")')
        client=ctx.new_cdp_session(page)
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':160,'y':260}]})
        client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':215,'y':260}]})
        page.wait_for_timeout(700)
        require(page.evaluate('__hockey.input.type')=='touch','touch input recognized')
        require(page.evaluate('__hockey.game.players[1].x')>-2,'invisible thumb stick moves')
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        require(page.locator('#touchAction').is_visible(),'context action visible')
        require(not page.locator('#playPrompts').is_visible(),'touch screen clear')
        page.evaluate('__hockey.game.takePuck(1);__hockey.game.training=false;__hockey.game.phase="play"')
        box=page.locator('#touchAction').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        page.wait_for_timeout(350)
        require(page.evaluate('__hockey.game.players[1].charge')>.1,'touch hold charges')
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(100)
        require(page.evaluate('__hockey.game.stats[0].shots')>0,'touch release shoots')
    check('landscape touch steering, contextual action and charge release',touch)
    ctx.close();browser.close()
print(f'{checks-len(failures)} passed, {len(failures)} failed ({checks} browser checks)')
sys.exit(bool(failures))
