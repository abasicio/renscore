'use strict';

// RenScore – fodbold- og UFC-resultater uden reklamer.
// Data fra ESPN's åbne API. Alt brugerdata (ligaer, favoritter) gemmes kun i browseren.

const APP_VERSION = 38;
window.APP_VERSION_DBG = APP_VERSION; // tælles op ved hver udgivelse (samme tal som cachen i sw.js)
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

// Farvepalet (Indstillinger → Farver). Sættes med det samme, så den gamle farve aldrig blinker.
const PALETTES = [
  { id: 'blue', name: 'Stadion', light: ['#f2f4f8', '#3352ff'], dark: ['#0a0e18', '#5672ff'] },
  { id: 'green', name: 'Græs', light: ['#f1f5f1', '#10955b'], dark: ['#08110c', '#2fcf7c'] },
  { id: 'sunset', name: 'Aftensol', light: ['#f6f3ef', '#f4561d'], dark: ['#100c0a', '#ff6a35'] },
  { id: 'volt', name: 'Floodlight', light: ['#f3f2ee', '#d7ff3a'], dark: ['#0a0c10', '#d7ff3a'] },
];
const darkMode = window.matchMedia?.('(prefers-color-scheme: dark)');
function applyPalette(id) {
  const p = PALETTES.find((x) => x.id === id) || PALETTES[0];
  if (p.id === 'blue') delete document.documentElement.dataset.palette;
  else document.documentElement.dataset.palette = p.id;
  // Statuslinjen/Safari-bjælken følger baggrunden.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.content = (m.media.includes('dark') ? p.dark : p.light)[0];
  });
}
prefs.palette = storage.get('palette', 'blue');
if (storage.get('debug', false)) Debug.set(true);
applyPalette(prefs.palette);

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

async function getJSON(url, { priority = 'auto', signal } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  signal?.addEventListener('abort', () => ctl.abort());
  try {
    // Ingen cache:'no-store' her: iPhone-Safari tilføjer så Cache-Control/Pragma-headere, og den
    // forespørgsel afviser ESPN (403 på CORS-forhåndstjekket). ESPN's svar må højst gemmes 1–6 s alligevel.
    let r;
    try {
      r = await fetch(url, { signal: ctl.signal, priority });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      r = await fetch(url, { signal: ctl.signal }); // sikkerhedsnet: helt almindelig forespørgsel
    }
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
  (url ? `<img class="${cls}" src="${esc(sized(url, px))}" alt="">` : `<span class="logo-ph"></span>`);

// ---------- Tilstand ----------

const ui = {
  sport: 'football',
  day: (() => {
    const m = /[?&]day=(\d{4})(\d{2})(\d{2})/.exec(location.search);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : startOfDay(new Date());
  })(),
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
  team: { key: null, info: null, o: null },
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
// ESPN sender hver ligas kampdage med i svaret ("calendar"). Dem husker vi i 2 døgn, så vi kun
// spørger de ligaer, der faktisk spiller den dag. Pokaler/UEFA har en anden slags kalender og spørges altid.
const calendars = storage.get('cal', {}); // ligaId -> { at, days: ["20261101", …] }
function rememberCalendar(leagueId, r) {
  const l = r?.leagues?.[0], cal = l?.calendar;
  if (l?.calendarType !== 'day' || !l.calendarIsWhitelist || !Array.isArray(cal) || typeof cal[0] !== 'string') return;
  calendars[leagueId] = { at: Date.now(), days: cal.map((d) => d.slice(0, 10).replace(/-/g, '')) };
  clearTimeout(rememberCalendar.t);
  rememberCalendar.t = setTimeout(() => storage.set('cal', calendars), 500);
}
const playsOn = (leagueId, day) => {
  const c = calendars[leagueId];
  return !c || Date.now() - c.at > 2 * 864e5 || c.days.includes(apiDay(day));
};

let lastFetchError = '';
async function fetchDay(day, leagues, onPart, opts) {
  const parts = new Array(leagues.length);
  await Promise.all(leagues.map((l, i) => (!playsOn(l.id, day)
    ? Promise.resolve().then(() => { parts[i] = []; })
    : getJSON(`${API}/soccer/${l.id}/scoreboard?dates=${apiDay(day)}`, opts)
      .then((r) => { rememberCalendar(l.id, r); parts[i] = (r.events || []).sort((a, b) => parseDate(a.date) - parseDate(b.date)); }))
      .catch((err) => { parts[i] = null; lastFetchError = `${err?.name || 'Fejl'}: ${err?.message || err}`; })
      .finally(() => onPart?.(parts))));
  return parts;
}

/** Tilbage til i dag (og toppen af listen). */
function goToday() {
  const today = startOfDay(new Date());
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (sameDay(ui.day, today)) return;
  Motion.hint = { dir: Math.sign(today - ui.day) };
  setDay(today);
  render();
  load();
}

/** Skifter dag. LIVE gælder kun i dag, så filteret slås fra på andre dage. */
function setDay(day) {
  ui.dayDir = Math.sign(day - ui.day) || ui.dayDir || 1; // retningen man bladrer i (til forhåndshentning)
  ui.day = day;
  if (!sameDay(day, new Date())) ui.liveOnly = false;
}

const footballKey = (day) => apiDay(day) + '|' + LEAGUES.filter((l) => prefs.enabled.has(l.id)).map((l) => l.id).join(',');

async function loadFootball() {
  loadTv(ui.day);
  loadStreaming();
  const leagues = LEAGUES.filter((l) => prefs.enabled.has(l.id));
  const key = footballKey(ui.day);
  const d = data.football;
  if (d.key !== key) {
    // Den valgte dag går forud for alt andet: stop forhåndshentning og den dag, man lige har forladt.
    prefetchCtl?.abort(); prefetched = '';
    dayCtl?.abort();
  }
  const ctl = dayCtl = new AbortController();
  if (d.key !== key) {
    // Vis det, vi allerede har, med det samme. Friske tal kommer bagefter.
    const known = dayCache.get(key) || storedDay(key);
    d.key = key; d.days = known || []; d.loading = !known; d.failed = false;
    render();
    if (known) prefetchDays(leagues); // dagen står der allerede – hent de næste med det samme
  }
  const previous = new Map(d.days.map((x) => [x.league.id, x.events]));
  const build = (parts) => leagues.map((l, i) => ({ league: l, events: parts[i] ?? previous.get(l.id) ?? [] })).filter((x) => x.events.length);
  // Dagen vises samlet, når alle ligaer er hentet – ellers dukker kort (fx "Mine hold") op midt i
  // listen og skubber alt. Kun hvis nettet er langsomt og vi intet har at vise, kommer det hentede efter 1,5 s.
  let latest = null;
  const slow = d.loading ? setTimeout(() => {
    if (d.key !== key || !latest || !d.loading) return;
    d.days = build(latest); d.loading = false; render();
  }, 1500) : null;
  let parts = await fetchDay(ui.day, leagues, (p) => { latest = p; }, { signal: ctl.signal });
  clearTimeout(slow);
  if (d.key !== key) return; // brugeren har skiftet dag imens
  if (leagues.length && parts.every((r) => r === null)) {
    // Alt fejlede (typisk et kort hul i forbindelsen): prøv én gang mere, før vi siger "Ingen forbindelse".
    await new Promise((r) => setTimeout(r, 1500));
    if (d.key !== key) return;
    parts = await fetchDay(ui.day, leagues, null, { signal: ctl.signal });
    if (d.key !== key) return;
  }
  d.failed = leagues.length > 0 && parts.every((r) => r === null) && !d.days.length;
  d.days = build(parts);
  d.days.forEach((x) => x.events.forEach((e) => eventCache.set(`${x.league.id}:${e.id}`, e)));
  d.loading = false;
  if (!parts.every((r) => r === null)) { dayCache.set(key, d.days); storeDay(key, d.days); }
  prefetchDays(leagues);
  render();
  scheduleRefresh(d.days.some((x) => x.events.some(isLive)));
}

/** Henter dagen før og efter i baggrunden, så de er klar, når man skifter dag. */
let prefetched = '';
function prefetchDays(leagues) {
  const ids = leagues.map((l) => l.id).join(',');
  if (prefetched === apiDay(ui.day) + ids) return;
  prefetched = apiDay(ui.day) + ids;
  prefetchCtl?.abort();
  const ctl = prefetchCtl = new AbortController();
  const center = ui.day;
  // Én dag ad gangen og med lav prioritet, så det aldrig står i vejen for det, man kigger på.
  const dir = ui.dayDir || 1;
  setTimeout(async () => {
    // To dage i den retning, man bladrer, og én bagud.
    for (const n of [dir, 2 * dir, -dir]) {
      if (ctl.signal.aborted) return;
      const day = addDays(center, n), key = apiDay(day) + '|' + ids;
      if (dayCache.has(key)) continue;
      const parts = await fetchDay(day, leagues, null, { priority: 'low', signal: ctl.signal });
      if (ctl.signal.aborted || parts.every((r) => r === null)) continue;
      const days = leagues.map((l, i) => ({ league: l, events: parts[i] || [] })).filter((x) => x.events.length);
      days.forEach((x) => x.events.forEach((e) => eventCache.set(`${x.league.id}:${e.id}`, e)));
      dayCache.set(key, days);
      await warmLogos(days, ctl.signal);
    }
  }, 0);
}
let prefetchCtl = null;
let dayCtl = null;

/** Henter logoerne på forhånd – 6 ad gangen, så telefonens forbindelse ikke bliver proppet. */
async function warmLogos(days, signal) {
  const urls = [...new Set(days.flatMap((x) => x.events.flatMap((e) => (e.competitions?.[0]?.competitors || []).map((c) => sized(logoOf(c.team), 80)))))].filter(Boolean);
  for (let i = 0; i < urls.length && !signal?.aborted; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map((u) => new Promise((done) => {
      const img = new Image();
      img.src = u;
      (img.decode ? img.decode() : new Promise((r) => { img.onload = r; })).catch(() => {}).then(done);
    })));
  }
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
  prefetchCtl?.abort(); // kampen går forud for forhåndshentning af dage
  prefetched = '';
  const cached = eventCache.get(key);
  loadStreaming();
  if (cached?.date) loadTv(parseDate(cached.date));
  if (data.summary.key !== key) { data.summary = { key, value: null }; }
  try {
    const value = await getJSON(`${API}/soccer/${leagueId}/summary?event=${id}`, { priority: 'high' });
    if (data.summary.key !== key) return;
    data.summary.value = value;
    data.summary.error = '';
    const d = value?.header?.competitions?.[0]?.date;
    if (d) loadTv(parseDate(d));
  } catch (err) {
    data.summary.error = `${err?.name || 'Fejl'}: ${err?.message || err}`;
    // Fejlede det, før vi havde noget, så prøv igen om lidt i stedet for om 5 minutter.
    if (data.summary.key === key && !data.summary.value) {
      render();
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => load(), 4000);
      return;
    }
  }
  render();
  const s = data.summary.value?.header?.competitions?.[0]?.status;
  scheduleRefresh(s?.type?.state === 'in');
}

async function loadTeamDirectory() {
  const t = data.teams;
  if (t.byLeague || t.loading) return;
  t.loading = true;
  // Holdlisten bygges af GitHub ved hver udgivelse (scripts/teams.py): én lille fil i stedet for 20 kald.
  try {
    const r = await getJSON('teams.json');
    if (Object.keys(r.leagues || {}).length) { t.byLeague = r.leagues; t.loading = false; storage.set('teams', { t: Date.now(), byLeague: t.byLeague }); return; }
  } catch { /* uden net: brug den gemte liste herunder */ }
  const cached = storage.get('teams', null);
  if (cached && Object.keys(cached.byLeague || {}).length) { t.byLeague = cached.byLeague; t.loading = false; return; }
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
  let info = null; // placering, V-U-T og farver står i ligaens kampprogram (/teams/{id} må ikke hentes fra en browser)
  ids.forEach((id) => [false, true].forEach((upcoming) => reqs.push(
    getJSON(`${API}/soccer/${id}/teams/${fav.id}/schedule${upcoming ? '?fixture=true' : ''}`)
      .then((r) => { if (id === fav.leagueId && !upcoming && r.team) info = r.team; return r; })
      .then((r) => (r.events || []).map((e) => ({ ...e, _league: e.league?.slug || id })))
      .catch(() => []))));
  const byId = new Map();
  (await Promise.all(reqs)).flat().forEach((e) => byId.set(e.id, e));
  const events = [...byId.values()].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  events.forEach((e) => eventCache.set(`${e._league}:${e.id}`, e));
  const soon = Date.now() - 3 * 3600e3;
  const upcoming = events.filter((e) => stateOf(e) === 'pre' && parseDate(e.date) > soon);
  return {
    info,
    live: events.find(isLive),
    next: upcoming[0],
    upcoming: upcoming.slice(0, 5),
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

async function loadTeam(leagueId, id) {
  const key = leagueId + ':' + id;
  if (data.team.key !== key) data.team = { key, info: null, o: null };
  loadTeamDirectory().then(() => { if (!data.team.info) render(); }); // navn og logo med det samme
  const o = await teamOverview({ id, leagueId });
  if (data.team.key !== key) return;
  data.team.info = o.info || data.team.info;
  data.team.o = o;
  render();
  scheduleRefresh(!!o.live);
}

function load() {
  const r = route();
  if (r.name === 'scores') return ui.sport === 'football' ? loadFootball() : loadUfc();
  if (r.name === 'match') return loadSummary(r.league, r.id);
  if (r.name === 'team') return loadTeam(r.league, r.id);
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
const normCache = new Map();
function normTeam(s) {
  let v = normCache.get(s);
  if (v === undefined) { v = normTeamRaw(s); normCache.set(s, v); }
  return v;
}
function normTeamRaw(s) {
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
  const t = h.match(/^\/team\/([^/]+)\/([^/]+)$/);
  if (t) return { name: 'team', league: decodeURIComponent(t[1]), id: decodeURIComponent(t[2]) };
  if (h === '/fav') return { name: 'fav' };
  if (h === '/settings') return { name: 'settings' };
  return { name: 'scores' };
}

const app = document.getElementById('app');

/** Hvad man kigger på lige nu. Skifter den, er det et nyt skærmbillede (animeres ind). */
function viewKey(r) {
  if (r.name === 'scores') return `scores|${ui.sport}|${ui.sport === 'football' ? apiDay(ui.day) : ui.ufcMode}|${ui.liveOnly}`;
  if (r.name === 'match') return `match|${r.league}|${r.id}|${ui.detailTab}|${ui.lineupSide}`;
  if (r.name === 'team') return `team|${r.id}`;
  return r.name;
}

let renderPending = false;
let lastHtml = '';
let renderPendingTimer = null;
function render() {
  // Midt i et swipe/træk venter vi; ellers mister man fingeren, når data kommer ind.
  // Sikring: har fingeren ikke rørt sig i 0,8 s (fx hvis iOS slugte "slip"), tegner vi alligevel.
  if (swipe?.lock && performance.now() - (swipe.lastT || swipe.start || 0) < 800) {
    renderPending = true;
    clearTimeout(renderPendingTimer);
    renderPendingTimer = setTimeout(() => { if (renderPending) { swipe = null; render(); } }, 900);
    return;
  }
  if (swipe?.lock) swipe = null;
  renderPending = false;
  const r = route();
  const before = typeof Motion !== 'undefined' ? Motion.snapshot() : null;
  // En holdside kan åbnes fra både Kampe og Favoritter; fanen bliver stående, hvor man kom fra.
  if (r.name !== 'team') document.querySelectorAll('#tabbar a').forEach((a) => {
    a.classList.toggle('sel', a.dataset.tab === (r.name === 'match' ? 'scores' : r.name));
  });
  const html = r.name === 'scores' ? viewScores() : r.name === 'match' ? viewMatch(r.league, r.id)
    : r.name === 'team' ? viewTeam(r.league, r.id) : r.name === 'fav' ? viewFavorites() : viewSettings();
  document.querySelectorAll('body > .swipe-ghost').forEach((g) => {
    if (performance.now() - (g._born || (g._born = performance.now())) > 1000) g.remove();
  });
  if (html === lastHtml) return; // intet nyt at vise (fx en opdatering uden ændringer)
  Debug.log('tegner ' + r.name + (r.name === 'scores' ? ' ' + apiDay(ui.day) : ''));
  lastHtml = html;
  // Gem de billeder, der allerede er tegnet, og sæt dem ind igen bagefter: et nyt <img> med samme
  // adresse blinker kort i Safari, mens det tegnes; det gamle står der bare.
  const pool = new Map();
  app.querySelectorAll('img').forEach((img) => { const k = img.getAttribute('src'); (pool.get(k) || pool.set(k, []).get(k)).push(img); });
  app.innerHTML = html;
  if (pool.size) {
    app.querySelectorAll('img').forEach((img) => {
      const old = pool.get(img.getAttribute('src'))?.pop();
      if (old && old.complete) { old.className = img.className; img.replaceWith(old); }
    });
  }
  centerSelectedDay();
  if (before) Motion.after(before, viewKey(r), r.name);
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

let routeSig = location.hash;
function routeChanged() {
  routeSig = location.hash;
  if (sheet) { sheet.remove(); sheet = null; document.body.style.overflow = ''; }
  closePlayer();
  window.scrollTo(0, 0);
  ui.detailTab = 'details';
  ui.lineupSide = 'home';
  lastCenteredDay = null;
  render();
  load();
}
// Tilbage fra "#/match/…" til en adresse helt uden # giver kun popstate i Safari, ikke hashchange.
const onNavigate = () => { if (location.hash !== routeSig) routeChanged(); };
window.addEventListener('hashchange', onNavigate);
window.addEventListener('popstate', onNavigate);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });

// ---------- Visning: Kampe ----------

const SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
const REFRESH_ICON ='<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';

function viewScores() {
  const f = data.football;
  // Tallet på LIVE-knappen er altid dagens live-kampe, også når man kigger på en anden dag.
  const todays = sameDay(ui.day, new Date()) ? f.days : dayCache.get(footballKey(new Date())) || [];
  const liveCount = todays.reduce((n, x) => n + x.events.filter(isLive).length, 0);
  const today = startOfDay(new Date());
  const days = [...Array(15).keys()].map((i) => addDays(today, i - 7));

  let head = `<header class="top">
    <div class="row">
      <h1 class="wordmark">Ren<em>Score</em></h1>
      ${ui.sport === 'football' && !sameDay(ui.day, today) ? `<button class="today-btn" data-action="today">${sameDay(ui.day, addDays(today, -1)) || ui.day < today ? '' : '‹ '}I dag${ui.day < today ? ' ›' : ''}</button>` : ''}
      ${ui.sport === 'football' ? `<button class="live-btn ${ui.liveOnly ? 'on' : ''}" data-action="live"><span class="dot"></span>LIVE${liveCount ? ' ' + liveCount : ''}</button>` : ''}
      <button class="iconbtn" data-action="refresh" aria-label="Opdater">${REFRESH_ICON}</button>
    </div>
    <div class="seg-row"><div class="chips" data-ind="sport">
      <button class="chip ${ui.sport === 'football' ? 'sel' : ''}" data-action="sport" data-v="football">⚽ Fodbold</button>
      <button class="chip ${ui.sport === 'mma' ? 'sel' : ''}" data-action="sport" data-v="mma">🥊 MMA</button>
    </div><button class="iconbtn search-btn" data-action="add-open" aria-label="Søg hold">${SEARCH_ICON}</button></div>`;
  if (ui.sport === 'football') {
    head += `<div class="days" data-ind="days">${days.map((d) => `<button class="day ${sameDay(d, ui.day) ? 'sel' : ''} ${sameDay(d, today) ? 'today' : ''}" data-action="day" data-v="${d.getTime()}" aria-label="${esc(d.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' }))}"><b>${fmt.weekdayShort(d)}</b><span>${d.getDate()}</span></button>`).join('')}</div>`;
  } else {
    head += `<div class="chips" data-ind="ufc">
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
  if (f.loading) return skeleton(3);
  if (f.failed) return emptyBox('📡', 'Ingen forbindelse', `Tryk på ↻ for at prøve igen. (${lastFetchError || 'ukendt fejl'})`);
  if (!days.length) {
    if (!ui.liveOnly) return emptyBox('⚽', 'Ingen kampe', 'Der er ingen kampe i dine ligaer denne dag.');
    // Intet live lige nu: vis resten af dagens kampe i stedet for en tom side.
    const later = f.days.map((x) => ({ ...x, events: x.events.filter((e) => !isDone(e)) })).filter((x) => x.events.length);
    return `<section class="card" data-k="nolive">${emptyBox('⚽', 'Ingen kampe live lige nu', later.length ? 'Her er resten af dagens kampe.' : 'Og der er ikke flere kampe i dag.')}</section>`
      + later.map((x) => leagueCard(x.league.name, x.league.country, x.league.flag, x.events.map((e) => [x.league.id, e]))).join('');
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
    `<div class="mscores ${live ? 'live' : ''}" data-score="${esc(e.id)}">${cs.map((c) => `<div class="${lose(c) && !live ? 'lose' : ''}">${esc(scoreOf(c))}</div>`).join('')}</div>`;
  return `<a class="match${live ? ' is-live' : ''}" href="#/match/${encodeURIComponent(leagueId)}/${encodeURIComponent(e.id)}">
    <div class="mtime"><span>${fmt.time(parseDate(e.date))}</span><span class="${live ? 'live' : ''}">${esc(rowStatus(e))}</span></div>
    <div class="mteams">${teams}${tvLine(e)}</div>${scores}
  </a>`;
}

const TV_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="3.5" width="13" height="9" rx="2"/><path d="M6 1.5l2 2 2-2"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M6.7 5.6l3.6 2.4-3.6 2.4z" fill="currentColor" stroke="none"/></svg>';

function tvLine(e) {
  if (isDone(e)) return '';
  const { tvs, stream } = watchFor(e);
  const parts = [];
  if (tvs.length) parts.push(`<span>${TV_ICON}${tvs.map((c) => esc(c.ch)).join(' · ')}</span>`);
  if (stream.length) parts.push(`<span>${PLAY_ICON}${stream.map(esc).join(' · ')}</span>`);
  return parts.length ? `<div class="tvline">${parts.join('')}</div>` : '';
}

/** Grå pladsholdere i kampkortenes form, mens data hentes. */
function skeleton(cards, rows = 3) {
  const row = '<div class="sep"></div><div class="sk-row"><i class="sk sk-t"></i><div><i class="sk sk-n"></i><i class="sk sk-n s"></i></div></div>';
  return Array.from({ length: cards }, (_, i) => `<section class="card sk-card" data-k="sk${i}"><div class="card-head"><i class="sk sk-f"></i><div><i class="sk sk-h"></i><i class="sk sk-s"></i></div></div>${row.repeat(rows - (i % 2))}</section>`).join('');
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
  if (d.loading) return skeleton(2, 4);
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
    return `<header class="top"><div class="row"><button class="iconbtn" data-action="back">${BACK_ICON}</button><p class="title-center">${esc(league.name)}</p><span style="width:34px"></span></div></header><main>${skeleton(2)}</main>`;
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
      ${c?.team ? `<button class="crest" data-action="team-open" data-id="${esc(c.team.id)}" data-league="${esc(leagueId)}" aria-label="Se ${esc(c.team.displayName)}">${logoImg(fallbackLogo(c), '')}</button>` : `<div class="crest">${logoImg(fallbackLogo(c), '')}</div>`}
      <div>${esc(teamName(c?.team))}</div>
      ${c?.team ? `<button class="star ${isFav(c.team.id) ? 'on' : ''}" data-action="fav" data-id="${esc(c.team.id)}" data-name="${esc(c.team.displayName)}" data-logo="${esc(fallbackLogo(c))}" data-league="${esc(leagueId)}">${isFav(c.team.id) ? '★' : '☆'}</button>` : ''}
    </div>`;
  const mid = st === 'pre'
    ? `<div class="kick">${fmt.time(parseDate(event.date))}</div><div class="stat">${esc(event.date ? fmt.dayLabel(parseDate(event.date)) : '')}</div>`
    : `<div class="score" data-score="head">${esc(scoreOf(home))}<i>-</i>${esc(scoreOf(away))}</div><div class="stat ${st === 'in' ? 'live' : ''}">${esc(matchStatus(event))}</div>`;

  let html = `<header class="top mtop" style="--hc:${colors.h};--ac:${colors.a}"><div class="glow"></div>
    <div class="row"><button class="iconbtn" data-action="back" aria-label="Tilbage">${BACK_ICON}</button><p class="title-center">${esc(league.name)}</p><span style="width:34px"></span></div>
    <div class="mhead">${teamCol(home)}<div class="mid">${mid}</div>${teamCol(away)}</div>
    <div class="utabs" data-ind="utabs" data-ind-style="line">${tabs.map(([t, label]) => `<button class="${ui.detailTab === t ? 'sel' : ''}" data-action="dtab" data-v="${t}">${label}</button>`).join('')}</div>
  </header><main style="--hc:${colors.h};--ac:${colors.a}">`;

  if (ui.detailTab === 'details') {
    const w = st === 'post' ? { tvs: [], stream: [] } : watchFor({ date: event.date, competitions: [{ competitors: cs }] });
    if (w.tvs.length || w.stream.length) {
      html += `<section class="card"><div class="card-head"><span class="flag">📺</span><div><div class="t">Se den på</div><div class="s">Tv og streaming i Danmark</div></div></div>
        ${w.tvs.map((c) => `<div class="sep"></div><div class="tvrow"><b>${esc(c.ch)}</b><span>Tv · ${fmt.time(new Date(c.start))}</span></div>`).join('')}
        ${w.stream.map((s) => `<div class="sep"></div><div class="tvrow"><b>${esc(s)}</b><span>Streaming</span></div>`).join('')}</section>`;
    }
    const extra = formCard(sum, home, away) + h2hCard(sum, home, away, colors);
    if (!sum && data.summary.error && data.summary.key === `${leagueId}:${id}`) {
      html += `<section class="card">${emptyBox('📡', 'Kunne ikke hente kampen', `Prøver igen om lidt. (${data.summary.error})`)}</section>`;
    } else if (!sum) html += skeleton(2); // kampdata er på vej
    else if (timeline.length || !extra) html += detailsTab(timeline, home, st, event);
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
    // Navnene kan trykkes på og åbner spillerkortet.
    const ps = (k.participants || []).filter((p) => p.athlete?.displayName);
    const who = (i) => (ps[i] ? `<button class="pl" data-action="player" data-id="${esc(ps[i].athlete.id || '')}">${esc(ps[i].athlete.displayName)}</button>` : '');
    const isHome = k.team?.id === home?.team?.id;
    let icon = '', p1 = who(0), p2 = '';
    if (kind.t === 'goal') {
      icon = '⚽';
      if (kind.own) p2 = 'Selvmål';
      else if (kind.pen) p2 = 'Straffespark';
      else if (ps[1]) p2 = 'Assist: ' + who(1);
    } else if (kind.t === 'yellow') icon = '<span class="card-y"></span>';
    else if (kind.t === 'red') icon = '<span class="card-r"></span>';
    else if (kind.t === 'sub') {
      icon = '⇄';
      p1 = `<span class="arrow-in">↑</span> ${who(0)}`;
      if (ps[1]) p2 = `<span class="arrow-out">↓</span> ${who(1)}`;
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
    return `<div class="player" data-action="player" data-id="${esc(pid || '')}"><div class="shirt">${playerPic(p, color)}
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
      ${benchSorted.map((p) => `<div class="sep"></div><div class="bp" data-action="player" data-id="${esc(p.athlete?.id || '')}"><span class="j">${playerPic(p, color)}</span><span>${esc(p.athlete?.displayName || '')}</span>
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

/** V, U eller T for holdet i en færdig kamp. */
function resultFor(e, teamId) {
  const cs = e.competitions?.[0]?.competitors || [];
  const me = cs.find((c) => c.team?.id === teamId);
  if (!me) return '?';
  if (me.winner === true) return 'V';
  return cs.some((c) => c.team?.id !== teamId && c.winner === true) ? 'T' : 'U';
}
const formChips = (recent, teamId) => [...recent].reverse().map((e) => { const r = resultFor(e, teamId); return `<b class="${r}">${r}</b>`; }).join('');
const teamHref = (leagueId, id) => `#/team/${encodeURIComponent(leagueId)}/${encodeURIComponent(id)}`;

/** En kamp med dato og turnering over, som i Favoritter og på holdsiden. */
function labeledMatch(title, e, fallbackLeague, cls = '') {
  const lid = e._league || fallbackLeague;
  const lg = leagueById(lid);
  return `<div class="sep"></div><div class="sublabel">${title ? `<b class="${cls}">${title}</b>` : ''}${lg ? `<span>${title ? '· ' : ''}${esc(lg.name)}</span>` : ''}
      ${stateOf(e) === 'pre' ? `<span class="r">${esc(fmt.dayLabel(parseDate(e.date)))}</span>` : ''}</div>${matchRow(e, lid)}`;
}

function favCard(fav) {
  const o = data.fav.overviews[fav.id];
  const league = leagueById(fav.leagueId);
  const form = o ? formChips(o.recent, fav.id) : '';
  let body = '';
  if (o) {
    if (o.live) body += labeledMatch('LIVE', o.live, fav.leagueId, 'live');
    if (o.next && o.next.id !== o.live?.id) body += labeledMatch('NÆSTE KAMP', o.next, fav.leagueId);
    if (o.recent[0]) body += labeledMatch('SENESTE KAMP', o.recent[0], fav.leagueId);
    if (!o.live && !o.next && !o.recent.length) body += '<div class="sep"></div><div class="note">Ingen kampe fundet</div>';
  } else {
    body += '<div class="sep"></div><div class="spinner" style="margin:16px auto"></div>';
  }
  return `<section class="card">
    <div class="favhead"><a class="favlink" href="${teamHref(fav.leagueId, fav.id)}">${logoImg(fav.logo)}<div><div class="nm">${esc(fav.name)}</div><div class="lg">${league ? `${league.flag} ${esc(league.name)}` : ''}</div></div></a>
      <div class="form">${form}</div><button class="more" data-action="fav-remove" data-id="${esc(fav.id)}" aria-label="Fjern">✕</button></div>
    ${body}</section>`;
}

// ---------- Spillerkort ----------

const ATHLETE_API = 'https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes';
const POS_DA = { Goalkeeper: 'Målmand', Defender: 'Forsvarsspiller', Midfielder: 'Midtbanespiller', Forward: 'Angriber' };
const COUNTRY_DA = {
  Denmark: 'Danmark', Sweden: 'Sverige', Norway: 'Norge', Iceland: 'Island', Finland: 'Finland', Germany: 'Tyskland', France: 'Frankrig',
  Spain: 'Spanien', Italy: 'Italien', Netherlands: 'Holland', Belgium: 'Belgien', Brazil: 'Brasilien', Argentina: 'Argentina',
  England: 'England', Scotland: 'Skotland', Wales: 'Wales', 'Northern Ireland': 'Nordirland', 'Republic of Ireland': 'Irland', Ireland: 'Irland',
  Turkey: 'Tyrkiet', 'Türkiye': 'Tyrkiet', Switzerland: 'Schweiz', Austria: 'Østrig', Poland: 'Polen', Croatia: 'Kroatien', Serbia: 'Serbien',
  Greece: 'Grækenland', Morocco: 'Marokko', 'United States': 'USA', Japan: 'Japan', 'South Korea': 'Sydkorea', Uruguay: 'Uruguay',
  Colombia: 'Colombia', Nigeria: 'Nigeria', Ghana: 'Ghana', Senegal: 'Senegal', Egypt: 'Egypten', 'Ivory Coast': 'Elfenbenskysten',
  "Cote d'Ivoire": 'Elfenbenskysten', Cameroon: 'Cameroun', Algeria: 'Algeriet', Ukraine: 'Ukraine', 'Czechia': 'Tjekkiet', 'Czech Republic': 'Tjekkiet',
  Hungary: 'Ungarn', Slovenia: 'Slovenien', Slovakia: 'Slovakiet', Romania: 'Rumænien', Mexico: 'Mexico', Canada: 'Canada', Australia: 'Australien',
};
const RESULT_CLS = { W: 'V', D: 'U', L: 'T' };
const COMP_DA = { 'International Friendly': 'Venskabskampe', 'FIFA World Cup': 'VM', 'FIFA World Cup Qualifying': 'VM-kvalifikation', 'UEFA European Championship': 'EM', 'UEFA European Championship Qualifying': 'EM-kvalifikation', 'Club Friendly': 'Træningskampe' };
/** "2026-27 English Premier League" -> "Premier League". */
const compName = (n) => { const x = n.replace(/^\d{4}(-\d{2})?\s+/, '').replace(/^English /, ''); return COMP_DA[x] || x; };
const athleteCache = new Map(); // id -> { info, overview }
let pcard = null;

/** Omtrentlig spilletid i kampen ud fra udskiftningerne (ESPN giver ikke minutter direkte). */
function minutesPlayed(entry, sum) {
  const status = sum?.header?.competitions?.[0]?.status;
  const state = status?.type?.state;
  if (!entry || state === 'pre') return null;
  const end = state === 'post' ? 90 : Math.min(90, parseInt(status?.displayClock, 10) || 0);
  const pid = entry.athlete?.id;
  const subs = (sum.keyEvents || []).filter((k) => keyKind(k)?.t === 'sub');
  const at = (k) => parseInt(k.clock?.displayValue, 10) || Math.round((k.clock?.value || 0) / 60);
  const cameOn = subs.find((k) => k.participants?.[0]?.athlete?.id === pid);
  const wentOff = subs.find((k) => k.participants?.[1]?.athlete?.id === pid);
  const start = entry.starter ? 0 : cameOn ? at(cameOn) : null;
  if (start == null) return 0;
  return Math.max(0, Math.min(end, wentOff ? at(wentOff) : end) - start);
}

/** Spilleren i den åbne kamp (holdopstillingen), så kortet kan vise noget med det samme. */
function playerInMatch(id) {
  const r = route();
  const sum = r.name === 'match' && data.summary.key === `${r.league}:${r.id}` ? data.summary.value : null;
  if (!sum) return {};
  for (const ros of sum.rosters || []) {
    const entry = (ros.roster || []).find((p) => p.athlete?.id === id);
    if (!entry) continue;
    const cs = sum.header?.competitions?.[0]?.competitors || [];
    const home = cs.find((c) => c.homeAway === 'home'), away = cs.find((c) => c.homeAway === 'away');
    const colors = teamColors(home?.team, away?.team);
    return { sum, entry, team: ros.team, color: ros.team?.id === away?.team?.id ? colors.a : colors.h };
  }
  return { sum };
}

function openPlayer(id) {
  if (!id) return;
  closePlayer();
  pcard = document.createElement('div');
  pcard.className = 'pcard-wrap';
  pcard.dataset.id = id;
  document.body.appendChild(pcard);
  document.body.style.overflow = 'hidden';
  renderPlayer();
  // Træk kortet ned for at lukke det (kun når det er rullet helt op).
  let y0 = null;
  pcard.addEventListener('touchstart', (e) => { const c = pcard?.querySelector('.pcard'); y0 = c && c.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
  pcard.addEventListener('touchend', (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 90) closePlayer(); y0 = null; }, { passive: true });
  if (athleteCache.has(id)) return;
  Promise.all([
    getJSON(`${ATHLETE_API}/${id}`).then((r) => r.athlete).catch(() => null),
    getJSON(`${ATHLETE_API}/${id}/overview`).catch(() => null),
  ]).then(([info, overview]) => {
    athleteCache.set(id, { info, overview, failed: !info && !overview });
    if (pcard?.dataset.id === id) renderPlayer();
  });
}
function closePlayer() {
  if (!pcard) return;
  pcard.remove();
  pcard = null;
  if (!sheet) document.body.style.overflow = '';
}

function renderPlayer() {
  if (!pcard) return;
  const id = pcard.dataset.id;
  const ctx = playerInMatch(id);
  const got = athleteCache.get(id);
  const a = got?.info, ov = got?.overview, e = ctx.entry;
  const name = a?.displayName || e?.athlete?.displayName || '';
  const jersey = a?.jersey || e?.jersey || '';
  const pos = a?.position?.displayName || e?.position?.displayName || '';
  const team = a?.team || ctx.team;
  const color = ctx.color || teamColors(team, null).h;
  const fallbackPic = isKeeper(e || { position: a?.position }) ? jerseySvg(GK_COLOR, jersey) : jerseySvg(color, jersey);
  const photo = a?.headshot?.href || e?.athlete?.headshot?.href || `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png`;
  const cm = /(\d+)' (\d+)"/.exec(a?.displayHeight || '');
  const facts = [
    a?.citizenship ? `${a.flag?.href ? `<img src="${esc(sized(a.flag.href, 40))}" alt="">` : ''}${esc(COUNTRY_DA[a.citizenship] || a.citizenship)}` : '',
    a?.age ? `${a.age} år` : '',
    cm ? `${Math.round((+cm[1] * 12 + +cm[2]) * 2.54)} cm` : '',
  ].filter(Boolean);

  let html = `<div class="pcard-bg" data-action="player-close"></div>
  <div class="pcard" role="dialog" aria-label="${esc(name)}" style="--pc:${color}"><div class="grab"></div>
    <div class="phead"><div class="pphoto">${fallbackPic}<img src="${esc(sized(photo, 220, 160))}" alt="" onerror="this.remove()"></div>
      <div class="pid"><h2>${esc(name)}</h2><div class="pmeta">${jersey ? `#${esc(jersey)} · ` : ''}${esc(POS_DA[pos] || pos)}</div>
        ${team ? `<div class="pclub">${logoImg(logoOf(team))}<span>${esc(team.displayName || team.name || '')}</span></div>` : ''}</div>
      <button class="pclose" data-action="player-close" aria-label="Luk">✕</button></div>
    ${facts.length ? `<div class="pfacts">${facts.map((f) => `<span>${f}</span>`).join('')}</div>` : ''}`;

  // I denne kamp
  if (e) {
    const st = Object.fromEntries((e.stats || []).map((x) => [x.name, x.value]));
    const mins = minutesPlayed(e, ctx.sum);
    const keeper = isKeeper(e);
    const tiles = [
      mins != null ? [mins ? `${mins}'` : '–', e.starter ? 'Start' : mins ? 'Kom ind' : 'Bænk'] : null,
      keeper ? [st.saves ?? 0, 'Redninger'] : [st.totalGoals ?? 0, 'Mål'],
      keeper ? [st.goalsConceded ?? 0, 'Mål imod'] : [st.goalAssists ?? 0, 'Assist'],
      keeper ? null : [`${st.totalShots ?? 0}<small>/${st.shotsOnTarget ?? 0}</small>`, 'Skud/på mål'],
      st.yellowCards || st.redCards ? [st.redCards ? '🟥' : '🟨', st.redCards ? 'Rødt kort' : 'Gult kort'] : null,
    ].filter(Boolean);
    html += `<div class="psec">I denne kamp</div><div class="ptiles">${tiles.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
  }

  if (!got) return void (pcard.innerHTML = html + '<div class="spinner" style="margin:28px auto"></div></div>');

  // Sæsonen pr. turnering
  const s = ov?.statistics;
  if (s?.splits?.length) {
    const col = (n) => s.names.indexOf(n);
    const keeper = (a?.position?.abbreviation || '').startsWith('G');
    const cols = keeper ? [['starts', 'K'], ['cleanSheet', 'Rent'], ['saves', 'Redn.'], ['goalsConceded', 'Imod']]
      : [['starts', 'K'], ['totalGoals', 'Mål'], ['goalAssists', 'Ass.'], ['yellowCards', '🟨']];
    const use = cols.filter(([n]) => col(n) >= 0);
    html += `<div class="psec">Sæsonen</div><table class="table ptable"><thead><tr><th style="text-align:left">Turnering</th>${use.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
      ${s.splits.map((sp) => `<tr><td class="tm">${esc(compName(sp.displayName))}</td>${use.map(([n]) => `<td>${esc(sp.stats[col(n)] ?? '')}</td>`).join('')}</tr>`).join('')}
    </tbody></table><div class="pnote">K = kampe fra start</div>`;
  }

  // Seneste kampe
  const log = ov?.gameLog;
  const rows = log?.statistics?.[0]?.events || [];
  if (rows.length) {
    const names = log.statistics[0].names;
    const v = (r, n) => r.stats[names.indexOf(n)];
    html += `<div class="psec">Seneste kampe</div><div class="plog">${rows.map((r) => {
      const ev = log.events?.[r.eventId];
      if (!ev) return '';
      const slug = /leagueAbbrev=([^&]+)/.exec((ev.links || []).map((l) => l.href).join(' '))?.[1];
      const res = RESULT_CLS[ev.gameResult] || '';
      const g = +v(r, 'totalGoals') || 0, as = +v(r, 'goalAssists') || 0;
      const role = v(r, 'appearances') === 'Started' ? 'Start' : v(r, 'appearances') === 'Sub' ? 'Ind' : '–';
      const inner = `<span class="d">${fmt.dayMonth(parseDate(ev.gameDate))}</span>
        <span class="o">${ev.atVs === '@' ? 'ude' : 'hjem'} ${logoImg(ev.opponent?.logo)}<b>${esc(ev.opponent?.abbreviation || ev.opponent?.displayName || '')}</b></span>
        <span class="r ${res}">${esc(ev.score || '')}</span><span class="ro">${role}</span>
        <span class="ga">${'⚽'.repeat(Math.min(g, 3))}${g > 3 ? '+' : ''}${as ? `<i>A${as > 1 ? as : ''}</i>` : ''}</span>`;
      return slug ? `<a class="lrow" href="#/match/${encodeURIComponent(slug)}/${encodeURIComponent(ev.id)}">${inner}</a>` : `<div class="lrow">${inner}</div>`;
    }).join('')}</div>`;
  }
  if (got.failed) html += `<div class="pnote" style="text-align:center;padding:20px">Kunne ikke hente spillerens data.</div>`;
  else if (!s?.splits?.length && !rows.length) html += `<div class="pnote" style="text-align:center;padding:20px">ESPN har ingen statistik for spilleren.</div>`;
  pcard.innerHTML = html + '</div>';
}

// ---------- Visning: Holdside ----------

const PLACE_RE = /^(\d+)(?:st|nd|rd|th) in /;
function viewTeam(leagueId, id) {
  const t = data.team.key === leagueId + ':' + id ? data.team : {};
  const dir = (data.teams.byLeague?.[leagueId] || []).find((x) => x.id === id);
  const fav = prefs.favorites.find((f) => f.id === id);
  const info = t.info, o = t.o;
  const name = info?.displayName || dir?.name || fav?.name || '';
  const logo = logoOf(info) || dir?.logo || fav?.logo || '';
  const league = leagueById(leagueId);
  const colors = teamColors(info, null);
  const place = PLACE_RE.exec(info?.standingSummary || '');
  const [w, d, l] = (info?.recordSummary || '').split('-');
  const facts = [
    place && league ? `${place[1]}. plads i ${esc(league.name)}` : league ? `${league.flag} ${esc(league.name)}` : '',
    w != null && l != null ? `${w}V · ${d}U · ${l}T` : '',
  ].filter(Boolean);
  const on = isFav(id);
  let html = `<header class="top mtop thero" style="--hc:${colors.h};--ac:${colors.a}"><div class="glow"></div>
    <div class="row"><button class="iconbtn" data-action="back" aria-label="Tilbage">${BACK_ICON}</button><p class="title-center">${league ? esc(league.name) : ''}</p><span style="width:34px"></span></div>
    <div class="thead"><div class="crest">${logoImg(logo, '')}</div><h2>${esc(name)}</h2>
      ${facts.length ? `<div class="facts">${facts.map((f) => `<span>${f}</span>`).join('')}</div>` : ''}
      ${o?.recent?.length ? `<div class="form">${formChips(o.recent, id)}</div>` : ''}
      <button class="follow ${on ? 'on' : ''}" data-action="fav" data-id="${esc(id)}" data-name="${esc(name)}" data-logo="${esc(logo)}" data-league="${esc(leagueId)}">${on ? '★ Følger' : '☆ Følg holdet'}</button></div>
  </header><main style="--hc:${colors.h};--ac:${colors.a}">`;
  if (!o) return html + skeleton(2) + '</main>';
  if (o.live) html += `<section class="card"><div class="card-head"><span class="flag">🔴</span><div><div class="t">Live nu</div></div></div>${labeledMatch('LIVE', o.live, leagueId, 'live')}</section>`;
  const next = o.upcoming.filter((e) => e.id !== o.live?.id);
  if (next.length) html += `<section class="card"><div class="card-head"><span class="flag">📅</span><div><div class="t">Næste kampe</div></div></div>${next.map((e) => labeledMatch('', e, leagueId)).join('')}</section>`;
  if (o.recent.length) html += `<section class="card"><div class="card-head"><span class="flag">🏁</span><div><div class="t">Seneste resultater</div></div></div>${o.recent.map((e) => labeledMatch(fmt.dayMonth(parseDate(e.date)), e, leagueId)).join('')}</section>`;
  if (!o.live && !next.length && !o.recent.length) html += `<section class="card">${emptyBox('📭', 'Ingen kampe fundet', 'ESPN har ingen kampe for holdet lige nu.')}</section>`;
  return html + '</main>';
}

// ---------- Søg hold (ark) ----------

/** Til søgning: små bogstaver uden accenter, så "brondby" finder Brøndby og "besiktas" Beşiktaş. */
const fold = (s) => (s || '').toLowerCase().replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/ı/g, 'i')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** Kælenavne, folk skriver, men som ikke står i ESPN's navne. */
const ALIASES = {
  fck: 'kobenhavn', copenhagen: 'kobenhavn', fcm: 'midtjylland', ob: 'odense', bif: 'brondby', fcn: 'nordsjaelland', sje: 'sonderjyske',
  'man utd': 'manchester united', 'man united': 'manchester united', 'man city': 'manchester city', spurs: 'tottenham',
  barca: 'barcelona', atleti: 'atletico', psg: 'paris saint germain', juve: 'juventus', inter: 'internazionale',
  bvb: 'dortmund', gladbach: 'monchengladbach', gala: 'galatasaray', fener: 'fenerbahce', bjk: 'besiktas',
};

let sheet = null;
async function openAddSheet() {
  ui.query = '';
  sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.innerHTML = `<div class="sh-top"><div class="sh-row"><span class="sp"></span><h2>Søg hold</h2><button class="done" data-action="add-close">Færdig</button></div>
    <input class="search" type="search" placeholder="Fx Brøndby, Arsenal eller FCK" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></div>
    <div class="list"><div class="spinner"></div></div>`;
  document.body.appendChild(sheet);
  document.body.style.overflow = 'hidden';
  const input = sheet.querySelector('.search');
  input.addEventListener('input', (e) => { ui.query = e.target.value; renderSheetList(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  input.focus(); // skal ske med det samme i trykket, ellers åbner iOS ikke tastaturet
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

/** Holdene, der passer til søgningen, bedste først: navnet starter med det, et ord starter med det, det står et sted i navnet. */
function searchTeams(query) {
  const q = fold(query);
  if (!q) return [];
  const terms = [q, ALIASES[q]].filter(Boolean);
  const order = new Map(LEAGUES.map((l, i) => [l.id, i]));
  const hits = [];
  Object.entries(data.teams.byLeague || {}).forEach(([lid, teams]) => teams.forEach((t) => {
    const hay = fold(t.name) + ' | ' + fold(t.short);
    let score = fold(t.abbr) === q ? 0.5 : 9;
    terms.forEach((term, i) => {
      if (i === 1 && (' ' + hay).includes(' ' + term)) score = -1; // kælenavnet ("FCK") vinder over en forkortelse
      else if (hay.startsWith(term)) score = Math.min(score, 0);
      else if ((' ' + hay).includes(' ' + term)) score = Math.min(score, 1);
      else if (hay.includes(term)) score = Math.min(score, 2);
    });
    if (score < 9) hits.push({ t, lid, score });
  }));
  return hits.sort((a, b) => a.score - b.score || (order.get(a.lid) ?? 99) - (order.get(b.lid) ?? 99) || a.t.name.localeCompare(b.t.name, 'da')).slice(0, 40);
}

function teamRow(t, lid, showLeague) {
  const lg = leagueById(lid), on = isFav(t.id);
  return `<div class="trow"><a class="tlink" href="${teamHref(lid, t.id)}">${t.logo ? `<img class="logo" src="${esc(sized(t.logo, 80))}" alt="" loading="lazy" decoding="async">` : '<span class="logo-ph"></span>'}
      <span class="tn"><b>${esc(t.name)}</b>${showLeague && lg ? `<small>${lg.flag} ${esc(lg.name)}</small>` : ''}</span></a>
    <button class="st ${on ? 'on' : ''}" data-action="fav" data-id="${esc(t.id)}" data-name="${esc(t.name)}" data-logo="${esc(t.logo)}" data-league="${lid}" aria-label="${on ? 'Følg ikke' : 'Følg'}">${on ? '★' : '☆'}</button></div>`;
}

function renderSheetList() {
  if (!sheet) return;
  const by = data.teams.byLeague || {};
  let html;
  if (ui.query.trim()) {
    const hits = searchTeams(ui.query);
    html = hits.length ? `<section class="card">${hits.map((h) => teamRow(h.t, h.lid, true)).join('<div class="sep"></div>')}</section>` : '';
  } else {
    // Uden søgning: dine hold øverst, derefter ligaerne du har slået til.
    const mine = prefs.favorites.map((f) => teamRow({ id: f.id, name: f.name, logo: f.logo }, f.leagueId, true));
    html = (mine.length ? `<div class="group-title">Hold du følger</div><section class="card">${mine.join('<div class="sep"></div>')}</section>` : '')
      + LEAGUES.filter((l) => by[l.id] && prefs.enabled.has(l.id)).map((l) => `<div class="group-title">${l.flag} ${esc(l.name)}</div><section class="card">${
        [...by[l.id]].sort((a, b) => a.name.localeCompare(b.name, 'da')).map((t) => teamRow(t, l.id, false)).join('<div class="sep"></div>')}</section>`).join('');
  }
  sheet.querySelector('.list').innerHTML = html || (data.teams.byLeague ? emptyBox('🔍', 'Ingen hold fundet', 'Prøv et andet navn.') : emptyBox('📡', 'Ingen forbindelse', 'Luk og prøv igen.'));
}

// ---------- Visning: Indstillinger ----------

function viewSettings() {
  const countries = [...new Set(LEAGUES.map((l) => l.country))];
  let html = '<header class="top"><div class="row"><h1>Indstillinger</h1></div></header><main>';
  const dark = darkMode?.matches;
  html += `<div class="group-title">Farver</div><section class="card"><div class="palettes">${PALETTES.map((p) => {
    const [bg, accent] = dark ? p.dark : p.light;
    return `<button class="pal ${prefs.palette === p.id ? 'sel' : ''}" data-action="palette" data-v="${p.id}" style="--pal-bg:${bg};--pal-accent:${accent}"><i></i>${esc(p.name)}</button>`;
  }).join('')}</div></section>`;
  html += countries.map((c) => `<div class="group-title">${esc(c)}</div><section class="card">${LEAGUES.filter((l) => l.country === c).map((l) => `
    <button class="toggle-row" style="width:100%;text-align:left" data-action="league" data-id="${l.id}"><span>${l.flag}</span><span>${esc(l.name)}</span>
      <span class="sw ${prefs.enabled.has(l.id) ? 'on' : ''}"></span></button>`).join('<div class="sep"></div>')}</section>`).join('');
  html += `<div class="group-title">Mine hold</div><section class="card">${prefs.favorites.length
    ? `<button class="danger" data-action="fav-clear">Fjern alle fulgte hold (${prefs.favorites.length})</button>`
    : '<div class="note">Tilføj hold under Favoritter, eller tryk på stjernen inde i en kamp.</div>'}</section>`;
  html += '<section class="card"><div class="note">Ingen reklamer, ingen notifikationer, ingen konto. Data fra ESPN. Dine valg gemmes kun på denne telefon.</div></section>';
  html += `<div class="group-title">Fejlfinding</div><section class="card"><button class="toggle-row" style="width:100%;text-align:left" data-action="debug"><span>🔧</span><span>Vis fejlfinding på skærmen</span><span class="sw ${Debug.on ? 'on' : ''}"></span></button></section>`;
  html += `<p class="note" style="text-align:center">RenScore version ${APP_VERSION}</p>`;
  return html + '</main>';
}

// ---------- Klik ----------

const actions = {
  sport(el) { Motion.hint = { dir: el.dataset.v === 'mma' ? 1 : -1 }; ui.sport = el.dataset.v; render(); load(); },
  today() { goToday(); },
  debug() { Debug.set(!Debug.on); storage.set('debug', Debug.on); render(); },
  palette(el) { prefs.palette = el.dataset.v; storage.set('palette', prefs.palette); applyPalette(prefs.palette); render(); },
  live() {
    ui.liveOnly = !ui.liveOnly;
    // Live betyder "lige nu", uanset hvilken dag man stod på.
    if (ui.liveOnly && !sameDay(ui.day, new Date())) { Motion.hint = { dir: 1 }; ui.day = startOfDay(new Date()); load(); }
    render();
  },
  refresh() { load(); },
  day(el) { const d = new Date(Number(el.dataset.v)); Motion.hint = { dir: Math.sign(d - ui.day) }; window.scrollTo(0, 0); setDay(d); render(); load(); },
  ufc(el) { Motion.hint = { dir: el.dataset.v === 'latest' ? 1 : -1 }; ui.ufcMode = el.dataset.v; render(); load(); },
  back() {
    const from = location.hash;
    if (history.length > 1) history.back(); else location.hash = '#/';
    // Sikkerhedsnet: er vi der stadig lidt efter (fx åbnet direkte på en kamp), så gå til listen.
    setTimeout(() => { if (location.hash === from) location.replace('#/'); }, 400);
  },
  dtab(el) {
    const tabs = [...app.querySelectorAll('.utabs [data-v]')].map((b) => b.dataset.v);
    Motion.hint = { dir: Math.sign(tabs.indexOf(el.dataset.v) - tabs.indexOf(ui.detailTab)) };
    ui.detailTab = el.dataset.v;
    render();
  },
  side(el) { ui.lineupSide = el.dataset.v; render(); },
  fav(el) {
    toggleFav({ id: el.dataset.id, name: el.dataset.name, logo: el.dataset.logo }, el.dataset.league);
    if (sheet) renderSheetList(); else render();
  },
  'fav-remove'(el) { prefs.favorites = prefs.favorites.filter((f) => f.id !== el.dataset.id); saveFavorites(); render(); },
  'fav-clear'() { prefs.favorites = []; saveFavorites(); render(); },
  'add-open'() { openAddSheet(); },
  player(el) { openPlayer(el.dataset.id); },
  'player-close'() { closePlayer(); },
  async 'team-open'(el) {
    // Fra en Champions League-kamp: vis holdet med dets hjemlige liga (stilling, pokaler).
    let lid = el.dataset.league;
    if (!isDomestic(lid)) {
      await loadTeamDirectory();
      lid = Object.keys(data.teams.byLeague || {}).find((k) => data.teams.byLeague[k].some((t) => t.id === el.dataset.id)) || lid;
    }
    location.hash = teamHref(lid, el.dataset.id);
  },
  'add-close'() { closeAddSheet(); },
  league(el) {
    const id = el.dataset.id;
    if (prefs.enabled.has(id)) prefs.enabled.delete(id); else prefs.enabled.add(id);
    saveEnabled();
    render();
  },
};

// Tryk på den fane, man allerede står på: til toppen (og på Kampe: til i dag), som i iOS-apps.
document.getElementById('tabbar').addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a || a.getAttribute('href') !== (location.hash || '#/')) return;
  e.preventDefault();
  if (a.dataset.tab === 'scores') goToday();
  else window.scrollTo({ top: 0, behavior: 'smooth' });
});

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
  if (r.name === 'team') return dir === -1 ? { run: actions.back, slide: false } : null;
  if (r.name === 'match') {
    if (edge && dir === -1) return { run: actions.back, slide: false };
    const tabs = [...app.querySelectorAll('.utabs [data-v]')].map((b) => b.dataset.v);
    const i = tabs.indexOf(ui.detailTab) + dir;
    if (i < 0) return { run: actions.back, slide: false }; // højre på første fane = tilbage til listen
    if (i >= tabs.length) return null;
    return { run: () => { window.scrollTo(0, 0); ui.detailTab = tabs[i]; render(); } };
  }
  if (r.name === 'scores' && ui.sport === 'football') {
    const day = addDays(ui.day, dir);
    if (Math.abs(Math.round((day - startOfDay(new Date())) / 864e5)) > 7) return null;
    return { run: () => { window.scrollTo(0, 0); setDay(day); render(); load(); } };
  }
  if (r.name === 'scores') {
    const modes = ['next', 'latest'], i = modes.indexOf(ui.ufcMode) + dir;
    return modes[i] ? { run: () => { window.scrollTo(0, 0); ui.ufcMode = modes[i]; render(); load(); } } : null;
  }
  const i = MAIN_TABS.indexOf(r.name === 'fav' ? '#/fav' : '#/settings') + dir;
  if (!MAIN_TABS[i]) return null;
  return { run: () => { history.pushState(null, '', MAIN_TABS[i]); routeChanged(); } };
}

// Træk-for-at-opdatere giver kun mening i hjemmeskærms-appen; i Safari har browseren sin egen.
const standalone = navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches || /[?&]ptr\b/.test(location.search);

let swipe = null;

/** Den markør, der hører til det, man swiper mellem. */
function swipeIndicator() {
  const r = route();
  if (r.name === 'match') return 'utabs';
  if (r.name === 'scores') return ui.sport === 'football' ? 'days' : 'ufc';
  return 'tabbar';
}

app.addEventListener('touchstart', (e) => {
  swipe = null;
  if (sheet || e.touches.length !== 1) return;
  const t = e.touches[0];
  // Vandrette lister (dage, faner) scroller selv; i Safari er kanten Safaris egen "tilbage".
  if (e.target.closest('.days, .utabs, .chips, .sidepick, input')) return;
  const edge = t.clientX < 24;
  if (edge && !navigator.standalone) return;
  const main = Motion.grab();
  Debug.log('finger ned');
  if (main) swipe = { x: t.clientX, y: t.clientY, t: Date.now(), start: performance.now(), edge, main, lock: null, dx: 0, dy: 0, top: window.scrollY <= 0 };
}, { passive: true });

app.addEventListener('touchmove', (e) => {
  if (!swipe) return;
  const t = e.touches[0], dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  if (!swipe.lock) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy) * 1.2) {
      swipe.lock = 'x';
      swipe.next = { 1: swipeAction(1, swipe.edge), '-1': swipeAction(-1, swipe.edge) };
      swipe.main = app.querySelector('main') || swipe.main; // kan være tegnet om siden fingeren landede
    } else if (dy > 0 && swipe.top && standalone && route().name !== 'settings') {
      swipe.lock = 'pull';
    } else { swipe = null; return; } // almindelig lodret scroll
  }
  e.preventDefault();
  // Fingerens fart (px/ms), så siden kan fortsætte med samme fart, når man slipper.
  const now = performance.now();
  if (swipe.lastT) swipe.vx = 0.7 * ((dx - swipe.dx) / Math.max(1, now - swipe.lastT)) + 0.3 * (swipe.vx || 0);
  swipe.lastT = now;
  swipe.dx = dx;
  swipe.dy = dy;
  if (swipe.lock === 'x') Motion.drag(swipe.main, dx, !!swipe.next[dx < 0 ? 1 : -1], swipeIndicator());
  else swipe.ready = Motion.pull(swipe.main, Math.max(0, dy));
}, { passive: false });

function endSwipe(e) {
  const s = swipe;
  swipe = null;
  Debug.log(`finger op${e?.type === 'touchcancel' ? ' (afbrudt af iOS)' : ''}${s?.lock ? ' lås=' + s.lock + ' dx=' + Math.round(s.dx) : ''}`);
  if (!s?.lock) return;
  if (s.lock === 'pull') { Motion.release(s.main, s.ready, () => load()); return; }
  const flush = () => { if (renderPending) render(); };
  const dir = s.dx < 0 ? 1 : -1;
  const fast = Math.abs(s.dx) > 35 && (Date.now() - s.t < 280 || Math.abs(s.vx || 0) > 0.5);
  // Kastede man fingeren tilbage mod udgangspunktet lige før slip, bliver man, hvor man er.
  const flungBack = Math.abs(s.vx || 0) > 0.3 && Math.sign(s.vx) !== Math.sign(s.dx);
  const act = !flungBack && (Math.abs(s.dx) > 70 || fast) ? s.next[dir] : null;
  if (!act) { Motion.settle(s.main); flush(); return; }
  Motion.commit(s.main, dir, act.run, act.slide !== false, s.vx);
  flush();
}
document.addEventListener('touchend', endSwipe, true);
document.addEventListener('touchcancel', endSwipe, true);

// ---------- Fejl vises på skærmen (så et skærmbillede afslører årsagen) ----------

function showError(msg) {
  let el = document.getElementById('errbar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'errbar';
    el.addEventListener('click', () => el.remove());
    document.body.appendChild(el);
  }
  el.textContent = `Fejl (v${APP_VERSION}): ${msg}`.slice(0, 220);
  clearTimeout(showError.t);
  showError.t = setTimeout(() => el.remove(), 12000);
}
window.addEventListener('error', (e) => showError(`${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => { if (e.reason?.name !== 'AbortError') showError(String(e.reason?.stack || e.reason).split('\n')[0]); });

// ---------- Start ----------

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // Når en ny version er hentet, genindlæses siden én gang, så man får den med det samme.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update();
    // Også når man vender tilbage til appen (den lukkes sjældent helt på en iPhone): se efter en ny version.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
render();
load();
