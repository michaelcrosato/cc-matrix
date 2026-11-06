// One command: node audio-test.mjs. Chromium renders actual synthesized sound offline.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const source = readFileSync(new URL('./audio.js', import.meta.url), 'utf8').replace('export class GameAudio', 'globalThis.GameAudio = class GameAudio');
const python = `
import json, sys
from playwright.sync_api import sync_playwright
source = json.loads(sys.stdin.read())
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.add_script_tag(content=source)
    result = page.evaluate('''async () => {
      const failures = []; let count = 0;
      const check = (ok, message) => { count++; if (!ok) failures.push(message); };
      const render = async (kind, volume=.1) => {
        const context = new OfflineAudioContext(2, 48000 * 3, 48000);
        const audio = new GameAudio({context, seed:1977});
        await audio.unlock();
        audio.setMusic(volume);
        if (kind === 'music') audio._scheduleMusic(2.8);
        else {
          const names = ['shoot','hit','explosion','overheat','sonar','bomb','powerup','boss','victory','defeat','menu','start','wave','radio'];
          names.forEach((name,i) => audio.play(name,{delay:i*.12,pan:i%2?-.4:.4}));
        }
        const buffer = await context.startRendering();
        let energy=0, peak=0, nonfinite=0;
        for(let channel=0;channel<buffer.numberOfChannels;channel++) {
          const samples=buffer.getChannelData(channel);
          for (const sample of samples) { energy+=sample*sample; peak=Math.max(peak,Math.abs(sample)); if(!Number.isFinite(sample)) nonfinite++; }
        }
        return {rms:Math.sqrt(energy/(buffer.length*2)), peak, nonfinite, diagnostic:audio.diagnostics()};
      };
      const sfx=await render('sfx');
      check(sfx.rms>.001,'Synthesized effects are silent');
      check(sfx.peak<1,'Synthesized effects clipped');
      check(sfx.nonfinite===0,'Effects produced invalid samples');
      check(sfx.diagnostic.effects===14,'Not all effect types scheduled');
      check(sfx.diagnostic.radioSyllables===6,'Gibberish voice did not schedule syllables');
      const music=await render('music');
      check(music.rms>.0001,'Default music is silent');
      check(music.peak<1,'Default music clipped');
      check(music.diagnostic.musicVolume===.1,'Music does not default to ten percent');
      check(music.diagnostic.notes>10,'Music sequencer did not generate notes');
      const loud=await render('music',1);
      check(loud.rms>music.rms*5,'Music volume control did not change rendered output');
      const context = new OfflineAudioContext(2, 48000, 48000);
      const audio = new GameAudio({context}); await audio.unlock(); audio.setMuted(true);
      check(audio.play('shoot')===false,'Muted sound effect still scheduled');
      audio.setMuted(false); audio.pause(true);
      check(audio.diagnostics().paused===true,'Pause state was not set');
      audio.pause(false); audio.update(.016,{stage:3,mode:'boss'});
      check(audio.diagnostics().stage===3,'Stage cue state did not update');
      check(audio.diagnostics().notes>0,'Frame update did not schedule music');
      return {failures,count};
    }''')
    browser.close()
for failure in result['failures']: print('FAIL: '+failure)
print(str(result['count'])+' audio checks, '+str(len(result['failures']))+' failures')
sys.exit(1 if result['failures'] else 0)
`;
const result = spawnSync('/home/micha/.local/share/pipx/venvs/playwright/bin/python', ['-c', python], {input:JSON.stringify(source), encoding:'utf8'});
if (result.stdout) process.stdout.write(result.stdout);
if (result.status !== 0 && result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
