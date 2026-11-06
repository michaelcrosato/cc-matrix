# python3 tests/lib/shots.py name [name...]: screenshots of named scenes at 1920x1080 from the built file.
import sys, os, time
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
html = os.path.abspath(os.path.join(root, '..', os.path.basename(root) + '.html'))
FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
START = "const g=window.__GAME__;if(g.attract.active)g.attract.stop();g.vm.mapUp=0;const m=(id)=>{g.dev_startMission(id);g.missions.altPending=null;g.cheats.god=true;};"
SCENES = {
 'title': (START+"g.attract.active&&g.attract.stop();g.enterTitle('main');g.idle=-1e9;g.world.fire.ignite(-260,-300,14);", 25),
 'day': (START+"m('m3');g.world.setHour(11,true);g.combat.give('tractor',45,true);g.player.teleport(-180,120);g.player.setYaw(2.4,-0.02);", 16),
 'fight': (START+"m('m3');g.world.setHour(15,true);g.combat.give('tractor',25,true);g.story.pass=null;g.player.teleport(-225,35);g.player.setYaw(-1.57,0);g.world.sites.p2.dormant=false;g.updateBubble();g.vm.playGun('Unjam',true);", 16),
 'fire': (START+"m('m6');g.world.setHour(23,true);g.player.teleport(-330,-240);g.player.setYaw(-1.9,0.02);g.world.pinWind({dir:[0,1],speed:5});g.world.fire.ignite(-300,-300,16);g.world.fire.ignite(-250,-320,16);g.world.fire.ignite(-280,-270,14);", 24),
 'map': (START+"m('m1');g.missions.stepI=4;g.missions.beginStep();g.world.setHour(17,true);const v=g.vehicles.spawn('pickup',-60,35,-1.5,'clinic-truck');g.player.teleport(-60,32);g.vehicles.enter(v);g.player.mapUp=true;g.vm.mapUp=1;g.story.seen['pump-shed']=true;g.mapTex.draw();g.waypoint=[-255,225];g.ctx.camera.yaw=v.yaw+3.14;", 18),
 'rack': (START+"m('m3');g.missions.active=null;g.player.teleport(32,45);g.ui.push(window.__rack(g));", 14),
 'talk': (START+"m('m3');g.missions.active=null;const n=g.people.npcs.tibor;g.player.teleport(n.x-1,n.z+1.5);g.talk.startScene({speaker:'tibor',lines:['m2.brief'],skippable:false});g.talk.scene.dur=99;", 14),
 'surgery': (START+"m('m3');g.world.setHour(10,true);g.player.teleport(-180,120);g.player.setYaw(1,-0.5);g.cheats.god=false;g.player.hp=15;g.body.startSurgery();g.ctx.engine.manual=true;g.ctx.engine.step(100);g.ctx.engine.manual=false;", 8),
 'dev': (START+"m('m3');g.pause();const d=window.__dev(g);g.ui.push(d);d.tab=5;", 14),
 'driving': (START+"m('m2');g.world.setHour(9,true);const v=g.vehicles.spawn('technical',20,-20,2.4,'t');g.player.teleport(20,-22);g.vehicles.enter(v);g.ctx.camera.yaw=v.yaw+3.14;", 16),
 'scene-drag': (START+"m('m3');g.missions.active=null;g.world.setHour(16,true);g.cheats.god=false;g.cheats.invisible=true;g.player.teleport(-180,120);g.player.setYaw(1,-0.1);const b=g.buddies.state.mags;b.met=true;b.alive=true;b.spentUntil=-1;g.player.hp=1;g.damagePlayer(9,{});g.scenes.tl.speed=0.04;g.scenes.tl.seek(1.5);", 16),
 'scene-table': (START+"m('m9');g.world.setHour(22,true);g.missions.stepI=g.missions.active.steps.findIndex(s=>s.script==='m9Scene');g.missions.beginStep();g.scenes.tl.speed=0.04;g.scenes.tl.seek(3);", 16),
 'scene-end': (START+"m('end');g.story.ending='column';g.world.setHour(5.6,true);g.world.setWeather('clear');g.player.teleport(-560,-425);g.world.pinWind({dir:[-1,0],speed:6});g.world.fire.ignite(-580,-420,10);g.story.ending='column';g.missions.complete();g.scenes.tl.speed=0.04;g.scenes.tl.seek(6);", 16),
 'town': (START+"m('m3');g.missions.active=null;g.world.setHour(9.5,true);g.player.teleport(-8,-8);g.player.setYaw(-0.4,0);", 16),
 'fort': (START+"m('m3');g.missions.active=null;g.world.setHour(16,true);g.player.teleport(-430,-120);g.player.setYaw(0,0.02);", 16),
 'ending': (START+"m('m3');g.missions.active=null;g.story.ending='column';g.story.ledger.killed=47;g.story.ledger.moved=410;g.story.ledger.friends=2;g.story.ledger.stones=180;g.ctx.engine.timeScale=0;g.ui.push(window.__end(g));", 8),
 'storm': (START+"m('m9');g.world.setHour(22,true);g.player.teleport(-120,-490);g.player.setYaw(0.4,0.1);", 18),
 'card': ("const g=window.__GAME__;if(g.attract.active)g.attract.stop();g.ui.clear();let k=7;const s={kind:'hub',me:0,players:[{id:0,name:'ASTER',color:'#e8443a'},{id:1,name:'INES',color:'#3b82f6'},{id:2,name:'DOV',color:'#22c55e'}],host:0,isHost:true,server:false,seed:5,time:()=>-Infinity,rng:()=>()=>((k=(k*16807)%2147483647)/2147483647),send(){},on(ev,fn){if(ev==='card')setTimeout(()=>fn({left:17000,paused:false,ready:[1],asking:0,asked:false}),0);return()=>{}},ready(){},answer(){},finish(){},fail(){}};g.beginRoundFrom(s);", 14),
 'knife': (START+"m('m3');g.world.setHour(10,true);g.player.teleport(-180,120);g.player.setYaw(1,-0.5);g.cheats.god=false;g.player.hp=15;g.body.surgeryN=1;g.body.startSurgery();g.ctx.engine.manual=true;g.ctx.engine.step(140);g.ctx.engine.manual=false;", 8),
 'finger-before': (START+"m('m3');g.world.setHour(10,true);g.player.teleport(-180,120);g.player.setYaw(1,-0.5);g.cheats.god=false;g.player.hp=15;g.body.surgeryN=2;g.body.startSurgery();g.ctx.engine.manual=true;g.ctx.engine.step(96);g.ctx.engine.manual=false;", 8),
 'finger-after': (START+"m('m3');g.world.setHour(10,true);g.player.teleport(-180,120);g.player.setYaw(1,-0.5);g.cheats.god=false;g.player.hp=15;g.body.surgeryN=2;g.body.startSurgery();g.ctx.engine.manual=true;g.ctx.engine.step(134);g.ctx.engine.manual=false;", 8),
 'finger': (START+"m('m3');g.world.setHour(10,true);g.player.teleport(-180,120);g.player.setYaw(1,-0.5);g.cheats.god=false;g.player.hp=15;g.body.surgeryN=2;g.body.startSurgery();g.ctx.engine.manual=true;g.ctx.engine.step(110);g.ctx.engine.manual=false;", 8),
 'lighter': (START+"m('m3');g.world.setHour(10,true);g.player.teleport(-180,120);g.player.setYaw(1,-0.5);g.cheats.god=false;g.player.hp=15;g.body.lastDamageKind='fire';g.body.startSurgery();g.ctx.engine.manual=true;g.ctx.engine.step(130);g.ctx.engine.manual=false;", 8),
 'glyphs-ps': (START+"m('m3');g.missions.active=null;g.world.setHour(11,true);g.settings.glyphs='playstation';const s=window.__GAME__.world.sites['pump-shed'].def;g.story.flags['pump-shed']=true;g.player.teleport(s.at[0]-0.6,s.at[1]+0.8);g.player.lookAt(s.at[0]-1.5,g.world.land.heightAt(s.at[0],s.at[1])+0.6,s.at[1]+0.2);g.device='pad';g.player.hp=15;g.player.planted.push(g.spawnCharge(s.at[0]+9,g.world.land.heightAt(s.at[0],s.at[1]),s.at[1]));g.body.feverActive=true;g.body.feverIgnored=-1e9;g.story.feverOn=true;g.combat.current().jammed=true;g.combat.current().jamLeft=3;", 10),
 'glyphs-xb': (START+"m('m3');g.missions.active=null;g.world.setHour(11,true);g.settings.glyphs='xbox';const s=window.__GAME__.world.sites['pump-shed'].def;g.story.flags['pump-shed']=true;g.player.teleport(s.at[0]-0.6,s.at[1]+0.8);g.player.lookAt(s.at[0]-1.5,g.world.land.heightAt(s.at[0],s.at[1])+0.6,s.at[1]+0.2);g.device='pad';g.player.hp=15;g.player.planted.push(g.spawnCharge(s.at[0]+9,g.world.land.heightAt(s.at[0],s.at[1]),s.at[1]));g.body.feverActive=true;g.body.feverIgnored=-1e9;g.story.feverOn=true;g.combat.current().jammed=true;g.combat.current().jamLeft=3;", 10),
 'about1': (START+"m('m3');g.pause();g.ui.push(window.__about(g));", 6),
 'about2': (START+"m('m3');g.pause();const a=window.__about(g);g.ui.push(a);a.page=Math.floor(a.pages.length/2);", 6),
 'about3': (START+"m('m3');g.pause();const a=window.__about(g);g.ui.push(a);a.page=a.pages.length-1;", 6),
 'attract': ("window.__GAME__.idle=20;", 18),
}
names = sys.argv[1:] or list(SCENES)
with sync_playwright() as p:
    b = p.chromium.launch(args=FLAGS)
    for n in names:
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.goto('file://' + html)
        pg.wait_for_function('window.__PIXEL_READY__ !== undefined', timeout=90000); pg.evaluate('window.__PIXEL_READY__'); pg.wait_for_function('!!window.__GAME__', timeout=60000)
        js, wait = SCENES[n]
        pg.evaluate("(()=>{" + js + "})()")
        f0 = pg.evaluate('window.__PIXEL_ENGINE__.frame'); t0 = time.time()
        while time.time() - t0 < 240 and pg.evaluate('window.__PIXEL_ENGINE__.frame') - f0 < wait: time.sleep(1)
        pg.screenshot(path=f'{root}/tests/shots/{n}.png')
        print(n, errs[:2], pg.evaluate('window.__GAME__.status()'), pg.evaluate('window.__PIXEL_ENGINE__.errors.slice(0,2)'))
        pg.close()
    b.close()
