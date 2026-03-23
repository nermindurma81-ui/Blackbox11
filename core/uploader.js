const fs = require('fs');
const path = require('path');
const axios = require('axios');
const uploadQueue = require('./uploadQueue');

const PUBLISHED_DIR = path.resolve('published');

function boolEnv(name, fallback = false) {
  const v = String(process.env[name] || '').trim().toLowerCase();
  if (!v) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v);
}

function sanitizeTitle(title) {
  return String(title || 'AI Shorts')
    .replace(/[^\w\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function buildWebhookPayload(item) {
  const payload = item.payload || {};
  return {
    queueId: item.id,
    createdAt: item.createdAt,
    videoId: payload.videoId,
    title: payload.title,
    niche: payload.niche || '',
    topic: payload.topic || '',
    platform: payload.platform || 'both',
    localFile: payload.filePath,
    fileName: path.basename(payload.filePath || ''),
    sizeBytes: payload.sizeBytes || 0,
    sizeMb: payload.sizeBytes ? Number(payload.sizeBytes / 1024 / 1024).toFixed(2) : '0.00',
    metadata: payload.metadata || {}
  };
}

async function deliverLocal(item) {
  const payload = item.payload || {};
  const src = path.resolve(payload.filePath || '');
  if (!fs.existsSync(src)) throw new Error(`Source file missing: ${src}`);

  if (!fs.existsSync(PUBLISHED_DIR)) fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  const dstName = `${payload.videoId}-${sanitizeTitle(payload.title)}.mp4`;
  const dst = path.join(PUBLISHED_DIR, dstName);
  fs.copyFileSync(src, dst);
  return { mode: 'local', outputFile: dst };
}

async function deliverWebhook(item) {
  const webhookUrl = String(process.env.UPLOAD_WEBHOOK_URL || '').trim();
  if (!webhookUrl) throw new Error('UPLOAD_WEBHOOK_URL is not configured');

  const timeoutMs = Number(process.env.UPLOAD_TIMEOUT_MS || 45000);
  const token = String(process.env.UPLOAD_WEBHOOK_TOKEN || '').trim();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await axios.post(webhookUrl, buildWebhookPayload(item), { timeout: timeoutMs, headers });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Webhook upload failed with status ${response.status}`);
  }
  return { mode: 'webhook', status: response.status };
}

async function processItem(item) {
  const mode = String(process.env.UPLOAD_MODE || 'hybrid').toLowerCase();
  const results = [];
  if (mode === 'local' || mode === 'hybrid') results.push(await deliverLocal(item));
  if (mode === 'webhook' || mode === 'hybrid') results.push(await deliverWebhook(item));
  return results;
}

function nextRetryDate(attempts) {
  const backoffMs = Math.min(5 * 60 * 1000, 15000 * Math.pow(2, Math.max(0, attempts - 1)));
  return new Date(Date.now() + backoffMs).toISOString();
}

async function processQueue(limit = 3) {
  const due = uploadQueue.dueItems().slice(0, limit);
  if (!due.length) return [];

  const summary = [];
  for (const item of due) {
    const attempts = Number(item.attempts || 0) + 1;
    uploadQueue.update(item.id, { status: 'processing', attempts });
    try {
      const results = await processItem(item);
      uploadQueue.update(item.id, { status: 'success', lastError: '', results });
      console.log(`[uploader] ✓ Uploaded queue item ${item.id}`);
      summary.push({ id: item.id, status: 'success', results });
    } catch (err) {
      const maxAttempts = Number(item.maxAttempts || 5);
      const dead = attempts >= maxAttempts;
      uploadQueue.update(item.id, {
        status: dead ? 'dead' : 'queued',
        lastError: err.message,
        nextAttemptAt: dead ? null : nextRetryDate(attempts)
      });
      console.warn(`[uploader] ✗ Queue item ${item.id}: ${err.message}`);
      summary.push({ id: item.id, status: dead ? 'dead' : 'retry', error: err.message });
    }
  }
  return summary;
}

async function enqueueUpload(videoId, meta = {}) {
  if (!boolEnv('AUTO_UPLOAD_ENABLED', false)) {
    return { skipped: true, reason: 'AUTO_UPLOAD_ENABLED is false' };
  }
  const filePath = path.resolve(`output/${videoId}.mp4`);
  if (!fs.existsSync(filePath)) throw new Error(`Missing output file: ${filePath}`);
  const stat = fs.statSync(filePath);
  const item = uploadQueue.enqueue({
    videoId,
    filePath,
    sizeBytes: stat.size,
    title: meta.title || 'AI Shorts',
    niche: meta.niche || '',
    topic: meta.topic || '',
    platform: meta.platform || 'both',
    metadata: meta.script || {},
    maxAttempts: Number(process.env.UPLOAD_MAX_ATTEMPTS || 5)
  });
  console.log(`[uploader] Queued ${filePath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  const immediate = await processQueue(1);
  return { queued: true, queueId: item.id, immediate };
}

module.exports = {
  enqueueUpload,
  processQueue,
  queueList: uploadQueue.list,
  retryQueueItem: uploadQueue.reset
};
