//! Paper-theatre lines. Indices, not copies, live in the sim.

#[derive(Clone, Copy)]
pub struct Line {
    pub who: &'static str,
    pub text: &'static str,
}

macro_rules! L {
    ($($who:literal, $text:literal);* $(;)?) => {
        &[ $(Line { who: $who, text: $text }),* ]
    };
}

pub fn block(case_id: i8, after: bool) -> &'static [Line] {
    match (case_id, after) {
        (0, false) => BEFORE_0,
        (0, true) => AFTER_0,
        (1, false) => BEFORE_1,
        (1, true) => AFTER_1,
        (2, false) => BEFORE_2,
        (2, true) => AFTER_2,
        (3, false) => BEFORE_3,
        (3, true) => AFTER_3,
        (4, false) => BEFORE_4,
        (4, true) => AFTER_4,
        (5, false) => BEFORE_5,
        (5, true) => AFTER_5,
        (6, false) => BEFORE_6,
        (6, true) => AFTER_6,
        (7, false) => BEFORE_7,
        (7, true) => AFTER_7,
        _ => AFTER_7,
    }
}

pub fn all_lines() -> Vec<Line> {
    let mut v = Vec::new();
    for case_id in 0..8 {
        v.extend_from_slice(block(case_id, false));
        v.extend_from_slice(block(case_id, true));
    }
    v.extend_from_slice(CALLOUTS);
    v
}

const BEFORE_0: &[Line] = L![
    "Ottoline Voss", "Night Ward, Mercy Harbor General. Port Verity is under a storm and the ferry is late.";
    "Ottoline Voss", "Mara Quill, you lead tonight. I will be in the gallery, not in your light.";
    "Mara Quill", "Understood, Chief. Who is on the table?";
    "Bashir Haddad", "Anton Deverell, crane crew at the west dock. A cable walked off the drum and took the forearm.";
    "Pet Nwosu", "I have the field set. My hands are noisy tonight. Say if you want them off the retractors.";
    "Mara Quill", "Stay. I trust the work more than the tremor.";
    "Teddy Lark", "I labeled the suction twice, because last time I labeled it once and Bashir looked at me like weather.";
    "Bashir Haddad", "The look stands. Pressure is soft. He lost blood on the ramp.";
    "Cordelia Vane", "Nothing in the smear but rope fiber and seawater. No strain. A plain wound, if any wound is plain.";
    "Mara Quill", "Then we do a plain thing well. Pet, count me in.";
    "Pet Nwosu", "On your word. Scalpel, then the bleed, then we close what the cable opened.";
    "Anton Deverell", "Don't let them take the arm. I still have a shift on Thursday.";
];

const AFTER_0: &[Line] = L![
    "Bashir Haddad", "Pulse is a working pulse. He will keep the arm.";
    "Pet Nwosu", "The last stitch sat down clean. I felt the tremor go quiet for it.";
    "Teddy Lark", "I have decided surgery is just sewing, if sewing could file a complaint.";
    "Mara Quill", "Write the chart. Cable injury, forearm, closure sound. No poetry.";
    "Ottoline Voss", "Poetry is how this ward gets careless. Good work, Doctor Quill.";
    "Cordelia Vane", "I kept the fiber. The harbor puts strange gifts in a wound. This one was only rope.";
    "Mara Quill", "Only rope is enough for one night.";
    "Bashir Haddad", "He asked for Thursday. I told him Thursday is a rumor until the dressing comes off.";
    "Pet Nwosu", "I'll sit with the monitor. Go wash. Your shoulders are up by your ears.";
    "Teddy Lark", "I will fetch coffee that tastes like a bandage. It is all the machine knows.";
    "Ottoline Voss", "Drink it standing. The board wants the ward's numbers by dawn.";
    "Mara Quill", "The ward's numbers are a man with a Thursday. They can wait until he wakes.";
];

const BEFORE_1: &[Line] = L![
    "Bashir Haddad", "Briony Pell, navigator on the evening ferry. Belly pain since the bar, then a faint on the stairs.";
    "Mara Quill", "Any fever?";
    "Bashir Haddad", "Low. She is guarding the right side. I do not like the silence in there.";
    "Pet Nwosu", "Abdomen is prepped. There is a shadow on the scan I cannot name.";
    "Cordelia Vane", "Name it after you see it. Shadows in this hospital have been earning worse names.";
    "Teddy Lark", "I brought the scanner up from imaging. The orderly said it whistles when it is happy.";
    "Mara Quill", "Then we will let it whistle. Hidden things first, then whatever is feeding the bleed.";
    "Ottoline Voss", "The ferry company is already on the phone. They are not invited into this room.";
    "Briony Pell", "Tell them the boat can leave without me. Tell my brother where I am.";
    "Mara Quill", "Your brother will hear it from us, not from a clerk. Pet, lights.";
    "Pet Nwosu", "Lights. I have the forceps warm.";
    "Cordelia Vane", "If you find something that is not hers, do not put it in the bin. Bag it for me.";
];

const AFTER_1: &[Line] = L![
    "Mara Quill", "A shard of glass and a small feeder. Both out. The bowel wall held.";
    "Cordelia Vane", "Glass from the harbor bar, not from a body that grew it. I am relieved and I resent the relief.";
    "Bashir Haddad", "She is asking for water she cannot have yet. That is a good argument.";
    "Pet Nwosu", "The scanner sang once and then behaved. I have decided to like it.";
    "Teddy Lark", "I will write 'behaved' in the log. It is the nicest thing I have written all week.";
    "Ottoline Voss", "The company will want a cause. Give them glass and a fall. Give them nothing else.";
    "Mara Quill", "Nothing else is what we found. I want that to stay true.";
    "Cordelia Vane", "Stay is not a promise the Night Ward knows how to keep.";
    "Bashir Haddad", "Vitals are bored. Bored is my favorite vital sign.";
    "Pet Nwosu", "Go speak to the brother. I will mind the drains.";
    "Teddy Lark", "I can mind a drain. I have minded worse, including myself.";
    "Mara Quill", "Mind it, then. And if the numbers change, you shout. You do not editorialize.";
];

const BEFORE_2: &[Line] = L![
    "Ottoline Voss", "Casper Lang. He conducts the civic choir. A rib gave way on the podium and something under it did not.";
    "Bashir Haddad", "Airway is mine. He desaturated in the lift and came back angry, which I respect.";
    "Mara Quill", "Bone, then the tear beneath, then we close the skin he conducts with.";
    "Pet Nwosu", "If the rib is turned, I will turn it back before you stitch. Say the word and I will stop if my hands wander.";
    "Teddy Lark", "The choir is in the lobby singing very quietly, which is somehow louder.";
    "Cordelia Vane", "I looked at his blood because that is what I do when a room feels staged. It is only blood.";
    "Mara Quill", "Then we treat the man, not the feeling.";
    "Casper Lang", "If I go out, tell them the downbeat was late. It was not their fault.";
    "Bashir Haddad", "Nobody is going out. You will hate the tube and then you will forget it.";
    "Ottoline Voss", "Doctor Quill, if he arrests you have two attempts on a resident's budget. Use them like they are yours.";
    "Mara Quill", "I would rather not use them at all.";
    "Pet Nwosu", "On your word. The field is a small country. We know the roads.";
];

const AFTER_2: &[Line] = L![
    "Bashir Haddad", "He arrested and he came back on your shock. Sinus is sulking, but it is sinus.";
    "Mara Quill", "The rib sits. The tear is closed. I do not want to feel that proud of a flatline.";
    "Pet Nwosu", "Pride is not what that was. That was a hand on a paddle and a count you did not rush.";
    "Teddy Lark", "I have never been so glad to hear a machine complain.";
    "Ottoline Voss", "The lobby will want a hymn. They can have one when he can hear it.";
    "Cordelia Vane", "I will say this once. His arrest looked like a body running out of blood, not like a body being played.";
    "Mara Quill", "Played?";
    "Cordelia Vane", "A word I am not ready to defend. Forget it if tomorrow is quiet.";
    "Bashir Haddad", "Tomorrow is never the point. The next hour is the point.";
    "Pet Nwosu", "I'll chart the shock as a single, successful, on the beat. They will ask.";
    "Mara Quill", "Tell them the truth. The beat was there. We met it.";
    "Teddy Lark", "I am going to go stand in the lobby and not sing. It will be my contribution.";
];

const BEFORE_3: &[Line] = L![
    "Cordelia Vane", "Idris Okonkwo, keeper at the north light. Liver lesion, and the lesion has daughters.";
    "Mara Quill", "Daughters is not a clinical word.";
    "Cordelia Vane", "Look at the film and choose a better one. They were not there at dusk. They are there now.";
    "Ottoline Voss", "The board has a name they want used if this spreads. I have not agreed to their name.";
    "Bashir Haddad", "His pressure is proud and his temperature is not. I can hold him. I cannot hold a rumor.";
    "Pet Nwosu", "If they move, I need you to say so. My eyes are good. My hands will need a second.";
    "Teddy Lark", "I read about a stillness some surgeons get when the room goes thin. I thought it was a story for interns.";
    "Mara Quill", "If it is real, it will be a tool, not a story. What do you call it, Cordelia?";
    "Cordelia Vane", "I call the stillness the Hush. I call the lesion's family by a case name: R.E.Q.U.I.E.M.";
    "Ottoline Voss", "You will not put that on a form.";
    "Cordelia Vane", "The form can say multifocal lesion. The room can know what it is fighting.";
    "Mara Quill", "Then the room knows. Idris, we are going to take them out one voice at a time.";
];

const AFTER_3: &[Line] = L![
    "Mara Quill", "They split when the laser finished, and the children were smaller and meaner. They are gone.";
    "Pet Nwosu", "When you called the Hush, my tremor stopped as if it had been asked. I want that written down as a fact.";
    "Bashir Haddad", "His liver enzymes will be a letter we do not enjoy. He is alive to receive the letter.";
    "Cordelia Vane", "Introit. That is the phase I will write in my book, which is not the chart.";
    "Ottoline Voss", "Your book will stay in this building. I will not have the harbor papers naming a disease like a mass.";
    "Teddy Lark", "I held a retractor and thought about my mother. I don't know why I'm saying that.";
    "Mara Quill", "Because the room was quiet enough to hear yourself. That is the Hush, too.";
    "Cordelia Vane", "It will not stay a kindness. A thing that slows a wound will want a price.";
    "Bashir Haddad", "All of my drugs want a price. We still use them.";
    "Pet Nwosu", "I can work under it. If it comes again, call it early.";
    "Mara Quill", "I will call it when the vitals ask, not when I want to feel rare.";
    "Ottoline Voss", "Good. Rarity is how a ward starts lying.";
];

const BEFORE_4: &[Line] = L![
    "Bashir Haddad", "June Harlow, glassblower. She coughed silver and then she stopped coughing, which I like less.";
    "Mara Quill", "Where?";
    "Cordelia Vane", "Sacs along the mediastinum, and behind them a lesion that looks back. I am not being figurative.";
    "Pet Nwosu", "Pericardium is open on the plan. If a sac bursts we will be swimming.";
    "Teddy Lark", "I have extra suction. I have so much suction. I am the god of suction and I am frightened.";
    "Ottoline Voss", "Doctor Lark, you will be the intern of suction. Gods wait outside.";
    "Mara Quill", "Laser on the stems, slow if the laser runs hot. If one opens, we clear the field before the next.";
    "June Harlow", "I was making a bowl for my wife. Tell her the color was right even if I don't finish it.";
    "Bashir Haddad", "You can tell her yourself. I am very stubborn about that.";
    "Cordelia Vane", "This phase is Lacrimosa. If you finish a perfect pass, the next sac sometimes repeats it. I call that the Echo.";
    "Mara Quill", "A copy of a good hand.";
    "Pet Nwosu", "Then give it only a good hand. I will not have it learn my shake.";
];

const AFTER_4: &[Line] = L![
    "Mara Quill", "The eye is closed. I never want to say that about a person again and mean a lesion.";
    "Cordelia Vane", "The Echo took your last clean pass and spent it on a sac you had not reached. It saved a second.";
    "Pet Nwosu", "It also saved the mess. I was ready for the mess and I am glad to be wrong.";
    "Bashir Haddad", "June is asking, in writing because the tube is still in, whether the bowl survived the annealer.";
    "Teddy Lark", "I called the studio. The bowl survived. I did not cry. That is a lie. I did not cry on the phone.";
    "Ottoline Voss", "Put the bowl in the chart as a personal effect, not as a miracle.";
    "Mara Quill", "The miracle is a closed chest and a woman who wants a bowl. I will take it.";
    "Cordelia Vane", "Three waves. It likes threes. Remember that when it stops being polite.";
    "Bashir Haddad", "Polite is not the word I have for a chest full of sacs.";
    "Pet Nwosu", "Go eat. I will watch the Echo wear off. It should be gone in minutes.";
    "Mara Quill", "If it copies a mistake next time, we retire it.";
    "Cordelia Vane", "Agreed. A gift that repeats a sin is just a faster sin.";
];

const BEFORE_5: &[Line] = L![
    "Ottoline Voss", "Nils Ferreira, night stoker at the foundry. He came in hot and the hot is not a fever we own.";
    "Bashir Haddad", "Temperature is a number I do not say out loud near flammable interns.";
    "Teddy Lark", "I am only a little flammable.";
    "Cordelia Vane", "Embers. They want cold before steel, and steel before the pull. If you cut one early it seeds.";
    "Mara Quill", "Cryoprobe first. Pet, you have used it on a wart and you will pretend this is a wart.";
    "Pet Nwosu", "It is a wart. I am very convincing.";
    "Mara Quill", "There will be heat rings across the field. When one passes, hands up. I would rather lose a second than a layer of him.";
    "Nils Ferreira", "Don't let the fire have the last word. I have spent thirty years answering it.";
    "Bashir Haddad", "The fire can file its complaint with me. Breathe when I tell you, and then stop arguing.";
    "Cordelia Vane", "This is Dies Irae. It will try to make the embers into one animal.";
    "Ottoline Voss", "Then we do not let it finish the sentence.";
    "Mara Quill", "Cold, then cut, then out. Say it back to me.";
];

const AFTER_5: &[Line] = L![
    "Pet Nwosu", "The last ember came apart in the forceps like bad coal. Nothing seeded.";
    "Mara Quill", "The ring crossed my knuckle and I lifted. The chart can say I was slow. The chart is welcome.";
    "Bashir Haddad", "His temperature is a temperature again. I am writing it down with ordinary digits.";
    "Teddy Lark", "I have never loved an ordinary digit more.";
    "Cordelia Vane", "It merged once and you split the merge. That will make it angry or it will make it careful. I do not know which is worse.";
    "Ottoline Voss", "Careful is worse. Angry I can staff for.";
    "Mara Quill", "Staff for both. I want a second team sleeping in the call room, not at home.";
    "Pet Nwosu", "I'll sleep here. The chair knows me.";
    "Bashir Haddad", "Nils asked if the foundry called. They did. He is not fired. I told them he is busy not dying.";
    "Teddy Lark", "I will be the one who brings that sentence to him. I want to see a stoker smile.";
    "Mara Quill", "Then bring it, and come back. We are not done with the week.";
    "Cordelia Vane", "No. The requiem has movements left.";
];

const BEFORE_6: &[Line] = L![
    "Bashir Haddad", "Petra Solano, cartographer. A mass at the root of the mesentery, and she still tried to finish a coastline in the waiting room.";
    "Mara Quill", "Circle it, lift it, gel the bed. If I nick what feeds the bowel we will know immediately.";
    "Pet Nwosu", "I have the field wide. There is room for your hands and mine and still a margin.";
    "Cordelia Vane", "The mass is not a strain daughter. It is older. It has been drawing itself for years.";
    "Ottoline Voss", "Good. I would like one enemy tonight that does not multiply when looked at.";
    "Teddy Lark", "I put her maps in a folder so the blood can't have them. That is the most useful thing I have done.";
    "Petra Solano", "The cape on sheet four is wrong. If I don't wake up, the cape is still wrong. Fix the cape.";
    "Mara Quill", "You will fix your own cape. I am only fixing the thing under it.";
    "Bashir Haddad", "She is a terrible patient and an excellent reason. Anesthesia is in.";
    "Pet Nwosu", "Whenever you are ready. I will follow the circle with the suction, not across it.";
    "Mara Quill", "Across it is how we lose the margin. Follow.";
    "Ottoline Voss", "Bring her back with the cape unfixed. Let the living argue with the map.";
];

const AFTER_6: &[Line] = L![
    "Mara Quill", "The mass is out, in one piece, which felt like a vanity and was actually safer.";
    "Cordelia Vane", "I will cut it in the lab and it will be dull under the lens. I am grateful for dull.";
    "Bashir Haddad", "She wrote 'cape' on a pad before her eyes were fully open. The woman is a compass.";
    "Teddy Lark", "I told her the cape can wait until soup. She looked at me like I had insulted a coastline.";
    "Pet Nwosu", "Leave her the pen. A pen is a smaller risk than the argument.";
    "Ottoline Voss", "The board meets in six hours. They will ask if the ward is under control.";
    "Mara Quill", "Tell them we did six operations and told the truth after each.";
    "Ottoline Voss", "They do not hear that as control.";
    "Mara Quill", "Then they are asking the wrong question of a hospital.";
    "Cordelia Vane", "There is one patient left on the night list. He came in without a name and then he had one. Soren Vale.";
    "Pet Nwosu", "What is wrong with Soren Vale?";
    "Cordelia Vane", "Everything we have already seen, and the part where a heart stops on purpose.";
];

const BEFORE_7: &[Line] = L![
    "Ottoline Voss", "Soren Vale. No next of kin on the card. The heart is the field. Cordelia, say the rest.";
    "Cordelia Vane", "Libera Me. Nodules, sacs, embers, and then a stoppage that is written into him, not earned by blood loss.";
    "Bashir Haddad", "If it is written, my drugs will not argue it out. You will have to meet it with the paddles.";
    "Mara Quill", "How many stops?";
    "Cordelia Vane", "Three, if it behaves like the page. Maybe it cannot count. Plan for three.";
    "Pet Nwosu", "I will take the second pair of hands. When you are on the tendril I will be on whatever else is eating him.";
    "Teddy Lark", "Tell me where to stand so I am a help and not a story you tell later.";
    "Mara Quill", "Stand at the head with Bashir. If I ask for a clamp, you are already holding it.";
    "Ottoline Voss", "There is a last gift in the notes. Cordelia calls it the Duet. Two surgeons, one count.";
    "Cordelia Vane", "It is not magic. It is an agreement the tissue seems to honor when two instruments mean the same thing.";
    "Mara Quill", "Then we will mean it. Pet, you have the right hand of the field. I have the left.";
    "Soren Vale", "If there is a downbeat, don't miss it for my sake. I have missed enough of my own.";
];

const AFTER_7: &[Line] = L![
    "Bashir Haddad", "Three shocks. Sinus after the third, thin as paper, and then it thickened.";
    "Mara Quill", "The tendril let go when both of us pulled on the quiet half of the beat. I will not pretend I understand it.";
    "Pet Nwosu", "You don't have to understand a door to close it. It is closed.";
    "Teddy Lark", "I did not drop the clamp. I am going to have that put on a cake.";
    "Ottoline Voss", "The board can have their dawn meeting. I will tell them the Night Ward kept the night.";
    "Cordelia Vane", "R.E.Q.U.I.E.M. is a case name, not a myth, as long as we write what we did and not what we felt.";
    "Mara Quill", "What I felt was a room full of people who stayed. Write that if you need a cause.";
    "Bashir Haddad", "Soren asked if the choir from Tuesday is still in the lobby. They went home. I said they left the lights.";
    "Pet Nwosu", "My hands are shaking again. I am glad. It means the Hush went home too.";
    "Ottoline Voss", "Go sleep in a real bed, Doctor Quill. The harbor will still be there at noon, making work.";
    "Mara Quill", "Wake me if a vitals page is ugly. Wake me if it is only strange. I would rather be early than sung about.";
    "Cordelia Vane", "No one is singing. That is the best result this building knows.";
];

pub const CALLOUTS: &[Line] = L![
    "Bashir Haddad", "Clean. Again.";
    "Pet Nwosu", "Doctor, that's healthy tissue.";
    "Bashir Haddad", "Vitals at forty. Push the IV. Now!";
    "Pet Nwosu", "Wrong instrument, Doctor.";
    "Mara Quill", "Lift off! Lift off!";
    "Bashir Haddad", "Charge. On the ghost beat.";
    "Bashir Haddad", "Sinus rhythm. Stay with me.";
    "Cordelia Vane", "The Hush is yours.";
    "Cordelia Vane", "Echo the last sure hand.";
    "Ottoline Voss", "Together. The Duet.";
    "Pet Nwosu", "Hemostasis.";
    "Mara Quill", "The mass is ringed. Lift it.";
    "Pet Nwosu", "Frost, then steel.";
    "Bashir Haddad", "Three shocks. No more.";
    "Mara Quill", "Close the field.";
    "Teddy Lark", "Still with us. Still with us.";
];

pub fn callout(i: u8) -> &'static str {
    CALLOUTS.get(i as usize).map(|l| l.text).unwrap_or("")
}

pub fn callout_who(i: u8) -> &'static str {
    CALLOUTS.get(i as usize).map(|l| l.who).unwrap_or("")
}
