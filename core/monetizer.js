module.exports = function monetizer(text) {
  const link = process.env.PROMO_LINK || 'https://yourlink.com';
  const cta  = process.env.PROMO_CTA  || '🔥 Link in bio!';
  if (/link in bio/i.test(text)) return text;
  return `${String(text).trimEnd()}\n${cta} ${link}`;
};
