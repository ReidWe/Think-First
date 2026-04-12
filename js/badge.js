/* ============================================
   badge.js - SU ID Badge physics simulation
   with devicePixelRatio support for crisp
   rendering on Retina / high-DPI screens
   ============================================ */

(function () {
  const badgeCanvas = document.getElementById('badgeCanvas');
  if (!badgeCanvas) return;
  const bCtx2 = badgeCanvas.getContext('2d');
  const wrap = badgeCanvas.parentElement;

  // High-DPI scaling
  const dpr = window.devicePixelRatio || 1;

  let bW, bH;
  function badgeResize() {
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight + 400;
    badgeCanvas.width = cssW * dpr;
    badgeCanvas.height = cssH * dpr;
    badgeCanvas.style.width = cssW + 'px';
    badgeCanvas.style.height = cssH + 'px';
    bCtx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    bW = cssW;
    bH = cssH;
    badgeAnchor.x = bW / 2;
    badgeAnchor.y = 260;
  }

  // Physics constants
  const BGRAVITY = 0.7;
  const BDAMPING = 0.975;
  const BROPE_SEGMENTS = 12;
  const BROPE_LENGTH = 22;
  const badgeAnchor = { x: 0, y: 60 };

  // Rope points
  const bPoints = [];
  for (let i = 0; i <= BROPE_SEGMENTS; i++) {
    bPoints.push({ x: 0, y: 60 + i * BROPE_LENGTH, oldX: 0, oldY: 60 + i * BROPE_LENGTH });
  }

  // Badge dimensions
  const BBADGE_W = 200;
  const BBADGE_H = 280;
  let bDragging = false;
  let bDragPoint = null;
  let bMouseX = -1000, bMouseY = -1000;
  let bSmoothAngle = 0;

  // Offscreen badge texture at high res
  const texCanvas = document.createElement('canvas');
  const tCtx = texCanvas.getContext('2d');
  const texScale = Math.max(2, dpr);
  texCanvas.width = BBADGE_W * texScale;
  texCanvas.height = BBADGE_H * texScale;

  function drawBadgeTex() {
    const s = texScale;
    const w = BBADGE_W * s, h = BBADGE_H * s, r = 16 * s;
    tCtx.clearRect(0, 0, w, h);
    tCtx.save();

    // Card body
    tCtx.beginPath(); tCtx.roundRect(0, 0, w, h, r); tCtx.fillStyle = '#ffffff'; tCtx.fill();

    // Orange header
    const headerH = h * 0.28;
    tCtx.beginPath(); tCtx.roundRect(0, 0, w, headerH, [r, r, 0, 0]); tCtx.fillStyle = '#F47721'; tCtx.fill();

    // Header accent
    tCtx.beginPath(); tCtx.moveTo(w * 0.6, 0); tCtx.lineTo(w, 0); tCtx.lineTo(w, headerH * 0.6); tCtx.closePath();
    tCtx.fillStyle = 'rgba(0,51,102,0.25)'; tCtx.fill();

    // Header text
    tCtx.fillStyle = '#ffffff';
    tCtx.font = `bold ${12 * s}px 'Source Sans 3',sans-serif`;
    tCtx.textAlign = 'center';
    tCtx.fillText('SYRACUSE UNIVERSITY', w / 2, headerH * 0.42);
    tCtx.font = `bold ${38 * s}px 'Source Sans 3',sans-serif`;
    tCtx.fillText('SU', w / 2, headerH * 0.85);

    // Photo placeholder
    const photoSize = 70 * s, photoX = (w - photoSize) / 2, photoY = headerH + 18 * s;
    tCtx.fillStyle = '#003366'; tCtx.beginPath(); tCtx.roundRect(photoX, photoY, photoSize, photoSize, 8 * s); tCtx.fill();
    tCtx.fillStyle = 'rgba(255,255,255,0.15)';
    const cx = photoX + photoSize / 2, cy = photoY + photoSize * 0.38;
    tCtx.beginPath(); tCtx.arc(cx, cy, 16 * s, 0, Math.PI * 2); tCtx.fill();
    tCtx.beginPath(); tCtx.ellipse(cx, cy + 36 * s, 24 * s, 18 * s, 0, Math.PI, 0, true); tCtx.fill();

    // Name & info
    const textY = photoY + photoSize + 28 * s;
    tCtx.fillStyle = '#1a1a2e'; tCtx.font = `bold ${14 * s}px 'Source Sans 3',sans-serif`; tCtx.textAlign = 'center';
    tCtx.fillText('OTTO ORANGE', w / 2, textY);
    tCtx.fillStyle = '#666'; tCtx.font = `${10 * s}px 'Source Sans 3',sans-serif`;
    tCtx.fillText('ID: 200-461-738', w / 2, textY + 20 * s);
    tCtx.fillStyle = '#003366'; tCtx.font = `600 ${10 * s}px 'Source Sans 3',sans-serif`;
    tCtx.fillText('College of Engineering & Computer Science', w / 2, textY + 40 * s);

    // Bottom bar
    const barH2 = 18 * s;
    tCtx.beginPath(); tCtx.roundRect(0, h - barH2, w, barH2, [0, 0, r, r]); tCtx.fillStyle = '#003366'; tCtx.fill();

    // Barcode
    tCtx.fillStyle = '#ddd';
    const bcY = textY + 58 * s, bcW2 = w * 0.5, bcX = (w - bcW2) / 2;
    for (let i = 0; i < 30; i++) {
      const lw = (i % 3 === 0) ? 3 * s : 1.5 * s;
      tCtx.fillRect(bcX + i * (bcW2 / 30), bcY, lw, 18 * s);
    }

    // Lanyard hole
    tCtx.fillStyle = '#e0e0e0'; tCtx.beginPath(); tCtx.arc(w / 2, 12 * s, 6 * s, 0, Math.PI * 2); tCtx.fill();
    tCtx.fillStyle = '#F47721'; tCtx.beginPath(); tCtx.arc(w / 2, 12 * s, 3 * s, 0, Math.PI * 2); tCtx.fill();

    tCtx.restore();
  }
  drawBadgeTex();

  // Initialize
  badgeResize();
  for (let i = 0; i <= BROPE_SEGMENTS; i++) {
    bPoints[i].x = badgeAnchor.x;
    bPoints[i].oldX = badgeAnchor.x;
    bPoints[i].y = badgeAnchor.y + i * BROPE_LENGTH;
    bPoints[i].oldY = badgeAnchor.y + i * BROPE_LENGTH;
  }
  window.addEventListener('resize', badgeResize);

  // ---- Physics simulation ----
  function bSimulate() {
    for (let i = 1; i < bPoints.length; i++) {
      const p = bPoints[i];
      let vx = (p.x - p.oldX) * BDAMPING, vy = (p.y - p.oldY) * BDAMPING;
      const maxV = 28, speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > maxV) { vx = (vx / speed) * maxV; vy = (vy / speed) * maxV; }
      p.oldX = p.x; p.oldY = p.y;
      p.x += vx; p.y += vy + BGRAVITY;
      if (i >= bPoints.length - 3) p.y += 0.3;
      if (!bDragging) {
        const dmx = p.x - bMouseX, dmy = p.y - bMouseY, md = Math.sqrt(dmx * dmx + dmy * dmy);
        if (md < 80 && md > 0) { const str = (1 - md / 80) * 1.8; p.x += (dmx / md) * str; p.y += (dmy / md) * str; }
      }
    }
    bPoints[0].x = badgeAnchor.x; bPoints[0].y = badgeAnchor.y;
    if (bDragging && bDragPoint !== null) {
      bPoints[bPoints.length - 1].x = bDragPoint.x;
      bPoints[bPoints.length - 1].y = bDragPoint.y;
    }
    for (let iter = 0; iter < 8; iter++) {
      for (let i = 0; i < bPoints.length - 1; i++) {
        const a = bPoints[i], b = bPoints[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d === 0) continue;
        const diff = (BROPE_LENGTH - d) / d * 0.5, ox = dx * diff, oy = dy * diff;
        if (i === 0) { b.x += ox * 2; b.y += oy * 2; }
        else if (bDragging && i === bPoints.length - 2) { a.x -= ox * 2; a.y -= oy * 2; }
        else { a.x -= ox; a.y -= oy; b.x += ox; b.y += oy; }
      }
      bPoints[0].x = badgeAnchor.x; bPoints[0].y = badgeAnchor.y;
      if (bDragging && bDragPoint !== null) {
        bPoints[bPoints.length - 1].x = bDragPoint.x;
        bPoints[bPoints.length - 1].y = bDragPoint.y;
      }
    }
  }

  // ---- Rendering ----
  let bSmoothTwist = 0; // tracks card twist for 3D effect

  function bRender() {
    bCtx2.clearRect(0, 0, bW, bH);

    // Clip at anchor
    bCtx2.save();
    bCtx2.fillStyle = '#aaa'; bCtx2.beginPath(); bCtx2.roundRect(badgeAnchor.x - 8, badgeAnchor.y - 10, 16, 24, 4); bCtx2.fill();
    bCtx2.fillStyle = '#888'; bCtx2.beginPath(); bCtx2.roundRect(badgeAnchor.x - 5, badgeAnchor.y - 6, 10, 16, 2); bCtx2.fill();
    bCtx2.restore();

    // ---- Lanyard as flat ribbon ----
    // Draw the lanyard as a series of quads between rope segments.
    // The ribbon width varies based on the horizontal angle between
    // consecutive segments, simulating a flat strap that twists.
    const LANYARD_BASE_W = 14; // full-face width of the ribbon
    const LANYARD_MIN_W = 3;   // edge-on minimum width

    for (let i = 0; i < bPoints.length - 1; i++) {
      const a = bPoints[i];
      const b = bPoints[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen === 0) continue;

      // Normal perpendicular to segment direction
      const nx = -dy / segLen;
      const ny = dx / segLen;

      // Width based on how horizontal the segment is (simulates twist)
      const horizontalness = Math.abs(dx) / (segLen + 1);
      const wA = LANYARD_MIN_W + (LANYARD_BASE_W - LANYARD_MIN_W) * (1 - horizontalness * 0.6);

      // Also check next segment for smooth width at point b
      let wB = wA;
      if (i + 2 < bPoints.length) {
        const c = bPoints[i + 2];
        const dx2 = c.x - b.x;
        const dy2 = c.y - b.y;
        const segLen2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const h2 = Math.abs(dx2) / (segLen2 + 1);
        wB = LANYARD_MIN_W + (LANYARD_BASE_W - LANYARD_MIN_W) * (1 - h2 * 0.6);
      }

      const halfA = wA / 2;
      const halfB = wB / 2;

      // Quad corners
      const ax1 = a.x + nx * halfA, ay1 = a.y + ny * halfA;
      const ax2 = a.x - nx * halfA, ay2 = a.y - ny * halfA;
      const bx1 = b.x + nx * halfB, by1 = b.y + ny * halfB;
      const bx2 = b.x - nx * halfB, by2 = b.y - ny * halfB;

      // Main ribbon body (orange)
      bCtx2.beginPath();
      bCtx2.moveTo(ax1, ay1);
      bCtx2.lineTo(bx1, by1);
      bCtx2.lineTo(bx2, by2);
      bCtx2.lineTo(ax2, ay2);
      bCtx2.closePath();
      bCtx2.fillStyle = '#F47721';
      bCtx2.fill();

      // Dark stripe down the center for depth
      const cxA = a.x, cyA = a.y;
      const cxB = b.x, cyB = b.y;
      const stripeHalfA = halfA * 0.25;
      const stripeHalfB = halfB * 0.25;
      bCtx2.beginPath();
      bCtx2.moveTo(cxA + nx * stripeHalfA, cyA + ny * stripeHalfA);
      bCtx2.lineTo(cxB + nx * stripeHalfB, cyB + ny * stripeHalfB);
      bCtx2.lineTo(cxB - nx * stripeHalfB, cyB - ny * stripeHalfB);
      bCtx2.lineTo(cxA - nx * stripeHalfA, cyA - ny * stripeHalfA);
      bCtx2.closePath();
      bCtx2.fillStyle = '#003366';
      bCtx2.fill();

      // Highlight edge for 3D feel
      bCtx2.beginPath();
      bCtx2.moveTo(ax1, ay1);
      bCtx2.lineTo(bx1, by1);
      bCtx2.strokeStyle = 'rgba(255, 180, 80, 0.5)';
      bCtx2.lineWidth = 1;
      bCtx2.stroke();
    }

    // ---- Badge card with 3D twist ----
    const tip = bPoints[bPoints.length - 1];
    let avgDx = 0, avgDy = 0;
    const sc = Math.min(5, bPoints.length - 1);
    for (let s2 = 0; s2 < sc; s2++) {
      const idx = bPoints.length - 1 - s2, idxP = idx - 1;
      if (idxP < 0) break;
      const wt = (sc - s2) / sc;
      avgDx += (bPoints[idx].x - bPoints[idxP].x) * wt;
      avgDy += (bPoints[idx].y - bPoints[idxP].y) * wt;
    }
    const tAngle = Math.atan2(avgDx, avgDy);
    let aDiff = tAngle - bSmoothAngle;
    while (aDiff > Math.PI) aDiff -= Math.PI * 2;
    while (aDiff < -Math.PI) aDiff += Math.PI * 2;
    bSmoothAngle += aDiff * 0.12;

    // Compute twist: based on horizontal velocity of the badge tip
    const tipVx = tip.x - (tip.oldX || tip.x);
    const targetTwist = tipVx * 0.04; // more horizontal motion = more twist
    bSmoothTwist += (targetTwist - bSmoothTwist) * 0.08;
    // Clamp twist so card never fully disappears
    const twist = Math.max(-0.85, Math.min(0.85, bSmoothTwist));
    const scaleX = Math.cos(twist * Math.PI * 0.5); // 1 = face-on, ~0.15 = edge-on

    // Determine if we're seeing the back
    const showBack = Math.abs(twist) > 0.5;

    bCtx2.save();
    bCtx2.translate(tip.x, tip.y);
    bCtx2.rotate(bSmoothAngle);

    // Apply horizontal scale for perspective twist
    bCtx2.scale(scaleX, 1);

    bCtx2.shadowColor = 'rgba(0,0,0,0.35)';
    bCtx2.shadowBlur = 20;
    bCtx2.shadowOffsetX = 4 * scaleX;
    bCtx2.shadowOffsetY = 8;

    if (showBack) {
      // Draw a simple card back
      const r = 12;
      bCtx2.beginPath();
      bCtx2.roundRect(-BBADGE_W / 2, -10, BBADGE_W, BBADGE_H, r);
      bCtx2.fillStyle = '#e8e8e8';
      bCtx2.fill();
      // Magnetic stripe
      bCtx2.fillStyle = '#1a1a2e';
      bCtx2.fillRect(-BBADGE_W / 2, 40, BBADGE_W, 36);
      // Small SU logo on back
      bCtx2.fillStyle = '#ccc';
      bCtx2.font = 'bold 28px "Source Sans 3", sans-serif';
      bCtx2.textAlign = 'center';
      bCtx2.fillText('SU', 0, BBADGE_H / 2 + 20);
    } else {
      // Draw front face
      bCtx2.drawImage(texCanvas, -BBADGE_W / 2, -10, BBADGE_W, BBADGE_H);
    }

    // Edge shading when twisted (darker edge for depth)
    if (Math.abs(twist) > 0.1) {
      const edgeAlpha = Math.abs(twist) * 0.4;
      bCtx2.fillStyle = 'rgba(0,0,0,' + edgeAlpha + ')';
      bCtx2.beginPath();
      bCtx2.roundRect(-BBADGE_W / 2, -10, BBADGE_W, BBADGE_H, 12);
      bCtx2.fill();
    }

    bCtx2.restore();
  }

  // ---- Animation loop ----
  function bLoop() { bSimulate(); bRender(); requestAnimationFrame(bLoop); }
  bLoop();

  // ---- Input handling ----
  // On touch devices the key problem is that the canvas captures all
  // touch events, blocking page scroll. The fix: only call
  // preventDefault() when the finger actually lands on the badge card
  // or lanyard. Touches anywhere else on the canvas pass through to
  // the browser so scrolling works normally.

  function bGetPos(e) {
    const rect = badgeCanvas.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function bHitTest(mx, my) {
    const tip = bPoints[bPoints.length - 1], angle = bSmoothAngle;
    const dmx = mx - tip.x, dmy = my - tip.y;
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    const lx = dmx * cos - dmy * sin, ly = dmx * sin + dmy * cos;
    return lx >= -BBADGE_W / 2 && lx <= BBADGE_W / 2 && ly >= -10 && ly <= BBADGE_H - 10;
  }

  function bHitLanyard(mx, my) {
    for (let i = 1; i < bPoints.length; i++) {
      const p = bPoints[i];
      if (Math.abs(p.x - mx) < 25 && Math.abs(p.y - my) < 25) return i;
    }
    return -1;
  }

  function bOnDown(e) {
    const pos = bGetPos(e);
    const isTouch = !!e.touches;

    // Check if finger/cursor hit the badge card
    if (bHitTest(pos.x, pos.y)) {
      if (isTouch) e.preventDefault(); // only block scroll when touching badge
      bDragging = true;
      bDragPoint = { x: pos.x, y: pos.y };
      const p = bPoints[bPoints.length - 1];
      p.oldX = p.x; p.oldY = p.y;
      return;
    }

    // Check if finger/cursor hit the lanyard rope
    const ropeIdx = bHitLanyard(pos.x, pos.y);
    if (ropeIdx > 0) {
      if (isTouch) e.preventDefault();
      bDragging = true;
      bDragPoint = { x: pos.x, y: pos.y, ropeIndex: ropeIdx };
      const p = bPoints[ropeIdx];
      p.oldX = p.x; p.oldY = p.y;
      return;
    }

    // Touch landed on empty canvas area: do NOT preventDefault,
    // so the browser handles it as a normal scroll.
  }

  function bOnMove(e) {
    const pos = bGetPos(e);
    bMouseX = pos.x; bMouseY = pos.y;
    if (!bDragging) return;
    // Only block scroll while actively dragging the badge
    e.preventDefault();
    const lerp = 0.6;
    if (bDragPoint.ropeIndex !== undefined) {
      const p = bPoints[bDragPoint.ropeIndex];
      bDragPoint.x += (pos.x - bDragPoint.x) * lerp;
      bDragPoint.y += (pos.y - bDragPoint.y) * lerp;
      p.x = bDragPoint.x; p.y = bDragPoint.y;
    } else {
      bDragPoint.x += (pos.x - bDragPoint.x) * lerp;
      bDragPoint.y += (pos.y - bDragPoint.y) * lerp;
    }
  }

  function bOnUp() { bDragging = false; bDragPoint = null; }

  badgeCanvas.addEventListener('mousedown', bOnDown);
  badgeCanvas.addEventListener('mousemove', bOnMove);
  badgeCanvas.addEventListener('mouseup', bOnUp);
  badgeCanvas.addEventListener('mouseleave', bOnUp);
  badgeCanvas.addEventListener('touchstart', bOnDown, { passive: false });
  badgeCanvas.addEventListener('touchmove', bOnMove, { passive: false });
  badgeCanvas.addEventListener('touchend', bOnUp);
})();