/**
 * bots/scheduler.js — Standalone cron scheduler
 * Run alongside server or separately: node bots/scheduler.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const cron   = require('node-cron');
const { run } = require('../core/engine');

const TIMEZONE = process.env.TIMEZONE || 'America/New_York';

console.log('\n🤖 BlackBox AI MAX Scheduler');
console.log(`   Timezone: ${TIMEZONE}`);
console.log(`   Niche: ${process.env.DEFAULT_NICHE || 'AI Tools'}\n`);

// 06:00 — Morning batch
cron.schedule('0 6 * * *', () => {
  console.log(`\n[CRON] ☀️ Morning pipeline: ${new Date().toISOString()}`);
  run().catch(console.error);
}, { timezone: TIMEZONE });

// 12:00 — Midday
cron.schedule('0 12 * * *', () => {
  console.log(`\n[CRON] 🌞 Midday pipeline: ${new Date().toISOString()}`);
  run().catch(console.error);
}, { timezone: TIMEZONE });

// 19:00 — Prime time
cron.schedule('0 19 * * *', () => {
  console.log(`\n[CRON] 🌙 Evening pipeline (PRIME): ${new Date().toISOString()}`);
  run().catch(console.error);
}, { timezone: TIMEZONE });

// Hourly heartbeat
cron.schedule('0 * * * *', () => {
  console.log(`[CRON] ♥ ${new Date().toISOString()}`);
});

console.log('✅ Scheduler active:');
console.log('   06:00 Morning batch');
console.log('   12:00 Midday batch');
console.log('   19:00 Evening batch (prime time)');
console.log('   Hourly heartbeat\n');
