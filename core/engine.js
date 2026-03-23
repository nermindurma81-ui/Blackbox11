require('dotenv').config();
const generator = require('./generator');
const scorer    = require('./scorer');
const voice     = require('./voice');
const videoRender = require('./video');
const captions  = require('./captions');
const uploader  = require('./uploader');
const monetizer = require('./monetizer');
const analytics = require('./analytics');

async function buildBestScript({ niche, topic, hookStyle, platform, minScore, maxAttempts }) {
  let best = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const script = await generator({ niche, topic, hookStyle, platform });
    const score = scorer(script);
    if (!best || score > best.score) best = { script, score, attempt };
    if (score >= minScore) break;
  }
  return best;
}

/**
 * run(config?) — One full autonomous pipeline cycle
 * config = { niche, topic, hookStyle, platform, count }
 */
async function run(config = {}) {
  const start = Date.now();
  const niche    = config.niche    || process.env.DEFAULT_NICHE    || 'AI Tools';
  const platform = config.platform || process.env.DEFAULT_PLATFORM || 'both';
  const count    = config.count || parseInt(process.env.DAILY_VIDEO_COUNT || process.env.DAILY_COUNT, 10) || 2;
  const minScore = Number(config.minScore || process.env.MIN_SCRIPT_SCORE || 6);
  const maxAttempts = Number(config.maxScriptAttempts || process.env.MAX_SCRIPT_ATTEMPTS || 2);

  console.log(`\n[engine] ══ Start: ${new Date().toISOString()} | Niche: ${niche} | Count: ${count} | MinScore: ${minScore} ══`);

  // Generate scripts (1 at a time with topic, or batch if no topic)
  const topics = config.topic ? [config.topic] : Array(count).fill(null);
  const results = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const id    = Date.now();

    try {
      console.log(`\n[engine] Video ${i+1}/${topics.length}${topic ? ': ' + topic : ''}`);

      const best = await buildBestScript({
        niche,
        topic,
        hookStyle: config.hookStyle,
        platform,
        minScore,
        maxAttempts
      });
      const script = best.script;
      const score = best.score;
      console.log(`[engine]   Score: ${score}/10 (attempt ${best.attempt}/${maxAttempts}) | "${(script.title||'').slice(0,50)}"`);

      if (score < 4) { console.log('[engine]   → Preskačem (score prenizak)\n'); continue; }

      const finalText  = monetizer(script.fullText);

      console.log('[engine]   → Voice...');
      await voice(finalText, id);

      console.log('[engine]   → Captions...');
      captions(finalText, id);

      console.log('[engine]   → Video render...');
      await videoRender(id, script);

      console.log('[engine]   → Upload queue...');
      const uploadResult = await uploader.enqueueUpload(id, {
        title: script.title,
        script,
        niche,
        topic: topic || script.topic || '',
        platform
      });
      if (uploadResult && uploadResult.skipped) {
        console.log(`[engine]   ↷ Upload skipped: ${uploadResult.reason}`);
      } else {
        console.log(`[engine]   ↷ Upload queued: ${uploadResult.queueId}`);
      }

      const entry = analytics.logVideo({
        id,
        score,
        script: { ...script, generationAttempts: best.attempt },
        niche,
        topic,
        durationMs: Date.now()-start
      });
      results.push({ ...entry, status: 'success' });
      console.log(`[engine]   ✓ output/${id}.mp4`);

    } catch (err) {
      console.error(`[engine]   ✗ Error:`, err.message);
      results.push({ id, status: 'failed', error: err.message });
    }

    if (i < topics.length - 1) await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n[engine] ══ Done (${((Date.now()-start)/1000).toFixed(1)}s) | ${results.filter(r=>r.status==='success').length}/${results.length} OK ══\n`);
  return results;
}

module.exports = { run };
