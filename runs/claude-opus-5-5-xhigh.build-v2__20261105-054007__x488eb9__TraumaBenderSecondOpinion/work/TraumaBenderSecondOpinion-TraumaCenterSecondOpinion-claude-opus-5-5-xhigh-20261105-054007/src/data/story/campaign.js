// The order of the story: data, so the rest of the game can be built out without touching code.
(() => { const G = (window.GAME ||= {}); G.CAMPAIGN = [
  { story: 'c1_open', chapter: 1 }, { case: 'glasshouse' }, { story: 'c1_after' }, { ward: 'ward3' }, { case: 'lowbrass' }, { story: 'c2_after' }, { case: 'crane9' }, { story: 'c3_after' }, { ward: 'ward3' },
  { story: 'c4_open', chapter: 2 }, { case: 'whistling' }, { story: 'c4_after' }, { ward: 'ward3' }, { case: 'slur' }, { story: 'c5_after' }, { case: 'bedside' }, { story: 'c6_after' },
  { story: 'c7_open', chapter: 3 }, { case: 'forcenine' }, { story: 'c7_after' }, { ward: 'ship' }, { case: 'fromthetop' }, { story: 'c8_after' }, { case: 'deadman' }, { story: 'c9_after' }, { ward: 'ship' },
  { story: 'c10_open', chapter: 4 }, { case: 'eloquent' }, { story: 'c10_after' }, { case: 'lastnote' }, { story: 'c11_after' }, { credits: true },
]; })();
