# BlackBox AI MAX 🤖

> Autonomous AI short video factory with full ShortAI UI — 16 tools in one dashboard.

**Engine:** Groq (llama-3.3-70b FREE) · StreamElements TTS (FREE) · FFmpeg  
**UI:** Generator Skripti · Viral Hook Lab · Trend Radar · Niša Finder · Caption Lab · Hashtag Engine · Competitor Analiza · Viral Strategija · Content Kalendar · Analytics · Auto Pipeline

---

## 🚀 Pokretanje (3 koraka)

```bash
# 1. Instaliraj dependencies
npm install

# 2. Instaliraj sistem tools
pip install edge-tts          # alternativni TTS (opcionalno)
sudo apt install ffmpeg       # Linux
# ili: brew install ffmpeg    # Mac

# 3. Dodaj Groq API ključ i pokreni
node server.js
# → http://localhost:3000
```

---

## ⚙️ API Ključevi

Idi na **http://localhost:3000** → klikni **API Ključevi** u sidebaru.

| Ključ | Gdje dobiti | Limit | Obavezno |
|---|---|---|---|
| **Groq** | [console.groq.com](https://console.groq.com) | 30 req/min, 14.400/dan | ✅ DA |
| YouTube | [console.cloud.google.com](https://console.cloud.google.com) | free quota | ❌ za upload |
| TikTok | [developers.tiktok.com](https://developers.tiktok.com) | free | ❌ za upload |

> **Ključevi se čuvaju server-side u `config.json`** (uz lokalni cache u browseru za brži UI).

---

## 🛠️ Svih 16 alata

### Studio
| Alat | Opis |
|---|---|
| **Početna** | Dashboard + Quick Run pipeline |
| **Batch Generator** | 2–10 videa odjednom |

### Idea Lab
| Alat | Opis |
|---|---|
| **Generator Ideja** | 10 unique video ideja za nišu |
| **Viral Hook Lab** | 10 hookova s viral score-om |
| **Niša Finder** | Preporuke niše po interesima |

### Script Lab
| Alat | Opis |
|---|---|
| **Generator Skripti** | Kompletna 60s skripta (hook+3 tips+ending+b-roll+overlay) |
| **Caption Lab** | 5 platform-optimiziranih captiona |
| **Hashtag Engine** | High/mid/niche hashtagovi + "izbjegaj" lista |

### Growth Lab
| Alat | Opis |
|---|---|
| **Trend Radar** | Trending topics + Hot Now + Next Week + Avoid |
| **Content Kalendar** | 7/14/30-dnevni plan → CSV export |
| **Competitor Analiza** | Strategija konkurencije + gaps to exploit |
| **Viral Strategija** | 90-dnevni plan rasta |

### Sistem
| Alat | Opis |
|---|---|
| **Analytics** | Log svih generisanih videa |
| **Auto Pipeline** | Ručno pokretanje + status |
| **API Ključevi** | UI za sve ključeve (browser storage) |

---

## 🤖 Auto Pipeline

Pipeline se pokreće automatski **dva puta dnevno** (06:00 + 19:00):

```
Groq AI → Skripta
  ↓
StreamElements TTS → MP3 naracija
  ↓
captions.js → SRT titlovi
  ↓
FFmpeg → MP4 1080×1920 (s text overlayima)
  ↓
uploader.js → Upload queue (local publish + webhook)
  ↓
analytics.log → Statistike
```

**Ručno pokretanje:**
```bash
# Iz UI: Početna → POKRENI PIPELINE
# Iz terminala:
node bots/autoPipeline.js --niche "AI Tools" --count 3
node bots/autoPipeline.js --niche "Finance" --count 2 --dry-run
```

**Standalone scheduler (bez servera):**
```bash
node bots/scheduler.js
# → 06:00, 12:00, 19:00 automatic runs
```

---

## 📁 Struktura

```
blackbox-max/
├── server.js              ← Express + cron + sve API rute
├── package.json
├── .env                   ← API ključevi (server-side)
├── core/
│   ├── engine.js          ← Glavni pipeline
│   ├── groqClient.js      ← Groq API (rate limiting)
│   ├── generator.js       ← AI skripta generacija
│   ├── scorer.js          ← Viral score filtar
│   ├── voice.js           ← StreamElements TTS → MP3
│   ├── video.js           ← FFmpeg → MP4 1080×1920
│   ├── captions.js        ← SRT titlovi
│   ├── monetizer.js       ← Dodaje promo link
│   ├── uploader.js        ← Queue + retry upload engine
│   ├── uploadQueue.js     ← Persist queue store (data/upload-queue.json)
│   └── analytics.js       ← analytics.log read/write
├── bots/
│   ├── autoPipeline.js    ← CLI pipeline runner
│   └── scheduler.js       ← Standalone cron
├── public/
│   └── index.html         ← Kompletan dashboard (16 alata)
└── output/                ← MP3, MP4, SRT fajlovi
```

---

## 🔧 Konfiguracija (.env)

```env
GROQ_API_KEY=gsk_xxx         # Obavezno
PORT=3000
DEFAULT_NICHE=AI Tools
DEFAULT_PLATFORM=both        # both | youtube | tiktok
DAILY_VIDEO_COUNT=3
TIMEZONE=America/New_York
PROMO_LINK=https://yourlink.com
MIN_SCRIPT_SCORE=6
MAX_SCRIPT_ATTEMPTS=2

# Autonomous upload (optional)
AUTO_UPLOAD_ENABLED=true
UPLOAD_MODE=hybrid            # local | webhook | hybrid
UPLOAD_WEBHOOK_URL=https://n8n.example.com/webhook/blackbox-upload
UPLOAD_WEBHOOK_TOKEN=
UPLOAD_TIMEOUT_MS=45000
UPLOAD_MAX_ATTEMPTS=5
```

### Upload Queue API

```bash
GET  /api/uploads/queue?limit=200     # pregled reda
POST /api/uploads/process             # ručni run queue worker-a
POST /api/uploads/retry/:id           # reset konkretnog failed item-a
```

> Preporuka za full autonomiju: spoji `UPLOAD_WEBHOOK_URL` na n8n/Make scenarij koji prima payload i radi finalni upload na YouTube/TikTok.

### 10-Day Cash Mode API

```bash
POST /api/monetization/cash-plan
# body: { "niche":"AI Tools", "platform":"both", "days":10, "videosPerDay":3 }
```

### Always-On / Health API

```bash
GET /api/system/health   # runtime health + memory + pipeline state
GET /api/system/ping     # lightweight 200 OK probe
GET /api/system/backups?limit=30
POST /api/system/backups/create   # body: { "reason":"manual" }
```

Server sada ima concurrency guard za pipeline (`/api/pipeline/run` vraća `409 busy` ako je run već aktivan), pa nema preklapanja cron/API pokretanja.

## ☁️ Deploy bez prekida (free-first)

### Render (preporučeno)
- U rootu je dodan `render.yaml` sa `healthCheckPath: /api/system/health`.
- Poveži repo na Render i postavi env varijable.
- Uptime monitor može pingati `/api/system/ping` svakih 5 min.

### VPS / PM2
```bash
npm i -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
`ecosystem.config.js` uključuje autorestart + memory restart guard.

### Lokalni backup / disaster recovery
- Backup job radi automatski svakih 6h (`config.json`, `analytics.log`, `data/upload-queue.json`).
- Retention podešavaš env varijablom: `BACKUP_RETENTION=30`.

---

## 🐛 Troubleshooting

**`GROQ_API_KEY nije postavljen`** → Idi u API Ključevi u UI i dodaj ključ  
**FFmpeg error** → `sudo apt install ffmpeg` ili `brew install ffmpeg`  
**TTS tih** → StreamElements je free fallback; za bolji glas instaliraj `edge-tts` (`pip install edge-tts`)  
**Rate limit 429** → groqClient.js automatski čeka 2.1s između poziva; ako persistira, smanjio si `DAILY_VIDEO_COUNT`  
**Output fajlovi** → nalaze se u `/output/` folderu (ID = Unix timestamp)
