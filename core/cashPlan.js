function normalizeBudgetDays(days) {
  const d = Number(days || 10);
  if (!Number.isFinite(d)) return 10;
  return Math.max(3, Math.min(30, Math.round(d)));
}

function normalizeCount(v, fallback = 3) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(12, Math.round(n)));
}

function cashPlan(input = {}) {
  const niche = String(input.niche || 'AI Tools').trim();
  const platform = String(input.platform || 'both').trim();
  const days = normalizeBudgetDays(input.days || 10);
  const videosPerDay = normalizeCount(input.videosPerDay, 3);
  const promoLink = String(input.promoLink || '').trim();
  const offerType = promoLink ? 'affiliate/direct offer' : 'free lead magnet';

  const daily = [];
  for (let day = 1; day <= days; day++) {
    const stage = day <= 2 ? 'Foundation' : day <= 6 ? 'Scale' : 'Monetize';
    const cta = promoLink
      ? `CTA: "Link u opisu za ${offerType}".`
      : 'CTA: "Komentariši riječ START i šaljem plan besplatno."';
    daily.push({
      day,
      stage,
      videos: videosPerDay,
      tasks: [
        `Objavi ${videosPerDay} short videa za nišu "${niche}" (${platform}).`,
        'Prvih 60 minuta odgovaraj na sve komentare radi boosta.',
        'Sačuvaj top hook i ponovi ga u 2 varijacije sutra.',
        cta
      ],
      target: day <= 3 ? 'Prvi momentum i watch-time baseline' : day <= 7 ? 'Stabilan reach + prvi leadovi' : 'Konverzije i ponovljivi format'
    });
  }

  const totals = {
    totalVideos: days * videosPerDay,
    minLeadsGoal: Math.round(days * videosPerDay * 0.08),
    stretchLeadsGoal: Math.round(days * videosPerDay * 0.18)
  };

  return {
    niche,
    platform,
    days,
    videosPerDay,
    offerType,
    promoLink: promoLink || '(nije postavljen)',
    totals,
    checklist: [
      'Fokusiraj samo 1 nišu i 1 offer cijelih 10 dana.',
      'Svaki video: hook ≤ 2s, proof, CTA.',
      'Dupliraj samo formate sa score >= 7.',
      'Ne mijenjaj stil svaki dan — iteriraj pobjednički template.'
    ],
    daily
  };
}

module.exports = { cashPlan };
