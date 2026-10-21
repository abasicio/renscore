'use strict';

// RenScore – fodbold- og UFC-resultater uden reklamer.
// Data fra ESPN's åbne API. Alt brugerdata (ligaer, favoritter) gemmes kun i browseren.

const API = 'https://site.api.espn.com/apis/site/v2/sports';

const LEAGUES = [
  { id: 'den.1', name: 'Superligaen', flag: '🇩🇰', country: 'Danmark' },
  { id: 'den.2', name: '1. Division', flag: '🇩🇰', country: 'Danmark' },
  { id: 'den.3', name: '2. Division', flag: '🇩🇰', country: 'Danmark', off: true },

  { id: 'uefa.champions', name: 'Champions League', flag: '🇪🇺', country: 'Europa' },
  { id: 'uefa.europa', name: 'Europa League', flag: '🇪🇺', country: 'Europa' },
  { id: 'uefa.europa.conf', name: 'Conference League', flag: '🇪🇺', country: 'Europa' },
  { id: 'uefa.super_cup', name: 'UEFA Super Cup', flag: '🇪🇺', country: 'Europa' },

  { id: 'eng.1', name: 'Premier League', flag: '🇬🇧', country: 'England' },
  { id: 'eng.2', name: 'Championship', flag: '🇬🇧', country: 'England' },
  { id: 'eng.3', name: 'League One', flag: '🇬🇧', country: 'England', off: true },
  { id: 'eng.4', name: 'League Two', flag: '🇬🇧', country: 'England', off: true },
  { id: 'eng.fa', name: 'FA Cup', flag: '🇬🇧', country: 'England' },
  { id: 'eng.league_cup', name: 'Carabao Cup', flag: '🇬🇧', country: 'England' },

  { id: 'esp.1', name: 'La Liga', flag: '🇪🇸', country: 'Spanien' },
  { id: 'esp.2', name: 'La Liga 2', flag: '🇪🇸', country: 'Spanien' },
  { id: 'esp.copa_del_rey', name: 'Copa del Rey', flag: '🇪🇸', country: 'Spanien' },

  { id: 'ger.1', name: 'Bundesliga', flag: '🇩🇪', country: 'Tyskland' },
  { id: 'ger.2', name: '2. Bundesliga', flag: '🇩🇪', country: 'Tyskland' },
  { id: 'ger.dfb_pokal', name: 'DFB-Pokal', flag: '🇩🇪', country: 'Tyskland' },

  { id: 'ita.1', name: 'Serie A', flag: '🇮🇹', country: 'Italien' },
  { id: 'ita.2', name: 'Serie B', flag: '🇮🇹', country: 'Italien' },
  { id: 'ita.coppa_italia', name: 'Coppa Italia', flag: '🇮🇹', country: 'Italien' },

  { id: 'fra.1', name: 'Ligue 1', flag: '🇫🇷', country: 'Frankrig' },
  { id: 'fra.2', name: 'Ligue 2', flag: '🇫🇷', country: 'Frankrig' },
  { id: 'fra.coupe_de_france', name: 'Coupe de France', flag: '🇫🇷', country: 'Frankrig' },

  { id: 'tur.1', name: 'Süper Lig', flag: '🇹🇷', country: 'Tyrkiet' },
  { id: 'tur.2', name: '1. Lig', flag: '🇹🇷', country: 'Tyrkiet' },

  { id: 'ned.1', name: 'Eredivisie', flag: '🇳🇱', country: 'Holland' },
  { id: 'ned.2', name: 'Eerste Divisie', flag: '🇳🇱', country: 'Holland' },
  { id: 'ned.cup', name: 'KNVB Beker', flag: '🇳🇱', country: 'Holland' },

  { id: 'por.1', name: 'Primeira Liga', flag: '🇵🇹', country: 'Portugal' },
  { id: 'por.taca.portugal', name: 'Taça de Portugal', flag: '🇵🇹', country: 'Portugal' },

  { id: 'sco.1', name: 'Premiership', flag: '🇬🇧', country: 'Skotland', off: true },
  { id: 'sco.2', name: 'Championship', flag: '🇬🇧', country: 'Skotland', off: true },
  { id: 'bel.1', name: 'Pro League', flag: '🇧🇪', country: 'Belgien', off: true },
  { id: 'aut.1', name: 'Bundesliga', flag: '🇦🇹', country: 'Østrig', off: true },
  { id: 'sui.1', name: 'Super League', flag: '🇨🇭', country: 'Schweiz', off: true },
  { id: 'gre.1', name: 'Super League', flag: '🇬🇷', country: 'Grækenland', off: true },
  { id: 'nor.1', name: 'Eliteserien', flag: '🇳🇴', country: 'Norge', off: true },
  { id: 'swe.1', name: 'Allsvenskan', flag: '🇸🇪', country: 'Sverige', off: true },
];
const UEFA = ['uefa.champions', 'uefa.europa', 'uefa.europa.conf'];
const leagueById = (id) => LEAGUES.find((l) => l.id === id);
/** Nationale ligaer har koder som "den.1"; pokaler og UEFA-turneringer har ikke. */
const isDomestic = (id) => /^[a-z]{3}\.\d$/.test(id);

// ---------- Lagring (kun i browseren) ----------

const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('rs.' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('rs.' + key, JSON.stringify(value)); } catch { /* fx privat browsing */ }
  },
};

const prefs = (() => {
  const defaults = LEAGUES.filter((l) => !l.off).map((l) => l.id);
  const enabled = new Set(storage.get('enabled', defaults));
  // Ligaer tilføjet i en nyere version slås til, hvis de er til som standard.
  const known = new Set(storage.get('known', [...enabled]));
  defaults.forEach((id) => { if (!known.has(id)) enabled.add(id); });
  storage.set('known', LEAGUES.map((l) => l.id));
  return { enabled, favorites: storage.get('favorites', []) };
})();

function saveEnabled() { storage.set('enabled', [...prefs.enabled]); }
function saveFavorites() { storage.set('favorites', prefs.favorites); }
const isFav = (teamId) => prefs.favorites.some((f) => f.id === teamId);
function toggleFav(team, leagueId) {
  if (isFav(team.id)) prefs.favorites = prefs.favorites.filter((f) => f.id !== team.id);
  else prefs.favorites.push({ id: team.id, name: team.name, logo: team.logo, leagueId });
  saveFavorites();
}

// ---------- Hjælpere ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
const pad = (n) => String(n).padStart(2, '0');
const apiDay = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const parseDate = (s) => (s ? new Date(s) : null);

const fmt = {
  time: (d) => (d ? `${pad(d.getHours())}.${pad(d.getMinutes())}` : ''),
  dayLabel(d) {
    const today = startOfDay(new Date());
    if (sameDay(d, today)) return 'I dag';
    if (sameDay(d, addDays(today, -1))) return 'I går';
    if (sameDay(d, addDays(today, 1))) return 'I morgen';
    return d.toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric' });
  },
  weekdayShort: (d) => (sameDay(d, new Date()) ? 'I DAG' : d.toLocaleDateString('da-DK', { weekday: 'short' }).replace('.', '').toUpperCase()),
  dayMonth: (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`,
  long: (d) => (d ? d.toLocaleString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''),
};

async function getJSON(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

// ESPN-felter, der ser forskellige ud afhængigt af endpoint.
const statusOf = (e) => e?.status || e?.competitions?.[0]?.status || { type: { state: 'pre' } };
const stateOf = (e) => statusOf(e).type?.state;
const isLive = (e) => stateOf(e) === 'in';
const isDone = (e) => stateOf(e) === 'post';
const scoreOf = (c) => (c?.score && typeof c.score === 'object' ? c.score.displayValue : c?.score) ?? '';
const logoOf = (t) => t?.logo || t?.logos?.[0]?.href || '';
const teamName = (t) => t?.shortDisplayName || t?.displayName || '?';
const homeFirst = (cs) => [...(cs || [])].sort((a, b) => (a.homeAway === 'home' ? 0 : 1) - (b.homeAway === 'home' ? 0 : 1));

function matchStatus(e) {
  const s = statusOf(e);
  const short = s.type?.shortDetail || '';
  switch (s.type?.state) {
    case 'in': return short === 'HT' ? 'Pause' : (s.displayClock || 'Live');
    case 'post':
      return ({ AET: 'Slut (forl.)', 'FT-Pens': 'Slut (str.)', Postponed: 'Udsat', Canceled: 'Aflyst', Cancelled: 'Aflyst', Abandoned: 'Afbrudt' })[short] || 'Slut';
    default:
      if (short === 'Postponed') return 'Udsat';
      if (short === 'TBD') return 'Ukendt';
      return fmt.time(parseDate(e.date));
  }
}
function rowStatus(e) {
  if (stateOf(e) === 'pre') { const s = matchStatus(e); return s === fmt.time(parseDate(e.date)) ? '–' : s; }
  return matchStatus(e);
}

const logoImg = (url, cls = 'logo') => (url ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy">` : `<span class="logo-ph"></span>`);

// ---------- Tilstand ----------

const ui = {
  sport: 'football',
  day: startOfDay(new Date()),
  liveOnly: false,
  ufcMode: 'next',
  detailTab: 'details',
  lineupSide: 'home',
  query: '',
};
const data = {
  football: { key: null, days: [], loading: false, failed: false },
  ufc: { key: null, events: [], loading: false, failed: false },
  summary: { key: null, value: null },
  fav: { overviews: {}, loaded: false },
  teams: { byLeague: null, loading: false },
};
const eventCache = new Map(); // "liga:id" -> event, så kampsiden kan vises med det samme

let refreshTimer = null;
function scheduleRefresh(live) {
  clearTimeout(refreshTimer);
  // Hvert 30. sekund når noget er live, ellers hvert 5. minut.
  refreshTimer = setTimeout(() => load(), live ? 30000 : 300000);
}

// ---------- Hentning ----------

async function loadFootball() {
  const leagues = LEAGUES.filter((l) => prefs.enabled.has(l.id));
  const key = apiDay(ui.day) + '|' + leagues.map((l) => l.id).join(',');
  const d = data.football;
  if (d.key !== key) { d.key = key; d.days = []; d.loading = true; d.failed = false; render(); }
  const results = await Promise.all(leagues.map((l) =>
    getJSON(`${API}/soccer/${l.id}/scoreboard?dates=${apiDay(ui.day)}`).then((r) => r.events || []).catch(() => null)));
  if (d.key !== key) return; // brugeren har skiftet dag imens
  d.failed = leagues.length > 0 && results.every((r) => r === null);
  d.days = leagues.map((l, i) => ({ league: l, events: (results[i] || []).sort((a, b) => parseDate(a.date) - parseDate(b.date)) }))
    .filter((x) => x.events.length);
  d.days.forEach((x) => x.events.forEach((e) => eventCache.set(`${x.league.id}:${e.id}`, e)));
  d.loading = false;
  render();
  scheduleRefresh(d.days.some((x) => x.events.some(isLive)));
}

async function loadUfc() {
  const d = data.ufc;
  const key = ui.ufcMode;
  if (d.key !== key) { d.key = key; d.events = []; d.loading = true; d.failed = false; render(); }
  let events = null;
  try {
    if (key === 'next') {
      events = (await getJSON(`${API}/mma/ufc/scoreboard`)).events || [];
    } else {
      // Seneste afsluttede UFC-aften inden for 21 dage.
      const days = [...Array(21).keys()].map((n) => addDays(new Date(), -n));
      const all = (await Promise.all(days.map((day) =>
        getJSON(`${API}/mma/ufc/scoreboard?dates=${apiDay(day)}`).then((r) => r.events || []).catch(() => [])))).flat();
      const done = all.filter(isDone).sort((a, b) => parseDate(b.date) - parseDate(a.date));
      events = done.length ? [done[0]] : [];
    }
  } catch { events = null; }
  if (d.key !== key) return;
  d.failed = events === null;
  d.events = events || [];
  d.loading = false;
  render();
  scheduleRefresh(d.events.some(isLive));
}

async function loadSummary(leagueId, id) {
  const key = `${leagueId}:${id}`;
  if (data.summary.key !== key) { data.summary = { key, value: null }; }
  try {
    const value = await getJSON(`${API}/soccer/${leagueId}/summary?event=${id}`);
    if (data.summary.key !== key) return;
    data.summary.value = value;
  } catch { /* behold det vi har */ }
  render();
  const s = data.summary.value?.header?.competitions?.[0]?.status;
  scheduleRefresh(s?.type?.state === 'in');
}

async function loadTeamDirectory() {
  const t = data.teams;
  if (t.byLeague || t.loading) return;
  const cached = storage.get('teams', null);
  if (cached && Object.keys(cached.byLeague || {}).length && Date.now() - cached.t < 7 * 864e5) { t.byLeague = cached.byLeague; return; }
  t.loading = true;
  // Holdlisterne tages fra stillingen, fordi ESPN's /teams ikke må hentes fra en browser.
  const ids = LEAGUES.map((l) => l.id).filter(isDomestic);
  const lists = await Promise.all(ids.map((id) =>
    getJSON(`https://site.api.espn.com/apis/v2/sports/soccer/${id}/standings`).then((r) =>
      (r.children || []).flatMap((c) => c.standings?.entries || []).map((e) => ({
        id: e.team.id, name: e.team.displayName, short: e.team.shortDisplayName, logo: logoOf(e.team),
      }))).catch(() => [])));
  t.byLeague = {};
  ids.forEach((id, i) => {
    const seen = new Set();
    const list = lists[i].filter((x) => !seen.has(x.id) && seen.add(x.id));
    if (list.length) t.byLeague[id] = list;
  });
  t.loading = false;
  if (!Object.keys(t.byLeague).length) { t.byLeague = null; return; } // prøv igen næste gang
  storage.set('teams', { t: Date.now(), byLeague: t.byLeague });
}

/** Hold fulgt fra fx en Champions League-kamp får deres hjemlige liga slået op. */
async function fixFavoriteLeagues() {
  if (!prefs.favorites.some((f) => !isDomestic(f.leagueId))) return;
  await loadTeamDirectory();
  const by = data.teams.byLeague || {};
  prefs.favorites = prefs.favorites.map((f) => {
    if (isDomestic(f.leagueId)) return f;
    const home = Object.keys(by).sort().find((id) => by[id].some((t) => t.id === f.id));
    return home ? { ...f, leagueId: home } : f;
  });
  saveFavorites();
}

/** Holdets kampe i ligaen, landets pokaler og de europæiske turneringer. */
async function teamOverview(fav) {
  const country = leagueById(fav.leagueId)?.country;
  const ids = new Set([fav.leagueId, ...UEFA, ...LEAGUES.filter((l) => l.country === country && !isDomestic(l.id)).map((l) => l.id)]);
  const reqs = [];
  ids.forEach((id) => [false, true].forEach((upcoming) => reqs.push(
    getJSON(`${API}/soccer/${id}/teams/${fav.id}/schedule${upcoming ? '?fixture=true' : ''}`)
      .then((r) => (r.events || []).map((e) => ({ ...e, _league: e.league?.slug || id })))
      .catch(() => []))));
  const byId = new Map();
  (await Promise.all(reqs)).flat().forEach((e) => byId.set(e.id, e));
  const events = [...byId.values()].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  events.forEach((e) => eventCache.set(`${e._league}:${e.id}`, e));
  const soon = Date.now() - 3 * 3600e3;
  return {
    live: events.find(isLive),
    next: events.find((e) => stateOf(e) === 'pre' && parseDate(e.date) > soon),
    recent: events.filter((e) => isDone(e) && statusOf(e).type?.completed !== false).reverse().slice(0, 5),
  };
}

async function loadFavorites() {
  await fixFavoriteLeagues();
  const favs = prefs.favorites;
  const list = await Promise.all(favs.map(teamOverview));
  data.fav.overviews = Object.fromEntries(favs.map((f, i) => [f.id, list[i]]));
  data.fav.loaded = true;
  render();
  scheduleRefresh(list.some((o) => o.live));
}

function load() {
  const r = route();
  if (r.name === 'scores') return ui.sport === 'football' ? loadFootball() : loadUfc();
  if (r.name === 'match') return loadSummary(r.league, r.id);
  if (r.name === 'fav') return loadFavorites();
  clearTimeout(refreshTimer);
}

// ---------- Routing ----------

function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  const m = h.match(/^\/match\/([^/]+)\/([^/]+)$/);
  if (m) return { name: 'match', league: decodeURIComponent(m[1]), id: decodeURIComponent(m[2]) };
  if (h === '/fav') return { name: 'fav' };
  if (h === '/settings') return { name: 'settings' };
  return { name: 'scores' };
}

const app = document.getElementById('app');

function render() {
  const r = route();
  document.querySelectorAll('#tabbar a').forEach((a) => {
    a.classList.toggle('sel', a.dataset.tab === (r.name === 'match' ? 'scores' : r.name));
  });
  if (r.name === 'scores') app.innerHTML = viewScores();
  else if (r.name === 'match') app.innerHTML = viewMatch(r.league, r.id);
  else if (r.name === 'fav') app.innerHTML = viewFavorites();
  else app.innerHTML = viewSettings();
  centerSelectedDay();
}

let lastCenteredDay = null;
function centerSelectedDay() {
  const strip = app.querySelector('.days');
  const sel = strip?.querySelector('.sel');
  if (!sel) return;
  const key = ui.day.getTime();
  if (lastCenteredDay === key && strip.dataset.ready) return;
  strip.scrollLeft = sel.offsetLeft - strip.clientWidth / 2 + sel.clientWidth / 2;
  strip.dataset.ready = '1';
  lastCenteredDay = key;
}

window.addEventListener('hashchange', () => {
  if (sheet) { sheet.remove(); sheet = null; document.body.style.overflow = ''; }
  window.scrollTo(0, 0);
  ui.detailTab = 'details';
  ui.lineupSide = 'home';
  lastCenteredDay = null;
  render();
  load();
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });

// ---------- Visning: Kampe ----------

const REFRESH_ICON = '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';

function viewScores() {
  const f = data.football;
  const liveCount = f.days.reduce((n, x) => n + x.events.filter(isLive).length, 0);
  const today = startOfDay(new Date());
  const days = [...Array(15).keys()].map((i) => addDays(today, i - 7));

  let head = `<header class="top">
    <div class="row">
      <h1>RenScore</h1>
      ${ui.sport === 'football' ? `<button class="live-btn ${ui.liveOnly ? 'on' : ''}" data-action="live"><span class="dot"></span>LIVE${liveCount ? ' ' + liveCount : ''}</button>` : ''}
      <button class="iconbtn" data-action="refresh" aria-label="Opdater">${REFRESH_ICON}</button>
    </div>
    <div class="chips">
      <button class="chip ${ui.sport === 'football' ? 'sel' : ''}" data-action="sport" data-v="football">⚽ Fodbold</button>
      <button class="chip ${ui.sport === 'mma' ? 'sel' : ''}" data-action="sport" data-v="mma">🥊 MMA</button>
    </div>`;
  if (ui.sport === 'football') {
    head += `<div class="days">${days.map((d) => `<button class="day ${sameDay(d, ui.day) ? 'sel' : ''}" data-action="day" data-v="${d.getTime()}"><b>${fmt.weekdayShort(d)}</b><span>${fmt.dayMonth(d)}</span></button>`).join('')}</div>`;
  } else {
    head += `<div class="chips">
      <button class="chip ${ui.ufcMode === 'next' ? 'sel' : ''}" data-action="ufc" data-v="next">Næste</button>
      <button class="chip ${ui.ufcMode === 'latest' ? 'sel' : ''}" data-action="ufc" data-v="latest">Seneste</button>
    </div>`;
  }
  head += '</header>';
  return head + `<main>${ui.sport === 'football' ? footballBody() : ufcBody()}</main>`;
}

function footballBody() {
  const f = data.football;
  const vis = (evs) => (ui.liveOnly ? evs.filter(isLive) : evs);
  const days = f.days.map((x) => ({ ...x, events: vis(x.events) })).filter((x) => x.events.length);
  if (f.loading) return '<div class="spinner"></div>';
  if (f.failed) return emptyBox('📡', 'Ingen forbindelse', 'Tryk på ↻ for at prøve igen.');
  if (!days.length) {
    return ui.liveOnly ? emptyBox('⚽', 'Ingen live-kampe', 'Der spilles ikke lige nu i dine ligaer.')
      : emptyBox('⚽', 'Ingen kampe', 'Der er ingen kampe i dine ligaer denne dag.');
  }
  const favRows = days.flatMap((x) => x.events
    .filter((e) => (e.competitions?.[0]?.competitors || []).some((c) => isFav(c.team?.id)))
    .map((e) => [x.league.id, e]));
  let html = '';
  if (favRows.length) html += leagueCard('Mine hold', 'Hold du følger', '⭐', favRows);
  html += days.map((x) => leagueCard(x.league.name, x.league.country, x.league.flag, x.events.map((e) => [x.league.id, e]))).join('');
  return html;
}

function leagueCard(title, sub, flag, rows) {
  return `<section class="card">
    <div class="card-head"><span class="flag">${flag}</span><div><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div></div></div>
    ${rows.map(([lid, e]) => '<div class="sep"></div>' + matchRow(e, lid)).join('')}
  </section>`;
}

function matchRow(e, leagueId) {
  const cs = homeFirst(e.competitions?.[0]?.competitors);
  const live = isLive(e), done = isDone(e);
  const hasWinner = cs.some((c) => c.winner === true);
  const lose = (c) => done && hasWinner && c.winner !== true;
  const teams = cs.map((c) => `<div class="team ${lose(c) ? 'lose' : ''}">${logoImg(logoOf(c.team))}<span class="n">${esc(teamName(c.team))}</span>${isFav(c.team?.id) ? '<span class="fav">★</span>' : ''}</div>`).join('');
  const scores = stateOf(e) === 'pre' ? '' :
    `<div class="mscores ${live ? 'live' : ''}">${cs.map((c) => `<div class="${lose(c) && !live ? 'lose' : ''}">${esc(scoreOf(c))}</div>`).join('')}</div>`;
  return `<a class="match" href="#/match/${encodeURIComponent(leagueId)}/${encodeURIComponent(e.id)}">
    <div class="mtime"><span>${fmt.time(parseDate(e.date))}</span><span class="${live ? 'live' : ''}">${esc(rowStatus(e))}</span></div>
    <div class="mteams">${teams}</div>${scores}
  </a>`;
}

function emptyBox(icon, title, text) {
  return `<div class="empty"><div class="ico">${icon}</div><h3>${esc(title)}</h3><div>${esc(text)}</div></div>`;
}

// ---------- Visning: UFC ----------

const WEIGHT = {
  Strawweight: 'Halm', Flyweight: 'Flue', Bantamweight: 'Bantam', Featherweight: 'Fjer', Lightweight: 'Let',
  Welterweight: 'Welter', Middleweight: 'Mellem', 'Light Heavyweight': 'Let-svær', Heavyweight: 'Svær', Catchweight: 'Aftalt',
};
function weightClass(s) {
  if (!s) return '';
  let prefix = '';
  if (s.startsWith('W ')) { prefix = 'K·'; s = s.slice(2); }
  return prefix + (WEIGHT[s] || s);
}

function ufcBody() {
  const d = data.ufc;
  if (d.loading) return '<div class="spinner"></div>';
  if (d.failed) return emptyBox('📡', 'Ingen forbindelse', 'Tryk på ↻ for at prøve igen.');
  if (!d.events.length) return emptyBox('🥊', 'Ingen stævner', 'Der blev ikke fundet nogen UFC-aften.');
  return d.events.map((ev) => {
    // ESPN lister hovedkampen sidst; den skal stå øverst.
    const fights = [...(ev.competitions || [])].reverse();
    return `<section class="card">
      <div class="card-head"><span class="flag">🥊</span><div><div class="t">${esc(ev.name)}</div><div class="s">${esc(fmt.long(parseDate(ev.date)))}</div></div></div>
      ${fights.map((f, i) => '<div class="sep"></div>' + fightRow(f, i === 0)).join('')}
    </section>`;
  }).join('');
}

function fightRow(f, isMain) {
  const fs = [...(f.competitors || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const st = f.status || { type: {} };
  const live = st.type.state === 'in', done = st.type.state === 'post';
  let stTxt = '–';
  if (live) stTxt = 'R' + (st.period || 1);
  else if (done) stTxt = st.period > 0 && st.displayClock ? `R${st.period} ${st.displayClock}` : 'Slut';
  return `<div class="match">
    <div class="mtime"><span class="${isMain ? 'main' : ''}">${isMain ? 'HOVED' : esc(weightClass(f.type?.abbreviation))}</span><span class="${live ? 'live' : ''}">${esc(stTxt)}</span></div>
    <div class="mteams">${fs.map((x) => `<div class="team ${done && x.winner !== true ? 'lose' : ''}">
      ${logoImg(x.athlete?.flag?.href)}<span class="n">${esc(x.athlete?.displayName || '?')}</span>
      <span class="rec num">${esc(x.records?.[0]?.summary || '')}</span>
      ${x.winner === true ? '<span class="winbadge">V</span>' : ''}</div>`).join('')}</div>
  </div>`;
}

// ---------- Visning: Kampside ----------

const STATS = [
  ['possessionPct', 'Boldbesiddelse', '%'], ['totalShots', 'Skud i alt'], ['shotsOnTarget', 'Skud på mål'],
  ['blockedShots', 'Blokerede skud'], ['wonCorners', 'Hjørnespark'], ['offsides', 'Offside'],
  ['foulsCommitted', 'Frispark begået'], ['yellowCards', 'Gule kort'], ['redCards', 'Røde kort'],
  ['saves', 'Redninger'], ['totalPasses', 'Afleveringer'], ['accuratePasses', 'Præcise afleveringer'],
  ['totalCrosses', 'Indlæg'], ['totalTackles', 'Tacklinger'], ['interceptions', 'Erobringer'], ['totalClearance', 'Clearinger'],
];

function keyKind(k) {
  if (k.shootout) return null;
  const slug = (k.type?.type || '').toLowerCase(), text = (k.type?.text || '').toLowerCase();
  if (k.scoringPlay) return { t: 'goal', pen: text.includes('penalty'), own: text.includes('own goal') };
  if (slug.includes('red-card') || text.includes('red card') || text.includes('second yellow')) return { t: 'red' };
  if (slug.includes('yellow-card') || text.includes('yellow card')) return { t: 'yellow' };
  if (slug === 'substitution') return { t: 'sub' };
  if (slug === 'halftime') return { t: 'marker', label: 'Pause' };
  if (slug === 'end-regular-time') return { t: 'marker', label: 'Fuld tid' };
  if (slug === 'end-extra-time') return { t: 'marker', label: 'Slut på forlænget spilletid' };
  return null;
}

function viewMatch(leagueId, id) {
  const league = leagueById(leagueId) || { id: leagueId, name: '', flag: '' };
  const cached = eventCache.get(`${leagueId}:${id}`);
  const sum = data.summary.key === `${leagueId}:${id}` ? data.summary.value : null;
  const hc = sum?.header?.competitions?.[0];
  const cachedCs = cached?.competitions?.[0]?.competitors || [];
  const cs = hc?.competitors?.length ? hc.competitors : cachedCs;
  const home = cs.find((c) => c.homeAway === 'home');
  const away = cs.find((c) => c.homeAway === 'away');
  const status = hc?.status || (cached && statusOf(cached));
  const event = { date: hc?.date || cached?.date, status: status || { type: { state: 'pre' } } };
  const fallbackLogo = (c) => logoOf(c?.team) || logoOf(cachedCs.find((x) => x.homeAway === c?.homeAway)?.team);

  if (!cached && !sum) {
    return `<header class="top"><div class="row"><button class="iconbtn" data-action="back">${BACK_ICON}</button><p class="title-center">${esc(league.name)}</p><span style="width:34px"></span></div></header><main><div class="spinner"></div></main>`;
  }

  const stats = (teamId) => Object.fromEntries((sum?.boxscore?.teams || []).find((t) => t.team?.id === teamId)?.statistics?.map((s) => [s.name, s.displayValue]) || []);
  const roster = (teamId) => (sum?.rosters || []).find((r) => r.team?.id === teamId);
  const groups = (sum?.standings?.groups || []).filter((g) => g.standings?.entries?.length);
  const timeline = (sum?.keyEvents || []).map((k) => ({ k, kind: keyKind(k) })).filter((x) => x.kind);

  const tabs = [['details', 'Detaljer']];
  if (Object.keys(stats(home?.team?.id)).length) tabs.push(['stats', 'Statistik']);
  if (roster(home?.team?.id)?.roster?.some((p) => p.starter)) tabs.push(['lineups', 'Opstilling']);
  if (groups.length) tabs.push(['table', 'Stilling']);
  if (!tabs.some(([t]) => t === ui.detailTab)) ui.detailTab = 'details';

  const st = status?.type?.state;
  const teamCol = (c) => `<div class="tc">
      <div class="crest">${logoImg(fallbackLogo(c), '')}</div>
      <div>${esc(teamName(c?.team))}</div>
      ${c?.team ? `<button class="star ${isFav(c.team.id) ? 'on' : ''}" data-action="fav" data-id="${esc(c.team.id)}" data-name="${esc(c.team.displayName)}" data-logo="${esc(fallbackLogo(c))}" data-league="${esc(leagueId)}">${isFav(c.team.id) ? '★' : '☆'}</button>` : ''}
    </div>`;
  const mid = st === 'pre'
    ? `<div class="kick">${fmt.time(parseDate(event.date))}</div><div class="stat">${esc(event.date ? fmt.dayLabel(parseDate(event.date)) : '')}</div>`
    : `<div class="score">${esc(scoreOf(home))}<i>-</i>${esc(scoreOf(away))}</div><div class="stat ${st === 'in' ? 'live' : ''}">${esc(matchStatus(event))}</div>`;

  let html = `<header class="top">
    <div class="row"><button class="iconbtn" data-action="back" aria-label="Tilbage">${BACK_ICON}</button><p class="title-center">${esc(league.name)}</p><span style="width:34px"></span></div>
    <div class="mhead">${teamCol(home)}<div class="mid">${mid}</div>${teamCol(away)}</div>
    <div class="utabs">${tabs.map(([t, label]) => `<button class="${ui.detailTab === t ? 'sel' : ''}" data-action="dtab" data-v="${t}">${label}</button>`).join('')}</div>
  </header><main>`;

  if (ui.detailTab === 'details') html += detailsTab(timeline, home, st, event);
  else if (ui.detailTab === 'stats') html += statsTab(stats(home?.team?.id), stats(away?.team?.id));
  else if (ui.detailTab === 'lineups') html += lineupsTab(home, away, roster, sum?.keyEvents || [], fallbackLogo);
  else if (ui.detailTab === 'table') html += tableTab(groups, [home?.team?.id, away?.team?.id]);
  return html + '</main>';
}

const BACK_ICON = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';

function detailsTab(timeline, home, st, event) {
  if (!timeline.length) {
    return `<section class="card">${emptyBox('📅', st === 'pre' ? 'Kampen er ikke startet' : 'Ingen hændelser endnu', fmt.long(parseDate(event.date)))}</section>`;
  }
  const rows = [...timeline].reverse().map(({ k, kind }) => {
    if (kind.t === 'marker') return `<div class="marker">${esc(kind.label.toUpperCase())}</div>`;
    const names = (k.participants || []).map((p) => p.athlete?.displayName).filter(Boolean);
    const isHome = k.team?.id === home?.team?.id;
    let icon = '', p1 = esc(names[0] || ''), p2 = '';
    if (kind.t === 'goal') {
      icon = '⚽';
      if (kind.own) p2 = 'Selvmål';
      else if (kind.pen) p2 = 'Straffespark';
      else if (names[1]) p2 = 'Assist: ' + esc(names[1]);
    } else if (kind.t === 'yellow') icon = '<span class="card-y"></span>';
    else if (kind.t === 'red') icon = '<span class="card-r"></span>';
    else if (kind.t === 'sub') {
      icon = '⇄';
      p1 = `<span class="arrow-in">↑</span> ${esc(names[0] || '')}`;
      if (names[1]) p2 = `<span class="arrow-out">↓</span> ${esc(names[1])}`;
    }
    return `<div class="tl ${isHome ? '' : 'away'}"><span class="min">${esc(k.clock?.displayValue || '')}</span><span class="ic">${icon}</span>
      <div class="txt"><div class="p1">${p1}</div>${p2 ? `<div class="p2">${p2}</div>` : ''}</div></div>`;
  });
  return `<section class="card">${rows.join('<div class="sep"></div>')}</section>`;
}

function statsTab(h, a) {
  const rows = STATS.filter(([key]) => h[key] != null && a[key] != null).map(([key, label, suffix = '']) => {
    const hv = parseFloat(h[key]) || 0, av = parseFloat(a[key]) || 0, total = hv + av;
    const hf = total ? (hv / total) * 100 : 0, af = total ? (av / total) * 100 : 0;
    return `<div class="srow">
      <div class="vals"><span class="v ${hv > av ? 'hi-h' : ''}">${esc(h[key])}${suffix}</span><span>${label}</span><span class="v ${av > hv ? 'hi-a' : ''}">${esc(a[key])}${suffix}</span></div>
      <div class="bars"><div class="bar h"><i style="width:${hf}%;background:var(--brand);opacity:${hv >= av ? 1 : 0.35}"></i></div>
      <div class="bar"><i style="width:${af}%;background:var(--away);opacity:${av >= hv ? 1 : 0.35}"></i></div></div>
    </div>`;
  });
  return `<section class="card stats">${rows.join('')}</section>`;
}

function posDepth(pos) {
  const p = (pos || '').toUpperCase(), base = p.split('-')[0];
  switch (base) {
    case 'G': case 'GK': return 0;
    case 'CD': case 'CB': case 'LB': case 'RB': case 'SW': case 'D': return 1;
    case 'LWB': case 'RWB': case 'WB': return 1.6;
    case 'DM': case 'CDM': return 2;
    case 'CM': case 'LM': case 'RM': case 'M': return 2.5;
    case 'AM': case 'CAM': case 'LW': case 'RW': return 3;
    case 'CF': case 'ST': case 'FW': return 4;
    case 'F': return p.includes('-') ? 4 : 4.2;
    default: return 2.5;
  }
}
/** 0 = yderst venstre (LB), 1 = venstre-central (CD-L), 2 = midt, 3, 4 = yderst højre. */
function posSide(pos) {
  const p = (pos || '').toUpperCase(), base = p.split('-')[0];
  if (base.length > 1 && base[0] === 'L') return 0;
  if (base.length > 1 && base[0] === 'R') return 4;
  if (p.endsWith('-L')) return 1;
  if (p.endsWith('-R')) return 3;
  return 2;
}
/** Deler de 11 startere op i linjer (målmand først) ud fra formationen, fx "4-2-3-1". */
function formationLines(starters, formation) {
  const pos = (p) => p.position?.abbreviation || '';
  const sorted = starters.map((p, i) => ({ p, i })).sort((a, b) => posDepth(pos(a.p)) - posDepth(pos(b.p)) || a.i - b.i).map((x) => x.p);
  if (!sorted.length) return [];
  const counts = (formation || '').split('-').map(Number).filter((n) => n > 0);
  const lines = [[sorted[0]]];
  const rest = sorted.slice(1);
  if (counts.reduce((s, n) => s + n, 0) === rest.length) {
    counts.forEach((n) => lines.push(rest.splice(0, n)));
  } else {
    const groups = {};
    rest.forEach((p) => { const d = Math.round(posDepth(pos(p))); (groups[d] = groups[d] || []).push(p); });
    Object.keys(groups).sort((a, b) => a - b).forEach((d) => lines.push(groups[d]));
  }
  return lines.map((line) => line.map((p, i) => ({ p, i })).sort((a, b) => posSide(pos(a.p)) - posSide(pos(b.p)) || a.i - b.i).map((x) => x.p));
}

const PITCH_LINES = `<svg class="lines" viewBox="0 0 72 100" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".35">
  <rect x="2.5" y="2.5" width="67" height="95"/><line x1="2.5" y1="50" x2="69.5" y2="50"/><ellipse cx="36" cy="50" rx="9.4" ry="6.8"/>
  <rect x="16" y="2.5" width="40" height="14"/><rect x="16" y="83.5" width="40" height="14"/>
  <rect x="26.6" y="2.5" width="18.8" height="5.5"/><rect x="26.6" y="92" width="18.8" height="5.5"/></svg>`;

function lineupsTab(home, away, rosterOf, keyEvents, logo) {
  const side = ui.lineupSide === 'away' ? away : home;
  const r = rosterOf(side?.team?.id);
  const pick = [home, away].filter(Boolean).map((c) => `<button class="${ui.lineupSide === c.homeAway ? 'sel' : ''}" data-action="side" data-v="${c.homeAway}">${logoImg(logo(c))}${esc(teamName(c.team))}</button>`).join('');
  if (!r) return `<div class="sidepick">${pick}</div>`;
  const players = r.roster || [];
  const starters = players.filter((p) => p.starter);
  const count = (pid, test) => keyEvents.filter((k) => { const kk = keyKind(k); return kk && test(kk) && k.participants?.[0]?.athlete?.id === pid; }).length;
  const dot = (p) => {
    const pid = p.athlete?.id;
    const goals = count(pid, (k) => k.t === 'goal' && !k.own);
    const red = count(pid, (k) => k.t === 'red'), yellow = count(pid, (k) => k.t === 'yellow');
    const name = p.athlete?.lastName || p.athlete?.shortName || p.athlete?.displayName || '';
    const out = p.subbedOut === true || p.subbedOut?.didSub === true;
    return `<div class="player"><div class="shirt">${esc(p.jersey || '')}
      ${red || yellow ? `<span class="b-card" style="background:${red ? '#e53935' : '#f5c400'}"></span>` : ''}
      ${out ? '<span class="b-out">↓</span>' : ''}${goals ? '<span class="b-goal">⚽</span>' : ''}</div>
      <div class="nm">${esc(name)}</div></div>`;
  };
  const lines = formationLines(starters, r.formation);
  const bench = players.filter((p) => !p.starter);
  const subIn = (p) => p.subbedIn === true || p.subbedIn?.didSub === true;
  const benchSorted = [...bench.filter(subIn), ...bench.filter((p) => !subIn(p))];
  return `<div class="sidepick">${pick}</div>
    ${r.formation ? `<div class="formation">Formation ${esc(r.formation)}</div>` : ''}
    <div class="pitch">${PITCH_LINES}<div class="rows">${lines.map((l) => `<div class="prow">${l.map(dot).join('')}</div>`).join('')}</div></div>
    <section class="card bench"><div class="card-head"><div class="t">Bænk</div></div>
      ${benchSorted.map((p) => `<div class="sep"></div><div class="bp"><span class="j">${esc(p.jersey || '')}</span><span>${esc(p.athlete?.displayName || '')}</span>
        ${subIn(p) ? '<span class="arrow-in">↑</span>' : ''}<span class="pos">${esc(p.position?.abbreviation || '')}</span></div>`).join('')}
    </section>`;
}

function tableTab(groups, highlight) {
  const stat = (e, name) => e.stats?.find((s) => s.name === name)?.displayValue ?? '';
  return groups.map((g) => `<section class="card">
    ${groups.length > 1 && g.header ? `<div class="card-head"><div class="t">${esc(g.header)}</div></div>` : ''}
    <table class="table"><thead><tr><th>#</th><th style="text-align:left">Hold</th><th>K</th><th>+/-</th><th>P</th></tr></thead><tbody>
    ${(g.standings.entries || []).map((e) => `<tr class="${highlight.includes(e.id) ? 'hl' : ''}">
      <td>${esc(stat(e, 'rank'))}</td>
      <td class="tm"><div>${logoImg(e.logo?.[0]?.href)}<span>${esc(e.team)}</span></div></td>
      <td>${esc(stat(e, 'gamesPlayed'))}</td><td>${esc(stat(e, 'pointDifferential'))}</td><td class="pts">${esc(stat(e, 'points'))}</td>
    </tr>`).join('')}
    </tbody></table></section>`).join('');
}

// ---------- Visning: Favoritter ----------

function viewFavorites() {
  let html = `<header class="top"><div class="row"><h1>Favoritter</h1>
    <button class="pill" data-action="add-open">＋ Tilføj hold</button></div></header><main>`;
  if (!prefs.favorites.length) {
    html += `<section class="card">${emptyBox('⭐', 'Ingen favoritter endnu', 'Tilføj dine hold, så ser du deres næste kamp, seneste resultater og form samlet her.')}
      <div style="text-align:center;padding:0 0 24px;margin-top:-24px"><button class="btn" data-action="add-open">＋ Tilføj hold</button></div></section>`;
  }
  html += prefs.favorites.map(favCard).join('');
  return html + '</main>';
}

function favCard(fav) {
  const o = data.fav.overviews[fav.id];
  const league = leagueById(fav.leagueId);
  const result = (e) => {
    const cs = e.competitions?.[0]?.competitors || [];
    const me = cs.find((c) => c.team?.id === fav.id);
    if (!me) return '?';
    if (me.winner === true) return 'V';
    return cs.some((c) => c.team?.id !== fav.id && c.winner === true) ? 'T' : 'U';
  };
  const form = o ? [...o.recent].reverse().map((e) => { const r = result(e); return `<b class="${r}">${r}</b>`; }).join('') : '';
  const section = (title, e, cls = '') => {
    const lid = e._league || fav.leagueId;
    const lg = leagueById(lid);
    return `<div class="sep"></div><div class="sublabel"><b class="${cls}">${title}</b>${lg ? `<span>· ${esc(lg.name)}</span>` : ''}
      ${stateOf(e) === 'pre' ? `<span class="r">${esc(fmt.dayLabel(parseDate(e.date)))}</span>` : ''}</div>${matchRow(e, lid)}`;
  };
  let body = '';
  if (o) {
    if (o.live) body += section('LIVE', o.live, 'live');
    if (o.next && o.next.id !== o.live?.id) body += section('NÆSTE KAMP', o.next);
    if (o.recent[0]) body += section('SENESTE KAMP', o.recent[0]);
    if (!o.live && !o.next && !o.recent.length) body += '<div class="sep"></div><div class="note">Ingen kampe fundet</div>';
  } else {
    body += '<div class="sep"></div><div class="spinner" style="margin:16px auto"></div>';
  }
  return `<section class="card">
    <div class="favhead">${logoImg(fav.logo)}<div><div class="nm">${esc(fav.name)}</div><div class="lg">${league ? `${league.flag} ${esc(league.name)}` : ''}</div></div>
      <div class="form">${form}</div><button class="more" data-action="fav-remove" data-id="${esc(fav.id)}" aria-label="Fjern">✕</button></div>
    ${body}</section>`;
}

// Ark til at søge og tilføje hold
let sheet = null;
async function openAddSheet() {
  ui.query = '';
  sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.innerHTML = `<div class="sh-top"><div class="sh-row"><span class="sp"></span><h2>Tilføj hold</h2><button class="done" data-action="add-close">Færdig</button></div>
    <input class="search" type="search" placeholder="Søg efter hold" autocomplete="off" autocorrect="off" spellcheck="false"></div>
    <div class="list"><div class="spinner"></div></div>`;
  document.body.appendChild(sheet);
  document.body.style.overflow = 'hidden';
  sheet.querySelector('.search').addEventListener('input', (e) => { ui.query = e.target.value; renderSheetList(); });
  await loadTeamDirectory();
  renderSheetList();
}
function closeAddSheet() {
  sheet?.remove();
  sheet = null;
  document.body.style.overflow = '';
  render();
  load();
}
function renderSheetList() {
  if (!sheet) return;
  const by = data.teams.byLeague || {};
  const q = ui.query.trim().toLowerCase();
  const html = LEAGUES.filter((l) => by[l.id]).map((l) => {
    const teams = by[l.id].filter((t) => !q || t.name.toLowerCase().includes(q) || (t.short || '').toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'da'));
    if (!teams.length) return '';
    return `<div class="group-title">${l.flag} ${esc(l.name)}</div><section class="card">${teams.map((t) => `
      <button class="trow" data-action="fav" data-id="${esc(t.id)}" data-name="${esc(t.name)}" data-logo="${esc(t.logo)}" data-league="${l.id}">
        ${logoImg(t.logo)}<span>${esc(t.name)}</span><span class="st ${isFav(t.id) ? 'on' : ''}">${isFav(t.id) ? '★' : '☆'}</span></button>`).join('<div class="sep"></div>')}
    </section>`;
  }).join('');
  sheet.querySelector('.list').innerHTML = html || (data.teams.byLeague ? emptyBox('🔍', 'Ingen hold fundet', 'Prøv et andet navn.') : emptyBox('📡', 'Ingen forbindelse', 'Luk og prøv igen.'));
}

// ---------- Visning: Indstillinger ----------

function viewSettings() {
  const countries = [...new Set(LEAGUES.map((l) => l.country))];
  let html = '<header class="top"><div class="row"><h1>Indstillinger</h1></div></header><main>';
  html += countries.map((c) => `<div class="group-title">${esc(c)}</div><section class="card">${LEAGUES.filter((l) => l.country === c).map((l) => `
    <button class="toggle-row" style="width:100%;text-align:left" data-action="league" data-id="${l.id}"><span>${l.flag}</span><span>${esc(l.name)}</span>
      <span class="sw ${prefs.enabled.has(l.id) ? 'on' : ''}"></span></button>`).join('<div class="sep"></div>')}</section>`).join('');
  html += `<div class="group-title">Mine hold</div><section class="card">${prefs.favorites.length
    ? `<button class="danger" data-action="fav-clear">Fjern alle fulgte hold (${prefs.favorites.length})</button>`
    : '<div class="note">Tilføj hold under Favoritter, eller tryk på stjernen inde i en kamp.</div>'}</section>`;
  html += '<section class="card"><div class="note">Ingen reklamer, ingen notifikationer, ingen konto. Data fra ESPN. Dine valg gemmes kun på denne telefon.</div></section>';
  return html + '</main>';
}

// ---------- Klik ----------

const actions = {
  sport(el) { ui.sport = el.dataset.v; render(); load(); },
  live() { ui.liveOnly = !ui.liveOnly; render(); },
  refresh() { load(); },
  day(el) { ui.day = new Date(Number(el.dataset.v)); render(); load(); },
  ufc(el) { ui.ufcMode = el.dataset.v; render(); load(); },
  back() { if (history.length > 1) history.back(); else location.hash = '#/'; },
  dtab(el) { ui.detailTab = el.dataset.v; render(); },
  side(el) { ui.lineupSide = el.dataset.v; render(); },
  fav(el) {
    toggleFav({ id: el.dataset.id, name: el.dataset.name, logo: el.dataset.logo }, el.dataset.league);
    if (sheet) renderSheetList(); else render();
  },
  'fav-remove'(el) { prefs.favorites = prefs.favorites.filter((f) => f.id !== el.dataset.id); saveFavorites(); render(); },
  'fav-clear'() { prefs.favorites = []; saveFavorites(); render(); },
  'add-open'() { openAddSheet(); },
  'add-close'() { closeAddSheet(); },
  league(el) {
    const id = el.dataset.id;
    if (prefs.enabled.has(id)) prefs.enabled.delete(id); else prefs.enabled.add(id);
    saveEnabled();
    render();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  e.preventDefault();
  actions[el.dataset.action]?.(el, e);
});

// ---------- Start ----------

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
render();
load();
