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

  /* =========================================================
     1. Sprint de révision : coureur sans fin
     ========================================================= */
  function runner(api) {
    const W = 640, H = 230, GROUND = 190;
    const cv = makeCanvas(api.stage, W, H), ctx = cv.ctx;
    let state = 'ready', t = 0, dist = 0, spawn = 0.6, obs = [], speed = 330, legs = 0;
    const p = { x: 70, y: 0, vy: 0, w: 30, h: 38 };
    const clouds = [...Array(4)].map((_, i) => ({ x: i * 180 + rand(0, 80), y: rand(20, 90), s: rand(.6, 1.1) }));
    const jump = () => {
      if (state === 'ready') { state = 'run'; api.hideMsg(); }
      if (state === 'run' && p.y <= 0) p.vy = 640;
    };
    api.msg('<b>Sprint de révision</b><span>Saute par-dessus les piles de livres,<br>reste au sol sous les avions en papier.</span><em>Touche l’écran ou appuie sur Espace</em>', jump);
    api.key(e => { if ([' ', 'ArrowUp', 'w', 'z'].includes(e.key)) { e.preventDefault(); jump(); } });
    api.on(api.stage, 'pointerdown', e => { if (!e.target.closest('.gmsg')) jump(); });
    const stop = loop(dt => {
      const C = colors();
      if (state === 'run') {
        t += dt; speed = 330 + t * 10; dist += speed * dt; legs += dt * speed / 40;
        api.setScore(Math.floor(dist / 12));
        p.vy -= 1800 * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; }
        spawn -= dt;
        if (spawn <= 0) {
          const fly = t > 10 && Math.random() < 0.28;
          obs.push(fly ? { x: W + 30, w: 36, h: 16, fly: true, by: GROUND - 46 } : { x: W + 30, w: rand(18, 38), h: rand(24, 50), fly: false, hue: ri(4) });
          if (!fly && t > 20 && Math.random() < 0.25) obs.push({ x: W + 30 + 46, w: rand(16, 24), h: rand(22, 34), fly: false, hue: ri(4) });
          spawn = rand(0.7, 1.5) - Math.min(0.3, t / 150);
        }
        obs.forEach(o => { o.x -= speed * dt * (o.fly ? 1.15 : 1); });
        obs = obs.filter(o => o.x > -80);
        clouds.forEach(c => { c.x -= speed * dt * 0.15 * c.s; if (c.x < -80) { c.x = W + rand(0, 100); c.y = rand(20, 90); } });
        const px = p.x + 5, py = GROUND - p.y - p.h + 4, pw = p.w - 10, ph = p.h - 6;
        for (const o of obs) {
          const oy = o.fly ? o.by - o.h : GROUND - o.h;
          if (px < o.x + o.w - 3 && px + pw > o.x + 3 && py < oy + o.h - 2 && py + ph > oy + 3) { state = 'over'; api.finish(Math.floor(dist / 12)); break; }
        }
      }
      // dessin
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.line;
      clouds.forEach(c => { ctx.globalAlpha = .45; rr(ctx, c.x, c.y, 60 * c.s, 16 * c.s, 8); ctx.fill(); rr(ctx, c.x + 14 * c.s, c.y - 9 * c.s, 30 * c.s, 18 * c.s, 9); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.muted; ctx.fillRect(0, GROUND, W, 2);
      for (let i = 0; i < 18; i++) { const gx = ((i * 47 - dist * 1) % W + W) % W; ctx.fillRect(gx, GROUND + 8 + (i % 3) * 6, 10 + (i % 4) * 4, 2); }
      // livres
      const bookC = [C.red, C.blue, C.orange, C.green];
      obs.forEach(o => {
        if (o.fly) {
          const y = o.by - o.h, flap = Math.sin(t * 18) * 3;
          ctx.fillStyle = C.surface; ctx.strokeStyle = C.text; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(o.x, y + o.h / 2); ctx.lineTo(o.x + o.w, y + flap); ctx.lineTo(o.x + o.w * .7, y + o.h / 2); ctx.lineTo(o.x + o.w, y + o.h - flap); ctx.closePath(); ctx.fill(); ctx.stroke();
        } else {
          const n = Math.max(1, Math.round(o.h / 12)), bh = o.h / n;
          for (let i = 0; i < n; i++) {
            ctx.fillStyle = bookC[(o.hue + i) % 4];
            const off = (i % 2) * 3;
            rr(ctx, o.x + off - 1.5, GROUND - (i + 1) * bh, o.w, bh - 1.5, 3); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(o.x + off + 3, GROUND - (i + 1) * bh + bh / 2 - 1, o.w - 9, 2);
          }
        }
      });
      // personnage : un petit carnet qui court
      const x = p.x, y = GROUND - p.y - p.h;
      ctx.fillStyle = C.text;
      const leg = p.y > 0 ? 0 : Math.sin(legs) * 5;
      ctx.fillRect(x + 7 + leg, GROUND - p.y - 6, 4, 6); ctx.fillRect(x + p.w - 11 - leg, GROUND - p.y - 6, 4, 6);
      ctx.fillStyle = C.accent; rr(ctx, x, y, p.w, p.h - 4, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(ctx, x + 5, y + 5, p.w - 10, p.h - 14, 3); ctx.fill();
      ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(x + 12, y + 14, 2.2, 0, 7); ctx.arc(x + 21, y + 14, 2.2, 0, 7); ctx.fill();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, y + 22); ctx.lineTo(x + 22, y + 22); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = C.text; ctx.fillRect(x + 6 + i * 8, y - 3, 3, 6); }
    });
    return () => { stop(); cv.destroy(); };
  }

  /* =========================================================
     2. Serpent
     ========================================================= */
  function snake(api) {
    const N = 18, S = 20, W = N * S;
    const cv = makeCanvas(api.stage, W, W), ctx = cv.ctx;
    let body = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }], dir = { x: 1, y: 0 }, queue = [], food, acc = 0, step = 0.14, state = 'ready', score = 0, pulse = 0;
    const place = () => { do { food = { x: ri(N), y: ri(N) }; } while (body.some(b => b.x === food.x && b.y === food.y)); };
    place();
    const D = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const turn = name => {
      const d = D[name]; if (!d) return;
      if (state === 'ready') { state = 'run'; api.hideMsg(); }
      const last = queue.length ? queue[queue.length - 1] : dir;
      if (d.x === -last.x && d.y === -last.y) return;
      if (d.x === last.x && d.y === last.y) return;
      if (queue.length < 3) queue.push(d);
    };
    api.msg('<b>Serpent</b><span>Mange les pommes, évite les murs et ta queue.</span><em>Glisse le doigt ou utilise les flèches</em>', () => { state = 'run'; api.hideMsg(); });
    api.key(e => { const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', z: 'up', s: 'down', a: 'left', q: 'left', d: 'right' }[e.key]; if (m) { e.preventDefault(); turn(m); } });
    api.swipe(turn);
    api.pad(turn);
    const stop = loop(dt => {
      const C = colors(); pulse += dt;
      if (state === 'run') {
        acc += dt;
        while (acc >= step && state === 'run') {
          acc -= step;
          if (queue.length) dir = queue.shift();
          const h = { x: body[0].x + dir.x, y: body[0].y + dir.y };
          const eat = h.x === food.x && h.y === food.y;
          const hitSelf = body.slice(0, eat ? body.length : body.length - 1).some(b => b.x === h.x && b.y === h.y);
          if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || hitSelf) { state = 'over'; api.finish(score); break; }
          body.unshift(h);
          if (eat) { score++; api.setScore(score); place(); step = Math.max(0.065, step - 0.0035); try { navigator.vibrate?.(10); } catch (e) { /* */ } } else body.pop();
        }
      }
      ctx.clearRect(0, 0, W, W);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2) { ctx.fillStyle = C.surface2; ctx.fillRect(x * S, y * S, S, S); }
      const fr = 6 + Math.sin(pulse * 6) * 1;
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(food.x * S + S / 2, food.y * S + S / 2 + 1, fr, 0, 7); ctx.fill();
      ctx.fillStyle = C.green; ctx.fillRect(food.x * S + S / 2 - 1, food.y * S + 3, 2, 5);
      body.forEach((b, i) => {
        ctx.fillStyle = C.accent; ctx.globalAlpha = 1 - (i / body.length) * 0.45;
        rr(ctx, b.x * S + 1.5, b.y * S + 1.5, S - 3, S - 3, i ? 5 : 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      const h = body[0];
      ctx.fillStyle = '#fff';
      const ex = dir.y ? [-4, 4] : [dir.x * 3, dir.x * 3], ey = dir.x ? [-4, 4] : [dir.y * 3, dir.y * 3];
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(h.x * S + S / 2 + ex[i], h.y * S + S / 2 + ey[i], 2.6, 0, 7); ctx.fill(); }
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
    const color = v => { const l = Math.log2(v); return `hsl(${(250 - l * 22 + 360) % 360} ${55 + Math.min(l, 8) * 4}% ${Math.max(42, 80 - l * 4)}%)`; };
    const draw = () => {
      box.innerHTML = g.map((v, i) => `<div class="cell">${v ? `<div class="tile ${fresh.has(i) ? 'new' : ''} ${merged.has(i) ? 'merged' : ''} ${v >= 1024 ? 'xl' : v >= 128 ? 'l' : ''}" style="background:${color(v)};color:${v <= 4 ? '#3a2f6b' : '#fff'}">${v}</div>` : ''}</div>`).join('');
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
    const W = 400, H = 540;
    const cv = makeCanvas(api.stage, W, H), ctx = cv.ctx;
    let pad = { x: W / 2, w: 84, y: H - 34 }, ball, bricksA = [], lives = 3, score = 0, level = 1, state = 'ready', keys = {}, parts = [];
    const resetBall = () => { ball = { x: pad.x, y: pad.y - 12, vx: 0, vy: 0, r: 7, stuck: true }; };
    const build = () => {
      bricksA = []; const rows = Math.min(8, 4 + level), cols = 8, bw = (W - 40) / cols;
      const pal = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#32ade6', '#5b5bd6', '#af52de', '#ff2d55'];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) bricksA.push({ x: 20 + c * bw + 2, y: 60 + r * 24, w: bw - 4, h: 18, col: pal[r % pal.length], hp: r < level - 1 ? 2 : 1 });
    };
    build(); resetBall();
    const launch = () => { if (state === 'ready') { state = 'run'; api.hideMsg(); } if (ball.stuck && state === 'run') { const sp = 330 + level * 25; ball.stuck = false; ball.vx = rand(-0.5, 0.5) * sp; ball.vy = -Math.sqrt(sp * sp - ball.vx * ball.vx); } };
    api.msg('<b>Casse-briques</b><span>Déplace la raquette, casse toutes les briques.<br>3 vies.</span><em>Touche pour lancer la balle</em>', launch);
    const toX = e => { const r = cv.c.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
    api.on(api.stage, 'pointermove', e => { pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, toX(e))); });
    api.on(api.stage, 'pointerdown', e => { if (e.target.closest('.gmsg')) return; pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, toX(e))); launch(); });
    api.key(e => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); launch(); } keys[e.key] = true; });
    api.keyup(e => { keys[e.key] = false; });
    const stop = loop(dt => {
      const C = colors();
      if (keys.ArrowLeft) pad.x -= 520 * dt; if (keys.ArrowRight) pad.x += 520 * dt;
      pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, pad.x));
      if (state === 'run') {
        if (ball.stuck) { ball.x = pad.x; ball.y = pad.y - 12; }
        else {
          const steps = 3;
          for (let s = 0; s < steps; s++) {
            ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
            if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
            if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
            if (ball.y < ball.r + 30) { ball.y = ball.r + 30; ball.vy = Math.abs(ball.vy); }
            if (ball.vy > 0 && ball.y + ball.r >= pad.y && ball.y + ball.r <= pad.y + 14 && Math.abs(ball.x - pad.x) <= pad.w / 2 + ball.r) {
              const sp = Math.hypot(ball.vx, ball.vy) * 1.01, k = (ball.x - pad.x) / (pad.w / 2), a = k * 1.05;
              ball.vx = sp * Math.sin(a); ball.vy = -Math.abs(sp * Math.cos(a)); ball.y = pad.y - ball.r;
            }
            for (const b of bricksA) {
              if (b.hp <= 0) continue;
              const cx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), cy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
              if ((ball.x - cx) ** 2 + (ball.y - cy) ** 2 <= ball.r * ball.r) {
                const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r)), oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
                if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
                b.hp--; score += 10; api.setScore(score);
                if (b.hp <= 0) for (let i = 0; i < 8; i++) parts.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: rand(-120, 120), vy: rand(-120, 60), life: .6, col: b.col });
                break;
              }
            }
          }
          if (ball.y > H + 20) {
            lives--;
            if (lives <= 0) { state = 'over'; api.finish(score); } else resetBall();
          }
          if (bricksA.every(b => b.hp <= 0)) { level++; score += 100; api.setScore(score); api.toast(`Niveau ${level} !`); build(); resetBall(); }
        }
      }
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; });
      parts = parts.filter(p => p.life > 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.muted; ctx.font = '600 14px -apple-system, system-ui, sans-serif'; ctx.textBaseline = 'middle';
      ctx.fillText(`Niveau ${level}`, 14, 16);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < lives ? C.red : C.line; ctx.beginPath(); ctx.arc(W - 20 - i * 18, 16, 6, 0, 7); ctx.fill(); }
      ctx.fillStyle = C.line; ctx.fillRect(0, 30, W, 1);
      bricksA.forEach(b => { if (b.hp <= 0) return; ctx.fillStyle = b.col; ctx.globalAlpha = b.hp > 1 ? 1 : .88; rr(ctx, b.x, b.y, b.w, b.h, 5); ctx.fill(); if (b.hp > 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } ctx.globalAlpha = 1; });
      parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / .6); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 4, 4); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.accent; rr(ctx, pad.x - pad.w / 2, pad.y, pad.w, 12, 6); ctx.fill();
      ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
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
      stage.innerHTML = ''; stage.className = 'gstage gs-' + g.id;
      root.querySelector('#gS').textContent = '0';
      const msgEl = document.createElement('div'); msgEl.className = 'gmsg'; msgEl.hidden = true; stage.appendChild(msgEl);
      let msgTap = null;
      listen(msgEl, 'click', e => { e.stopPropagation(); if (msgTap) msgTap(); });
      const api = {
        stage,
        setScore: v => { root.querySelector('#gS').textContent = v; },
        msg: (html, onTap) => { msgEl.innerHTML = html; msgEl.hidden = false; msgTap = onTap || null; },
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
