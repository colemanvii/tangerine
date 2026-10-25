/*
 * Haven connections.
 *
 * Suggests where an earlier thought of yours meets a passage you are reading.
 * It runs entirely in this browser by matching words and a small, visible list
 * of themes. It reads text and returns suggestions with their reasons; it has
 * no way to write to your entries. Every suggestion says why it appeared.
 */
(function (root) {
  'use strict';

  // Each theme is a plain-language name and the word stems that signal it.
  const THEMES = {
    reverence: { label: 'reverence — the fear that is a beginning of wisdom', stems: ['fear of the lord', 'fear god', 'reveren', 'awe', 'holy', 'trembl', 'wisdom', 'worship'] },
    withholding: { label: 'fear that keeps you from acting', stems: ['hid', 'hide', 'hiding', 'buried', 'bury', 'talent', 'not sent', 'haven\'t sent', 'have not sent', 'drawer', 'caution', 'prudence', 'new step', 'new word', 'refuse', 'waiting for the right', 'put off', 'hold back', 'held back', 'run away', 'ran away'] },
    tomorrow: { label: 'fear of what has not happened yet', stems: ['tomorrow', 'morrow', 'future', 'what if', 'imagin', 'rehears', 'anticipat', 'worr', 'take no thought', 'take therefore no thought', '3am', 'three in the morning', 'nothing has actually happened', 'nothing has happened'] },
    judgement: { label: 'fear as a judgement about things, not the things', stems: ['opinion', 'judgement', 'judgment', 'disturb', 'the story i tell', 'not the thing'] },
    death: { label: 'death and the shape of a life', stems: ['death', 'die', 'dying', 'mortal', 'scaffold', 'execut', 'cease to live', 'end of my life', 'ordinary'] },
    courage: { label: 'courage — fearing the right things rightly', stems: ['courage', 'brave', 'coward', 'strong', 'strength', 'broken', 'battle', 'run', 'flee', 'good courage'] },
    trust: { label: 'trust — not being alone with it', stems: ['with thee', 'with you', 'i am with', 'uphold', 'lilies', 'all shall be well', 'not leave', 'never leave', 'trust', 'whom shall i fear', 'wait on the lord'] },
    freedom: { label: 'anxiety and freedom', stems: ['freedom', 'possibilit', 'dizz', 'anxiety', 'dread', 'choose', 'choice'] },
    love: { label: 'love and fear', stems: ['perfect love', 'no fear in love', 'love', 'sound mind'] },
  };

  const STOP = new Set(('a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves thou thee thy thine ye hath hast shall shalt unto upon also one even may might must every much many like into yet let us said says say get got make made really thing things something').split(' '));

  function normalize(text) {
    return (text || '').toLowerCase().replace(/[’']/g, '\'').replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function stem(word) {
    return word.replace(/'s$/, '').replace(/(ing|edly|ed|ly|es|s)$/, '').slice(0, 6);
  }

  // Map of stem -> the word as it was written, so reasons can quote real words.
  function words(text) {
    const map = new Map();
    normalize(text).split(' ').forEach((w) => {
      const clean = w.replace(/'/g, '');
      if (clean.length > 3 && !STOP.has(w) && !STOP.has(clean) && !map.has(stem(clean))) map.set(stem(clean), clean);
    });
    return map;
  }

  function themesOf(text, declared) {
    const t = ' ' + normalize(text) + ' ';
    const found = new Set(declared || []);
    Object.entries(THEMES).forEach(([key, theme]) => {
      if (theme.stems.some((s) => t.includes(' ' + s) || t.includes(s + ' '))) found.add(key);
    });
    return found;
  }

  /*
   * passage: { id, text, themes? }  entry text: string
   * Returns null or { score, themes: [{key,label}], words: [..] }
   */
  function relate(passageText, passageThemes, entryText) {
    const pt = themesOf(passageText, passageThemes);
    const et = themesOf(entryText);
    const sharedThemes = [...pt].filter((k) => et.has(k));
    const pw = words(passageText);
    const sharedWords = [...words(entryText)].filter(([st]) => pw.has(st) && st !== 'fear' && st !== 'afraid').map(([, w]) => w);
    const score = sharedThemes.length * 3 + sharedWords.length;
    if (!sharedThemes.length || score < 4) return null;
    return {
      score,
      themes: sharedThemes.map((k) => ({ key: k, label: THEMES[k].label })),
      words: sharedWords.slice(0, 4),
    };
  }

  /* Rank entries against one passage. entryText(e) supplies the text to read. */
  function suggest(passage, entries, entryText, dismissed) {
    const skip = new Set(dismissed || []);
    return entries
      .filter((e) => e.anchor !== passage.id && !skip.has(passage.id + '|' + e.id))
      .map((e) => ({ entry: e, why: relate(passage.text + ' ' + (passage.keywords || ''), passage.themes, entryText(e)) }))
      .filter((s) => s.why)
      .sort((a, b) => b.why.score - a.why.score);
  }

  const HavenConnect = { THEMES, relate, suggest, themesOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = HavenConnect;
  else root.HavenConnect = HavenConnect;
})(typeof window !== 'undefined' ? window : globalThis);
