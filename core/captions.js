// captions.js
const fs   = require('fs');
const path = require('path');

function captions(text, id) {
  const outDir  = path.resolve('output');
  const outFile = path.join(outDir, `${id}.srt`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const sentences = String(text).split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const WPS = 2.2;
  let cursor = 0;

  const srt = sentences.map((s, i) => {
    const dur = Math.max(1.5, s.split(/\s+/).length / WPS);
    const start = cursor;
    const end   = cursor + dur;
    cursor      = end + 0.1;
    return `${i+1}\n${fmt(start)} --> ${fmt(end)}\n${s}`;
  }).join('\n\n');

  fs.writeFileSync(outFile, srt, 'utf8');
  return outFile;
}

function fmt(s) {
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=Math.floor(s%60),ms=Math.round((s%1)*1000);
  return `${p(h)}:${p(m)}:${p(ss)},${String(ms).padStart(3,'0')}`;
}
function p(n){ return String(n).padStart(2,'0'); }

module.exports = captions;
