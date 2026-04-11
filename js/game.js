/* ==================================================
   game.js - Argument Explorer canvas game
   Embedded version for the main site.
   Delta-time physics, mobile joystick, card collection.
   ================================================== */
(function () {
  'use strict';

  // ---- ARGUMENT DATA ----
  const ARGUMENTS = [
    {
      label: 'PRINCIPLE 01',
      title: 'Pragmatic Understanding',
      summary: 'Use AI effectively and interpret its output critically.',
      detail: 'Use AI effectively and interpret output critically. This means having the expertise to recognize when AI-generated work is overly complex or simply wrong, as often happens in technical fields like microcontroller programming (Zhao et al., 2024).',
      source: 'Zhao et al., 2024'
    },
    {
      label: 'PRINCIPLE 02',
      title: 'Safety Understanding',
      summary: 'Use AI responsibly with awareness of data privacy risks.',
      detail: 'Use AI responsibly and ethically. Students must understand data privacy and the professional risks of uploading proprietary or sensitive information to external AI models (Zhao et al., 2024).',
      source: 'Zhao et al., 2024'
    },
    {
      label: 'PRINCIPLE 03',
      title: 'Ethical Disclosure',
      summary: 'Transparency is the foundation of AI literacy.',
      detail: 'Transparency is the foundation of literacy. By documenting which program was used and how the response was incorporated into your work, you authorize your usage and ensure your integrity is never in question.',
      source: 'Think First Framework'
    },
    {
      label: 'PRINCIPLE 04',
      title: 'Reflective Understanding',
      summary: 'The Forklift in the Gym: assess AI\'s impact on your learning.',
      detail: 'Assess AI\'s impact on your learning. This is the "Forklift in the Gym" principle: if you use a forklift to bring weights to your bench, it is a useful tool. But if you use it to lift the weights for you, you have defeated the purpose of the gym (Zhao et al., 2024).',
      source: 'Zhao et al., 2024'
    },
    {
      label: 'THINK FIRST 01',
      title: 'Blank Page Before Prompt',
      summary: 'Mandate unassisted brainstorming before students open AI.',
      detail: 'The protocol mandates unassisted brainstorming and outlining before students introduce AI. By requiring students to confront the blank page first, the university protects original thought and ensures AI functions as a tool subordinate to the student, not vice versa (de Araujo & Schneider, 2025).',
      source: 'de Araujo & Schneider, 2025'
    },
    {
      label: 'THINK FIRST 02',
      title: 'Transparency, Not Surveillance',
      summary: 'Collaboration statements replace unreliable detection software.',
      detail: 'Rather than relying on invasive detection software, the framework uses AI collaboration statements where students document their process. This shifts the focus from catching cheaters to fostering genuine academic integrity and metacognitive awareness.',
      source: 'Think First Framework'
    },
    {
      label: 'THINK FIRST 03',
      title: 'Zero Cost, Existing Infrastructure',
      summary: 'No new software or budget required to implement.',
      detail: 'This requires no financial investment or new software. It integrates into the existing WRT 105 and WRT 205 curriculum, and the Syracuse University Writing Center can train peer consultants to guide students through independent brainstorming exercises.',
      source: 'Think First Framework'
    }
  ];

  // ---- CONSTANTS ----
  const WORLD_W = 1800;
  const WORLD_H = 1400;
  const PLAYER_R = 16;
  const PLAYER_SPEED = 280;
  const CARD_W = 160;
  const CARD_H = 100;
  const COLLECT_DIST = 60;
  const PARTICLE_COUNT = 18;

  // ---- ELEMENTS ----
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  const mmCanvas = document.getElementById('minimap');
  const mmCtx = mmCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // HUD
  const hudCollected = document.getElementById('hudCollected');
  const hudTotal = document.getElementById('hudTotal');
  hudTotal.textContent = ARGUMENTS.length;

  // Detail panel
  const detailOverlay = document.getElementById('detailOverlay');
  const detailOverline = document.getElementById('detailOverline');
  const detailTitle = document.getElementById('detailTitle');
  const detailBody = document.getElementById('detailBody');
  const detailSource = document.getElementById('detailSource');
  const detailClose = document.getElementById('detailClose');

  // Intro & victory
  const introOverlay = document.getElementById('introOverlay');
  const startBtn = document.getElementById('startBtn');
  const victoryOverlay = document.getElementById('victoryOverlay');

  // ---- STATE ----
  let W = 0, H = 0;
  let gameStarted = false;
  let paused = false;
  let collected = 0;
  let gameVisible = false; // IntersectionObserver controls this

  const player = { x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0 };
  const camera = { x: 0, y: 0 };
  const keys = { up: false, down: false, left: false, right: false };
  const joystick = { active: false, id: null, originX: 0, originY: 0, dx: 0, dy: 0 };

  // ---- PLACE CARDS ----
  const cards = [];
  function placeCards() {
    const margin = 140;
    const minDist = 220;
    for (let i = 0; i < ARGUMENTS.length; i++) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 500) {
        const cx = margin + Math.random() * (WORLD_W - margin * 2);
        const cy = margin + Math.random() * (WORLD_H - margin * 2);
        const dpc = Math.hypot(cx - WORLD_W / 2, cy - WORLD_H / 2);
        if (dpc < 200) { attempts++; continue; }
        let tooClose = false;
        for (const c of cards) {
          if (Math.hypot(cx - c.x, cy - c.y) < minDist) { tooClose = true; break; }
        }
        if (tooClose) { attempts++; continue; }
        cards.push({
          x: cx, y: cy, data: ARGUMENTS[i], collected: false,
          pulse: Math.random() * Math.PI * 2, particles: [], collectAnim: 0
        });
        placed = true;
      }
      if (!placed) {
        cards.push({
          x: margin + Math.random() * (WORLD_W - margin * 2),
          y: margin + Math.random() * (WORLD_H - margin * 2),
          data: ARGUMENTS[i], collected: false,
          pulse: Math.random() * Math.PI * 2, particles: [], collectAnim: 0
        });
      }
    }
  }
  placeCards();

  // Ambient stars
  const stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
      r: 0.5 + Math.random() * 1.5, a: 0.15 + Math.random() * 0.35,
      speed: 0.2 + Math.random() * 0.5
    });
  }

  // ---- RESIZE ----
  function resize() {
    W = container.clientWidth;
    H = container.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mmSize = W <= 768 ? 70 : 100;
    mmCanvas.width = mmSize * dpr;
    mmCanvas.height = mmSize * dpr;
    mmCanvas.style.width = mmSize + 'px';
    mmCanvas.style.height = mmSize + 'px';
    mmCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- VISIBILITY (pause rendering when off-screen) ----
  const gameSection = document.getElementById('explore');
  if (gameSection) {
    const visObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => { gameVisible = entry.isIntersecting; });
    }, { rootMargin: '200px 0px' });
    visObserver.observe(gameSection);
  }

  // ---- INPUT: Keyboard ----
  function keyHandler(e, down) {
    if (!gameStarted || paused) return;
    let handled = false;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': keys.up = down; handled = true; break;
      case 'ArrowDown': case 's': case 'S': keys.down = down; handled = true; break;
      case 'ArrowLeft': case 'a': case 'A': keys.left = down; handled = true; break;
      case 'ArrowRight': case 'd': case 'D': keys.right = down; handled = true; break;
    }
    // Only prevent default scroll when game is active and visible
    if (handled && gameVisible) e.preventDefault();
  }
  window.addEventListener('keydown', e => keyHandler(e, true));
  window.addEventListener('keyup', e => keyHandler(e, false));

  // ---- INPUT: Touch joystick ----
  canvas.addEventListener('touchstart', (e) => {
    if (!gameStarted || paused) return;
    const rect = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const localX = t.clientX - rect.left;
      if (localX < rect.width * 0.4 && joystick.id === null) {
        joystick.active = true;
        joystick.id = t.identifier;
        joystick.originX = t.clientX - rect.left;
        joystick.originY = t.clientY - rect.top;
        joystick.dx = 0;
        joystick.dy = 0;
        e.preventDefault();
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!joystick.active) return;
    const rect = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      if (t.identifier === joystick.id) {
        const dx = (t.clientX - rect.left) - joystick.originX;
        const dy = (t.clientY - rect.top) - joystick.originY;
        const dist = Math.hypot(dx, dy);
        const maxR = 50;
        if (dist > maxR) {
          joystick.dx = (dx / dist) * maxR;
          joystick.dy = (dy / dist) * maxR;
        } else {
          joystick.dx = dx;
          joystick.dy = dy;
        }
        e.preventDefault();
      }
    }
  }, { passive: false });

  function endJoystick(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joystick.id) {
        joystick.active = false;
        joystick.id = null;
        joystick.dx = 0;
        joystick.dy = 0;
      }
    }
  }
  canvas.addEventListener('touchend', endJoystick);
  canvas.addEventListener('touchcancel', endJoystick);

  // ---- DETAIL PANEL ----
  function showDetail(card) {
    paused = true;
    detailOverline.textContent = card.data.label;
    detailTitle.textContent = card.data.title;
    detailBody.textContent = card.data.detail;
    detailSource.textContent = card.data.source;
    detailOverlay.classList.add('show');
  }

  function hideDetail() {
    detailOverlay.classList.remove('show');
    setTimeout(() => { paused = false; }, 350);
    if (collected >= ARGUMENTS.length) {
      setTimeout(() => { victoryOverlay.classList.add('show'); }, 500);
    }
  }

  detailClose.addEventListener('click', hideDetail);
  detailClose.addEventListener('touchend', (e) => { e.preventDefault(); hideDetail(); });

  // ---- START ----
  console.log('[GAME] game.js loaded. startBtn:', startBtn, 'introOverlay:', introOverlay, 'canvas:', canvas);
  startBtn.addEventListener('click', () => {
    console.log('[GAME] Begin button clicked!');
    gameStarted = true;
    introOverlay.classList.add('hidden');
  });

  // ---- SPAWN PARTICLES ----
  function spawnParticles(card) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 / PARTICLE_COUNT) * i + Math.random() * 0.3;
      const speed = 80 + Math.random() * 160;
      card.particles.push({
        x: card.x, y: card.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, r: 2 + Math.random() * 3,
        hue: Math.random() > 0.5 ? 200 : 270
      });
    }
  }

  // ---- GAME LOOP ----
  let lastTime = performance.now();

  function loop(now) {
    const rawDt = (now - lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    lastTime = now;

    // Only update and render when the section is near the viewport
    if (gameVisible) {
      if (gameStarted && !paused) {
        update(dt);
      }
      updateParticles(dt);
      render();
      renderMinimap();
    }
    requestAnimationFrame(loop);
  }

  function update(dt) {
    let ix = 0, iy = 0;
    if (keys.left) ix -= 1;
    if (keys.right) ix += 1;
    if (keys.up) iy -= 1;
    if (keys.down) iy += 1;

    if (joystick.active) {
      const jDist = Math.hypot(joystick.dx, joystick.dy);
      if (jDist > 8) {
        ix += joystick.dx / 50;
        iy += joystick.dy / 50;
      }
    }

    const mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; }

    player.vx = ix * PLAYER_SPEED;
    player.vy = iy * PLAYER_SPEED;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.x = Math.max(PLAYER_R, Math.min(WORLD_W - PLAYER_R, player.x));
    player.y = Math.max(PLAYER_R, Math.min(WORLD_H - PLAYER_R, player.y));

    for (const card of cards) {
      if (card.collected) continue;
      const d = Math.hypot(player.x - card.x, player.y - card.y);
      if (d < COLLECT_DIST + CARD_W * 0.3) {
        card.collected = true;
        collected++;
        hudCollected.textContent = collected;
        spawnParticles(card);
        setTimeout(() => showDetail(card), 300);
      }
    }

    camera.x = player.x - W / 2;
    camera.y = player.y - H / 2;
    camera.x = Math.max(0, Math.min(WORLD_W - W, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_H - H, camera.y));
  }

  function updateParticles(dt) {
    for (const card of cards) {
      for (let i = card.particles.length - 1; i >= 0; i--) {
        const p = card.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.02, dt);
        p.vy *= Math.pow(0.02, dt);
        p.life -= dt * 1.5;
        if (p.life <= 0) card.particles.splice(i, 1);
      }
    }
  }

  // ---- RENDER ----
  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawGrid();
    drawStars();
    ctx.strokeStyle = 'rgba(109, 200, 242, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

    const time = performance.now() / 1000;
    for (const card of cards) {
      if (card.collected) {
        for (const p of card.particles) {
          ctx.globalAlpha = p.life * 0.8;
          ctx.fillStyle = 'hsl(' + p.hue + ', 80%, 70%)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        continue;
      }
      drawCard(card, time);
    }
    drawPlayer(time);
    ctx.restore();
    if (joystick.active) drawJoystick();
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(109, 200, 242, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    const sx = Math.floor(camera.x / gridSize) * gridSize;
    const sy = Math.floor(camera.y / gridSize) * gridSize;
    for (let x = sx; x < camera.x + W + gridSize; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, camera.y); ctx.lineTo(x, camera.y + H); ctx.stroke();
    }
    for (let y = sy; y < camera.y + H + gridSize; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(camera.x, y); ctx.lineTo(camera.x + W, y); ctx.stroke();
    }
  }

  function drawStars() {
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#6dc8f2';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCard(card, time) {
    const pulse = Math.sin(time * 2 + card.pulse) * 3;
    const cx = card.x;
    const cy = card.y + pulse;
    const hw = CARD_W / 2;
    const hh = CARD_H / 2;

    const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, CARD_W);
    grd.addColorStop(0, 'rgba(109, 200, 242, 0.12)');
    grd.addColorStop(1, 'rgba(109, 200, 242, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, CARD_W, 0, Math.PI * 2);
    ctx.fill();

    const r = 12;
    ctx.fillStyle = 'rgba(13, 31, 60, 0.92)';
    ctx.strokeStyle = 'rgba(109, 200, 242, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - hw, cy - hh, CARD_W, CARD_H, r);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cx - hw, cy - hh, CARD_W, CARD_H, r);
    ctx.clip();
    const accentGrd = ctx.createLinearGradient(cx - hw, cy - hh, cx + hw, cy - hh);
    accentGrd.addColorStop(0, '#6dc8f2');
    accentGrd.addColorStop(1, '#c084fc');
    ctx.fillStyle = accentGrd;
    ctx.fillRect(cx - hw, cy - hh, CARD_W, 3);
    ctx.restore();

    ctx.fillStyle = '#6dc8f2';
    ctx.font = '600 9px "Source Sans 3", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(card.data.label, cx - hw + 14, cy - hh + 20);

    ctx.fillStyle = '#f5f5f7';
    ctx.font = '700 13px "Source Sans 3", sans-serif';
    wrapText(ctx, card.data.title, cx - hw + 14, cy - hh + 38, CARD_W - 28, 16);

    const hintAlpha = 0.4 + Math.sin(time * 3 + card.pulse) * 0.3;
    ctx.globalAlpha = hintAlpha;
    ctx.fillStyle = '#6dc8f2';
    ctx.beginPath();
    ctx.arc(cx + hw - 16, cy + hh - 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (context.measureText(test).width > maxWidth && line !== '') {
        context.fillText(line.trim(), x, ly);
        line = word + ' ';
        ly += lineHeight;
      } else {
        line = test;
      }
    }
    context.fillText(line.trim(), x, ly);
  }

  function drawPlayer(time) {
    const px = player.x;
    const py = player.y;
    const bobble = Math.sin(time * 4) * 2;
    const isMoving = Math.hypot(player.vx, player.vy) > 10;

    if (isMoving) {
      const tGrd = ctx.createRadialGradient(px, py + bobble, 2, px, py + bobble, 30);
      tGrd.addColorStop(0, 'rgba(109, 200, 242, 0.25)');
      tGrd.addColorStop(1, 'rgba(109, 200, 242, 0)');
      ctx.fillStyle = tGrd;
      ctx.beginPath();
      ctx.arc(px, py + bobble, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#F47721';
    ctx.beginPath();
    ctx.arc(px, py + bobble, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(px - 3, py + bobble - 4, PLAYER_R * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    const eyeOff = isMoving ? (player.vx > 0 ? 2 : player.vx < 0 ? -2 : 0) : 0;
    ctx.beginPath(); ctx.arc(px - 4 + eyeOff, py + bobble - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 4 + eyeOff, py + bobble - 2, 2.5, 0, Math.PI * 2); ctx.fill();

    if (isMoving) {
      const angle = Math.atan2(player.vy, player.vx);
      ctx.strokeStyle = 'rgba(109, 200, 242, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py + bobble, PLAYER_R + 5, angle - 0.5, angle + 0.5);
      ctx.stroke();
    }
  }

  function drawJoystick() {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(joystick.originX, joystick.originY, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(109, 200, 242, 0.3)';
    ctx.beginPath();
    ctx.arc(joystick.originX + joystick.dx, joystick.originY + joystick.dy, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- MINIMAP ----
  function renderMinimap() {
    const mw = parseInt(mmCanvas.style.width);
    const mh = parseInt(mmCanvas.style.height);
    const sx = mw / WORLD_W;
    const sy = mh / WORLD_H;

    mmCtx.clearRect(0, 0, mw, mh);
    mmCtx.strokeStyle = 'rgba(109, 200, 242, 0.15)';
    mmCtx.lineWidth = 1;
    mmCtx.strokeRect(0.5, 0.5, mw - 1, mh - 1);
    mmCtx.strokeStyle = 'rgba(255,255,255,0.2)';
    mmCtx.strokeRect(camera.x * sx, camera.y * sy, W * sx, H * sy);

    for (const card of cards) {
      mmCtx.fillStyle = card.collected ? 'rgba(109, 200, 242, 0.15)' : '#6dc8f2';
      mmCtx.fillRect(card.x * sx - 1.5, card.y * sy - 1.5, 3, 3);
    }

    mmCtx.fillStyle = '#F47721';
    mmCtx.beginPath();
    mmCtx.arc(player.x * sx, player.y * sy, 3, 0, Math.PI * 2);
    mmCtx.fill();
  }

  // ---- KICK OFF ----
  requestAnimationFrame(loop);

})();
