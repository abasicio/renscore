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

/** ESPN's billeder er op til 500×500; deres billedserver kan levere en lille udgave i den størrelse, de vises i. */
const sized = (url, w, h = w) => (/^https:\/\/a\.espncdn\.com\/i\//.test(url || '')
  ? `https://a.espncdn.com/combiner/i?img=${url.slice('https://a.espncdn.com'.length)}&w=${w}&h=${h}` : url);
const logoImg = (url, cls = 'logo', px = cls === '' ? 160 : 80) =>
  (url ? `<img class="${cls}" src="${esc(sized(url, px))}" alt="" loading="lazy" decoding="async">` : `<span class="logo-ph"></span>`);

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
  fav: { overviews: storage.get('favOverviews', {}), loaded: false },
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

/** Kun de felter, visningerne bruger, så det kan gemmes i browseren. */
function slimEvent(e) {
  const c = e.competitions?.[0] || {};
  const team = (t) => t && { id: t.id, displayName: t.displayName, shortDisplayName: t.shortDisplayName, abbreviation: t.abbreviation, logo: logoOf(t), color: t.color, alternateColor: t.alternateColor };
  return {
    id: e.id, date: e.date, status: e.status, _league: e._league,
    competitions: [{ status: c.status, competitors: (c.competitors || []).map((x) => ({ homeAway: x.homeAway, winner: x.winner, score: x.score, form: x.form, team: team(x.team) })) }],
  };
}

// Kampe pr. dag: i hukommelsen (skift mellem dage er øjeblikkeligt) og de seneste dage i browseren (hurtig opstart).
const dayCache = new Map();
function storedDay(key) {
  const all = storage.get('days', {});
  const days = all[key]?.map((x) => ({ league: leagueById(x.id), events: x.events })).filter((x) => x.league);
  return days || null;
}
function storeDay(key, days) {
  const all = storage.get('days', {});
  delete all[key];
  all[key] = days.map((x) => ({ id: x.league.id, events: x.events.map(slimEvent) }));
  const keys = Object.keys(all);
  keys.slice(0, Math.max(0, keys.length - 4)).forEach((k) => delete all[k]);
  storage.set('days', all);
}

/** Henter alle ligaer for en dag. onPart kaldes, hver gang en liga er hentet. */
async function fetchDay(day, leagues, onPart) {
  const parts = new Array(leagues.length);
  await Promise.all(leagues.map((l, i) =>
    getJSON(`${API}/soccer/${l.id}/scoreboard?dates=${apiDay(day)}`)
      .then((r) => { parts[i] = (r.events || []).sort((a, b) => parseDate(a.date) - parseDate(b.date)); })
      .catch(() => { parts[i] = null; })
      .finally(() => onPart?.(parts))));
  return parts;
}

async function loadFootball() {
  loadTv(ui.day);
  loadStreaming();
  const leagues = LEAGUES.filter((l) => prefs.enabled.has(l.id));
  const key = apiDay(ui.day) + '|' + leagues.map((l) => l.id).join(',');
  const d = data.football;
  if (d.key !== key) {
    // Vis det, vi allerede har, med det samme. Friske tal kommer bagefter.
    const known = dayCache.get(key) || storedDay(key);
    d.key = key; d.days = known || []; d.loading = !known; d.failed = false;
    render();
  }
  const previous = new Map(d.days.map((x) => [x.league.id, x.events]));
  const build = (parts) => leagues.map((l, i) => ({ league: l, events: parts[i] ?? previous.get(l.id) ?? [] })).filter((x) => x.events.length);
  let timer = null;
  const parts = await fetchDay(ui.day, leagues, (p) => {
    // Vis ligaerne efterhånden som de kommer, men højst ca. 6 gange i sekundet.
    if (timer || d.key !== key) return;
    timer = setTimeout(() => { timer = null; if (d.key !== key) return; d.days = build(p); d.loading = false; render(); }, 150);
  });
  clearTimeout(timer);
  if (d.key !== key) return; // brugeren har skiftet dag imens
  d.failed = leagues.length > 0 && parts.every((r) => r === null) && !d.days.length;
  d.days = build(parts);
  d.days.forEach((x) => x.events.forEach((e) => eventCache.set(`${x.league.id}:${e.id}`, e)));
  d.loading = false;
  if (!parts.every((r) => r === null)) { dayCache.set(key, d.days); storeDay(key, d.days); }
  render();
  scheduleRefresh(d.days.some((x) => x.events.some(isLive)));
  prefetchDays(leagues);
}

/** Henter dagen før og efter i baggrunden, så de er klar, når man skifter dag. */
let prefetched = '';
function prefetchDays(leagues) {
  const ids = leagues.map((l) => l.id).join(',');
  if (prefetched === apiDay(ui.day) + ids) return;
  prefetched = apiDay(ui.day) + ids;
  const run = () => [-1, 1].forEach(async (n) => {
    const day = addDays(ui.day, n), key = apiDay(day) + '|' + ids;
    if (dayCache.has(key)) return;
    const parts = await fetchDay(day, leagues);
    if (parts.every((r) => r === null)) return;
    const days = leagues.map((l, i) => ({ league: l, events: parts[i] || [] })).filter((x) => x.events.length);
    days.forEach((x) => x.events.forEach((e) => eventCache.set(`${x.league.id}:${e.id}`, e)));
    dayCache.set(key, days);
  });
  (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(run);
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
      // Seneste afsluttede UFC-aften inden for 21 dage. Gemmes i 6 timer, da det kræver mange opslag.
      const saved = storage.get('ufcLatest', null);
      if (saved && Date.now() - saved.at < 6 * 3600e3) events = saved.events;
    }
    if (key === 'latest' && !events) {
      const days = [...Array(21).keys()].map((n) => addDays(new Date(), -n));
      const all = (await Promise.all(days.map((day) =>
        getJSON(`${API}/mma/ufc/scoreboard?dates=${apiDay(day)}`).then((r) => r.events || []).catch(() => [])))).flat();
      const done = all.filter(isDone).sort((a, b) => parseDate(b.date) - parseDate(a.date));
      events = done.length ? [done[0]] : [];
      storage.set('ufcLatest', { at: Date.now(), events });
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
  const cached = eventCache.get(key);
  loadStreaming();
  if (cached?.date) loadTv(parseDate(cached.date));
  if (data.summary.key !== key) { data.summary = { key, value: null }; }
  try {
    const value = await getJSON(`${API}/soccer/${leagueId}/summary?event=${id}`);
    if (data.summary.key !== key) return;
    data.summary.value = value;
    const d = value?.header?.competitions?.[0]?.date;
    if (d) loadTv(parseDate(d));
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
  const slim = (e) => e && slimEvent(e);
  storage.set('favOverviews', Object.fromEntries(favs.map((f, i) => [f.id, { live: slim(list[i].live), next: slim(list[i].next), recent: list[i].recent.map(slim) }])));
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


// ---------- TV-kanaler (TV 2's åbne tv-guide) ----------

const TVAPI = 'https://tvtid-api.api.tv2.dk/api/tvtid/v1';
const TV_CHANNELS = {
  156: 'TV3 Sport', 6: 'TV3+', 12948: 'TV3 Max', 5: 'TV3', 10111: 'Canal 9', 7: 'Kanal 5', 10066: "6'eren",
  77: 'TV 2 Sport', 2147483561: 'TV 2 Sport X', 3: 'TV 2', 174: 'Eurosport 1', 37: 'Eurosport 2', 1: 'DR1', 2: 'DR2',
};
const NOT_MATCHES = /goal show|studie|studio|magasin|tilsyn|podcast|highlights|optakt|trænerne/i;
const tv = { days: {}, loading: {} }; // "2026-10-21" -> [{ch, start, home, away}]

const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Gør holdnavne sammenlignelige: små bogstaver, uden accenter og uden "FC", "IF" osv. */
function normTeam(s) {
  return (s || '').toLowerCase()
    .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/münchen|munchen/g, 'munich').replace(/\bpsg\b/g, 'paris saint germain').replace(/\bman\b/g, 'manchester').replace(/\butd\b/g, 'united').replace(/kobenhavn/g, 'copenhagen').replace(/koln/g, 'cologne')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ').filter((w) => w && !['fc', 'if', 'bk', 'afc', 'cf', 'sc', 'ac', 'fk', 'sk', 'club', 'de', 'cd', 'the', 'boldklub'].includes(w))
    .join(' ');
}
function sameTeam(a, b) {
  const x = normTeam(a), y = normTeam(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const wx = x.split(' ').filter((w) => w.length >= 4), wy = new Set(y.split(' ').filter((w) => w.length >= 4));
  return wx.some((w) => wy.has(w));
}

/** "A - B" eller "A-B" → [A, B]. Kun hvis teksten deler sig i præcis to hold. */
function teamPair(text) {
  const clean = (x) => x.split(',')[0].replace(/\(.*?\)/g, '').trim();
  for (const sep of [/\s+[-–]\s+/, /[-–]/]) {
    const m = (text || '').split(sep);
    if (m.length === 2 && m[0].trim() && m[1].trim()) return m.map(clean);
  }
  return null;
}

/** Henter dagens livesendte sportsprogrammer og hvilke hold, der spiller. Gemmes pr. dag. */
async function loadTv(day) {
  const key = isoDay(day);
  if (tv.days[key] || tv.loading[key]) return;
  const saved = storage.get('tv', {})[key];
  if (saved && Date.now() - saved.at < 3 * 3600e3) { tv.days[key] = saved.found; return; }
  tv.loading[key] = true;
  try {
    const qs = Object.keys(TV_CHANNELS).map((id) => 'ch=' + id).join('&');
    const channels = await getJSON(`${TVAPI}/epg/dayviews/${key}?${qs}`);
    const progs = channels.flatMap((c) => (c.programs || []).map((p) => ({ ...p, ch: c.id })))
      .filter((p) => p.live && !p.rerun && !NOT_MATCHES.test(p.title) && (p.categories || []).some((c) => c.startsWith('Sport')));
    const cache = storage.get('tvTeasers', {});
    const found = [];
    for (let i = 0; i < progs.length; i += 8) {
      await Promise.all(progs.slice(i, i + 8).map(async (p) => {
        // Kampen står i titlen ("Serie A: Torino-Monza") eller i programmets teaser ("Randers FC - Brøndby IF").
        let pair = teamPair(p.title.replace(/^[^:]*:\s*/, ''));
        if (!pair) {
          let text = cache[p.id];
          if (text === undefined) {
            text = (await getJSON(`${TVAPI}/schedules/channels/${p.ch}/programs/${p.id}`).then((r) => r.program?.teaser).catch(() => null)) || '';
            cache[p.id] = text;
          }
          pair = teamPair(text);
        }
        if (pair) found.push({ ch: TV_CHANNELS[p.ch] || '', start: p.start * 1000, home: pair[0], away: pair[1] });
      }));
    }
    // Hold cachen lille: kun de nyeste 500 programmer.
    storage.set('tvTeasers', Object.fromEntries(Object.entries(cache).slice(-500)));
    tv.days[key] = found;
    storage.set('tv', { ...Object.fromEntries(Object.entries(storage.get('tv', {})).slice(-3)), [key]: { at: Date.now(), found } });
  } catch {
    tv.days[key] = null; // prøv igen ved næste opdatering
  } finally {
    tv.loading[key] = false;
  }
  if (!tv.days[key]) delete tv.days[key];
  render();
}

// ---------- Streaming ----------

// Tv-kanalerne kan også streames her.
const STREAM_OF = {
  'TV3 Sport': 'Viaplay', 'TV3+': 'Viaplay', 'TV3 Max': 'Viaplay', 'TV3': 'Viaplay',
  'TV 2 Sport': 'TV 2 Play', 'TV 2 Sport X': 'TV 2 Play', 'TV 2': 'TV 2 Play',
  'Eurosport 1': 'HBO Max', 'Eurosport 2': 'HBO Max', 'Canal 9': 'HBO Max', 'Kanal 5': 'HBO Max', "6'eren": 'HBO Max',
  DR1: 'DR TV', DR2: 'DR TV',
};
const streaming = { events: null, at: 0 };

/** Viaplays program ligger i streaming.json, som GitHub Actions opdaterer hver 3. time. */
async function loadStreaming() {
  if (Date.now() - streaming.at < 3600e3) return;
  streaming.at = Date.now();
  try {
    streaming.events = (await getJSON('streaming.json')).events || [];
    render();
  } catch {
    streaming.at = 0;
  }
}

/** Hvor kampen kan ses: tv-kanaler og streamingtjenester. */
function watchFor(e) {
  const kick = parseDate(e.date);
  const tvs = channelsFor(e);
  const stream = new Set(tvs.map((c) => STREAM_OF[c.ch]).filter(Boolean));
  if (kick && streaming.events) {
    const cs = e.competitions?.[0]?.competitors || [];
    const home = cs.find((c) => c.homeAway === 'home'), away = cs.find((c) => c.homeAway === 'away');
    // Viaplays sending starter med studiet op til 1½ time før kampstart.
    for (const t of streaming.events) {
      if (t.start < kick - 90 * 60e3 || t.start > kick + 15 * 60e3) continue;
      if (fitsPair(t, home, away)) stream.add(t.s);
    }
  }
  return { tvs, stream: [...stream] };
}

function fitsPair(t, home, away) {
  const fits = (n, c) => [c?.team?.displayName, c?.team?.shortDisplayName].some((x) => sameTeam(n, x));
  return (fits(t.home, home) && fits(t.away, away)) || (fits(t.home, away) && fits(t.away, home));
}

/** Kanaler for en kamp: begge hold skal passe, og sendingen skal starte tæt på kampstart. */
function channelsFor(e) {
  const kick = parseDate(e.date);
  if (!kick) return [];
  const list = tv.days[isoDay(kick)];
  if (!list) return [];
  const cs = e.competitions?.[0]?.competitors || [];
  const home = cs.find((c) => c.homeAway === 'home'), away = cs.find((c) => c.homeAway === 'away');
  const hits = list.filter((t) => Math.abs(t.start - kick) <= 75 * 60e3 && fitsPair(t, home, away));
  return [...new Map(hits.map((h) => [h.ch, h])).values()];
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

function routeChanged() {
  if (sheet) { sheet.remove(); sheet = null; document.body.style.overflow = ''; }
  window.scrollTo(0, 0);
  ui.detailTab = 'details';
  ui.lineupSide = 'home';
  lastCenteredDay = null;
  render();
  load();
}
window.addEventListener('hashchange', routeChanged);
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
    <div class="mteams">${teams}${tvLine(e)}</div>${scores}
  </a>`;
}

function tvLine(e) {
  if (isDone(e)) return '';
  const { tvs, stream } = watchFor(e);
  const parts = [];
  if (tvs.length) parts.push('📺 ' + tvs.map((c) => esc(c.ch)).join(' · '));
  if (stream.length) parts.push('▶ ' + stream.map(esc).join(' · '));
  return parts.length ? `<div class="tvline">${parts.join('&nbsp;&nbsp;')}</div>` : '';
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

// ---------- Klubfarver ----------

const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lum = (rgb) => (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
const rgbDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hex = (rgb) => '#' + rgb.map((x) => pad(x.toString(16))).join('');

/** Holdfarver, der kan ses på både lys og mørk baggrund og ikke ligner hinanden. */
function teamColors(ht, at) {
  const usable = (t) => [t?.color, t?.alternateColor].map(hexRgb).filter((c) => c && lum(c) < 0.85 && lum(c) > 0.1);
  const hs = usable(ht), as = usable(at);
  const h = hs[0] || hexRgb('#374df5');
  const a = as.find((c) => rgbDist(c, h) > 110) || (rgbDist(hexRgb('#00ad9e'), h) > 110 ? hexRgb('#00ad9e') : hexRgb('#f08c00'));
  return { h: hex(h), a: hex(a) };
}
const inkOn = (fill) => (lum(hexRgb(fill) || [0, 0, 0]) > 0.6 ? '#111' : '#fff');

/** Trøje i holdets farve med rygnummer. Bruges når ESPN ikke har et foto af spilleren. */
function jerseySvg(fill, num) {
  return `<svg class="jersey" viewBox="0 0 40 40"><path d="M14 4 4 9.5l3.5 8 4-2V36h17V15.5l4 2L36 9.5 26 4c-1 3-3.4 4.6-6 4.6S15 7 14 4z" fill="${fill}" stroke="rgba(255,255,255,.75)" stroke-width="1.2" stroke-linejoin="round"/>
    <text x="20" y="28" text-anchor="middle" font-size="12" font-weight="800" fill="${inkOn(fill)}">${esc(num)}</text></svg>`;
}
const GK_COLOR = '#f0b429';
const isKeeper = (p) => /^(G|GK)$/i.test(p.position?.abbreviation || '');
/** Foto hvis ESPN har et, ellers en trøje. */
function playerPic(p, color) {
  const fill = isKeeper(p) ? GK_COLOR : color;
  const photo = p.athlete?.headshot?.href;
  return photo
    ? `<span class="pic"><img src="${esc(sized(photo, 120, 88))}" alt="" loading="lazy" decoding="async"><b style="background:${fill};color:${inkOn(fill)}">${esc(p.jersey || '')}</b></span>`
    : jerseySvg(fill, p.jersey || '');
}

// ---------- Form og indbyrdes opgør ----------

const RESULT_DA = { W: 'V', D: 'U', L: 'T' };

function formCard(sum, home, away) {
  const teams = [home, away].map((c) => (sum?.lastFiveGames || []).find((g) => g.team?.id === c?.team?.id));
  if (!teams.some((t) => t?.events?.length)) return '';
  const row = (g, c) => {
    if (!g?.events?.length) return '';
    const evs = [...g.events].sort((a, b) => parseDate(a.gameDate) - parseDate(b.gameDate));
    return `<div class="formrow"><div class="ft">${logoImg(logoOf(c?.team))}<span>${esc(teamName(c?.team))}</span></div>
      <div class="fgames">${evs.map((ev) => {
        const r = RESULT_DA[ev.gameResult] || '–';
        return `<div class="fg"><b class="${r}">${r}</b>${logoImg(logoOf(ev.opponent), 'olog')}<span>${ev.atVs === '@' ? `${esc(ev.awayTeamScore)}-${esc(ev.homeTeamScore)}` : `${esc(ev.homeTeamScore)}-${esc(ev.awayTeamScore)}`}</span></div>`;
      }).join('')}</div></div>`;
  };
  return `<section class="card"><div class="card-head"><span class="flag">📈</span><div><div class="t">Form</div><div class="s">De seneste 5 kampe · nyeste til højre</div></div></div>
    <div class="sep"></div>${row(teams[0], home)}<div class="sep"></div>${row(teams[1], away)}</section>`;
}

function h2hCard(sum, home, away, colors) {
  const series = (sum?.seasonseries || []).find((x) => x.type === 'head-to-head');
  const games = (series?.events || []).filter((ev) => ev.status === 'post' || ev.statusType?.completed);
  if (!games.length) return '';
  const hid = home?.team?.id, aid = away?.team?.id;
  let hw = 0, aw = 0, dr = 0;
  for (const ev of games) {
    const win = ev.competitors?.find((c) => c.winner);
    if (!win) dr++; else if (win.team?.id === hid) hw++; else if (win.team?.id === aid) aw++;
  }
  const n = hw + dr + aw || 1;
  const rows = [...games].sort((a, b) => parseDate(b.date) - parseDate(a.date)).map((ev) => {
    const cs = homeFirst(ev.competitors);
    const d = parseDate(ev.date);
    return `<div class="sep"></div><div class="h2hrow"><span class="d">${d ? `${fmt.dayMonth(d)}.${String(d.getFullYear()).slice(2)}` : ''}</span>
      <span class="hn">${esc(teamName(cs[0]?.team))}${logoImg(logoOf(cs[0]?.team))}</span>
      <b>${esc(cs[0]?.score ?? '')} - ${esc(cs[1]?.score ?? '')}</b>
      <span class="an">${logoImg(logoOf(cs[1]?.team))}${esc(teamName(cs[1]?.team))}</span></div>`;
  }).join('');
  return `<section class="card"><div class="card-head"><span class="flag">⚔️</span><div><div class="t">Indbyrdes opgør</div><div class="s">De seneste ${games.length} kampe</div></div></div>
    <div class="h2hsum"><div><b style="color:${colors.h}">${hw}</b><span>${esc(teamName(home?.team))}</span></div><div><b>${dr}</b><span>Uafgjort</span></div><div><b style="color:${colors.a}">${aw}</b><span>${esc(teamName(away?.team))}</span></div></div>
    <div class="h2hbar"><i style="flex:${hw / n};background:${colors.h}"></i><i style="flex:${dr / n};background:#8e8e93"></i><i style="flex:${aw / n};background:${colors.a}"></i></div>
    ${rows}</section>`;
}

// ---------- Live-kommentarer ----------

/** ESPN's kommentarer er på engelsk; de almindelige hændelser oversættes ud fra deres type. */
function commentLine(c) {
  const pl = c.play || {};
  const type = pl.type?.type || '';
  const who = (i = 0) => pl.participants?.[i]?.athlete?.displayName || '';
  const team = pl.team?.displayName || '';
  const withTeam = (n) => esc(n) + (team ? ` <span class="ct">(${esc(team)})</span>` : '');
  const text = c.text || '';
  if (/goal|penalty---scored/.test(type) && !/kick|missed|saved/.test(type)) {
    const score = (text.match(/Goal!\s*([^.]+)\./) || [])[1];
    const own = /own goal/i.test(text);
    return { ic: '⚽', big: true, html: `<b>MÅL!${score ? ' ' + esc(score) : ''}</b><div>${withTeam(who())}${own ? ' · selvmål' : type.startsWith('penalty') ? ' · straffespark' : ''}${who(1) && !own ? ` · assist ${esc(who(1))}` : ''}</div>` };
  }
  const sub = text.match(/Substitution, (.+?)\. (.+?) replaces (.+?)\./);
  const map = {
    'yellow-card': ['<span class="card-y"></span>', () => `Gult kort til ${withTeam(who())}`],
    'red-card': ['<span class="card-r"></span>', () => `Rødt kort til ${withTeam(who())}`],
    'corner-awarded': ['⛳', () => `Hjørnespark til ${esc(team)}`],
    foul: ['✋', () => `Frispark begået af ${withTeam(who())}`],
    offside: ['🚩', () => `Offside: ${withTeam(who())}`],
    'shot-on-target': ['🎯', () => `Skud på mål: ${withTeam(who())}`],
    'shot-off-target': ['↗', () => `Skud forbi: ${withTeam(who())}`],
    'shot-blocked': ['🛡', () => `Skud blokeret: ${withTeam(who())}`],
    'shot-hit-woodwork': ['🥅', () => `På stolpen/overliggeren: ${withTeam(who())}`],
    'penalty---missed': ['❌', () => `Straffespark brændt: ${withTeam(who())}`],
    'penalty---saved': ['🧤', () => `Straffespark reddet: ${withTeam(who())}`],
    'start-delay': ['⏸', () => 'Kampen er afbrudt'],
    'end-delay': ['▶', () => 'Kampen fortsætter'],
    'deleted-after-review': ['📺', () => 'VAR: annulleret efter gennemsyn'],
  };
  if (type === 'substitution' && sub) return { ic: '⇄', html: `Udskiftning, ${esc(sub[1])}: <span class="arrow-in">↑</span> ${esc(sub[2])} <span class="arrow-out">↓</span> ${esc(sub[3])}` };
  if (map[type]) return { ic: map[type][0], html: map[type][1]() };
  if (type === 'kickoff') return { marker: pl.period?.number === 2 ? 'ANDEN HALVLEG' : pl.period?.number > 2 ? 'FORLÆNGET SPILLETID' : 'KAMPSTART' };
  if (type === 'halftime') return { marker: 'PAUSE' };
  if (type === 'end-regular-time' || type === 'end-extra-time' || type === 'full-time') return { marker: 'SLUT' };
  if (type.startsWith('var')) return { ic: '📺', html: 'VAR: ' + esc(pl.text || text) };
  const end = text.match(/^Match ends, (.+)\.$/);
  if (end) return { ic: '🏁', html: `<b>Kampen er slut: ${esc(end[1])}</b>` };
  const added = text.match(/announced (\d+) minutes? of added time/);
  if (added) return { ic: '⏱', html: `${added[1]} minutters tillægstid` };
  const half = text.match(/^(First|Second) Half ends, (.+)\.$/);
  if (half) return { ic: '⏸', html: `${half[1] === 'First' ? 'Første' : 'Anden'} halvleg er slut: ${esc(half[2])}` };
  if (/^Lineups are announced/.test(text)) return { ic: '📋', html: 'Holdene er offentliggjort, og spillerne varmer op' };
  return { ic: '·', html: esc(text) };
}

function commentaryTab(list) {
  const rows = [...list].sort((a, b) => b.sequence - a.sequence).map((c) => {
    const l = commentLine(c);
    if (l.marker) return `<div class="marker">${l.marker}</div>`;
    return `<div class="cm ${l.big ? 'goal' : ''}"><span class="min">${esc(c.time?.displayValue || '')}</span><span class="ic">${l.ic}</span><div class="txt">${l.html}</div></div>`;
  });
  return `<section class="card">${rows.join('<div class="sep"></div>')}</section>
    <p class="note">Kommentarer fra ESPN. Opdateres automatisk under kampen.</p>`;
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

  const commentary = sum?.commentary || [];
  const colors = teamColors(home?.team, away?.team);
  const tabs = [['details', 'Detaljer']];
  if (commentary.length) tabs.push(['comments', 'Referat']);
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

  let html = `<header class="top mtop" style="--hc:${colors.h};--ac:${colors.a}">
    <div class="row"><button class="iconbtn" data-action="back" aria-label="Tilbage">${BACK_ICON}</button><p class="title-center">${esc(league.name)}</p><span style="width:34px"></span></div>
    <div class="mhead">${teamCol(home)}<div class="mid">${mid}</div>${teamCol(away)}</div>
    <div class="utabs">${tabs.map(([t, label]) => `<button class="${ui.detailTab === t ? 'sel' : ''}" data-action="dtab" data-v="${t}">${label}</button>`).join('')}</div>
  </header><main style="--hc:${colors.h};--ac:${colors.a}">`;

  if (ui.detailTab === 'details') {
    const w = st === 'post' ? { tvs: [], stream: [] } : watchFor({ date: event.date, competitions: [{ competitors: cs }] });
    if (w.tvs.length || w.stream.length) {
      html += `<section class="card"><div class="card-head"><span class="flag">📺</span><div><div class="t">Se den på</div><div class="s">Tv og streaming i Danmark</div></div></div>
        ${w.tvs.map((c) => `<div class="sep"></div><div class="tvrow"><b>${esc(c.ch)}</b><span>Tv · ${fmt.time(new Date(c.start))}</span></div>`).join('')}
        ${w.stream.map((s) => `<div class="sep"></div><div class="tvrow"><b>${esc(s)}</b><span>Streaming</span></div>`).join('')}</section>`;
    }
    const extra = formCard(sum, home, away) + h2hCard(sum, home, away, colors);
    if (timeline.length || !extra) html += detailsTab(timeline, home, st, event);
    html += extra;
  }
  else if (ui.detailTab === 'comments') html += commentaryTab(commentary);
  else if (ui.detailTab === 'stats') html += statsTab(stats(home?.team?.id), stats(away?.team?.id));
  else if (ui.detailTab === 'lineups') html += lineupsTab(home, away, roster, sum?.keyEvents || [], fallbackLogo, colors);
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
      <div class="bars"><div class="bar h"><i style="width:${hf}%;background:var(--hc);opacity:${hv >= av ? 1 : 0.35}"></i></div>
      <div class="bar"><i style="width:${af}%;background:var(--ac);opacity:${av >= hv ? 1 : 0.35}"></i></div></div>
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

function lineupsTab(home, away, rosterOf, keyEvents, logo, colors) {
  const side = ui.lineupSide === 'away' ? away : home;
  const color = ui.lineupSide === 'away' ? colors.a : colors.h;
  const r = rosterOf(side?.team?.id);
  const pick = [home, away].filter(Boolean).map((c) => `<button class="${ui.lineupSide === c.homeAway ? 'sel' : ''}" style="--sel:${c.homeAway === 'away' ? colors.a : colors.h}" data-action="side" data-v="${c.homeAway}">${logoImg(logo(c))}${esc(teamName(c.team))}</button>`).join('');
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
    return `<div class="player"><div class="shirt">${playerPic(p, color)}
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
      ${benchSorted.map((p) => `<div class="sep"></div><div class="bp"><span class="j">${playerPic(p, color)}</span><span>${esc(p.athlete?.displayName || '')}</span>
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

// ---------- Swipe ----------

const MAIN_TABS = ['#/', '#/fav', '#/settings'];

/** Hvad et swipe gør her. dir = 1 er swipe mod venstre (frem), -1 mod højre (tilbage). null = intet den vej. */
function swipeAction(dir, edge) {
  const r = route();
  if (r.name === 'match') {
    if (edge && dir === -1) return { run: actions.back, slide: false };
    const tabs = [...app.querySelectorAll('.utabs [data-v]')].map((b) => b.dataset.v);
    const i = tabs.indexOf(ui.detailTab) + dir;
    if (i < 0) return { run: actions.back, slide: false }; // højre på første fane = tilbage til listen
    if (i >= tabs.length) return null;
    return { run: () => { ui.detailTab = tabs[i]; render(); } };
  }
  if (r.name === 'scores' && ui.sport === 'football') {
    const day = addDays(ui.day, dir);
    if (Math.abs(Math.round((day - startOfDay(new Date())) / 864e5)) > 7) return null;
    return { run: () => { ui.day = day; render(); load(); } };
  }
  if (r.name === 'scores') {
    const modes = ['next', 'latest'], i = modes.indexOf(ui.ufcMode) + dir;
    return modes[i] ? { run: () => { ui.ufcMode = modes[i]; render(); load(); } } : null;
  }
  const i = MAIN_TABS.indexOf(r.name === 'fav' ? '#/fav' : '#/settings') + dir;
  if (!MAIN_TABS[i]) return null;
  return { run: () => { history.pushState(null, '', MAIN_TABS[i]); routeChanged(); } };
}

let swipe = null;
const resetMain = (main) => { main.style.transition = 'transform .22s ease, opacity .22s'; main.style.transform = ''; main.style.opacity = ''; };

app.addEventListener('touchstart', (e) => {
  swipe = null;
  if (sheet || e.touches.length !== 1) return;
  const t = e.touches[0];
  // Vandrette lister (dage, faner) scroller selv; i Safari er kanten Safaris egen "tilbage".
  if (e.target.closest('.days, .utabs, .chips, .sidepick, input')) return;
  const edge = t.clientX < 24;
  if (edge && !navigator.standalone) return;
  const main = app.querySelector('main');
  if (main) swipe = { x: t.clientX, y: t.clientY, t: Date.now(), edge, main, lock: null, dx: 0 };
}, { passive: true });

app.addEventListener('touchmove', (e) => {
  if (!swipe) return;
  const t = e.touches[0], dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  if (!swipe.lock) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) { swipe = null; return; } // lodret: almindelig scroll
    swipe.lock = true;
    swipe.next = { 1: swipeAction(1, swipe.edge), '-1': swipeAction(-1, swipe.edge) };
  }
  e.preventDefault();
  swipe.dx = dx;
  const pull = swipe.next[dx < 0 ? 1 : -1] ? dx * 0.6 : dx * 0.15; // modstand, når der ikke er mere
  swipe.main.style.transition = 'none';
  swipe.main.style.transform = `translateX(${pull}px)`;
  swipe.main.style.opacity = String(1 - Math.min(Math.abs(pull) / 500, 0.35));
}, { passive: false });

function endSwipe() {
  const s = swipe;
  swipe = null;
  if (!s?.lock) return;
  const dir = s.dx < 0 ? 1 : -1;
  const fast = Math.abs(s.dx) > 35 && Date.now() - s.t < 280;
  const act = (Math.abs(s.dx) > 70 || fast) ? s.next[dir] : null;
  if (!act) return resetMain(s.main);
  s.main.style.transition = 'transform .13s ease-in, opacity .13s';
  s.main.style.transform = `translateX(${-dir * 40}%)`;
  s.main.style.opacity = '0';
  setTimeout(() => {
    act.run();
    const next = app.querySelector('main');
    if (!next || next === s.main || act.slide === false) { if (next) resetMain(next); return; }
    next.style.transition = 'none';
    next.style.transform = `translateX(${dir * 30}%)`;
    next.style.opacity = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      next.style.transition = 'transform .2s ease-out, opacity .2s';
      next.style.transform = '';
      next.style.opacity = '';
    }));
  }, 120);
}
app.addEventListener('touchend', endSwipe);
app.addEventListener('touchcancel', endSwipe);

// ---------- Start ----------

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // Når en ny version er hentet, genindlæses siden én gang, så man får den med det samme.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
}
render();
load();
