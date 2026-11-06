export const WEAPONS={
pistol:{name:'Service Pistol',slot:0,rpm:300,damage:24,mag:12,reserve:48,range:90,wear:.10,price:0},
quiet:{name:'Quiet Pistol',slot:0,rpm:240,damage:22,mag:10,reserve:30,range:65,wear:.14,price:3},
flare:{name:'Flare Pistol',slot:0,rpm:30,damage:12,mag:1,reserve:8,range:100,wear:.5,price:2,ignite:true},
carbine:{name:'Worker’s Carbine',slot:1,rpm:600,damage:28,mag:30,reserve:120,range:140,wear:.05,price:3},
rifle:{name:'Surveyor’s Rifle',slot:1,rpm:45,damage:110,mag:5,reserve:20,range:500,wear:.35,price:6},
pump:{name:'Trench Pump',slot:1,rpm:65,damage:117,mag:6,reserve:24,range:30,wear:.25,price:4},
belt:{name:'Belt Gun',slot:2,rpm:700,damage:26,mag:80,reserve:160,range:180,wear:.04,price:7},
tube:{name:'The Tube',slot:2,rpm:12,damage:180,mag:1,reserve:4,range:220,wear:1.5,price:8,explosive:true},
torch:{name:'Drip Torch',slot:2,rpm:600,damage:8,mag:100,reserve:200,range:14,wear:.01,price:6,ignite:true}};
export const SHOP=[...Object.entries(WEAPONS).filter(([id])=>id!=='pistol').map(([id,w])=>({id,name:w.name,price:w.price,note:w.ignite?'The land does the rest.':w.explosive?'An argument with a wide audience.':'New barrel. No history.'})),
{id:'syringes',name:'Syringe pouch',price:4,note:'Two more chances to reconsider.'},{id:'molotovs',name:'Molotov bandolier',price:3,note:'Carry five small disputes.'},{id:'locator',name:'Locator range',price:3,note:'Money has a longer reach.'},{id:'armoury_s2',name:'Salt Shed armoury',price:2,note:'A clean replacement after sleep.'},{id:'armoury_s3',name:'Signal Box armoury',price:2,note:'The next shift starts fresh.'}];
