export const FIRST = ['Gentle', 'Quiet', 'Brave', 'Sleepy', 'Dapper', 'Cheerful', 'Humble', 'Plucky', 'Gracious', 'Wobbly', 'Earnest', 'Tidy', 'Sunny', 'Mild', 'Spry'];
export const LAST = ['Margaret', 'Percival', 'Dorothea', 'Bartholomew', 'Winifred', 'Humphrey', 'Philippa', 'Cornelius', 'Beatrix', 'Reginald', 'Marigold', 'Ignatius', 'Tabitha', 'Lawrence', 'Ottoline'];
export function genName(r) { return FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)]; }
