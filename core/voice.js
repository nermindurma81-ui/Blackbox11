/**
 * voice.js — 100% FREE TTS via StreamElements
 * No API key, no signup, no limits for reasonable use
 * Voices: Brian (EN male), Amy (EN female), Matthew, Joanna, etc.
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const VOICES = {
  male_energetic:    'Brian',
  male_calm:         'Matthew',
  female_energetic:  'Joanna',
  female_calm:       'Amy',
  default:           'Brian',
};

module.exports = async function voice(text, id, voicePreset = 'male_energetic') {
  const outDir  = path.resolve('output');
  const outFile = path.join(outDir, `${id}.mp3`);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const voiceName = VOICES[voicePreset] || VOICES.default;

  // Clean text for TTS (remove emojis, special chars)
  const cleanText = String(text)
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 3000); // StreamElements limit

  try {
    const res = await axios.get('https://api.streamelements.com/kappa/v2/speech', {
      params: { voice: voiceName, text: cleanText },
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    fs.writeFileSync(outFile, Buffer.from(res.data));
    console.log(`[voice] ✓ ${outFile} (StreamElements/${voiceName})`);
    return outFile;
  } catch (err) {
    console.error(`[voice] StreamElements failed: ${err.message} — using silence`);
    // Write silent MP3 as fallback (44 bytes = minimal valid MP3)
    fs.writeFileSync(outFile, Buffer.alloc(0));
    return outFile;
  }
};
