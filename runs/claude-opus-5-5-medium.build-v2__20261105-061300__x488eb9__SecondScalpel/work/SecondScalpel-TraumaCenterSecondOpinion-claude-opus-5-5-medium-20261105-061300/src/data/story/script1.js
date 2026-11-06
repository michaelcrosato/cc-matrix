// Chapters 1 and 2. A tiny script format: "@stage x", "@card A|B", "@cine x", "who expr: line", "? choice => Quill's answer | choice => answer".
(() => {
const G = (window.GAME ||= {}), S = (G.SCRIPT ||= {});
S.c1_before = `
@card Chapter 1|First Incision
@stage scrub
@cine scrubin
quill neutral: Night shift, Doctor. Theatre Three. You are scrubbing the wrong arm.
vale shock: Sorry! Sorry. There are two arms. I knew that. I have read about arms.
quill neutral: Second-year resident, first solo. I have passed instruments for thirty-one years.
quill neutral: I have seen worse. He was a plumber.
vale neutral: Is the attending coming? Dr. Oyelaran said she'd maybe, possibly, come down?
quill neutral: The Chief says a surgeon who needs a chaperone should have been a florist.
@stage theatre
agnes smile: Is that the young lady? You look about twelve. Mind my glass, dear.
vale neutral: Mrs. Pellow, you fell through a greenhouse roof. We need to take the glass out.
agnes smile: Well, keep it. My grandchildren are making a mosaic. It's going to be a heron.
? Of course. Every piece. => She said every piece, Doctor. I shall fetch a nicer dish. | Mrs. Pellow, it's evidence of a fall. => It is evidence of a heron, Doctor.
quill neutral: Under now. Breathe, Doctor. One of you should.
vale shock: Okay okay okay. Sorry! Sorry. She can't hear me. Sorry.
`;
S.c1_after = `
@stage scrub
vale sad: My hands won't stop shaking.
quill neutral: They stop around year thirty, Doctor. I'm told.
vale neutral: Was that... did I do that right? You'd tell me?
quill neutral: Four pieces of glass in a dish, one patient breathing. I have labeled the dish.
percy smile: Vale! A forearm. Well done. They'll be letting you near a knee soon.
vale neutral: Hi, Percy. It was actually quite a lot of glass.
percy smile: I'm sure it was. I did a bowel resection before dinner. Don't stop. It's sweet.
quill neutral: Dr. Whitlock has the steadiest hands in the building. It is a remarkable thing.
quill neutral: He used to shake too, Doctor. Rather more than you. Until about last March.
`;
S.c2_before = `
@stage radiology
odalys smile: Okay so don't freak out, but Dr. Whitlock's chart is wrong and I brought you a donut.
vale shock: Wrong how? Which one? Is the donut a bribe?
odalys smile: Desmond Achebe. Trombone. Percy wrote hernia, in pen, like a man with no fear.
percy smile: Hernia. Obviously. I saw him for ninety seconds. It was more than enough.
odalys neutral: Look at the film. Tell me a hernia casts a round shadow like that.
vale neutral: A surgeon who argues with a chart... is that allowed?
oyelaran neutral: A surgeon who argues with a chart. How tiresome. Do it again.
vale shock: Chief! I didn't, I wasn't, hi. Sorry.
oyelaran neutral: Your chart, Dr. Vale. Your lightbox. Your mistake, should it be one. I shall watch.
`;
S.c2_after = `
@stage gallery
slide smile: A cork. From my spit valve. I swallowed that in 1987, at the Hall, mid-solo.
slide smile: I wondered where that went. I finished the solo, too. Don't tell the band.
vale smile: Mr. Achebe, it grew a whole mass around it. You had a tumor around a cork.
quill neutral: I have labeled it, Doctor. "Cork. Brass section. Do not return to patient."
slide smile: Return it. I'm having it mounted.
percy angry: Hernias can present atypically. I'd like that noted.
oyelaran neutral: It is noted, Dr. Whitlock. In pen.
oyelaran neutral: Dr. Vale. You had a nice clean ring cut. You also apologized to the mesentery.
vale sad: It was there and I was... it seemed rude not to.
oyelaran smile: Keep the hands. Lose the apology. Good night.
`;
S.c3_before = `
@stage harbor
@cine gurney
odalys shock: Okay so there's a thing on the radio! Crane Nine came down on the Anselm docks!
vale shock: How many? Who's on call? Who's senior? Quill, who's senior?
quill neutral: The Chief is in Geneva. Dr. Whitlock has "gone for coffee." You are senior, Doctor.
@stage theatre
tam smile: Hallo, wee doctor. I'm Big Tam. Foreman. That was my crane. Is the crew all right?
vale neutral: Sir, please don't sit up. You have a piece of the crane in you.
tam smile: Aye. It's a good crane. Tell my Morag I'll be late for the tea.
quill neutral: Three arterial tears. Pulse fifty-five. I mention it only in passing.
? Nobody dies tonight. => That is a large sentence, Doctor. Scalpel. | I can't do this alone. => You aren't. I have my knitting in the corridor, in case it's long.
`;
S.c3_after = `
@stage scrub
@cine defib
vale sad: He died. Quill, he died on the table, and then he... didn't. And then there was rain.
vale neutral: The rain in the window stopped. It just hung there. I sealed six ruptures.
quill neutral: How long did that feel, Doctor?
vale neutral: A minute? Maybe a minute?
quill neutral: Eleven seconds. We don't discuss it in the lift.
vale shock: We don't... what do you mean? Quill, what do you mean, "we"?
@stage office
oyelaran neutral: You sealed six ruptures in eleven seconds, Dr. Vale. I read the monitor log myself.
vale sad: Chief, I don't know what happened. I think I need to be checked for something.
oyelaran neutral: There is an old word in theatre. It is not said in the lift, and it is on no form.
oyelaran smile: The Steady. Mr. Quill has passed instruments to three who had it. Keep your hands warm.
`;
S.c4_before = `
@card Chapter 2|The Quiet Ones
@stage ward
ned smile: Morning! Fine day for it. Could someone pull this out? I've a tide at four.
vale shock: Sir! Captain! There is a gaff through your side! A gaff is a very large hook!
ned smile: Is there? So there is. Doesn't hurt a bit. Never felt better. Whistled all the way in.
@stage radiology
odalys shock: Okay so don't freak out, but your X-ray is humming.
vale neutral: X-rays don't hum, Odalys. Do they? Is that a thing?
odalys neutral: Triage says superficial. Look beside the spine. Point at what you see. It moved.
quill neutral: Bring a scalpel for the barbs, Doctor. And something for your nerves. Mine are spoken for.
`;
S.c4_after = `
@stage theatre
vale shock: Did you hear that? In there, under the tissue. Quill. It was singing. Three notes.
quill sad: ...
vale shock: You've got something dry to say. You always do. Quill? Say something dry.
quill sad: ...Dressing, Doctor.
@stage radiology
odalys neutral: Okay. So I ran the tissue. It's not in any database. It isn't in the bad databases.
odalys smile: It feeds on pain signals, Immy. That's why he whistled. It ate his whole gaff.
@stage office
vale neutral: Chief, it's alive and it sings and it eats pain. We have to tell somebody.
oyelaran angry: Not a word, Dr. Vale. Not until I have spoken to the Foundation. That is an instruction.
vale sad: The Foundation? Why would the people who paid for the new wing need to...
oyelaran neutral: Close the door on your way out. Good night.
`;
S.c5_before = `
@stage ward
ilse smile: You're the doctor? Please don't. I know what Mother signed. I don't want this.
vale neutral: Ms. Brandt, you can't feel your left hand. You play the violin.
ilse smile: I can't feel it. Isn't it wonderful? Eleven years of tendon pain, gone. I play for hours.
vale sad: Your fingers are bleeding on the strings. You can't feel that either.
ilse smile: I've never been so happy. You've no idea. Everything is so very quiet now.
percy neutral: Vale, you've been up for forty hours. It's a neuropathy. Let the girl alone.
vale neutral: There's something long moving under her forearm, Percy. I can hear it.
percy smile: You can hear it. Yes. Go to bed.
quill neutral: Fine mode today, Doctor. There is a nerve in there that plays Brahms.
`;
S.c5_after = `
@stage ward
ilse sad: It hurts. Oh, it hurts. It's all of it, all at once, all eleven years.
vale sad: I'm so sorry. I'm so sorry, I can give you something for...
ilse sad: No. No, don't you dare. I can feel my fingers. Thank you. Oh, thank you. It hurts.
@stage radiology
odalys shock: Okay so I made a wall. String, photographs, the works. Look. Every single case.
odalys neutral: Harrow, Brandt, nine more in the ER log. All treated at an Anodyne clinic. All on Lull.
vale neutral: The miracle analgesic. The billboards. "A life without pain."
odalys neutral: It really does work, is the thing. That's the scary part. It really, really works.
percy angry: You've been up for forty hours and you've got a corkboard. Listen to yourselves.
quill neutral: Dr. Whitlock's hands are remarkably steady, for this hour. I mention it only in passing.
`;
S.c6_before = `
@stage gala
hale smile: Friends. Pain is the last disease. Tonight, in this wing, we begin to cure it.
hale smile: I owe this hospital everything. And I owe its Chief of Surgery rather more than that.
oyelaran neutral: You owe me a roof, Lucian. Raise your glass and be brief.
vale neutral: Chief, please. I've got eleven patients and a corkboard. Just look at the film.
oyelaran sad: Not here, Dr. Vale. Not... here. Is it warm? I find it is rather...
@cine galacollapse
vale shock: CHIEF!
hale sad: Someone call a doctor. Oh, Marguerite. I do hope you aren't in any pain.
@stage theatre
quill sad: It's the Chief, Doctor. So. No pressure. There's a note on her chart.
vale sad: "Do not be sentimental." In pen. Of course it's in pen.
vale neutral: Scalpel, Mr. Quill. Please. And thank you. And sorry. Scalpel.
`;
S.c6_after = `
@stage ward
oyelaran sad: Dr. Vale. You stitch like a nervous seamstress. It will hold.
vale sad: You knew. Chief, you were taking it. Your hands. You were on Lull.
oyelaran sad: Arthritis, for nine years. And no roof. Lucian offered me both. I took them.
oyelaran neutral: The thing is called HUSH. Hyperplastic Undifferentiated Synaptic Hive. He built it.
oyelaran neutral: They sing, Doctor. So we name them like songs. I have known since spring.
vale angry: You told me not to say a word. People are dying, and they're smiling.
oyelaran sad: Yes. That is why you must go to someone who is not me. Find Sokolova.
oyelaran neutral: Dr. Yevgenia Sokolova. Hospital ship Samaritan's Wake. She has the Steady too.
@cine traydrop
quill shock: ...
vale shock: Quill? You dropped a tray. You've never dropped a tray. It's been thirty-one years.
quill neutral: So it has, Doctor. Mind the forceps.
hale smile: From the ward TV, warmly: "I hear Dr. Oyelaran is recovering. Wonderful."
`;
})();
