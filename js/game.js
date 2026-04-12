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
  let meteorsCollected = 0;
  let gameVisible = false; // IntersectionObserver controls this

  // Meteor HUD
  const hudMeteors = document.getElementById('hudMeteors');

  // Meteor burst particles (separate from card particles)
  const meteorBursts = [];

  const player = { x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0 };
  const camera = { x: 0, y: 0 };
  const keys = { up: false, down: false, left: false, right: false };
  const joystick = { active: false, id: null, originX: 0, originY: 0, dx: 0, dy: 0 };

  // Mobile touch hint state
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  let touchHintOpacity = isTouchDevice ? 1 : 0;
  let hasEverMoved = false;

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

  // ---- METEORITES ----
  const METEOR_MAX = 6;
  const METEOR_SPAWN_INTERVAL = 2.5; // seconds between spawn attempts
  let meteorTimer = 0;
  const meteorites = [];

  function spawnMeteorite() {
    if (meteorites.length >= METEOR_MAX) return;
    // Pick a random edge to spawn from (0=top, 1=right, 2=bottom, 3=left)
    const edge = Math.floor(Math.random() * 4);
    const margin = 60;
    let x, y, angle;
    switch (edge) {
      case 0: // top
        x = Math.random() * WORLD_W;
        y = -margin;
        angle = Math.PI * 0.25 + Math.random() * Math.PI * 0.5; // heading downward
        break;
      case 1: // right
        x = WORLD_W + margin;
        y = Math.random() * WORLD_H;
        angle = Math.PI * 0.75 + Math.random() * Math.PI * 0.5; // heading left
        break;
      case 2: // bottom
        x = Math.random() * WORLD_W;
        y = WORLD_H + margin;
        angle = -Math.PI * 0.25 + Math.random() * -Math.PI * 0.5; // heading upward
        break;
      default: // left
        x = -margin;
        y = Math.random() * WORLD_H;
        angle = -Math.PI * 0.25 + Math.random() * Math.PI * 0.5; // heading right
        break;
    }
    const speed = 120 + Math.random() * 180;
    const size = 6 + Math.random() * 10;
    // Build a small trail history
    const trail = [];
    for (let i = 0; i < 12; i++) {
      trail.push({ x: x, y: y });
    }
    meteorites.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
      trail: trail,
      // slight green hue variation per meteorite
      hue: 120 + Math.floor(Math.random() * 30 - 15) // 105-135 range (green)
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
  function clearKeys() {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
  }

  function showDetail(card) {
    paused = true;
    clearKeys();
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
  startBtn.addEventListener('click', () => {
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

  function spawnMeteorBurst(x, y, meteorHue, meteorSize) {
    const count = 14 + Math.floor(meteorSize);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
      const speed = 60 + Math.random() * 200;
      // Mix of green chunks and bright sparks
      const isSpark = Math.random() > 0.5;
      meteorBursts.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isSpark ? 40 : 0),
        life: isSpark ? 0.6 + Math.random() * 0.4 : 0.8 + Math.random() * 0.5,
        r: isSpark ? 1.5 + Math.random() * 2 : 3 + Math.random() * (meteorSize * 0.3),
        hue: meteorHue + Math.floor(Math.random() * 30 - 15),
        lightness: isSpark ? 65 : 30 + Math.random() * 15,
        isSpark: isSpark
      });
    }
    // Add a brief flash ring
    meteorBursts.push({
      x: x, y: y, vx: 0, vy: 0,
      life: 0.4, r: meteorSize * 2,
      hue: meteorHue, lightness: 50,
      isSpark: false, isRing: true
    });
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

    // ---- Update meteorites ----
    meteorTimer += dt;
    if (meteorTimer >= METEOR_SPAWN_INTERVAL) {
      meteorTimer = 0;
      spawnMeteorite();
    }

    const killMargin = 200;
    for (let i = meteorites.length - 1; i >= 0; i--) {
      const m = meteorites[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rotation += m.rotSpeed * dt;

      // Update trail (shift old positions, push current)
      m.trail.shift();
      m.trail.push({ x: m.x, y: m.y });

      // ---- Collision with player ----
      const distToPlayer = Math.hypot(m.x - player.x, m.y - player.y);
      if (distToPlayer < PLAYER_R + m.size) {
        // Burst!
        spawnMeteorBurst(m.x, m.y, m.hue, m.size);
        meteorsCollected++;
        hudMeteors.textContent = meteorsCollected;
        // Pop animation on HUD
        hudMeteors.parentElement.classList.remove('hud-meteor-pop');
        void hudMeteors.parentElement.offsetWidth; // force reflow
        hudMeteors.parentElement.classList.add('hud-meteor-pop');
        meteorites.splice(i, 1);
        continue;
      }

      // Remove if far off-world
      if (m.x < -killMargin || m.x > WORLD_W + killMargin ||
          m.y < -killMargin || m.y > WORLD_H + killMargin) {
        meteorites.splice(i, 1);
      }
    }
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
    // Meteor burst particles
    for (let i = meteorBursts.length - 1; i >= 0; i--) {
      const p = meteorBursts[i];
      if (p.isRing) {
        p.r += dt * 180; // expand ring
        p.life -= dt * 2.5;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.04, dt);
        p.vy *= Math.pow(0.04, dt);
        if (!p.isSpark) p.vy += 60 * dt; // gravity on chunks
        p.life -= dt * (p.isSpark ? 1.8 : 1.2);
      }
      if (p.life <= 0) meteorBursts.splice(i, 1);
    }
  }

  // ---- RENDER ----
  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawGrid();
    drawStars();
    drawMeteors();
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

    // Meteor burst particles
    for (const p of meteorBursts) {
      if (p.isRing) {
        ctx.globalAlpha = p.life * 0.6;
        ctx.strokeStyle = 'hsl(' + p.hue + ', 60%, ' + p.lightness + '%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = p.life * (p.isSpark ? 0.9 : 0.7);
        ctx.fillStyle = 'hsl(' + p.hue + ', 60%, ' + p.lightness + '%)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * Math.max(0.3, p.life), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    ctx.restore();
    if (joystick.active) drawJoystick();
    if (touchHintOpacity > 0 && gameStarted && !paused) drawTouchHint();
  }

  function drawTouchHint() {
    // Fade out once player has moved
    const isMoving = Math.hypot(player.vx, player.vy) > 10;
    if (isMoving && !hasEverMoved) hasEverMoved = true;
    if (hasEverMoved) {
      touchHintOpacity -= 0.02;
      if (touchHintOpacity <= 0) { touchHintOpacity = 0; return; }
    }

    const cx = W * 0.18;
    const cy = H * 0.6;

    ctx.globalAlpha = touchHintOpacity * 0.5;

    // Outer ring
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = 'rgba(109, 200, 242, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    // Arrow hints (up/down/left/right)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const arrows = [
      [cx, cy - 52, 0],         // up
      [cx, cy + 52, Math.PI],   // down
      [cx - 52, cy, -Math.PI/2],// left
      [cx + 52, cy, Math.PI/2]  // right
    ];
    for (const [ax, ay, rot] of arrows) {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 2);
      ctx.lineTo(-5, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Text
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '600 11px "Source Sans 3", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOUCH & DRAG TO MOVE', cx, cy + 80);

    ctx.globalAlpha = 1;
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

  function drawMeteors() {
    for (const m of meteorites) {
      // Draw trail
      const tLen = m.trail.length;
      for (let i = 1; i < tLen; i++) {
        const t0 = m.trail[i - 1];
        const t1 = m.trail[i];
        const progress = i / tLen; // 0 at tail, 1 at head
        ctx.globalAlpha = progress * 0.45;
        ctx.strokeStyle = 'hsl(' + m.hue + ', 60%, ' + (25 + progress * 20) + '%)';
        ctx.lineWidth = m.size * progress * 0.6;
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Draw glow
      const glowGrd = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 3);
      glowGrd.addColorStop(0, 'hsla(' + m.hue + ', 70%, 35%, 0.25)');
      glowGrd.addColorStop(1, 'hsla(' + m.hue + ', 70%, 35%, 0)');
      ctx.fillStyle = glowGrd;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw rocky body (irregular shape via rotated polygon)
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rotation);
      const pts = 7;
      ctx.beginPath();
      for (let j = 0; j < pts; j++) {
        const a = (Math.PI * 2 / pts) * j;
        // Use a seeded wobble per vertex for a craggy look
        const wobble = 0.7 + 0.3 * Math.sin(j * 2.7 + m.size);
        const r = m.size * wobble;
        if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      // Dark green fill with subtle gradient
      const bodyGrd = ctx.createRadialGradient(-m.size * 0.3, -m.size * 0.3, 0, 0, 0, m.size);
      bodyGrd.addColorStop(0, 'hsl(' + m.hue + ', 50%, 32%)');
      bodyGrd.addColorStop(1, 'hsl(' + m.hue + ', 60%, 16%)');
      ctx.fillStyle = bodyGrd;
      ctx.fill();
      ctx.strokeStyle = 'hsl(' + m.hue + ', 55%, 45%)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Highlight spot
      ctx.fillStyle = 'hsla(' + m.hue + ', 40%, 55%, 0.35)';
      ctx.beginPath();
      ctx.arc(-m.size * 0.2, -m.size * 0.2, m.size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
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

    // Meteorites on minimap
    for (const m of meteorites) {
      mmCtx.fillStyle = 'hsl(' + m.hue + ', 60%, 35%)';
      mmCtx.beginPath();
      mmCtx.arc(m.x * sx, m.y * sy, 2, 0, Math.PI * 2);
      mmCtx.fill();
    }
  }

  // ---- KICK OFF ----
  requestAnimationFrame(loop);

})();