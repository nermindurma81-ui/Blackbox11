const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.resolve('data');
const QUEUE_FILE = path.join(DATA_DIR, 'upload-queue.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(QUEUE_FILE)) fs.writeFileSync(QUEUE_FILE, '[]', 'utf8');
}

function readQueue() {
  ensureStore();
  try {
    const raw = fs.readFileSync(QUEUE_FILE, 'utf8');
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('[uploadQueue] Read failed:', err.message);
    return [];
  }
}

function writeQueue(list) {
  ensureStore();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function enqueue(payload = {}) {
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    status: 'queued',
    attempts: 0,
    maxAttempts: Number(payload.maxAttempts || 5),
    createdAt: now,
    updatedAt: now,
    lastError: '',
    nextAttemptAt: now,
    payload
  };
  const list = readQueue();
  list.push(item);
  writeQueue(list);
  return item;
}

function update(id, patch = {}) {
  const list = readQueue();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  writeQueue(list);
  return list[idx];
}

function list(limit = 200) {
  return readQueue()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

function dueItems(now = Date.now()) {
  return readQueue().filter((item) => {
    if (item.status === 'success' || item.status === 'dead') return false;
    const nextAt = new Date(item.nextAttemptAt || item.createdAt).getTime();
    return Number.isFinite(nextAt) ? nextAt <= now : true;
  });
}

function reset(id) {
  return update(id, {
    status: 'queued',
    nextAttemptAt: new Date().toISOString(),
    lastError: ''
  });
}

module.exports = { enqueue, update, list, dueItems, reset };
