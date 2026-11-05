# Screenshots of each screen, for what a script cannot judge (layout, legibility). Usage:
#   python3 tools/shots.py <game.html> <out-dir> [scene ...]
# Loads the built page from file://, jumps to each scene through the game's own handle, and saves a PNG of each.
import sys, os
from playwright.sync_api import sync_playwright

html, out = sys.argv[1], sys.argv[2]
want = sys.argv[3:] or ['title', 'campaign-tidings', 'campaign-muster', 'battle', 'battle-target', 'event', 'help', 'dev', 'about', 'attract', 'ending']
os.makedirs(out, exist_ok=True)
SETUP = {
  'title': "game.go('title')",
  'campaign-tidings': "game.debug.newCampaign({humans:['verdance'],seed:5}); game.go('campaign',{})",
  'campaign-muster': "game.debug.newCampaign({humans:['verdance'],seed:5}); game.go('campaign',{}); setTimeout(()=>{ try{ game.scene.phase='muster'; game.scene.enterPhase(); }catch(e){} }, 900)",
  'battle': "game.debug.startBattle({map:'meadow',season:'spring',seed:9,sides:[{troops:[{kind:'knight',ref:'oren',leader:true},{kind:'knight',ref:'bryony'},{kind:'monster',ref:'gleam-slime',form:0},{kind:'monster',ref:'thorn-hare',form:0}]},{troops:[{kind:'knight',ref:'shade',leader:true},{kind:'knight',ref:'ashen'},{kind:'monster',ref:'dusk-bat',form:0},{kind:'monster',ref:'cinder-imp',form:0}]}]})",
  'battle-target': "game.debug.startBattle({map:'ford',season:'summer',seed:4,sides:[{troops:[{kind:'knight',ref:'oren',leader:true},{kind:'knight',ref:'bryony'},{kind:'monster',ref:'gleam-slime',form:0}]},{troops:[{kind:'knight',ref:'shade',leader:true},{kind:'monster',ref:'dusk-bat',form:0}]}]})",
  'event': "game.go('event',{lines:G_TUT()})",
  'help': "game.go('help')", 'dev': "game.go('dev')", 'about': "game.go('about')", 'attract': "game.go('attract')",
  'ending': "game.go('ending',{outcome:'won'})",
  'sanctum': "game.debug.startBattle({map:'clockwork-sanctum',season:'winter',seed:3,sides:[{troops:[{kind:'knight',ref:'oren',leader:true},{kind:'knight',ref:'bryony'},{kind:'monster',ref:'gleam-slime',form:0}]},{troops:[{kind:'knight',ref:'gray',leader:true},{kind:'monster',ref:'stone-golem',form:1}]}]})",
  'choice': "game.go('event',{event:'season-4'})",
  'gallery': "game.go('gallery')",
  'pass': "game.debug.newCampaign({humans:['verdance','solmark'],seed:5}); game.go('campaign',{}); setTimeout(()=>{ game.scene.phase='pass'; game.scene.enterPhase(); }, 900)",
}
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto('file://' + os.path.abspath(html))
    pg.wait_for_timeout(1500)
    for name in want:
        js = "(()=>{ const game = My3D2dge.current; const G_TUT=()=>My3D2dge.Brigantime.TUTORIAL_LINES; " + SETUP[name] + "; })()"
        pg.evaluate(js)
        pg.wait_for_timeout(1400)
        if name == 'battle-target':
            # wait for the player's own turn, then open its command menu and choose the first command (Attack)
            for _ in range(60):
                ready = pg.evaluate("(()=>{ const b = My3D2dge.current.scene; return !!(b && b.mode === 'move' && b.cur && b.cur() && b.cur().side === 0 && !b.board.busy && !b.board.queue.length && !b.board.walk); })()")
                if ready: break
                pg.wait_for_timeout(500)
            pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
            pg.keyboard.press('Enter'); pg.wait_for_timeout(900)
        if name == 'campaign-muster':
            pg.wait_for_timeout(600)
        pg.screenshot(path=os.path.join(out, name + '.png'))
        print('shot', name)
    print('errors:', errors[:5] if errors else 'none')
    b.close()
