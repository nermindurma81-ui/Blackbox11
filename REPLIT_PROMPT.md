Build a Node.js app called **BlackBox AI MAX** — an autonomous AI short video factory with a full dashboard (16 tools). The app has a backend pipeline (Groq AI + StreamElements TTS + FFmpeg) and a single-page frontend with sidebar navigation.

---

## STEP 1 — SETUP (run these shell commands first)

```bash
# Install system dependencies
apt-get install -y ffmpeg
npm install
```

---

## STEP 2 — FILE STRUCTURE

Create exactly this structure:

```
blackbox-max/
├── server.js
├── package.json
├── .env
├── .gitignore
├── core/
│   ├── engine.js
│   ├── groqClient.js
│   ├── generator.js
│   ├── scorer.js
│   ├── voice.js
│   ├── video.js
│   ├── captions.js
│   ├── monetizer.js
│   ├── uploader.js
│   └── analytics.js
├── bots/
│   ├── autoPipeline.js
│   └── scheduler.js
├── output/
└── public/
    └── index.html
```

---

## STEP 3 — package.json

```json
{
  "name": "blackbox-max",
  "version": "2.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "pipeline": "node bots/autoPipeline.js",
    "schedule": "node bots/scheduler.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "fluent-ffmpeg": "^2.1.3",
    "node-cron": "^3.0.3",
    "uuid": "^9.0.0"
  }
}
```

---

## STEP 4 — .env

```
GROQ_API_KEY=your_groq_key_here
PORT=3000
DEFAULT_NICHE=AI Tools
DEFAULT_PLATFORM=both
DAILY_VIDEO_COUNT=3
TIMEZONE=America/New_York
PROMO_LINK=https://yourlink.com
PROMO_CTA=🔥 Link in bio!
```

---

## STEP 5 — .gitignore

```
node_modules/
output/
.env
analytics.log
bg.jpg
*.mp3
*.mp4
*.srt
```

---

## STEP 6 — core/groqClient.js

```js
const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = {
  best:   'llama-3.3-70b-versatile',
  fast:   'llama-3.1-8b-instant',
  code:   'mixtral-8x7b-32768',
  backup: 'gemma2-9b-it',
};

let lastCall = 0;

async function groqChat(prompt, { model = 'best', maxTokens = 2000, temperature = 0.7, jsonMode = false } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_key_here') throw new Error('GROQ_API_KEY nije postavljen u .env!');

  const wait = 2150 - (Date.now() - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();

  const res = await axios.post(GROQ_URL, {
    model: MODELS[model] || model,
    messages: [
      ...(jsonMode ? [{ role: 'system', content: 'Respond with valid JSON only. No markdown, no preamble.' }] : []),
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens,
    temperature,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  }, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const text = res.data.choices[0]?.message?.content || '';

  if (jsonMode) {
    try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error('Groq invalid JSON: ' + text.slice(0, 150));
    }
  }
  return text;
}

module.exports = { groqChat, MODELS };
```

---

## STEP 7 — core/generator.js

```js
const { groqChat } = require('./groqClient');

const HOOK_MAP = {
  contradiction: 'a bold contradiction that stops the scroll',
  secret:        'a secret nobody is talking about',
  mistake:       'a warning about a costly mistake',
  question:      'a bold rhetorical question creating instant curiosity',
  statistic:     'a shocking counterintuitive statistic',
};

module.exports = async function generator({ niche, topic, hookStyle = 'contradiction', platform = 'both' } = {}) {
  const _niche    = niche    || process.env.DEFAULT_NICHE    || 'AI Tools';
  const _platform = platform || process.env.DEFAULT_PLATFORM || 'both';

  const prompt = `You are an elite viral content strategist for faceless ${_platform} channels.
Generate a complete 60-second script for niche: "${_niche}", topic: "${topic || _niche + ' tips'}".
Hook style: ${HOOK_MAP[hookStyle] || HOOK_MAP.contradiction}.

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

  const parsed = await groqChat(prompt, { model: 'best', maxTokens: 2000, jsonMode: true });
  parsed.fullText = [
    parsed.hook?.text,
    ...(parsed.tips || []).map(t => t.text),
    parsed.ending?.text,
  ].filter(Boolean).join(' ');
  return parsed;
};
```

---

## STEP 8 — core/scorer.js

```js
module.exports = function scorer(script) {
  const text = typeof script === 'string' ? script : (script.fullText || script.hook?.text || '');
  const s = text.toLowerCase();
  let score = 0;

  if (/stop scrolling/i.test(text))                    score += 3;
  if (/nobody (talks|tells|shows) about/i.test(text))  score += 3;
  if (/you won'?t believe/i.test(text))                score += 2;
  if (/secret|hidden|they don'?t want/i.test(text))    score += 2;
  if (/\d+[k$]|\$\d+/i.test(text))                   score += 1;
  if (s.includes('money') || s.includes('earn'))       score += 2;
  if (s.includes('ai') || s.includes('chatgpt'))       score += 1;
  if (typeof script === 'object' && script.viralScore) score += Math.floor(script.viralScore / 20);

  const len = text.length;
  if (len >= 80 && len <= 300)       score += 2;
  else if (len > 300 && len <= 500)  score += 1;
  else if (len < 30)                 score -= 2;

  if (/link in bio|follow for more|comment/i.test(text)) score += 1;
  if (/[\u{1F300}-\u{1FFFF}]/u.test(text))               score += 1;

  return Math.max(0, Math.min(score, 10));
};
```

---

## STEP 9 — core/voice.js

Uses StreamElements TTS — FREE, no API key needed. Uses `execFile` NOT `exec` to avoid shell injection.

```js
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const VOICES = {
  male_energetic:   'Brian',
  male_calm:        'Matthew',
  female_energetic: 'Joanna',
  female_calm:      'Amy',
  default:          'Brian',
};

module.exports = async function voice(text, id, voicePreset = 'male_energetic') {
  const outDir  = path.resolve('output');
  const outFile = path.join(outDir, `${id}.mp3`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const voiceName = VOICES[voicePreset] || VOICES.default;
  const cleanText = String(text)
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 3000);

  try {
    const res = await axios.get('https://api.streamelements.com/kappa/v2/speech', {
      params: { voice: voiceName, text: cleanText },
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    fs.writeFileSync(outFile, Buffer.from(res.data));
    console.log(`[voice] ✓ ${outFile}`);
    return outFile;
  } catch (err) {
    console.error(`[voice] TTS failed: ${err.message} — using silence`);
    fs.writeFileSync(outFile, Buffer.alloc(0));
    return outFile;
  }
};
```

---

## STEP 10 — core/captions.js

```js
const fs   = require('fs');
const path = require('path');

module.exports = function captions(text, id) {
  const outDir  = path.resolve('output');
  const outFile = path.join(outDir, `${id}.srt`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const sentences = String(text).split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const WPS = 2.2;
  let cursor = 0;

  const srt = sentences.map((s, i) => {
    const dur   = Math.max(1.5, s.split(/\s+/).length / WPS);
    const start = cursor;
    const end   = cursor + dur;
    cursor      = end + 0.1;
    return `${i+1}\n${fmt(start)} --> ${fmt(end)}\n${s}`;
  }).join('\n\n');

  fs.writeFileSync(outFile, srt, 'utf8');
  return outFile;
};

function fmt(s) {
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=Math.floor(s%60),ms=Math.round((s%1)*1000);
  return `${p(h)}:${p(m)}:${p(ss)},${String(ms).padStart(3,'0')}`;
}
function p(n) { return String(n).padStart(2,'0'); }
```

---

## STEP 11 — core/video.js

```js
const ffmpeg = require('fluent-ffmpeg');
const fs     = require('fs');
const path   = require('path');

const OUTPUT_DIR = path.resolve('output');
const BG_FILE    = path.resolve('bg.jpg');

module.exports = async function video(id, script = {}) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(BG_FILE)) await createBg();

  const mp3File = path.join(OUTPUT_DIR, `${id}.mp3`);
  const outFile = path.join(OUTPUT_DIR, `${id}.mp4`);
  const hasAudio = fs.existsSync(mp3File) && fs.statSync(mp3File).size > 100;

  const esc = t => (t || '').replace(/'/g, "\\'").replace(/:/g, '\\:').slice(0, 35);
  const hook = esc(script.hook?.overlay || script.title || 'Watch This');
  const t1   = esc(script.tips?.[0]?.overlay || '');
  const t2   = esc(script.tips?.[1]?.overlay || '');
  const t3   = esc(script.tips?.[2]?.overlay || '');
  const end  = esc(script.ending?.overlay || 'Follow For More');

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    cmd.input(BG_FILE).inputOptions(['-loop', '1']);
    if (hasAudio) cmd.input(mp3File);

    const filters = [
      '[0:v]scale=1080:1920,setsar=1[base]',
      `[base]drawtext=text='${hook}':fontsize=68:fontcolor=white:x=(w-text_w)/2:y=h*0.12:enable='between(t,0,3)':box=1:boxcolor=black@0.65:boxborderw=18[v1]`,
      `[v1]drawtext=text='${t1}':fontsize=54:fontcolor=#FFD700:x=(w-text_w)/2:y=h*0.12:enable='between(t,3,20)':box=1:boxcolor=black@0.6:boxborderw=14[v2]`,
      `[v2]drawtext=text='${t2}':fontsize=54:fontcolor=#FFD700:x=(w-text_w)/2:y=h*0.12:enable='between(t,20,35)':box=1:boxcolor=black@0.6:boxborderw=14[v3]`,
      `[v3]drawtext=text='${t3}':fontsize=54:fontcolor=#FFD700:x=(w-text_w)/2:y=h*0.12:enable='between(t,35,50)':box=1:boxcolor=black@0.6:boxborderw=14[v4]`,
      `[v4]drawtext=text='${end}':fontsize=68:fontcolor=white:x=(w-text_w)/2:y=h*0.12:enable='between(t,50,60)':box=1:boxcolor=black@0.65:boxborderw=18[vout]`,
    ];

    cmd.complexFilter(filters)
      .outputOptions([
        '-map', '[vout]',
        ...(hasAudio ? ['-map', '1:a'] : []),
        '-t', '60', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
      ])
      .output(outFile)
      .on('end', () => { console.log(`[video] ✓ ${outFile}`); resolve(outFile); })
      .on('error', err => { console.error('[video] FFmpeg error:', err.message); reject(err); })
      .run();
  });
};

function createBg() {
  return new Promise(resolve => {
    ffmpeg()
      .input('color=c=0x0a0a0a:size=1080x1920:rate=30')
      .inputOptions(['-f', 'lavfi'])
      .outputOptions(['-frames:v', '1'])
      .output(BG_FILE)
      .on('end', resolve)
      .on('error', e => { console.error('[video] bg error:', e.message); resolve(); })
      .run();
  });
}
```

---

## STEP 12 — core/monetizer.js

```js
module.exports = function monetizer(text) {
  const link = process.env.PROMO_LINK || 'https://yourlink.com';
  const cta  = process.env.PROMO_CTA  || '🔥 Link in bio!';
  if (/link in bio/i.test(text)) return text;
  return `${String(text).trimEnd()}\n${cta} ${link}`;
};
```

---

## STEP 13 — core/uploader.js

```js
const fs   = require('fs');
const path = require('path');

module.exports = async function uploader(id, meta = {}) {
  const file = path.resolve(`output/${id}.mp4`);
  if (!fs.existsSync(file)) { console.warn(`[uploader] Missing: ${file}`); return; }
  const mb = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
  console.log(`[uploader] Ready: ${file} (${mb} MB)`);

  // YouTube Upload — uncomment + add YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN to .env:
  // const { google } = require('googleapis');
  // const auth = new google.auth.OAuth2(process.env.YT_CLIENT_ID, process.env.YT_CLIENT_SECRET);
  // auth.setCredentials({ refresh_token: process.env.YT_REFRESH_TOKEN });
  // const yt = google.youtube({ version: 'v3', auth });
  // await yt.videos.insert({ part:['snippet','status'], requestBody:{ snippet:{ title:meta.title?.slice(0,70)||'AI Shorts', categoryId:'22' }, status:{ privacyStatus:'public' } }, media:{ body:fs.createReadStream(file) } });
};
```

---

## STEP 14 — core/analytics.js

```js
const fs   = require('fs');
const path = require('path');
const LOG  = path.resolve('analytics.log');

function logVideo({ id, score, script, niche, topic, durationMs = 0 }) {
  const entry = {
    id, score,
    title: (script?.title || String(script).slice(0, 80)).replace(/\n/g, ' '),
    niche: niche || 'unknown',
    topic: topic || '',
    viralScore: script?.viralScore || 0,
    estimatedViews: script?.estimatedViews || '—',
    ts: new Date().toISOString(),
    durationMs,
  };
  fs.appendFileSync(LOG, JSON.stringify(entry) + '\n', 'utf8');
  return entry;
}

function getLog(limit = 50) {
  if (!fs.existsSync(LOG)) return [];
  return fs.readFileSync(LOG, 'utf8')
    .split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean).reverse().slice(0, limit || 9999);
}

function getSummary() {
  const log = getLog(0);
  if (!log.length) return { total: 0, avgScore: 0, lastRun: null, today: 0, topNiche: '—' };
  const today = new Date().toISOString().slice(0, 10);
  const avgScore = +(log.reduce((s, e) => s + (e.score || 0), 0) / log.length).toFixed(1);
  const nicheCounts = {};
  log.forEach(e => { nicheCounts[e.niche] = (nicheCounts[e.niche] || 0) + 1; });
  const topNiche = Object.entries(nicheCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
  return { total: log.length, today: log.filter(e => e.ts.startsWith(today)).length, avgScore, lastRun: log[0]?.ts || null, topNiche };
}

module.exports = { logVideo, getLog, getSummary };
```

---

## STEP 15 — core/engine.js

```js
require('dotenv').config();
const generator   = require('./generator');
const scorer      = require('./scorer');
const voice       = require('./voice');
const videoRender = require('./video');
const captions    = require('./captions');
const uploader    = require('./uploader');
const monetizer   = require('./monetizer');
const analytics   = require('./analytics');

async function run(config = {}) {
  const start    = Date.now();
  const niche    = config.niche    || process.env.DEFAULT_NICHE    || 'AI Tools';
  const platform = config.platform || process.env.DEFAULT_PLATFORM || 'both';
  const count    = config.count    || parseInt(process.env.DAILY_VIDEO_COUNT) || 2;

  console.log(`\n[engine] ══ Start: ${new Date().toISOString()} | Niche: ${niche} | Count: ${count} ══`);

  const topics  = config.topic ? [config.topic] : Array(count).fill(null);
  const results = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const id    = Date.now();
    try {
      console.log(`\n[engine] Video ${i+1}/${topics.length}${topic ? ': ' + topic : ''}`);
      const script = await generator({ niche, topic, hookStyle: config.hookStyle, platform });
      const score  = scorer(script);
      console.log(`[engine]   Score: ${score}/10 | "${(script.title||'').slice(0,50)}"`);
      if (score < 4) { console.log('[engine]   → Preskačem\n'); continue; }

      const finalText = monetizer(script.fullText);
      console.log('[engine]   → Voice...');  await voice(finalText, id);
      console.log('[engine]   → Captions...'); captions(finalText, id);
      console.log('[engine]   → Video...');  await videoRender(id, script);
      console.log('[engine]   → Upload...'); await uploader(id, { title: script.title, script });

      const entry = analytics.logVideo({ id, score, script, niche, topic, durationMs: Date.now()-start });
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
```

---

## STEP 16 — server.js

```js
require('dotenv').config();
const express  = require('express');
const cron     = require('node-cron');
const { run }  = require('./core/engine');
const { groqChat } = require('./core/groqClient');
const analytics    = require('./core/analytics');

const app = express();
app.use(express.static('public'));
app.use(express.json());

app.post('/api/pipeline/run', (req, res) => {
  const config = req.body || {};
  run(config).catch(console.error);
  res.json({ status: 'started', config, ts: new Date().toISOString() });
});
app.get('/run', (req, res) => { run().catch(console.error); res.json({ status: 'started' }); });
app.get('/api/analytics/summary', (req, res) => res.json(analytics.getSummary()));
app.get('/api/analytics/log',     (req, res) => res.json(analytics.getLog(parseInt(req.query.n)||50)));

// All Groq generation endpoints
const genEndpoints = {
  '/api/generate/script':     (b) => require('./core/generator')(b),
  '/api/generate/metadata':   (b) => groqChat(`SEO expert. Metadata for ${b.platform||'both'} video. Niche: ${b.niche}. Topic: ${b.topic}. Excerpt: "${b.excerpt||''}". Return JSON: {"titles":{"primary":"","alt1":"","alt2":""},"description":{"youtube":"","tiktok":""},"hashtags":{"high_volume":[],"mid_volume":[],"niche":[]},"thumbnail":{"headline":"","subtext":"","colorScheme":"","style":""},"seo":{"primaryKeyword":"","bestPostTime":"","competitionLevel":""},"viralPotential":{"score":80,"reasoning":"","suggestions":[]}}`, { model:'best', maxTokens:1500, jsonMode:true }),
  '/api/generate/trends':     (b) => groqChat(`Viral trend analyst. ${b.count||8} trending angles for "${b.niche}". Return JSON: {"trends":[{"topic":"","angle":"","viralReason":"","searchVolume":"high","competition":"low","estimatedViews":"50K-500K","hookIdea":"","difficulty":4}],"hotNow":["t1","t2","t3"],"nextWeek":["t1","t2"],"avoid":["o1"]}`, { model:'best', maxTokens:2000, jsonMode:true }),
  '/api/generate/hooks':      (b) => groqChat(`Hook writer. ${b.count||10} viral hooks for niche "${b.niche}", topic "${b.topic}", style "${b.style||'mixed'}". Return JSON: {"hooks":[{"hook":"","style":"","viralScore":8,"whyItWorks":""}]}`, { model:'best', maxTokens:1500, jsonMode:true }),
  '/api/generate/captions':   (b) => groqChat(`Social media expert. 5 captions for ${b.platform||'both'} about "${b.topic}" (${b.niche}), tone: ${b.tone||'engaging'}. Return JSON: {"captions":[{"caption":"","platform":"","charCount":0,"hashtags":[],"bestTime":""}]}`, { model:'best', maxTokens:1200, jsonMode:true }),
  '/api/generate/hashtags':   (b) => groqChat(`Hashtag strategist. Optimized hashtags for ${b.platform||'both'}: topic "${b.topic}", niche "${b.niche}". Return JSON: {"high_volume":[],"mid_volume":[],"niche_specific":[],"banned":[],"recommended":"20 ready hashtags"}`, { model:'fast', maxTokens:800, jsonMode:true }),
  '/api/generate/ideas':      (b) => groqChat(`Content ideation. ${b.count||10} video ideas for niche "${b.niche}". Return JSON: {"ideas":[{"title":"","angle":"","hook":"","whyViral":"","difficulty":"easy","estimatedViews":"50K-200K","contentType":"educational"}]}`, { model:'best', maxTokens:2000, jsonMode:true }),
  '/api/generate/niche':      (b) => groqChat(`Niche expert. Recommend niches for keywords "${b.keywords}", goals "${b.goals||'passive income'}". Return JSON: {"recommendations":[{"niche":"","score":85,"competition":"medium","monetization":"high","difficulty":"beginner","whyPerfect":"","topChannels":["c1"],"contentPillars":["p1","p2","p3"]}],"avoid":[],"verdict":""}`, { model:'best', maxTokens:2000, jsonMode:true }),
  '/api/generate/competitor':  (b) => groqChat(`Competitor analysis for "${b.channel}" in "${b.niche}". Return JSON: {"strengths":[],"weaknesses":[],"contentStrategy":"","postingFrequency":"","topFormats":[],"gapsToExploit":[],"viralFormula":"","recommendation":""}`, { model:'best', maxTokens:1500, jsonMode:true }),
  '/api/generate/strategy':   (b) => groqChat(`Growth strategist. ${b.timeframe||'90-day'} plan for "${b.niche}", goal: ${b.goal||'10k followers'}. Return JSON: {"overview":"","phase1":{"focus":"","actions":[],"kpis":[]},"phase2":{"focus":"","actions":[],"kpis":[]},"phase3":{"focus":"","actions":[],"kpis":[]},"contentPillars":[],"postingSchedule":"","monetizationPath":"","successMetrics":[]}`, { model:'best', maxTokens:2000, jsonMode:true }),
  '/api/generate/calendar':   (b) => groqChat(`Content calendar. ${b.days||7}-day plan for "${b.niche}" on ${b.platform||'both'}. Return JSON: {"calendar":[{"day":1,"date":"Mon","topic":"","hook":"","contentType":"educational","platform":"","bestTime":"6PM","hashtags":[]}]}`, { model:'best', maxTokens:2500, jsonMode:true }),
};

Object.entries(genEndpoints).forEach(([path, handler]) => {
  app.post(path, async (req, res) => {
    try { res.json(await handler(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });
});

const TIMEZONE = process.env.TIMEZONE || 'America/New_York';
cron.schedule('0 6  * * *', () => run().catch(console.error), { timezone: TIMEZONE });
cron.schedule('0 19 * * *', () => run().catch(console.error), { timezone: TIMEZONE });
cron.schedule('0 *  * * *', () => console.log(`[CRON] ♥ ${new Date().toISOString()}`));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n⚡ BlackBox AI MAX → http://localhost:${PORT}`);
  console.log(`   GROQ: ${process.env.GROQ_API_KEY ? '✓ OK' : '✗ Add to .env'}\n`);
});
```

---

## STEP 17 — bots/autoPipeline.js

```js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { run } = require('../core/engine');

const args    = process.argv.slice(2);
const get     = k => { const i=args.indexOf(`--${k}`); return i!==-1?args[i+1]:null; };

const config = {
  niche:     get('niche')    || process.env.DEFAULT_NICHE || 'AI Tools',
  platform:  get('platform') || 'both',
  count:     parseInt(get('count') || process.env.DAILY_VIDEO_COUNT || '2'),
  hookStyle: get('hook')     || 'contradiction',
  topic:     get('topic')    || undefined,
};

console.log('\n🤖 BlackBox AI MAX — Auto Pipeline');
console.log(`Niche: ${config.niche} | Count: ${config.count}\n`);

run(config)
  .then(r => { console.log(`✅ Done: ${r.filter(x=>x.status!=='failed').length}/${r.length} OK`); process.exit(0); })
  .catch(e => { console.error('❌ Crash:', e.message); process.exit(1); });
```

---

## STEP 18 — bots/scheduler.js

```js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const cron   = require('node-cron');
const { run } = require('../core/engine');

const TIMEZONE = process.env.TIMEZONE || 'America/New_York';

cron.schedule('0 6  * * *', () => { console.log('[CRON] Morning'); run().catch(console.error); }, { timezone: TIMEZONE });
cron.schedule('0 12 * * *', () => { console.log('[CRON] Midday');  run().catch(console.error); }, { timezone: TIMEZONE });
cron.schedule('0 19 * * *', () => { console.log('[CRON] Evening'); run().catch(console.error); }, { timezone: TIMEZONE });
cron.schedule('0 *  * * *', () => console.log(`[CRON] ♥ ${new Date().toISOString()}`));

console.log('✅ Scheduler: 06:00 + 12:00 + 19:00 daily\n');
```

---

## STEP 19 — public/index.html

Build a dark, professional single-page dashboard. Use Google Fonts: Bebas Neue + DM Mono + Outfit. Color scheme: `--bg:#080808`, `--red:#ff3c3c`, `--green:#00e676`, `--cyan:#00e5ff`, `--purple:#9c60ff`, `--orange:#ff8c00`.

### Layout
- **Fixed left sidebar** (230px) with logo "BLACKBOX MAX" and navigation
- **Main content** (margin-left: 230px) showing the active page

### Sidebar navigation sections and items

**[no section]**
- ⚡ Početna
- 📦 Batch Generator

**IDEA LAB**
- 💡 Generator Ideja
- ⚡ Viral Hook Lab
- 🎯 Niša Finder

**SCRIPT LAB**
- 📝 Generator Skripti
- 💬 Caption Lab
- # Hashtag Engine

**GROWTH LAB**
- 🔥 Trend Discovery
- 📅 Content Kalendar
- 👥 Competitor Analiza
- 🚀 Viral Strategija

**SISTEM**
- 📊 Analytics
- 🤖 Auto Pipeline
- ⚙️ API Ključevi

Bottom of sidebar: status pill showing green dot "GROQ AKTIVAN" or red dot "DODAJ KLJUČ →"

### Page: Početna (home)
- 4-stat grid: AI Alata (6+), Videa Kreiran (from `/api/analytics/summary`), Danas, Avg Score
- Quick Run card: niche input + chips (AI Tools, Finance, Dark Psychology, etc.), topic input, platform select, big red "▶ POKRENI PIPELINE" button → POST `/api/pipeline/run`
- Recent videos log from `/api/analytics/log?n=5` — show title, niche, score/10, timestamp

### Page: Batch Generator
- Niche input + chips, count select (2/3/5/10), hook style select
- Big button → POST `/api/pipeline/run` with count

### Page: Generator Ideja
- Niche input + niche chips, count select (5/10/15)
- Button → POST `/api/generate/ideas` → render idea cards with title, angle, hook, whyViral, difficulty badge, estimatedViews, "→ Otvori u Studiu" button

### Page: Viral Hook Lab
- Niche + topic inputs, hook style chips (Mixed/Contradiction/Secret/Question/Statistic)
- Button → POST `/api/generate/hooks` → render hook cards with hook text, style badge, viralScore/10, whyItWorks, copy button

### Page: Niša Finder
- Keywords input, goal input
- Button → POST `/api/generate/niche` → render niche cards with name, score bar, competition/monetization/difficulty pills, whyPerfect, contentPillars, "→ Generiši za ovu nišu" button

### Page: Generator Skripti (STUDIO — most important page)
- Niche input + chips, topic input, hook style select, platform select
- Big red "⚡ GENERIŠI VIRAL SKRIPTU" button → POST `/api/generate/script`
- After generation show:
  - 4 stat cards: Viral Score, Est. Views, Duration (60s), Platform
  - Tabs: SKRIPTA | SEO METADATA | PIPELINE
  - SKRIPTA tab: 5 colored sections (HOOK red, TIP 01-03 orange, LOOP HOOK cyan) each showing text + b-roll + overlay boxes. Hashtag tags at bottom. Voice tone note. "Kopiraj cijelu skriptu" button.
  - SEO METADATA tab: button to POST `/api/generate/metadata` → show titles, YouTube description, TikTok caption, hashtag groups (high/mid/niche), thumbnail headline, SEO info, viral potential score
  - PIPELINE tab: button to POST `/api/pipeline/run` with current niche+topic

### Page: Caption Lab
- Topic + niche inputs, platform select, tone select (engaging/educational/urgent/casual/professional)
- Button → POST `/api/generate/captions` → render caption cards with caption text, platform badge, char count, best time, hashtags, copy button

### Page: Hashtag Engine
- Topic + niche inputs, platform select
- Button → POST `/api/generate/hashtags` → show three sections (High Volume red, Mid Volume orange, Niche Specific cyan), each with clickable tag chips. "Copy all" button. Banned list in red.

### Page: Trend Discovery
- Niche chips + custom input
- Big red "🔥 SKENIRAJ TRENDING TOPICE" button → POST `/api/generate/trends`
- 2-column result: left = trend cards (topic, hook idea, VOL/COMP badges, estimatedViews, "→ Studio" button), right = Hot Now list + Next Week list + Avoid list

### Page: Content Kalendar
- Niche input + chips, days select (7/14/30), platform select
- Button → POST `/api/generate/calendar` → render day rows (day number, topic, hook, contentType badge, best time, platform, hashtags, "→" button to studio). CSV download button.

### Page: Competitor Analiza
- Channel name input, niche input
- Button → POST `/api/generate/competitor` → show strengths (green), weaknesses (red), content strategy, gaps to exploit (orange), viral formula, recommendation

### Page: Viral Strategija
- Niche input + chips, goal input, timeframe select (30/90/180 days)
- Button → POST `/api/generate/strategy` → show 3-phase plan grid (Phase 1/2/3 with focus, actions, KPIs), content pillars chips, monetization path, success metrics

### Page: Analytics
- 4 stat cards (total, today, avg score, top niche) from `/api/analytics/summary`
- Log table from `/api/analytics/log?n=50`: colored dot (green≥7, orange≥5, red<5), title, niche, score/10, viral score, timestamp. Refresh button.

### Page: Auto Pipeline
- 2-column: Status card (green dot, cron schedule info) + Manual Run card (niche/topic/count inputs, red button → POST `/api/pipeline/run`)
- Pipeline log div showing result after run

### Page: API Ključevi (Settings — critical)
- Status banner: green if GROQ key set, red if not, with "TESTIRAJ GROQ" button
- Test calls `POST https://api.groq.com/openai/v1/chat/completions` with stored key, shows result
- Groups:
  1. **GROQ AI** (red, obavezno) — Groq API Key field with 👁 toggle, link to console.groq.com
  2. **YouTube Upload** (cyan, opcionalno) — Client ID, Client Secret, Access Token fields
  3. **TikTok Upload** (purple, opcionalno) — Client Key, Access Token
  4. **Pipeline Config** (orange) — Default Niche, Videos Per Day, Default Platform select, Promo Link
- Save button: stores ALL keys to localStorage under key `bbmax_config`
- Clear All button with confirm dialog
- Security note: "Ključevi se čuvaju isključivo u tvom browseru (localStorage)"
- Quick Start 4-step guide: 01→console.groq.com, 02→Create API Key, 03→Paste here, 04→Go to Studio

### JavaScript requirements
- All API calls to Groq go via `fetch()` to `/api/generate/*` backend endpoints (NOT directly to Groq from frontend — the backend has the key from .env)
- EXCEPTION: The Settings page tests the key directly from localStorage by calling Groq API directly in the browser (to validate the user-entered key before saving)
- localStorage key `bbmax_config` stores: GROQ_API_KEY, YT_CLIENT_ID, YT_CLIENT_SECRET, YT_ACCESS_TOKEN, TT_CLIENT_KEY, TT_ACCESS_TOKEN, DEFAULT_NICHE, DAILY_COUNT, DEFAULT_PLATFORM, PROMO_LINK
- Niche chips: AI Tools, Financial Independence, Dark Psychology, Productivity, Crypto & Web3, True Crime, Health Hacks, Side Hustles, Stoicism, Motivation
- Active page state, smooth fadeUp animation on page switch
- Loading spinners on all buttons while waiting
- Toast notifications (success green, error red, info cyan, warning orange) in bottom-right corner
- All results include copy buttons for relevant text

---

## STEP 20 — FINAL VERIFICATION

After creating all files:

1. Run: `node --check server.js && node --check core/engine.js && node --check core/generator.js && node --check core/groqClient.js && echo "✓ Syntax OK"`
2. Run: `npm install`
3. Run: `node server.js` — should print `⚡ BlackBox AI MAX → http://localhost:3000`
4. Verify `public/index.html` exists and has all sidebar navigation items

---

## CRITICAL RULES

1. **NEVER use `exec()`** — always `execFile()` for shell commands
2. **groqClient.js rate limit** — 2150ms between calls (already in code above)
3. **output/ folder** — create it with a `.gitkeep` file
4. **All JS files** must pass `node --check` with zero errors
5. **Frontend calls backend** `/api/generate/*` — never calls Groq directly except in Settings test
6. **localStorage** stores user-entered keys for UI display; actual pipeline uses `.env`
7. **Do NOT add extra files** beyond the structure listed above
