const { groqChat } = require('./groqClient');

const HOOK_MAP = {
  contradiction: 'a bold contradiction that stops the scroll',
  secret:        'a secret nobody is talking about',
  mistake:       'a warning about a costly mistake',
  question:      'a bold rhetorical question creating instant curiosity',
  statistic:     'a shocking counterintuitive statistic',
};

function cleanText(v, fallback = '') {
  return String(v || fallback).replace(/\s+/g, ' ').trim();
}

function normalizeScript(raw, { niche, topic }) {
  const safeTips = Array.isArray(raw?.tips) ? raw.tips : [];
  const tips = safeTips.slice(0, 3).map((t, i) => ({
    title: cleanText(t?.title, `Tip ${i + 1}`),
    text: cleanText(t?.text, `Praktičan savjet #${i + 1} za ${niche}.`),
    overlay: cleanText(t?.overlay, `TIP ${i + 1}`),
    broll: cleanText(t?.broll, `${niche} stock footage`),
  }));
  while (tips.length < 3) {
    const i = tips.length + 1;
    tips.push({
      title: `Tip ${i}`,
      text: `Primijeni konkretan korak #${i} za ${niche}.`,
      overlay: `TIP ${i}`,
      broll: `${niche} stock footage`,
    });
  }

  const hashtags = Array.isArray(raw?.hashtags) ? raw.hashtags.filter(Boolean).slice(0, 10) : [];
  while (hashtags.length < 10) hashtags.push(`tag${hashtags.length + 1}`);

  const out = {
    title: cleanText(raw?.title, `${topic || niche} in 60s`),
    hook: {
      text: cleanText(raw?.hook?.text, `Ako radiš ${niche}, ovo moraš znati odmah.`),
      overlay: cleanText(raw?.hook?.overlay, 'STOP SCROLL'),
      broll: cleanText(raw?.hook?.broll, `${niche} visual opener`),
    },
    tips,
    ending: {
      text: cleanText(raw?.ending?.text, 'Zapamti ovo i sačuvaj video za kasnije.'),
      overlay: cleanText(raw?.ending?.overlay, 'SAVE THIS'),
      broll: cleanText(raw?.ending?.broll, `${niche} ending loop`),
    },
    hashtags,
    description: cleanText(raw?.description, `${topic || niche} kratki vodič. Zaprati za više.`).slice(0, 220),
    voiceTone: cleanText(raw?.voiceTone, 'Confident, energetic, fast-paced'),
    estimatedViews: cleanText(raw?.estimatedViews, '10K-100K'),
    viralScore: Math.max(1, Math.min(100, parseInt(raw?.viralScore, 10) || 70)),
  };

  out.fullText = [out.hook.text, ...out.tips.map(t => t.text), out.ending.text].join(' ');
  return out;
}

module.exports = async function generator({ niche, topic, hookStyle = 'contradiction', platform = 'both' } = {}) {
  const _niche    = niche    || process.env.DEFAULT_NICHE    || 'AI Tools';
  const _platform = platform || process.env.DEFAULT_PLATFORM || 'both';
  const _topic    = topic || `${_niche} tips`;

  const ideaPrompt = `You are a senior short-form content researcher.
Return JSON:
{
  "ideas":[
    {"topic":"", "angle":"", "hookSeed":"", "noveltyScore":0, "competition":"low|mid|high"},
    {"topic":"", "angle":"", "hookSeed":"", "noveltyScore":0, "competition":"low|mid|high"},
    {"topic":"", "angle":"", "hookSeed":"", "noveltyScore":0, "competition":"low|mid|high"}
  ],
  "selectedIndex":0
}
Constraints: niche="${_niche}", userTopic="${_topic}", platform="${_platform}", audience intent="high retention + saves + shares".`;

  const ideaPack = await groqChat(ideaPrompt, { model: 'best', maxTokens: 1000, jsonMode: true, temperature: 0.5 });
  const selectedIndex = Math.max(0, Math.min(2, parseInt(ideaPack?.selectedIndex, 10) || 0));
  const selectedIdea = (Array.isArray(ideaPack?.ideas) && ideaPack.ideas[selectedIndex]) || {};

  const prompt = `You are an elite viral content strategist for faceless ${_platform} channels.
Generate a complete 60-second script for niche: "${_niche}", topic: "${selectedIdea.topic || _topic}".
Hook style: ${HOOK_MAP[hookStyle] || HOOK_MAP.contradiction}.
Strategic angle: "${selectedIdea.angle || 'high-value practical transformation'}"
Seed hook concept: "${selectedIdea.hookSeed || 'pattern interrupt + specific promise'}"
Hard constraints:
- extremely specific
- no fluff
- 8th-grade clarity
- each section must introduce new value
- closing line must create loop / replay intent

Return this exact JSON:
{
  "title": "catchy video title",
  "hook": { "text": "0-3s hook script", "overlay": "max 5 words", "broll": "specific footage" },
  "tips": [
    { "title": "tip 1 title", "text": "3-20s script", "overlay": "overlay text", "broll": "footage" },
    { "title": "tip 2 title", "text": "20-35s script", "overlay": "overlay text", "broll": "footage" },
    { "title": "tip 3 title", "text": "35-50s script", "overlay": "overlay text", "broll": "footage" }
  ],
  "ending": { "text": "50-60s loop hook", "overlay": "overlay text", "broll": "footage" },
  "hashtags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "description": "caption 150 chars",
  "voiceTone": "delivery instructions",
  "estimatedViews": "50K-500K",
  "viralScore": 85
}`;

  const parsed = await groqChat(prompt, { model: 'best', maxTokens: 2200, jsonMode: true, temperature: 0.55 });
  return normalizeScript(parsed, { niche: _niche, topic: selectedIdea.topic || _topic });
};
