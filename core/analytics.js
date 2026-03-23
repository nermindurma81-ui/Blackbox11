const fs   = require('fs');
const path = require('path');
const LOG  = path.resolve('analytics.log');

function logVideo({ id, score, script, niche, topic, durationMs = 0 }) {
  const entry = {
    id,
    score,
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

  // Top niche
  const nicheCounts = {};
  log.forEach(e => { nicheCounts[e.niche] = (nicheCounts[e.niche] || 0) + 1; });
  const topNiche = Object.entries(nicheCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';

  return {
    total:    log.length,
    today:    log.filter(e => e.ts.startsWith(today)).length,
    avgScore,
    lastRun:  log[0]?.ts || null,
    topNiche,
  };
}

module.exports = { logVideo, getLog, getSummary };
