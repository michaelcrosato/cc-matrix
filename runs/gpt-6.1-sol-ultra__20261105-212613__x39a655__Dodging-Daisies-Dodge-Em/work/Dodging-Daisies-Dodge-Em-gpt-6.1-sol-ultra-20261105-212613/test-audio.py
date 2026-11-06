from pathlib import Path
import json
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
failures = []
checks = 0

def check(condition, description):
    global checks
    checks += 1
    if not condition:
        failures.append(description)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page()
    page_errors = []
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    result = page.evaluate('''async source => {
      const module = await import(URL.createObjectURL(new Blob([source], {type:'text/javascript'})));
      const proof = await module.renderAudioProof();
      const audio = new module.AudioSystem();
      const before = audio.getDebug();
      await audio.unlock();
      for (const name of ['collect','gate','boost','crash','clear','start','win','select','near','deny','count']) audio.play(name);
      audio.voice('pit crew');
      audio.update({mode:'playing',players:[{boost:true}]},0.016);
      await new Promise(resolve => setTimeout(resolve,220));
      const active = audio.getDebug();
      audio.setMusic(0.34); audio.setEffects(0.22); audio.setMuted(true);
      await new Promise(resolve => setTimeout(resolve,250));
      const muted = audio.getDebug();
      await audio.dispose();
      return {proof,before,active,muted};
    }''', (root / 'audio.js').read_text())
    check(result['before']['musicVolume'] == 0.10, 'Music default is not 10%.')
    check(result['proof']['rms'] > 0.005 and result['proof']['peak'] < 1.0 and result['proof']['nonzero'] > 40000, 'Offline output is silent, clipped, or incomplete.')
    check(result['active']['unlocked'] and result['active']['playedEffects'] == 11 and result['active']['voices'] == 1 and result['active']['scheduledNotes'] > 30, 'Audio effects or voice did not schedule.')
    check(result['active']['rms'] > 0.0001, 'Realtime analyser detected no sound.')
    check(result['muted']['muted'] and result['muted']['musicVolume'] == 0.34 and result['muted']['effectsVolume'] == 0.22 and result['muted']['rms'] < 0.0001, 'Audio controls did not apply or mute output.')
    check(not page_errors, 'Browser errors: ' + '; '.join(page_errors))
    browser.close()

(root / 'audio-test-results.json').write_text(json.dumps({'checks':checks,'failures':failures,'measurements':result},indent=2))
for failure in failures:
    print('FAIL: ' + failure)
print(f'{checks} audio checks, {len(failures)} failures')
raise SystemExit(bool(failures))
