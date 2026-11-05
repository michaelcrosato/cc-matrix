/*
 * HALF BAKED: all the words the player reads. Dry, precise, a little proud, a little
 * frightened. Speakers are [speaker, line] pairs; the voice comes from HB.VOICES.
 */
(function (root) {
  'use strict';
  var HB = root.HB;

  HB.TEXT = {
    title: 'HALF BAKED',
    tagline: 'Cook it right. Sell it clean. Never get caught.',
    needController: 'Controller or keyboard required',

    lab: {
      intro: [
        ['cody', 'Mr. Dunmore. The reagents came in clean. Nobody saw the van.'],
        ['hollis', 'Cody, the van is not the point. What comes out of that vessel is the point.'],
        ['hollis', 'Three stages. Stop the needle in the green band. Miss, and we eat the loss.'],
        ['cody', 'And if we hit all three?'],
        ['hollis', 'Then we stop being two men in a garage and start being a company.']
      ],
      station: 'Cook',
      cookedAlready: 'The batch is already in the cooler. Go see the buyers.',
      doorPrompt: 'Leave for the desert',
      cookIntro: 'Three stages. Stop the marker in the green. Confirm to stop.',
      cookDone: ['hollis', 'Purity {c=#ffd36a}{$purity}{/c}. Grade {$grade}. That is what I expected.'],
      cookBad: ['cody', 'That is purple, Mr. Dunmore. Purple is what they put on a sign that says sorry.']
    },

    street: {
      intro: [
        ['hollis', 'Three buyers, three stops. Stay out of the sight of the man in the tan truck.'],
        ['cody', 'Agent in the truck. Got it. Heat goes up if he sees you.'],
        ['hollis', 'Heat goes up if he keeps seeing you. Keep moving and it comes back down.']
      ],
      buyerGil: [
        ['gil', 'You\'re the chemistry fellow. Show me something blue.'],
        ['gil', 'Okay. The batch is good. I will pay the good price, and I will not ask why you smell like a pool.']
      ],
      buyerLupe: [
        ['lupe', 'Our people are in the cantina. They like it crumbly and they like it cheap.'],
        ['hollis', 'They will pay for what it is, not what they want it to be.']
      ],
      buyerFerris: [
        ['gil', 'Ferris is slow with money and fast with his mouth. Keep your figures tight.'],
        ['hollis', 'My figures are always tight.']
      ],
      offerPrompt: 'Offer: ${offer} for {units} units',
      choices: ['SELL AT ${offer}', 'HAGGLE', 'WALK AWAY'],
      sold: ['gil', 'Done. Your money is in the bag. Do not come back before the Friday.'],
      haggleWon: ['gil', 'Fine, fine. Fifteen percent, because you look like you mean it.'],
      haggleLost: ['gil', 'Insulting. Eighty-eight percent, and you can take it or you can walk the desert.'],
      walked: ['hollis', 'Walking away is also a price. Just not one you can see on the receipt.'],
      busted: ['cody', 'The truck lit the lot up. Heat is at the top of the gauge. We lost the batch.'],
      bustedBack: ['hollis', 'Then we go back to the garage and cook it again. Properly this time.']
    },

    yard: {
      intro: [
        ['vance', 'You are the man who cooked for the people who owed me. Sit down and be quiet.'],
        ['hollis', 'I do not sit for anyone who calls his own product sour dough.'],
        ['vance', 'Then stand, and we will see what a teacher does with his hands.'],
        ['narrator', 'Vance is not going to talk. Dodge his swipes and hit him while he recovers.']
      ],
      won: ['vance', 'Well. Fine. Tell the people who sent you that the car wash is closed.'],
      lost: ['narrator', 'The yard goes quiet. The batch you made is still in the cooler, and nobody is coming to take it.']
    },

    prompts: {
      talk: 'Talk',
      sell: 'Sell',
      exit: 'Exit',
      attack: 'Strike',
      dash: 'Dash',
      cook: 'Cook'
    },

    hud: {
      cash: 'CASH',
      heat: 'HEAT',
      batch: 'BATCH',
      none: 'none',
      boss: 'VANCE',
      objectiveLab: 'Cook one batch, then go to the desert.',
      objectiveStreet: 'Sell to Gil, Lupe and Ferris. Stay out of the truck\'s sight.',
      objectiveYard: 'Vance Tolliver. Dodge his swipes, strike when he is still.',
      autoplay: 'AUTOPLAY  -  press any key to take control',
      sold: 'SOLD'
    },

    results: {
      title: 'SHIFT COMPLETE',
      cash: 'Cash earned',
      purity: 'Batch purity',
      heat: 'Peak heat',
      time: 'Time',
      back: 'Press confirm for the title'
    }
  };

  root.HB = HB;
})(typeof globalThis !== 'undefined' ? globalThis : this);
