/* ============================================================
   THE JEANS FACTORY — product.js
   Product Detail Page logic
============================================================ */

(() => {
  'use strict';

  /* ---------- 1. Helpers & environment ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = (n) => String(n).padStart(2, '0');
  const unsplash = (id, w = 1100) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

  const WASH_PALETTE = {
    'RAW INDIGO': { top: '#243757', mid: '#17253e', dark: '#0d1729', fade: 'rgba(130,165,215,0.12)', stitch: '#c68b3c', ecru: false },
    '14.5OZ RAW': { top: '#1e2f4d', mid: '#121e35', dark: '#0a1222', fade: 'rgba(120,155,210,0.10)', stitch: '#d19642', ecru: false },
    'STACKED RAW': { top: '#253959', mid: '#16243d', dark: '#0c1526', fade: 'rgba(135,170,220,0.14)', stitch: '#c68b3c', ecru: false },
    'ACID WASH': { top: '#6d87a8', mid: '#4e698a', dark: '#2d415c', fade: 'rgba(235,242,250,0.34)', stitch: '#b8945a', ecru: false },
    'DIRTY TINT': { top: '#6b7f91', mid: '#4b5f71', dark: '#303f4d', fade: 'rgba(218,210,190,0.28)', stitch: '#a67b44', ecru: false },
    'LIGHT WASH': { top: '#8da9c7', mid: '#6e8cae', dark: '#4a6687', fade: 'rgba(245,248,255,0.38)', stitch: '#c49655', ecru: false },
    'OZONE WASH': { top: '#53677e', mid: '#3a4c62', dark: '#222f40', fade: 'rgba(210,225,240,0.24)', stitch: '#9fb0c4', ecru: false },
    'VINTAGE RINSE': { top: '#4a668a', mid: '#324b6c', dark: '#1e314b', fade: 'rgba(220,232,248,0.26)', stitch: '#c98e3e', ecru: false },
    'SAND BLAST': { top: '#4a4e54', mid: '#313438', dark: '#1d1f22', fade: 'rgba(220,215,205,0.24)', stitch: '#b57b3c', ecru: false },
    'CHARCOAL': { top: '#37383c', mid: '#232427', dark: '#141416', fade: 'rgba(255,255,255,0.12)', stitch: '#52525b', ecru: false },
    'ECRU': { top: '#ebe7dc', mid: '#ddd7c8', dark: '#c7bfae', fade: 'rgba(255,255,255,0.45)', stitch: '#b8aa94', ecru: true },
  };

  const FIT_GEO = {
    'Baggy': { w: 122, hip: 186, knee: 162, lo: 152, gap: 12, crotch: 178 },
    'Straight': { w: 114, hip: 158, knee: 136, lo: 132, gap: 18, crotch: 168 },
    'Wide-Leg': { w: 116, hip: 168, knee: 166, lo: 174, gap: 14, crotch: 170 },
    'Carpenter': { w: 118, hip: 162, knee: 146, lo: 138, gap: 16, crotch: 174 },
    'Bootcut': { w: 112, hip: 152, knee: 110, lo: 144, gap: 18, crotch: 164 },
    'Slim': { w: 110, hip: 142, knee: 102, lo: 92, gap: 22, crotch: 160 },
  };

  function flatLayJeansUrl({ fit = 'Wide-Leg', wash = 'RAW INDIGO', distress = 'None', selvedge = false } = {}) {
    const key = String(wash).toUpperCase();
    const pal = WASH_PALETTE[key] || WASH_PALETTE['RAW INDIGO'];
    const g = FIT_GEO[fit] || FIT_GEO['Wide-Leg'];
    const cx = 180;
    const top = 44;
    const hipY = 122;
    const kneeY = 278;
    const hemY = 434;

    const xWL = cx - g.w / 2, xWR = cx + g.w / 2;
    const xHL = cx - g.hip / 2, xHR = cx + g.hip / 2;
    const xKL = cx - g.knee / 2, xKR = cx + g.knee / 2;
    const xAL = cx - g.lo / 2, xAR = cx + g.lo / 2;
    const xIL = cx - g.gap / 2, xIR = cx + g.gap / 2;

    const bodyD = [
      `M ${xWL} ${top}`,
      `Q ${cx} ${top + 5} ${xWR} ${top}`,
      `C ${xWR + 10} ${top + 32}, ${xHR} ${hipY - 22}, ${xHR} ${hipY}`,
      `C ${xHR + 4} ${hipY + 55}, ${xKR + 6} ${kneeY - 45}, ${xKR} ${kneeY}`,
      `C ${xKR - 2} ${kneeY + 55}, ${xAR} ${hemY - 45}, ${xAR} ${hemY}`,
      `L ${xIR + 4} ${hemY}`,
      `L ${xIR} ${g.crotch}`,
      `Q ${cx} ${g.crotch - 6} ${xIL} ${g.crotch}`,
      `L ${xIL - 4} ${hemY}`,
      `L ${xAL} ${hemY}`,
      `C ${xAL} ${hemY - 45}, ${xKL + 2} ${kneeY + 55}, ${xKL} ${kneeY}`,
      `C ${xKL - 6} ${kneeY - 45}, ${xHL - 4} ${hipY + 55}, ${xHL} ${hipY}`,
      `C ${xHL} ${hipY - 22}, ${xWL - 10} ${top + 32}, ${xWL} ${top}`,
      'Z',
    ].join(' ');

    const isCarp = fit === 'Carpenter';
    const showDistress = distress === 'Medium' || distress === 'Heavy';
    const uid = `pdp-${fit}-${key}-${distress}`.replace(/[^a-z0-9]/gi, '').toLowerCase();

    const carpMarkup = isCarp ? `
      <path d="M ${xHL + 10} ${hipY + 86} L ${xKL + 6} ${hipY + 86} L ${xKL + 4} ${kneeY + 54} L ${xHL + 12} ${kneeY + 54} Z" fill="rgba(0,0,0,0.08)" stroke="${pal.stitch}" stroke-width="1" stroke-dasharray="2.5 2.5"/>
      <path d="M ${xHR - 10} ${hipY + 86} L ${xKR - 6} ${hipY + 86} L ${xKR - 4} ${kneeY + 54} L ${xHR - 12} ${kneeY + 54} Z" fill="rgba(0,0,0,0.08)" stroke="${pal.stitch}" stroke-width="1" stroke-dasharray="2.5 2.5"/>
      <path d="M ${xHL + 2} ${hipY + 28} Q ${xHL - 11} ${hipY + 42} ${xHL + 1} ${hipY + 58}" fill="none" stroke="${pal.mid}" stroke-width="5" stroke-linecap="round"/>
      <path d="M ${xHL + 2} ${hipY + 28} Q ${xHL - 11} ${hipY + 42} ${xHL + 1} ${hipY + 58}" fill="none" stroke="${pal.stitch}" stroke-width="1" stroke-dasharray="2 2"/>
    ` : '';

    const distressMarkup = showDistress ? `
      <g opacity="0.88">
        <rect x="${cx - 46}" y="${kneeY - 34}" width="26" height="9" rx="3" fill="${pal.ecru ? '#b8b09c' : '#d6dce5'}" stroke="rgba(20,20,20,0.22)" stroke-width="0.6"/>
        <line x1="${cx - 45}" y1="${kneeY - 30}" x2="${cx - 21}" y2="${kneeY - 30}" stroke="#fff" stroke-width="1" stroke-dasharray="2 1.5"/>
        <rect x="${cx + 20}" y="${kneeY - 12}" width="28" height="10" rx="3" fill="${pal.ecru ? '#b8b09c' : '#d6dce5'}" stroke="rgba(20,20,20,0.22)" stroke-width="0.6"/>
        <line x1="${cx + 21}" y1="${kneeY - 7}" x2="${cx + 47}" y2="${kneeY - 7}" stroke="#fff" stroke-width="1" stroke-dasharray="2 1.5"/>
      </g>
    ` : '';

    const selvedgeMarkup = (selvedge || /RAW|SELVEDGE/i.test(key)) ? `
      <rect x="${xAL}" y="${hemY - 10}" width="${xIL - 4 - xAL}" height="10" fill="${pal.dark}" opacity="0.9"/>
      <rect x="${xIR + 4}" y="${hemY - 10}" width="${xAR - (xIR + 4)}" height="10" fill="${pal.dark}" opacity="0.9"/>
      <line x1="${xAL + 2}" y1="${hemY - 10}" x2="${xAL + 2}" y2="${hemY}" stroke="#EA580C" stroke-width="1.6"/>
      <line x1="${xAR - 2}" y1="${hemY - 10}" x2="${xAR - 2}" y2="${hemY}" stroke="#EA580C" stroke-width="1.6"/>
    ` : '';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480">
      <defs>
        <linearGradient id="g-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${pal.top}"/>
          <stop offset="52%" stop-color="${pal.mid}"/>
          <stop offset="100%" stop-color="${pal.dark}"/>
        </linearGradient>
        <radialGradient id="f-${uid}" cx="50%" cy="42%" r="46%">
          <stop offset="0%" stop-color="${pal.fade}"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <pattern id="tw-${uid}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="${pal.ecru ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.06)'}" stroke-width="1"/>
        </pattern>
        <filter id="sh-${uid}" x="-18%" y="-10%" width="136%" height="124%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#141414" flood-opacity="0.18"/>
        </filter>
      </defs>
      <g filter="url(#sh-${uid})">
        <path d="${bodyD}" fill="url(#g-${uid})" stroke="${pal.dark}" stroke-width="1.2"/>
        <path d="${bodyD}" fill="url(#f-${uid})"/>
        <path d="${bodyD}" fill="url(#tw-${uid})"/>
        <path d="M ${xWL + 1} ${top} Q ${cx} ${top + 5} ${xWR - 1} ${top} L ${xWR + 2} ${top + 20} Q ${cx} ${top + 25} ${xWL - 2} ${top + 20} Z" fill="${pal.mid}" stroke="${pal.dark}" stroke-width="1"/>
        <path d="M ${xWL} ${top + 19} Q ${cx} ${top + 24} ${xWR} ${top + 19}" fill="none" stroke="${pal.stitch}" stroke-width="1.1" stroke-dasharray="2.5 2"/>
        <path d="M ${cx} ${top + 21} L ${cx} ${g.crotch - 26} Q ${cx + 13} ${g.crotch - 14} ${cx + 2} ${g.crotch - 2}" fill="none" stroke="${pal.stitch}" stroke-width="1.1" stroke-dasharray="2.5 2"/>
        <path d="M ${xWL + 4} ${top + 22} Q ${xWL + 14} ${top + 58} ${xWL + 34} ${top + 72}" fill="none" stroke="${pal.stitch}" stroke-width="1.1" stroke-dasharray="2.2 2"/>
        <path d="M ${xWR - 4} ${top + 22} Q ${xWR - 14} ${top + 58} ${xWR - 34} ${top + 72}" fill="none" stroke="${pal.stitch}" stroke-width="1.1" stroke-dasharray="2.2 2"/>
        <path d="M ${xWR - 22} ${top + 24} L ${xWR - 22} ${top + 46} L ${xWR - 8} ${top + 46}" fill="none" stroke="${pal.stitch}" stroke-width="1" stroke-dasharray="2 2"/>
        <line x1="${xIL}" y1="${g.crotch}" x2="${xIL - 4}" y2="${hemY}" stroke="${pal.stitch}" stroke-width="1" stroke-dasharray="2.5 2.5" opacity="0.85"/>
        <line x1="${xIR}" y1="${g.crotch}" x2="${xIR + 4}" y2="${hemY}" stroke="${pal.stitch}" stroke-width="1" stroke-dasharray="2.5 2.5" opacity="0.85"/>
        <path d="M ${xWL + 16} ${top + 4} L ${xWL + 16} ${top + 21} M ${cx - 22} ${top + 5} L ${cx - 22} ${top + 22} M ${cx + 22} ${top + 5} L ${cx + 22} ${top + 22} M ${xWR - 16} ${top + 4} L ${xWR - 16} ${top + 21}" stroke="${pal.stitch}" stroke-width="3.2" stroke-linecap="round"/>
        <circle cx="${cx}" cy="${top + 12}" r="4.8" fill="#b45309" stroke="#78350f" stroke-width="0.9"/>
        <circle cx="${xWL + 32}" cy="${top + 68}" r="2.2" fill="#EA580C"/>
        <circle cx="${xWR - 32}" cy="${top + 68}" r="2.2" fill="#EA580C"/>
        <circle cx="${xWR - 22}" cy="${top + 26}" r="2" fill="#EA580C"/>
        <path d="M ${cx - 46} ${hipY + 12} Q ${cx - 26} ${hipY + 18} ${cx - 10} ${hipY + 14} M ${cx + 46} ${hipY + 12} Q ${cx + 26} ${hipY + 18} ${cx + 10} ${hipY + 14}" fill="none" stroke="${pal.fade}" stroke-width="1.6"/>
        ${carpMarkup}
        ${distressMarkup}
        ${selvedgeMarkup}
        <line x1="${xAL + 2}" y1="${hemY - 4}" x2="${xIL - 6}" y2="${hemY - 4}" stroke="${pal.stitch}" stroke-width="1" stroke-dasharray="2.2 2"/>
        <line x1="${xIR + 6}" y1="${hemY - 4}" x2="${xAR - 2}" y2="${hemY - 4}" stroke="${pal.stitch}" stroke-width="1" stroke-dasharray="2.2 2"/>
      </g>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG') t.classList.add('is-broken');
  }, true);

  /* ---------- 2. Catalogue data ---------- */
  const IMG = {
    drops: [
      'photo-1542272604-787c3835535d',
      'photo-1604176354204-9268737828e4',
      'photo-1584370848010-d7fe6bc767ec',
      'photo-1475178626620-a4d074967452',
      'photo-1495105787522-5334e3ffa0ef',
      'photo-1516257984-b1b4d707412e',
      'photo-1473966968600-fa801b869a1a',
      'photo-1555689502-c4b22d76c56f',
    ],
    looks: [
      'photo-1509631179647-0177331693ae',
      'photo-1529139574466-a303027c1d8b',
      'photo-1483985988355-763728e1935b',
      'photo-1552374196-c4e7ffc6e126',
      'photo-1488161628813-04466f872be2',
      'photo-1517841905240-472988babdf9',
      'photo-1503342217505-b0a15ec3261c',
      'photo-1490481651871-ab68de25d43d',
      'photo-1604176354204-9268737828e4',
    ],
    cross: 'photo-1516257984-b1b4d707412e',
    flat: [
      'photo-1602293589930-45aad59ba3ab',
      'photo-1565084888279-aca607ecce0c',
      'photo-1576995853123-5a10305d93c0',
      'photo-1605518216938-7c31b7b14ad0',
    ],
  };

  const SIZES = [28, 30, 32, 34, 36];
  const LENGTHS = [30, 32, 34];

  const FITS = [
    { name: 'Baggy', code: 'BG-01', desc: 'Dropped crotch, a generous thigh and a stacked hem. Cut from 14oz rigid denim that breaks in like a favourite record.', specs: { leg: '19.5"', rise: '11.5"', gsm: '420 GSM', wash: 'RAW INDIGO' }, params: { waist: 74, hip: 140, knee: 120, lo: 128, gap: 10, crotch: 262 } },
    { name: 'Straight', code: 'ST-02', desc: 'A balanced column from hip to ankle. Mid-weight vintage indigo cut clean for everyday rotation.', specs: { leg: '17.0"', rise: '11.5"', gsm: '420 GSM', wash: 'OZONE WASH' }, params: { waist: 72, hip: 116, knee: 98, lo: 94, gap: 16, crotch: 252 } },
    { name: 'Wide-Leg', code: 'WL-03', desc: 'A clean column from hip to ankle. Engineered with a high rise so the leg falls straight, not slouchy.', specs: { leg: '21.0"', rise: '11.0"', gsm: '400 GSM', wash: 'STONE BLUE' }, params: { waist: 72, hip: 122, knee: 118, lo: 134, gap: 14, crotch: 254 } },
    { name: 'Carpenter', code: 'CP-04', desc: 'Utility loop, hammer pocket, doubled knee. Built for people who carry too much and still want a clean line.', specs: { leg: '16.5"', rise: '12.5"', gsm: '440 GSM', wash: 'DIRTY TINT' }, params: { waist: 70, hip: 106, knee: 94, lo: 88, gap: 18, crotch: 264 } },
    { name: 'Bootcut', code: 'BC-05', desc: 'Snug through the thigh, then an 18-inch sweep at the hem. The 90s cut that makes every shoe look intentional.', specs: { leg: '18.0"', rise: '10.5"', gsm: '410 GSM', wash: 'VINTAGE INDIGO' }, params: { waist: 68, hip: 100, knee: 64, lo: 100, gap: 18, crotch: 250 } },
    { name: 'Slim', code: 'SL-06', desc: 'A sharp, clean taper with just enough room at the knee. Mid-rise, zero bulk, all attitude.', specs: { leg: '13.5"', rise: '10.0"', gsm: '380 GSM', wash: 'MIDNIGHT RINSE' }, params: { waist: 66, hip: 88, knee: 58, lo: 58, gap: 20, crotch: 244 } },
  ];

  const FIT_IMAGES = {
    Baggy: 'assets/fits/baggy.png',
    'Wide-Leg': 'assets/fits/wide.png',
    Straight: 'assets/fits/straight.png',
    Slim: 'assets/fits/slim.png',
    Carpenter: 'assets/fits/carpenter.png',
    Bootcut: 'assets/fits/bootcut.png',
  };

  const DROPS = [
    { id: 'acid-baggy', name: 'Acid-Wash Baggy', fit: 'Baggy', price: 2499, gsm: '420 GSM', wash: 'ACID WASH', rise: 'High', distress: 'Medium', stretch: 2, badge: 'LIMITED', image: 'assets/lineup/fit-baggy.png', imageFlat: 'assets/lineup/fit-all.png', soldOut: [30] },
    { id: 'dirty-wide', name: 'Dirty-Tint Wide-Leg', fit: 'Wide-Leg', price: 2299, gsm: '400 GSM', wash: 'DIRTY TINT', rise: 'High', distress: 'Light', stretch: 1, badge: 'NEW', image: 'assets/lineup/fit-utility-blue.png', imageFlat: 'assets/lineup/fit-wide.png', soldOut: [] },
    { id: 'raw-slim', name: 'Raw Indigo Slim', fit: 'Slim', price: 1999, gsm: '410 GSM', wash: 'RAW INDIGO', rise: 'Mid', distress: 'None', stretch: 0, badge: '', image: 'assets/lineup/fit-slim.png', imageFlat: 'assets/lineup/fit-all.png', soldOut: [] },
    { id: 'distressed-carpenter', name: 'Distressed Carpenter', fit: 'Carpenter', price: 2799, gsm: '440 GSM', wash: 'SAND BLAST', rise: 'High', distress: 'Heavy', stretch: 0, badge: 'LIMITED', image: 'assets/lineup/fit-carpenter.png', imageFlat: 'assets/fits/carpenter-sand.png', soldOut: [36] },
    { id: 'stacked-flare', name: 'Stacked Flare', fit: 'Bootcut', price: 2699, gsm: '410 GSM', wash: 'STACKED RAW', rise: 'Low', distress: 'Light', stretch: 3, badge: 'NEW', image: 'assets/lineup/fit-bootcut.png', imageFlat: 'assets/lineup/fit-all.png', soldOut: [] },
    { id: 'ozone-straight', name: 'Ozone Straight-Leg', fit: 'Straight', price: 2399, gsm: '420 GSM', wash: 'OZONE WASH', rise: 'High', distress: 'None', stretch: 4, badge: '', image: 'assets/lineup/fit-straight.png', imageFlat: 'assets/lineup/fit-all.png', soldOut: [] },
    { id: 'ninety-bootcut', name: "90's Bootcut", fit: 'Bootcut', price: 2199, gsm: '400 GSM', wash: 'VINTAGE RINSE', rise: 'Low', distress: 'Medium', stretch: 1, badge: '', image: 'assets/lineup/fit-bootcut.png', imageFlat: 'assets/fits/wide-light.png', soldOut: [] },
    { id: 'selvedge-wide', name: 'Selvedge Wide-Leg', fit: 'Wide-Leg', price: 2999, gsm: '480 GSM', wash: '14.5OZ RAW', rise: 'High', distress: 'None', stretch: 0, badge: 'LIMITED', image: 'assets/lineup/fit-wide.png', imageFlat: 'assets/lineup/fit-all.png', soldOut: [28] },
    { id: 'ecru-baggy', name: 'Ecru Bull-Denim Baggy', fit: 'Baggy', price: 2399, gsm: '430 GSM', wash: 'ECRU', rise: 'High', distress: 'None', stretch: 0, badge: 'NEW', image: 'assets/fits/ecru-baggy.png', imageFlat: 'assets/lineup/fit-baggy.png', soldOut: [38] },
    { id: 'charcoal-carpenter', name: 'Charcoal Double-Knee Carpenter', fit: 'Carpenter', price: 2599, gsm: '450 GSM', wash: 'CHARCOAL', rise: 'High', distress: 'Light', stretch: 0, badge: 'LIMITED', image: 'assets/fits/carpenter-sand.png', imageFlat: 'assets/lineup/fit-carpenter.png', soldOut: [] },
    { id: 'light-wide', name: 'Ice-Fade Wide-Leg', fit: 'Wide-Leg', price: 2149, gsm: '390 GSM', wash: 'LIGHT WASH', rise: 'High', distress: 'Light', stretch: 2, badge: '', image: 'assets/fits/wide-light.png', imageFlat: 'assets/lineup/fit-wide.png', soldOut: [28] },
    { id: 'indigo-straight', name: 'Raw Indigo Straight', fit: 'Straight', price: 2649, gsm: '420 GSM', wash: 'RAW INDIGO', rise: 'High', distress: 'None', stretch: 1, badge: 'LIMITED', image: 'assets/lineup/fit-all.png', imageFlat: 'assets/lineup/fit-straight.png', soldOut: [] },
  ];

  DROPS.forEach((product) => {
    const fitImage = FIT_IMAGES[product.fit];
    if (!fitImage) return;
    product.image = fitImage;
    product.imageFlat = fitImage;
  });

  const LOOKS = [
    { code: '01', name: 'Utility Baggy Set', fit: 'Baggy', price: 3299, size: '32', ratio: 'r-tall', top: '58%', left: '8%', image: unsplash(IMG.looks[0], 1000) },
    { code: '02', name: 'Ozone Straight Fit', fit: 'Straight', price: 3199, size: '30', ratio: 'r-mid', top: '66%', left: '18%', image: unsplash(IMG.looks[1], 1000) },
    { code: '03', name: 'Raw Carpenter Fit', fit: 'Carpenter', price: 3499, size: '34', ratio: 'r-wide', top: '52%', left: '12%', image: unsplash(IMG.looks[2], 1000) },
    { code: '04', name: 'Acid Wide Set', fit: 'Wide-Leg', price: 3399, size: '32', ratio: 'r-mid', top: '62%', left: '10%', image: unsplash(IMG.looks[3], 1000) },
    { code: '05', name: 'Slim Indigo Fit', fit: 'Slim', price: 2999, size: '30', ratio: 'r-tall', top: '70%', left: '8%', image: unsplash(IMG.looks[4], 1000) },
    { code: '06', name: 'Stacked Bootcut Fit', fit: 'Bootcut', price: 3299, size: '32', ratio: 'r-mid', top: '58%', left: '20%', image: unsplash(IMG.looks[5], 1000) },
    { code: '07', name: 'Dirty Tint Set', fit: 'Wide-Leg', price: 3499, size: '34', ratio: 'r-tall', top: '60%', left: '14%', image: unsplash(IMG.looks[6], 1000) },
    { code: '08', name: 'Straight Utility Fit', fit: 'Straight', price: 3199, size: '32', ratio: 'r-mid', top: '66%', left: '8%', image: unsplash(IMG.looks[7], 1000) },
    { code: '09', name: 'Selvedge Carpenters', fit: 'Carpenter', price: 3699, size: '36', ratio: 'r-wide', top: '50%', left: '22%', image: unsplash(IMG.looks[8], 1000) },
  ];

  const CROSS_SELL = { id: 'trucker-jacket', name: '14oz Selvedge Trucker', fit: 'Jacket', price: 2799, image: unsplash(IMG.cross, 400), size: 'M', meta: 'RIGID INDIGO / UNISEX' };

  const FIT_MEASURE = {
    Baggy: { thigh: 27.0, knee: 24.0, legOpening: 19.5, outseam: 42.0 },
    Straight: { thigh: 23.5, knee: 19.5, legOpening: 17.0, outseam: 41.5 },
    'Wide-Leg': { thigh: 24.0, knee: 23.5, legOpening: 21.0, outseam: 42.0 },
    Carpenter: { thigh: 25.5, knee: 19.0, legOpening: 16.5, outseam: 43.0 },
    Bootcut: { thigh: 23.0, knee: 16.0, legOpening: 18.0, outseam: 42.0 },
    Slim: { thigh: 21.0, knee: 14.5, legOpening: 13.5, outseam: 41.0 },
  };

  const WASH_SWATCHES = [
    { id: 'charcoal', name: 'Raw Selvedge Charcoal', color: '#141414' },
    { id: 'stone', name: 'Washed Stone White', color: '#F5F5F0' },
    { id: 'indigo', name: 'Electric Indigo', color: '#1D4ED8' },
  ];

  const OFFERS = [
    { code: 'TJF10', text: 'Extra 10% off with TJF10', copy: 'TJF10' },
    { code: 'BUY2', text: 'Buy 2 Get 15% off', copy: 'BUY2' },
    { code: 'FIRST', text: 'First order? Get ₹200 off', copy: 'FIRST200' },
  ];

  const SEED_REVIEWS = [
    { name: 'Arjun M.', rating: 5, title: 'Perfect rigid denim', body: 'Been wearing for 3 months, the fades are incredible. True to size, heavy weight.', fit: 'True to Size', height: "5'10\"", size: 'W32 / L32', date: '2026-01-15', verified: true },
    { name: 'Priya S.', rating: 5, title: 'Best jeans I own', body: 'The quality is unmatched. 14oz feels substantial but not stiff after a few wears.', fit: 'Runs Slightly Large', height: "5'6\"", size: 'W30 / L30', date: '2026-02-20', verified: true },
    { name: 'Rohit K.', rating: 4, title: 'Great but runs long', body: 'Love the fit, had to hem 2 inches. Otherwise perfect construction.', fit: 'True to Size', height: "5'8\"", size: 'W34 / L32', date: '2026-03-10', verified: true },
    { name: 'Neha P.', rating: 5, title: 'Obsessed with the color', body: 'The dirty tint wash is exactly what I wanted. Fast shipping too.', fit: 'Runs Small', height: "5'4\"", size: 'W28 / L30', date: '2026-03-28', verified: true },
    { name: 'Vikram D.', rating: 4, title: 'Solid daily driver', body: 'Good weight, comfortable after break-in. Rivets are a nice touch.', fit: 'True to Size', height: "6'0\"", size: 'W36 / L34', date: '2026-04-05', verified: true },
  ];

  const CATALOG = new Map();
  DROPS.forEach((d) => CATALOG.set(d.id, { ...d, type: 'drop' }));
  LOOKS.forEach((l) => CATALOG.set(`look-${l.code}`, {
    id: `look-${l.code}`, name: `Look ${l.code} — ${l.name}`, fit: l.fit,
    price: l.price, gsm: '400 GSM', wash: 'RAW INDIGO', rise: 'Mid',
    distress: 'Light', stretch: 1, badge: '', image: l.image, imageFlat: l.image,
    soldOut: [], type: 'look', size: l.size,
  }));
  CATALOG.set(CROSS_SELL.id, { ...CROSS_SELL, type: 'cross' });

  function syncCloudCatalog(rows) {
    rows.forEach((row) => {
      if (row.is_active === false || row.is_active === 0 || row.active === false || row.active === 0 || ['inactive', 'draft', 'archived'].includes(String(row.status || '').toLowerCase())) return;
      const id = String(row.id ?? row.product_id ?? row.slug ?? '');
      if (!id) return;
      const image = row.image_url || row.image || row.gallery_urls?.[0] || '';
      const stock = Object.fromEntries(SIZES.map((size) => [size, Math.max(0, Number(row[`stock_${size}`]) || 0)]));
      const rawFit = String(row.fit || row.fit_category || 'Wide');
      const fit = ({ Wide: 'Wide-Leg', 'Wide Leg': 'Wide-Leg' })[rawFit] || rawFit;
      const existing = CATALOG.get(id) || Array.from(CATALOG.values()).find((item) => item._cloudProductId === id);
      const product = {
        ...(existing || {}), id: existing?.id || id, _cloudProductId: id,
        name: row.name || row.title || 'Untitled Denim', fit,
        price: Number(row.price) || 0, gsm: `${Number(row.gsm ?? row.fabric_weight_gsm) || 450} GSM`,
        wash: row.wash || row.wash_type || 'RAW INDIGO', rise: row.rise || 'High',
        distress: row.distress || 'None', stretch: Number(row.stretch) || 0,
        badge: row.badge || '', image, imageFlat: row.gallery_urls?.[0] || image,
        soldOut: SIZES.filter((size) => stock[size] === 0), stock,
        gallery: Array.isArray(row.gallery_urls) ? row.gallery_urls : image ? [image] : [],
        description: row.description || '', type: 'drop',
      };
      CATALOG.set(String(product.id), product);
      CATALOG.set(id, product);
    });
  }

  const SHIPPING_THRESHOLD = 2499;
  const CART_KEY = 'tjf-cart-v1';
  const RECENT_KEY = 'tjf-recent-v1';
  const REVIEW_KEY_PREFIX = 'tjf-reviews-';

  /* ---------- 3. State ---------- */
  let product = null;
  let pageInitialized = false;
  let selectedSize = 32;
  let selectedLength = 32;
  let currentView = 'model';
  let currentSwatch = 'charcoal';
  let cart = loadCart();
  let drawerOpen = false;
  let menuOpen = false;
  let sizeGuideOpen = false;
  let toastTimer = null;
  let lenis = null;

  /* ---------- 4. Cart ---------- */
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((it) => it && it.id && it.name && Number(it.price) >= 0 && Number(it.qty) > 0)
        .map((it) => ({ ...it, qty: Math.max(1, Math.floor(it.qty)), price: Number(it.price) }));
    } catch { return []; }
  }
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }
  function cartCount() { return cart.reduce((sum, it) => sum + it.qty, 0); }
  function cartSubtotal() { return cart.reduce((sum, it) => sum + it.price * it.qty, 0); }
  function cartShipping() { const sub = cartSubtotal(); if (sub === 0) return 0; return sub >= SHIPPING_THRESHOLD ? 0 : 99; }

  function bumpBadge() {
    const badge = $('#cart-count');
    if (!badge) return;
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 280);
  }

  function addToCart(prod, sizeLabel, openDrawer = true) {
    if (!prod) return;
    const key = `${prod.id}-${sizeLabel}`;
    const existing = cart.find((it) => `${it.id}-${it.size}` === key);
    if (existing) existing.qty += 1;
    else cart.push({ id: prod.id, name: prod.name, price: Number(prod.price), image: prod.image, fit: prod.fit || 'Denim', size: sizeLabel, qty: 1 });
    renderCart();
    bumpBadge();
    toast(`${prod.name.toUpperCase()} — ${sizeLabel} ADDED TO BAG`);
    if (openDrawer) openCart();
  }

  function updateQty(key, delta) {
    const item = cart.find((it) => `${it.id}-${it.size}` === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((it) => it !== item);
    renderCart();
  }

  function removeItem(key) {
    cart = cart.filter((it) => `${it.id}-${it.size}` !== key);
    renderCart();
    toast('ITEM REMOVED FROM BAG');
  }

  function syncLock() {
    const locked = drawerOpen || menuOpen || sizeGuideOpen;
    document.body.classList.toggle('locked', locked);
    if (lenis) { if (locked) lenis.stop(); else lenis.start(); }
  }

  function openCart() {
    if (menuOpen) closeMenu();
    drawerOpen = true;
    $('#cart-drawer').classList.add('is-open');
    $('#drawer-overlay').classList.add('is-open');
    $('#cart-drawer').setAttribute('aria-hidden', 'false');
    renderCart();
    syncLock();
    setTimeout(() => $('.cart-head .icon-btn')?.focus(), 120);
  }

  function closeCart() {
    drawerOpen = false;
    $('#cart-drawer').classList.remove('is-open');
    $('#drawer-overlay').classList.remove('is-open');
    $('#cart-drawer').setAttribute('aria-hidden', 'true');
    syncLock();
    if (!menuOpen) $('.cart-btn')?.focus();
  }

  function openMenu() {
    menuOpen = true;
    $('#menu-btn').setAttribute('aria-expanded', 'true');
    $('#mobile-menu').classList.add('is-open');
    $('#mobile-menu').setAttribute('aria-hidden', 'false');
    syncLock();
  }

  function closeMenu() {
    menuOpen = false;
    $('#menu-btn').setAttribute('aria-expanded', 'false');
    $('#mobile-menu').classList.remove('is-open');
    $('#mobile-menu').setAttribute('aria-hidden', 'true');
    syncLock();
  }

  function openSizeGuide() {
    sizeGuideOpen = true;
    $('#pdp-size-guide-modal').classList.add('is-open');
    $('#pdp-size-guide-modal').setAttribute('aria-hidden', 'false');
    syncLock();
    renderSizeGuideTable();
    setTimeout(() => $('#pdp-size-guide-modal .modal-close')?.focus(), 120);
  }

  function closeSizeGuide() {
    sizeGuideOpen = false;
    $('#pdp-size-guide-modal').classList.remove('is-open');
    $('#pdp-size-guide-modal').setAttribute('aria-hidden', 'true');
    syncLock();
  }

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  /* ---------- 5. Product Resolution ---------- */
  function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  function resolveProduct(id) {
    return CATALOG.get(id) || null;
  }

  /* ---------- 6. Rendering ---------- */
  function renderProduct(p) {
    product = p;
    selectedSize = SIZES.includes(32) ? 32 : SIZES[0];
    if (p.soldOut && p.soldOut.includes(selectedSize)) {
      selectedSize = SIZES.find((s) => !(p.soldOut || []).includes(s)) || SIZES[0];
    }
    selectedLength = 32;
    currentView = 'model';
    currentSwatch = 'charcoal';

    // Update breadcrumb
    const fitObj = FITS.find((f) => f.name === p.fit);
    $('#pdp-breadcrumb-product').textContent = p.name;
    $('#pdp-breadcrumb-product').setAttribute('aria-current', 'page');

    // Brand tag & title
    $('#pdp-brand-tag').textContent = 'THE JEANS FACTORY / SS26';
    $('#pdp-title').textContent = p.name;

    // Rating summary
    $('#pdp-rating-value').textContent = '4.8';
    $('#pdp-review-count').textContent = '(2,418)';

    // Price
    const mrp = Math.round(p.price * 1.6 / 100) * 100;
    const discount = Math.round((1 - p.price / mrp) * 100);
    $('#pdp-price').textContent = money(p.price);
    $('#pdp-mrp').textContent = money(mrp);
    $('#pdp-discount-badge').textContent = `${discount}% OFF`;
    $('#pdp-discount-badge').style.display = discount > 0 ? 'inline-block' : 'none';

    // Images
    renderThumbnails(p);
    updateMainImage(p);

    // Offers
    renderOffers();

    // Swatches
    renderSwatches();

    // Sizes
    renderSizePills();
    renderLengthPills();

    // Stretch meter
    updateStretchMeter(Number(p.stretch) || 0);

    // Measurement table
    renderMeasurementTable(p);

    // Description
    $('#pdp-description').textContent = p.description || (fitObj ? fitObj.desc : 'Heavyweight Indian denim, cut for the street and built to outlive the trend.');

    // Composition & Care
    $('#pdp-composition').textContent = '100% Cotton / 14oz Ring-Spun Selvedge Denim';
    renderCareGuide(p);

    // Additional details
    renderAdditionalDetails(p);

    // Reviews
    renderReviews(p);

    // Related products
    renderRelated(p);

    // Recently viewed
    updateRecentlyViewed(p.id);
    renderRecentlyViewed();

    // Size guide table
    renderSizeGuideTable();
  }

  function applyLiveStock(rows) {
    if (!product) return;
    const normalize = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const row = rows.find((item) => [item.id, item.slug, item.handle, item.product_id, item.name, item.title]
      .some((value) => normalize(value) === normalize(product.id) || normalize(value) === normalize(product.name)));
    if (!row) return;
    product.stock = Object.fromEntries(SIZES.map((size) => [size, Math.max(0, Number(row[`stock_${size}`]) || 0)]));
    product.soldOut = SIZES.filter((size) => product.stock[size] === 0);
    if (product.stock[selectedSize] === 0) selectedSize = SIZES.find((size) => product.stock[size] > 0) || SIZES[0];
    renderSizePills();
    renderMeasurementTable(product);
  }

  function renderThumbnails(p) {
    const thumbs = $('#pdp-thumbs');
    if (!thumbs) return;
    const gallery = Array.isArray(p.gallery) && p.gallery.length ? p.gallery : (Array.isArray(p.gallery_urls) ? p.gallery_urls : []);
    const sourceImages = Array.from(new Set([p.image, ...gallery, p.imageFlat].filter(Boolean)));
    const thumbImages = Array.from({ length: 4 }, (_, index) => ({
      src: sourceImages[index % sourceImages.length] || p.image,
      alt: `${p.name} ${['on model', 'flat-lay', 'detail', 'detail'][index]}`,
      view: index % 2 ? 'flat' : 'model',
    }));
    thumbs.innerHTML = thumbImages.map((img, i) => `
      <button class="pdp-thumb ${i === 0 ? 'is-active' : ''}" data-thumb-index="${i}" data-view="${img.view}" aria-label="${escapeHTML(img.alt)}">
        <img src="${escapeHTML(img.src)}" alt="" loading="lazy" />
      </button>
    `).join('');
  }

  function updateMainImage(p) {
    const mainImg = $('#pdp-main-img');
    const zoomWrap = $('#pdp-zoom-wrap');
    if (!mainImg || !zoomWrap) return;
    const isFlat = currentView === 'flat';
    mainImg.src = isFlat ? p.imageFlat : p.image;
    mainImg.alt = `${p.name} ${isFlat ? 'flat-lay' : 'on model'}`;
    // Reset zoom
    zoomWrap.style.transformOrigin = 'center center';
    zoomWrap.style.transform = 'scale(1)';
  }

  function renderOffers() {
    const wrap = $('#pdp-offers');
    if (!wrap) return;
    wrap.innerHTML = OFFERS.map((o) => `
      <div class="pdp-offer" data-code="${o.code}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
        <span>${o.text}</span>
        <button class="pdp-copy-code mono" type="button" data-copy="${o.copy}" aria-label="Copy ${o.code}">COPY</button>
      </div>
    `).join('');
  }

  function renderSwatches() {
    const wrap = $('#pdp-swatches');
    if (!wrap) return;
    wrap.innerHTML = `
      <span class="mono pdp-swatch-label">WASH</span>
      <div class="pdp-swatch-row" role="group" aria-label="Color options">
        ${WASH_SWATCHES.map((s) => `
          <button class="pdp-swatch ${s.id === currentSwatch ? 'is-active' : ''}" data-swatch="${s.id}" aria-label="${s.name}" style="--swatch-color: ${s.color};" aria-pressed="${s.id === currentSwatch}">
            <span class="pdp-swatch-dot" style="background: ${s.color};"></span>
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderSizePills() {
    const wrap = $('#pdp-size-pills');
    if (!wrap || !product) return;
    const sold = new Set(product.stock ? SIZES.filter((s) => product.stock[s] === 0) : (product.soldOut || []));
    wrap.innerHTML = SIZES.map((s) => `
      <button class="pdp-size-pill ${s === selectedSize ? 'is-active' : ''}" data-size="${s}" ${sold.has(s) ? 'disabled aria-disabled="true"' : ''} aria-label="Select waist size ${s}">${s}</button>
    `).join('');
    const warning = $('#pdp-stock-warning');
    const stock = product.stock?.[selectedSize];
    if (warning) {
      warning.hidden = stock == null || stock === 0 || stock > 5;
      warning.textContent = warning.hidden ? '' : `ONLY ${stock} LEFT`;
    }
    if (product.stock) {
      const soldOut = SIZES.every((size) => product.stock[size] === 0);
      ['#pdp-add-bag', '#pdp-buy-now'].forEach((selector) => { const button = $(selector); if (button) button.disabled = soldOut; });
    }
  }

  function renderLengthPills() {
    const wrap = $('#pdp-length-pills');
    if (!wrap) return;
    wrap.innerHTML = LENGTHS.map((l) => `
      <button class="pdp-length-pill ${l === selectedLength ? 'is-active' : ''}" data-length="${l}" aria-label="Select length ${l}">${l}</button>
    `).join('');
  }

  const STRETCH_STEPS = [
    { max: 0, label: 'RIGID', copy: '100% cotton, zero elastane. Breaks in and molds to you — no snap-back.' },
    { max: 2, label: 'LOW STRETCH', copy: 'A touch of give for movement. Holds its shape wash after wash.' },
    { max: 6, label: 'MEDIUM STRETCH', copy: 'Everyday comfort with a structured hand and clean recovery.' },
    { max: 99, label: 'COMFORT STRETCH', copy: 'All-day flex for long shifts and longer nights. Springs right back.' },
  ];

  function stretchCopy(value) {
    return STRETCH_STEPS.find((s) => value <= s.max) || STRETCH_STEPS[STRETCH_STEPS.length - 1];
  }

  function updateStretchMeter(value) {
    const info = stretchCopy(value);
    const fill = $('#pdp-stretch-fill');
    const knob = $('#pdp-stretch-knob');
    const label = $('#pdp-stretch-label');
    const copy = $('#pdp-stretch-copy');
    const readout = $('#pdp-stretch-readout');
    const actual = $('#pdp-stretch-actual');
    const pct = Math.max(0, Math.min(100, (value / 15) * 100));
    if (fill) fill.style.width = pct + '%';
    if (knob) knob.style.left = pct + '%';
    if (label) label.textContent = info.label;
    if (copy) copy.textContent = info.copy;
    if (readout) readout.textContent = `${value}% ELASTANE`;
    if (actual) {
      actual.style.left = pct + '%';
      actual.dataset.value = `${value}%`;
    }
    const range = $('#pdp-stretch-range');
    if (range) range.value = String(value);
  }

  function measurementsFor(fit, size) {
    const base = FIT_MEASURE[fit] || FIT_MEASURE['Wide-Leg'];
    const d = size - 32;
    const round = (n) => Math.round(n * 10) / 10;
    return [
      { label: 'Waist', value: round(size + d * 0) },
      { label: 'Thigh', value: round(base.thigh + d * 0.55) },
      { label: 'Knee', value: round(base.knee + d * 0.4) },
      { label: 'Leg Opening', value: round(base.legOpening + d * 0.35) },
      { label: 'Outseam', value: round(base.outseam + d * 0.15) },
    ];
  }

  function renderMeasurementTable(p) {
    const table = $('#pdp-measure-table');
    if (!table) return;
    const rows = measurementsFor(p.fit, 32).map((r) => r.label);
    table.innerHTML = `
      <caption class="sr-only">Measurements in inches by waist size for ${p.name}</caption>
      <thead>
        <tr>
          <th scope="col">MEASUREMENT (IN)</th>
          ${SIZES.map((s) => `<th scope="col" data-col-size="${s}" class="${s === selectedSize ? 'is-selected' : ''}">W${s}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((label, rowIdx) => `
          <tr>
            <th scope="row">${label}</th>
            ${SIZES.map((s) => {
              const measured = measurementsFor(p.fit, s)[rowIdx].value;
              return `<td data-col-size="${s}" class="${s === selectedSize ? 'is-selected' : ''}">${measured.toFixed(1)}"</td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>`;
  }

  function renderCareGuide(p) {
    const wrap = $('#pdp-care-list');
    if (!wrap) return;
    const raw = /RAW/i.test(p.wash);
    const guide = [
      { icon: 'W', title: 'WASH COLD', copy: 'Machine wash at 30°C, inside-out, with like colours.' },
      { icon: 'D', title: 'HANG DRY', copy: 'Line dry in shade. Never tumble — heat kills the hand-feel.' },
      { icon: 'B', title: 'EXPECT BLEED', copy: 'Indigo may transfer at first. Wash separately for the first 3 cycles.' },
      { icon: 'I', title: 'IRON REVERSE', copy: 'Warm iron on the reverse. Skip the print and hardware.' },
    ];
    if (raw) {
      guide.unshift({ icon: '6', title: 'RAW CARE', copy: 'Wait 6 months before the first wash. Spot-clean and air out between wears.' });
    }
    wrap.innerHTML = guide.map((c) => `
      <li>
        <span class="care-icon mono">${c.icon}</span>
        <div><strong class="mono">${c.title}</strong><p>${c.copy}</p></div>
      </li>`).join('');
  }

  function renderAdditionalDetails(p) {
    const wrap = $('#pdp-details-list');
    if (!wrap) return;
    const details = [
      { label: 'Country of Origin', value: 'India' },
      { label: 'SKU', value: p.id.toUpperCase() },
      { label: 'Fabric', value: `${p.gsm} / ${p.wash}` },
      { label: 'Hardware', value: 'YKK Zipper / Solid Brass Rivets / Safety Orange Enamel' },
      { label: 'Fit', value: p.fit },
      { label: 'Rise', value: p.rise },
      { label: 'Distress Level', value: p.distress },
    ];
    wrap.innerHTML = details.map((d) => `
      <div class="pdp-detail-row">
        <dt class="mono">${d.label}</dt>
        <dd>${d.value}</dd>
      </div>
    `).join('');
  }

  function renderSizeGuideTable() {
    const table = $('#sg-measure-table');
    if (!table || !product) return;
    const rows = measurementsFor(product.fit, 32).map((r) => r.label);
    table.innerHTML = `
      <caption class="sr-only">Size guide measurements in inches</caption>
      <thead>
        <tr>
          <th scope="col">MEASUREMENT (IN)</th>
          ${SIZES.map((s) => `<th scope="col">W${s}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((label, rowIdx) => `
          <tr>
            <th scope="row">${label}</th>
            ${SIZES.map((s) => {
              const measured = measurementsFor(product.fit, s)[rowIdx].value;
              return `<td>${measured.toFixed(1)}"</td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>`;
  }

  /* ---------- 7. Reviews ---------- */
  function getReviewKey(id) { return REVIEW_KEY_PREFIX + id; }

  function loadReviews(id) {
    try {
      const raw = localStorage.getItem(getReviewKey(id));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function saveReviews(id, reviews) {
    try { localStorage.setItem(getReviewKey(id), JSON.stringify(reviews)); } catch {}
  }

  function getAllReviews(id) {
    const stored = loadReviews(id);
    return [...SEED_REVIEWS, ...stored];
  }

  function renderReviews(p) {
    const reviews = getAllReviews(p.id);
    const list = $('#pdp-reviews-list');
    if (!list) return;

    // Overall rating
    const total = reviews.length;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / total;
    $('#pdp-big-rating').textContent = avg.toFixed(1);
    $('#pdp-rating-bar-fill').style.width = `${(avg / 5) * 100}%`;
    $('#pdp-total-reviews').textContent = `${total} review${total !== 1 ? 's' : ''}`;

    // Fit scale
    renderFitScale(p.id, reviews);

    // Review cards
    list.innerHTML = reviews.map((r) => `
      <article class="pdp-review-card" role="listitem">
        <header class="pdp-review-head">
          <div class="pdp-review-meta">
            <strong>${r.name}</strong>
            <span class="mono">${r.verified ? '✓ Verified Buyer' : ''}</span>
          </div>
          <div class="pdp-review-rating" aria-label="${r.rating} out of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        </header>
        <h3 class="pdp-review-title">${r.title}</h3>
        <p class="pdp-review-body">${r.body}</p>
        <footer class="pdp-review-foot mono">
          <span class="pdp-review-fit">${r.fit}</span>
          <span>•</span>
          <span>${r.height}</span>
          <span>•</span>
          <span>${r.size}</span>
          <span>•</span>
          <span>${new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </footer>
      </article>
    `).join('');
  }

  function renderFitScale(productId, reviews) {
    // Calculate fit distribution from reviews
    let small = 0, trueFit = 0, large = 0;
    reviews.forEach((r) => {
      const f = r.fit.toLowerCase();
      if (f.includes('small')) small++;
      else if (f.includes('large')) large++;
      else trueFit++;
    });
    const total = reviews.length || 1;
    const smallPct = Math.round((small / total) * 100);
    const truePct = Math.round((trueFit / total) * 100);
    const largePct = Math.round((large / total) * 100);

    $('#pdp-fit-small').style.width = `${smallPct}%`;
    $('#pdp-fit-true').style.width = `${truePct}%`;
    $('#pdp-fit-large').style.width = `${largePct}%`;

    // Position marker at center of true-to-size segment
    const markerLeft = smallPct + truePct / 2;
    $('#pdp-fit-scale-marker').style.left = `${markerLeft}%`;
  }

  function submitReview(e) {
    e.preventDefault();
    if (!product) return;
    const form = e.target;
    const name = $('#pdp-review-name').value.trim();
    const height = $('#pdp-review-height').value.trim();
    const size = $('#pdp-review-size').value.trim();
    const rating = Number(form.rating.value);
    const title = $('#pdp-review-title').value.trim();
    const body = $('#pdp-review-body').value.trim();
    if (!name || !rating || !title || !body) return;

    // Determine fit label from rating
    let fitLabel = 'True to Size';
    if (rating <= 2) fitLabel = 'Runs Small';
    else if (rating >= 4) fitLabel = 'Runs Large';

    const newReview = {
      name, rating, title, body, fit: fitLabel,
      height: height || '—', size: size || '—',
      date: new Date().toISOString().split('T')[0], verified: true,
    };

    const stored = loadReviews(product.id);
    stored.unshift(newReview);
    saveReviews(product.id, stored);

    form.reset();
    renderReviews(product);
    toast('REVIEW SUBMITTED — THANK YOU!');
  }

  /* ---------- 8. Related Products ---------- */
  function renderRelated(p) {
    const grid = $('#pdp-related-grid');
    if (!grid) return;
    // Find 4 products with same fit or similar price range
    const related = DROPS.filter((d) => d.id !== p.id && (d.fit === p.fit || Math.abs(d.price - p.price) < 500)).slice(0, 4);
    grid.innerHTML = related.map((d) => `
      <article class="pdp-related-card" role="listitem">
        <a href="product.html?id=${d.id}" class="pdp-related-link">
          <div class="pdp-related-img img-ph"><img src="${d.image}" alt="${d.name}" loading="lazy" /></div>
          <div class="pdp-related-info">
            <h4>${d.name}</h4>
            <p class="mono">${d.wash} / ${d.fit}</p>
            <span class="pdp-related-price">${money(d.price)}</span>
          </div>
        </a>
      </article>
    `).join('');
  }

  /* ---------- 9. Recently Viewed ---------- */
  function updateRecentlyViewed(id) {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      let recent = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(recent)) recent = [];
      recent = recent.filter((x) => x !== id);
      recent.unshift(id);
      recent = recent.slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {}
  }

  function renderRecentlyViewed() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      let recent = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(recent)) recent = [];
      // Remove current product
      recent = recent.filter((x) => x !== product?.id);
      if (!recent.length) {
        $('#pdp-recent-section').hidden = true;
        return;
      }
      const items = recent.map((id) => CATALOG.get(id)).filter(Boolean).slice(0, 4);
      if (!items.length) { $('#pdp-recent-section').hidden = true; return; }
      $('#pdp-recent-section').hidden = false;
      $('#pdp-recent-track').innerHTML = items.map((d) => `
        <article class="pdp-recent-card" role="listitem">
          <a href="product.html?id=${d.id}" class="pdp-recent-link">
            <div class="pdp-recent-img img-ph"><img src="${d.image}" alt="${d.name}" loading="lazy" /></div>
            <div class="pdp-recent-info">
              <h4>${d.name}</h4>
              <span class="mono">${money(d.price)}</span>
            </div>
          </a>
        </article>
      `).join('');
    } catch {}
  }

  /* ---------- 10. Cart Rendering ---------- */
  function renderCart() {
    const wrap = $('#cart-items');
    const subtotalEl = $('#cart-subtotal');
    const headCount = $('#cart-head-count');
    const crossWrap = $('#cross-sell');
    const shippingCopy = $('#ship-copy');
    const shippingPercent = $('#ship-percent');
    const shippingFill = $('#ship-fill');
    const badge = $('#cart-count');
    const sub = cartSubtotal();
    const count = cartCount();

    if (badge) badge.textContent = count;
    if (headCount) headCount.textContent = `(${count})`;

    if (!cart.length) {
      wrap.innerHTML = `
        <div class="cart-empty">
          <h3>NOTHING IN THE BAG.</h3>
          <p>YOUR NEXT FAVOURITE PAIR<br />IS STILL ON THE RUNWAY.</p>
          <a class="btn-outline" href="index.html#drops" data-close-cart>SHOP THE DROP</a>
        </div>`;
    } else {
      wrap.innerHTML = cart.map((it) => {
        const key = `${it.id}-${it.size}`;
        return `
          <div class="cart-line" data-key="${key}">
            <div class="cart-thumb img-ph"><img src="${it.image}" alt="${it.name}" loading="lazy" /></div>
            <div class="cart-line-info">
              <h4>${it.name}</h4>
              <p class="cart-line-meta">${it.fit} / SIZE ${it.size}</p>
              <div class="qty-row">
                <div class="qty">
                  <button data-qty="-1" aria-label="Decrease quantity">−</button>
                  <span>${it.qty}</span>
                  <button data-qty="1" aria-label="Increase quantity">+</button>
                </div>
                <button class="remove-btn" data-remove>REMOVE</button>
              </div>
            </div>
            <div class="cart-line-price">${money(it.price * it.qty)}</div>
          </div>`;
      }).join('');
    }

    if (crossWrap) {
      const hasCross = cart.some((it) => it.id === CROSS_SELL.id);
      crossWrap.innerHTML = cart.length && !hasCross ? `
        <div class="cross-sell">
          <div class="cross-sell-thumb img-ph"><img src="${CROSS_SELL.image}" alt="${CROSS_SELL.name}" loading="lazy" /></div>
          <div class="cross-sell-info">
            <span>COMPLETE THE FIT</span>
            <h4>${CROSS_SELL.name}</h4>
            <p>${CROSS_SELL.meta} — ${money(CROSS_SELL.price)}</p>
          </div>
          <button class="add-mini" data-cross-add>ADD</button>
        </div>` : '';
    }

    if (subtotalEl) subtotalEl.textContent = money(sub);

    if (shippingFill) {
      const pct = Math.min(100, (sub / SHIPPING_THRESHOLD) * 100);
      shippingFill.style.width = pct + '%';
      if (shippingPercent) shippingPercent.textContent = Math.round(pct) + '%';
      if (shippingCopy) {
        shippingCopy.textContent = sub >= SHIPPING_THRESHOLD
          ? 'FREE SHIPPING UNLOCKED'
          : sub === 0
            ? `ADD ${money(SHIPPING_THRESHOLD)} FOR FREE SHIPPING`
            : `${money(SHIPPING_THRESHOLD - sub)} AWAY FROM FREE SHIPPING`;
      }
    }

    saveCart();
  }

  /* ---------- 11. Interactions ---------- */
  function bindEvents() {
    // Thumbnail clicks
    $('#pdp-thumbs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.pdp-thumb');
      if (!btn) return;
      const idx = Number(btn.dataset.thumbIndex);
      const view = btn.dataset.view;
      $$('#pdp-thumbs .pdp-thumb').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.thumbIndex) === idx));
      currentView = view;
      updateMainImage(product);
      $$('[data-view]').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.view === view);
        b.setAttribute('aria-pressed', b.dataset.view === view ? 'true' : 'false');
      });
    });

    // View switcher
    $$('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.view === currentView) return;
        currentView = btn.dataset.view;
        $$('[data-view]').forEach((b) => {
          b.classList.toggle('is-active', b.dataset.view === currentView);
          b.setAttribute('aria-pressed', b.dataset.view === currentView ? 'true' : 'false');
        });
        // Update active thumb
        $$('#pdp-thumbs .pdp-thumb').forEach((b) => {
          b.classList.toggle('is-active', b.dataset.view === currentView);
        });
        updateMainImage(product);
      });
    });

    // Swatch clicks
    $('#pdp-swatches')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.pdp-swatch');
      if (!btn) return;
      currentSwatch = btn.dataset.swatch;
      $$('.pdp-swatch').forEach((b) => b.classList.toggle('is-active', b.dataset.swatch === currentSwatch));
    });

    // Size pills
    $('#pdp-size-pills')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.pdp-size-pill');
      if (!btn || btn.disabled) return;
      selectedSize = Number(btn.dataset.size);
      $$('.pdp-size-pill').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.size) === selectedSize));
      renderSizePills();
      renderMeasurementTable(product);
    });

    // Length pills
    $('#pdp-length-pills')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.pdp-length-pill');
      if (!btn) return;
      selectedLength = Number(btn.dataset.length);
      $$('.pdp-length-pill').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.length) === selectedLength));
    });

    // Stretch meter range
    const stretchRange = $('#pdp-stretch-range');
    if (stretchRange) {
      stretchRange.addEventListener('input', () => updateStretchMeter(Number(stretchRange.value)));
    }

    // Copy offer code
    $('#pdp-offers')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.pdp-copy-code');
      if (!btn) return;
      navigator.clipboard.writeText(btn.dataset.copy).then(() => {
        btn.textContent = 'COPIED!';
        setTimeout(() => btn.textContent = 'COPY', 1500);
        toast(`COPIED: ${btn.dataset.copy}`);
      });
    });

    // Pincode checker
    const pincodeInput = $('#pdp-pincode-input');
    const pincodeCheck = $('#pdp-pincode-check');
    const pincodeMsg = $('#pdp-pincode-msg');
    pincodeCheck?.addEventListener('click', () => {
      const pin = pincodeInput?.value.trim();
      if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
        pincodeMsg.textContent = 'ENTER A VALID 6-DIGIT PINCODE';
        pincodeMsg.style.color = 'var(--orange)';
        return;
      }
      // Simple check: first digit not 0
      const serviceable = pin[0] !== '0';
      pincodeMsg.textContent = serviceable
        ? `DELIVERY AVAILABLE — EST. 3-5 BUSINESS DAYS`
        : `SORRY, WE DON'T DELIVER TO ${pin} YET`;
      pincodeMsg.style.color = serviceable ? 'var(--indigo)' : 'var(--orange)';
    });

    // Size guide
    $$('[data-open-size-guide]').forEach((btn) => btn.addEventListener('click', openSizeGuide));
    $$('[data-close-size-guide]').forEach((btn) => btn.addEventListener('click', closeSizeGuide));

    // Accordions
    $$('.pdp-accordion-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        const targetId = btn.getAttribute('aria-controls');
        const content = targetId ? document.getElementById(targetId) : null;
        if (content) content.hidden = expanded;
      });
    });

    // Add to bag
    $('#pdp-add-bag')?.addEventListener('click', () => {
      if (!product) return;
      const sizeLabel = `W${selectedSize} / L${selectedLength}`;
      addToCart(product, sizeLabel, true);
    });

    // Buy now
    $('#pdp-buy-now')?.addEventListener('click', () => {
      if (!product) return;
      const sizeLabel = `W${selectedSize} / L${selectedLength}`;
      addToCart(product, sizeLabel, false);
      window.location.href = 'checkout.html';
    });

    // Cart drawer
    $$('[data-open-cart]').forEach((btn) => btn.addEventListener('click', (e) => { e.preventDefault(); openCart(); }));
    $$('[data-close-cart]').forEach((btn) => btn.addEventListener('click', (e) => { e.preventDefault(); closeCart(); }));

    // Cart quantity / remove
    $('#cart-items')?.addEventListener('click', (e) => {
      const line = e.target.closest('.cart-line');
      if (!line) return;
      const key = line.dataset.key;
      const qtyBtn = e.target.closest('[data-qty]');
      if (qtyBtn) { updateQty(key, Number(qtyBtn.dataset.qty)); return; }
      if (e.target.closest('[data-remove]')) removeItem(key);
    });

    // Cross-sell
    $('#cross-sell')?.addEventListener('click', (e) => {
      if (e.target.closest('[data-cross-add]')) addToCart(CROSS_SELL, CROSS_SELL.size, false);
    });

    // Checkout button (redirect to checkout.html)
    $('#checkout-btn')?.addEventListener('click', () => {
      if (!cart.length) { toast('YOUR BAG IS EMPTY — ADD A FIT FIRST'); return; }
      window.location.href = 'checkout.html';
    });

    // Menu
    $('#menu-btn')?.addEventListener('click', () => { if (menuOpen) closeMenu(); else openMenu(); });

    // Review form
    $('#pdp-review-form')?.addEventListener('submit', submitReview);

    // Smooth scroll for anchor links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href === '#') { if (link.dataset.toast) { e.preventDefault(); toast(link.dataset.toast); } return; }
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) closeMenu();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    });

    // Newsletter
    $('#newsletter-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#newsletter-email').value.trim();
      if (!email) return;
      toast(`YOU'RE ON THE MILL LIST — ${email.toUpperCase()}`);
      e.target.reset();
    });

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (sizeGuideOpen) closeSizeGuide();
        else if (drawerOpen) closeCart();
        else if (menuOpen) closeMenu();
        return;
      }
    });

    // Image zoom on main image
    const zoomWrap = $('#pdp-zoom-wrap');
    const mainImg = $('#pdp-main-img');
    if (zoomWrap && mainImg) {
      zoomWrap.addEventListener('mousemove', (e) => {
        if (window.matchMedia('(hover: none)').matches) return;
        const rect = zoomWrap.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        zoomWrap.style.transformOrigin = `${x}% ${y}%`;
        zoomWrap.style.transform = 'scale(2)';
      });
      zoomWrap.addEventListener('mouseleave', () => {
        zoomWrap.style.transformOrigin = 'center center';
        zoomWrap.style.transform = 'scale(1)';
      });
    }

    // Resize handler
    window.addEventListener('resize', () => {
      if (menuOpen && window.innerWidth > 900) closeMenu();
    });
  }

  /* ---------- 12. Lenis / Scroll ---------- */
  function initSmoothScroll() {
    if (window.Lenis && !reducedMotion) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
      });
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      window.__lenis = lenis;

      // Scroll progress
      lenis.on('scroll', ({ scroll }) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, scroll / max) : 0;
        const fill = $('#scroll-progress-fill');
        if (fill) fill.style.transform = `scaleX(${p})`;
      });
    } else {
      window.addEventListener('scroll', () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        const fill = $('#scroll-progress-fill');
        if (fill) fill.style.transform = `scaleX(${p})`;
      }, { passive: true });
    }
  }

  /* ---------- 13. Boot ---------- */
  function boot() {
    const id = getProductIdFromUrl();
    if (!id) {
      // Redirect to homepage if no product ID
      window.location.href = 'index.html';
      return;
    }
    if (window.TJFInventory?.rows?.length) syncCloudCatalog(window.TJFInventory.rows);
    if (!mountProduct(id) && !window.TJFInventory?.rows?.length) {
      const wait = document.createElement('p');
      wait.className = 'pdp-cloud-loading mono';
      wait.textContent = 'LOADING LIVE PRODUCT…';
      $('#pdp-title').textContent = 'LOADING…';
      $('#pdp-breadcrumb-product').textContent = 'Loading product';
      $('#pdp-title').insertAdjacentElement('afterend', wait);
      window.setTimeout(() => { if (!pageInitialized) window.location.href = 'index.html#drops'; }, 12000);
    } else if (!pageInitialized) window.location.href = 'index.html#drops';
  }

  function mountProduct(id) {
    if (pageInitialized) return true;
    const p = resolveProduct(id);
    if (!p) return false;
    pageInitialized = true;
    renderProduct(p);
    if (window.TJFInventory?.rows?.length) applyLiveStock(window.TJFInventory.rows);
    bindEvents();
    initSmoothScroll();
    renderCart();
    if (window.gsap && window.ScrollTrigger) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.refresh(); }
    return true;
  }

  window.addEventListener('tjf:inventory', (event) => {
    const rows = event.detail || [];
    syncCloudCatalog(rows);
    if (!pageInitialized) {
      const id = getProductIdFromUrl();
      if (!mountProduct(id)) window.location.href = 'index.html#drops';
    } else applyLiveStock(rows);
  });
  if (window.TJFInventory?.rows?.length) {
    syncCloudCatalog(window.TJFInventory.rows);
    if (product) applyLiveStock(window.TJFInventory.rows);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
