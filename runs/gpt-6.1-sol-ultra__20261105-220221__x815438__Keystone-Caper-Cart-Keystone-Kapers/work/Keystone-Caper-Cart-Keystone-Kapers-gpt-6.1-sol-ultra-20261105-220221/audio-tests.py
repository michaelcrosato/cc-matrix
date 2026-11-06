from pathlib import Path
from playwright.sync_api import sync_playwright

failures = []
checks = 0

def check(label, value):
    global checks
    checks += 1
    if not value:
        failures.append(label)

source = Path(__file__).with_name('audio.js').read_text().replace('export class AudioDirector', 'class AudioDirector') + '\nwindow.AudioDirector = AudioDirector;'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page()
    page.set_content('<button id="start">Start sound</button>')
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_script_tag(content=source)
    probe = page.evaluate('AudioDirector.renderProbe()')
    check('Offline synthesis is supported', probe.get('supported'))
    check('Synthesis contains no NaN or infinity', probe.get('finite'))
    check('Synthesized audio has an audible signal and stays below clipping', 0.001 < probe.get('rms', 0) < 0.3 and 0.02 < probe.get('peak', 0) < 1)
    check('Music starts at 10 percent', probe.get('musicVolume') == 0.10)
    page.evaluate('window.audio = new AudioDirector(); document.querySelector("button").onclick = () => audio.unlock();')
    page.click('#start')
    page.evaluate('''() => {
      audio.update(1/60, {playing:true, heat:0.8, stage:3});
      for (const name of ['jump','duck','coin','hit','elevator','catch','win','lose','menu','dash']) audio.sfx(name);
      audio.speak('cop');
    }''')
    status = page.evaluate('audio.inspect()')
    check('Audio unlocks on player gesture', status['state'] == 'running')
    check('Music, effects, and synthesized gibberish schedule on the realtime graph', status['events'] == 11 and status['notes'] > 0 and status['activeNodes'] > 0)
    page.evaluate('audio.setMusic(5); audio.setSfx(-4); audio.mute(true)')
    status = page.evaluate('audio.inspect()')
    check('Volume sliders clamp and mute applies', status['musicVolume'] == 1 and status['sfxVolume'] == 0 and status['muted'])
    page.wait_for_timeout(1600)
    check('Finished oscillator and noise sources are released', page.evaluate('audio.inspect().activeNodes') == 0)
    check('No runtime exceptions', not errors)
    page.evaluate('audio.dispose()')
    browser.close()
for failure in failures:
    print('FAIL:', failure)
print(f'{checks - len(failures)}/{checks} audio checks passed')
raise SystemExit(bool(failures))
