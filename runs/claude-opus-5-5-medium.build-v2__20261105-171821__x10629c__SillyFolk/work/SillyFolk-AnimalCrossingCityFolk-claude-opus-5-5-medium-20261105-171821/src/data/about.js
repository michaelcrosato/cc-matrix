// Source Information and feedback: the same text as the chat reply and exit-interview.json.
import { SOURCE_INFORMATION, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK } from './aboutText.js';
export const ABOUT_PAGES = [
  { title: 'Source Information', rows: SOURCE_INFORMATION },
  { title: 'Testing Feedback', rows: TESTING_FEEDBACK },
  { title: 'Engine Feedback', rows: ENGINE_FEEDBACK },
  { title: 'Prompt Feedback', rows: PROMPT_FEEDBACK },
  { title: 'Cast', rows: [['Mrs. Gander', 'as herself, and as your creditor'], ['Mayor Trundle', 'arriving shortly'], ['The neighbours', 'Dorrit, Tavi, Bartleby, Lady Ottoline, Rocco, Nib, Ozzie, Yolanda, Fitch'], ['The City', 'Monsieur Fleece, Flavia Rosé, Magda, Sir Reginald Bellows, Pemberton, Agent Brisket, Languid Lou, Madame Nibbles'], ['Also', 'Clementine and the bee, Dr. Quill, Madame Mothwick, Hester, Vesper, Old Rind, Inspector Pimm']] },
  { title: 'Licences', rows: [['Riftlight Pixel Engine 0.46.0', 'MIT. Includes three.js r186 (MIT) and Rapier (Apache-2.0).'], ['Kenney Furniture Kit 2.0', 'CC0, by Kenney (kenney.nl). Credited anyway, gladly.'], ['Silly Folk', 'Original game. All names, characters, art, music and writing are new.'], ['Inspired by', 'Animal Crossing: City Folk'], ['Full text', "The kit's CREDITS.md ships in this page: press the prompt below to read it."]], credits: true },
];
