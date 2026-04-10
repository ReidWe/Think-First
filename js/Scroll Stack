/* ============================================
   scroll-stack.js - Sticky scroll stack with
   scale, blur, translateY, and rotation effects.
   Also triggers bar-fill animations inside cards.
   ============================================ */

(function () {
  'use strict';

  const STACK_CONFIG = {
    scaleMin: 0.88,
    translateYMax: -30,
    blurMax: 3.5,
    rotateMax: -1.2,
    depthScale: 0.97,
    depthBlur: 1.4,
    depthTranslateY: -12,
    opacityMin: 0.45,
  };

  const track = document.getElementById('sstackTrack');
  if (!track) return;
  const cards = Array.from(track.querySelectorAll('.sstack-card'));
  if (cards.length === 0) return;

  // Track which cards have had their bars animated
  const barsAnimated = new Set();

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  let ticking = false;

  function updateCards() {
    const cfg = STACK_CONFIG;
    const rects = cards.map(c => c.getBoundingClientRect());
    const stickyTop = parseFloat(getComputedStyle(cards[0]).top) || 0;
    const viewportH = window.innerHeight;

    for (let i = 0; i < cards.length; i++) {
      const rect = rects[i];

      // Trigger bar-fill animations when card enters viewport
      if (!barsAnimated.has(i) && rect.top < viewportH - 50) {
        barsAnimated.add(i);
        cards[i].querySelectorAll('.bar-fill').forEach(bar => {
          bar.style.width = bar.getAttribute('data-width') + '%';
        });
      }

      const isStuck = rect.top <= stickyTop + 2;

      if (!isStuck) {
        cards[i].style.transform = '';
        cards[i].style.filter = '';
        cards[i].style.opacity = '';
        continue;
      }

      let overlapMultiplier = 0;
      let depthLevel = 0;

      for (let j = i + 1; j < cards.length; j++) {
        const nextRect = rects[j];
        const nextIsStuck = nextRect.top <= stickyTop + 2;

        if (nextIsStuck) {
          depthLevel++;
          continue;
        }

        const overlapStart = rect.bottom;
        const overlapEnd = stickyTop;
        const totalTravel = overlapStart - overlapEnd;
        const traveled = overlapStart - nextRect.top;

        if (totalTravel > 0) {
          overlapMultiplier = clamp(traveled / totalTravel, 0, 1);
        }
        break;
      }

      const scaleFromOverlap = 1 - (1 - cfg.scaleMin) * overlapMultiplier;
      const tyFromOverlap = cfg.translateYMax * overlapMultiplier;
      const blurFromOverlap = cfg.blurMax * overlapMultiplier;
      const rotFromOverlap = cfg.rotateMax * overlapMultiplier;

      const depthScaleFactor = Math.pow(cfg.depthScale, depthLevel);
      const depthBlurExtra = cfg.depthBlur * depthLevel;
      const depthTYExtra = cfg.depthTranslateY * depthLevel;

      const finalScale = scaleFromOverlap * depthScaleFactor;
      const finalTY = tyFromOverlap + depthTYExtra;
      const finalBlur = blurFromOverlap + depthBlurExtra;
      const finalRot = rotFromOverlap;
      const finalOpacity = clamp(
        1 - (1 - cfg.opacityMin) * (overlapMultiplier * 0.5 + depthLevel * 0.15),
        cfg.opacityMin,
        1
      );

      cards[i].style.transform =
        `scale(${finalScale.toFixed(4)}) ` +
        `translateY(${finalTY.toFixed(1)}px) ` +
        `rotate(${finalRot.toFixed(2)}deg)`;

      cards[i].style.filter = finalBlur > 0.1
        ? `blur(${finalBlur.toFixed(1)}px)`
        : 'none';

      cards[i].style.opacity = finalOpacity.toFixed(3);
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateCards);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  let scrollParent = track.parentElement;
  while (scrollParent && scrollParent !== document.body) {
    const overflow = getComputedStyle(scrollParent).overflowY;
    if (overflow === 'scroll' || overflow === 'auto') {
      scrollParent.addEventListener('scroll', onScroll, { passive: true });
      break;
    }
    scrollParent = scrollParent.parentElement;
  }

  requestAnimationFrame(updateCards);

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      requestAnimationFrame(updateCards);
    }, 150);
  }, { passive: true });

})();
