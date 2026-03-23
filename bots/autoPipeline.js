/**
 * bots/autoPipeline.js — CLI autonomous pipeline
 * Usage: node bots/autoPipeline.js --niche "AI Tools" --count 3 --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { run } = require('../core/engine');

const args    = process.argv.slice(2);
const get     = k => { const i=args.indexOf(`--${k}`); return i!==-1?args[i+1]:null; };
const dryRun  = args.includes('--dry-run');

const config = {
  niche:     get('niche')    || process.env.DEFAULT_NICHE    || 'AI Tools',
  platform:  get('platform') || process.env.DEFAULT_PLATFORM || 'both',
  count:     parseInt(get('count') || process.env.DAILY_VIDEO_COUNT || '2'),
  hookStyle: get('hook')     || 'contradiction',
  topic:     get('topic')    || undefined,
};

console.log('\n' + '═'.repeat(60));
console.log('  🤖 BlackBox AI MAX — Auto Pipeline');
console.log(`  Niche: ${config.niche} | Count: ${config.count} | Platform: ${config.platform}`);
console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
console.log('═'.repeat(60) + '\n');

if (dryRun) {
  console.log('[DRY RUN] Config valid. Skipping actual generation.');
  process.exit(0);
}

run(config)
  .then(results => {
    const ok = results.filter(r => r.status !== 'failed').length;
    console.log(`\n✅ Pipeline complete: ${ok}/${results.length} OK`);
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Pipeline crashed:', err.message);
    process.exit(1);
  });
