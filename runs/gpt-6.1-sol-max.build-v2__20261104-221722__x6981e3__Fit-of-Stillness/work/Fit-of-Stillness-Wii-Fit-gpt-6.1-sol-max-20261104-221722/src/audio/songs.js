const pattern = (melody, bass, hats='C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .') => ({ lead:melody, bass, hats });
const base = { lead:{ wave:'triangle', attack:.008, decay:.24, volume:.65 }, bass:{ wave:'sine', attack:.01, decay:.3, volume:.6 }, hats:{ wave:'noise', decay:.025, volume:.45 } };
function song(bpm,notes,low,{quiet=false}={}) {return {bpm,stepsPerBeat:4,tracks:{...base,lead:{...base.lead,decay:quiet?.8:.24},hats:{...base.hats,volume:quiet?.03:.45}},patterns:{a:pattern(notes,low),b:pattern(notes.split(' ').reverse().join(' '),low)},order:['a','a','b','a']};}
export const SONGS = {
 plaza:song(92,'D5 . . A4 . . B4 . E5 . . F#5 . E5 . .','D3 . . . A2 . . . B2 . . . A2 . . .'),
 still:song(60,'D5 - . . . . A4 - . . . . E5 - . .','D3 - . . . . . . A2 - . . . . . .',{quiet:true}),
 reps:song(110,'F#4 . A4 . . C#5 . B4 A4 . F#4 . E4 . . .','F#2 . F#2 . A2 . . C#3 B2 . A2 . E2 . E2 .'),
 hoop:song(108,'G4 . B4 D5 . B4 . A4 G4 . E4 . A4 B4 . .','G2 . . G2 . . D3 . E2 . . E2 . . D3 .'),
 step:song(104,'E5 . G5 . B5 . G5 . D5 . F#5 . A5 . F#5 .','E3 . E3 . B2 . B2 . D3 . D3 . A2 . A2 .'),
 lagoon:song(120,'A4 . C5 . E5 . . C5 G4 . B4 . D5 . . B4','A2 . . E3 . A2 . . G2 . . D3 . G2 . .'),
 jog:song(112,'D5 F#5 A5 . F#5 . E5 . D5 . A4 . B4 . E5 .','D3 . A2 . D3 . A2 . B2 . F#2 . E3 . A2 .'),
 report:song(70,'B5 . . F#5 . . D5 . E5 . . A5 . . F#5 .','B2 - . . . . . . E3 - . . . . . .',{quiet:true}),
 long:song(48,'D4 - - - . . . . A4 - - - . . . .','D2 - - - . . . . A2 - - - . . . .',{quiet:true})
};
