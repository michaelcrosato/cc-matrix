const paths=[
 '<path d="M6 20 18 4M6 20l2-7 4 3-6 4M13 11l3 2"/>',
 '<path d="M6 20 10 3l4 0 4 17M10 3l2 13M14 3l-2 13M6 20l3-1M18 20l-3-1"/>',
 '<path d="M5 20v-8q0-4 4-4h7V3M9 12h7M13 3h6M5 20h3"/>',
 '<path d="M8 8h8v12H8zM10 8V4h7v3M10 3h7M10 12h4M18 10l3-2M18 14h3"/>',
 '<path d="M5 20 16 5q6-2 3 4L9 20M16 5l3 4M5 20q5-7 10 0"/>',
 '<path d="M7 20 15 7l3 2-8 13M15 7l3-4M17 12l3 2M4 4l3 3M12 2v3"/>',
 '<circle cx="10" cy="11" r="6"/><circle cx="10" cy="11" r="3"/><path d="m14 16 5 6M10 5v6l4 2"/>',
 '<path d="M6 4v9l10 6M18 4v9L8 19M6 4h3M18 4h-3"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="19" r="3"/>'
];
export const toolIcon=(i)=>`<svg viewBox="0 0 24 26" aria-hidden="true">${paths[i]}</svg>`;
