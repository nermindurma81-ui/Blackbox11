require('dotenv').config();
const express  = require('express');
const fs = require('fs');
const path = require('path');
const cron     = require('node-cron');
const { run }  = require('./core/engine');
const { groqChat } = require('./core/groqClient');
const analytics    = require('./core/analytics');
const uploader = require('./core/uploader');
const { cashPlan } = require('./core/cashPlan');
const backup = require('./core/backup');

const app = express();
app.use(express.static('public'));
app.use(express.json());

const CONFIG_PATH = path.join(__dirname, 'config.json');
const ALLOWED_CONFIG_KEYS = [
  'GROQ_API_KEY','YT_CLIENT_ID','YT_CLIENT_SECRET','YT_ACCESS_TOKEN',
  'TT_CLIENT_KEY','TT_ACCESS_TOKEN','DEFAULT_NICHE','DAILY_COUNT',
  'DEFAULT_PLATFORM','PROMO_LINK','AUTO_UPLOAD_ENABLED','UPLOAD_MODE',
  'UPLOAD_WEBHOOK_URL','UPLOAD_WEBHOOK_TOKEN','UPLOAD_TIMEOUT_MS','UPLOAD_MAX_ATTEMPTS',
  'MIN_SCRIPT_SCORE','MAX_SCRIPT_ATTEMPTS'
];

function loadConfigFile() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.error('[CONFIG] Load failed:', e.message);
    return {};
  }
}

function saveConfigFile(obj) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

function sanitizeConfig(input) {
  const out = {};
  ALLOWED_CONFIG_KEYS.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(input || {}, k)) {
      out[k] = String(input[k] || '').trim();
    }
  });
  return out;
}

const persistedConfig = sanitizeConfig(loadConfigFile());
Object.assign(process.env, persistedConfig);
const bootTime = Date.now();
const pipelineState = {
  running: false,
  source: null,
  lastStart: null,
  lastEnd: null,
  lastDurationMs: 0,
  lastError: null,
  lastResult: null
};

async function startPipelineRun(config = {}, source = 'manual') {
  if (pipelineState.running) {
    return { started: false, reason: 'Pipeline already running', state: pipelineState };
  }

  pipelineState.running = true;
  pipelineState.source = source;
  pipelineState.lastStart = new Date().toISOString();
  pipelineState.lastError = null;

  const startedAt = Date.now();
  run(config)
    .then((result) => {
      pipelineState.lastResult = result;
      pipelineState.lastError = null;
    })
    .catch((err) => {
      pipelineState.lastError = err.message;
      console.error('[pipeline] run failed:', err.message);
    })
    .finally(() => {
      pipelineState.running = false;
      pipelineState.lastEnd = new Date().toISOString();
      pipelineState.lastDurationMs = Date.now() - startedAt;
    });

  return { started: true, state: pipelineState };
}

// ── Pipeline Control ──────────────────────────────────────────────────

app.get('/api/config', (_req, res) => {
  res.json(sanitizeConfig(loadConfigFile()));
});

app.put('/api/config', (req, res) => {
  const next = sanitizeConfig(req.body || {});
  saveConfigFile(next);
  Object.assign(process.env, next);
  res.json({ ok: true, keys: Object.keys(next), ts: new Date().toISOString() });
});

// Start autonomous pipeline (fire-and-forget)
app.post('/api/pipeline/run', (req, res) => {
  const config = req.body || {};
  console.log('[API] Pipeline start:', config);
  startPipelineRun(config, 'api').then((r) => {
    if (!r.started) return res.status(409).json({ status: 'busy', reason: r.reason, state: r.state });
    res.json({ status: 'started', config, ts: new Date().toISOString(), state: r.state });
  }).catch((err) => res.status(500).json({ status: 'error', error: err.message }));
});

app.get('/api/uploads/queue', (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit || 200)));
  res.json({ items: uploader.queueList(limit), ts: new Date().toISOString() });
});

app.post('/api/uploads/process', async (req, res) => {
  const limit = Math.max(1, Math.min(20, Number((req.body || {}).limit || 5)));
  try {
    const processed = await uploader.processQueue(limit);
    res.json({ ok: true, processed, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/uploads/retry/:id', (req, res) => {
  const item = uploader.retryQueueItem(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: 'Queue item not found' });
  res.json({ ok: true, item, ts: new Date().toISOString() });
});

app.post('/api/monetization/cash-plan', (req, res) => {
  try {
    const config = req.body || {};
    const fallbackPromo = process.env.PROMO_LINK || '';
    res.json(cashPlan({ ...config, promoLink: config.promoLink || fallbackPromo }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/system/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    now: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    uptimeSince: new Date(bootTime).toISOString(),
    pipeline: pipelineState,
    memoryMb: {
      rss: Number((mem.rss / 1024 / 1024).toFixed(1)),
      heapUsed: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
      heapTotal: Number((mem.heapTotal / 1024 / 1024).toFixed(1))
    }
  });
});

app.get('/api/system/ping', (_req, res) => {
  res.status(200).send('pong');
});

app.get('/api/system/backups', (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 30)));
  res.json({ items: backup.listBackups(limit), ts: new Date().toISOString() });
});

app.post('/api/system/backups/create', (req, res) => {
  try {
    const reason = String(((req.body || {}).reason) || 'manual').trim();
    const meta = backup.createBackup(reason);
    backup.enforceRetention(Number(process.env.BACKUP_RETENTION || 30));
    res.json({ ok: true, backup: meta, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Legacy GET
app.get('/run', (req, res) => {
  startPipelineRun({}, 'legacy').then((r) => {
    if (!r.started) return res.status(409).json({ status: 'busy', reason: r.reason, state: r.state });
    res.json({ status: 'started', state: r.state });
  }).catch((err) => res.status(500).json({ status: 'error', error: err.message }));
});

// ── Analytics ─────────────────────────────────────────────────────────

app.get('/api/analytics/summary', (req, res) => res.json(analytics.getSummary()));
app.get('/api/analytics/log',     (req, res) => res.json(analytics.getLog(parseInt(req.query.n)||50)));

// ── AI Generation via Groq (backend proxy) ────────────────────────────

app.post('/api/generate/script', async (req, res) => {
  try {
    const { niche, topic, hookStyle, platform } = req.body;
    const generator = require('./core/generator');
    const script    = await generator({ niche, topic, hookStyle, platform });
    res.json(script);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/metadata', async (req, res) => {
  try {
    const { niche, topic, platform, excerpt } = req.body;
    const meta = await groqChat(
      `SEO expert. Generate metadata for ${platform||'both'} video. Niche: ${niche}. Topic: ${topic}. Excerpt: "${excerpt||''}".
Return JSON: {"titles":{"primary":"","alt1":"","alt2":""},"description":{"youtube":"","tiktok":""},"hashtags":{"high_volume":[],"mid_volume":[],"niche":[]},"thumbnail":{"headline":"","subtext":"","colorScheme":"","style":""},"seo":{"primaryKeyword":"","bestPostTime":"","competitionLevel":""},"viralPotential":{"score":80,"reasoning":"","suggestions":[]}}`,
      { model: 'best', maxTokens: 1500, jsonMode: true }
    );
    res.json(meta);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/trends', async (req, res) => {
  try {
    const { niche, count = 8 } = req.body;
    const data = await groqChat(
      `Viral content trend analyst. Generate ${count} trending angles for: "${niche}".
Return JSON: {"trends":[{"topic":"","angle":"","viralReason":"","searchVolume":"high","competition":"low","estimatedViews":"50K-500K","hookIdea":"","difficulty":4}],"hotNow":["t1","t2","t3"],"nextWeek":["t1","t2"],"avoid":["o1","o2"]}`,
      { model: 'best', maxTokens: 2000, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/hooks', async (req, res) => {
  try {
    const { niche, topic, style, count = 10 } = req.body;
    const data = await groqChat(
      `Elite hook writer. Generate ${count} viral hooks for niche "${niche}", topic "${topic}", style "${style||'mixed'}".
Return JSON: {"hooks":[{"hook":"","style":"","viralScore":8,"whyItWorks":""}]}`,
      { model: 'best', maxTokens: 1500, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/captions', async (req, res) => {
  try {
    const { topic, niche, platform, tone } = req.body;
    const data = await groqChat(
      `Social media expert. Generate 5 captions for ${platform||'both'} about "${topic}" (${niche}), tone: ${tone||'engaging'}.
Return JSON: {"captions":[{"caption":"","platform":"","charCount":0,"hashtags":[],"bestTime":""}]}`,
      { model: 'best', maxTokens: 1200, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/hashtags', async (req, res) => {
  try {
    const { topic, niche, platform } = req.body;
    const data = await groqChat(
      `Hashtag strategist. Generate optimized hashtags for ${platform||'both'}: topic "${topic}", niche "${niche}".
Return JSON: {"high_volume":[],"mid_volume":[],"niche_specific":[],"banned":[],"recommended":"copy-paste set of 20"}`,
      { model: 'fast', maxTokens: 800, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/ideas', async (req, res) => {
  try {
    const { niche, count = 10 } = req.body;
    const data = await groqChat(
      `Content ideation expert. Generate ${count} unique video ideas for niche "${niche}".
Return JSON: {"ideas":[{"title":"","angle":"","hook":"","whyViral":"","difficulty":"easy","estimatedViews":"50K-200K","contentType":"educational"}]}`,
      { model: 'best', maxTokens: 2000, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/niche', async (req, res) => {
  try {
    const { keywords, goals } = req.body;
    const data = await groqChat(
      `Niche research expert. Analyze and recommend best niches for: keywords "${keywords}", goals "${goals||'passive income'}".
Return JSON: {"recommendations":[{"niche":"","score":85,"competition":"medium","monetization":"high","difficulty":"beginner","whyPerfect":"","topChannels":["c1","c2"],"contentPillars":["p1","p2","p3"]}],"avoid":[],"verdict":""}`,
      { model: 'best', maxTokens: 2000, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/competitor', async (req, res) => {
  try {
    const { channel, niche } = req.body;
    const data = await groqChat(
      `Competitor analysis expert. Analyze channel strategy for "${channel}" in niche "${niche}".
Return JSON: {"strengths":[],"weaknesses":[],"contentStrategy":"","postingFrequency":"","topFormats":[],"gapsToExploit":[],"viralFormula":"","recommendation":""}`,
      { model: 'best', maxTokens: 1500, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/strategy', async (req, res) => {
  try {
    const { niche, goal, timeframe } = req.body;
    const data = await groqChat(
      `Viral growth strategist. Create 90-day strategy for "${niche}" channel. Goal: ${goal||'10k followers'}. Timeframe: ${timeframe||'90 days'}.
Return JSON: {"overview":"","week1_4":{"focus":"","actions":[],"kpis":[]},"week5_8":{"focus":"","actions":[],"kpis":[]},"week9_12":{"focus":"","actions":[],"kpis":[]},"contentPillars":[],"postingSchedule":"","monetizationPath":"","tools":[],"successMetrics":[]}`,
      { model: 'best', maxTokens: 2000, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/calendar', async (req, res) => {
  try {
    const { niche, days = 7, platform } = req.body;
    const data = await groqChat(
      `Content calendar expert. Generate ${days}-day calendar for "${niche}" on ${platform||'both'}.
Return JSON: {"calendar":[{"day":1,"date":"Mon","topic":"","hook":"","contentType":"educational","platform":"","bestTime":"6PM","hashtags":[]}]}`,
      { model: 'best', maxTokens: 2500, jsonMode: true }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Cron Jobs ─────────────────────────────────────────────────────────

const TIMEZONE = process.env.TIMEZONE || 'America/New_York';

// Morning batch 6 AM
cron.schedule('0 6 * * *', () => {
  console.log('[CRON] Morning pipeline');
  startPipelineRun({}, 'cron-morning').then((r) => {
    if (!r.started) console.log('[CRON] Morning skipped (already running)');
  }).catch(console.error);
}, { timezone: TIMEZONE });

// Evening batch 7 PM (prime time)
cron.schedule('0 19 * * *', () => {
  console.log('[CRON] Evening pipeline');
  startPipelineRun({}, 'cron-evening').then((r) => {
    if (!r.started) console.log('[CRON] Evening skipped (already running)');
  }).catch(console.error);
}, { timezone: TIMEZONE });

// Hourly heartbeat
cron.schedule('0 * * * *', () => {
  console.log(`[CRON] ♥ Alive: ${new Date().toISOString()}`);
});

// Periodic local backups (every 6 hours)
cron.schedule('0 */6 * * *', () => {
  try {
    const meta = backup.createBackup('cron-6h');
    backup.enforceRetention(Number(process.env.BACKUP_RETENTION || 30));
    console.log(`[CRON] Backup created: ${meta.id}`);
  } catch (err) {
    console.error('[CRON] Backup error:', err.message);
  }
});

// Upload queue processor (every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
  try {
    const processed = await uploader.processQueue(5);
    if (processed.length) console.log(`[CRON] Upload queue processed: ${processed.length}`);
  } catch (err) {
    console.error('[CRON] Upload queue error:', err.message);
  }
});

// ── Start ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n⚡ BlackBox AI MAX → http://localhost:${PORT}`);
  console.log(`   GROQ: ${process.env.GROQ_API_KEY ? '✓ Postavljen' : '✗ POTREBAN — Dodaj u .env'}`);
  console.log(`   Upload: ${String(process.env.AUTO_UPLOAD_ENABLED || '').toLowerCase() === 'true' ? '✓ Enabled' : '○ Disabled'}`);
  console.log(`   Niche: ${process.env.DEFAULT_NICHE || 'AI Tools'}`);
  console.log(`   Cron: 06:00 + 19:00 ${TIMEZONE}\n`);
});
