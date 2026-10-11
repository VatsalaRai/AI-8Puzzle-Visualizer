/*
 * sprites.js
 * Original pixel-art sprites drawn from character maps. Each map is rendered as a crisp
 * SVG (one rect per horizontal run, shape-rendering: crispEdges), so the pixels stay
 * sharp at any scale. No emoji and no external images are used.
 */
(global => {
  'use strict';

  /* One letter per colour. '.' is transparent. */
  const PAL = {
    p: '#E85DB5', // hot pink
    q: '#F2A9D5', // pastel pink
    o: '#A83A82', // dark pink
    l: '#6258F5', // lavender blue
    b: '#3A32B8', // dark lavender
    g: '#83F28F', // pixel green
    n: '#3FAE59', // dark green
    m: '#D0FFC0', // pale mint
    y: '#F7E96B', // pixel yellow
    e: '#C9A93A', // dark yellow
    w: '#F5F3FF', // soft white
    d: '#2B1A52', // deep purple
    k: '#050509'  // ink
  };

  const MAPS = {
    star: [
      '...y...',
      '..yyy..',
      'yyyyyyy',
      '.yyyyy.',
      '..yyy..',
      '.yy.yy.',
      '.y...y.'
    ],
    sparkle: [
      '..y..',
      '..y..',
      'yywyy',
      '..y..',
      '..y..'
    ],
    cloud: [
      '.....qqqq.......',
      '...qqqqqqqq.qq..',
      '..qqqqqqqqqqqqq.',
      '.qqqqqqqqqqqqqqq',
      'qqqqqqqqqqqqqqqq',
      'qqwqqqqqqqqqqqqq',
      '.qqqqqqqqqqqqqq.',
      '..oooooooooooo..'
    ],
    coin: [
      '..eeee..',
      '.eyyyye.',
      'eyywyyye',
      'eywyyyye',
      'eyyyyyye',
      'eyyyyyye',
      '.eyyyye.',
      '..eeee..'
    ],
    flower: [
      '.ppppp.',
      'ppqyqpp',
      'pqyyyqp',
      'ppqyqpp',
      '.ppppp.',
      '...g...',
      '..gg...',
      '...g.g.',
      '...gg..',
      '...g...'
    ],
    tree: [
      '....gggg....',
      '...gggggg...',
      '..gggmgggg..',
      '.gggggggggg.',
      '.ggmgggggmg.',
      'gggggggggggg',
      '.ggggmggggg.',
      '..gggggggg..',
      '...gggggg...',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '....oooo....'
    ],
    grass: [
      '.g..g.g.',
      '.gg.ggg.',
      'gggggggg',
      'nnnnnnnn'
    ],
    mushroom: [
      '...pppp...',
      '..ppwwpp..',
      '.pppwwppp.',
      'pppppppppp',
      'oooooooooo',
      '..qqqqqq..',
      '..qkqqkq..',
      '..qqqqqq..',
      '..qqqqqq..',
      '..oo..oo..'
    ],
    slime: [
      '...gggg...',
      '..gmgggg..',
      '.gmgggggg.',
      '.gkgggkgg.',
      'gggggggggg',
      'gnnnnnnnng',
      '.nnnnnnnn.'
    ],
    heart: [
      '.pp.pp.',
      'pwppppp',
      'ppppppp',
      '.ppppp.',
      '..ppp..',
      '...p...'
    ],
    gem: [
      '.lllll.',
      'lwllllb',
      'lllllbb',
      '.lllbb.',
      '..lbb..',
      '...b...'
    ]
  };

  /* Colour swaps for variants of the same shape. */
  const VARIANTS = {
    lavCloud: { q: 'l', o: 'b' },
    pinkTree: { g: 'p', m: 'q', n: 'o' },
    limeStar: { y: 'g' },
    pinkStar: { y: 'q' },
    mintFlower: { p: 'l', q: 'w' },
    limeGem: { l: 'g', b: 'n' },
    yellowHeart: { p: 'y', o: 'e', w: 'w' }
  };

  const cache = {};

  /* Returns an <svg> string. "scale" is the on-screen size of one sprite pixel. */
  function svg(name, scale, variant) {
    const map = MAPS[name];
    if (!map) return '';
    scale = scale || 4;
    const swap = (variant && VARIANTS[variant]) || null;
    const ck = name + '|' + scale + '|' + (variant || '');
    if (cache[ck]) return cache[ck];

    const rows = map.length;
    const cols = map[0].length;
    let rects = '';
    for (let y = 0; y < rows; y++) {
      const row = map[y];
      let x = 0;
      while (x < cols) {
        const ch = row.charAt(x);
        if (ch === '.') { x++; continue; }
        let run = 1;
        while (x + run < cols && row.charAt(x + run) === ch) run++;
        const key = swap && swap[ch] ? swap[ch] : ch;
        rects += '<rect x="' + x + '" y="' + y + '" width="' + run + '" height="1" fill="' + PAL[key] + '"/>';
        x += run;
      }
    }
    const out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + cols + ' ' + rows + '" width="' + (cols * scale) +
      '" height="' + (rows * scale) + '" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + rects + '</svg>';
    cache[ck] = out;
    return out;
  }

  /* Data URI, handy for CSS background-image. */
  function dataUri(name, scale, variant) {
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg(name, scale, variant)) + '")';
  }

  global.Sprites = {
    PAL: PAL,
    MAPS: MAPS,
    VARIANTS: VARIANTS,
    svg: svg,
    dataUri: dataUri,
    names: Object.keys(MAPS)
  };
})(typeof window !== 'undefined' ? window : globalThis);
