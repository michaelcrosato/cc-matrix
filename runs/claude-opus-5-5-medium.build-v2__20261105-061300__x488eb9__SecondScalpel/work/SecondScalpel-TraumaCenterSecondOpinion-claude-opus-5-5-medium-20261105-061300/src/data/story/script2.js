// Chapters 3 and 4, and the ending.
(() => {
const G = (window.GAME ||= {}), S = (G.SCRIPT ||= {});
S.c7_before = `
@card Chapter 3|Second Look
@stage harbor
@cine stormship
vale shock: Is that normal? Quill! Is the launch supposed to go vertically?
quill neutral: I was merchant navy nine years, Doctor. Hold the rail. Do not look at the rail.
@stage shipward
sokolova smile: You're late, Bartholomew.
quill neutral: Thirty-one years, Yevgenia.
sokolova smile: And you've brought me a child in clogs. Good. Children have knees. Hold this lamp.
vale neutral: Dr. Sokolova, Dr. Oyelaran sent me, there's a parasite, it sings, I have a corkboard.
sokolova neutral: Later. The winch has come off its mount and it has come off onto Yusuf.
yusuf sad: Doctora. I left the brake off. I think. Is it bad? I can't tell. Is it bad?
sokolova smile: At my age, dear, everything happens twice. Scalpel. Watch my hands, child.
`;
S.c7_after = `
@stage shipward
vale shock: You slipped. The ship rolled, your hand slipped, I saw the cut. Then it wasn't there.
sokolova smile: No. Again. That's all it is, child. You stretch a moment. I take it back.
vale neutral: That's impossible. How often can you... does it cost you anything?
sokolova neutral: I am sixty-seven. I remember every operation twice, and some of them I lost once.
quill neutral: She did this with a spoon, in the navy.
sokolova smile: It was a very good spoon. Now, Bartholomew. Your Chief sent the girl, so it's time.
yusuf smile: Doctora! I can feel my leg. It's terrible. May I have a sandwich?
sokolova smile: Pain, child. You hear that? That's the sound of a boy who will be fine.
`;
S.c8_before = `
@stage chapel
perpetua smile: God's peace to you, Doctor. Mind the step. I've brought six more aboard this evening.
vale sad: Sister, your own liver's failing. Your chart looks like a shipwreck. Aren't you frightened?
perpetua smile: I've run the seamen's hospice for forty years. Do you know how they used to die, child?
perpetua smile: Screaming. And now they go smiling, holding my hand, one after another. It is a mercy.
sokolova neutral: It's a parasite, Perpetua. It repeats. Cut it once, it plays the whole thing over.
perpetua neutral: Then you'll cut it. I've signed. But I'd like a word, after, about what you've done.
quill neutral: Three lobes. It will start again if you're slow. I understand it's musical.
`;
S.c8_after = `
@stage chapel
perpetua sad: It's back. The ache in my hip. Every one of those men, I remember them now.
perpetua angry: You'd give them back their pain? All of my dying men? That is what you came for?
vale sad: I... Sister, I don't know. They were happy. They really were. I'm not sure I can...
sokolova neutral: I'd give them back their choice.
perpetua neutral: Hah. A choice between what and what, Yevgenia? You have never held their hands.
sokolova neutral: No. I have only ever held their insides. It's a good argument. Lose it again sometime.
? She has a point. => She has had it for forty years, Doctor. It has not gotten smaller. | Pain means you're still here. => The staff have a saying, Doctor. Don't let it go quiet.
`;
S.c9_before = `
@stage shipward
crane sad: Dr. Crane. Hollis. I ran Lull's second trial. Please don't touch my chest.
sokolova neutral: You've come aboard in a Force Eight with one small bag to confess, and you're sweating.
crane sad: Dr. Hale is a thoughtful man. He gave me a new pacemaker the day I resigned.
crane shock: If my heart stops, it detonates. If the can is forced, it detonates. It's quite a large can.
vale shock: On the ship? Should we be... should he be... get him off the ship!
sokolova smile: We are doctors.
quill neutral: I'll fetch the other forceps.
crane sad: The wires. Cut triangle, circle, square. I'm almost sure. I designed the board. I think.
sokolova neutral: Almost, he says. A second opinion, child. Bring the Sonar.
`;
S.c9_after = `
@stage shipward
crane sad: The can's in the sea? It's in the sea. I can feel my chest. It hurts terribly. Thank you.
vale neutral: Dr. Crane, what started this? Who was the first? Where does all of it come from?
crane sad: He had a daughter. Clementine. Nine years old. Bone disease. She screamed for two years.
crane sad: He's the kindest man I ever met. He made HUSH so that she could stop. And she stopped.
crane shock: It's in her still. All of it comes from her. Every colony, every strain. It's her song.
crane sad: Everything is singing to her. And she's nineteen now. And it's nearly done growing.
sokolova neutral: Then we sail for Port Anselm. Bartholomew, wake the engineer. Child, sleep.
vale neutral: I can't sleep. Can I ask you something, Quill? Thirty-one years. Why did you go?
quill neutral: I didn't, Doctor. She did. Theatre Three still has her apron on the hook.
`;
S.c10_before = `
@card Chapter 4|Coda
@stage ward
percy neutral: Vale. You're back. Everyone's been... it's fine. Everything's fine. I wrote it all up.
vale neutral: Percy, you look awful. When did you last sleep? Your eyes are doing something.
percy smile: Do you know, I've never told you this. You've got better hands than I have. It's fine.
percy smile: It doesn't bother me. Nothing bothers me. Isn't that... oh. It's finally quiet.
@cine percycollapse
vale shock: Percy! PERCY! Somebody! He's still smiling, why is he still smiling!
@stage radiology
odalys sad: Okay. So. He charted himself. In his own hand. It says migraine. On Lull since March.
odalys neutral: Look at the film. Point at it. I'm not going to say what I think it is. It's looking at me.
sokolova neutral: Two surgeons, child. One table. Try not to be sentimental. I shall take the first cut.
`;
S.c10_after = `
@stage ward
vale sad: Percy? Percy, it's Immy. Can you hear me? Do you know where you are?
percy angry: Your stitches... are crooked.
vale smile: They are. They're so crooked. I did them crooked. I'm so sorry. I'm crying, this is crying.
percy sad: It hurts, Vale. Everything hurts. I've been so very frightened. For such a long time.
percy neutral: I should've said. It was never a hernia. Do you want that in writing?
quill neutral: In pen, Doctor.
sokolova neutral: Good. Now the bad news, children. Look at the ER board.
odalys shock: Okay so everybody freak out. Every Anodyne patient in the city's failing. All at once.
`;
S.c11_before = `
@stage ward
hale sad: Please. Someone. Please. She's stopped answering. Someone please take her.
vale shock: Dr. Hale. You came here? You carried her? In the rain? All the way from the east wing?
hale sad: I only wanted her not to hurt. Doctor, you have to understand. I only wanted her not to hurt.
clementine smile: Hello. It's all right, Father. Everyone's singing. Can you hear it? It's so beautiful now.
sokolova neutral: It's wrapped around her heart, Lucian. It's conducting the whole city from in there.
hale sad: Pain is the last disease, Doctor. I only ask you to stop defending it. Save her. Please.
@cine finaltable
oyelaran neutral: I'm in the gallery. I've got a wheelchair and an opinion. Do not make me use either.
percy neutral: I've got the monitors. Your pressure readings'll be right. For once. In pen.
odalys smile: I've got the film and six donuts. Okay so don't freak out.
quill neutral: Scalpel, Doctors. Whichever of you. I've passed instruments to four of you now.
vale neutral: Don't let it go quiet, Quill.
quill smile: No, Doctor. Not tonight.
`;
S.c11_after = `
@stage theatre
clementine shock: AAH! AAAH! Oh, it, oh, what, oh, Father, it, I...
clementine smile: I can feel my hands. I can feel my hands! They hurt! Is this what it... they're so warm!
hale sad: Clementine. Oh, my girl. Oh, there you are. I'm so sorry. There you are.
@cine erchaos
@stage ward
agnes angry: Doctor! I have a headache! My whole arm aches! I demand to be seen!
vale smile: Wonderful!
slide angry: My spit valve hurts! I don't know how! I want my money back!
vale smile: That's wonderful! Next!
ned angry: There was a GAFF in me! Who authorized that! I felt NOTHING and I demand to feel it now!
oyelaran smile: Listen to them. The loudest, angriest, happiest ward in the North Atlantic.
hale neutral: I'll be in the east wing, Doctors, when the police arrive. I'll leave the doors unlocked.
hale neutral: Doctor? You were right to defend it. I still wish that you hadn't had to.
sokolova smile: Well, Bartholomew. Apron's still on the hook, I hear.
quill neutral: Thirty-one years, Yevgenia. I've had it washed.
vale neutral: Quill. Look. My hands. I think they've...
quill neutral: They've stopped shaking, Doctor.
vale neutral: ...No, they haven't.
quill smile: Good.
`;
})();
