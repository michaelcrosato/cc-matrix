// 40-story: speakers (name, color, Humanoid look, voice), briefings, cutscene scripts (camera keys, actors, lines),
// and the intel notes. The writing follows the source's B-movie secret-agent tone with original lines. Reads: frames (31-33).

def('speaker', 'kai', { name: 'KAI', color: '#ff6a5a', voice: { base: 150, wave: 'sawtooth', rate: 11 }, rig: { build: 'heroic', size: 1.05, weapon: 'gun', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { coat: '#2e3038', cloth: '#f2f2f2', trim: '#d81e1e', pants: '#26262c', hair: '#141418', skin: '#d8a478', boot: '#111', metal: '#30343c' } } });
def('speaker', 'rook', { name: 'ROOK', color: '#6aa8ff', voice: { base: 105, wave: 'sawtooth', rate: 9, fx: 'gravel' }, rig: { build: 'bulky', size: 1.1, weapon: 'gun', outfit: 'coat', hair: 'bald', sleeves: 'long', colors: { coat: '#6a4428', cloth: '#2a5ab0', pants: '#2a2a30', skin: '#c08a68', boot: '#1a120a', metal: '#2a2e36' } } });
def('speaker', 'mari', { name: 'MARI', color: '#6aff9a', voice: { base: 230, wave: 'square', rate: 12 }, rig: { build: 'heroic', size: 1, weapon: 'gun', outfit: 'coat', hair: 'ponytail', sleeves: 'long', colors: { coat: '#ff7a2a', cloth: '#f4f4f4', trim: '#22c55e', pants: '#24303a', hair: '#2a1a10', skin: '#c88a5e', boot: '#111' } } });
def('speaker', 'juno', { name: 'JUNO', color: '#ffd84a', voice: { base: 200, wave: 'square', rate: 13, fx: 'radio' }, rig: { build: 'chibi', size: 1, weapon: 'gun', outfit: 'shirt', hair: 'spiky', hat: { style: 'band', color: '#f5b700' }, colors: { cloth: '#f5b700', pants: '#2a2a40', hair: '#2ad0c0', skin: '#e8c098', boot: '#222' } } });
def('speaker', 'hale', { name: 'DIRECTOR HALE', color: '#c8d0e8', voice: { base: 175, wave: 'triangle', rate: 10, fx: 'radio' }, rig: { build: 'heroic', size: 1, weapon: null, outfit: 'coat', hair: 'long', colors: { coat: '#5a6070', cloth: '#e8e8f0', hair: '#d8dce8', skin: '#e0b896', pants: '#3a3e48' } } });
def('speaker', 'tejada', { name: 'DR. TEJADA', color: '#e8e8e8', voice: { base: 140, wave: 'triangle', rate: 9 }, rig: { build: 'heroic', size: .98, weapon: null, outfit: 'coat', hair: 'short', colors: { coat: '#f0f0f0', cloth: '#7aa0c8', hair: '#a8a8a8', skin: '#c89a74', pants: '#4a4a52' } } });
def('speaker', 'krake', { name: 'ADMIRAL KRAKE', color: '#ffcf5a', voice: { base: 95, wave: 'sawtooth', rate: 8, fx: 'boom' }, rig: { build: 'heroic', size: 1.15, weapon: 'gun', outfit: 'coat', hair: 'long', hat: { style: 'cap', color: '#141c34' }, cape: { len: 8, width: 6, seg: 2.5 }, sleeves: 'long', colors: { coat: '#18224a', cloth: '#18224a', trim: '#e8b82a', hair: '#f2f2f2', skin: '#d8b090', pants: '#141a34', cape: '#101830', capeIn: '#8a1a1a', boot: '#0a0a10', metal: '#c8a030' } } });
def('speaker', 'barracuda', { name: 'BARRACUDA', color: '#5ae0d8', voice: { base: 210, wave: 'square', rate: 13 }, rig: { build: 'heroic', size: 1.05, weapon: 'sword', bladeLen: 12, outfit: 'shirt', hair: 'ponytail', sleeves: 'long', armor: true, colors: { cloth: '#1a7a7a', plate: '#2a4a5a', pants: '#14444a', hair: '#f4f4f4', skin: '#d8a880', boot: '#0a1a1a', metal: '#d8e0f0' } } });
def('speaker', 'hammer', { name: 'HAMMERHEAD', color: '#ff9a4a', voice: { base: 80, wave: 'sawtooth', rate: 6, fx: 'gravel' }, rig: { build: 'bulky', size: 1.6, weapon: 'rifle', gunLen: 12, outfit: 'shirt', hat: 'helmet', armor: true, sleeves: 'long', colors: { cloth: '#3a3e48', plate: '#5a606c', pants: '#2a2c34', hat: '#6a707c', skin: '#c08a68', boot: '#111', metal: '#20242a' } } });
def('speaker', 'gull', { name: 'THE GULL', color: '#b8c0d0', voice: { base: 190, wave: 'triangle', rate: 10 }, rig: { build: 'heroic', size: 1, weapon: 'rifle', gunLen: 14, outfit: 'coat', hood: true, colors: { coat: '#6a6e76', cloth: '#5a5e66', hair: '#4a4e56', skin: '#c8a080', pants: '#3a3e46' } } });
def('speaker', 'worker', { name: 'DOCK WORKER', color: '#d8c890', voice: { base: 130, wave: 'square', rate: 12 }, rig: { build: 'bulky', size: 1, weapon: null, outfit: 'shirt', hat: 'cap', colors: { cloth: '#c89a3a', hat: '#f2c12e', pants: '#3a4a6a', skin: '#c08a68' } } });
def('speaker', 'fisher', { name: 'FISHERMAN', color: '#ffe04a', voice: { base: 120, wave: 'square', rate: 12 }, rig: { build: 'heroic', size: 1, weapon: null, outfit: 'coat', hat: 'cap', colors: { coat: '#f2d02e', hat: '#f2d02e', pants: '#2a3a4a', skin: '#b07850' } } });
def('speaker', 'captor', { name: 'RED TIDE', color: '#ff4a4a', voice: { base: 120, wave: 'sawtooth', rate: 12, fx: 'gravel' }, rig: { build: 'heroic', weapon: 'gun', outfit: 'coat', hat: { style: 'band', color: '#b0141e' }, colors: { coat: '#b4161e', cloth: '#a81e22', skin: '#2a1a1a', pants: '#2a1012' } } });

// ---------------------------------------------------------------- briefings (pages over the map of the Lumen Isles)
def('briefing', 'b1', { stage: 1, objectives: ['Land at Lantern Pier', 'Find Krake\'s signal', 'Stop the gunboat Stingray'], lines: [
  ['hale', 'Agents. Two hours ago the Black Current seized Port Lumen\'s harbor and the Tidewall.'],
  ['hale', 'Their leader is Silas Krake. A disgraced admiral with a grudge the size of an ocean.'],
  ['juno', 'He\'ll open the floodgates at dawn. King tide. The whole city goes under.'],
  ['hale', 'You have until 06:00. Land at Lantern Pier. Find his signal. End this.'],
  ['kai', 'Understood. CREST is on it.']] });
def('briefing', 'b2', { stage: 2, objectives: ['Climb to Lighthouse Point', 'Rescue Dr. Tejada', 'Silence the relay'], lines: [
  ['hale', 'The lighthouse relays Krake\'s commands to the whole fleet.'],
  ['juno', 'Take it out and his ships go deaf. Also, it\'s raining. A lot.']] });
def('briefing', 'b3', { stage: 3, objectives: ['Jam the sluice gates', 'Reach the control tower', 'Stop Admiral Krake'], lines: [
  ['hale', 'This is it, agents. Jam the gates, reach the tower, stop Krake.'],
  ['juno', 'And maybe don\'t fall in. The water\'s rising.']] });

// ---------------------------------------------------------------- cutscenes

def('cutscene', 'c1-intro', { actors: [
    { id: 'mari', at: S1.pier.p(-236, 34, -12), facing: 0 }, { id: 'kai', at: S1.pier.p(-222, 26, -12), facing: .3 }, { id: 'rook', at: S1.pier.p(-226, 46, -12), facing: -.2 }],
  steps: [
    { music: 'theme' },
    { cam: [cam(0, S1.pier.p(-420, 200, 20), S1.pier.p(-230, 36, 0)), cam(4, S1.pier.p(-300, 110, 14), S1.pier.p(-230, 36, 4)), cam(9, S1.pier.p(-270, 70, 10), S1.pier.p(-226, 34, 6))] },
    { say: ['mari', 'Hang on! Lumen Coast Guard express—next stop, trouble!'] },
    { cam: [cam(0, S1.pier.p(200, -40, 40), S1.pier.p(480, -140, 92)), cam(8, S1.pier.p(260, -60, 50), S1.pier.p(480, -140, 92))] },
    { say: ['krake', 'Citizens of Port Lumen! Enjoy your lanterns. They are the last lights you will see.'], screen: true },
    { say: ['krake', 'At dawn the king tide comes, and I open every gate. The sea takes back what you stole!'], screen: true },
    { cam: [cam(0, S1.pier.p(-200, 50, 6), S1.pier.p(-226, 34, 12)), cam(8, S1.pier.p(-196, 40, 8), S1.pier.p(-226, 34, 12))] },
    { say: ['rook', 'Charming guy.'] },
    { say: ['kai', 'Let\'s make some waves.'] },
    { say: ['rook', 'Kid, you say that every mission.'] }] });
def('cutscene', 'c1-outro', { actors: [{ id: 'kai', at: S1.mouth.p(0, -10, 8), facing: -1.2 }, { id: 'mari', at: S1.mouth.p(-20, 10, 8), facing: -1.4 }, { id: 'rook', at: S1.mouth.p(10, 14, 8), facing: -1.8 }],
  steps: [
    { cam: [cam(0, S1.mouth.p(80, 80, 30), S1.mouth.p(0, 0, 20)), cam(10, S1.mouth.p(60, 60, 26), S1.mouth.p(0, 0, 20))] },
    { say: ['juno', 'Krake\'s signal is coming from Lighthouse Point.'] },
    { say: ['mari', 'Gull\'s Rest. They\'ve held my father there since yesterday.'] },
    { say: ['kai', 'Then that\'s where we\'re going.'] },
    { say: ['rook', 'Into a storm. Naturally.'] }] });


def('intel', 'i1a', { stage: 1, note: 'Note to self: never trust a fish that winks. —J.' });
def('intel', 'i1b', { stage: 1, note: 'Lantern Festival rota: Rook on fireworks. Again. Nobody tell him.' });
def('intel', 'i2a', { stage: 2, note: 'Krake\'s coffee order: black, like the Current. Two sugars.' });
def('intel', 'i2b', { stage: 2, note: 'Hammerhead\'s door is not a door. Do not mention the door.' });
def('intel', 'i3a', { stage: 3, note: 'Tidewall staff memo: the big red lever is NOT a coat hook.' });
def('intel', 'i3b', { stage: 3, note: 'Scylla maintenance log: knees creak. Again. Order more grease.' });
