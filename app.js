/* ============================================================
   THE JEANS FACTORY — app.js
   1. Helpers & environment
   2. Catalogue data
   3. Rendering (runway, lookbook, cart)
   4. SVG silhouette engine
   5. Scroll choreography (GSAP + Lenis)
   6. Interactions (fits, filter, finder)
   7. Cart / checkout
   8. Chrome (nav, cursor, menu, toast, preloader)
============================================================ */

(() => {
  'use strict';

  /* ---------- 1. Helpers & environment ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const pad2 = (n) => String(n).padStart(2, '0');
  const unsplash = (id, w = 1100) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

  /* Studio Flat-Lay Denim Generator (isolated full-length garment for #EDEDED studio cards) */
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
    const uid = `${fit}-${key}-${distress}`.replace(/[^a-z0-9]/gi, '').toLowerCase();

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

  // Any failed image disappears, leaving the wrapper fallback visible.
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

  const FIT_IMAGES = {
    Baggy: 'assets/fits/baggy.png',
    'Wide-Leg': 'assets/fits/wide.png',
    Straight: 'assets/fits/straight.png',
    Slim: 'assets/fits/slim.png',
    Carpenter: 'assets/fits/carpenter.png',
    Bootcut: 'assets/fits/bootcut.png',
  };

  const FITS = [
    {
      name: 'Baggy', code: 'BG-01', ghost: 'BAGGY',
      desc: 'Dropped crotch, a generous thigh and a stacked hem. Cut from 14oz rigid denim that breaks in like a favourite record.',
      specs: { leg: '19.5"', rise: '11.5"', knee: '24.0"', gsm: '420 GSM', wash: 'RAW INDIGO' },
      image: FIT_IMAGES.Baggy,
      hud: { riseY: 22, kneeY: 53, hemY: 84, riseX: 46, kneeX: 30, hemX: 52 },
    },
    {
      name: 'Straight', code: 'ST-02', ghost: 'STRAIGHT',
      desc: 'A balanced column from hip to ankle. Mid-weight vintage indigo cut clean for everyday rotation.',
      specs: { leg: '17.0"', rise: '11.5"', knee: '19.5"', gsm: '420 GSM', wash: 'OZONE WASH' },
      image: FIT_IMAGES.Straight,
      hud: { riseY: 20, kneeY: 51, hemY: 83, riseX: 48, kneeX: 25, hemX: 50 },
    },
    {
      name: 'Wide-Leg', code: 'WL-03', ghost: 'WIDE',
      desc: 'A clean column from hip to ankle. Engineered with a high rise so the leg falls straight, not slouchy.',
      specs: { leg: '21.0"', rise: '11.0"', knee: '23.5"', gsm: '400 GSM', wash: 'STONE BLUE' },
      image: FIT_IMAGES['Wide-Leg'],
      hud: { riseY: 24, kneeY: 54, hemY: 85, riseX: 44, kneeX: 32, hemX: 46 },
    },
    {
      name: 'Carpenter', code: 'CP-04', ghost: 'CARPENTER',
      desc: 'Utility loop, hammer pocket, doubled knee. Built for people who carry too much and still want a clean line.',
      specs: { leg: '16.5"', rise: '12.5"', knee: '19.0"', gsm: '440 GSM', wash: 'DIRTY TINT' },
      image: FIT_IMAGES.Carpenter,
      hud: { riseY: 19, kneeY: 55, hemY: 84, riseX: 48, kneeX: 36, hemX: 52 },
    },
    {
      name: 'Bootcut', code: 'BC-05', ghost: 'BOOTCUT',
      desc: 'Snug through the thigh, then an 18-inch sweep at the hem. The 90s cut that makes every shoe look intentional.',
      specs: { leg: '18.0"', rise: '10.5"', knee: '16.0"', gsm: '410 GSM', wash: 'VINTAGE INDIGO' },
      image: FIT_IMAGES.Bootcut,
      hud: { riseY: 26, kneeY: 52, hemY: 85, riseX: 46, kneeX: 38, hemX: 48 },
    },
    {
      name: 'Slim', code: 'SL-06', ghost: 'SLIM',
      desc: 'A sharp, clean taper with just enough room at the knee. Mid-rise, zero bulk, all attitude.',
      specs: { leg: '13.5"', rise: '10.0"', knee: '14.5"', gsm: '380 GSM', wash: 'MIDNIGHT RINSE' },
      image: FIT_IMAGES.Slim,
      hud: { riseY: 27, kneeY: 54, hemY: 83, riseX: 48, kneeX: 40, hemX: 54 },
    },
  ];

  const ALL_SIZES = [28, 30, 32, 34, 36, 38];

  const SWATCH_POOL = {
    indigo: { name: 'Raw Indigo', color: '#1B2A4A', image: unsplash(IMG.drops[2], 900) },
    light: { name: 'Light Wash', color: '#84A0C0', image: unsplash(IMG.drops[1], 900) },
    charcoal: { name: 'Charcoal', color: '#141414', image: unsplash(IMG.flat[3], 900) },
    ecru: { name: 'Ecru', color: '#E5E1D8', image: unsplash(IMG.flat[0], 900) },
    ozone: { name: 'Ozone Slate', color: '#475569', image: unsplash(IMG.drops[5], 900) },
  };

  const DROPS = [
    {
      id: 'acid-baggy', name: 'Acid-Wash Baggy', fit: 'Baggy', price: 2499, mrp: 3699, gsm: '420 GSM',
      wash: 'ACID WASH', color: 'Light Wash', pattern: 'Acid / Enzyme', rise: 'High', distress: 'Medium', stretch: 2,
      badge: 'NEW DROP',
      image: 'assets/fits/baggy.png',
      imageFlat: 'assets/fits/baggy.png',
      soldOut: [30], sizes: [28, 32, 34, 36, 38], newest: 11,
      swatches: [
        { name: 'Acid Wash', color: '#6d87a8', image: 'assets/fits/baggy.png' },
        { name: 'Raw Indigo', color: '#1B2A4A', image: 'assets/fits/baggy.png' },
        { name: 'Charcoal', color: '#232427', image: 'assets/fits/straight.png' },
        { name: 'Ecru', color: '#E5E1D8', image: 'assets/fits/ecru-baggy.png' },
      ],
    },
    {
      id: 'dirty-wide', name: 'Dirty-Tint Wide-Leg', fit: 'Wide-Leg', price: 2299, mrp: 3499, gsm: '400 GSM',
      wash: 'DIRTY TINT', color: 'Light Wash', pattern: 'Acid / Enzyme', rise: 'High', distress: 'Light', stretch: 1,
      badge: 'BESTSELLER',
      image: 'assets/lineup/fit-utility-blue.png',
      imageFlat: 'assets/fits/wide.png',
      soldOut: [], sizes: [28, 30, 32, 34, 36], newest: 8,
      swatches: [
        { name: 'Dirty Tint', color: '#6b7f91', image: 'assets/lineup/fit-utility-blue.png' },
        { name: 'Raw Indigo', color: '#1B2A4A', image: 'assets/fits/wide.png' },
        { name: 'Charcoal', color: '#232427', image: 'assets/fits/straight.png' },
        { name: 'Ecru', color: '#E5E1D8', image: 'assets/fits/ecru-baggy.png' },
      ],
    },
    {
      id: 'raw-slim', name: 'Raw Indigo Slim', fit: 'Slim', price: 1999, mrp: 3199, gsm: '410 GSM',
      wash: 'RAW INDIGO', color: 'Raw Indigo', pattern: 'Solid Raw', rise: 'Mid', distress: 'None', stretch: 0,
      badge: '14OZ SELVEDGE',
      image: 'assets/fits/slim.png',
      imageFlat: 'assets/fits/baggy.png',
      soldOut: [], sizes: [28, 30, 32, 34, 36], newest: 6,
      swatches: [
        { name: 'Raw Indigo', color: '#1B2A4A', image: 'assets/fits/slim.png' },
        { name: 'Charcoal', color: '#232427', image: 'assets/fits/straight.png' },
        { name: 'Light Wash', color: '#8da9c7', image: 'assets/fits/wide-light.png' },
      ],
    },
    {
      id: 'distressed-carpenter', name: 'Distressed Carpenter', fit: 'Carpenter', price: 2799, mrp: 4299, gsm: '440 GSM',
      wash: 'SAND BLAST', color: 'Charcoal', pattern: 'Distressed', rise: 'High', distress: 'Heavy', stretch: 0,
      badge: 'NEW DROP',
      image: 'assets/fits/carpenter.png',
      imageFlat: 'assets/fits/carpenter-sand.png',
      soldOut: [36], sizes: [28, 30, 32, 34, 38], newest: 10,
      swatches: [
        { name: 'Mid Indigo Utility', color: '#456891', image: 'assets/fits/carpenter.png' },
        { name: 'Sand Blast', color: '#3b3d42', image: 'assets/fits/carpenter-sand.png' },
        { name: 'Ecru', color: '#E5E1D8', image: 'assets/fits/ecru-baggy.png' },
        { name: 'Raw Indigo', color: '#1B2A4A', image: 'assets/fits/baggy.png' },
      ],
    },
    {
      id: 'stacked-flare', name: 'Stacked Flare', fit: 'Bootcut', price: 2699, mrp: 4199, gsm: '410 GSM',
      wash: 'STACKED RAW', color: 'Raw Indigo', pattern: 'Selvedge', rise: 'Low', distress: 'Light', stretch: 3,
      badge: '14OZ SELVEDGE',
      image: 'assets/fits/bootcut.png',
      imageFlat: 'assets/fits/baggy.png',
      soldOut: [], sizes: [28, 30, 32, 34, 36], newest: 9,
      swatches: [
        { name: 'Stacked Indigo', color: '#274368', image: 'assets/fits/bootcut.png' },
        { name: 'Light Wash', color: '#8da9c7', image: 'assets/fits/wide-light.png' },
        { name: 'Charcoal', color: '#232427', image: 'assets/fits/straight.png' },
      ],
    },
    {
      id: 'ozone-straight', name: 'Ozone Straight-Leg', fit: 'Straight', price: 2399, mrp: 3799, gsm: '420 GSM',
      wash: 'OZONE WASH', color: 'Charcoal', pattern: 'Acid / Enzyme', rise: 'High', distress: 'None', stretch: 4,
      badge: 'BESTSELLER',
      image: 'assets/fits/straight.png',
      imageFlat: 'assets/fits/baggy.png',
      soldOut: [], sizes: [28, 30, 32, 34, 36, 38], newest: 7,
      swatches: [
        { name: 'Washed Charcoal', color: '#3d3f44', image: 'assets/fits/straight.png' },
        { name: 'Raw Indigo', color: '#1B2A4A', image: 'assets/fits/baggy.png' },
        { name: 'Ecru', color: '#E5E1D8', image: 'assets/fits/ecru-baggy.png' },
      ],
    },
    {
      id: 'ninety-bootcut', name: "90's Bootcut", fit: 'Bootcut', price: 2199, mrp: 3499, gsm: '400 GSM',
      wash: 'VINTAGE RINSE', color: 'Raw Indigo', pattern: 'Distressed', rise: 'Low', distress: 'Medium', stretch: 1,
      badge: 'BESTSELLER',
      image: 'assets/fits/bootcut.png',
      imageFlat: 'assets/fits/wide-light.png',
      soldOut: [], sizes: [28, 30, 32, 34, 36], newest: 4,
      swatches: [
        { name: 'Vintage Rinse', color: '#324b6c', image: 'assets/fits/bootcut.png' },
        { name: 'Light Wash', color: '#8da9c7', image: 'assets/fits/wide-light.png' },
        { name: 'Charcoal', color: '#232427', image: 'assets/fits/straight.png' },
      ],
    },
    {
      id: 'selvedge-wide', name: 'Selvedge Wide-Leg', fit: 'Wide-Leg', price: 2999, mrp: 4999, gsm: '480 GSM',
      wash: '14.5OZ RAW', color: 'Raw Indigo', pattern: 'Selvedge', rise: 'High', distress: 'None', stretch: 0,
      badge: '14OZ SELVEDGE',
      image: 'assets/fits/wide.png',
      imageFlat: 'assets/fits/baggy.png',
      soldOut: [28], sizes: [30, 32, 34, 36, 38], newest: 12,
      swatches: [
        { name: '14.5oz Raw', color: '#1B2A4A', image: 'assets/fits/wide.png' },
        { name: 'Charcoal', color: '#232427', image: 'assets/fits/straight.png' },
        { name: 'Light Wash', color: '#8da9c7', image: 'assets/fits/wide-light.png' },
      ],
    },
    {
      id: 'ecru-baggy', name: 'Ecru Bull-Denim Baggy', fit: 'Baggy', price: 2399, mrp: 3599, gsm: '430 GSM',
      wash: 'ECRU', color: 'Ecru', pattern: 'Solid Raw', rise: 'High', distress: 'None', stretch: 0,
      badge: 'NEW DROP',
      image: 'assets/fits/ecru-baggy.png',
      imageFlat: 'assets/fits/baggy.png',
      soldOut: [38], sizes: [28, 30, 32, 34, 36], newest: 12,
      swatches: [
        { name: 'Ecru', color: '#E5E1D8', image: 'assets/fits/ecru-baggy.png' },
        { name: 'Mid Indigo', color: '#6d87a8', image: 'assets/fits/baggy.png' },
        { name: 'Charcoal', color: '#232427', image: 'assets/fits/straight.png' },
      ],
    },
    {
      id: 'charcoal-carpenter', name: 'Charcoal Double-Knee Carpenter', fit: 'Carpenter', price: 2599, mrp: 4399, gsm: '450 GSM',
      wash: 'CHARCOAL', color: 'Charcoal', pattern: 'Solid Raw', rise: 'High', distress: 'Light', stretch: 0,
      badge: '14OZ SELVEDGE',
      image: 'assets/fits/carpenter-sand.png',
      imageFlat: 'assets/fits/carpenter.png',
      soldOut: [], sizes: [28, 30, 32, 34, 36, 38], newest: 11,
      swatches: [
        { name: 'Charcoal', color: '#232427', image: 'assets/fits/carpenter-sand.png' },
        { name: 'Mid Utility', color: '#456891', image: 'assets/fits/carpenter.png' },
        { name: 'Ecru', color: '#E5E1D8', image: 'assets/fits/ecru-baggy.png' },
      ],
    },
    {
      id: 'light-wide', name: 'Ice-Fade Wide-Leg', fit: 'Wide-Leg', price: 2149, mrp: 3399, gsm: '390 GSM',
      wash: 'LIGHT WASH', color: 'Light Wash', pattern: 'Acid / Enzyme', rise: 'High', distress: 'Light', stretch: 2,
      badge: 'BESTSELLER',
      image: 'assets/fits/wide-light.png',
      imageFlat: 'assets/fits/wide.png',
      soldOut: [28], sizes: [30, 32, 34, 36], newest: 5,
      swatches: [
        { name: 'Light Wash', color: '#8da9c7', image: 'assets/fits/wide-light.png' },
        { name: 'Raw Indigo', color: '#1B2A4A', image: 'assets/fits/wide.png' },
        { name: 'Ecru', color: '#E5E1D8', image: 'assets/fits/ecru-baggy.png' },
      ],
    },
    {
      id: 'indigo-straight', name: 'Raw Indigo Straight', fit: 'Straight', price: 2649, mrp: 4499, gsm: '420 GSM',
      wash: 'RAW INDIGO', color: 'Raw Indigo', pattern: 'Selvedge', rise: 'High', distress: 'None', stretch: 1,
      badge: '14OZ SELVEDGE',
      image: 'assets/fits/baggy.png',
      imageFlat: 'assets/fits/straight.png',
      soldOut: [], sizes: [28, 30, 32, 34, 36], newest: 10,
      swatches: [
        { name: 'Raw Indigo', color: '#1B2A4A', image: 'assets/fits/baggy.png' },
        { name: 'Washed Charcoal', color: '#3d3f44', image: 'assets/fits/straight.png' },
        { name: 'Light Wash', color: '#6b7f91', image: 'assets/lineup/fit-utility-blue.png' },
      ],
    },
  ];

  DROPS.forEach((product) => {
    const fitImage = FIT_IMAGES[product.fit];
    if (!fitImage) return;
    product.image = fitImage;
    product.imageFlat = fitImage;
    product.swatches = (product.swatches || []).map((swatch) => ({ ...swatch, image: fitImage }));
  });

  const SHOP_BY_FIT = [
    { key: 'all', title: 'All Jeans', image: 'assets/fits/baggy.png' },
    { key: 'baggy', title: 'Baggy', image: 'assets/fits/baggy.png' },
    { key: 'wide', title: 'Wide', image: 'assets/fits/wide.png' },
    { key: 'straight', title: 'Straight', image: 'assets/fits/straight.png' },
    { key: 'slim', title: 'Slim', image: 'assets/fits/slim.png' },
    { key: 'carpenter', title: 'Carpenter', image: 'assets/fits/carpenter.png' },
    { key: 'bootcut', title: 'Bootcut', image: 'assets/fits/bootcut.png' },
  ];

  // Base body measurements at W32 (inches). Other sizes scale from here.
  const FIT_MEASURE = {
    Baggy: { thigh: 27.0, knee: 24.0, legOpening: 19.5, outseam: 42.0 },
    Straight: { thigh: 23.5, knee: 19.5, legOpening: 17.0, outseam: 41.5 },
    'Wide-Leg': { thigh: 24.0, knee: 23.5, legOpening: 21.0, outseam: 42.0 },
    Carpenter: { thigh: 25.5, knee: 19.0, legOpening: 16.5, outseam: 43.0 },
    Bootcut: { thigh: 23.0, knee: 16.0, legOpening: 18.0, outseam: 42.0 },
    Slim: { thigh: 21.0, knee: 14.5, legOpening: 13.5, outseam: 41.0 },
  };

  const FILTER_PRICE_BANDS = [
    { id: 'lt2000', label: 'UNDER ₹2,000', test: (p) => p < 2000 },
    { id: '2000-2500', label: '₹2,000 – ₹2,500', test: (p) => p >= 2000 && p < 2500 },
    { id: '2500-3000', label: '₹2,500 – ₹3,000', test: (p) => p >= 2500 && p < 3000 },
    { id: '3000plus', label: '₹3,000+', test: (p) => p >= 3000 },
  ];

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

  const CROSS_SELL = {
    id: 'trucker-jacket', name: '14oz Selvedge Trucker', fit: 'Jacket', price: 2799,
    image: unsplash(IMG.cross, 400), size: 'M', meta: 'RIGID INDIGO / UNISEX',
  };

  const SIGNATURE = {
    id: 'signature-rigid', name: 'SS26 Signature Rigid', fit: 'Signature',
    price: 2399, image: 'assets/fits/wide.png',
  };

  const CATALOG = new Map();
  DROPS.forEach((d) => CATALOG.set(d.id, d));
  LOOKS.forEach((l) => CATALOG.set(`look-${l.code}`, {
    id: `look-${l.code}`, name: `Look ${l.code} — ${l.name}`, fit: l.fit,
    price: l.price, image: l.image, size: l.size,
  }));
  CATALOG.set(CROSS_SELL.id, CROSS_SELL);
  CATALOG.set(SIGNATURE.id, SIGNATURE);

  const SHIPPING_THRESHOLD = 2499;
  const CART_KEY = 'tjf-cart-v1';
  const WISHLIST_KEY = 'tjf-wishlist-v1';

  function loadWishlist() {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch { return new Set(); }
  }
  function saveWishlist() {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(Array.from(wishlist))); } catch {}
  }
  const wishlist = loadWishlist();

  /* ---------- 3. Rendering ---------- */
  let runwayItems = DROPS.slice();

  function renderFitCarousel() {
    const track = $('#fit-carousel-track');
    if (!track) return;
    track.innerHTML = SHOP_BY_FIT.map((item) => `
      <button type="button" class="fit-carousel-card ${item.key === quickCategory ? 'is-active' : ''}" data-fit-card="${item.key}" aria-pressed="${item.key === quickCategory}">
        <div class="fit-carousel-frame">
          <div class="fit-carousel-img studio-box">
            <img src="${item.image}" alt="${item.title} flat-lay denim" loading="lazy" decoding="async" />
          </div>
        </div>
        <div class="fit-carousel-copy">
          <h3>${item.title}</h3>
        </div>
      </button>
    `).join('');
  }

  function renderMidBanner() {
    const sizesHtml = ALL_SIZES.map((s) => {
      const active = filterState.size.has(String(s));
      return `<button type="button" class="mid-pill ${active ? 'is-active' : ''}" data-mid-filter="size" data-mid-value="${s}" aria-pressed="${active}">${s}</button>`;
    }).join('');
    const colorsHtml = ['Raw Indigo', 'Light Wash', 'Charcoal', 'Ecru'].map((c) => {
      const active = filterState.color.has(c);
      return `<button type="button" class="mid-pill ${active ? 'is-active' : ''}" data-mid-filter="color" data-mid-value="${c}" aria-pressed="${active}">${c}</button>`;
    }).join('');

    return `
      <aside class="mid-filter-banner" aria-label="Quick size and color filter">
        <div class="mid-banner-copy">
          <span class="mono mid-kicker">IN-STOCK QUICK FILTER</span>
          <h3>GOT ANY SIZE/COLOR?</h3>
          <p>Tap your waist size or preferred wash below to filter available SS26 drops instantly.</p>
        </div>
        <div class="mid-banner-groups">
          <div class="mid-banner-row">
            <span class="mono mid-label">SIZE</span>
            <div class="mid-pills">${sizesHtml}</div>
          </div>
          <div class="mid-banner-row">
            <span class="mono mid-label">COLOR</span>
            <div class="mid-pills">${colorsHtml}</div>
          </div>
        </div>
      </aside>`;
  }

  function renderCardHTML(d) {
    const mrp = d.mrp || Math.round((d.price * 1.5) / 100) * 100 - 1;
    const discount = Math.max(0, Math.round((1 - d.price / mrp) * 100));
    const isFav = wishlist.has(d.id);
    const swatches = d.swatches && d.swatches.length ? d.swatches : [{ name: d.wash, color: '#1B2A4A', image: d.image }];
    const visibleSwatches = swatches.slice(0, 3);
    const extraCount = swatches.length - visibleSwatches.length;

    return `
      <article class="drop-card collection-card" data-fit="${d.fit}" data-id="${d.id}" data-wash="${d.wash}" data-rise="${d.rise}" data-distress="${d.distress}" data-price="${d.price}">
        <div class="drop-media studio-box">
          <a class="drop-media-link" href="product.html?id=${d.id}" aria-label="View ${d.name} details">
            <img class="drop-img drop-img-model" src="${d.image}" alt="${d.name} flat-lay in ${d.wash.toLowerCase()} denim" loading="lazy" decoding="async" />
          </a>
        </div>

        <div class="card-swatches" role="group" aria-label="Available washes for ${d.name}">
          ${visibleSwatches.map((sw, idx) => `
            <button type="button" class="swatch-dot ${idx === 0 ? 'is-active' : ''}"
              data-swatch-img="${sw.image}" data-swatch-name="${sw.name}"
              style="--sw-color: ${sw.color};" title="${sw.name}"
              aria-label="Switch to ${sw.name}" aria-pressed="${idx === 0}"></button>
          `).join('')}
          ${extraCount > 0 ? `<span class="swatch-extra mono">+${extraCount}</span>` : ''}
          <div class="card-actions-inline">
            <button type="button" class="quick-inspect-btn" data-quick-inspect="${d.id}" aria-label="Quick inspect ${d.name}">⤢</button>
            <button type="button" class="wishlist-btn ${isFav ? 'is-saved' : ''}" data-wishlist-id="${d.id}" aria-pressed="${isFav}" aria-label="${isFav ? 'Remove from wishlist' : 'Save to wishlist'}">${isFav ? '♥' : '♡'}</button>
          </div>
        </div>

        <a class="drop-info-link" href="product.html?id=${d.id}">
          <div class="drop-info">
            <div class="drop-title-wrap">
              <h3>${d.name}</h3>
              <span class="drop-fit-tag mono">${d.fit} · ${d.wash} · ${d.gsm}</span>
            </div>
            <div class="drop-pricing-row">
              <span class="drop-price">${money(d.price)}</span>
              <span class="drop-mrp mono">${money(mrp)}</span>
              ${discount > 0 ? `<span class="drop-discount mono">${discount}% OFF</span>` : ''}
            </div>
          </div>
        </a>
      </article>`;
  }

  function renderRunway(list = runwayItems) {
    const grid = $('#collection-grid');
    if (!grid) return;
    runwayItems = list;

    const countEl = $('#collection-count');
    if (countEl) countEl.textContent = `${list.length} Item${list.length === 1 ? '' : 's'}`;

    if (!list.length) {
      grid.innerHTML = `
        <div class="runway-empty mono">
          <strong>NO FITS MATCH THOSE FILTERS.</strong>
          <span>Loosen a tag or reset to see the full SS26 collection.</span>
          <button type="button" class="btn-outline" data-filter-reset>RESET FILTERS</button>
        </div>
        ${renderMidBanner()}`;
      return;
    }

    const firstRows = list.slice(0, 8).map(renderCardHTML).join('');
    const restRows = list.slice(8).map(renderCardHTML).join('');
    grid.innerHTML = `${firstRows}${renderMidBanner()}${restRows}`;
  }

  function renderLookbook() {
    const wall = $('#lookbook-wall');
    if (!wall) return;
    const cols = [[], [], []];
    LOOKS.forEach((look, i) => cols[Math.floor(i / 3)].push(look));

    wall.innerHTML = cols.map((col) => `
      <div class="look-col">
        ${col.map((l) => `
          <figure class="look-frame ${l.ratio} img-ph">
            <img src="${l.image}" alt="Street lookbook frame ${l.code} — ${l.name}" loading="lazy" decoding="async" />
            <span class="look-index">LOOK ${l.code}</span>
            <a class="hotspot" href="product.html?id=look-${l.code}" style="top:${l.top};left:${l.left}">
              Shop this outfit
            </a>
          </figure>`).join('')}
      </div>`).join('');
  }

  /* ---------- 4. Editorial Fit Showcase & CAD Blueprint Engine ---------- */
  function renderFitSlides() {
    const host = $('#fit-editorial-media');
    if (!host) return;
    host.innerHTML = FITS.map((f, i) => `
      <img class="fit-slide ${i === 0 ? 'is-active' : ''}" data-fit-slide="${i}"
        src="${f.image}" alt="${f.name} silhouette in ${f.specs.wash.toLowerCase()} denim" loading="eager" decoding="async" />
    `).join('');
  }

  function renderCadBlueprint(p, metrics) {
    const outline = $('#cad-outline');
    if (!outline) return;
    const cx = 186;
    const top = p.top ?? 58;
    const hipY = p.hipY ?? 128;
    const kneeY = p.kneeY ?? 255;
    const ankleY = p.ankleY ?? 378;
    const { waist, hip, knee, lo, gap, crotch } = p;

    const bodyPath = [
      `M ${cx - waist / 2} ${top}`,
      `L ${cx + waist / 2} ${top}`,
      `L ${cx + hip / 2} ${hipY}`,
      `L ${cx + knee / 2} ${kneeY}`,
      `L ${cx + lo / 2} ${ankleY}`,
      `L ${cx + gap / 2} ${ankleY}`,
      `L ${cx + gap / 2} ${crotch}`,
      `L ${cx - gap / 2} ${crotch}`,
      `L ${cx - gap / 2} ${ankleY}`,
      `L ${cx - lo / 2} ${ankleY}`,
      `L ${cx - knee / 2} ${kneeY}`,
      `L ${cx - hip / 2} ${hipY}`,
      'Z',
    ].join(' ');

    // Seam allowance outer halo (+6px offset approximation)
    const pad = 6;
    const seamPath = [
      `M ${cx - waist / 2 - pad} ${top - 2}`,
      `L ${cx + waist / 2 + pad} ${top - 2}`,
      `L ${cx + hip / 2 + pad} ${hipY}`,
      `L ${cx + knee / 2 + pad} ${kneeY}`,
      `L ${cx + lo / 2 + pad} ${ankleY + 4}`,
      `L ${cx + gap / 2 - 3} ${ankleY + 4}`,
      `L ${cx + gap / 2 - 3} ${crotch - 4}`,
      `L ${cx - gap / 2 + 3} ${crotch - 4}`,
      `L ${cx - gap / 2 + 3} ${ankleY + 4}`,
      `L ${cx - lo / 2 - pad} ${ankleY + 4}`,
      `L ${cx - knee / 2 - pad} ${kneeY}`,
      `L ${cx - hip / 2 - pad} ${hipY}`,
      'Z',
    ].join(' ');

    outline.setAttribute('d', bodyPath);
    $('#cad-seam-allow')?.setAttribute('d', seamPath);

    const wb = $('#cad-waistband');
    if (wb) {
      wb.setAttribute('x', cx - waist / 2);
      wb.setAttribute('y', top - 16);
      wb.setAttribute('width', waist);
      wb.setAttribute('height', 16);
    }

    const legMidL = cx - (hip + lo) / 4;
    const legMidR = cx + (hip + lo) / 4;
    $('#cad-center-crease')?.setAttribute('d',
      `M ${cx - waist * 0.25} ${top + 14} L ${legMidL} ${ankleY - 8} ` +
      `M ${cx + waist * 0.25} ${top + 14} L ${legMidR} ${ankleY - 8}`);

    $('#cad-fly-pockets')?.setAttribute('d',
      `M ${cx} ${top} L ${cx} ${crotch - 26} Q ${cx + 12} ${crotch - 14} ${cx + 2} ${crotch - 4} ` +
      `M ${cx - waist * 0.42} ${top + 18} Q ${cx - waist * 0.28} ${top + 52} ${cx - waist * 0.08} ${top + 74} ` +
      `M ${cx + waist * 0.42} ${top + 18} Q ${cx + waist * 0.28} ${top + 52} ${cx + waist * 0.08} ${top + 74}`);

    const rL = $('#cad-rivet-l');
    const rR = $('#cad-rivet-r');
    if (rL) { rL.setAttribute('cx', cx - waist * 0.36); rL.setAttribute('cy', top + 14); }
    if (rR) { rR.setAttribute('cx', cx + waist * 0.36); rR.setAttribute('cy', top + 14); }

    const ykkLine = $('#cad-ykk-leader');
    const ykkText = $('#cad-ykk-text');
    if (ykkLine && ykkText) {
      const yMid = (top + crotch) * 0.52;
      ykkLine.setAttribute('x1', cx + 4);
      ykkLine.setAttribute('y1', yMid);
      ykkLine.setAttribute('x2', cx + hip * 0.56);
      ykkLine.setAttribute('y2', yMid - 18);
      ykkText.setAttribute('x', cx + hip * 0.56 + 4);
      ykkText.setAttribute('y', yMid - 16);
    }

    // Helper for crisp CAD laser dimension lines
    const setLine = (id, x1, y1, x2, y2) => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('x1', x1); el.setAttribute('y1', y1);
      el.setAttribute('x2', x2); el.setAttribute('y2', y2);
    };

    // 1. WAIST dimension (top)
    const wy = top - 28;
    setLine('#dim-waist-line', cx - waist / 2, wy, cx + waist / 2, wy);
    setLine('#dim-waist-cap-l', cx - waist / 2, wy - 5, cx - waist / 2, wy + 5);
    setLine('#dim-waist-cap-r', cx + waist / 2, wy - 5, cx + waist / 2, wy + 5);

    // 2. THIGH dimension (left leg upper thigh)
    const ty = (hipY + crotch) * 0.54;
    const thighOuter = cx - (hip * 0.48);
    const thighInner = cx - gap / 2;
    setLine('#dim-thigh-line', thighOuter, ty, thighInner, ty);
    setLine('#dim-thigh-cap-l', thighOuter, ty - 5, thighOuter, ty + 5);
    setLine('#dim-thigh-cap-r', thighInner, ty - 5, thighInner, ty + 5);

    // 3. INSEAM dimension (vertical inner leg)
    const ix = cx;
    setLine('#dim-inseam-line', ix, crotch, ix, ankleY);
    setLine('#dim-inseam-cap-t', ix - 5, crotch, ix + 5, crotch);
    setLine('#dim-inseam-cap-b', ix - 5, ankleY, ix + 5, ankleY);

    // 4. OUTSEAM dimension (vertical outer right)
    const ox = Math.min(340, cx + Math.max(hip, lo) / 2 + 24);
    setLine('#dim-outseam-line', ox, top - 16, ox, ankleY);
    setLine('#dim-outseam-cap-t', ox - 5, top - 16, ox + 5, top - 16);
    setLine('#dim-outseam-cap-b', ox - 5, ankleY, ox + 5, ankleY);

    // Update dimension badges
    if (metrics) {
      const setTxt = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt; };
      setTxt('#cad-r-waist', `WAIST ${metrics.waist}"`);
      setTxt('#cad-r-thigh', `THIGH ${metrics.thigh.toFixed(1)}"`);
      setTxt('#cad-r-inseam', `INSEAM ${metrics.inseam.toFixed(1)}"`);
      setTxt('#cad-r-outseam', `OUTSEAM ${metrics.outseam.toFixed(1)}"`);
    }
  }

  renderFitSlides();

  /* ---------- 5. Scroll choreography ---------- */
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const canAnimate = hasGsap && !reducedMotion;
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  let lenis = null;
  if (window.Lenis && !reducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    window.__lenis = lenis;
  }

  // Scroll progress + auto-hiding nav
  const progressFill = $('#scroll-progress-fill');
  const nav = $('#nav');

  function handleScroll(y) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, y / max) : 0;
    if (progressFill) progressFill.style.transform = `scaleX(${p})`;
  }

  if (lenis) {
    lenis.on('scroll', ({ scroll }) => handleScroll(scroll));
  }
  window.addEventListener('scroll', () => {
    if (!lenis) handleScroll(window.scrollY);
  }, { passive: true });

  function scrollToTarget(target, offsetOverride) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const isTop = el.id === 'hero' || el.id === 'top';
    const offset = offsetOverride ?? (isTop ? 0 : -(nav ? nav.offsetHeight : 70) + 2);
    if (lenis) {
      lenis.scrollTo(el, { offset, duration: 1.25 });
    } else {
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }

  function initHero() {
    if (!canAnimate) return;
    const hero = $('.hero');
    if (!hero) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 },
    });
    tl.to('.hero-line.l1', { yPercent: -130, xPercent: -6, ease: 'none' }, 0)
      .to('.hero-line.l2', { yPercent: -32, xPercent: -2, ease: 'none' }, 0)
      .to('.hero-line.l3', { yPercent: 132, xPercent: 6, ease: 'none' }, 0)
      .to('.hero-line.l2 span, .hero-line.l3 span', { letterSpacing: '0.07em', ease: 'none' }, 0)
      .to('#hero-veil', { opacity: 0.12, ease: 'none' }, 0)
      .to('.hero-bg-video', { yPercent: -7, scale: 1.08, ease: 'none' }, 0)
      .to('.hero-meta, .hero-cta, .hero-scroll', { opacity: 0, y: -18, ease: 'none' }, 0.25);
  }

  /* ---------- 6. Interactions ---------- */
  let currentFit = 0;

  const FIT_TO_PRODUCT = {
    'Baggy': 'acid-baggy',
    'Straight': 'ozone-straight',
    'Wide-Leg': 'dirty-wide',
    'Carpenter': 'distressed-carpenter',
    'Bootcut': 'stacked-flare',
    'Slim': 'raw-slim',
  };

  function setFitUI(i, animate = true) {
    const f = FITS[i];
    if (!f) return;
    currentFit = i;
    const nameEl = $('#fit-name');
    const descEl = $('#fit-desc');
    nameEl.textContent = f.name;
    descEl.textContent = f.desc;
    $('#spec-leg').textContent = f.specs.leg;
    $('#spec-rise').textContent = f.specs.rise;
    $('#spec-gsm').textContent = f.specs.gsm;
    $('#spec-wash').textContent = f.specs.wash;
    $('#fit-current').textContent = pad2(i + 1);
    $$('.fit-dot').forEach((d, idx) => d.classList.toggle('is-active', idx === i));

    // Dynamic giant watermark word
    const ghostEl = $('#fit-ghost');
    if (ghostEl) ghostEl.textContent = f.ghost || f.name.toUpperCase();

    // Crossfade editorial denim showcase
    $$('.fit-slide').forEach((img, idx) => img.classList.toggle('is-active', idx === i));

    // Translucent Tailor Blueprint HUD update
    const hudCode = $('#fit-hud-code');
    if (hudCode) hudCode.textContent = `SILHOUETTE ${pad2(i + 1)} // ${f.code}`;
    const riseVal = $('#hud-rise-val');
    const kneeVal = $('#hud-knee-val');
    const hemVal = $('#hud-hem-val');
    if (riseVal) riseVal.textContent = f.specs.rise;
    if (kneeVal) kneeVal.textContent = f.specs.knee;
    if (hemVal) hemVal.textContent = f.specs.leg;

    if (f.hud) {
      const setHudPos = (id, y, x) => {
        const el = $(id);
        if (!el) return;
        el.style.setProperty('--hud-y', `${y}%`);
        el.style.setProperty('--hud-x', `${x}%`);
      };
      setHudPos('#hud-rise', f.hud.riseY, f.hud.riseX);
      setHudPos('#hud-knee', f.hud.kneeY, f.hud.kneeX);
      setHudPos('#hud-hem', f.hud.hemY, f.hud.hemX);
    }

    const shopLink = $('#fit-shop-link');
    if (shopLink) shopLink.href = `product.html?id=${FIT_TO_PRODUCT[f.name] || 'acid-baggy'}`;
    if (hasGsap && animate && !reducedMotion) {
      gsap.fromTo([nameEl, descEl], { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, overwrite: true, ease: 'power3.out' });
      gsap.fromTo('.specs dd', { opacity: 0.2 },
        { opacity: 1, duration: 0.35, stagger: 0.04, overwrite: true });
      if (ghostEl) {
        gsap.fromTo(ghostEl, { opacity: 0.015, scale: 0.96 },
          { opacity: 0.045, scale: 1, duration: 0.55, overwrite: true, ease: 'power2.out' });
      }
    }
  }

  let fitScrollTrigger = null;

  function initFits() {
    const section = $('.fits');
    if (!section) return;
    setFitUI(0, false);

    if (!canAnimate) {
      $$('.fit-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
          setFitUI(Number(dot.dataset.fitIndex));
        });
      });
      return;
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * 4.2),
      pin: true,
      scrub: 0.65,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const idx = Math.min(
          FITS.length - 1,
          Math.max(0, Math.floor(self.progress * FITS.length))
        );
        if (idx !== currentFit) setFitUI(idx);
      },
    });

    fitScrollTrigger = st;

    $$('.fit-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const i = Number(dot.dataset.fitIndex);
        const span = Math.max(1, st.end - st.start - 4);
        const y = st.start + (i / (FITS.length - 1)) * span;
        if (lenis) lenis.scrollTo(y, { duration: 1.0 });
        else window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  // ---------- Catalogue filter engine ----------
  const filterState = {
    fit: new Set(),
    size: new Set(),
    pattern: new Set(),
    color: new Set(),
    discount: new Set(),
    wash: new Set(),
    rise: new Set(),
    distress: new Set(),
    price: new Set(),
  };

  let quickCategory = 'all';
  let sortMode = 'featured';
  let activeFfyTab = 'style';

  const QUICK_CAT_LABELS = {
    all: 'ALL JEANS',
    baggy: 'BAGGY',
    wide: 'WIDE',
    straight: 'STRAIGHT',
    slim: 'SLIM',
    carpenter: 'CARPENTER',
    bootcut: 'BOOTCUT',
  };
  const QUICK_CAT_TESTS = {
    all: () => true,
    baggy: (d) => d.fit === 'Baggy',
    wide: (d) => d.fit === 'Wide-Leg',
    straight: (d) => d.fit === 'Straight',
    slim: (d) => d.fit === 'Slim',
    carpenter: (d) => d.fit === 'Carpenter',
    bootcut: (d) => d.fit === 'Bootcut' || /flare/i.test(d.name),
  };

  const FFY_TABS = {
    style: { group: 'fit', values: ['Baggy', 'Wide-Leg', 'Straight', 'Slim', 'Carpenter', 'Bootcut'] },
    size: { group: 'size', values: ['28', '30', '32', '34', '36', '38'] },
    pattern: { group: 'pattern', values: ['Solid Raw', 'Acid / Enzyme', 'Distressed', 'Selvedge'] },
    color: { group: 'color', values: ['Raw Indigo', 'Light Wash', 'Charcoal', 'Ecru'] },
    discount: { group: 'discount', values: ['30% - 40%', '40%+'] },
  };

  const uniqueBy = (arr) => Array.from(new Set(arr));

  function buildFilterGroups() {
    return [
      { key: 'fit', title: 'STYLE / FIT', values: uniqueBy(DROPS.map((d) => d.fit)) },
      { key: 'size', title: 'SIZE', values: ALL_SIZES.map(String) },
      { key: 'color', title: 'COLOR / WASH', values: ['Raw Indigo', 'Light Wash', 'Charcoal', 'Ecru'] },
      { key: 'pattern', title: 'PATTERN / FINISH', values: ['Solid Raw', 'Acid / Enzyme', 'Distressed', 'Selvedge'] },
      { key: 'discount', title: 'DISCOUNT', values: ['30% - 40%', '40%+'] },
      { key: 'rise', title: 'RISE', values: ['High', 'Mid', 'Low'] },
      { key: 'price', title: 'PRICE (₹)', values: FILTER_PRICE_BANDS },
    ];
  }

  function renderFilterForYouChips() {
    const host = $('#ffy-chips');
    if (!host) return;
    const cfg = FFY_TABS[activeFfyTab] || FFY_TABS.style;
    host.innerHTML = cfg.values.map((val) => {
      const active = filterState[cfg.group].has(val);
      return `<button type="button" class="ffy-chip ${active ? 'is-active' : ''}" data-ffy-group="${cfg.group}" data-ffy-value="${val}" aria-pressed="${active}">${val}</button>`;
    }).join('');
  }

  function renderFilterChips() {
    const host = $('#filter-groups');
    if (!host) return;
    host.innerHTML = buildFilterGroups().map((group) => `
      <section class="filter-group" data-filter-group="${group.key}">
        <div class="filter-group-head mono">
          <h3>${group.title}</h3>
          <button type="button" class="filter-group-clear" data-filter-group-clear="${group.key}">CLEAR</button>
        </div>
        <div class="filter-chips">
          ${group.values.map((v) => {
            const id = typeof v === 'string' ? v : v.id;
            const label = typeof v === 'string' ? v : v.label;
            return `<button type="button" class="filter-chip" data-filter-group="${group.key}" data-filter-value="${id}">${label}</button>`;
          }).join('')}
        </div>
      </section>`).join('');
    syncFilterChips();
  }

  function syncFilterChips() {
    $$('.filter-chip').forEach((chip) => {
      const { filterGroup, filterValue } = chip.dataset;
      const set = filterState[filterGroup];
      const on = !!(set && set.has(filterValue));
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $$('[data-filter-group-clear]').forEach((btn) => {
      const key = btn.dataset.filterGroupClear;
      btn.classList.toggle('is-visible', !!(filterState[key] && filterState[key].size > 0));
    });
    $$('.fit-carousel-card[data-fit-card]').forEach((card) => {
      const active = card.dataset.fitCard === quickCategory;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    $$('.ffy-tab[data-ffy-tab]').forEach((tab) => {
      const active = tab.dataset.ffyTab === activeFfyTab;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    renderFilterForYouChips();
  }

  function activeFilterCount() {
    return Object.values(filterState).reduce((sum, set) => sum + set.size, 0);
  }

  function productMatches(d) {
    const catTest = QUICK_CAT_TESTS[quickCategory] || QUICK_CAT_TESTS.all;
    if (!catTest(d)) return false;
    if (filterState.fit.size && !filterState.fit.has(d.fit)) return false;
    if (filterState.size.size) {
      const avail = (d.sizes || SIZES).map(String);
      if (!avail.some((s) => filterState.size.has(s))) return false;
    }
    if (filterState.pattern.size && !filterState.pattern.has(d.pattern)) return false;
    if (filterState.color.size && !filterState.color.has(d.color)) return false;
    if (filterState.discount.size) {
      const mrp = d.mrp || Math.round((d.price * 1.5) / 100) * 100 - 1;
      const pct = Math.round((1 - d.price / mrp) * 100);
      const match = Array.from(filterState.discount).some((band) => {
        if (band === '30% - 40%') return pct >= 30 && pct < 40;
        if (band === '40%+') return pct >= 40;
        return false;
      });
      if (!match) return false;
    }
    if (filterState.wash.size && !filterState.wash.has(d.wash)) return false;
    if (filterState.rise.size && !filterState.rise.has(d.rise)) return false;
    if (filterState.distress.size && !filterState.distress.has(d.distress)) return false;
    if (filterState.price.size) {
      const bands = FILTER_PRICE_BANDS.filter((b) => filterState.price.has(b.id));
      if (!bands.some((b) => b.test(d.price))) return false;
    }
    return true;
  }

  function sortDrops(list) {
    const arr = list.slice();
    if (sortMode === 'price-asc') return arr.sort((a, b) => a.price - b.price);
    if (sortMode === 'price-desc') return arr.sort((a, b) => b.price - a.price);
    if (sortMode === 'newest') return arr.sort((a, b) => (b.newest || 0) - (a.newest || 0));
    return arr;
  }

  let reflowTimer = null;
  function applyFilters({ animate = true } = {}) {
    const filtered = sortDrops(DROPS.filter(productMatches));
    renderRunway(filtered);

    const count = activeFilterCount();
    const hasQuickCat = quickCategory !== 'all';
    const resultCount = $('#filter-result-count');
    if (resultCount) resultCount.textContent = pad2(filtered.length);
    const totalCount = $('#filter-total');
    if (totalCount) totalCount.textContent = pad2(DROPS.length);
    const badge = $('#filter-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('is-on', count > 0);
    }

    const bar = $('#runway-filter');
    const nameEl = $('#runway-filter-name');
    if (bar) bar.hidden = count === 0 && !hasQuickCat;
    if (nameEl) {
      const parts = [];
      if (hasQuickCat) parts.push(QUICK_CAT_LABELS[quickCategory] || quickCategory.toUpperCase());
      if (count > 0) parts.push(`${count} FILTER${count > 1 ? 'S' : ''}`);
      nameEl.textContent = parts.length ? `${parts.join(' + ')}` : '';
    }

    syncFilterChips();

    if (hasGsap && animate && !reducedMotion && filtered.length) {
      gsap.fromTo('.collection-card', { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, ease: 'power2.out', overwrite: true, clearProps: 'opacity,transform' });
    }

    clearTimeout(reflowTimer);
    if (hasGsap) {
      reflowTimer = setTimeout(() => ScrollTrigger.refresh(), 120);
    }
  }

  function resetFilters({ silent = false } = {}) {
    quickCategory = 'all';
    sortMode = 'featured';
    const sortEl = $('#collection-sort');
    if (sortEl) sortEl.value = 'featured';
    Object.values(filterState).forEach((set) => set.clear());
    applyFilters({ animate: !prefersLessMotion() });
    if (!silent) toast('FILTERS RESET — FULL SS26 COLLECTION');
  }

  function prefersLessMotion() {
    return reducedMotion;
  }

  function applyFilter(name) {
    quickCategory = 'all';
    Object.values(filterState).forEach((set) => set.clear());
    if (name) filterState.fit.add(name);
    applyFilters();
  }

  function initFilter() {
    renderFitCarousel();
    renderFilterChips();

    const explore = $('#explore-fit');
    if (explore) {
      explore.addEventListener('click', () => {
        const name = FITS[currentFit].name;
        applyFilter(name);
        scrollToTarget('#drops');
        toast(`SHOWING ${name.toUpperCase()} FITS`);
      });
    }

    const clear = $('#clear-filter');
    if (clear) clear.addEventListener('click', () => resetFilters());

    $$('[data-open-filter]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.preventDefault();
      openFilter();
    }));
    $$('[data-close-filter]').forEach((el) => el.addEventListener('click', closeFilter));

    const applyBtn = $('#filter-apply');
    if (applyBtn) applyBtn.addEventListener('click', () => {
      closeFilter();
      scrollToTarget('#collection-grid');
    });
    const resetBtn = $('#filter-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => resetFilters());

    // Drawer chips
    const groups = $('#filter-groups');
    if (groups) {
      groups.addEventListener('click', (e) => {
        const clearGroup = e.target.closest('[data-filter-group-clear]');
        if (clearGroup) {
          filterState[clearGroup.dataset.filterGroupClear].clear();
          applyFilters();
          return;
        }
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        const { filterGroup, filterValue } = chip.dataset;
        const set = filterState[filterGroup];
        if (set.has(filterValue)) set.delete(filterValue);
        else set.add(filterValue);
        applyFilters();
      });
    }

    // Shop By Fit carousel click + left/right arrows
    const fitTrack = $('#fit-carousel-track');
    if (fitTrack) {
      fitTrack.addEventListener('click', (e) => {
        const card = e.target.closest('.fit-carousel-card[data-fit-card]');
        if (!card) return;
        const key = card.dataset.fitCard;
        quickCategory = (key === quickCategory && key !== 'all') ? 'all' : key;
        if (key === 'all') Object.values(filterState).forEach((set) => set.clear());
        applyFilters();
      });
    }
    const prevArrow = $('#fit-carousel-prev');
    const nextArrow = $('#fit-carousel-next');
    if (fitTrack && prevArrow && nextArrow) {
      const step = () => Math.max(260, Math.round(fitTrack.clientWidth * 0.65));
      prevArrow.addEventListener('click', () => fitTrack.scrollBy({ left: -step(), behavior: 'smooth' }));
      nextArrow.addEventListener('click', () => fitTrack.scrollBy({ left: step(), behavior: 'smooth' }));
    }

    // Sort dropdown
    const sortEl = $('#collection-sort');
    if (sortEl) {
      sortEl.addEventListener('change', () => {
        sortMode = sortEl.value;
        applyFilters();
      });
    }

    // Filter For You tabs & chips
    const ffyTabs = $('#ffy-tabs');
    if (ffyTabs) {
      ffyTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.ffy-tab[data-ffy-tab]');
        if (!tab) return;
        activeFfyTab = tab.dataset.ffyTab;
        syncFilterChips();
      });
    }
    const ffyChips = $('#ffy-chips');
    if (ffyChips) {
      ffyChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.ffy-chip[data-ffy-group]');
        if (!chip) return;
        const { ffyGroup, ffyValue } = chip.dataset;
        const set = filterState[ffyGroup];
        if (set.has(ffyValue)) set.delete(ffyValue);
        else set.add(ffyValue);
        applyFilters();
      });
    }

    // Grid interactions: mid-grid banner pills, swatch swap, wishlist heart, quick inspect, empty reset
    const grid = $('#collection-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        if (e.target.closest('[data-filter-reset]')) {
          resetFilters();
          return;
        }
        const midPill = e.target.closest('[data-mid-filter]');
        if (midPill) {
          const group = midPill.dataset.midFilter;
          const val = midPill.dataset.midValue;
          const set = filterState[group];
          if (set.has(val)) set.delete(val);
          else set.add(val);
          applyFilters();
          return;
        }
        const wishBtn = e.target.closest('[data-wishlist-id]');
        if (wishBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = wishBtn.dataset.wishlistId;
          if (wishlist.has(id)) {
            wishlist.delete(id);
            toast('REMOVED FROM WISHLIST');
          } else {
            wishlist.add(id);
            toast('SAVED TO WISHLIST ♥');
          }
          saveWishlist();
          const saved = wishlist.has(id);
          wishBtn.classList.toggle('is-saved', saved);
          wishBtn.setAttribute('aria-pressed', saved ? 'true' : 'false');
          wishBtn.textContent = saved ? '♥' : '♡';
          return;
        }
        const inspectBtn = e.target.closest('[data-quick-inspect]');
        if (inspectBtn) {
          e.preventDefault();
          e.stopPropagation();
          openProduct(inspectBtn.dataset.quickInspect);
          return;
        }
        const swatchBtn = e.target.closest('.swatch-dot[data-swatch-img]');
        if (swatchBtn) {
          e.preventDefault();
          e.stopPropagation();
          const card = swatchBtn.closest('.collection-card');
          if (!card) return;
          const img = $('.drop-img-model', card);
          const washLabel = $('.card-wash-name', card);
          if (img) {
            img.classList.remove('is-broken');
            img.src = swatchBtn.dataset.swatchImg;
          }
          if (washLabel) washLabel.textContent = swatchBtn.dataset.swatchName.toUpperCase();
          $$('.swatch-dot', card).forEach((s) => {
            const on = s === swatchBtn;
            s.classList.toggle('is-active', on);
            s.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
        }
      });
    }
  }

  function initViewToggle() {
    // View toggle replaced by Shop By Fit + Swatches; kept safe no-op if elements absent.
  }

  const CRAFT_HOTSPOTS = [
    {
      num: '01 / SELVEDGE WEAVE',
      title: '14OZ RING-SPUN SELVEDGE',
      desc: '3x1 right-hand twill milled on slow shuttle looms. Unsanforized slub yarn engineered to mold to your stride over years of wear.',
      weight: '14OZ / 450 GSM',
      stitch: '11 SPI · LOCKSTITCH',
      hardware: 'YKK JAPAN BRASS',
      water: '78% WATER SAVED',
      gsm: 450,
      meters: { weight: 88, stitch: 68, hardware: 84, water: 78 },
      x: 28,
      y: 32,
      scale: 1.28,
      img: 'https://images.pexels.com/photos/34851014/pexels-photo-34851014.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
    {
      num: '02 / STRESS STITCHING',
      title: 'BAR-TACK STRESS STITCHING',
      desc: '42-stitch reinforced bar-tacks lock every pocket corner, belt loop, and fly junction under high-tension daily load.',
      weight: '14OZ / 450 GSM',
      stitch: '42-POINT BAR-TACK',
      hardware: 'COATS CORE-SPUN',
      water: '78% WATER SAVED',
      gsm: 450,
      meters: { weight: 88, stitch: 92, hardware: 72, water: 78 },
      x: 66,
      y: 36,
      scale: 1.38,
      img: 'https://images.pexels.com/photos/10133277/pexels-photo-10133277.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
    {
      num: '03 / SOLID HARDWARE',
      title: 'CUSTOM ENGRAVED COPPER RIVETS',
      desc: 'Torque-tested solid brass burrs and copper rivets stamped from custom dies with signature safety-orange enamel detailing.',
      weight: '14OZ / 450 GSM',
      stitch: '11 SPI · DOUBLE CHAIN',
      hardware: 'CUSTOM COPPER RIVETS',
      water: '78% WATER SAVED',
      gsm: 450,
      meters: { weight: 88, stitch: 78, hardware: 96, water: 78 },
      x: 36,
      y: 68,
      scale: 1.42,
      img: 'https://images.pexels.com/photos/13976002/pexels-photo-13976002.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
    {
      num: '04 / OZONE FINISHING',
      title: 'LOW-WATER ECO-OZONE WASH',
      desc: 'Precision laser mapping and ozone gas curing replace stone dust and harsh bleach — preserving tensile grain with 78% less water.',
      weight: '14OZ / 410 GSM',
      stitch: '11 SPI · ZERO BLEACH',
      hardware: 'LASER + OZONE FINISH',
      water: '78% WATER SAVED',
      gsm: 410,
      meters: { weight: 82, stitch: 68, hardware: 86, water: 94 },
      x: 72,
      y: 70,
      scale: 1.34,
      img: 'https://images.pexels.com/photos/7794358/pexels-photo-7794358.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
  ];

  let activeCraftStep = 0;
  let craftScrollTrigger = null;

  function craftLayerTransform(step) {
    const tx = ((50 - step.x) * 0.34).toFixed(2);
    const ty = ((50 - step.y) * 0.34).toFixed(2);
    return `translate(${tx}%, ${ty}%) scale(${step.scale})`;
  }

  function animateCraftMetric(selector, value) {
    const el = $(selector);
    if (!el) return;
    const target = String(value);
    const numbers = target.match(/\d+(?:\.\d+)?/g);
    if (!numbers) { el.textContent = target; return; }
    if (el._craftCountFrame) cancelAnimationFrame(el._craftCountFrame);
    const targets = numbers.map(Number);
    const start = performance.now();
    const duration = 620;
    const draw = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      let index = 0;
      el.textContent = target.replace(/\d+(?:\.\d+)?/g, () => String(Math.round(targets[index++] * eased)));
      if (progress < 1) el._craftCountFrame = requestAnimationFrame(draw);
      else el._craftCountFrame = 0;
    };
    el._craftCountFrame = requestAnimationFrame(draw);
  }

  function animateCraftMeters(step) {
    Object.entries(step.meters).forEach(([key, target]) => {
      const bar = $(`#craft-meter-${key}`);
      if (!bar) return;
      if (bar._craftFillFrame) cancelAnimationFrame(bar._craftFillFrame);
      bar.style.width = '0%';
      bar._craftFillFrame = requestAnimationFrame(() => {
        bar.style.width = `${target}%`;
        bar._craftFillFrame = 0;
      });
    });
  }

  function setCraftStep(idx) {
    const step = CRAFT_HOTSPOTS[idx];
    if (!step) return;
    const changed = idx !== activeCraftStep;
    activeCraftStep = idx;

    const setText = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
    setText('#craft-spec-num', step.num);
    setText('#craft-spec-title', step.title);
    setText('#craft-spec-desc', step.desc);
    animateCraftMetric('#craft-m-weight', step.weight);
    animateCraftMetric('#craft-m-stitch', step.stitch);
    animateCraftMetric('#craft-m-hardware', step.hardware);
    animateCraftMetric('#craft-m-water', step.water);
    animateCraftMeters(step);
    setText('#craft-zoom-tag', `ZOOM ${step.scale.toFixed(2)}× · SCAN ACTIVE`);
    setText('#craft-hud-coord', `X: ${step.x}% · Y: ${step.y}%`);
    setText('#craft-hud-active', `${pad2(idx + 1)}. ${step.title}`);
    setText('#craft-progress-current', `${pad2(idx + 1)} / 04`);
    updateCraftRail((idx + 1) / CRAFT_HOTSPOTS.length);
    $$('.craft-hotspot-image[data-craft-image]').forEach((photo, imageIndex) => {
      const active = imageIndex === idx;
      const imageUrl = CRAFT_HOTSPOTS[imageIndex] && CRAFT_HOTSPOTS[imageIndex].img;
      if (imageUrl && photo.getAttribute('src') !== imageUrl) photo.setAttribute('src', imageUrl);
      photo.classList.toggle('is-active', active);
      photo.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    const layer = $('#craft-macro-layer');
    if (layer) {
      layer.style.setProperty('--craft-scale', String(step.scale));
      layer.style.transform = craftLayerTransform(step);
    }
    if (changed) {
      const stage = $('#craft-stage');
      if (stage) {
        stage.classList.remove('is-scanning');
        void stage.offsetWidth;
        stage.classList.add('is-scanning');
      }
    }

    $$('.craft-tab[data-craft-step]').forEach((tab) => {
      const active = Number(tab.dataset.craftStep) === idx;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    $$('.craft-pin-btn[data-craft-step]').forEach((pin) => {
      const active = Number(pin.dataset.craftStep) === idx;
      pin.classList.toggle('is-active', active);
      pin.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function updateCraftRail(progress) {
    const fill = $('#craft-progress-fill');
    if (fill) fill.style.height = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }

  function initCraftCompare() {
    const stage = $('#craft-compare-stage');
    const range = $('#craft-compare-range');
    const before = $('#craft-compare-before');
    const handle = $('#craft-compare-handle');
    const valEl = $('#craft-compare-val');
    if (!stage || !range || !before || !handle) return;

    const update = (v) => {
      const pct = Math.max(5, Math.min(95, Number(v)));
      before.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle.style.left = `${pct}%`;
      if (valEl) valEl.textContent = `${Math.round(pct)}% RAW / ${Math.round(100 - pct)}% WASH`;
    };

    update(range.value);
    range.addEventListener('input', () => update(range.value));
    const updateFromPointer = (event) => {
      const bounds = stage.getBoundingClientRect();
      if (!bounds.width) return;
      const pct = 5 + Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * 90;
      range.value = String(pct);
      update(pct);
    };
    stage.addEventListener('pointerdown', updateFromPointer);
    stage.addEventListener('pointermove', (event) => {
      if (event.buttons) updateFromPointer(event);
    });
  }

  function initCraft() {
    setCraftStep(0);
    initCraftCompare();
    const section = $('.craft');
    if (!section) return;
    const activateStep = (idx) => {
      if (craftScrollTrigger && canAnimate && window.innerWidth > 1000) {
        const st = craftScrollTrigger;
        const span = Math.max(1, st.end - st.start - 4);
        const targetY = st.start + (idx / (CRAFT_HOTSPOTS.length - 1)) * span;
        if (lenis) lenis.scrollTo(targetY, { duration: 0.9 });
        else window.scrollTo({ top: targetY, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
      setCraftStep(idx);
    };

    $$('[data-craft-step]').forEach((btn) => {
      btn.addEventListener('click', () => activateStep(Number(btn.dataset.craftStep)));
      btn.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'touch') setCraftStep(Number(btn.dataset.craftStep));
      });
      btn.addEventListener('focus', () => setCraftStep(Number(btn.dataset.craftStep)));
    });

    let craftScrollFrame = 0;
    const updateCraftFromScroll = () => {
      if (canAnimate && window.innerWidth > 1000) return;
      if (craftScrollFrame) return;
      craftScrollFrame = requestAnimationFrame(() => {
        craftScrollFrame = 0;
        const bounds = section.getBoundingClientRect();
        const travel = Math.max(1, bounds.height + window.innerHeight);
        const progress = Math.max(0, Math.min(1, (window.innerHeight - bounds.top) / travel));
        const idx = Math.min(CRAFT_HOTSPOTS.length - 1, Math.floor(progress * CRAFT_HOTSPOTS.length));
        if (idx !== activeCraftStep) setCraftStep(idx);
        updateCraftRail(progress);
      });
    };
    window.addEventListener('scroll', updateCraftFromScroll, { passive: true });
    window.addEventListener('resize', updateCraftFromScroll, { passive: true });
    updateCraftFromScroll();

    if (!canAnimate) return;
    const pinEntries = $$('.pin-entry');
    gsap.fromTo(pinEntries, { autoAlpha: 0, y: 26, scale: 0.72 }, {
      autoAlpha: 1, y: 0, scale: 1,
      duration: 1.05,
      stagger: 0.14,
      ease: 'elastic.out(1, 0.62)',
      scrollTrigger: { trigger: section, start: 'top 72%', once: true },
    });
    $$('.pin-parallax').forEach((pin, index) => {
      const drift = [22, -18, 16, -24][index] || 18;
      gsap.to(pin, {
        y: drift,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      });
    });
    const mm = gsap.matchMedia();

    mm.add('(min-width: 1001px)', () => {
      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=200%',
        pin: true,
        scrub: 0.7,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const idx = Math.min(
            CRAFT_HOTSPOTS.length - 1,
            Math.max(0, Math.floor(self.progress * CRAFT_HOTSPOTS.length))
          );
          if (idx !== activeCraftStep) setCraftStep(idx);
          updateCraftRail(self.progress);
        },
      });
      craftScrollTrigger = st;
      return () => { craftScrollTrigger = null; };
    });
  }

  function initRunway() {
    // Collection grid flows naturally as a 3-column editorial section (no pinned runway).
  }

  function initFinderParallax() {
    if (!canAnimate) return;
    gsap.matchMedia().add('(min-width: 901px)', () => {
      gsap.fromTo('.finder-left', { y: 26 }, {
        y: -26, ease: 'none',
        scrollTrigger: { trigger: '.finder', start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
      gsap.fromTo('.finder-right', { y: -18 }, {
        y: 30, ease: 'none',
        scrollTrigger: { trigger: '.finder', start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    });
  }

  function initLookbookParallax() {
    if (!canAnimate) return;
    const cols = $$('.look-col');
    const speeds = [
      { from: 5, to: -11 },
      { from: -7, to: 7 },
      { from: 3, to: -15 },
    ];
    gsap.matchMedia().add('(min-width: 901px)', () => {
      cols.forEach((col, i) => {
        const s = speeds[i] || speeds[0];
        gsap.fromTo(col, { yPercent: s.from }, {
          yPercent: s.to, ease: 'none',
          scrollTrigger: { trigger: '.lookbook', start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
      });
    });
  }

  function initFactoryTimeline() {
    const section = $('#factory');
    if (!section) return;
    const steps = $$('.factory-step');
    const progress = $('#factory-progress');
    if (!steps.length) return;

    if (!canAnimate) {
      if (progress) progress.style.transform = 'scaleY(1)';
      steps.forEach((s) => s.classList.add('is-in'));
      return;
    }

    if (progress) {
      gsap.fromTo(progress, { scaleY: 0 }, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top 60%', end: 'bottom 78%', scrub: 0.6 },
      });
    }

    steps.forEach((step) => {
      gsap.fromTo(step.querySelector('.factory-step-inner'),
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: step, start: 'top 82%', once: true },
        });
      gsap.fromTo(step.querySelector('.factory-num'),
        { scale: 0.6, opacity: 0 },
        {
          scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.6)',
          scrollTrigger: { trigger: step, start: 'top 82%', once: true },
        });
    });
  }


  /* ---------- 7. Cart / checkout ---------- */
  let cart = loadCart();
  let drawerOpen = false;
  let modalOpen = false;
  let menuOpen = false;
  let filterOpen = false;
  let productOpen = false;

  const drawer = $('#cart-drawer');
  const drawerOverlay = $('#drawer-overlay');
  const modal = $('#checkout-modal');
  const cartBadge = $('#cart-count');
  const filterDrawer = $('#filter-drawer');
  const filterOverlay = $('#filter-overlay');
  const productModal = $('#product-modal');

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((it) => it && it.id && it.name && Number(it.price) >= 0 && Number(it.qty) > 0)
        .map((it) => ({ ...it, qty: Math.max(1, Math.floor(it.qty)), price: Number(it.price) }));
    } catch {
      return [];
    }
  }

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* private mode */ }
  }

  function cartCount() {
    return cart.reduce((sum, it) => sum + it.qty, 0);
  }

  function cartSubtotal() {
    return cart.reduce((sum, it) => sum + it.price * it.qty, 0);
  }

  function cartShipping() {
    const sub = cartSubtotal();
    if (sub === 0) return 0;
    return sub >= SHIPPING_THRESHOLD ? 0 : 99;
  }

  function renderCart() {
    const wrap = $('#cart-items');
    const subtotalEl = $('#cart-subtotal');
    const headCount = $('#cart-head-count');
    const crossWrap = $('#cross-sell');
    const shippingCopy = $('#ship-copy');
    const shippingPercent = $('#ship-percent');
    const shippingFill = $('#ship-fill');
    const sub = cartSubtotal();
    const count = cartCount();

    if (cartBadge) cartBadge.textContent = count;
    if (headCount) headCount.textContent = `(${count})`;

    if (!cart.length) {
      wrap.innerHTML = `
        <div class="cart-empty">
          <h3>NOTHING IN THE BAG.</h3>
          <p>YOUR NEXT FAVOURITE PAIR<br />IS STILL ON THE RUNWAY.</p>
          <a class="btn-outline" href="#drops" data-close-cart>SHOP THE DROP</a>
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

    // Cross-sell: only when relevant
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

  function bumpBadge() {
    if (!cartBadge) return;
    cartBadge.classList.add('bump');
    setTimeout(() => cartBadge.classList.remove('bump'), 280);
  }

  function addToCart(product, size, openDrawer = true) {
    if (!product) return;
    const key = `${product.id}-${size}`;
    const existing = cart.find((it) => `${it.id}-${it.size}` === key);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.image,
        fit: product.fit || 'Denim',
        size,
        qty: 1,
      });
    }
    renderCart();
    bumpBadge();
    toast(`${product.name.toUpperCase()} — SIZE ${size} ADDED TO BAG`);
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
    const locked = drawerOpen || modalOpen || menuOpen || filterOpen || productOpen;
    document.body.classList.toggle('locked', locked);
    if (lenis) {
      if (locked) lenis.stop();
      else lenis.start();
    }
  }

  function openCart() {
    if (menuOpen) closeMenu();
    if (modalOpen) closeCheckout();
    drawerOpen = true;
    drawer.classList.add('is-open');
    drawerOverlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    renderCart();
    syncLock();
    setTimeout(() => $('.cart-head .icon-btn')?.focus(), 120);
  }

  function closeCart() {
    drawerOpen = false;
    drawer.classList.remove('is-open');
    drawerOverlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    syncLock();
    if (!modalOpen) $('.cart-btn')?.focus();
  }

  function openFilter() {
    if (menuOpen) closeMenu();
    if (drawerOpen) closeCart();
    if (modalOpen) closeCheckout();
    filterOpen = true;
    filterDrawer.classList.add('is-open');
    filterOverlay.classList.add('is-open');
    filterDrawer.setAttribute('aria-hidden', 'false');
    syncFilterChips();
    syncLock();
    setTimeout(() => $('.filter-head .icon-btn')?.focus(), 120);
  }

  function closeFilter() {
    filterOpen = false;
    filterDrawer.classList.remove('is-open');
    filterOverlay.classList.remove('is-open');
    filterDrawer.setAttribute('aria-hidden', 'true');
    syncLock();
    const opener = $('#filter-open');
    if (opener) opener.focus();
  }

  /* ---------- Product quick-view ---------- */
  const productState = { product: null, size: 32 };

  const STRETCH_STEPS = [
    { max: 0, label: 'RIGID', copy: '100% cotton, zero elastane. Breaks in and molds to you — no snap-back.' },
    { max: 2, label: 'LOW STRETCH', copy: 'A touch of give for movement. Holds its shape wash after wash.' },
    { max: 6, label: 'MEDIUM STRETCH', copy: 'Everyday comfort with a structured hand and clean recovery.' },
    { max: 99, label: 'COMFORT STRETCH', copy: 'All-day flex for long shifts and longer nights. Springs right back.' },
  ];

  function stretchCopy(value) {
    return STRETCH_STEPS.find((s) => value <= s.max) || STRETCH_STEPS[STRETCH_STEPS.length - 1];
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

  function trueToSize(product) {
    const seed = product.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const small = 8 + (seed % 18);
    const large = 6 + (seed % 14);
    const truePct = Math.max(52, 100 - small - large);
    const adj = 100 - truePct - small - large;
    return { small, true: truePct + adj, large };
  }

  function careGuide(product) {
    const raw = /RAW/i.test(product.wash);
    const guide = [
      { icon: 'W', title: 'WASH COLD', copy: 'Machine wash at 30°C, inside-out, with like colours.' },
      { icon: 'D', title: 'HANG DRY', copy: 'Line dry in shade. Never tumble — heat kills the hand-feel.' },
      { icon: 'B', title: 'EXPECT BLEED', copy: 'Indigo may transfer at first. Wash separately for the first 3 cycles.' },
      { icon: 'I', title: 'IRON REVERSE', copy: 'Warm iron on the reverse. Skip the print and hardware.' },
    ];
    if (raw) {
      guide.unshift({ icon: '6', title: 'RAW CARE', copy: 'Wait 6 months before the first wash. Spot-clean and air out between wears.' });
    }
    return guide;
  }

  function renderProduct(product) {
    if (!product) return;
    productState.product = product;
    productState.size = SIZES.includes(32) ? 32 : SIZES[0];
    if (product.soldOut && product.soldOut.includes(productState.size)) {
      productState.size = SIZES.find((s) => !(product.soldOut || []).includes(s)) || SIZES[0];
    }

    const fitObj = FITS.find((f) => f.name === product.fit);
    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    const setImg = (sel, src, alt) => {
      const el = $(sel);
      if (!el) return;
      el.classList.remove('is-broken');
      el.src = src;
      el.alt = alt;
    };

    setText('#pd-breadcrumb', `${product.fit.toUpperCase()} / ${product.rise.toUpperCase()} RISE / ${product.wash}`);
    setText('#pd-name', product.name);
    setText('#pd-price', money(product.price));
    setText('#pd-sticky-name', product.name);
    setText('#pd-sticky-price', money(product.price));
    setText('#pd-wash', product.wash);
    setText('#pd-rise', `${product.rise.toUpperCase()} RISE`);
    setText('#pd-distress', `${product.distress.toUpperCase()} DISTRESS`);
    setText('#pd-gsm', product.gsm);
    setText('#pd-desc', fitObj ? fitObj.desc : 'Heavyweight Indian denim, cut for the street and built to outlive the trend.');

    setImg('#pd-image', product.image, `${product.name} on model`);
    setImg('#pd-image-flat', product.imageFlat || product.image, `${product.name} flat-lay`);

    // Stretch meter
    const stretchVal = Number(product.stretch) || 0;
    const meter = $('#pd-stretch-range');
    if (meter) meter.value = String(stretchVal);
    updateStretchMeter(stretchVal, product);

    // True to size
    const tts = trueToSize(product);
    setText('#tts-small-val', `${tts.small}%`);
    setText('#tts-true-val', `${tts.true}%`);
    setText('#tts-large-val', `${tts.large}%`);
    const smallBar = $('#tts-small-bar');
    const trueBar = $('#tts-true-bar');
    const largeBar = $('#tts-large-bar');
    if (smallBar) smallBar.style.width = tts.small + '%';
    if (trueBar) trueBar.style.width = tts.true + '%';
    if (largeBar) largeBar.style.width = tts.large + '%';
    setText('#tts-summary', tts.true >= 60 ? 'RUNS TRUE TO SIZE' : tts.small > tts.large ? 'RUNS A LITTLE SMALL' : 'RUNS A LITTLE LARGE');

    // Sizes
    renderProductSizes(product);

    // Measurement table
    renderMeasureTable(product);

    // Care guide
    const care = $('#pd-care');
    if (care) {
      care.innerHTML = careGuide(product).map((c) => `
        <li>
          <span class="care-icon mono">${c.icon}</span>
          <div><strong class="mono">${c.title}</strong><p>${c.copy}</p></div>
        </li>`).join('');
    }

    const scrollWrap = $('#product-scroll');
    if (scrollWrap) scrollWrap.scrollTop = 0;
  }

  function updateStretchMeter(value, product) {
    const info = stretchCopy(value);
    const fill = $('#pd-stretch-fill');
    const knob = $('#pd-stretch-knob');
    const label = $('#pd-stretch-label');
    const copy = $('#pd-stretch-copy');
    const readout = $('#pd-stretch-readout');
    const pct = Math.max(0, Math.min(100, (value / 15) * 100));
    if (fill) fill.style.width = pct + '%';
    if (knob) knob.style.left = pct + '%';
    if (label) label.textContent = info.label;
    if (copy) copy.textContent = info.copy;
    if (readout) readout.textContent = `${value}% ELASTANE`;
    const actual = $('#pd-stretch-actual');
    if (actual && product) {
      actual.style.left = `${Math.max(0, Math.min(100, (Number(product.stretch) || 0) / 15 * 100))}%`;
      actual.dataset.value = `${product.stretch}%`;
    }
    const meter = $('#pd-stretch-range');
    if (meter) meter.setAttribute('aria-valuetext', `${value} percent — ${info.label}`);
    const wrap = $('#pd-stretch');
    if (wrap) wrap.dataset.actual = String(product ? product.stretch : value);
  }

  function renderProductSizes(product) {
    const sold = new Set(product.soldOut || []);
    const summary = $('#pd-sizes');
    if (summary) {
      summary.innerHTML = SIZES.map((s) => `
        <button type="button" class="pd-size ${s === productState.size ? 'is-active' : ''}"
          data-pd-size="${s}" ${sold.has(s) ? 'disabled aria-disabled="true"' : ''}
          aria-label="Select size ${s}">${s}</button>`).join('');
    }
    const sticky = $('#pd-sticky-sizes');
    if (sticky) {
      sticky.innerHTML = SIZES.map((s) => `
        <button type="button" class="pd-size pd-size-sm ${s === productState.size ? 'is-active' : ''}"
          data-pd-size="${s}" ${sold.has(s) ? 'disabled aria-disabled="true"' : ''}
          aria-label="Select size ${s}">${s}</button>`).join('');
    }
    const sizeReadout = $('#pd-size-readout');
    if (sizeReadout) sizeReadout.textContent = `SIZE W${productState.size}`;
  }

  function renderMeasureTable(product) {
    const table = $('#pd-measure');
    if (!table) return;
    const rows = measurementsFor(product.fit, 32).map((r) => r.label);
    table.innerHTML = `
      <caption class="sr-only">Measurements in inches by waist size for ${product.name}</caption>
      <thead>
        <tr>
          <th scope="col">MEASUREMENT (IN)</th>
          ${SIZES.map((s) => `<th scope="col" data-col-size="${s}" class="${s === productState.size ? 'is-selected' : ''}">W${s}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((label, rowIdx) => `
          <tr>
            <th scope="row">${label}</th>
            ${SIZES.map((s) => {
              const measured = measurementsFor(product.fit, s)[rowIdx].value;
              return `<td data-col-size="${s}" class="${s === productState.size ? 'is-selected' : ''}">${measured.toFixed(1)}"</td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>`;
  }

  function setProductSize(size) {
    if (!productState.product) return;
    if ((productState.product.soldOut || []).includes(size)) return;
    productState.size = size;
    renderProductSizes(productState.product);
    renderMeasureTable(productState.product);
  }

  function openProduct(id) {
    const product = CATALOG.get(id);
    if (!product) return;
    if (menuOpen) closeMenu();
    if (drawerOpen) closeCart();
    if (modalOpen) closeCheckout();
    if (filterOpen) closeFilter();
    hideToast();
    renderProduct(product);
    productOpen = true;
    productModal.classList.add('is-open');
    productModal.setAttribute('aria-hidden', 'false');
    syncLock();
    setTimeout(() => $('.product-close')?.focus(), 120);
  }

  function closeProduct() {
    productOpen = false;
    productModal.classList.remove('is-open');
    productModal.setAttribute('aria-hidden', 'true');
    syncLock();
    $('#filter-open')?.blur();
  }

  function checkoutSummary(method) {
    const sub = cartSubtotal();
    const ship = cartShipping();
    const fee = method === 'COD' ? 49 : 0;
    const total = sub + ship + fee;

    const lines = cart.map((it) => `
      <div class="summary-line">
        <span>${it.name} × ${it.qty} <em style="font-style:normal;opacity:.55">(size ${it.size})</em></span>
        <strong>${money(it.price * it.qty)}</strong>
      </div>`).join('');

    const el = $('#checkout-summary');
    if (el) {
      el.innerHTML = `
        ${lines}
        <div class="summary-line"><span>SUBTOTAL</span><strong>${money(sub)}</strong></div>
        <div class="summary-line"><span>SHIPPING</span><strong class="${ship === 0 ? 'free' : ''}">${ship === 0 ? 'FREE' : money(ship)}</strong></div>
        <div class="summary-line"><span>${method === 'COD' ? 'COD HANDLING' : 'PAYMENT FEE'}</span><strong>${fee === 0 ? '₹0' : money(fee)}</strong></div>
        <div class="summary-line is-total"><span>TOTAL</span><strong>${money(total)}</strong></div>`;
    }
    const payTotal = $('#pay-total');
    if (payTotal) payTotal.textContent = money(total);
    return total;
  }

  function openCheckout() {
    if (!cart.length) {
      toast('YOUR BAG IS EMPTY — ADD A FIT FIRST');
      return;
    }
    if (drawerOpen) closeCart();
    hideToast();
    modalOpen = true;
    $('#checkout-body').hidden = false;
    $('#checkout-success').hidden = true;
    const method = $('input[name="payment"]:checked')?.value || 'UPI';
    checkoutSummary(method);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    syncLock();
    setTimeout(() => $('.modal-close')?.focus(), 120);
  }

  function closeCheckout() {
    modalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    $('#checkout-body').hidden = false;
    $('#checkout-success').hidden = true;
    syncLock();
    $('.cart-btn')?.focus();
  }

  function placeOrder(e) {
    e.preventDefault();
    if (!cart.length) {
      toast('YOUR BAG IS EMPTY');
      closeCheckout();
      return;
    }
    const method = $('input[name="payment"]:checked')?.value || 'UPI';
    const total = checkoutSummary(method);
    const orderId = 'TJF-' + String(Math.floor(100000 + Math.random() * 900000));
    const methodLabel = method === 'COD' ? 'CASH ON DELIVERY' : method;

    $('#success-copy').textContent = `Order ${orderId} is locked. A confirmation is on its way to your inbox.`;
    $('#success-payment').textContent = methodLabel;
    $('#success-total').textContent = money(total);
    $('#checkout-body').hidden = true;
    $('#checkout-success').hidden = false;

    cart = [];
    renderCart();
  }

  /* ---------- 8. Chrome ---------- */
  let toastTimer = null;
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }
  function hideToast() {
    const el = $('#toast');
    if (el) el.classList.remove('is-visible');
    clearTimeout(toastTimer);
  }

  function openMenu() {
    menuOpen = true;
    $('#menu-btn').setAttribute('aria-expanded', 'true');
    const menu = $('#mobile-menu');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    syncLock();
  }

  function closeMenu() {
    menuOpen = false;
    const btn = $('#menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    const menu = $('#mobile-menu');
    if (menu) {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
    }
    syncLock();
  }

  function initPreloader() {
    const pre = $('#preloader');
    const countEl = $('#preloader-count');
    const fillEl = $('#preloader-fill');
    if (!pre) return;
    const duration = 1350;
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const n = Math.round(eased * 100);
      if (countEl) countEl.textContent = pad2(n);
      if (fillEl) fillEl.style.width = n + '%';
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        pre.classList.add('is-loaded');
        if (hasGsap) ScrollTrigger.refresh();
      }
    }
    requestAnimationFrame(frame);
    setTimeout(() => pre.classList.add('is-loaded'), 3200);
  }

  /* ---------- Finder tool ---------- */
  let finderUnit = 'cm';
  let finderValues = { height: 175, waist: 32 };
  let finderState = null;

  function bestFitFor(waistIn, heightCm) {
    if (waistIn >= 36) return 'Baggy';
    if (waistIn >= 34) return 'Wide-Leg';
    if (heightCm >= 181) return 'Bootcut';
    if (waistIn >= 30) return 'Straight';
    return 'Slim';
  }

  const FIT_PRESETS = {
    Baggy: { k: 0.95, l: 1.02, g: 10 },
    'Wide-Leg': { k: 0.94, l: 1.04, g: 12 },
    Straight: { k: 0.82, l: 0.84, g: 16 },
    Bootcut: { k: 0.6, l: 0.84, g: 18 },
    Slim: { k: 0.58, l: 0.6, g: 20 },
  };

  function recommendedSize(waistIn, heightCm) {
    let w = Math.round(waistIn / 2) * 2;
    w = Math.max(28, Math.min(36, w));
    let l = 32;
    if (heightCm < 165) l = 30;
    else if (heightCm >= 178) l = 34;
    return { w, l };
  }

  function heightToFeet(cm) {
    const totalIn = cm / 2.54;
    const ft = Math.floor(totalIn / 12);
    const inches = Math.round(totalIn % 12);
    return `${ft}'${inches === 12 ? 0 : inches}"`;
  }

  function updateFinder(animate = true) {
    const h = finderValues.height;
    const wIn = finderValues.waist;

    const heightValue = $('#height-value');
    const heightUnit = $('#height-unit');
    const heightFt = $('#height-ft');
    const waistValue = $('#waist-value');
    const waistCm = $('#waist-cm');

    if (finderUnit === 'cm') {
      heightValue.textContent = h;
      heightUnit.textContent = 'cm';
      heightFt.textContent = heightToFeet(h);
    } else {
      heightValue.textContent = heightToFeet(h);
      heightUnit.textContent = '';
      heightFt.textContent = `${h} cm`;
    }

    waistValue.textContent = wIn;
    waistCm.textContent = `${Math.round(wIn * 2.54)} cm`;

    const t = (h - 150) / 50;
    const sy = 0.86 + t * 0.22;
    const geo = {
      top: 58,
      hipY: 58 + 70 * sy,
      kneeY: 58 + 195 * sy,
      ankleY: 58 + 318 * sy,
    };
    const fit = bestFitFor(wIn, h);
    const preset = FIT_PRESETS[fit] || FIT_PRESETS['Wide-Leg'];
    const hip = 82 + (wIn - 26) * 2.4;
    const waistBand = 60 + (wIn - 26) * 1.85;
    const target = {
      waist: waistBand,
      hip,
      knee: hip * preset.k,
      lo: hip * preset.l,
      gap: preset.g,
      crotch: 58 + 148 * sy,
      top: geo.top,
      hipY: geo.hipY,
      kneeY: geo.kneeY,
      ankleY: geo.ankleY,
    };

    const size = recommendedSize(wIn, h);
    const fitMeasure = FIT_MEASURE[fit] || FIT_MEASURE['Wide-Leg'];
    const dSize = size.w - 32;
    const metrics = {
      waist: wIn,
      thigh: fitMeasure.thigh + dSize * 0.55,
      inseam: size.l + (h - 175) * 0.08,
      outseam: fitMeasure.outseam + (h - 175) * 0.1,
    };

    if (!finderState) finderState = { ...target };

    const paint = () => renderCadBlueprint(finderState, metrics);

    if (hasGsap && animate && !reducedMotion) {
      gsap.to(finderState, {
        ...target,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: paint,
      });
    } else {
      Object.assign(finderState, target);
      paint();
    }

    const fitObj = FITS.find((f) => f.name === fit);
    const recProd = CATALOG.get(FIT_TO_PRODUCT[fit]) || SIGNATURE;
    $('#result-size').textContent = `W${size.w} / L${size.l}`;
    $('#result-fit').textContent = fit.toUpperCase();
    $('#callout-height').textContent = `HEIGHT ${h} CM`;
    $('#callout-waist').textContent = `WAIST W${size.w}`;
    const cadCode = $('#cad-fit-code');
    if (cadCode && fitObj) cadCode.textContent = `PATTERN: ${fitObj.code}`;

    // Update live mini product preview card
    const prevLink = $('#finder-preview-link');
    const prevImg = $('#finder-preview-img');
    const prevFit = $('#finder-preview-fit');
    const prevName = $('#finder-preview-name');
    const prevSize = $('#finder-preview-size');
    const prevPrice = $('#finder-preview-price');
    if (prevLink) prevLink.href = `product.html?id=${recProd.id}`;
    if (prevImg && prevImg.src !== recProd.image) {
      prevImg.classList.remove('is-broken');
      prevImg.src = recProd.image;
      prevImg.alt = `${recProd.name} recommended jeans`;
    }
    if (prevFit) prevFit.textContent = `${fit.toUpperCase()} · ${recProd.gsm || '420 GSM'}`;
    if (prevName) prevName.textContent = recProd.name;
    if (prevSize) prevSize.textContent = `W${size.w} / L${size.l}`;
    if (prevPrice) prevPrice.textContent = money(recProd.price);

    finderValues.fit = fit;
    finderValues.size = size;
    finderValues.product = recProd;
  }

  function initFinder() {
    const hRange = $('#height-range');
    const wRange = $('#waist-range');
    if (!hRange || !wRange) return;

    // Prime the CAD schematic & preview immediately, then enable animated updates.
    updateFinder(false);

    hRange.addEventListener('input', () => {
      finderValues.height = Number(hRange.value);
      updateFinder();
    });
    wRange.addEventListener('input', () => {
      finderValues.waist = Number(wRange.value);
      updateFinder();
    });

    $$('.unit-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => {
        finderUnit = btn.dataset.unit;
        $$('.unit-toggle button').forEach((b) => b.classList.toggle('is-active', b === btn));
        updateFinder(false);
      });
    });

    const shopBtn = $('#shop-size-btn');
    if (shopBtn) {
      shopBtn.addEventListener('click', () => {
        const { w, l } = recommendedSize(finderValues.waist, finderValues.height);
        const prod = finderValues.product || SIGNATURE;
        addToCart(prod, `W${w} / L${l}`, true);
      });
    }

    const addRecBtn = $('#finder-add-btn');
    if (addRecBtn) {
      addRecBtn.addEventListener('click', () => {
        const { w, l } = recommendedSize(finderValues.waist, finderValues.height);
        const prod = finderValues.product || SIGNATURE;
        addToCart(prod, `W${w} / L${l}`, false);
        const label = $('#finder-add-label');
        if (label) {
          clearTimeout(addRecBtn._t);
          addRecBtn.classList.add('is-added');
          label.textContent = 'ADDED ✓';
          addRecBtn._t = setTimeout(() => {
            addRecBtn.classList.remove('is-added');
            label.textContent = 'ADD RECOMMENDED SIZE';
          }, 1500);
        }
      });
    }
  }

  /* ---------- Event wiring ---------- */
  function bindGlobalEvents() {
    // Cart open/close
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-cart]')) { e.preventDefault(); openCart(); }
      if (e.target.closest('[data-close-cart]')) { e.preventDefault(); closeCart(); }
    });

    // Quick add from runway / looks with instant "ADDED ✓" confirmation
    document.addEventListener('click', (e) => {
      const sizeBtn = e.target.closest('[data-add-size]');
      if (sizeBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (sizeBtn.disabled) return;
        const product = CATALOG.get(sizeBtn.dataset.product);
        if (product) {
          addToCart(product, sizeBtn.dataset.size, false);
          clearTimeout(sizeBtn._addedTimer);
          sizeBtn.classList.add('is-added');
          const box = sizeBtn.closest('.drop-sizes');
          const labelEl = box ? $('.size-label', box) : null;
          if (box && labelEl) {
            clearTimeout(box._addedTimer);
            box.classList.add('is-added');
            labelEl.textContent = `ADDED ✓ — SIZE ${sizeBtn.dataset.size}`;
            box._addedTimer = setTimeout(() => {
              box.classList.remove('is-added');
              labelEl.textContent = labelEl.dataset.defaultLabel || 'QUICK ADD — PICK SIZE';
            }, 1500);
          }
          sizeBtn._addedTimer = setTimeout(() => {
            sizeBtn.classList.remove('is-added');
          }, 1500);
        }
        return;
      }

      // Clicking anywhere on the drop card outside interactive controls opens product.html?id=<id>
      const card = e.target.closest('.drop-card');
      if (card && !e.target.closest('button') && !e.target.closest('a')) {
        const id = card.dataset.id;
        if (id) window.location.href = `product.html?id=${id}`;
      }
    });

    // Quick-view product modal controls
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-product]')) {
        e.preventDefault();
        closeProduct();
        return;
      }
      const pdSize = e.target.closest('[data-pd-size]');
      if (pdSize && !pdSize.disabled) {
        setProductSize(Number(pdSize.dataset.pdSize));
      }
    });

    const pdAdd = $('#pd-add');
    if (pdAdd) {
      pdAdd.addEventListener('click', () => {
        if (!productState.product) return;
        addToCart(productState.product, productState.size, true);
        closeProduct();
      });
    }

    const pdStretchRange = $('#pd-stretch-range');
    if (pdStretchRange) {
      pdStretchRange.addEventListener('input', () => {
        updateStretchMeter(Number(pdStretchRange.value), productState.product);
      });
    }

    // Cart line quantity / remove
    const itemsWrap = $('#cart-items');
    if (itemsWrap) {
      itemsWrap.addEventListener('click', (e) => {
        const line = e.target.closest('.cart-line');
        if (!line) return;
        const key = line.dataset.key;
        const qtyBtn = e.target.closest('[data-qty]');
        if (qtyBtn) { updateQty(key, Number(qtyBtn.dataset.qty)); return; }
        if (e.target.closest('[data-remove]')) removeItem(key);
      });
    }

    // Cross-sell
    const crossWrap = $('#cross-sell');
    if (crossWrap) {
      crossWrap.addEventListener('click', (e) => {
        if (e.target.closest('[data-cross-add]')) {
          addToCart(CROSS_SELL, CROSS_SELL.size, false);
        }
      });
    }

    // Checkout
    const checkoutBtn = $('#checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (!cart.length) {
          toast('YOUR BAG IS EMPTY — ADD A FIT FIRST');
          return;
        }
        window.location.href = 'checkout.html';
      });
    }

    // Menu
    const menuBtn = $('#menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        if (menuOpen) closeMenu();
        else openMenu();
      });
    }

    // Escape key + focus trap for open dialogs
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (productOpen) closeProduct();
        else if (filterOpen) closeFilter();
        else if (drawerOpen) closeCart();
        else if (menuOpen) closeMenu();
        return;
      }
      if (e.key !== 'Tab') return;
      const container = productOpen ? productModal
        : filterOpen ? filterDrawer
          : drawerOpen ? drawer
            : menuOpen ? $('#mobile-menu')
              : null;
      if (!container) return;
      const focusables = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', container)
        .filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    // Smooth anchors
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href === '#') {
        if (link.dataset.toast) { e.preventDefault(); toast(link.dataset.toast); }
        return;
      }
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) closeMenu();
      scrollToTarget(target);
    });

    // Newsletter
    const news = $('#newsletter-form');
    if (news) {
      news.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = $('#newsletter-email').value.trim();
        if (!email) return;
        toast(`YOU'RE ON THE MILL LIST — ${email.toUpperCase()}`);
        news.reset();
      });
    }

    // Resize closes mobile menu on desktop
    window.addEventListener('resize', () => {
      if (menuOpen && window.innerWidth > 900) closeMenu();
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    renderRunway();
    renderLookbook();
    renderCart();
    bindGlobalEvents();
    initFilter();
    initViewToggle();
    applyFilters({ animate: false });
    initFits();
    initFinder();
    initPreloader();
    initHero();
    initCraft();
    initRunway();
    initFinderParallax();
    initLookbookParallax();
    initFactoryTimeline();

    if (hasGsap) {
      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
      // Refresh after first paint so pins measure the final layout.
      setTimeout(() => ScrollTrigger.refresh(), 400);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
