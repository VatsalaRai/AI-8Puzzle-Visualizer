/*
 * decor.js
 * Pixel-art scenery: twinkling stars, drifting clouds, bobbing coins, a grassy footer
 * with trees, flowers and a hopping slime, and little divider rows between sections.
 * Everything is pointer-events: none so it never blocks clicks. Animations are stepped
 * (retro look) and switched off when the visitor prefers reduced motion.
 */
(global => {
  'use strict';

  const S = global.Sprites;
  const reduce = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function make(cls, html, style) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (html) d.innerHTML = html;
    if (style) d.setAttribute('style', style);
    return d;
  }

  function buildLayer() {
    if (document.getElementById('decor')) return;
    const layer = make('', '');
    layer.id = 'decor';
    layer.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(layer, document.body.firstChild);

    /* [left %, top %, sprite, scale, variant, hide on small screens] */
    const stars = [
      [2, 12, 'star', 3, '', false], [5, 38, 'sparkle', 4, '', true], [2, 64, 'star', 2, 'limeStar', true],
      [6, 88, 'sparkle', 3, '', true], [95, 9, 'star', 3, 'pinkStar', false], [92, 33, 'sparkle', 4, '', true],
      [96, 61, 'star', 3, '', true], [93, 87, 'sparkle', 3, '', true], [47, 3, 'sparkle', 3, '', true],
      [27, 7, 'star', 2, 'limeStar', true], [71, 6, 'star', 2, '', true], [16, 94, 'sparkle', 3, '', true],
      [84, 95, 'star', 2, 'pinkStar', true]
    ];
    stars.forEach(s => {
      const d = make('deco deco-star' + (s[5] ? ' hide-sm' : ''), S.svg(s[2], s[3], s[4]), 'left:' + s[0] + '%;top:' + s[1] + '%');
      layer.appendChild(d);
    });

    const clouds = [[8, 'cloud', 5, ''], [52, 'cloud', 4, 'lavCloud'], [30, 'cloud', 6, 'lavCloud'], [74, 'cloud', 4, '']];
    clouds.forEach((c, i) => {
      const d = make('deco deco-cloud' + (i > 1 ? ' hide-sm' : ''), S.svg(c[1], c[2], c[3]), 'top:' + c[0] + '%;left:0');
      layer.appendChild(d);
    });

    [[1, 48], [97, 24], [98, 76]].forEach((c, i) => {
      const d = make('deco deco-coin' + (i > 0 ? ' hide-sm' : ''), S.svg('coin', 3), 'left:' + c[0] + '%;top:' + c[1] + '%');
      layer.appendChild(d);
    });

    animateLayer(layer);
  }

  function animateLayer(layer) {
    if (reduce) return;
    if (global.anime) {
      global.anime({
        targets: layer.querySelectorAll('.deco-star'),
        opacity: [1, 0.2],
        duration: 900,
        delay: global.anime.stagger(260),
        direction: 'alternate',
        loop: true,
        easing: 'steps(2)'
      });
    }
    if (global.gsap) {
      const w = global.innerWidth;
      layer.querySelectorAll('.deco-cloud').forEach((el, i) => {
        const tw = global.gsap.fromTo(el, { x: -260 }, { x: w + 260, duration: 150 + i * 45, ease: 'steps(260)', repeat: -1 });
        tw.progress((i * 0.31 + 0.12) % 1);
      });
      layer.querySelectorAll('.deco-coin').forEach((el, i) => {
        global.gsap.to(el, { y: -10, duration: 0.9, ease: 'steps(3)', yoyo: true, repeat: -1, delay: i * 0.3 });
      });
    }
  }

  function buildScenery() {
    const root = document.getElementById('scenery-root');
    if (!root || root.dataset.built) return;
    root.dataset.built = '1';
    root.setAttribute('aria-hidden', 'true');
    root.className = 'scenery';

    const items = [
      [3, 'tree', 6, ''], [13, 'flower', 5, ''], [22, 'mushroom', 5, ''], [33, 'tree', 5, 'pinkTree'],
      [46, 'flower', 5, 'mintFlower'], [55, 'slime', 5, ''], [66, 'tree', 6, ''], [77, 'flower', 5, ''],
      [85, 'mushroom', 5, ''], [93, 'tree', 5, 'pinkTree']
    ];
    let html = '<div class="grass-fill"></div><div class="grass-tufts" style="background-image:' + S.dataUri('grass', 4) + '"></div>';
    root.innerHTML = html;
    items.forEach((it, i) => {
      const d = make('scenery-item' + (i % 2 ? ' hide-sm' : ''), S.svg(it[1], it[2], it[3]), 'left:' + it[0] + '%');
      d.dataset.kind = it[1];
      root.appendChild(d);
    });

    if (!reduce && global.gsap) {
      const slime = root.querySelector('[data-kind="slime"]');
      if (slime) {
        const tl = global.gsap.timeline({ repeat: -1, repeatDelay: 0.9 });
        tl.to(slime, { y: -26, duration: 0.32, ease: 'steps(4)' }).to(slime, { y: 0, duration: 0.32, ease: 'steps(4)' });
      }
    }
  }

  /* Rows of tiny sprites placed between sections: <div class="deco-row"></div> */
  function fillDividers() {
    const seq = ['flower', 'grass', 'star', 'coin', 'mushroom', 'grass', 'heart', 'flower', 'gem', 'grass', 'star', 'slime', 'coin', 'flower', 'grass', 'heart'];
    const variants = ['', '', '', '', '', '', '', 'mintFlower', 'limeGem', '', 'pinkStar', '', '', '', '', 'yellowHeart'];
    document.querySelectorAll('.deco-row').forEach(row => {
      if (row.dataset.built) return;
      row.dataset.built = '1';
      row.setAttribute('aria-hidden', 'true');
      let html = '';
      const start = Math.floor(Math.random() * 4);
      for (let i = 0; i < seq.length; i++) {
        const j = (i + start) % seq.length;
        html += '<span class="deco-row-item' + (i > 6 ? ' hide-sm' : '') + '">' + S.svg(seq[j], 3, variants[j]) + '</span>';
      }
      row.innerHTML = html;
    });
  }

  global.Decor = {
    init() {
      buildLayer();
      buildScenery();
      fillDividers();
    },
    fillDividers: fillDividers,
    reduceMotion: reduce
  };
})(typeof window !== 'undefined' ? window : globalThis);
