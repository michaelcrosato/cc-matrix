// about: the About pages carry every Source Information field and the feedback lists; exit-interview.json is complete
export default async ({ boot, t, rd }) => {
  const { G } = boot();
  await t('the About pages carry every field and every answer', () => { const pages = G.ABOUT_PAGES(), si = pages.find(p => p.title === 'SOURCE INFORMATION'); for (const k of ['Date', 'Source', 'Plan', 'Genre and Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage']) { const r = si.rows.find(x => x[0] === k); if (!r || !String(r[1]).trim()) throw new Error(k); } if (G.ABOUT.testingFeedback.length !== 4 || G.ABOUT.engineFeedback.length !== 6 || G.ABOUT.promptFeedback.length !== 4) throw new Error('feedback lengths'); });
  await t('exit-interview.json parses and every value is filled in', () => {
    const j = JSON.parse(rd('../exit-interview.json')), keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    for (const k of keys) if (!String(j.sourceInformation[k] || '').trim()) throw new Error('sourceInformation.' + k);
    if (j.testingFeedback.length !== 4 || j.engineFeedback.length !== 6 || j.promptFeedback.length !== 4) throw new Error('feedback lengths');
    for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls']) if (!String(j.aiHub[k] || '').trim()) throw new Error('aiHub.' + k);
    if (!Array.isArray(j.aiHub.tags) || j.aiHub.tags.length < 3 || j.aiHub.tags.length > 6) throw new Error('tags');
    if (JSON.stringify(j.testingFeedback) !== JSON.stringify(G.ABOUT.testingFeedback)) throw new Error('About and exit interview disagree');
  });
};
