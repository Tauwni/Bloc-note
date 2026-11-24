'use strict';
/* =========================================================
   Bloc Note : tâches, emploi du temps, notes
   Données enregistrées dans le navigateur (localStorage)
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const D = k => new Date(k + 'T12:00:00');
const todayK = () => iso(new Date());
const addDays = (k, n) => { const d = D(k); d.setDate(d.getDate() + n); return iso(d); };
const wd = k => (D(k).getDay() + 6) % 7; // 0 = lundi
const mondayOf = k => addDays(k, -wd(k));
const fmt = (k, o) => D(k).toLocaleDateString('fr-FR', o);
const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const PRIO = [
  { n: 'Aucune', c: 'var(--muted)' }, { n: 'Basse', c: 'var(--blue)' },
  { n: 'Moyenne', c: 'var(--orange)' }, { n: 'Haute', c: 'var(--red)' }
];
const COLORS = ['#5b5bd6', '#007aff', '#32ade6', '#30b0a0', '#34c759', '#ffcc00', '#ff9500', '#ff3b30', '#ff2d55', '#af52de', '#a2845e', '#8e8e93'];
const NOTE_COLORS = ['', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ff2d55', '#ff9500'];

/* ---------- Icônes (traits style « Lucide ») ---------- */
const IC = {
  plus: 'M12 5v14|M5 12h14', x: 'M18 6 6 18|M6 6l12 12', check: 'M20 6 9 17l-5-5',
  search: 'c:11,11,8|M21 21l-4.3-4.3',
  home: 'M3 10.5 12 3l9 7.5|M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5',
  listc: 'M3 6.5 5 8.5 8.5 5|M3 12.5l2 2 3.5-3.5|M3 18.5l2 2 3.5-3.5|M12 7h9|M12 13h9|M12 19h9',
  calendar: 'r:3,4.5,18,17,3|M16 2.5v4|M8 2.5v4|M3 10h18',
  note: 'M15 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7Z|M14.5 2.5V7h5|M8.5 12.5h7|M8.5 16.5h7|M8.5 8.5h2',
  settings: 'M4 21v-7|M4 10V3|M12 21v-9|M12 8V3|M20 21v-5|M20 12V3|M1 14h6|M9 8h6|M17 16h6',
  clock: 'c:12,12,9.5|M12 7v5l3 2', trash: 'M3 6h18|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6|M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2|M10 11v6|M14 11v6',
  edit: 'M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22v-7',
  grip: 'c:9,6,1|c:9,12,1|c:9,18,1|c:15,6,1|c:15,12,1|c:15,18,1',
  left: 'm15 18-6-6 6-6', right: 'm9 18 6-6-6-6',
  pin: 'M12 17v5|M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9a2 2 0 0 1-1.1-1.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z',
  mappin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z|c:12,10,3',
  tag: 'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z|c:7.5,7.5,1.2',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12',
  sort: 'm21 16-4 4-4-4|M17 20V4|M3 8l4-4 4 4|M7 4v16',
  alert: 'c:12,12,9.5|M12 7.5v5|M12 16.5h.01', inbox: 'M22 12h-6l-2 3h-4l-2-3H2|M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z',
  folder: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
  sun: 'c:12,12,4|M12 2v2|M12 20v2|M4.9 4.9l1.4 1.4|M17.7 17.7l1.4 1.4|M2 12h2|M20 12h2|M6.3 17.7l-1.4 1.4|M19.1 4.9l-1.4 1.4',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', monitor: 'r:2,3,20,14,2|M8 21h8|M12 17v4',
  user: 'c:12,8,4|M4 21a8 8 0 0 1 16 0', palette: 'c:13.5,6.5,1|c:17.5,10.5,1|c:8.5,7.5,1|c:6.5,12.5,1|M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H16a6 6 0 0 0 6-6c0-4.9-4.5-8.4-10-8.4Z',
  repeat: 'm17 2 4 4-4 4|M3 11v-1a4 4 0 0 1 4-4h14|m7 22-4-4 4-4|M21 13v1a4 4 0 0 1-4 4H3',
  target: 'c:12,12,9.5|c:12,12,5.5|c:12,12,1.5', spark: 'M12 3l1.9 5.8L20 10l-5 3.8L16.5 20 12 16.4 7.5 20 9 13.8 4 10l6.1-1.2z',
  book: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20', arrow: 'M5 12h14|m12 5 7 7-7 7',
  undo: 'M9 14 4 9l5-5|M4 9h10.5a5.5 5.5 0 0 1 0 11H11', layers: 'm12 2 10 5-10 5L2 7z|m2 17 10 5 10-5|m2 12 10 5 10-5',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5L22 3z',
  game: 'M6 11h4|M8 9v4|M15 12h.01|M18 10h.01|M17.3 5H6.7a4 4 0 0 0-4 3.6l-.9 7.2A2.5 2.5 0 0 0 4.3 18.6c.9 0 1.7-.5 2.1-1.3l.9-1.8a2 2 0 0 1 1.8-1h5.8a2 2 0 0 1 1.8 1l.9 1.8c.4.8 1.2 1.3 2.1 1.3a2.5 2.5 0 0 0 2.5-2.8l-.9-7.2a4 4 0 0 0-4-3.6z',
  hash: 'M4 9h16|M4 15h16|M10 3 8 21|M16 3l-2 18', subtask: 'M4 4v10a2 2 0 0 0 2 2h8|m10 12 4 4-4 4|M18 8h3|M18 16h3'
};
function ic(n, cls = '') {
  const d = IC[n] || '';
  const inner = d.split('|').map(p => {
    if (p.startsWith('c:')) { const [x, y, r] = p.slice(2).split(','); return `<circle cx="${x}" cy="${y}" r="${r}"/>`; }
    if (p.startsWith('r:')) { const [x, y, w, h, rx] = p.slice(2).split(','); return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`; }
    return `<path d="${p}"/>`;
  }).join('');
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
const paintIcons = (root = document) => $$('[data-ic]', root).forEach(el => { if (!el.firstChild) el.innerHTML = ic(el.dataset.ic); });

/* ---------- Données ---------- */
const KEY = 'blocnote-v2';
const DEF_SET = { name: '', theme: 'auto', accent: '#5b5bd6', from: 7, to: 21, weekend: true, holidayClasses: false };
function seed() {
  const s = {
    v: 2,
    lists: [
      { id: 'perso', name: 'Perso', color: '#007aff' },
      { id: 'cours', name: 'Cours', color: '#ff9500' },
      { id: 'travail', name: 'Travail', color: '#34c759' }
    ],
    tasks: [], slots: [], notes: [], set: { ...DEF_SET }
  };
  // Reprise des données de la première version
  try {
    const old = JSON.parse(localStorage.getItem('blocnote_tasks') || '[]');
    if (Array.isArray(old)) old.forEach((o, i) => s.tasks.push({ id: uid(), title: String(o.t || ''), notes: '', prio: +o.p || 0, due: o.d || '', time: '', list: 'perso', tags: [], subs: [], done: !!o.done, doneAt: o.done ? Date.now() : 0, created: Date.now() + i, order: i }));
    const n = JSON.parse(localStorage.getItem('blocnote_notes') || '""');
    if (n) s.notes.push({ id: uid(), title: 'Mes notes', body: String(n), color: '', pin: false, upd: Date.now() });
  } catch (e) { /* rien */ }
  return s;
}
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
if (!S || S.v !== 2) S = seed();
S.set = { ...DEF_SET, ...(S.set || {}) };
['lists', 'tasks', 'slots', 'notes'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
S.tasks.forEach((t, i) => { t.order ??= i; t.tags ??= []; t.subs ??= []; t.notes ??= ''; t.time ??= ''; t.due ??= ''; });
let saveOk = true;
function saveLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; }
  catch (e) { if (saveOk) toast('Impossible d’enregistrer sur cet appareil'); saveOk = false; }
}
function save() { saveLocal(); if (window.BNSync) BNSync.changed(); }
/* Accès pour la synchronisation du compte (sync.js) */
window.BN = {
  get: () => S,
  set: d => {
    S = d && d.v === 2 ? d : seed();
    S.set = { ...DEF_SET, ...(S.set || {}) };
    ['lists', 'tasks', 'slots', 'notes'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
    S.tasks.forEach((t, i) => { t.order ??= i; t.tags ??= []; t.subs ??= []; t.notes ??= ''; t.time ??= ''; t.due ??= ''; });
    saveLocal();
  },
  clear: () => { S = seed(); S.tasks = []; S.notes = []; try { localStorage.removeItem(KEY); localStorage.removeItem('blocnote_tasks'); localStorage.removeItem('blocnote_notes'); } catch (e) { /* */ } },
  refresh: () => { if (!document.querySelector('#sheetRoot .overlay:not(.closing)')) render(); }
};
save();

const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem('bn-ui-' + k); localStorage.setItem('bn-ui-' + k, v); } catch (e) { return null; } };
const ui = {
  view: pref('view') || 'today',
  f: { q: '', status: 'open', when: 'all', prio: -1, list: 'all', sort: pref('sort') || 'manual' },
  week: 0, day: null, noteQ: ''
};

/* ---------- Helpers métier ---------- */
const listOf = id => S.lists.find(l => l.id === id) || { id: '', name: 'Sans liste', color: '#8e8e93' };
const openTasks = () => S.tasks.filter(t => !t.done);
function dueInfo(t) {
  if (!t.due) return null;
  const diff = Math.round((D(t.due) - D(todayK())) / 864e5);
  let label;
  if (diff === 0) label = 'Aujourd’hui';
  else if (diff === 1) label = 'Demain';
  else if (diff === -1) label = 'Hier';
  else if (diff > 1 && diff < 7) label = fmt(t.due, { weekday: 'long' });
  else label = fmt(t.due, { day: 'numeric', month: 'short', ...(D(t.due).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  label = label.charAt(0).toUpperCase() + label.slice(1);
  return { label: label + (t.time ? ' · ' + t.time : ''), late: !t.done && diff < 0, today: diff === 0 };
}
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), kk = c % 4, l = (32 + 2 * e + 2 * i - h - kk) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${pad(month)}-${pad(day)}`;
}
const HOL_CACHE = {};
function holidaysOf(y) {
  if (HOL_CACHE[y]) return HOL_CACHE[y];
  const e = easter(y), h = {
    [`${y}-01-01`]: 'Jour de l’an', [addDays(e, 1)]: 'Lundi de Pâques', [`${y}-05-01`]: 'Fête du Travail', [`${y}-05-08`]: 'Victoire 1945',
    [addDays(e, 39)]: 'Ascension', [addDays(e, 50)]: 'Lundi de Pentecôte', [`${y}-07-14`]: 'Fête nationale', [`${y}-08-15`]: 'Assomption',
    [`${y}-11-01`]: 'Toussaint', [`${y}-11-11`]: 'Armistice 1918', [`${y}-12-25`]: 'Noël'
  };
  return (HOL_CACHE[y] = h);
}
const holiday = k => holidaysOf(+k.slice(0, 4))[k] || '';
function nextHoliday(from) {
  const y = +from.slice(0, 4);
  return [...Object.entries(holidaysOf(y)), ...Object.entries(holidaysOf(y + 1))].sort((a, b) => a[0].localeCompare(b[0])).find(([d]) => d >= from);
}
function slotsFor(k) {
  const hol = holiday(k) && !S.set.holidayClasses;
  return S.slots.filter(s => s.once ? s.once === k : (!hol && s.day === wd(k))).sort((a, b) => toMin(a.start) - toMin(b.start));
}
function filtered(statusOverride) {
  const f = { ...ui.f, ...(statusOverride ? { status: statusOverride } : {}) }, k = todayK(), wk = addDays(k, 7);
  const a = S.tasks.filter(t => {
    if (f.status === 'open' && t.done) return false;
    if (f.status === 'done' && !t.done) return false;
    if (f.list !== 'all' && t.list !== f.list) return false;
    if (f.prio >= 0 && t.prio !== f.prio) return false;
    if (f.when === 'today' && t.due !== k) return false;
    if (f.when === 'week' && !(t.due && t.due >= k && t.due <= wk)) return false;
    if (f.when === 'late' && !(t.due && t.due < k && !t.done)) return false;
    if (f.when === 'nodate' && t.due) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      const hay = [t.title, t.notes, t.tags.join(' '), listOf(t.list).name, t.subs.map(s => s.t).join(' ')].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const by = {
    manual: (x, y) => x.order - y.order,
    due: (x, y) => (x.due || '9999').localeCompare(y.due || '9999') || (x.time || '99').localeCompare(y.time || '99') || y.prio - x.prio,
    prio: (x, y) => y.prio - x.prio || (x.due || '9999').localeCompare(y.due || '9999') || x.order - y.order,
    recent: (x, y) => y.created - x.created,
    alpha: (x, y) => x.title.localeCompare(y.title, 'fr')
  };
  a.sort(by[f.sort] || by.manual);
  if (f.status === 'all') a.sort((x, y) => x.done - y.done);
  return a;
}
const nextOrder = () => S.tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;

/* Ajout rapide : « Réviser compta demain !3 #cours » */
function quickParse(text) {
  let t = ' ' + text + ' ', prio = 0, due = '', list = '', time = '';
  t = t.replace(/\s!([1-3])(?=\s)/, (_, p) => { prio = +p; return ' '; });
  t = t.replace(/\s!(haute|urgent)(?=\s)/i, () => { prio = 3; return ' '; });
  t = t.replace(/\s#([\wÀ-ÿ-]+)(?=\s)/, (m, n) => {
    const l = S.lists.find(x => x.name.toLowerCase() === n.toLowerCase());
    if (l) { list = l.id; return ' '; } return m;
  });
  t = t.replace(/\s(aujourd'hui|aujourd’hui|ce soir)(?=\s)/i, () => { due = todayK(); return ' '; });
  t = t.replace(/\sapr[eè]s-demain(?=\s)/i, () => { due = addDays(todayK(), 2); return ' '; });
  t = t.replace(/\sdemain(?=\s)/i, () => { due = addDays(todayK(), 1); return ' '; });
  t = t.replace(/\s(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?=\s)/i, (_, d) => {
    const target = DAYS.findIndex(x => x.toLowerCase() === d.toLowerCase());
    let diff = (target - wd(todayK()) + 7) % 7; if (diff === 0) diff = 7;
    due = addDays(todayK(), diff); return ' ';
  });
  t = t.replace(/\s(?:à\s)?(\d{1,2})h(\d{2})?(?=\s)/i, (_, h, m) => { if (+h < 24) { time = pad(+h) + ':' + (m || '00'); return ' '; } return _; });
  return { title: t.trim().replace(/\s+/g, ' '), prio, due, list, time };
}

/* ---------- Composants ---------- */
function taskRow(t, drag) {
  const l = listOf(t.list), di = dueInfo(t), sd = t.subs.filter(s => s.done).length;
  const meta = [];
  if (t.list) meta.push(`<span><i class="dot" style="--c:${l.color}"></i>${esc(l.name)}</span>`);
  if (di) meta.push(`<span class="${di.late ? 'late' : di.today ? 'tod' : ''}">${ic(di.late ? 'alert' : 'calendar')}${esc(di.label)}</span>`);
  if (t.subs.length) meta.push(`<span>${ic('subtask')}${sd}/${t.subs.length}</span>`);
  if (t.notes) meta.push(`<span>${ic('note')}</span>`);
  t.tags.slice(0, 3).forEach(g => meta.push(`<span class="tagp">#${esc(g)}</span>`));
  return `<div class="task ${t.done ? 'done' : ''} ${ui.flash === t.id ? 'flash' : ''}" data-id="${t.id}">
    ${drag ? `<span class="grip" title="Glisser pour changer l’ordre">${ic('grip')}</span>` : ''}
    <button class="chk p${t.prio}" data-act="toggle" data-id="${t.id}" aria-label="${t.done ? 'Marquer à faire' : 'Marquer comme terminée'}">${ic('check')}</button>
    <div class="tbody" data-act="editTask" data-id="${t.id}">
      <div class="ttl">${esc(t.title)}</div>
      ${meta.length ? `<div class="meta">${meta.join('')}</div>` : ''}
    </div>
    ${t.prio && !t.done ? `<span class="flag" style="color:${PRIO[t.prio].c}" title="Priorité ${PRIO[t.prio].n.toLowerCase()}">${ic('flag')}</span>` : ''}
  </div>`;
}
const empty = (icon, title, text, btn = '') => `<div class="card empty fadein"><div class="bub">${ic(icon)}</div><b>${title}</b><span>${text}</span>${btn}</div>`;
function ring(p) {
  const R = 19, C = 2 * Math.PI * R;
  return `<div class="ring"><svg width="46" height="46" viewBox="0 0 46 46"><circle class="t" cx="23" cy="23" r="${R}" fill="none" stroke-width="6"/><circle class="f" cx="23" cy="23" r="${R}" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" style="--C:${C}"/></svg></div>`;
}

/* ---------- Vue : Aujourd'hui ---------- */
function vToday() {
  const k = todayK(), open = openTasks();
  const late = open.filter(t => t.due && t.due < k).sort((a, b) => a.due.localeCompare(b.due));
  const tod = open.filter(t => t.due === k).sort((a, b) => (a.time || '99').localeCompare(b.time || '99') || b.prio - a.prio);
  const nodate = open.filter(t => !t.due).sort((a, b) => b.prio - a.prio || a.order - b.order);
  const doneToday = S.tasks.filter(t => t.done && t.doneAt && iso(new Date(t.doneAt)) === k).length;
  const total = tod.length + doneToday, p = total ? doneToday / total : 0;
  const soon = open.filter(t => t.due > k && t.due <= addDays(k, 7)).sort((a, b) => a.due.localeCompare(b.due) || b.prio - a.prio).slice(0, 6);
  const slots = slotsFor(k), nm = nowMin();
  const h = new Date().getHours();
  const hello = (h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir') + (S.set.name ? ', ' + esc(S.set.name) : '');
  const nextSlot = slots.find(s => toMin(s.end) > nm);

  return `<div class="fadein stagger">
  <header class="head"><div><h1>${hello}</h1><p>${fmt(k, { weekday: 'long', day: 'numeric', month: 'long' })}${holiday(k) ? ' · férié (' + esc(holiday(k)) + ')' : ''}${nextSlot ? ` · ${toMin(nextSlot.start) <= nm ? 'en ce moment' : 'prochain cours à ' + esc(nextSlot.start)} : ${esc(nextSlot.title)}` : ''}</p></div></header>
  <div class="stats">
    <button class="card stat" data-act="goFilter" data-when="today"><div class="top"><span class="bub" style="--c:var(--accent)">${ic('sun')}</span></div><b>${tod.length}</b><span>Pour aujourd’hui</span></button>
    <button class="card stat" data-act="goFilter" data-when="late"><div class="top"><span class="bub" style="--c:var(--red)">${ic('alert')}</span></div><b>${late.length}</b><span>En retard</span></button>
    <button class="card stat" data-act="goFilter" data-when="all"><div class="top"><span class="bub" style="--c:var(--orange)">${ic('inbox')}</span></div><b>${open.length}</b><span>À faire au total</span></button>
    <button class="card stat" data-act="goFilter" data-when="done"><div class="top">${ring(p)}</div><b>${doneToday}<small style="font-size:16px;color:var(--muted)">/${total}</small></b><span>Faites aujourd’hui</span></button>
  </div>
  <label class="card quick">${ic('plus')}<input id="quickAdd" placeholder="Ajouter une tâche pour aujourd’hui…  (ex : Réviser compta 18h !3)" enterkeyhint="done" autocomplete="off"><button class="btn primary sm" data-act="quickAdd">Ajouter</button></label>
  <div class="cols">
    <section>
      <h2 class="sec">${ic('listc')} À faire <small>${late.length + tod.length + nodate.length}</small><button class="link" data-act="nav" data-nav="tasks">Tout voir</button></h2>
      ${late.length || tod.length || nodate.length ? `<div class="tlist">${late.map(t => taskRow(t)).join('')}${tod.map(t => taskRow(t)).join('')}${nodate.map(t => taskRow(t)).join('')}</div>`
        : empty('spark', 'Rien pour aujourd’hui', doneToday ? 'Tout est fait, bravo !' : 'Ajoute une tâche juste au-dessus.')}
      ${doneSection(S.tasks.filter(t => t.done && t.doneAt && iso(new Date(t.doneAt)) === k).sort((x, y) => y.doneAt - x.doneAt), 'Faites aujourd’hui')}
      ${soon.length ? `<h2 class="sec" style="margin-top:22px">${ic('calendar')} Cette semaine <small>${soon.length}</small></h2><div class="tlist">${soon.map(t => taskRow(t)).join('')}</div>` : ''}
    </section>
    <section>
      <h2 class="sec">${ic('clock')} Au programme <small>${slots.length}</small><button class="link" data-act="nav" data-nav="planning">Emploi du temps</button></h2>
      ${slots.length ? `<div class="tline">${slots.map(s => agendaItem(s, k)).join('')}</div>`
        : empty('calendar', 'Aucun cours aujourd’hui', 'Remplis ton emploi du temps pour le voir ici.', `<button class="btn sm" data-act="newSlot" data-k="${k}" style="margin-top:8px">${ic('plus')} Ajouter un créneau</button>`)}
    </section>
  </div></div>`;
}
function agendaItem(s, k) {
  const live = k === todayK() && toMin(s.start) <= nowMin() && toMin(s.end) > nowMin();
  return `<button class="aitem ${live ? 'now-on' : ''}" style="--c:${s.color}" data-act="editSlot" data-id="${s.id}">
    <div class="tm">${esc(s.start)}<small>${esc(s.end)}</small></div><span class="bar"></span>
    <div class="tx"><b>${esc(s.title)}</b>${s.place ? `<small>${ic('mappin')}${esc(s.place)}</small>` : ''}${live ? `<small style="color:${s.color};font-weight:700">En cours</small>` : ''}</div></button>`;
}

/* ---------- Vue : Tâches ---------- */
function vTasks() {
  const f = ui.f, k = todayK();
  const cnt = fn => S.tasks.filter(fn).length;
  const when = [['all', 'Tout', 'layers'], ['today', 'Aujourd’hui', 'sun', cnt(t => !t.done && t.due === k)], ['week', '7 jours', 'calendar'], ['late', 'En retard', 'alert', cnt(t => !t.done && t.due && t.due < k)], ['nodate', 'Sans date', 'inbox']];
  const act = activeFilters();
  return `<div class="fadein stagger">
  <header class="head"><div><h1>Tâches</h1><p><span id="tcount"></span></p></div>
    <div class="actions hide-narrow"><button class="btn primary" data-act="newTask">${ic('plus')} Nouvelle tâche</button></div></header>
  <div class="tbar">
    <label class="search">${ic('search')}<input id="tq" type="search" placeholder="Rechercher…" value="${esc(f.q)}" autocomplete="off"></label>
    <button class="btn fbtn ${act.length ? 'has' : ''}" data-act="openFilters" aria-label="Filtres et tri">${ic('filter')}<span class="hide-xs">Filtres</span>${act.length ? `<b class="badge">${act.length}</b>` : ''}</button>
  </div>
  ${act.length ? `<div class="chips active-f">${act.map(([k, l]) => `<button class="chip on" data-act="clearF" data-k="${k}">${esc(l)}${ic('x')}</button>`).join('')}${act.length > 1 ? `<button class="link" data-act="resetFilters">Tout effacer</button>` : ''}</div>` : ''}
  <div id="tlist"></div>
</div>`;
}
const WHEN_L = { today: 'Aujourd’hui', week: '7 prochains jours', late: 'En retard', nodate: 'Sans date' };
const SORT_L = { manual: 'Mon ordre', due: 'Échéance', prio: 'Priorité', recent: 'Plus récentes', alpha: 'A → Z' };
function activeFilters() {
  const f = ui.f, a = [];
  if (f.status === 'done') a.push(['status', 'Terminées']);
  if (f.status === 'all') a.push(['status', 'Toutes']);
  if (f.when !== 'all') a.push(['when', WHEN_L[f.when]]);
  if (f.list !== 'all') a.push(['list', listOf(f.list).name]);
  if (f.prio >= 0) a.push(['prio', f.prio ? 'Priorité ' + PRIO[f.prio].n.toLowerCase() : 'Sans priorité']);
  if (f.sort !== 'manual') a.push(['sort', 'Tri : ' + SORT_L[f.sort]]);
  return a;
}
function filterSheet() {
  const f = ui.f;
  const grp = (title, key, opts) => `<div class="field"><label>${title}</label><div class="daychips" data-fk="${key}">${opts.map(([v, l, extra = '']) => `<button type="button" class="chip ${String(f[key]) === String(v) ? 'on' : ''}" data-fv="${v}">${extra}${esc(l)}</button>`).join('')}</div></div>`;
  openSheet(`
    <div class="sh-head"><button class="btn ghost" id="fReset">Réinitialiser</button><h3>Filtres et tri</h3><button class="btn primary sm" data-close>OK</button></div>
    <div class="sh-body">
      ${grp(`${ic('check')} Afficher`, 'status', [['open', 'À faire'], ['all', 'Toutes'], ['done', 'Terminées']])}
      ${grp(`${ic('calendar')} Échéance`, 'when', [['all', 'Toutes'], ['today', 'Aujourd’hui'], ['week', '7 jours'], ['late', 'En retard'], ['nodate', 'Sans date']])}
      ${grp(`${ic('folder')} Liste`, 'list', [['all', 'Toutes'], ...S.lists.map(l => [l.id, l.name, `<i class="dot" style="--c:${l.color}"></i>`])])}
      ${grp(`${ic('flag')} Priorité`, 'prio', [[-1, 'Toutes'], [3, 'Haute'], [2, 'Moyenne'], [1, 'Basse'], [0, 'Aucune']])}
      ${grp(`${ic('sort')} Trier par`, 'sort', Object.entries(SORT_L))}
    </div>`, sh => {
    const sync = () => $$('[data-fk]', sh).forEach(g => $$('.chip', g).forEach(c => c.classList.toggle('on', String(ui.f[g.dataset.fk]) === c.dataset.fv)));
    sh.addEventListener('click', e => {
      const c = e.target.closest('[data-fv]'); if (!c) return;
      const k = c.closest('[data-fk]').dataset.fk;
      ui.f[k] = k === 'prio' ? +c.dataset.fv : c.dataset.fv;
      if (k === 'sort') pref('sort', ui.f.sort);
      sync(); ui.restagger = true; render();
    });
    $('#fReset', sh).addEventListener('click', () => { ui.f = { ...ui.f, status: 'open', when: 'all', prio: -1, list: 'all', sort: 'manual' }; pref('sort', 'manual'); sync(); ui.restagger = true; render(); });
  });
}
function doneSection(list, title = 'Terminées', withClear = false) {
  if (!list.length) return '';
  const open = pref('doneOpen') !== '0';
  return `<div class="done-sec ${open ? 'open' : ''}">
    <button class="done-head" data-act="toggleDoneSec" aria-expanded="${open}">${ic('right')}<span>${title}</span><em>${list.length}</em></button>
    <div class="done-body"><div class="done-inner"><div class="tlist">${list.map(t => taskRow(t)).join('')}</div>
    ${withClear ? `<div class="listfoot"><button class="link" data-act="clearDone">${ic('trash')} Supprimer les tâches terminées</button></div>` : ''}</div></div></div>`;
}
function renderTaskList(typing) {
  const box = $('#tlist'); if (!box) return;
  box.classList.toggle('stagger', !typing);
  const a = filtered(), drag = ui.f.sort === 'manual';
  const filt = ui.f.q || ui.f.when !== 'all' || ui.f.prio >= 0 || ui.f.list !== 'all' || ui.f.status !== 'open';
  box.innerHTML = a.length ? `<div class="tlist" id="tl">${a.map(t => taskRow(t, drag)).join('')}</div>`
    : filt ? empty('search', 'Aucune tâche trouvée', 'Essaie un autre filtre.', `<button class="btn sm" data-act="resetFilters" style="margin-top:8px">Réinitialiser les filtres</button>`)
      : empty('listc', 'Aucune tâche', 'Ajoute ta première tâche avec le bouton +.', `<button class="btn primary sm" data-act="newTask" style="margin-top:8px">${ic('plus')} Nouvelle tâche</button>`);
  const doneL = ui.f.status === 'open' ? filtered('done').sort((x, y) => (y.doneAt || 0) - (x.doneAt || 0)) : [];
  if (!a.length && doneL.length && !filt) box.innerHTML = empty('spark', 'Tout est fait !', 'Tes tâches terminées sont juste en dessous.');
  box.insertAdjacentHTML('beforeend', doneSection(doneL, 'Terminées', true));
  if (ui.f.status !== 'open' && S.tasks.some(t => t.done)) box.insertAdjacentHTML('beforeend', `<div class="listfoot"><button class="link" data-act="clearDone">${ic('trash')} Supprimer les tâches terminées</button></div>`);
  const n = a.length;
  $('#tcount').textContent = ui.f.status === 'open' ? `${n} à faire${doneL.length ? ` · ${doneL.length} terminée${doneL.length > 1 ? 's' : ''}` : ''}` : `${n} tâche${n > 1 ? 's' : ''}`;
  if (drag) enableDrag($('#tl'));
}
function enableDrag(box) {
  if (!box) return;
  const EASE = 'transform .24s cubic-bezier(.2,.8,.2,1)';
  $$('.grip', box).forEach(h => h.addEventListener('pointerdown', e => {
    e.preventDefault();
    const row = h.closest('.task');
    const r0 = row.getBoundingClientRect();
    const grab = e.clientY - r0.top;
    let ty = 0;
    row.classList.add('dragging');
    row.style.transition = 'box-shadow .2s, background .2s';
    box.classList.add('sorting');
    $$('.stagger').forEach(x => x.classList.toggle('stagger', false));
    try { navigator.vibrate?.(8); } catch (_) { /* */ }
    try { h.setPointerCapture(e.pointerId); } catch (_) { /* */ }
    const top0 = () => box.getBoundingClientRect().top + box.clientTop;
    const place = y => {
      ty = y - top0() - grab - row.offsetTop;
      row.style.transform = `translateY(${ty}px) scale(1.03)`;
    };
    const move = ev => {
      const y = ev.clientY, bt = top0();
      const center = y - bt - grab + row.offsetHeight / 2;
      const others = $$('.task:not(.dragging)', box);
      let before = null;
      for (const r of others) { if (center < r.offsetTop + r.offsetHeight / 2) { before = r; break; } }
      if (before !== row.nextElementSibling) {
        const first = new Map(others.map(r => [r, r.getBoundingClientRect().top]));
        box.insertBefore(row, before);
        others.forEach(r => {
          const dy = first.get(r) - (bt + r.offsetTop);
          if (Math.abs(dy) < 1) return;
          r.style.transition = 'none';
          r.style.transform = `translateY(${dy}px)`;
          void r.offsetWidth;
          r.style.transition = EASE;
          r.style.transform = '';
        });
        try { navigator.vibrate?.(4); } catch (_) { /* */ }
      }
      place(y);
      if (y < 80) window.scrollBy(0, -10); else if (y > innerHeight - 120) window.scrollBy(0, 10);
    };
    const up = () => {
      row.style.transition = EASE + ', box-shadow .25s';
      row.style.transform = '';
      row.classList.remove('dragging');
      row.classList.add('dropped');
      box.classList.remove('sorting');
      setTimeout(() => { row.classList.remove('dropped'); row.style.transition = ''; $$('.task', box).forEach(r => { r.style.transition = ''; }); }, 420);
      const ids = $$('.task', box).map(r => r.dataset.id);
      const vis = ids.map(id => S.tasks.find(t => t.id === id)).filter(Boolean);
      const orders = vis.map(t => t.order).sort((x, y) => x - y);
      vis.forEach((t, i) => { t.order = orders[i]; });
      save();
    };
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); up(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }));
}

/* ---------- Petites animations ---------- */
function collapse(el, done) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
  el.style.height = el.offsetHeight + 'px';
  el.style.overflow = 'hidden';
  void el.offsetHeight;
  el.classList.add('leaving');
  el.style.height = '0px';
  setTimeout(done, 280);
}
const rowOf = id => document.querySelector(`#main .task[data-id="${CSS.escape(id)}"]`);

/* ---------- Vue : Emploi du temps ---------- */
function weekDays() {
  const mon = addDays(mondayOf(todayK()), ui.week * 7);
  return [...Array(S.set.weekend ? 7 : 5)].map((_, i) => addDays(mon, i));
}
function vPlanning() {
  const days = weekDays(), k = todayK(), n = days.length;
  if (!ui.day || !days.includes(ui.day)) ui.day = days.includes(k) ? k : days[0];
  const from = Math.min(S.set.from, ...S.slots.map(s => Math.floor(toMin(s.start) / 60)));
  const to = Math.max(S.set.to, ...S.slots.map(s => Math.ceil(toMin(s.end) / 60)));
  const hh = 56, H = (to - from) * hh;
  const first = days[0], last = days[n - 1];
  const range = D(first).getMonth() === D(last).getMonth()
    ? `${D(first).getDate()} au ${fmt(last, { day: 'numeric', month: 'long' })}`
    : `${fmt(first, { day: 'numeric', month: 'short' })} au ${fmt(last, { day: 'numeric', month: 'short' })}`;
  const tasksOn = d => S.tasks.filter(t => !t.done && t.due === d);
  const pos = (a, b) => { const t = Math.max(0, (toMin(a) - from * 60) / 60 * hh); const h = Math.max(24, (toMin(b) - toMin(a)) / 60 * hh - 3); return `top:${t + 1}px;height:${h}px`; };

  const grid = `<div class="tt only-wide" style="--n:${n};--hh:${hh}px"><div class="tt-scroll" id="ttScroll">
    <div class="tt-head"><div class="tt-corner"></div>${days.map(d => {
      const ts = tasksOn(d).filter(t => !t.time), hol = holiday(d);
      return `<div class="${d === k ? 'today' : ''} ${hol ? 'hol' : ''}"><div class="dn">${DAYS[wd(d)].slice(0, 3)}</div><div class="dd">${D(d).getDate()}</div>${hol ? `<div class="holtag" title="Jour férié">${esc(hol)}</div>` : ''}
        ${ts.length ? `<div class="dt">${ts.slice(0, 2).map(t => `<button data-act="editTask" data-id="${t.id}" title="${esc(t.title)}">${esc(t.title)}</button>`).join('')}${ts.length > 2 ? `<button data-act="goDay" data-k="${d}">+${ts.length - 2} autre${ts.length > 3 ? 's' : ''}</button>` : ''}</div>` : ''}</div>`;
    }).join('')}</div>
    <div class="tt-grid" style="height:${H}px">
      <div class="tt-hours">${[...Array(to - from)].map((_, i) => i ? `<span style="top:${i * hh}px">${pad(from + i)}:00</span>` : '').join('')}</div>
      ${days.map(d => {
        const items = slotsFor(d).map(s => `<button class="slot" style="--c:${s.color};${pos(s.start, s.end)}" data-act="editSlot" data-id="${s.id}"><b>${esc(s.title)}</b><small>${esc(s.start)} – ${esc(s.end)}</small>${s.place ? `<small>${esc(s.place)}</small>` : ''}</button>`).join('');
        const tt = tasksOn(d).filter(t => t.time).map(t => { const e = pad(Math.min(23, Math.floor(toMin(t.time) / 60) + 1)) + ':' + t.time.slice(3); return `<button class="slot task-slot" style="${pos(t.time, e).replace(/height:[\d.]+px/, 'height:30px')}" data-act="editTask" data-id="${t.id}"><b>${ic('check')} ${esc(t.title)}</b></button>`; }).join('');
        const now = d === k && nowMin() >= from * 60 && nowMin() <= to * 60 ? `<div class="now" style="top:${(nowMin() - from * 60) / 60 * hh}px"></div>` : '';
        return `<div class="tt-col ${d === k ? 'today' : ''} ${holiday(d) ? 'hol' : ''}" data-col="${d}" data-from="${from}">${items}${tt}${now}</div>`;
      }).join('')}
    </div></div></div>`;

  const sel = ui.day;
  const its = [
    ...slotsFor(sel).map(s => ({ m: toMin(s.start), h: agendaItem(s, sel) })),
    ...tasksOn(sel).filter(t => t.time).map(t => ({ m: toMin(t.time), h: `<button class="aitem is-task" data-act="editTask" data-id="${t.id}"><div class="tm">${esc(t.time)}</div><span class="bar"></span><div class="tx"><b>${esc(t.title)}</b><small>${ic('check')}Tâche · ${esc(listOf(t.list).name)}</small></div></button>` }))
  ].sort((a, b) => a.m - b.m);
  const untimed = tasksOn(sel).filter(t => !t.time);
  const narrow = `<div class="only-narrow">
    <div class="daystrip" style="--n:${n}">${days.map(d => `<button class="${d === sel ? 'on' : ''} ${d === k ? 'today' : ''} ${holiday(d) ? 'hol' : ''}" data-act="pickDay" data-k="${d}"><small>${DAYS[wd(d)].slice(0, 3)}</small><b>${D(d).getDate()}</b>${slotsFor(d).length || tasksOn(d).length ? '<i></i>' : ''}</button>`).join('')}</div>
    <h2 class="sec">${fmt(sel, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase())}<button class="link" data-act="newSlot" data-k="${sel}">${ic('plus')}</button></h2>
    ${holiday(sel) ? `<div class="holbanner">${ic('spark')}<div><b>Jour férié · ${esc(holiday(sel))}</b><small>${S.set.holidayClasses ? 'Tes cours habituels restent affichés.' : 'Tes cours habituels ne sont pas affichés ce jour-là.'}</small></div></div>` : ''}
    ${its.length ? `<div class="agenda">${its.map(x => x.h).join('')}</div>` : empty('calendar', 'Journée libre', 'Aucun cours ni tâche à heure fixe.', `<button class="btn sm" data-act="newSlot" data-k="${sel}" style="margin-top:8px">${ic('plus')} Ajouter un créneau</button>`)}
    ${untimed.length ? `<h2 class="sec" style="margin-top:22px">${ic('listc')} Tâches du jour <small>${untimed.length}</small></h2><div class="tlist">${untimed.map(t => taskRow(t)).join('')}</div>` : ''}
  </div>`;

  return `<div class="fadein stagger">
  <header class="head"><div><h1>Emploi du temps</h1><p>Semaine du ${range}${(() => { const nh = nextHoliday(first); return nh ? ` · ${days.includes(nh[0]) ? 'férié cette semaine' : 'prochain férié'} : ${esc(nh[1])}, ${fmt(nh[0], { weekday: 'long', day: 'numeric', month: 'long' })}` : ''; })()}</p></div>
    <div class="actions">
      <div class="weeknav"><button class="btn icon" data-act="week" data-v="-1" aria-label="Semaine précédente">${ic('left')}</button><button class="btn" data-act="week" data-v="0">Aujourd’hui</button><button class="btn icon" data-act="week" data-v="1" aria-label="Semaine suivante">${ic('right')}</button></div>
      <button class="btn primary hide-narrow" data-act="newSlot">${ic('plus')} Créneau</button>
    </div></header>
  ${grid}${narrow}
  <p style="color:var(--muted);font-size:13px;margin:12px 4px" class="only-wide">Astuce : clique dans une case vide pour ajouter un créneau à cette heure.</p></div>`;
}

/* ---------- Vue : Notes ---------- */
function vNotes() {
  return `<div class="fadein stagger">
  <header class="head"><div><h1>Notes</h1><p id="ncount"></p></div><div class="actions hide-narrow"><button class="btn primary" data-act="newNote">${ic('plus')} Nouvelle note</button></div></header>
  <div class="toolbar"><label class="search">${ic('search')}<input id="nq" type="search" placeholder="Rechercher dans les notes…" value="${esc(ui.noteQ)}" autocomplete="off"></label></div>
  <div id="nlist"></div></div>`;
}
function renderNotes() {
  const box = $('#nlist'); if (!box) return;
  const q = ui.noteQ.toLowerCase();
  const a = S.notes.filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q)).sort((x, y) => (y.pin - x.pin) || y.upd - x.upd);
  $('#ncount').textContent = `${S.notes.length} note${S.notes.length > 1 ? 's' : ''}`;
  box.innerHTML = a.length ? `<div class="ngrid">${a.map(n => `<button class="card ncard" ${n.color ? `style="--c:${n.color}"` : ''} data-act="editNote" data-id="${n.id}">
      <h3>${n.pin ? ic('pin') : ''}<span>${esc(n.title || 'Sans titre')}</span></h3><div class="nprev">${n.html != null ? cleanHTML(n.html.slice(0, 4000)) : textToHTML(n.body.slice(0, 400))}</div>
      <small>${new Date(n.upd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${new Date(n.upd).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></button>`).join('')}</div>`
    : q ? empty('search', 'Aucune note trouvée', 'Essaie un autre mot.') : empty('note', 'Aucune note', 'Garde ici tes idées, tes listes, tes infos importantes.', `<button class="btn primary sm" data-act="newNote" style="margin-top:8px">${ic('plus')} Nouvelle note</button>`);
}

/* ---------- Vue : Réglages ---------- */
function vSettings() {
  const st = S.set;
  return `<div class="fadein stagger" style="max-width:720px">
  <header class="head"><div><h1>Réglages</h1><p>Personnalise ton Bloc Note</p></div></header>
  <div class="sgroup"><h3>Profil</h3><div class="srows">
    ${window.BNSync ? BNSync.row() : ''}
    <div class="srow"><div class="lbl"><span class="sic" style="--c:#5b5bd6">${ic('user')}</span><div>Ton prénom<small>Pour le message d’accueil</small></div></div><input type="text" id="sName" value="${esc(st.name)}" placeholder="Prénom" maxlength="30"></div>
  </div></div>
  <div class="sgroup"><h3>Apparence</h3><div class="srows">
    <div class="srow"><div class="lbl"><span class="sic" style="--c:#1c1c1e">${ic('moon')}</span>Thème</div>
      <div class="seg">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<button class="${st.theme === v ? 'on' : ''}" data-act="setTheme" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="srow"><div class="lbl"><span class="sic" style="--c:${st.accent}">${ic('palette')}</span>Couleur principale</div>
      <div class="swatches">${COLORS.slice(0, 10).map(c => `<button class="sw ${st.accent === c ? 'on' : ''}" style="--c:${c}" data-act="setAccent" data-v="${c}" aria-label="Couleur ${c}"></button>`).join('')}</div></div>
  </div></div>
  <div class="sgroup"><h3>Emploi du temps</h3><div class="srows">
    <div class="srow"><div class="lbl"><span class="sic" style="--c:#ff9500">${ic('calendar')}</span><div>Afficher le week-end<small>Samedi et dimanche</small></div></div><label class="switch"><input type="checkbox" id="sWe" ${st.weekend ? 'checked' : ''}><span></span></label></div>
    <div class="srow"><div class="lbl"><span class="sic" style="--c:#ff3b30">${ic('spark')}</span><div>Cours les jours fériés<small>Afficher tes cours habituels même les jours fériés</small></div></div><label class="switch"><input type="checkbox" id="sHol" ${st.holidayClasses ? 'checked' : ''}><span></span></label></div>
    <div class="srow"><div class="lbl"><span class="sic" style="--c:#32ade6">${ic('clock')}</span><div>Heures affichées<small>Début et fin de journée</small></div></div>
      <div style="display:flex;gap:8px;align-items:center"><input type="number" id="sFrom" min="0" max="12" value="${st.from}" style="width:76px"> à <input type="number" id="sTo" min="13" max="24" value="${st.to}" style="width:76px"> h</div></div>
  </div></div>
  <div class="sgroup"><h3>Listes</h3><div class="srows">
    ${S.lists.map(l => `<div class="srow"><div class="lbl"><span class="sic" style="--c:${l.color}">${ic('folder')}</span><div>${esc(l.name)}<small>${S.tasks.filter(t => t.list === l.id && !t.done).length} à faire</small></div></div><button class="btn sm" data-act="editList" data-id="${l.id}">${ic('edit')} Modifier</button></div>`).join('')}
    <div class="srow"><button class="btn ghost" data-act="newList">${ic('plus')} Nouvelle liste</button></div>
  </div></div>
  <div class="sgroup"><h3>Sauvegarde</h3><div class="srows">
    <div class="srow"><div class="lbl"><span class="sic" style="--c:#34c759">${ic('download')}</span><div>Exporter mes données<small>Un fichier à garder ou à ouvrir sur un autre appareil</small></div></div><button class="btn sm" data-act="export">Exporter</button></div>
    <div class="srow"><div class="lbl"><span class="sic" style="--c:#007aff">${ic('upload')}</span><div>Importer une sauvegarde<small>Remplace les données actuelles</small></div></div><button class="btn sm" data-act="import">Importer</button></div>
    <div class="srow"><div class="lbl"><span class="sic" style="--c:#ff3b30">${ic('trash')}</span><div>Tout effacer<small>Tâches, emploi du temps et notes</small></div></div><button class="btn sm danger" data-act="reset">Effacer</button></div>
  </div></div>
  <p style="color:var(--muted);font-size:13px;text-align:center;margin-top:26px">Bloc Note · tes données restent sur cet appareil.<br>Astuce iPhone : Partager → « Sur l’écran d’accueil » pour l’installer comme une app.</p>
  </div>`;
}

/* ---------- Feuilles (modales) ---------- */
let sheetClose = null;
function openSheet(html, mount, onClose) {
  const root = $('#sheetRoot');
  if (sheetOpen()) { sheetClose = null; root.innerHTML = ''; }
  root.innerHTML = `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const ov = $('.overlay', root);
  ov.addEventListener('pointerdown', e => { if (e.target === ov) closeSheet(); });
  $$('[data-close]', ov).forEach(b => b.addEventListener('click', () => closeSheet()));
  sheetClose = onClose || null;
  document.body.style.overflow = 'hidden';
  mount && mount($('.sheet', ov));
}
const sheetOpen = () => !!$('#sheetRoot .overlay:not(.closing)');
function closeSheet(silent) {
  const root = $('#sheetRoot');
  const ov = $('.overlay:not(.closing)', root);
  if (!ov) return;
  const cb = sheetClose; sheetClose = null;
  ov.classList.add('closing');
  setTimeout(() => ov.remove(), 260);
  document.body.style.overflow = '';
  if (!silent && cb) cb();
}
const shake = el => { el.classList.remove('err'); void el.offsetWidth; el.classList.add('err'); el.focus(); };

function taskSheet(id, preset = {}) {
  const src = id ? S.tasks.find(x => x.id === id) : null;
  if (id && !src) return;
  const t = src ? structuredClone(src) : { title: '', notes: '', prio: 0, due: '', time: '', list: ui.f.list !== 'all' ? ui.f.list : (S.lists[0]?.id || ''), tags: [], subs: [], ...preset };
  const k = todayK();
  const quick = [['Aujourd’hui', k], ['Demain', addDays(k, 1)], ['Lundi prochain', addDays(mondayOf(k), 7)], ['Sans date', '']];
  openSheet(`
    <div class="sh-head"><button class="btn ghost" data-close>Annuler</button><h3>${id ? 'Modifier la tâche' : 'Nouvelle tâche'}</h3><button class="btn primary sm" id="tSave">${id ? 'Enregistrer' : 'Ajouter'}</button></div>
    <div class="sh-body">
      <input class="big" id="tT" placeholder="Que dois-tu faire ?" value="${esc(t.title)}" autocomplete="off" enterkeyhint="done">
      <textarea id="tN" placeholder="Notes, détails…" rows="3">${esc(t.notes)}</textarea>
      <div class="field"><label>${ic('flag')} Priorité</label><div class="prio" id="tP">${PRIO.map((p, i) => `<button type="button" data-p="${i}" class="${i === t.prio ? 'on' : ''}" style="--c:${p.c}">${i ? ic('flag') : ''}${p.n}</button>`).join('')}</div></div>
      <div class="field"><label>${ic('calendar')} Échéance</label>
        <div class="daychips">${quick.map(([l, v]) => `<button type="button" class="chip ${t.due === v ? 'on' : ''}" data-d="${v}">${l}</button>`).join('')}</div>
        <div class="grid2"><input type="date" id="tD" value="${esc(t.due)}" aria-label="Date"><input type="time" id="tH" value="${esc(t.time)}" aria-label="Heure"></div></div>
      <div class="grid2">
        <div class="field"><label>${ic('folder')} Liste</label><select id="tL"><option value="">Sans liste</option>${S.lists.map(l => `<option value="${l.id}" ${t.list === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
        <div class="field"><label>${ic('hash')} Étiquettes</label><input id="tG" placeholder="partiel, urgent" value="${esc(t.tags.join(', '))}" autocomplete="off"></div>
      </div>
      <div class="field"><label>${ic('subtask')} Sous-tâches</label><div class="subs" id="tS"></div>
        <div class="addsub"><input id="tSn" placeholder="Ajouter une étape…" autocomplete="off" enterkeyhint="done"><button type="button" class="btn icon" id="tSa" aria-label="Ajouter l’étape">${ic('plus')}</button></div></div>
      ${id ? `<button class="btn danger wide" id="tDel">${ic('trash')} Supprimer la tâche</button>` : ''}
    </div>`, sh => {
    const subsBox = $('#tS', sh);
    const drawSubs = () => {
      subsBox.innerHTML = t.subs.map((s, i) => `<div class="sub ${s.done ? 'done' : ''}"><button type="button" class="chk" data-i="${i}" aria-label="Cocher">${ic('check')}</button><span>${esc(s.t)}</span><button type="button" class="mini" data-rm="${i}" aria-label="Retirer">${ic('x')}</button></div>`).join('');
    };
    drawSubs();
    subsBox.addEventListener('click', e => {
      const c = e.target.closest('[data-i]'), r = e.target.closest('[data-rm]');
      if (c) { t.subs[+c.dataset.i].done = !t.subs[+c.dataset.i].done; drawSubs(); }
      if (r) { t.subs.splice(+r.dataset.rm, 1); drawSubs(); }
    });
    const addSub = () => { const v = $('#tSn', sh).value.trim(); if (!v) return; t.subs.push({ t: v, done: false }); $('#tSn', sh).value = ''; drawSubs(); $('#tSn', sh).focus(); };
    $('#tSa', sh).addEventListener('click', addSub);
    $('#tSn', sh).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } });
    $('#tP', sh).addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; t.prio = +b.dataset.p; $$('#tP button', sh).forEach(x => x.classList.toggle('on', x === b)); });
    const syncChips = () => $$('.daychips .chip', sh).forEach(c => c.classList.toggle('on', c.dataset.d === $('#tD', sh).value));
    $('.daychips', sh).addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; $('#tD', sh).value = b.dataset.d; if (!b.dataset.d) $('#tH', sh).value = ''; syncChips(); });
    $('#tD', sh).addEventListener('change', syncChips);
    const doSave = () => {
      const title = $('#tT', sh).value.trim();
      if (!title) return shake($('#tT', sh));
      const data = {
        title, notes: $('#tN', sh).value.trim(), prio: t.prio, due: $('#tD', sh).value, time: $('#tD', sh).value ? $('#tH', sh).value : '',
        list: $('#tL', sh).value, tags: $('#tG', sh).value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean), subs: t.subs
      };
      if (src) Object.assign(src, data);
      else { const nid = uid(); ui.flash = nid; S.tasks.push({ id: nid, ...data, done: false, doneAt: 0, created: Date.now(), order: nextOrder() }); }
      save(); closeSheet(true); render(); toast(src ? 'Tâche modifiée' : 'Tâche ajoutée');
    };
    $('#tSave', sh).addEventListener('click', doSave);
    $('#tT', sh).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSave(); } });
    if (src) $('#tDel', sh).addEventListener('click', () => { closeSheet(true); removeTask(src.id); });
    if (!id) setTimeout(() => $('#tT', sh).focus(), 60);
  });
}
function removeTask(id) {
  const i = S.tasks.findIndex(t => t.id === id); if (i < 0) return;
  const [t] = S.tasks.splice(i, 1); save();
  collapse(rowOf(id), render);
  toast('Tâche supprimée', () => { S.tasks.splice(i, 0, t); ui.flash = t.id; save(); render(); });
}

function slotSheet(id, preset = {}) {
  const src = id ? S.slots.find(x => x.id === id) : null;
  if (id && !src) return;
  const base = preset.date || ui.day || todayK();
  const s = src ? { ...src } : { title: '', day: wd(base), start: '08:00', end: '10:00', place: '', color: COLORS[1], note: '', once: '', ...preset };
  delete s.date;
  let date = s.once || preset.date || addDays(mondayOf(base), s.day);
  const rep = !s.once;
  const days = new Set([s.day]);
  openSheet(`
    <div class="sh-head"><button class="btn ghost" data-close>Annuler</button><h3>${id ? 'Modifier le créneau' : 'Nouveau créneau'}</h3><button class="btn primary sm" id="sSave">${id ? 'Enregistrer' : 'Ajouter'}</button></div>
    <div class="sh-body">
      <input class="big" id="sT" placeholder="Nom du cours ou de l’activité" value="${esc(s.title)}" autocomplete="off">
      <div class="field"><label>${ic('repeat')} Répétition</label><div class="seg" id="sR"><button type="button" data-r="1" class="${rep ? 'on' : ''}">Chaque semaine</button><button type="button" data-r="0" class="${rep ? '' : 'on'}">Une seule fois</button></div></div>
      <div class="field"><label>${ic('calendar')} Jour(s) <span class="lblnote">plusieurs possibles</span></label><div class="daychips" id="sDay">${DAYS.map((d, i) => `<button type="button" class="chip ${s.day === i ? 'on' : ''}" data-day="${i}">${d}</button>`).join('')}</div>
        <div class="dayquick"><button type="button" class="link" data-q="week">Lun → Ven</button><button type="button" class="link" data-q="all">Tous les jours</button><button type="button" class="link" data-q="one">Un seul jour</button></div>
        <div id="sDateF" ${rep ? 'hidden' : ''}><input type="date" id="sDate" value="${esc(date)}" aria-label="Date"></div>
        <small class="hint" id="sHint"></small></div>
      <div class="grid2"><div class="field"><label>${ic('clock')} Début</label><input type="time" id="sA" value="${esc(s.start)}"></div><div class="field"><label>${ic('clock')} Fin</label><input type="time" id="sB" value="${esc(s.end)}"></div></div>
      <div class="field"><label>${ic('mappin')} Lieu / salle</label><input id="sP" placeholder="ex : Salle B204" value="${esc(s.place)}" autocomplete="off"></div>
      <div class="field"><label>${ic('palette')} Couleur</label><div class="swatches" id="sC">${COLORS.map(c => `<button type="button" class="sw ${s.color === c ? 'on' : ''}" style="--c:${c}" data-c="${c}" aria-label="Couleur"></button>`).join('')}</div></div>
      <textarea id="sN" placeholder="Remarque (prof, matériel à prendre…)" rows="2">${esc(s.note)}</textarea>
      ${id ? `<button class="btn danger wide" id="sDel">${ic('trash')} Supprimer le créneau</button>` : ''}
    </div>`, sh => {
    let repeat = rep;
    const sorted = () => [...days].sort((x, y) => x - y);
    const dateOf = d => addDays(mondayOf(date), d);
    const hint = () => {
      const ds = sorted();
      let txt;
      if (repeat) {
        const names = ds.map(d => DAYS[d].toLowerCase() + 's');
        txt = ds.length === 7 ? 'Tous les jours' : ds.join() === '0,1,2,3,4' ? 'Du lundi au vendredi, chaque semaine' : 'Tous les ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' et ' + names.at(-1) : names[0]);
      } else {
        const list = ds.map(d => dateOf(d));
        txt = list.length === 1
          ? fmt(list[0], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())
          : list.map(k => fmt(k, { weekday: 'short', day: 'numeric' })).join(', ') + ' ' + fmt(list.at(-1), { month: 'long' });
        const hols = list.filter(k => holiday(k));
        if (hols.length) txt += ` · férié : ${hols.map(k => holiday(k)).join(', ')}`;
      }
      if (ds.length > 1) txt += ` · ${ds.length} créneaux`;
      $('#sHint', sh).textContent = txt;
      $$('#sDay .chip', sh).forEach(x => x.classList.toggle('on', days.has(+x.dataset.day)));
      $('#sSave', sh).textContent = src ? 'Enregistrer' : ds.length > 1 ? `Ajouter (${ds.length})` : 'Ajouter';
    };
    hint();
    $('#sR', sh).addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; repeat = b.dataset.r === '1'; $$('#sR button', sh).forEach(x => x.classList.toggle('on', x === b)); $('#sDateF', sh).hidden = repeat; hint(); });
    $('#sDay', sh).addEventListener('click', e => {
      const b = e.target.closest('[data-day]'); if (!b) return;
      const d = +b.dataset.day;
      if (days.has(d)) { if (days.size > 1) days.delete(d); } else days.add(d);
      date = dateOf(sorted()[0]);
      $('#sDate', sh).value = date;
      hint();
    });
    $('.dayquick', sh).addEventListener('click', e => {
      const b = e.target.closest('[data-q]'); if (!b) return;
      const keep = sorted()[0];
      days.clear();
      ({ week: [0, 1, 2, 3, 4], all: [0, 1, 2, 3, 4, 5, 6], one: [keep] })[b.dataset.q].forEach(d => days.add(d));
      date = dateOf(sorted()[0]); $('#sDate', sh).value = date;
      hint();
    });
    $('#sDate', sh).addEventListener('change', e => { if (!e.target.value) return; date = e.target.value; days.clear(); days.add(wd(date)); hint(); });
    $('#sC', sh).addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; s.color = b.dataset.c; $$('#sC .sw', sh).forEach(x => x.classList.toggle('on', x === b)); });
    $('#sA', sh).addEventListener('change', () => { const a = toMin($('#sA', sh).value), b = toMin($('#sB', sh).value); if (b <= a) { const e = Math.min(a + 60, 23 * 60 + 59); $('#sB', sh).value = pad(Math.floor(e / 60)) + ':' + pad(e % 60); } });
    $('#sSave', sh).addEventListener('click', () => {
      const title = $('#sT', sh).value.trim();
      if (!title) return shake($('#sT', sh));
      const a = $('#sA', sh).value, b = $('#sB', sh).value;
      if (!a || !b || toMin(b) <= toMin(a)) return shake($('#sB', sh));
      if (!repeat && !date) return shake($('#sDate', sh));
      const ds = sorted();
      const common = { title, start: a, end: b, place: $('#sP', sh).value.trim(), color: s.color, note: $('#sN', sh).value.trim() };
      const make = d => ({ ...common, once: repeat ? '' : dateOf(d), day: d });
      s.day = ds[0]; date = dateOf(ds[0]);
      if (!src) { const wk = Math.round((D(mondayOf(repeat ? addDays(mondayOf(base), s.day) : date)) - D(mondayOf(todayK()))) / (7 * 864e5)); ui.day = repeat ? addDays(mondayOf(base), s.day) : date; if (!repeat) ui.week = wk; }
      if (src) { Object.assign(src, make(ds[0])); ds.slice(1).forEach(d => S.slots.push({ id: uid(), ...make(d) })); }
      else ds.forEach(d => S.slots.push({ id: uid(), ...make(d) }));
      save(); closeSheet(true); render();
      toast(ds.length > 1 ? `${src ? 'Créneau modifié et copié' : ds.length + ' créneaux ajoutés'}` : src ? 'Créneau modifié' : 'Créneau ajouté');
    });
    if (src) $('#sDel', sh).addEventListener('click', () => {
      const i = S.slots.indexOf(src); S.slots.splice(i, 1); save(); closeSheet(true); render();
      toast('Créneau supprimé', () => { S.slots.splice(i, 0, src); save(); render(); });
    });
    if (!id) setTimeout(() => $('#sT', sh).focus(), 60);
  });
}

/* ---------- Éditeur de texte des notes ---------- */
const RTE_FONTS = [
  ['Système', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'],
  ['Serif', 'Georgia, "Times New Roman", serif'],
  ['Arrondie', '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", sans-serif'],
  ['Manuscrite', '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive'],
  ['Machine', 'ui-monospace, Menlo, Consolas, monospace']
];
const RTE_SIZES = [['Petit', '2'], ['Normal', '3'], ['Grand', '5'], ['Très grand', '6']];
const RTE_COLORS = ['#1c1c1e', '#8e8e93', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#30b0a0', '#007aff', '#5b5bd6', '#af52de', '#ff2d55', '#a2845e'];
const RTE_MARKS = ['#fff3a3', '#ffd6a5', '#ffc2d1', '#caffbf', '#bde0fe', '#e2d5ff'];
const RTE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SPAN', 'FONT', 'BR', 'DIV', 'P', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'MARK', 'SUB', 'SUP', 'HR']);
const RTE_CSS = new Set(['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align']);
/* Ne garde que la mise en forme autorisée (protège contre tout code collé) */
function cleanHTML(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html || '');
  const walk = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) return;
      if (ch.nodeType !== 1) { ch.remove(); return; }
      if (!RTE_TAGS.has(ch.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'svg', 'SVG', 'IMG', 'VIDEO', 'AUDIO', 'TEMPLATE'].includes(ch.tagName)) { ch.remove(); return; }
        walk(ch); ch.replaceWith(...ch.childNodes); return;
      }
      const keep = {};
      if (ch.tagName === 'FONT') ['color', 'face', 'size'].forEach(a => { const v = ch.getAttribute(a); if (v && /^[#\w\s,"'-]{1,120}$/.test(v)) keep[a] = v; });
      const st = [];
      for (const prop of ch.style || []) if (RTE_CSS.has(prop)) { const v = ch.style.getPropertyValue(prop); if (!/url\(|expression|javascript/i.test(v)) st.push(`${prop}:${v}`); }
      const cls = (ch.getAttribute('class') || '').split(/\s+/).filter(c => c === 'checklist' || c === 'done');
      [...ch.attributes].forEach(a => ch.removeAttribute(a.name));
      Object.entries(keep).forEach(([k, v]) => ch.setAttribute(k, v));
      if (st.length) ch.setAttribute('style', st.join(';'));
      if (cls.length) ch.setAttribute('class', cls.join(' '));
      walk(ch);
    });
  };
  walk(tpl.content);
  return tpl.innerHTML;
}
const textToHTML = t => esc(t || '').replace(/\n/g, '<br>');
const noteHTML = n => n.html != null ? cleanHTML(n.html) : textToHTML(n.body);

function rteToolbar() {
  const b = (cmd, label, title, extra = '') => `<button type="button" class="rb" data-cmd="${cmd}" title="${title}" aria-label="${title}" ${extra}>${label}</button>`;
  return `<div class="rte-bar" id="rteBar">
    <label class="rsel" title="Police"><select data-sel="fontName" aria-label="Police">${RTE_FONTS.map(([n, f]) => `<option value='${f}' style='font-family:${f}'>${n}</option>`).join('')}</select></label>
    <label class="rsel" title="Taille"><select data-sel="fontSize" aria-label="Taille">${RTE_SIZES.map(([n, v]) => `<option value="${v}" ${v === '3' ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <span class="rsep"></span>
    ${b('bold', '<b>G</b>', 'Gras')}${b('italic', '<i>I</i>', 'Italique')}${b('underline', '<u>S</u>', 'Souligné')}${b('strikeThrough', '<s class="rabc">abc</s>', 'Barré')}
    <span class="rsep"></span>
    ${b('pop-color', '<span class="rcol">A<i id="rColBar"></i></span>', 'Couleur du texte')}${b('pop-mark', '<span class="rmark">ab</span>', 'Surligner')}
    <span class="rsep"></span>
    ${b('h2', 'T<sub>1</sub>', 'Titre')}${b('h3', 'T<sub>2</sub>', 'Sous-titre')}${b('quote', '❝', 'Citation')}
    <span class="rsep"></span>
    ${b('insertUnorderedList', ic('listc').replace('class="ic ', 'class="ic rli '), 'Liste à puces')}${b('insertOrderedList', '1.', 'Liste numérotée')}${b('check', '☑', 'Liste à cocher')}
    <span class="rsep"></span>
    ${b('justifyLeft', '⇤', 'Aligner à gauche')}${b('justifyCenter', '≡', 'Centrer')}${b('justifyRight', '⇥', 'Aligner à droite')}
    <span class="rsep"></span>
    ${b('undo', '↶', 'Annuler')}${b('redo', '↷', 'Rétablir')}${b('removeFormat', '<span class="rclear">T</span>', 'Effacer la mise en forme')}
  </div>
  <div class="rte-pop" id="rtePop" hidden></div>`;
}
function bindRTE(sh, ed, onChange) {
  const bar = $('#rteBar', sh), pop = $('#rtePop', sh);
  let range = null;
  const inside = () => { const s = getSelection(); return s.rangeCount && ed.contains(s.anchorNode); };
  const keep = () => { if (inside()) range = getSelection().getRangeAt(0).cloneRange(); };
  const restore = () => { if (inside() && document.activeElement === ed) return; ed.focus({ preventScroll: true }); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
  const exec = (cmd, val = null) => { restore(); try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* */ } document.execCommand(cmd, false, val); keep(); onChange(); refresh(); };
  const block = tag => {
    restore();
    const cur = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    document.execCommand('formatBlock', false, cur === tag ? '<div>' : `<${tag}>`);
    keep(); onChange(); refresh();
  };
  const refresh = () => {
    if (!inside()) return;
    ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'justifyCenter', 'justifyRight'].forEach(c => {
      let on = false; try { on = document.queryCommandState(c); } catch (e) { /* */ }
      bar.querySelector(`[data-cmd="${c}"]`)?.classList.toggle('on', on);
    });
    const fb = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    bar.querySelector('[data-cmd="h2"]').classList.toggle('on', fb === 'h2');
    bar.querySelector('[data-cmd="h3"]').classList.toggle('on', fb === 'h3');
    bar.querySelector('[data-cmd="quote"]').classList.toggle('on', fb === 'blockquote');
    const node = getSelection().anchorNode, el = node && (node.nodeType === 1 ? node : node.parentElement);
    bar.querySelector('[data-cmd="check"]').classList.toggle('on', !!el?.closest('ul.checklist'));
  };
  const showPop = kind => {
    if (!pop.hidden && pop.dataset.kind === kind) { pop.hidden = true; return; }
    pop.dataset.kind = kind; pop.hidden = false;
    const list = kind === 'color' ? RTE_COLORS : RTE_MARKS;
    pop.innerHTML = `<span class="rpl">${kind === 'color' ? 'Couleur du texte' : 'Surligneur'}</span>${list.map(c => `<button type="button" class="sw" style="--c:${c}" data-v="${c}" aria-label="${c}"></button>`).join('')}<button type="button" class="rb rnone" data-v="">${kind === 'color' ? 'Auto' : 'Aucun'}</button>`;
  };
  // Les boutons ne doivent pas faire perdre la sélection
  bar.addEventListener('pointerdown', e => { if (e.target.closest('.rb')) e.preventDefault(); });
  pop.addEventListener('pointerdown', e => e.preventDefault());
  bar.addEventListener('click', e => {
    const btn = e.target.closest('[data-cmd]'); if (!btn) return;
    const c = btn.dataset.cmd;
    if (c === 'pop-color') return showPop('color');
    if (c === 'pop-mark') return showPop('mark');
    pop.hidden = true;
    if (c === 'h2' || c === 'h3') return block(c);
    if (c === 'quote') return block('blockquote');
    if (c === 'removeFormat') { exec('removeFormat'); restore(); document.execCommand('formatBlock', false, '<div>'); onChange(); return refresh(); }
    if (c === 'check') {
      restore();
      const node = getSelection().anchorNode, el = node && (node.nodeType === 1 ? node : node.parentElement);
      const ul = el?.closest('ul');
      if (ul && ul.classList.contains('checklist')) { ul.classList.remove('checklist'); document.execCommand('insertUnorderedList'); }
      else { if (!ul) document.execCommand('insertUnorderedList'); const n2 = getSelection().anchorNode; const u2 = (n2.nodeType === 1 ? n2 : n2.parentElement).closest('ul'); if (u2) u2.classList.add('checklist'); }
      keep(); onChange(); refresh(); return;
    }
    exec(c);
  });
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const v = b.dataset.v;
    if (pop.dataset.kind === 'color') { exec('foreColor', v || getComputedStyle(ed).color); if (v) $('#rColBar', sh).style.background = v; }
    else { restore(); try { document.execCommand('styleWithCSS', false, true); } catch (x) { /* */ } if (!document.execCommand('hiliteColor', false, v || 'transparent')) document.execCommand('backColor', false, v || 'transparent'); keep(); onChange(); }
    pop.hidden = true;
  });
  bar.querySelectorAll('select').forEach(s => {
    s.addEventListener('pointerdown', keep);
    s.addEventListener('change', () => { exec(s.dataset.sel, s.value); if (s.dataset.sel === 'fontName') s.style.fontFamily = s.value; });
  });
  // Cases à cocher : toucher la case coche la ligne
  ed.addEventListener('click', e => {
    const li = e.target.closest('ul.checklist > li'); if (!li) return;
    const r = li.getBoundingClientRect();
    if (e.clientX - r.left < 30) { li.classList.toggle('done'); onChange(); }
  });
  // Raccourcis clavier
  ed.addEventListener('keydown', e => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b' || k === 'g') { e.preventDefault(); exec('bold'); }
    else if (k === 'i') { e.preventDefault(); exec('italic'); }
    else if (k === 'u') { e.preventDefault(); exec('underline'); }
  });
  // Coller : texte propre, sans les styles des autres sites
  ed.addEventListener('paste', e => {
    const html = e.clipboardData?.getData('text/html'), txt = e.clipboardData?.getData('text/plain');
    if (!html && !txt) return;
    e.preventDefault();
    document.execCommand('insertHTML', false, html ? cleanHTML(html) : textToHTML(txt));
    onChange();
  });
  document.addEventListener('selectionchange', () => { if (inside()) { keep(); refresh(); } });
  ed.addEventListener('input', onChange);
}

function noteSheet(id) {
  let n = id ? S.notes.find(x => x.id === id) : null;
  if (id && !n) return;
  const draft = n ? { ...n } : { title: '', body: '', color: '', pin: false };
  openSheet(`
    <div class="sh-head"><button class="btn ghost" id="nPin">${ic('pin')} ${draft.pin ? 'Désépingler' : 'Épingler'}</button><h3>${id ? 'Note' : 'Nouvelle note'}</h3><button class="btn primary sm" data-close>OK</button></div>
    ${rteToolbar()}
    <div class="sh-body note-body">
      <input class="big" id="nT" placeholder="Titre" value="${esc(draft.title)}" autocomplete="off">
      <div class="rte" id="nB" contenteditable="true" spellcheck="true" data-ph="Écris ici…">${noteHTML(draft)}</div>
      <div class="field"><label>${ic('palette')} Couleur</label><div class="swatches" id="nC">${NOTE_COLORS.map(c => `<button type="button" class="sw ${draft.color === c ? 'on' : ''}" style="--c:${c || 'var(--line2)'}" data-c="${c}" aria-label="${c ? 'Couleur' : 'Sans couleur'}"></button>`).join('')}</div></div>
      ${id ? `<button class="btn danger wide" id="nDel">${ic('trash')} Supprimer la note</button>` : ''}
    </div>`, sh => {
    const sync = () => {
      const ed = $('#nB', sh);
      draft.title = $('#nT', sh).value; draft.html = cleanHTML(ed.innerHTML); draft.body = ed.innerText.replace(/\n{3,}/g, '\n\n').trim();
      ed.classList.toggle('empty', !draft.body && !/<(li|hr)/i.test(draft.html));
      if (!n && (draft.title.trim() || draft.body.trim())) { n = { id: uid(), ...draft, upd: Date.now() }; S.notes.push(n); }
      if (n) { Object.assign(n, draft, { upd: Date.now() }); save(); }
    };
    $('#nT', sh).addEventListener('input', sync);
    $('#nT', sh).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#nB', sh).focus(); } });
    bindRTE(sh, $('#nB', sh), sync);
    $('#nB', sh).classList.toggle('empty', !(draft.body || '').trim());
    $('#nC', sh).addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; draft.color = b.dataset.c; $$('#nC .sw', sh).forEach(x => x.classList.toggle('on', x === b)); sync(); });
    $('#nPin', sh).addEventListener('click', () => { draft.pin = !draft.pin; $('#nPin', sh).innerHTML = `${ic('pin')} ${draft.pin ? 'Désépingler' : 'Épingler'}`; sync(); });
    if (id) $('#nDel', sh).addEventListener('click', () => {
      const i = S.notes.indexOf(n); S.notes.splice(i, 1); save(); closeSheet(true); render();
      const kept = n; toast('Note supprimée', () => { S.notes.splice(i, 0, kept); save(); render(); });
    });
    if (!id) setTimeout(() => $('#nT', sh).focus(), 60);
  }, () => render());
}

function listSheet(id) {
  const src = id ? S.lists.find(l => l.id === id) : null;
  const l = src ? { ...src } : { name: '', color: COLORS[S.lists.length % COLORS.length] };
  openSheet(`
    <div class="sh-head"><button class="btn ghost" data-close>Annuler</button><h3>${id ? 'Modifier la liste' : 'Nouvelle liste'}</h3><button class="btn primary sm" id="lSave">${id ? 'Enregistrer' : 'Créer'}</button></div>
    <div class="sh-body">
      <input class="big" id="lN" placeholder="Nom de la liste (ex : UE 10)" value="${esc(l.name)}" maxlength="30" autocomplete="off">
      <div class="field"><label>${ic('palette')} Couleur</label><div class="swatches" id="lC">${COLORS.map(c => `<button type="button" class="sw ${l.color === c ? 'on' : ''}" style="--c:${c}" data-c="${c}" aria-label="Couleur"></button>`).join('')}</div></div>
      ${id ? `<button class="btn danger wide" id="lDel">${ic('trash')} Supprimer la liste</button><small style="color:var(--muted);text-align:center">Les tâches de cette liste ne sont pas supprimées.</small>` : ''}
    </div>`, sh => {
    $('#lC', sh).addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; l.color = b.dataset.c; $$('#lC .sw', sh).forEach(x => x.classList.toggle('on', x === b)); });
    const doSave = () => {
      const name = $('#lN', sh).value.trim(); if (!name) return shake($('#lN', sh));
      if (src) Object.assign(src, { name, color: l.color }); else S.lists.push({ id: uid(), name, color: l.color });
      save(); closeSheet(true); render(); toast(src ? 'Liste modifiée' : 'Liste créée');
    };
    $('#lSave', sh).addEventListener('click', doSave);
    $('#lN', sh).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSave(); } });
    if (src) $('#lDel', sh).addEventListener('click', () => {
      if (!confirm(`Supprimer la liste « ${src.name} » ?`)) return;
      S.lists = S.lists.filter(x => x !== src); S.tasks.forEach(t => { if (t.list === src.id) t.list = ''; });
      if (ui.f.list === src.id) ui.f.list = 'all';
      save(); closeSheet(true); render(); toast('Liste supprimée');
    });
    setTimeout(() => $('#lN', sh).focus(), 60);
  });
}

/* ---------- Toasts ---------- */
function toast(msg, undo) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ic('check')}<span>${esc(msg)}</span>${undo ? `<button>${'Annuler'}</button>` : ''}`;
  const out = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
  if (undo) $('button', el).addEventListener('click', () => { undo(); out(); });
  box.appendChild(el);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(out, undo ? 5000 : 2200);
}

/* ---------- Actions ---------- */
function go(view) { ui.view = view; pref('view', view); render(); window.scrollTo({ top: 0 }); }
const ACT = {
  nav: el => go(el.dataset.nav),
  toggle: el => {
    const t = S.tasks.find(x => x.id === el.dataset.id); if (!t) return;
    t.done = !t.done; t.doneAt = t.done ? Date.now() : 0; save();
    const row = el.closest('.task');
    if (row) { row.classList.toggle('done', t.done); if (t.done) row.classList.add('checked'); }
    const moves = row && !(ui.view === 'tasks' && ui.f.status === 'all') && !(ui.view === 'planning');
    const go2 = () => { ui.flash = t.id; render(); };
    if (moves) setTimeout(() => collapse(row, go2), t.done ? 380 : 120); else setTimeout(render, t.done ? 380 : 0);
    if (t.done) toast('Tâche terminée', () => { t.done = false; t.doneAt = 0; ui.flash = t.id; save(); render(); });
  },
  toggleDoneSec: el => {
    const sec = el.closest('.done-sec'), open = !sec.classList.contains('open');
    $$('.done-sec').forEach(x => { x.classList.toggle('open', open); $('.done-head', x).setAttribute('aria-expanded', open); });
    pref('doneOpen', open ? '1' : '0');
  },
  playGame: el => window.BNGames && BNGames.open(el.dataset.id),
  editTask: el => taskSheet(el.dataset.id),
  newTask: () => taskSheet(null),
  quickAdd: () => quickAdd(),
  goFilter: el => {
    const w = el.dataset.when;
    ui.f = { ...ui.f, q: '', prio: -1, list: 'all', status: w === 'done' ? 'done' : 'open', when: w === 'done' ? 'all' : w };
    go('tasks');
  },
  openFilters: () => filterSheet(),
  clearF: el => { const k = el.dataset.k; ui.f[k] = { status: 'open', when: 'all', list: 'all', prio: -1, sort: 'manual' }[k]; if (k === 'sort') pref('sort', 'manual'); ui.restagger = true; render(); },
  filter: el => { const k = el.dataset.k, v = el.dataset.v; ui.f[k] = v; render(); },
  resetFilters: () => { ui.f = { ...ui.f, q: '', status: 'open', when: 'all', prio: -1, list: 'all', sort: 'manual' }; pref('sort', 'manual'); render(); },
  clearDone: () => {
    const done = S.tasks.filter(t => t.done); if (!done.length) return;
    const before = S.tasks.slice(); S.tasks = S.tasks.filter(t => !t.done); save(); render();
    toast(`${done.length} tâche${done.length > 1 ? 's' : ''} supprimée${done.length > 1 ? 's' : ''}`, () => { S.tasks = before; save(); render(); });
  },
  newList: () => listSheet(null),
  editList: el => listSheet(el.dataset.id),
  sideList: el => { ui.f = { ...ui.f, list: el.dataset.id, status: 'open', when: 'all', q: '' }; go('tasks'); },
  week: el => { const v = +el.dataset.v; ui.week = v === 0 ? 0 : ui.week + v; ui.day = v === 0 ? todayK() : null; render(); },
  pickDay: el => { ui.day = el.dataset.k; render(); },
  goDay: el => { ui.f = { ...ui.f, when: 'all', q: '' }; ui.day = el.dataset.k; taskSheetList(el.dataset.k); },
  newSlot: el => { const k = el.dataset.k || ui.day; slotSheet(null, k ? { day: wd(k), date: k } : {}); },
  editSlot: el => slotSheet(el.dataset.id),
  newNote: () => noteSheet(null),
  editNote: el => noteSheet(el.dataset.id),
  fab: () => ({ planning: () => slotSheet(null, ui.day ? { day: wd(ui.day), date: ui.day } : {}), notes: () => noteSheet(null) }[ui.view] || (() => taskSheet(null, ui.view === 'today' ? { due: todayK() } : {})))(),
  setTheme: el => { S.set.theme = el.dataset.v; save(); render(); },
  setAccent: el => { S.set.accent = el.dataset.v; save(); render(); },
  export: () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bloc-note-sauvegarde-${todayK()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Sauvegarde téléchargée');
  },
  import: () => $('#importFile').click(),
  logout: () => window.BNSync && BNSync.logout(),
  reset: () => {
    if (!confirm('Effacer toutes les tâches, l’emploi du temps et les notes ? Cette action est définitive.')) return;
    const set = S.set; S = seed(); S.tasks = []; S.notes = []; S.set = set; save(); render(); toast('Tout a été effacé');
  }
};
function taskSheetList(k) {
  const ts = S.tasks.filter(t => !t.done && t.due === k);
  openSheet(`<div class="sh-head"><span></span><h3>${fmt(k, { weekday: 'long', day: 'numeric', month: 'long' })}</h3><button class="btn primary sm" data-close>OK</button></div>
    <div class="sh-body"><div class="tlist">${ts.map(t => taskRow(t)).join('')}</div></div>`);
}
function quickAdd() {
  const inp = $('#quickAdd'); if (!inp) return;
  const raw = inp.value.trim(); if (!raw) return shake(inp);
  const p = quickParse(raw); if (!p.title) return shake(inp);
  ui.flash = uid();
  S.tasks.push({ id: ui.flash, title: p.title, notes: '', prio: p.prio, due: p.due || todayK(), time: p.time, list: p.list || S.lists[0]?.id || '', tags: [], subs: [], done: false, doneAt: 0, created: Date.now(), order: nextOrder() });
  save(); render(); toast('Tâche ajoutée');
  setTimeout(() => $('#quickAdd')?.focus(), 30);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.closest('#sheetRoot') && ['editTask', 'toggle'].includes(el.dataset.act)) closeSheet(true);
  fn(el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetOpen()) closeSheet();
  if (e.key === 'Enter' && e.target.id === 'quickAdd') { e.preventDefault(); quickAdd(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'tq') { ui.f.q = t.value; renderTaskList(true); }
  else if (t.id === 'nq') { ui.noteQ = t.value; renderNotes(); }
  else if (t.id === 'sName') { S.set.name = t.value.trim(); save(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'fprio') { ui.f.prio = +t.value; renderTaskList(); }
  else if (t.id === 'fsort') { ui.f.sort = t.value; pref('sort', t.value); renderTaskList(); }
  else if (t.id === 'sWe') { S.set.weekend = t.checked; save(); }
  else if (t.id === 'sHol') { S.set.holidayClasses = t.checked; save(); }
  else if (t.id === 'sFrom' || t.id === 'sTo') {
    const a = Math.max(0, Math.min(12, +$('#sFrom').value || 0)), b = Math.max(13, Math.min(24, +$('#sTo').value || 24));
    S.set.from = a; S.set.to = b; save();
  }
  else if (t.id === 'importFile' && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || d.v !== 2 || !Array.isArray(d.tasks)) throw new Error('format');
        if (!confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
        S = d; S.set = { ...DEF_SET, ...(S.set || {}) }; ['lists', 'tasks', 'slots', 'notes'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
        save(); render(); toast('Sauvegarde importée');
      } catch (err) { toast('Ce fichier n’est pas une sauvegarde Bloc Note'); }
    };
    r.readAsText(t.files[0]); t.value = '';
  }
});
/* Clic dans une case vide de l'emploi du temps → nouveau créneau à cette heure */
document.addEventListener('click', e => {
  const col = e.target.classList?.contains('tt-col') ? e.target : null;
  if (!col) return;
  const y = e.clientY - col.getBoundingClientRect().top;
  const h = Math.floor(y / 56) + (+col.dataset.from);
  const k = col.dataset.col;
  slotSheet(null, { day: wd(k), date: k, start: pad(h) + ':00', end: pad(Math.min(h + 1, 23)) + ':' + (h + 1 > 23 ? '59' : '00') });
});

/* ---------- Rendu ---------- */
function applyTheme() {
  const r = document.documentElement;
  if (S.set.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.set.theme);
  r.style.setProperty('--accent', S.set.accent);
  $('meta[name=theme-color]').setAttribute('content', S.set.accent);
}
function renderSide() {
  const k = todayK();
  $('#sideDate').textContent = fmt(k, { weekday: 'long', day: 'numeric', month: 'long' });
  const nt = openTasks().filter(t => t.due && t.due <= k).length, no = openTasks().length;
  $('#cToday').textContent = nt || '';
  $('#cOpen').textContent = no || '';
  $('#sideLists').innerHTML = S.lists.map(l => `<button data-act="sideList" data-id="${l.id}"><i class="dot" style="--c:${l.color}"></i>${esc(l.name)}<em>${S.tasks.filter(t => !t.done && t.list === l.id).length || ''}</em></button>`).join('');
  $$('[data-nav]').forEach(b => { if (b.dataset.act === 'nav' && b.closest('.side-nav,.tabbar')) b.classList.toggle('on', b.dataset.nav === ui.view); });
}
function render() {
  applyTheme();
  const V = { today: vToday, tasks: vTasks, planning: vPlanning, notes: vNotes, settings: vSettings, games: () => (window.BNGames ? BNGames.view() : '') }[ui.view] || vToday;
  const main = $('#main');
  const sy = $('#ttScroll')?.scrollTop;
  main.innerHTML = V();
  if (main.dataset.view === ui.view) $$('.fadein', main).forEach(e => e.classList.toggle('fadein', false));
  const sameView = main.dataset.view === ui.view;
  main.dataset.view = ui.view;
  if (sameView) $$('.stagger', main).forEach(e => e.classList.toggle('stagger', false));
  if (ui.flash) { const f = ui.flash; setTimeout(() => { if (ui.flash === f) ui.flash = null; }, 50); }
  renderSide();
  $('.fab').hidden = ui.view === 'settings' || ui.view === 'games';
  if (ui.view === 'tasks') { renderTaskList(sameView && !ui.restagger); ui.restagger = false; }
  if (ui.view === 'notes') renderNotes();
  if (ui.view === 'planning') {
    const sc = $('#ttScroll');
    if (sc) sc.scrollTop = sy ?? Math.max(0, (Math.min(nowMin() / 60, 17) - 1 - Math.min(S.set.from, ...S.slots.map(s => Math.floor(toMin(s.start) / 60)))) * 56);
  }
}
paintIcons();
render();
// Rafraîchit l'heure (ligne rouge, cours en cours) chaque minute
let lastDay = todayK();
setInterval(() => { if (!sheetOpen() && !document.activeElement?.matches('input,textarea,select')) { if (todayK() !== lastDay) { lastDay = todayK(); ui.week = 0; } if (ui.view === 'today' || ui.view === 'planning') render(); } }, 60000);

window.BN_onGameClose = () => { if (ui.view === 'games') render(); };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
