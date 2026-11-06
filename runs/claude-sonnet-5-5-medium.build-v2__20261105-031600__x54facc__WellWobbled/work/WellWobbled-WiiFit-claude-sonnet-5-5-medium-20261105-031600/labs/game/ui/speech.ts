/**
 * @file Small helper: which speaker says a line id (used by the page when the sim names only an id).
 * @example
 * lineOf('plumb.rest'); // 'plumb'
 */
export const lineOf = (id: string): string => id.split('.')[0];
