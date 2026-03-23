/**
 * groqClient.js — FREE Groq API client
 * Free tier: 30 req/min, 14,400 req/day
 * Models: llama-3.3-70b (best) | llama-3.1-8b (fast) | mixtral-8x7b (JSON)
 */

const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MODELS = {
  best:   'llama-3.3-70b-versatile',
  fast:   'llama-3.1-8b-instant',
  code:   'mixtral-8x7b-32768',
  backup: 'gemma2-9b-it',
};

let lastCall = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;
const responseCache = new Map();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stableStringify(obj) {
  try { return JSON.stringify(obj, Object.keys(obj).sort()); }
  catch { return JSON.stringify(obj); }
}

function extractFirstJsonObject(text = '') {
  const clean = String(text).replace(/```json|```/g, '').trim();
  if (!clean) throw new Error('Prazan JSON odgovor.');
  try { return JSON.parse(clean); } catch {}

  const start = clean.indexOf('{');
  if (start < 0) throw new Error('JSON objekt nije pronađen.');
  let depth = 0;
  for (let i = start; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      const candidate = clean.slice(start, i + 1);
      return JSON.parse(candidate);
    }
  }
  throw new Error('Nevalidan JSON objekt.');
}

async function groqChat(prompt, { model = 'best', maxTokens = 2000, temperature = 0.7, jsonMode = false } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_key_here') throw new Error('GROQ_API_KEY nije postavljen u .env!');

  const payload = {
    model: MODELS[model] || model,
    messages: [
      ...(jsonMode ? [{ role: 'system', content: 'Respond with valid JSON only. No markdown, no preamble.' }] : []),
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens,
    temperature,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  };
  const cacheKey = stableStringify({ p: prompt, o: { model, maxTokens, temperature, jsonMode } });
  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) return cached.val;

  // Rate limit: max 28 req/min da ostanemo ispod free tier
  const wait = 2150 - (Date.now() - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();

  const modelsToTry = [...new Set([MODELS[model] || model, MODELS.backup, MODELS.fast])];
  let lastErr = null;
  let text = '';

  for (const candidateModel of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await axios.post(GROQ_URL, { ...payload, model: candidateModel }, {
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          timeout: 30000,
        });
        text = res.data.choices[0]?.message?.content || '';
        attempt = 99;
        break;
      } catch (e) {
        lastErr = e;
        const status = e?.response?.status;
        const retryable = !status || status === 429 || status >= 500;
        if (!retryable || attempt === 1) break;
        await sleep(700 * (attempt + 1));
      }
    }
    if (text) break;
  }
  if (!text) throw new Error(lastErr?.response?.data?.error?.message || lastErr?.message || 'Groq request failed');

  const out = jsonMode ? extractFirstJsonObject(text) : text;
  responseCache.set(cacheKey, { ts: Date.now(), val: out });
  return out;
}

module.exports = { groqChat, MODELS };
