module.exports = function scorer(script) {
  const text = typeof script === 'string' ? script : (script.fullText || script.hook?.text || '');
  const s = text.toLowerCase();
  let score = 0;

  if (/stop scrolling/i.test(text))                       score += 3;
  if (/nobody (talks|tells|shows) about/i.test(text))     score += 3;
  if (/you won'?t believe/i.test(text))                   score += 2;
  if (/secret|hidden|they don'?t want/i.test(text))       score += 2;
  if (/\d+[k$]|\$\d+/i.test(text))                      score += 1;
  if (s.includes('money') || s.includes('earn'))          score += 2;
  if (s.includes('ai') || s.includes('chatgpt'))          score += 1;
  if (typeof script === 'object' && script.viralScore)    score += Math.floor(script.viralScore / 20);

  const len = text.length;
  if (len >= 80 && len <= 300)       score += 2;
  else if (len > 300 && len <= 500)  score += 1;
  else if (len < 30)                 score -= 2;

  if (/link in bio|follow for more|comment/i.test(text)) score += 1;
  if (/[\u{1F300}-\u{1FFFF}]/u.test(text))               score += 1;

  return Math.max(0, Math.min(score, 10));
};
