const ffmpeg = require('fluent-ffmpeg');
const fs     = require('fs');
const path   = require('path');

const OUTPUT_DIR = path.resolve('output');
const BG_FILE    = path.resolve('bg.jpg');

module.exports = async function video(id, script = {}) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(BG_FILE)) await createBg();

  const mp3File = path.join(OUTPUT_DIR, `${id}.mp3`);
  const srtFile = path.join(OUTPUT_DIR, `${id}.srt`);
  const outFile = path.join(OUTPUT_DIR, `${id}.mp4`);

  const hasAudio = fs.existsSync(mp3File) && fs.statSync(mp3File).size > 100;

  // Build text overlays from script
  const esc = t => (t || '').replace(/'/g, "\\'").replace(/:/g, '\\:').slice(0, 35);
  const hook = esc(script.hook?.overlay || script.title || 'Watch This');
  const t1   = esc(script.tips?.[0]?.overlay || '');
  const t2   = esc(script.tips?.[1]?.overlay || '');
  const t3   = esc(script.tips?.[2]?.overlay || '');
  const end  = esc(script.ending?.overlay || 'Follow For More');

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    // Background
    cmd.input(BG_FILE).inputOptions(['-loop', '1']);
    // Audio
    if (hasAudio) cmd.input(mp3File);

    const filters = [
      '[0:v]scale=1080:1920,setsar=1[base]',
      `[base]drawtext=text='${hook}':fontsize=68:fontcolor=white:x=(w-text_w)/2:y=h*0.12:enable='between(t,0,3)':box=1:boxcolor=black@0.65:boxborderw=18[v1]`,
      `[v1]drawtext=text='${t1}':fontsize=54:fontcolor=#FFD700:x=(w-text_w)/2:y=h*0.12:enable='between(t,3,20)':box=1:boxcolor=black@0.6:boxborderw=14[v2]`,
      `[v2]drawtext=text='${t2}':fontsize=54:fontcolor=#FFD700:x=(w-text_w)/2:y=h*0.12:enable='between(t,20,35)':box=1:boxcolor=black@0.6:boxborderw=14[v3]`,
      `[v3]drawtext=text='${t3}':fontsize=54:fontcolor=#FFD700:x=(w-text_w)/2:y=h*0.12:enable='between(t,35,50)':box=1:boxcolor=black@0.6:boxborderw=14[v4]`,
      `[v4]drawtext=text='${end}':fontsize=68:fontcolor=white:x=(w-text_w)/2:y=h*0.12:enable='between(t,50,60)':box=1:boxcolor=black@0.65:boxborderw=18[vout]`,
    ];

    const outputOpts = [
      '-map', '[vout]',
      ...(hasAudio ? ['-map', '1:a'] : []),
      '-t', '60',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
    ];

    cmd
      .complexFilter(filters)
      .outputOptions(outputOpts)
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
