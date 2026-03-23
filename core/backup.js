const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve('backups');
const FILES_TO_BACKUP = [
  path.resolve('config.json'),
  path.resolve('analytics.log'),
  path.resolve('data/upload-queue.json')
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function listBackups(limit = 30) {
  ensureDir(BACKUP_DIR);
  return fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse()
    .slice(0, limit)
    .map((name) => {
      const dir = path.join(BACKUP_DIR, name);
      const files = fs.readdirSync(dir).filter((f) => f !== 'meta.json');
      const totalBytes = files.reduce((acc, f) => acc + fs.statSync(path.join(dir, f)).size, 0);
      return { id: name, dir, files, totalBytes };
    });
}

function enforceRetention(maxKeep = 30) {
  const backups = listBackups(9999);
  backups.slice(maxKeep).forEach((b) => {
    fs.rmSync(b.dir, { recursive: true, force: true });
  });
}

function createBackup(reason = 'manual') {
  ensureDir(BACKUP_DIR);
  const id = nowStamp();
  const target = path.join(BACKUP_DIR, id);
  ensureDir(target);

  const copied = [];
  FILES_TO_BACKUP.forEach((file) => {
    if (!fs.existsSync(file)) return;
    const base = path.basename(file);
    const dst = path.join(target, base);
    fs.copyFileSync(file, dst);
    copied.push(base);
  });

  const meta = { id, reason, createdAt: new Date().toISOString(), files: copied };
  fs.writeFileSync(path.join(target, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  return meta;
}

module.exports = { createBackup, listBackups, enforceRetention };
