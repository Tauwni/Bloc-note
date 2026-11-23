'use strict';
/* =========================================================
   Bloc Note · Salle de jeux (jeux originaux, hors ligne)
   ========================================================= */
(() => {
  const LS = 'bn-games';
  const readAll = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } };
  const getBest = id => readAll()[id];
  const setBest = (id, v) => { try { const o = readAll(); o[id] = v; localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { /* */ } };
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rand = (a, b) => a + Math.random() * (b - a);
  const ri = n => Math.floor(Math.random() * n);
  const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Outils ---------- */
  function makeCanvas(stage, w, h) {
    const c = document.createElement('canvas');
    c.className = 'gcanvas';
    stage.appendChild(c);
    const ctx = c.getContext('2d');
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const s = Math.min(stage.clientWidth / w, stage.clientHeight / h) || 1;
      c.style.width = w * s + 'px'; c.style.height = h * s + 'px';
      c.width = Math.round(w * s * dpr); c.height = Math.round(h * s * dpr);
      ctx.setTransform(c.width / w, 0, 0, c.height / h, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(stage);
    return { c, ctx, scale: () => c.getBoundingClientRect().width / w, destroy: () => ro.disconnect() };
  }
  function loop(fn) {
    let run = true, last = performance.now(), id;
    const f = t => { if (!run) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; fn(dt); id = requestAnimationFrame(f); };
    id = requestAnimationFrame(f);
    return () => { run = false; cancelAnimationFrame(id); };
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  const colors = () => ({ accent: cssVar('--accent') || '#5b5bd6', text: cssVar('--text') || '#1c1c1e', muted: cssVar('--muted') || '#8e8e93', line: cssVar('--line2') || '#ccc', surface: cssVar('--surface') || '#fff', surface2: cssVar('--surface2') || '#f5f5f9', red: '#ff3b30', green: '#34c759', orange: '#ff9500', blue: '#007aff', yellow: '#ffcc00', purple: '#af52de' });

  /* ---------- Dessin partagé ---------- */
  const isDark = () => (getComputedStyle(document.documentElement).colorScheme || '').includes('dark');
  function lg(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16); if (isNaN(n)) return hex;
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }
  /* La mascotte : un petit carnet violet avec des yeux */
  function mascot(ctx, x, y, w, h, t, o = {}) {
    const sq = o.squash || 1, look = o.look || 0, base = o.color || '#6b5cff';
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(2 - sq, sq);
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 2, w * .45, 3.5, 0, 0, 7); ctx.fill(); }
    // pieds
    const step = o.run ? Math.sin(t * 22) * 3 : 0;
    ctx.fillStyle = '#2b2466';
    rr(ctx, -w * .32 + step, -5, 9, 6, 3); ctx.fill();
    rr(ctx, w * .32 - 9 - step, -5, 9, 6, 3); ctx.fill();
    // corps
    ctx.fillStyle = lg(ctx, 0, -h, 0, 0, [[0, shade(base, 40)], [1, shade(base, -25)]]);
    rr(ctx, -w / 2, -h, w, h - 3, 9); ctx.fill();
    // page
    ctx.fillStyle = '#fff';
    rr(ctx, -w / 2 + 4, -h + 6, w - 8, h - 16, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(107,92,255,.18)'; ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 7, -h + 6 + i * (h - 16) / 3 + 6); ctx.lineTo(w / 2 - 7, -h + 6 + i * (h - 16) / 3 + 6); ctx.stroke(); }
    // anneaux
    ctx.fillStyle = '#2b2466';
    for (let i = 0; i < 3; i++) { rr(ctx, -w / 2 + 6 + i * (w - 15) / 2, -h - 3, 3.5, 7, 2); ctx.fill(); }
    // yeux (clignent)
    const blink = (t % 3.2) < 0.12;
    ctx.fillStyle = '#2b2466';
    [-5.5, 5.5].forEach(dx => {
      if (blink) { ctx.fillRect(dx + look - 3, -h + 15, 6, 1.8); return; }
      ctx.beginPath(); ctx.arc(dx + look, -h + 15, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(dx + look + 1, -h + 14, 1, 0, 7); ctx.fill(); ctx.fillStyle = '#2b2466';
    });
    // joues + bouche
    ctx.fillStyle = 'rgba(255,120,150,.55)';
    ctx.beginPath(); ctx.arc(-10 + look, -h + 21, 2.4, 0, 7); ctx.arc(10 + look, -h + 21, 2.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2b2466'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    if (o.scared) ctx.arc(look, -h + 22, 2.4, 0, 7); else ctx.arc(look, -h + 19.5, 3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
  function burst(parts, x, y, col, n = 10, sp = 160) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = rand(sp * .3, sp); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rand(.4, .8), max: .8, r: rand(2, 4.5), col }); } }
  function stepParts(parts, dt, g = 500) { for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += g * dt; p.life -= dt; } return parts.filter(p => p.life > 0); }
  function drawParts(ctx, parts) { for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  function cloud(ctx, x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 14 * s, 0, 7); ctx.arc(x + 16 * s, y - 8 * s, 17 * s, 0, 7); ctx.arc(x + 34 * s, y, 13 * s, 0, 7); ctx.rect(x, y - 2 * s, 34 * s, 15 * s); ctx.fill(); }

  /* =========================================================
     1. Sprint de révision : coureur sans fin
     ========================================================= */
  function runner(api) {
    const W = 640, H = 300, GROUND = 248;
    const cv = makeCanvas(api.stage, W, H), ctx = cv.ctx;
    let state = 'ready', t = 0, dist = 0, spawn = 0.8, obs = [], speed = 340, parts = [], squash = 1, wasAir = false, clock = 0;
    const p = { x: 80, y: 0, vy: 0, w: 34, h: 40 };
    const clouds = [...Array(5)].map((_, i) => ({ x: i * 150 + rand(0, 80), y: rand(30, 110), s: rand(.6, 1.1) }));
    const jump = () => {
      if (state === 'ready') { state = 'run'; api.hideMsg(); }
      if (state === 'run' && p.y <= 0) { p.vy = 700; squash = 1.25; burst(parts, p.x + p.w / 2, GROUND, 'rgba(160,140,110,.7)', 6, 90); }
    };
    api.msg('<b>Sprint de révision</b><span>Saute par-dessus les piles de livres,<br>reste au sol sous les avions en papier.</span><em>Touche l’écran ou appuie sur Espace</em>', jump);
    api.key(e => { if ([' ', 'ArrowUp', 'w', 'z'].includes(e.key)) { e.preventDefault(); jump(); } });
    api.on(api.stage, 'pointerdown', e => { if (!e.target.closest('.gmsg')) jump(); });
    const hills = (off, amp, base, col, f) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, base - Math.sin((x + off) * f) * amp - Math.sin((x + off) * f * 2.3) * amp * .35);
      ctx.lineTo(W, H); ctx.fill();
    };
    const stop = loop(dt => {
      clock += dt;
      const dark = isDark();
      if (state === 'run') {
        t += dt; speed = 340 + t * 11; dist += speed * dt;
        api.setScore(Math.floor(dist / 12));
        p.vy -= 1900 * dt; p.y += p.vy * dt;
        if (p.y <= 0) { p.y = 0; p.vy = 0; if (wasAir) { squash = .78; burst(parts, p.x + p.w / 2, GROUND, 'rgba(160,140,110,.7)', 7, 110); } }
        wasAir = p.y > 0;
        if (!wasAir && Math.random() < dt * 14) parts.push({ x: p.x + 4, y: GROUND - 2, vx: -rand(40, 90), vy: -rand(10, 50), life: .35, max: .35, r: rand(1.5, 3), col: 'rgba(170,150,120,.6)' });
        spawn -= dt;
        if (spawn <= 0) {
          const fly = t > 10 && Math.random() < 0.28;
          obs.push(fly ? { x: W + 30, w: 40, h: 18, fly: true, by: GROUND - 50 } : { x: W + 30, w: rand(22, 40), h: rand(26, 54), fly: false, hue: ri(5) });
          if (!fly && t > 20 && Math.random() < 0.25) obs.push({ x: W + 30 + 52, w: rand(20, 26), h: rand(22, 34), fly: false, hue: ri(5) });
          spawn = rand(0.75, 1.55) - Math.min(0.3, t / 150);
        }
        obs.forEach(o => { o.x -= speed * dt * (o.fly ? 1.15 : 1); });
        obs = obs.filter(o => o.x > -80);
        clouds.forEach(c => { c.x -= speed * dt * 0.08 * c.s; if (c.x < -90) { c.x = W + rand(0, 100); c.y = rand(30, 110); } });
        const px = p.x + 6, py = GROUND - p.y - p.h + 6, pw = p.w - 12, ph = p.h - 8;
        for (const o of obs) {
          const oy = o.fly ? o.by - o.h : GROUND - o.h;
          if (px < o.x + o.w - 4 && px + pw > o.x + 4 && py < oy + o.h - 3 && py + ph > oy + 4) { state = 'over'; burst(parts, p.x + p.w / 2, GROUND - p.y - p.h / 2, '#ff5a7a', 16, 220); api.finish(Math.floor(dist / 12)); break; }
        }
      }
      squash += (1 - squash) * Math.min(1, dt * 12);
      parts = stepParts(parts, dt, 300);
      // ciel
      ctx.fillStyle = dark ? lg(ctx, 0, 0, 0, H, [[0, '#141a3a'], [1, '#3a3f78']]) : lg(ctx, 0, 0, 0, H, [[0, '#7cc4ff'], [0.7, '#cfeaff'], [1, '#fff4e0']]);
      ctx.fillRect(0, 0, W, H);
      // soleil / lune
      ctx.save(); ctx.shadowColor = dark ? '#cfd8ff' : '#ffd166'; ctx.shadowBlur = 40;
      ctx.fillStyle = dark ? '#e8ecff' : '#ffd166'; ctx.beginPath(); ctx.arc(W - 90, 70, 30, 0, 7); ctx.fill(); ctx.restore();
      if (dark) { ctx.fillStyle = '#fff'; for (let i = 0; i < 30; i++) { ctx.globalAlpha = .3 + .5 * Math.abs(Math.sin(clock * 1.5 + i)); ctx.fillRect((i * 97) % W, (i * 53) % 150, 2, 2); } ctx.globalAlpha = 1; }
      clouds.forEach(c => cloud(ctx, c.x, c.y, c.s, dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.9)'));
      hills(dist * .15, 18, GROUND - 40, dark ? '#2b3266' : '#a8dcb0', 0.012);
      hills(dist * .35, 12, GROUND - 14, dark ? '#232a55' : '#7cc98c', 0.02);
      // sol
      ctx.fillStyle = lg(ctx, 0, GROUND, 0, H, dark ? [[0, '#3a7a4c'], [0.18, '#2c5a3a'], [0.2, '#3b2f3f'], [1, '#2a2030']] : [[0, '#5cc46a'], [0.18, '#43a556'], [0.2, '#d9b38c'], [1, '#c49a6c']]);
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = dark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.25)';
      for (let i = 0; i < 24; i++) { const gx = ((i * 53 - dist) % (W + 60) + W + 60) % (W + 60) - 30; ctx.fillRect(gx, GROUND + 20 + (i % 3) * 9, 14 + (i % 4) * 5, 3); }
      // obstacles
      const bookC = ['#ff5a5f', '#4d9bff', '#ffb340', '#3ccf6e', '#b46bff'];
      obs.forEach(o => {
        if (o.fly) {
          const y = o.by - o.h, flap = Math.sin(clock * 16) * 3;
          ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 6;
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(o.x, y + o.h / 2); ctx.lineTo(o.x + o.w, y + flap); ctx.lineTo(o.x + o.w * .62, y + o.h / 2); ctx.lineTo(o.x + o.w, y + o.h - flap); ctx.closePath(); ctx.fill(); ctx.restore();
          ctx.strokeStyle = '#b9c3d9'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(o.x + 2, y + o.h / 2); ctx.lineTo(o.x + o.w * .62, y + o.h / 2); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(o.x + o.w + 4, y + o.h / 2); ctx.lineTo(o.x + o.w + 30, y + o.h / 2); ctx.stroke(); ctx.setLineDash([]);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, GROUND + 2, o.w * .7, 4, 0, 0, 7); ctx.fill();
          const n = Math.max(1, Math.round(o.h / 13)), bh = o.h / n;
          for (let i = 0; i < n; i++) {
            const col = bookC[(o.hue + i) % 5], off = (i % 2 ? 3 : -2), by = GROUND - (i + 1) * bh;
            ctx.fillStyle = lg(ctx, 0, by, 0, by + bh, [[0, shade(col, 30)], [1, shade(col, -20)]]);
            rr(ctx, o.x + off, by, o.w, bh - 1.5, 3); ctx.fill();
            ctx.fillStyle = '#fff7e6'; ctx.fillRect(o.x + off + o.w - 4, by + 2, 3, bh - 5.5);
            ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(o.x + off + 4, by + bh / 2 - 1.5, o.w * .45, 2.5);
          }
        }
      });
      // mascotte
      mascot(ctx, p.x, GROUND - p.y - p.h, p.w, p.h, clock, { squash, run: state === 'run' && p.y <= 0, scared: state === 'over', shadow: p.y < 4 });
      if (p.y > 4) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, GROUND + 2, p.w * .45 * Math.max(.4, 1 - p.y / 160), 3.5, 0, 0, 7); ctx.fill(); }
      drawParts(ctx, parts);
    });
    return () => { stop(); cv.destroy(); };
  }

  /* =========================================================
     2. Serpent
     ========================================================= */
  function snake(api) {
    const N = 17, S = 24, W = N * S;
    const cv = makeCanvas(api.stage, W, W), ctx = cv.ctx;
    let body = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }], prev = body.map(b => ({ ...b })), dir = { x: 1, y: 0 }, queue = [], food, acc = 0, step = 0.14, state = 'ready', score = 0, clock = 0, parts = [], pop = 0;
    const place = () => { do { food = { x: ri(N), y: ri(N) }; } while (body.some(b => b.x === food.x && b.y === food.y)); pop = 0; };
    place();
    const D = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const turn = name => {
      const d = D[name]; if (!d || state === 'over') return;
      if (state === 'ready') { state = 'run'; api.hideMsg(); }
      const last = queue.length ? queue[queue.length - 1] : dir;
      if ((d.x === -last.x && d.y === -last.y) || (d.x === last.x && d.y === last.y)) return;
      if (queue.length < 3) queue.push(d);
    };
    api.msg('<b>Serpent</b><span>Mange les pommes, évite les murs et ta queue.</span><em>Glisse le doigt ou utilise les flèches</em>', () => { state = 'run'; api.hideMsg(); });
    api.key(e => { const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', z: 'up', s: 'down', a: 'left', q: 'left', d: 'right' }[e.key]; if (m) { e.preventDefault(); turn(m); } });
    api.swipe(turn);
    api.pad(turn);
    const stop = loop(dt => {
      clock += dt; pop = Math.min(1, pop + dt * 5);
      if (state === 'run') {
        acc += dt;
        while (acc >= step && state === 'run') {
          acc -= step;
          if (queue.length) dir = queue.shift();
          const h = { x: body[0].x + dir.x, y: body[0].y + dir.y };
          const eat = h.x === food.x && h.y === food.y;
          const hitSelf = body.slice(0, eat ? body.length : body.length - 1).some(b => b.x === h.x && b.y === h.y);
          if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || hitSelf) { state = 'over'; acc = step; burst(parts, body[0].x * S + S / 2, body[0].y * S + S / 2, '#ffd166', 18, 200); api.finish(score); break; }
          prev = body.map(b => ({ ...b }));
          body.unshift(h);
          if (eat) { score++; api.setScore(score); burst(parts, food.x * S + S / 2, food.y * S + S / 2, '#ff4d5e', 14, 170); place(); step = Math.max(0.065, step - 0.0035); try { navigator.vibrate?.(10); } catch (e) { /* */ } }
          else body.pop();
        }
      }
      parts = stepParts(parts, dt, 200);
      const f = state === 'run' ? Math.min(1, acc / step) : 1;
      // plateau
      ctx.fillStyle = lg(ctx, 0, 0, W, W, [[0, '#2f9e55'], [1, '#1f7a40']]); ctx.fillRect(0, 0, W, W);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x * S, y * S, S, S); }
      // pomme
      const fx = food.x * S + S / 2, fy = food.y * S + S / 2 + Math.sin(clock * 4) * 1.5, fr = 8.5 * (0.5 + pop * 0.5);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(fx, food.y * S + S - 3, 7, 2.5, 0, 0, 7); ctx.fill();
      const ag = ctx.createRadialGradient(fx - 3, fy - 3, 1, fx, fy, fr); ag.addColorStop(0, '#ff8a8a'); ag.addColorStop(1, '#e0213a');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 7); ctx.fill();
      ctx.strokeStyle = '#6b3b1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy - fr + 1); ctx.lineTo(fx + 1, fy - fr - 4); ctx.stroke();
      ctx.fillStyle = '#7be07b'; ctx.beginPath(); ctx.ellipse(fx + 5, fy - fr - 2, 4.5, 2.2, -0.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(fx - 3, fy - 3, 2, 0, 7); ctx.fill();
      // serpent (mouvement fluide)
      const pts = body.map((b, i) => { const q = prev[i] || b; return { x: (q.x + (b.x - q.x) * f) * S + S / 2, y: (q.y + (b.y - q.y) * f) * S + S / 2 }; });
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = S * .78;
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x + 2, q.y + 3) : ctx.moveTo(q.x + 2, q.y + 3)); ctx.stroke();
      for (let i = pts.length - 1; i > 0; i--) {
        const k = i / pts.length;
        ctx.strokeStyle = `hsl(${48 - k * 18} 100% ${62 - k * 12}%)`; ctx.lineWidth = S * (0.74 - k * 0.22);
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i - 1].x, pts[i - 1].y); ctx.stroke();
      }
      const h = pts[0];
      ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(h.x, h.y, S * .45, 0, 7); ctx.fill();
      const px = -dir.y, py = dir.x;
      if (state === 'run' && Math.sin(clock * 7) > .6) { ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x + dir.x * S * .4, h.y + dir.y * S * .4); ctx.lineTo(h.x + dir.x * S * .72, h.y + dir.y * S * .72); ctx.stroke(); }
      [-1, 1].forEach(sg => {
        const ex = h.x + dir.x * 4 + px * 5 * sg, ey = h.y + dir.y * 4 + py * 5 * sg;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 3.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(ex + dir.x * 1.3, ey + dir.y * 1.3, state === 'over' ? 0.8 : 2, 0, 7); ctx.fill();
      });
      drawParts(ctx, parts);
    });
    return () => { stop(); cv.destroy(); };
  }

  /* =========================================================
     8. Ascension : saute de nuage en nuage, toujours plus haut
     ========================================================= */
  function jumper(api) {
    const W = 360, H = 600;
    const cv = makeCanvas(api.stage, W, H), ctx = cv.ctx;
    let state = 'ready', plats = [], parts = [], cam = 0, top = 0, clock = 0, keys = {}, target = null, squash = 1;
    const p = { x: W / 2 - 17, y: H - 120, w: 34, h: 40, vx: 0, vy: 0, face: 0 };
    const stars = [...Array(60)].map(() => ({ x: rand(0, W), y: rand(0, H), r: rand(.5, 1.6), s: rand(.1, .4) }));
    const bgClouds = [...Array(6)].map(() => ({ x: rand(-40, W), y: rand(0, H), s: rand(.5, 1.2), sp: rand(.15, .35) }));
    const kind = h => { const r = Math.random(), lvl = Math.min(1, h / 6000); if (r < 0.06 + lvl * .06) return 'spring'; if (r < 0.18 + lvl * .2) return 'move'; if (r < 0.26 + lvl * .18) return 'break'; return 'cloud'; };
    const add = y => { const k = plats.length < 6 ? 'cloud' : kind(-y); plats.push({ x: rand(10, W - 80), y, w: 70, h: 16, k, vx: k === 'move' ? (Math.random() < .5 ? -1 : 1) * rand(50, 100) : 0, broken: false, fall: 0, spr: 0 }); };
    for (let y = H - 40; y > -H; y -= rand(58, 90)) add(y);
    plats[0].x = W / 2 - 35;
    const begin = () => { if (state === 'ready') { state = 'run'; api.hideMsg(); p.vy = -760; } };
    api.msg('<b>Ascension</b><span>Rebondis de nuage en nuage, le plus haut possible.<br>Ressorts : super saut · nuages gris : ils cèdent !</span><em>Glisse le doigt à gauche / droite ou flèches</em>', begin);
    const toX = e => { const r = cv.c.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
    api.on(api.stage, 'pointerdown', e => { if (e.target.closest('.gmsg')) return; begin(); target = toX(e); });
    api.on(api.stage, 'pointermove', e => { if (e.buttons || e.pointerType === 'mouse') target = toX(e); });
    api.on(api.stage, 'pointerup', e => { if (e.pointerType !== 'mouse') target = null; });
    api.key(e => { if (['ArrowLeft', 'ArrowRight', 'q', 'd', 'a'].includes(e.key)) { e.preventDefault(); keys[e.key] = true; target = null; begin(); } if (e.key === ' ') { e.preventDefault(); begin(); } });
    api.keyup(e => { keys[e.key] = false; });
    const stop = loop(dt => {
      clock += dt;
      if (state === 'run') {
        let ax = 0;
        if (keys.ArrowLeft || keys.q || keys.a) ax = -1;
        if (keys.ArrowRight || keys.d) ax = 1;
        if (ax) p.vx += (ax * 360 - p.vx) * Math.min(1, dt * 10);
        else if (target != null) { const dx = target - (p.x + p.w / 2); p.vx += (Math.max(-380, Math.min(380, dx * 6)) - p.vx) * Math.min(1, dt * 10); }
        else p.vx *= Math.pow(0.02, dt);
        if (Math.abs(p.vx) > 20) p.face = Math.sign(p.vx) * 2;
        p.vy += 1500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x + p.w / 2 < 0) p.x += W; if (p.x + p.w / 2 > W) p.x -= W;
        for (const q of plats) {
          if (q.k === 'move') { q.x += q.vx * dt; if (q.x < 4 || q.x + q.w > W - 4) q.vx *= -1; }
          if (q.broken) { q.fall += dt; q.y += 420 * dt; continue; }
          const feet = p.y + p.h, prevFeet = feet - p.vy * dt;
          if (p.vy > 0 && prevFeet <= q.y + 4 && feet >= q.y && p.x + p.w - 6 > q.x && p.x + 6 < q.x + q.w) {
            if (q.k === 'break') { q.broken = true; burst(parts, q.x + q.w / 2, q.y + 6, '#b9bccc', 12, 120); continue; }
            p.y = q.y - p.h; p.vy = q.k === 'spring' ? -1180 : -760; squash = .72;
            if (q.k === 'spring') { q.spr = 1; burst(parts, p.x + p.w / 2, q.y, '#ffd166', 12, 180); try { navigator.vibrate?.(12); } catch (e) { /* */ } }
            else burst(parts, p.x + p.w / 2, q.y + 4, 'rgba(255,255,255,.9)', 6, 80);
          }
          q.spr = Math.max(0, q.spr - dt * 4);
        }
        const line = H * 0.42;
        if (p.y < line) {
          const d = line - p.y; p.y = line; cam += d;
          plats.forEach(q => { q.y += d; }); parts.forEach(q => { q.y += d; });
          stars.forEach(s => { s.y += d * s.s; if (s.y > H) { s.y -= H; s.x = rand(0, W); } });
          bgClouds.forEach(c => { c.y += d * c.sp; if (c.y > H + 30) { c.y = -30; c.x = rand(-40, W); } });
        }
        top = Math.max(top, Math.floor(cam / 10)); api.setScore(top);
        plats = plats.filter(q => q.y < H + 40);
        let minY = Math.min(...plats.map(q => q.y));
        const gap = Math.min(150, 62 + cam / 120);
        while (minY > -40) { minY -= rand(gap * .65, gap); add(minY); }
        if (p.y > H + 20) { state = 'over'; api.finish(top); }
      }
      squash += (1 - squash) * Math.min(1, dt * 10);
      parts = stepParts(parts, dt, 400);
      // ciel qui change avec l'altitude
      const k = Math.min(1, cam / 8000);
      const mix = (a, b) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
      ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, mix([110, 190, 255], [20, 18, 60])], [1, mix([225, 242, 255], [70, 50, 130])]]);
      ctx.fillRect(0, 0, W, H);
      stars.forEach(s => { ctx.globalAlpha = k * (.4 + .6 * Math.abs(Math.sin(clock + s.x))); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      bgClouds.forEach(c => cloud(ctx, c.x, c.y, c.s, `rgba(255,255,255,${0.35 - k * 0.25})`));
      // plateformes
      for (const q of plats) {
        if (q.broken && q.fall > .6) continue;
        ctx.save();
        if (q.broken) { ctx.globalAlpha = Math.max(0, 1 - q.fall * 1.8); ctx.translate(q.x + q.w / 2, q.y); ctx.rotate(q.fall * .8); ctx.translate(-q.x - q.w / 2, -q.y); }
        ctx.shadowColor = 'rgba(0,30,80,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5;
        const col = q.k === 'move' ? ['#d9f0ff', '#8fd0ff'] : q.k === 'break' ? ['#e4e5ee', '#a9abbd'] : ['#ffffff', '#e3ecff'];
        ctx.fillStyle = lg(ctx, 0, q.y - 6, 0, q.y + q.h, [[0, col[0]], [1, col[1]]]);
        ctx.beginPath(); ctx.arc(q.x + 14, q.y + 6, 11, 0, 7); ctx.arc(q.x + 32, q.y + 1, 14, 0, 7); ctx.arc(q.x + 52, q.y + 6, 12, 0, 7); ctx.fill(); rr(ctx, q.x + 2, q.y + 4, q.w - 4, 12, 6); ctx.fill();
        ctx.restore();
        if (q.k === 'break' && !q.broken) { ctx.strokeStyle = 'rgba(90,90,120,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x + 26, q.y - 4); ctx.lineTo(q.x + 32, q.y + 6); ctx.lineTo(q.x + 28, q.y + 14); ctx.stroke(); }
        if (q.k === 'spring') {
          const sh = 10 + q.spr * 8, sx = q.x + q.w / 2 - 9;
          ctx.strokeStyle = '#8a8fa8'; ctx.lineWidth = 2.5; ctx.beginPath();
          for (let i = 0; i <= 4; i++) ctx.lineTo(sx + (i % 2 ? 18 : 0), q.y - 2 - i * sh / 4);
          ctx.stroke();
          ctx.fillStyle = '#ff5a7a'; rr(ctx, sx - 3, q.y - 6 - sh, 24, 6, 3); ctx.fill();
        }
      }
      drawParts(ctx, parts);
      // mascotte (en double sur les bords pour le passage d'un côté à l'autre)
      const draw = x => mascot(ctx, x, p.y, p.w, p.h, clock, { squash: p.vy < -900 ? 1.18 : squash, look: p.face, shadow: false, scared: state === 'over' });
      draw(p.x); if (p.x < 0) draw(p.x + W); if (p.x + p.w > W) draw(p.x - W);
      // altitude
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '700 13px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${top} m`, 12, 22);
    });
    return () => { stop(); cv.destroy(); };
  }

  /* =========================================================
     3. Fusion : fais glisser les tuiles pour les additionner
     ========================================================= */
  function fusion(api) {
    let g = [...Array(16)].fill(0), score = 0, won = false, fresh = new Set(), merged = new Set();
    const box = document.createElement('div'); box.className = 'g-fusion'; api.stage.appendChild(box);
    const add = () => { const e = g.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (!e.length) return; const i = e[ri(e.length)]; g[i] = Math.random() < .9 ? 2 : 4; fresh.add(i); };
    const PALF = { 2: ['#f3f1ff', '#3b3470'], 4: ['#e2ddff', '#3b3470'], 8: ['#ffc078', '#fff'], 16: ['#ff9f5a', '#fff'], 32: ['#ff7a6b', '#fff'], 64: ['#ff4d6d', '#fff'], 128: ['#ffd23f', '#5a4300'], 256: ['#ffc300', '#5a4300'], 512: ['#3ddc97', '#fff'], 1024: ['#2ec4f1', '#fff'], 2048: ['#7b6cff', '#fff'] };
    const color = v => (PALF[v] || ['#2b2466', '#fff']);
    const draw = () => {
      box.innerHTML = g.map((v, i) => `<div class="cell">${v ? `<div class="tile ${fresh.has(i) ? 'new' : ''} ${merged.has(i) ? 'merged' : ''} ${v >= 1024 ? 'xl' : v >= 128 ? 'l' : ''}" style="--t1:${color(v)[0]};color:${color(v)[1]}">${v}</div>` : ''}</div>`).join('');
      fresh = new Set(); merged = new Set();
    };
    const lines = dir => { const L = []; for (let a = 0; a < 4; a++) { const l = []; for (let b = 0; b < 4; b++) { const [r, c] = dir === 'left' ? [a, b] : dir === 'right' ? [a, 3 - b] : dir === 'up' ? [b, a] : [3 - b, a]; l.push(r * 4 + c); } L.push(l); } return L; };
    const canMove = () => g.includes(0) || g.some((v, i) => (i % 4 < 3 && v === g[i + 1]) || (i < 12 && v === g[i + 4]));
    const move = dir => {
      if (!['left', 'right', 'up', 'down'].includes(dir)) return;
      let moved = false;
      for (const l of lines(dir)) {
        const vals = l.map(i => g[i]).filter(Boolean), out = [];
        const mIdx = [];
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); score += vals[i] * 2; mIdx.push(out.length - 1); if (vals[i] * 2 === 2048 && !won) { won = true; setTimeout(() => api.toast('2048 atteint, bravo ! Continue…'), 200); } i++; }
          else out.push(vals[i]);
        }
        while (out.length < 4) out.push(0);
        l.forEach((idx, k) => { if (g[idx] !== out[k]) moved = true; g[idx] = out[k]; });
        mIdx.forEach(k => merged.add(l[k]));
      }
      if (!moved) return;
      add(); api.setScore(score); draw();
      if (!canMove()) setTimeout(() => api.finish(score), 450);
    };
    add(); add(); draw();
    api.key(e => { const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key]; if (m) { e.preventDefault(); move(m); } });
    api.swipe(move);
    return () => { };
  }

  /* =========================================================
     4. Démineur
     ========================================================= */
  function mines(api) {
    const R = 9, Cn = 9, M = 10;
    let cells = [], started = false, over = false, flagMode = false, time = 0, timer = null, revealed = 0;
    const box = document.createElement('div'); box.className = 'g-mines'; api.stage.appendChild(box);
    const tools = document.createElement('div'); tools.className = 'gtools';
    tools.innerHTML = `<button class="btn sm" id="mMode">⛏️ Creuser</button><span class="gsmall" id="mLeft">🚩 ${M}</span>`;
    api.stage.appendChild(tools);
    const reset = () => { cells = [...Array(R * Cn)].map(() => ({ m: false, n: 0, open: false, flag: false })); };
    reset();
    const nb = i => { const r = Math.floor(i / Cn), c = i % Cn, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr2 = r + dr, cc = c + dc; if (rr2 >= 0 && rr2 < R && cc >= 0 && cc < Cn) out.push(rr2 * Cn + cc); } return out; };
    const seed = safe => {
      const ban = new Set([safe, ...nb(safe)]); let k = 0;
      while (k < M) { const i = ri(R * Cn); if (!cells[i].m && !ban.has(i)) { cells[i].m = true; k++; } }
      cells.forEach((c, i) => { c.n = nb(i).filter(j => cells[j].m).length; });
    };
    const draw = () => {
      box.innerHTML = cells.map((c, i) => `<button class="mc ${c.open ? 'open' : ''} ${c.open && c.m ? 'boom' : ''}" data-i="${i}" data-n="${c.open && !c.m ? c.n : ''}">${c.open ? (c.m ? '💣' : c.n || '') : c.flag ? '🚩' : ''}</button>`).join('');
      $('#mLeft', tools).textContent = `🚩 ${M - cells.filter(c => c.flag).length}`;
    };
    function $(s, r) { return r.querySelector(s); }
    const open = i => {
      const c = cells[i]; if (c.open || c.flag) return;
      c.open = true; revealed++;
      if (c.m) return;
      if (!c.n) nb(i).forEach(open);
    };
    const act = (i, flag) => {
      if (over) return;
      const c = cells[i];
      if (flag) { if (!c.open) { c.flag = !c.flag; try { navigator.vibrate?.(15); } catch (e) { /* */ } } draw(); return; }
      if (c.flag) return;
      if (!started) { started = true; seed(i); timer = setInterval(() => { time++; api.setScore(time + ' s'); }, 1000); }
      if (c.open && c.n) { // ouvrir les voisins si les drapeaux correspondent
        const n = nb(i); if (n.filter(j => cells[j].flag).length === c.n) n.forEach(j => { if (!cells[j].flag) { open(j); if (cells[j].m) lose(); } });
      } else { open(i); if (c.m) return lose(); }
      draw();
      if (!over && cells.filter(x => x.open).length === R * Cn - M) { over = true; clearInterval(timer); cells.forEach(x => { if (x.m) x.flag = true; }); draw(); setTimeout(() => api.finish(time, { label: time + ' s' }), 300); }
    };
    const lose = () => { over = true; clearInterval(timer); cells.forEach(x => { if (x.m) x.open = true; }); draw(); box.classList.add('shake'); setTimeout(() => api.finish(null, { lost: true }), 700); };
    let pressT = null, longDone = false;
    api.on(box, 'pointerdown', e => { const b = e.target.closest('.mc'); if (!b) return; longDone = false; pressT = setTimeout(() => { longDone = true; act(+b.dataset.i, true); }, 420); });
    api.on(box, 'pointerup', e => { clearTimeout(pressT); const b = e.target.closest('.mc'); if (!b || longDone) return; act(+b.dataset.i, flagMode); });
    api.on(box, 'pointerleave', () => clearTimeout(pressT));
    api.on(box, 'contextmenu', e => { e.preventDefault(); const b = e.target.closest('.mc'); if (b && !longDone) act(+b.dataset.i, true); });
    api.on($('#mMode', tools), 'click', () => { flagMode = !flagMode; $('#mMode', tools).textContent = flagMode ? '🚩 Drapeau' : '⛏️ Creuser'; $('#mMode', tools).classList.toggle('primary', flagMode); });
    api.setScore('0 s');
    draw();
    return () => clearInterval(timer);
  }

  /* =========================================================
     5. Casse-briques
     ========================================================= */
  function bricks(api) {
    const W = 400, H = 560;
    const cv = makeCanvas(api.stage, W, H), ctx = cv.ctx;
    let pad = { x: W / 2, w: 86, y: H - 40 }, ball, bricksA = [], lives = 3, score = 0, level = 1, state = 'ready', keys = {}, parts = [], trail = [], clock = 0, shake = 0;
    const stars = [...Array(50)].map(() => ({ x: rand(0, W), y: rand(0, H), r: rand(.4, 1.4), p: rand(0, 6) }));
    const resetBall = () => { ball = { x: pad.x, y: pad.y - 12, vx: 0, vy: 0, r: 7, stuck: true }; trail = []; };
    const PAL = ['#ff4d6d', '#ff8c42', '#ffd23f', '#3ddc97', '#2ec4f1', '#7b6cff', '#c86bfa', '#ff5fa2'];
    const build = () => {
      bricksA = []; const rows = Math.min(8, 4 + level), cols = 8, bw = (W - 40) / cols;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (level > 2 && (r + c + level) % 7 === 0) continue;
        bricksA.push({ x: 20 + c * bw + 2, y: 70 + r * 24, w: bw - 4, h: 18, col: PAL[r % PAL.length], hp: r < level - 1 ? 2 : 1, hit: 0 });
      }
    };
    build(); resetBall();
    const launch = () => { if (state === 'ready') { state = 'run'; api.hideMsg(); } if (ball.stuck && state === 'run') { const sp = 340 + level * 25; ball.stuck = false; ball.vx = rand(-0.5, 0.5) * sp; ball.vy = -Math.sqrt(sp * sp - ball.vx * ball.vx); } };
    api.msg('<b>Casse-briques</b><span>Déplace la raquette et casse toutes les briques.<br>Tu as 3 vies.</span><em>Touche pour lancer la balle</em>', launch);
    const toX = e => { const r = cv.c.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
    api.on(api.stage, 'pointermove', e => { pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, toX(e))); });
    api.on(api.stage, 'pointerdown', e => { if (e.target.closest('.gmsg')) return; pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, toX(e))); launch(); });
    api.key(e => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); launch(); } keys[e.key] = true; });
    api.keyup(e => { keys[e.key] = false; });
    const heart = (x, y, s, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + s * .3); ctx.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3); ctx.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .8, x, y + s); ctx.bezierCurveTo(x, y + s * .8, x + s * .5, y + s * .6, x + s * .5, y + s * .3); ctx.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3); ctx.fill(); };
    const stop = loop(dt => {
      clock += dt; shake = Math.max(0, shake - dt * 30);
      if (keys.ArrowLeft) pad.x -= 540 * dt; if (keys.ArrowRight) pad.x += 540 * dt;
      pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, pad.x));
      if (state === 'run') {
        if (ball.stuck) { ball.x = pad.x; ball.y = pad.y - 12; }
        else {
          const steps = 3;
          for (let s = 0; s < steps; s++) {
            ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
            if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
            if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
            if (ball.y < ball.r + 40) { ball.y = ball.r + 40; ball.vy = Math.abs(ball.vy); }
            if (ball.vy > 0 && ball.y + ball.r >= pad.y && ball.y + ball.r <= pad.y + 16 && Math.abs(ball.x - pad.x) <= pad.w / 2 + ball.r) {
              const sp = Math.hypot(ball.vx, ball.vy) * 1.012, kk = (ball.x - pad.x) / (pad.w / 2), a = kk * 1.05;
              ball.vx = sp * Math.sin(a); ball.vy = -Math.abs(sp * Math.cos(a)); ball.y = pad.y - ball.r;
              burst(parts, ball.x, pad.y, 'rgba(160,150,255,.9)', 5, 90);
            }
            for (const b of bricksA) {
              if (b.hp <= 0) continue;
              const cx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), cy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
              if ((ball.x - cx) ** 2 + (ball.y - cy) ** 2 <= ball.r * ball.r) {
                const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r)), oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
                if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
                b.hp--; b.hit = 1; score += 10; api.setScore(score);
                if (b.hp <= 0) { burst(parts, b.x + b.w / 2, b.y + b.h / 2, b.col, 14, 180); shake = 3; }
                break;
              }
            }
          }
          trail.push({ x: ball.x, y: ball.y }); if (trail.length > 10) trail.shift();
          if (ball.y > H + 20) {
            lives--; shake = 6;
            if (lives <= 0) { state = 'over'; api.finish(score); } else resetBall();
          }
          if (bricksA.every(b => b.hp <= 0)) { level++; score += 100; api.setScore(score); api.toast(`Niveau ${level} !`); build(); resetBall(); }
        }
      }
      bricksA.forEach(b => { b.hit = Math.max(0, b.hit - dt * 6); });
      parts = stepParts(parts, dt, 380);
      ctx.save();
      if (shake) ctx.translate(rand(-shake, shake), rand(-shake, shake));
      ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#1b1446'], [1, '#0a0a1f']]); ctx.fillRect(-10, -10, W + 20, H + 20);
      stars.forEach(s => { ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(clock * 1.3 + s.p)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      // HUD
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, 0, W, 38);
      ctx.fillStyle = '#c9c4ff'; ctx.font = '700 14px -apple-system, system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(`NIVEAU ${level}`, 14, 20);
      for (let i = 0; i < 3; i++) heart(W - 22 - i * 22, 12, 15, i < lives ? '#ff4d6d' : 'rgba(255,255,255,.15)');
      // briques
      bricksA.forEach(b => {
        if (b.hp <= 0) return;
        ctx.save(); ctx.shadowColor = b.col; ctx.shadowBlur = 12 + b.hit * 14;
        ctx.fillStyle = lg(ctx, 0, b.y, 0, b.y + b.h, [[0, shade(b.col, 45)], [1, shade(b.col, -15)]]);
        rr(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill(); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, b.x + 3, b.y + 2, b.w - 6, 4, 2); ctx.fill();
        if (b.hp > 1) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; rr(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 5); ctx.stroke(); }
      });
      drawParts(ctx, parts);
      // traînée + balle
      trail.forEach((q, i) => { ctx.globalAlpha = i / trail.length * .35; ctx.fillStyle = '#a99cff'; ctx.beginPath(); ctx.arc(q.x, q.y, ball.r * (i / trail.length), 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill(); ctx.restore();
      // raquette
      ctx.save(); ctx.shadowColor = '#7b6cff'; ctx.shadowBlur = 18;
      ctx.fillStyle = lg(ctx, 0, pad.y, 0, pad.y + 14, [[0, '#a99cff'], [1, '#5b4fe0']]);
      rr(ctx, pad.x - pad.w / 2, pad.y, pad.w, 14, 7); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(ctx, pad.x - pad.w / 2 + 8, pad.y + 2, pad.w - 16, 3, 2); ctx.fill();
      ctx.restore();
    });
    return () => { stop(); cv.destroy(); };
  }

  /* =========================================================
     6. Mémoire : retrouve les paires
     ========================================================= */
  function memory(api) {
    const icons = ['🍎', '🚀', '🎧', '📚', '⚽', '🌙', '🎲', '🌵'];
    const deck = [...icons, ...icons].map(v => ({ v, open: false, done: false })).sort(() => Math.random() - .5);
    let first = null, lock = false, moves = 0, found = 0;
    const box = document.createElement('div'); box.className = 'g-memory'; api.stage.appendChild(box);
    box.innerHTML = deck.map((c, i) => `<button class="card3d" data-i="${i}" aria-label="Carte"><span class="face back"></span><span class="face front">${c.v}</span></button>`).join('');
    api.setScore('0 coup');
    api.on(box, 'click', e => {
      const b = e.target.closest('.card3d'); if (!b || lock) return;
      const i = +b.dataset.i, c = deck[i]; if (c.open || c.done) return;
      c.open = true; b.classList.add('flip');
      if (first === null) { first = i; return; }
      moves++; api.setScore(moves + (moves > 1 ? ' coups' : ' coup'));
      const a = deck[first], bEl = box.children[first];
      if (a.v === c.v) {
        a.done = c.done = true; found++; first = null;
        setTimeout(() => { bEl.classList.add('ok'); b.classList.add('ok'); }, 250);
        if (found === icons.length) setTimeout(() => api.finish(moves, { label: moves + ' coups' }), 700);
      } else {
        lock = true; const f = first; first = null;
        setTimeout(() => { deck[f].open = c.open = false; bEl.classList.remove('flip'); b.classList.remove('flip'); lock = false; }, 750);
      }
    });
    return () => { };
  }

  /* =========================================================
     7. Morpion contre l'ordinateur
     ========================================================= */
  function tictac(api) {
    let b = Array(9).fill(''), streak = 0, busy = false;
    const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const box = document.createElement('div'); box.className = 'g-ttt'; api.stage.appendChild(box);
    const info = document.createElement('div'); info.className = 'gtools'; info.innerHTML = '<span class="gsmall" id="tInfo">À toi de jouer (✕)</span>'; api.stage.appendChild(info);
    const win = (bb) => { for (const l of L) { const [x, y, z] = l; if (bb[x] && bb[x] === bb[y] && bb[x] === bb[z]) return { w: bb[x], l }; } return bb.every(Boolean) ? { w: 'draw' } : null; };
    const mm = (bb, me) => {
      const r = win(bb); if (r) return { s: r.w === 'O' ? 10 : r.w === 'X' ? -10 : 0 };
      let best = { s: me === 'O' ? -99 : 99, i: -1 };
      bb.forEach((v, i) => { if (v) return; bb[i] = me; const s = mm(bb, me === 'O' ? 'X' : 'O').s * 0.9; bb[i] = ''; if (me === 'O' ? s > best.s : s < best.s) best = { s, i }; });
      return best;
    };
    const draw = (hl = []) => { box.innerHTML = b.map((v, i) => `<button class="tc ${v ? 'set' : ''} ${hl.includes(i) ? 'hl' : ''}" data-i="${i}">${v === 'X' ? '<span class="x">✕</span>' : v === 'O' ? '<span class="o">◯</span>' : ''}</button>`).join(''); };
    const say = t => { info.querySelector('#tInfo').textContent = t; };
    const end = r => {
      busy = true; draw(r.l || []);
      if (r.w === 'X') { streak++; api.setScore(streak); say('Gagné ! Nouvelle manche…'); setTimeout(next, 1300); }
      else if (r.w === 'draw') { say('Match nul. Nouvelle manche…'); setTimeout(next, 1300); }
      else { say('L’ordinateur gagne.'); setTimeout(() => api.finish(streak, { label: streak + ' victoire' + (streak > 1 ? 's' : '') + ' d’affilée' }), 900); }
    };
    const next = () => { b = Array(9).fill(''); busy = false; draw(); say('À toi de jouer (✕)'); if (Math.random() < .4) { busy = true; setTimeout(ai, 350); } };
    const ai = () => {
      const free = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      const i = Math.random() < 0.22 ? free[ri(free.length)] : mm(b, 'O').i;
      b[i] = 'O'; const r = win(b); if (r) return end(r); busy = false; draw(); say('À toi de jouer (✕)');
    };
    api.on(box, 'click', e => {
      const c = e.target.closest('.tc'); if (!c || busy) return;
      const i = +c.dataset.i; if (b[i]) return;
      b[i] = 'X'; draw(); const r = win(b); if (r) return end(r);
      busy = true; say('L’ordinateur réfléchit…'); setTimeout(ai, 420);
    });
    api.setScore(0); draw();
    return () => { };
  }

  /* ---------- Catalogue ---------- */
  const ART = {
    jumper: '<circle cx="47" cy="15" r="6" fill="#ffd166"/><path d="M8 50a7 7 0 0 1 12-5 8 8 0 0 1 14 2 6 6 0 0 1 0 12H10a5 5 0 0 1-2-9z" fill="#fff"/><path d="M30 30a6 6 0 0 1 10-4 6 6 0 0 1 10 2 5 5 0 0 1 0 9H32a4 4 0 0 1-2-7z" fill="#fff" opacity=".8"/><rect x="18" y="20" width="14" height="17" rx="4" fill="#6b5cff" stroke="#fff" stroke-width="2"/><circle cx="23" cy="27" r="1.6" fill="#fff"/><circle cx="28" cy="27" r="1.6" fill="#fff"/>',
    runner: '<rect x="14" y="16" width="20" height="24" rx="4" fill="#fff"/><circle cx="21" cy="25" r="2" fill="#2b2466"/><circle cx="28" cy="25" r="2" fill="#2b2466"/><rect x="40" y="30" width="12" height="5" rx="2" fill="#ffd166"/><rect x="38" y="35" width="14" height="5" rx="2" fill="#ff8fab"/><rect x="40" y="40" width="12" height="5" rx="2" fill="#9bf6ff"/><rect x="6" y="45" width="52" height="2" rx="1" fill="#fff" opacity=".7"/>',
    snake: '<rect x="12" y="34" width="10" height="10" rx="3" fill="#fff" opacity=".6"/><rect x="22" y="34" width="10" height="10" rx="3" fill="#fff" opacity=".75"/><rect x="32" y="34" width="10" height="10" rx="3" fill="#fff" opacity=".9"/><rect x="32" y="24" width="10" height="10" rx="3" fill="#fff"/><circle cx="35" cy="28" r="1.6" fill="#145c2c"/><circle cx="39" cy="28" r="1.6" fill="#145c2c"/><circle cx="47" cy="17" r="5" fill="#ff5a5f"/>',
    fusion: '<rect x="10" y="10" width="20" height="20" rx="5" fill="#fff" opacity=".95"/><rect x="34" y="10" width="20" height="20" rx="5" fill="#fff" opacity=".55"/><rect x="10" y="34" width="20" height="20" rx="5" fill="#fff" opacity=".55"/><rect x="34" y="34" width="20" height="20" rx="5" fill="#ffd166"/><text x="20" y="25" font-size="11" font-weight="800" text-anchor="middle" fill="#7a4b00" font-family="system-ui">2</text><text x="44" y="49" font-size="10" font-weight="800" text-anchor="middle" fill="#7a4b00" font-family="system-ui">64</text>',
    mines: '<g fill="#fff" opacity=".35"><rect x="8" y="8" width="14" height="14" rx="3"/><rect x="25" y="8" width="14" height="14" rx="3"/><rect x="42" y="8" width="14" height="14" rx="3"/><rect x="8" y="25" width="14" height="14" rx="3"/><rect x="8" y="42" width="14" height="14" rx="3"/><rect x="42" y="42" width="14" height="14" rx="3"/></g><circle cx="38" cy="38" r="8" fill="#1c1c1e"/><path d="M38 26v4M38 46v4M26 38h4M46 38h4" stroke="#1c1c1e" stroke-width="2.5" stroke-linecap="round"/><circle cx="35" cy="35" r="2" fill="#fff"/><path d="M48 12v12" stroke="#fff" stroke-width="2"/><path d="M48 12l7 3-7 3z" fill="#ff5a5f"/>',
    bricks: '<g><rect x="8" y="10" width="14" height="7" rx="2" fill="#ff5a5f"/><rect x="25" y="10" width="14" height="7" rx="2" fill="#ffd166"/><rect x="42" y="10" width="14" height="7" rx="2" fill="#06d6a0"/><rect x="8" y="20" width="14" height="7" rx="2" fill="#9bf6ff"/><rect x="42" y="20" width="14" height="7" rx="2" fill="#ff8fab"/></g><circle cx="30" cy="38" r="4" fill="#fff"/><rect x="18" y="49" width="26" height="5" rx="2.5" fill="#fff"/>',
    memory: '<rect x="10" y="14" width="20" height="28" rx="4" fill="#fff" transform="rotate(-8 20 28)"/><rect x="32" y="18" width="20" height="28" rx="4" fill="#fff" opacity=".85" transform="rotate(8 42 32)"/><text x="20" y="33" font-size="13" text-anchor="middle" transform="rotate(-8 20 28)">🚀</text><text x="42" y="37" font-size="13" text-anchor="middle" transform="rotate(8 42 32)">🚀</text>',
    tictac: '<path d="M24 8v48M40 8v48M8 24h48M8 40h48" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="M11 11l9 9M20 11l-9 9" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="32" cy="32" r="5" stroke="#ffd166" stroke-width="3.5" fill="none"/><path d="M44 44l9 9M53 44l-9 9" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>'
  };
  const GAMES = [
    { id: 'runner', name: 'Sprint de révision', tag: 'Arcade', desc: 'Cours, saute les piles de livres, évite les avions en papier.', grad: ['#7b6cff', '#4b3fd6'], run: runner, unit: 'pts', help: 'Espace / toucher : sauter' },
    { id: 'jumper', name: 'Ascension', tag: 'Nouveau', desc: 'Rebondis de nuage en nuage et grimpe le plus haut possible.', grad: ['#5ec8ff', '#3a6cf0'], run: jumper, unit: 'm', help: 'Glisse le doigt / flèches : se déplacer' },
    { id: 'snake', name: 'Serpent', tag: 'Classique', desc: 'Grandis en mangeant les pommes sans te mordre la queue.', grad: ['#34c759', '#1f8f43'], run: snake, unit: 'pommes', help: 'Flèches / glisser le doigt' },
    { id: 'fusion', name: 'Fusion', tag: 'Réflexion', desc: 'Fais glisser les tuiles : deux nombres égaux fusionnent.', grad: ['#ffb340', '#ff7a00'], run: fusion, unit: 'pts', help: 'Flèches / glisser le doigt' },
    { id: 'mines', name: 'Démineur', tag: 'Réflexion', desc: 'Dégage la grille sans tomber sur une mine.', grad: ['#8e8e93', '#48484a'], run: mines, low: true, unit: 's', help: 'Toucher : creuser · appui long ou clic droit : drapeau' },
    { id: 'bricks', name: 'Casse-briques', tag: 'Arcade', desc: 'Renvoie la balle et casse toutes les briques, niveau après niveau.', grad: ['#ff5a7a', '#d61f4f'], run: bricks, unit: 'pts', help: 'Glisser / flèches : raquette · toucher : lancer' },
    { id: 'memory', name: 'Mémoire', tag: 'Détente', desc: 'Retourne les cartes et retrouve les 8 paires.', grad: ['#32ade6', '#0a6fb8'], run: memory, low: true, unit: 'coups', help: 'Touche deux cartes' },
    { id: 'tictac', name: 'Morpion', tag: 'Duel', desc: 'Bats l’ordinateur le plus de fois d’affilée.', grad: ['#af52de', '#7a2fb0'], run: tictac, unit: 'victoires', help: 'Aligne trois ✕' }
  ];
  const fmtBest = g => { const b = getBest(g.id); return b == null ? '—' : `${b} ${g.unit}`; };
  const art = g => `<svg viewBox="0 0 64 64" class="gart" aria-hidden="true"><defs><linearGradient id="gg-${g.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g.grad[0]}"/><stop offset="1" stop-color="${g.grad[1]}"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#gg-${g.id})"/>${ART[g.id]}</svg>`;

  function view() {
    const all = readAll(), played = GAMES.filter(g => all[g.id] != null).length;
    return `<div class="fadein stagger">
      <header class="head"><div><h1>Jeux</h1><p>${GAMES.length} jeux · fonctionnent même hors connexion${played ? ` · ${played} record${played > 1 ? 's' : ''}` : ''}</p></div></header>
      <div class="ggrid">${GAMES.map(g => `<button class="card gcard" data-act="playGame" data-id="${g.id}" style="--g1:${g.grad[0]};--g2:${g.grad[1]}">
        ${art(g)}<div class="gtxt"><small>${g.tag}</small><b>${escH(g.name)}</b><span>${escH(g.desc)}</span></div>
        <div class="gfoot"><span>🏆 ${escH(fmtBest(g))}</span><span class="gplay">Jouer</span></div></button>`).join('')}</div>
    </div>`;
  }

  /* ---------- Lecteur de jeu ---------- */
  let cur = null;
  function open(id) {
    const g = GAMES.find(x => x.id === id); if (!g) return;
    close(true);
    const root = document.createElement('div');
    root.className = 'gover';
    root.style.setProperty('--g1', g.grad[0]); root.style.setProperty('--g2', g.grad[1]);
    root.innerHTML = `<div class="gbox" role="dialog" aria-modal="true" aria-label="${escH(g.name)}">
      <div class="gtop"><button class="btn icon gclose" aria-label="Fermer">✕</button>
        <div class="gtitle">${art(g)}<b>${escH(g.name)}</b></div>
        <button class="btn icon grestart" aria-label="Recommencer">↻</button></div>
      <div class="gscore"><div><small>Score</small><b id="gS">0</b></div><div><small>Record</small><b id="gB">${escH(fmtBest(g))}</b></div></div>
      <div class="gstage"></div>
      <div class="ghelp">${escH(g.help)}</div></div>`;
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
    root.querySelector('.gclose').onclick = () => close();
    root.querySelector('.grestart').onclick = () => start();
    root.addEventListener('pointerdown', e => { if (e.target === root) close(); });
    const stage = root.querySelector('.gstage');
    let cleanups = [], dead = false;
    const listen = (el, type, fn, opt) => { el.addEventListener(type, fn, opt); cleanups.push(() => el.removeEventListener(type, fn, opt)); };
    function start() {
      cleanups.forEach(f => f()); cleanups = []; dead = false;
      stage.innerHTML = ''; stage.className = 'gstage gs-' + g.id; stage.style.setProperty('--g1', g.grad[0]); stage.style.setProperty('--g2', g.grad[1]);
      root.querySelector('#gS').textContent = '0';
      const msgEl = document.createElement('div'); msgEl.className = 'gmsg'; msgEl.hidden = true; stage.appendChild(msgEl);
      let msgTap = null;
      listen(msgEl, 'click', e => { e.stopPropagation(); if (msgTap) msgTap(); });
      const api = {
        stage,
        setScore: v => { root.querySelector('#gS').textContent = v; },
        msg: (html, onTap) => { msgEl.innerHTML = `<div class="gm-card">${art(g)}${html}</div>`; msgEl.hidden = false; msgTap = onTap || null; },
        hideMsg: () => { msgEl.hidden = true; msgTap = null; },
        on: listen,
        key: fn => listen(window, 'keydown', fn),
        keyup: fn => listen(window, 'keyup', fn),
        toast: t => { if (window.toast) window.toast(t); },
        swipe: fn => {
          let sx = 0, sy = 0, on = false;
          listen(stage, 'pointerdown', e => { sx = e.clientX; sy = e.clientY; on = true; });
          listen(stage, 'pointerup', e => {
            if (!on) return; on = false;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
            fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
          });
        },
        pad: fn => {
          const p = document.createElement('div'); p.className = 'gpad';
          p.innerHTML = ['up', 'left', 'down', 'right'].map(d => `<button data-d="${d}" aria-label="${d}">${{ up: '▲', left: '◀', down: '▼', right: '▶' }[d]}</button>`).join('');
          root.querySelector('.ghelp').before(p);
          cleanups.push(() => p.remove());
          listen(p, 'pointerdown', e => { const b = e.target.closest('[data-d]'); if (b) { e.preventDefault(); fn(b.dataset.d); } });
        },
        finish: (score, opt = {}) => {
          if (dead) return; dead = true;
          let rec = false;
          if (!opt.lost && score != null) {
            const best = getBest(g.id);
            if (best == null || (g.low ? score < best : score > best)) { setBest(g.id, score); rec = best != null || score > 0; }
            root.querySelector('#gB').textContent = fmtBest(g);
          }
          const label = opt.label || `${score} ${g.unit}`;
          api.msg(`${opt.lost ? '<b>Perdu !</b><span>Ce n’était pas la bonne case…</span>' : `<b>${rec ? '🏆 Nouveau record !' : 'Partie terminée'}</b><span class="big">${escH(label)}</span>`}<button class="btn primary">Rejouer</button>`, start);
          if (rec) msgEl.classList.add('record'); else msgEl.classList.remove('record');
        }
      };
      const stop = g.run(api);
      cleanups.push(() => { try { stop && stop(); } catch (e) { /* */ } });
    }
    cur = { root, cleanup: () => cleanups.forEach(f => f()) };
    listen(window, 'keydown', e => { if (e.key === 'Escape') close(); });
    requestAnimationFrame(start);
  }
  function close(now) {
    if (!cur) return;
    const c = cur; cur = null;
    c.cleanup();
    document.body.style.overflow = '';
    if (now) c.root.remove();
    else { c.root.classList.add('closing'); setTimeout(() => c.root.remove(), 240); }
    if (window.BN_onGameClose) window.BN_onGameClose();
  }
  window.BNGames = { view, open, close, list: GAMES };
})();
