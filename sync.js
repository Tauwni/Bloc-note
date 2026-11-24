'use strict';
/* =========================================================
   Bloc Note · Compte et synchronisation (Netlify)
   Sur GitHub Pages (pas de serveur), l'app reste en mode local.
   ========================================================= */
(() => {
  const LSU = 'bn-account';
  const A = { mode: 'local', user: null, updated: 0, timer: null, pushing: false, dirty: false };
  try { A.updated = +localStorage.getItem('bn-sync-updated') || 0; } catch (e) { /* */ }
  const setUpdated = u => { A.updated = u; try { localStorage.setItem('bn-sync-updated', String(u)); } catch (e) { /* */ } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(path, opt = {}) {
    const r = await fetch('/api/' + path, {
      method: opt.method || 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: opt.body ? { 'content-type': 'application/json' } : {},
      body: opt.body ? JSON.stringify(opt.body) : undefined
    });
    if (!(r.headers.get('content-type') || '').includes('json')) throw Object.assign(new Error('Pas de serveur'), { noapi: true });
    const j = await r.json();
    if (!r.ok) throw Object.assign(new Error(j.error || 'Erreur'), { status: r.status, body: j });
    return j;
  }

  /* Fusion simple : on garde tout ce qui existe d'un côté ou de l'autre ;
     pour un même élément, la version de cet appareil gagne. */
  function merge(local, remote) {
    if (!remote) return local;
    const out = { ...remote, set: local.set || remote.set };
    ['lists', 'tasks', 'slots', 'notes'].forEach(k => {
      const m = new Map((remote[k] || []).map(x => [x.id, x]));
      (local[k] || []).forEach(x => m.set(x.id, x));
      out[k] = [...m.values()];
    });
    return out;
  }
  const hasContent = d => d && ['tasks', 'slots', 'notes'].some(k => (d[k] || []).length);

  async function pull(first) {
    const r = await api('data');
    if (r.data) {
      if (first && hasContent(BN.get()) && !A.user_was_here) BN.set(merge(BN.get(), r.data));
      else BN.set(r.data);
      setUpdated(r.updated);
      if (first && hasContent(BN.get()) && !A.user_was_here) schedule(0);
    } else {
      setUpdated(0);
      schedule(0); // compte neuf : on envoie les données de cet appareil
    }
  }
  function schedule(ms = 1200) {
    if (A.mode !== 'remote') return;
    A.dirty = true;
    clearTimeout(A.timer);
    A.timer = setTimeout(push, ms);
  }
  async function push() {
    if (A.mode !== 'remote' || A.pushing || !A.dirty) return;
    A.pushing = true; A.dirty = false; status('…');
    try {
      const r = await api('data', { method: 'PUT', body: { data: BN.get(), base: A.updated } });
      setUpdated(r.updated); status('ok');
    } catch (e) {
      if (e.status === 409 && e.body) {
        BN.set(merge(BN.get(), e.body.data)); setUpdated(e.body.updated);
        A.dirty = true; A.pushing = false; return push();
      }
      if (e.status === 401) { A.pushing = false; return showAuth('Ta session a expiré, reconnecte-toi.'); }
      A.dirty = true; status('off');
      clearTimeout(A.timer); A.timer = setTimeout(push, 15000);
    }
    A.pushing = false;
    if (A.dirty) schedule(800);
  }
  let st = 'ok';
  function status(s) { st = s; const el = document.getElementById('syncState'); if (el) el.textContent = label(); }
  const label = () => st === '…' ? 'Synchronisation…' : st === 'off' ? 'Hors ligne · sera synchronisé plus tard' : 'Synchronisé';

  /* ---------- Écran de connexion ---------- */
  function showAuth(msg) {
    A.mode = 'auth';
    document.querySelector('.auth')?.remove();
    const el = document.createElement('div');
    el.className = 'auth';
    el.innerHTML = `<div class="auth-card">
      <img src="icon.svg" alt="" width="72" height="72" class="auth-logo">
      <h1>Bloc Note</h1>
      <p class="auth-sub">Tes tâches, ton emploi du temps et tes notes,<br>sur tous tes appareils.</p>
      <div class="seg auth-tabs"><button type="button" data-m="login" class="on">Connexion</button><button type="button" data-m="signup">Créer un compte</button></div>
      <form class="auth-form" autocomplete="on" novalidate>
        <label>Prénom<input name="name" autocomplete="username" maxlength="40" placeholder="Ton prénom" required></label>
        <label><span>Code perso <small>(6 chiffres)</small></span><input name="code" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" placeholder="••••••" required></label>
        <label class="only-signup" hidden>Confirme le code<input name="code2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" placeholder="••••••"></label>
        <div class="auth-err" role="alert">${esc(msg || '')}</div>
        <button class="btn primary wide auth-go" type="submit">Se connecter</button>
      </form>
      <p class="auth-switch"><span>Pas encore de compte ?</span> <button type="button" class="link" data-switch>Créer un compte</button></p>
      <p class="auth-note">Ton code reste secret : il est chiffré sur le serveur.<br>Retiens-le bien, il ne peut pas être récupéré.</p>
    </div>`;
    document.body.appendChild(el);
    document.body.classList.add('auth-on');
    let mode = 'login';
    const f = el.querySelector('form'), err = el.querySelector('.auth-err'), go = el.querySelector('.auth-go');
    const setMode = m => {
      mode = m; err.textContent = '';
      el.querySelectorAll('.auth-tabs button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      el.querySelector('.only-signup').hidden = m !== 'signup';
      f.code.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
      go.textContent = m === 'signup' ? 'Créer mon compte' : 'Se connecter';
      el.querySelector('.auth-switch span').textContent = m === 'signup' ? 'Déjà un compte ?' : 'Pas encore de compte ?';
      el.querySelector('[data-switch]').textContent = m === 'signup' ? 'Se connecter' : 'Créer un compte';
    };
    el.querySelector('.auth-tabs').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m); });
    el.querySelector('[data-switch]').addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
    ['code', 'code2'].forEach(n => f[n].addEventListener('input', () => { f[n].value = f[n].value.replace(/\D/g, '').slice(0, 6); }));
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      const name = f.name.value.trim(), code = f.code.value;
      if (name.length < 2) { err.textContent = 'Indique ton prénom.'; return f.name.focus(); }
      if (!/^\d{6}$/.test(code)) { err.textContent = 'Le code doit faire 6 chiffres.'; return f.code.focus(); }
      if (mode === 'signup' && code !== f.code2.value) { err.textContent = 'Les deux codes ne sont pas identiques.'; return f.code2.focus(); }
      go.disabled = true; go.textContent = mode === 'signup' ? 'Création…' : 'Connexion…';
      try {
        const r = await api(mode, { method: 'POST', body: { name, code } });
        await onLogged(r.name, mode === 'signup');
        el.classList.add('leaving'); document.body.classList.remove('auth-on');
        setTimeout(() => el.remove(), 300);
        window.toast?.(mode === 'signup' ? `Compte créé, bienvenue ${r.name} !` : `Content de te revoir, ${r.name} !`);
      } catch (ex) {
        go.disabled = false; setMode(mode);
        err.textContent = ex.noapi ? 'Serveur injoignable. Vérifie ta connexion.' : ex.message;
      }
    });
    setTimeout(() => f.name.focus(), 50);
  }

  async function onLogged(name, isNew) {
    let prev = null; try { prev = localStorage.getItem(LSU); } catch (e) { /* */ }
    if (prev && prev !== name) { BN.clear(); setUpdated(0); }
    A.user_was_here = prev === name;
    A.mode = 'remote'; A.user = name;
    try { localStorage.setItem(LSU, name); } catch (e) { /* */ }
    if (isNew && !BN.get().set.name) { const d = BN.get(); d.set.name = name; BN.set(d); }
    await pull(true);
    BN.refresh();
  }

  async function init() {
    let me;
    try { me = await api('me'); }
    catch (e) {
      if (e.noapi) {
        // Pas de serveur (GitHub Pages) ou hors ligne
        let u = null; try { u = localStorage.getItem(LSU); } catch (x) { /* */ }
        if (u && !navigator.onLine) { A.mode = 'remote'; A.user = u; status('off'); }
        return;
      }
      if (e.status === 401) return showAuth();
      return;
    }
    A.mode = 'remote'; A.user = me.name; A.user_was_here = true;
    try { localStorage.setItem(LSU, me.name); } catch (e) { /* */ }
    try { await pull(false); BN.refresh(); } catch (e) { status('off'); }
  }

  async function logout() {
    if (!confirm('Se déconnecter ? Tes données restent sauvegardées sur ton compte.')) return;
    clearTimeout(A.timer);
    if (A.dirty) { try { await push(); } catch (e) { /* */ } }
    try { await api('logout', { method: 'POST' }); } catch (e) { /* */ }
    try { localStorage.removeItem(LSU); localStorage.removeItem('bn-sync-updated'); } catch (e) { /* */ }
    BN.clear();
    location.reload();
  }

  // Met à jour quand on revient sur l'app (autre appareil entre-temps)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || A.mode !== 'remote') return;
    if (A.dirty) return push();
    try { const r = await api('data'); if (r.data && r.updated > A.updated) { BN.set(r.data); setUpdated(r.updated); BN.refresh(); } status('ok'); } catch (e) { if (e.status === 401) showAuth('Ta session a expiré, reconnecte-toi.'); }
  });
  window.addEventListener('online', () => { if (A.mode === 'remote' && A.dirty) push(); });

  window.BNSync = {
    changed: () => schedule(),
    logout,
    row: () => A.mode !== 'remote' ? '' : `<div class="srow"><div class="lbl"><span class="sic" style="--c:#34c759">☁︎</span><div>Connecté : ${esc(A.user)}<small id="syncState">${label()}</small></div></div><button class="btn sm danger" data-act="logout">Se déconnecter</button></div>`
  };
  init();
})();
