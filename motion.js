// RenScore – bevægelse (GSAP).
//
// app.js tegner hele skærmen forfra ved hver opdatering (også hvert 30. sekund under live-kampe).
// Derfor tager Motion et "før"-billede inden hver tegning og animerer bagefter kun det, der er
// nyt eller ændret: et nyt skærmbillede, en ny dag/fane, en liga der lige er hentet, et mål.
// Uden GSAP, eller med "Reducer bevægelse" slået til, vises alt bare uden animation.

const Motion = (() => {
  const gsap = window.gsap;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const on = () => !!gsap && !reduce?.matches;

  let lastKey = null;
  let lastRoute = null;
  let hint = null; // { dir, fromSwipe } sat af app.js lige før en tegning

  // Sider i rækkefølge, så vi ved om man går "ind" (kampside) eller til siden (faner).
  const DEPTH = { scores: 0, fav: 0, settings: 0, match: 1 };
  const TAB_ORDER = { scores: 0, fav: 1, settings: 2 };

  // Ting der "dukker op" og hvordan de animeres. key() skal være stabil mellem tegninger.
  const GROUPS = {
    block: { sel: 'main > *', key: (el, i) => el.dataset.k || el.querySelector('.card-head .t')?.textContent || `${el.className}#${i}` },
    crest: { sel: '.mhead .crest', key: (el, i) => i },
    bar: { sel: '.srow .bars i', key: (el, i) => i },
    pill: { sel: '.fg b', key: (el, i) => i },
    h2h: { sel: '.h2hbar i', key: (el, i) => i },
    player: { sel: '.pitch .player', key: (el, i) => i },
  };

  const keysOf = (g) => new Set([...document.querySelectorAll(g.sel)].map(g.key));

  /** Markøren (pillen/stregen) bag det valgte element i en række. */
  function indRect(box) {
    const sel = box.querySelector(':scope > .sel');
    if (!sel) return null;
    return { x: sel.offsetLeft, y: sel.offsetTop, w: sel.offsetWidth, h: sel.offsetHeight };
  }

  function snapshot() {
    const s = { groups: {}, ind: {}, scores: {}, daysScroll: null };
    for (const [name, g] of Object.entries(GROUPS)) s.groups[name] = keysOf(g);
    document.querySelectorAll('[data-ind]').forEach((box) => {
      const ind = box.querySelector(':scope > .ind');
      // Brug markørens faktiske position (den kan være midt i en animation eller et swipe).
      s.ind[box.dataset.ind] = ind && ind._placed
        ? { x: gsap ? gsap.getProperty(ind, 'x') : 0, w: ind.offsetWidth, y: ind.offsetTop, h: ind.offsetHeight }
        : indRect(box);
    });
    document.querySelectorAll('[data-score]').forEach((el) => { s.scores[el.dataset.score] = el.textContent.replace(/\s+/g, ' ').trim(); });
    const strip = document.querySelector('.days');
    if (strip) s.daysScroll = strip.scrollLeft;
    return s;
  }

  /** Lægger markører på plads og lader dem glide fra deres gamle position. */
  function placeIndicators(before, animate) {
    document.querySelectorAll('[data-ind]').forEach((box) => {
      box.classList.add('ind-on');
      let ind = box.querySelector(':scope > .ind');
      if (!ind) { ind = document.createElement('span'); ind.className = 'ind'; box.prepend(ind); }
      const to = indRect(box);
      if (!to) { ind.style.opacity = '0'; return; }
      ind.style.opacity = '';
      const from = before.ind[box.dataset.ind];
      const isLine = box.dataset.indStyle === 'line';
      const target = { x: to.x, width: to.w };
      if (!isLine) Object.assign(target, { y: to.y, height: to.h });
      if (!on()) { Object.assign(ind.style, { transform: `translate(${to.x}px, ${isLine ? 0 : to.y}px)`, width: to.w + 'px', height: isLine ? '' : to.h + 'px' }); ind._placed = true; return; }
      gsap.killTweensOf(ind);
      if (animate && from && (from.x !== to.x || from.w !== to.w)) {
        gsap.fromTo(ind, { x: from.x, width: from.w, ...(isLine ? {} : { y: to.y, height: to.h }) },
          { ...target, duration: 0.25, ease: 'power2.out' });
      } else {
        gsap.set(ind, target);
      }
      ind._placed = true;
    });
  }

  /** Animerer det, der er nyt siden før-billedet. */
  function appear(before, all, blocksToo = true) {
    const fresh = {};
    for (const [name, g] of Object.entries(GROUPS)) {
      const old = all ? new Set() : before.groups[name];
      fresh[name] = [...document.querySelectorAll(g.sel)].filter((el, i) => !old.has(g.key(el, i)));
    }
    const inView = (el) => el.getBoundingClientRect().top < window.innerHeight + 40;

    const blocks = blocksToo ? fresh.block.filter(inView) : [];
    if (blocks.length) {
      gsap.fromTo(blocks, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out', stagger: 0.03, clearProps: 'opacity' });
    }
    if (fresh.crest.length) {
      gsap.fromTo(fresh.crest, { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out', stagger: 0.05, clearProps: 'transform,opacity' });
    }
    if (fresh.bar.length) {
      // Hjemmeholdets bjælke vokser fra midten mod venstre, udeholdets mod højre.
      fresh.bar.forEach((el) => { el.style.transformOrigin = el.parentElement.classList.contains('h') ? 'right center' : 'left center'; });
      gsap.fromTo(fresh.bar, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power3.out', stagger: 0.03, delay: 0.1, clearProps: 'transform' });
    }
    if (fresh.pill.length) {
      gsap.fromTo(fresh.pill, { scale: 0.3, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.035, delay: 0.15, clearProps: 'transform,opacity' });
    }
    if (fresh.h2h.length) {
      fresh.h2h.forEach((el) => { el.style.transformOrigin = 'left center'; });
      gsap.fromTo(fresh.h2h, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power2.out', stagger: 0.12, delay: 0.2, clearProps: 'transform' });
    }
    if (fresh.player.length) {
      // Fra målmanden og frem, række for række.
      gsap.fromTo([...fresh.player].reverse(), { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: 0.015, clearProps: 'opacity' });
    }
  }

  /** Mål! Tallet hopper, og rækken lyser kort op. */
  function goals(before) {
    document.querySelectorAll('[data-score]').forEach((el) => {
      const was = before.scores[el.dataset.score];
      const now = el.textContent.replace(/\s+/g, ' ').trim();
      if (was === undefined || was === now) return;
      const row = el.closest('.match, .mhead') || el;
      gsap.fromTo(el, { scale: 1.7 }, { scale: 1, duration: 1.1, ease: 'elastic.out(1, 0.35)', clearProps: 'transform' });
      const flash = document.createElement('span');
      flash.className = 'goal-flash';
      flash.textContent = 'MÅL';
      row.appendChild(flash);
      gsap.timeline({ onComplete: () => flash.remove() })
        .fromTo(flash, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' })
        .to(flash, { opacity: 0, duration: 0.6, delay: 2.2 });
    });
  }

  function slidePage(dir) {
    const main = document.querySelector('#app main');
    const head = document.querySelector('#app > header');
    if (main) gsap.fromTo(main, { x: dir * 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.24, ease: 'power2.out', clearProps: 'transform,opacity' });
    // Toppen (Fodbold/MMA, dage, faner) står stille; kun kamphovedet på en kampside glider let ind.
    const mhead = head?.querySelector('.mhead');
    if (mhead) gsap.fromTo(mhead, { opacity: 0 }, { opacity: 1, duration: 0.24, ease: 'power1.out', clearProps: 'opacity' });
  }

  /** Kaldes efter hver tegning. key beskriver "hvad man kigger på" (side, dag, fane …). */
  function after(before, key, routeName) {
    const strip = document.querySelector('.days');
    const keyChanged = key !== lastKey;
    const routeChanged = routeName !== lastRoute;
    const h = hint;
    hint = null;

    placeIndicators(before, keyChanged);

    // Dagsrækken: bevar brugerens scroll ved opdateringer; glid til den nye dag ved dagsskift.
    if (strip && before.daysScroll != null) {
      const target = strip.scrollLeft;
      if (!keyChanged || routeChanged) strip.scrollLeft = before.daysScroll;
      else if (on()) { strip.scrollLeft = before.daysScroll; gsap.to(strip, { scrollLeft: target, duration: 0.25, ease: 'power2.out' }); }
    }

    if (on()) {
      if (routeChanged && lastRoute != null) {
        const d = (DEPTH[routeName] ?? 0) - (DEPTH[lastRoute] ?? 0);
        const dir = d !== 0 ? Math.sign(d) : Math.sign((TAB_ORDER[routeName] ?? 0) - (TAB_ORDER[lastRoute] ?? 0)) || 1;
        if (!h?.fromSwipe) slidePage(dir);
        appear(before, true, false);
        bounceTab();
      } else if (keyChanged) {
        if (h?.dir && !h.fromSwipe) {
          const main = document.querySelector('#app main');
          if (main) gsap.fromTo(main, { x: h.dir * 16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.2, ease: 'power2.out', clearProps: 'transform,opacity' });
        }
        appear(before, true, !h?.dir);
      } else {
        appear(before, false);
        goals(before);
      }
    }
    lastKey = key;
    lastRoute = routeName;
  }

  function bounceTab() {
    const icon = document.querySelector('#tabbar a.sel svg');
    if (icon) gsap.fromTo(icon, { scale: 0.7 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.4)', clearProps: 'transform' });
  }

  // ---------- Swipe-hjælp ----------

  /** Fingeren rører skærmen: stop alt, der stadig glider, så det følger fingeren fra første øjeblik. */
  function grab(main, indKey) {
    if (!gsap) return;
    gsap.killTweensOf(main);
    gsap.killTweensOf(main.querySelectorAll('*'));
    gsap.set(main.querySelectorAll('main > *'), { clearProps: 'transform,opacity' });
    document.querySelectorAll(`[data-ind="${indKey}"] > .ind`).forEach((ind) => gsap.killTweensOf(ind));
  }

  /** Mens man swiper: indholdet følger fingeren, og markøren glider mod nabo-dagen/-fanen. */
  function drag(main, dx, canGo, indKey) {
    const pull = canGo ? dx * 0.65 : dx * 0.14; // modstand, når der ikke er mere den vej
    const fade = 1 - Math.min(Math.abs(pull) / 520, 0.35);
    if (on()) gsap.set(main, { x: pull, opacity: fade });
    else { main.style.transform = `translateX(${pull}px)`; main.style.opacity = fade; }
    if (!canGo) return;
    const progress = Math.min(Math.abs(dx) / (window.innerWidth * 0.6), 1);
    const dir = dx < 0 ? 1 : -1;
    document.querySelectorAll(`[data-ind="${indKey}"]`).forEach((box) => {
      const ind = box.querySelector(':scope > .ind');
      const sel = box.querySelector(':scope > .sel');
      const sibs = [...box.querySelectorAll(':scope > :not(.ind)')];
      const next = sibs[sibs.indexOf(sel) + dir];
      if (!ind || !sel || !next || !on()) return;
      gsap.set(ind, { x: sel.offsetLeft + (next.offsetLeft - sel.offsetLeft) * progress, width: sel.offsetWidth + (next.offsetWidth - sel.offsetWidth) * progress });
    });
  }

  /** Slip uden at skifte: alt fjedrer tilbage. */
  function settle(main) {
    if (!on()) { main.style.transform = ''; main.style.opacity = ''; return; }
    gsap.to(main, { x: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)', clearProps: 'transform,opacity' });
    document.querySelectorAll('[data-ind]').forEach((box) => {
      const ind = box.querySelector(':scope > .ind'), r = indRect(box);
      if (ind && r) gsap.to(ind, { x: r.x, width: r.w, duration: 0.4, ease: 'power3.out' });
    });
  }

  /** Slip og skift: en kopi af det gamle glider ud, mens det nye glider ind – på samme tid. */
  function commit(main, dir, run, slideIn = true) {
    if (!on()) { run(); return; }
    const r = main.getBoundingClientRect();
    const ghost = main.cloneNode(true);
    // Kun det, der kan ses, skal med (en dag kan have 60+ kampe).
    [...main.children].forEach((child, i) => { if (child.getBoundingClientRect().top > window.innerHeight) ghost.children[i]?.remove(); });
    Object.assign(ghost.style, {
      position: 'fixed', top: r.top + 'px', left: r.left + 'px', width: r.width + 'px',
      height: Math.max(0, window.innerHeight - r.top) + 'px', overflow: 'hidden', margin: '0', zIndex: '5', pointerEvents: 'none',
    });
    gsap.set(ghost, { x: gsap.getProperty(main, 'x'), opacity: gsap.getProperty(main, 'opacity') });
    document.body.appendChild(ghost);
    gsap.set(main, { opacity: 0 });
    // Går man tilbage, tegnes den nye side først lidt senere (popstate); så glider den ind som en almindelig side.
    hint = slideIn ? { dir, fromSwipe: true } : { dir };
    run();
    gsap.to(ghost, { x: gsap.getProperty(ghost, 'x') - dir * 40, opacity: 0, duration: 0.16, ease: 'power1.out', onComplete: () => ghost.remove() });
    const next = document.querySelector('#app main');
    if (!next || next === main || !slideIn) return;
    gsap.fromTo(next, { x: dir * 24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.22, delay: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' });
  }

  // ---------- Træk for at opdatere ----------

  const BALL = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 7.2l3.6 2.6-1.4 4.2H9.8L8.4 9.8z"/><path d="M12 2v5.2M15.6 9.8l5.6-1.6M14.2 14l3.4 4.6M9.8 14l-3.4 4.6M8.4 9.8L2.8 8.2"/></svg>';
  let ptrEl = null;
  function ptrBall() {
    if (!ptrEl) {
      ptrEl = document.createElement('div');
      ptrEl.className = 'ptr';
      ptrEl.innerHTML = BALL;
      document.body.appendChild(ptrEl);
    }
    const head = document.querySelector('#app > header');
    ptrEl.style.top = (head ? head.getBoundingClientRect().bottom : 0) + 'px';
    return ptrEl;
  }
  function pull(main, dy) {
    const d = Math.min(dy * 0.5, 110);
    const ball = ptrBall();
    if (on()) {
      gsap.set(main, { y: d });
      gsap.set(ball, { y: d * 0.55 - 10, opacity: Math.min(d / 50, 1), rotation: d * 4, scale: 0.6 + Math.min(d / 60, 1) * 0.4 });
    }
    ball.classList.toggle('ready', d >= 60);
    return d >= 60;
  }
  async function release(main, ready, refresh) {
    const ball = ptrBall();
    if (!on()) { if (ready) await refresh(); return; }
    if (!ready) {
      gsap.to(main, { y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'transform' });
      gsap.to(ball, { y: -10, opacity: 0, duration: 0.25 });
      return;
    }
    gsap.to(main, { y: 56, duration: 0.25, ease: 'power2.out' });
    gsap.to(ball, { y: 18, scale: 1, duration: 0.25 });
    const spin = gsap.to(ball, { rotation: '+=360', duration: 0.7, ease: 'none', repeat: -1 });
    const started = Date.now();
    try { await refresh(); } catch { /* vises som fejl i listen */ }
    await new Promise((r) => setTimeout(r, Math.max(0, 600 - (Date.now() - started))));
    spin.kill();
    gsap.to(ball, { scale: 0, opacity: 0, duration: 0.25, ease: 'back.in(2)' });
    const m = document.querySelector('#app main');
    if (m) gsap.fromTo(m, { y: 56 }, { y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform' });
    ball.classList.remove('ready');
  }

  // Lille "tryk"-fornemmelse på knapper og kampe.
  if (gsap) {
    document.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.chip, .day, .iconbtn, .live-btn, .today-btn, .pill, .btn, .sidepick button, .star, .tabbar a');
      if (el && on()) gsap.to(el, { scale: 0.92, duration: 0.12, ease: 'power2.out' });
    }, { passive: true });
    const up = () => document.querySelectorAll('.chip, .day, .iconbtn, .live-btn, .today-btn, .pill, .btn, .sidepick button, .star, .tabbar a')
      .forEach((el) => { if (gsap.getProperty(el, 'scale') !== 1) gsap.to(el, { scale: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.5)', clearProps: 'transform' }); });
    document.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('pointercancel', up, { passive: true });
  }

  return {
    snapshot, after, grab, drag, settle, commit, pull, release,
    set hint(v) { hint = v; },
    get enabled() { return on(); },
  };
})();
