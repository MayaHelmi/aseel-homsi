(function () {
  const content = window.SITE_CONTENT;
  const root = document.documentElement;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORAGE_LANG = 'aseel-lang';
  const STORAGE_INTRO = 'aseel-intro';
  const DEFAULT_LANG = 'ar';
  const DIR = { ar: 'rtl', en: 'ltr' };
  const other = (lang) => (lang === 'ar' ? 'en' : 'ar');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.getElementById('intro');
  const playsIntro = root.classList.contains('has-intro') && !reduceMotion && intro;

  // main.js is running: switch off the CSS failsafe that hides the intro if this script never loads
  const hero = document.querySelector('.hero');
  if (playsIntro) intro.classList.add('is-running');
  // The hero holds its first frame until it plays, so it never shows finished and then replays
  if (!reduceMotion) hero.classList.add('hero-wait');
  // Hero animations start here: as the intro opens, or straight away on later visits
  const playHero = () => { hero.classList.remove('hero-wait'); hero.classList.add('hero-play'); };

  // Design tokens (read from CSS so nothing is duplicated here)
  const css = getComputedStyle(root);
  const token = (name) => css.getPropertyValue(name).trim();
  const num = (name) => parseFloat(token(name));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const store = {
    get(area, key) { try { return window[area].getItem(key); } catch (e) { return null; } },
    set(area, key, value) { try { window[area].setItem(key, value); } catch (e) { /* storage unavailable */ } }
  };

  let currentLang = DEFAULT_LANG;

  /* ---------- 06 · Words rise ---------- */
  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function wrapWords(el) {
    if (el.dataset.played) return;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((w, i) => `<span class="w"><span style="--i:${i}">${escapeHtml(w)}</span></span>`)
      .join(' ');
  }

  /* ---------- 01 · Headline as drawn calligraphy ---------- */
  // The HTML headline stays visible until the SVG version is built, so nothing is ever hidden.
  function buildHeadline(lang, writing) {
    const h1 = document.querySelector('[data-headline]');
    if (!h1) return;
    const t = content[lang];
    const lines = t['hero.title'].split('<br>');
    const size = num('--write-font-size');
    const lineHeight = num('--write-line-height');

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    lines.forEach((line, i) => {
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', '0');
      text.setAttribute('y', String(i * size * lineHeight));
      text.setAttribute('direction', DIR[lang]);
      text.setAttribute('text-anchor', 'start');
      text.style.setProperty('--line', i);
      text.textContent = line;
      svg.appendChild(text);
    });

    h1.setAttribute('aria-label', t['hero.titlePlain']);
    h1.replaceChildren(svg);

    // Keep the headline on the reading side when its height is capped to fit the screen
    svg.setAttribute('preserveAspectRatio', lang === 'ar' ? 'xMaxYMid meet' : 'xMinYMid meet');

    // Trim the box to the letters themselves: calligraphy fonts carry a lot of empty space above the glyphs
    const box = svg.getBBox();
    const pad = num('--write-stroke') * 4;
    let top = box.y;
    let bottom = box.y + box.height;
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx && 'actualBoundingBoxAscent' in ctx.measureText('')) {
      const texts = [...svg.querySelectorAll('text')];
      const style = getComputedStyle(texts[0]);
      ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
      top = Infinity;
      bottom = -Infinity;
      texts.forEach((text) => {
        const m = ctx.measureText(text.textContent);
        const baseline = parseFloat(text.getAttribute('y'));
        top = Math.min(top, baseline - m.actualBoundingBoxAscent);
        bottom = Math.max(bottom, baseline + m.actualBoundingBoxDescent);
      });
    }
    svg.setAttribute('viewBox', `${box.x - pad} ${top - pad} ${box.width + pad * 2} ${bottom - top + pad * 2}`);
    svg.classList.toggle('is-writing', Boolean(writing));
  }

  /* ---------- Language ---------- */
  function applyLang(lang) {
    const t = content[lang];
    const alt = content[other(lang)];
    root.lang = lang;
    root.dir = DIR[lang];
    document.title = t['meta.title'];
    document.querySelector('meta[name="description"]').setAttribute('content', t['meta.description']);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      if (el.hasAttribute('data-headline') && el.querySelector('svg')) return;
      el.innerHTML = t[el.dataset.i18n];
      if (el.classList.contains('rise')) wrapWords(el);
    });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      el.textContent = alt[el.dataset.i18nAlt];
      el.lang = other(lang);
      el.dir = DIR[other(lang)];
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':');
        el.setAttribute(attr, t[key]);
      });
    });
    document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });

    currentLang = lang;
    store.set('localStorage', STORAGE_LANG, lang);
  }

  /* ---------- 11 · Language switch that reads ---------- */
  function inView(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.width > 0;
  }

  let switching = false;
  async function switchLang(to) {
    if (to === currentLang || switching) return;
    switching = true;
    const from = currentLang;
    const shift = num('--lang-shift');
    const blur = token('--lang-blur');
    const stagger = num('--motion-lang-stagger');
    const selector = '[data-i18n], [data-i18n-alt], [data-headline]';
    const visible = () => [...document.querySelectorAll(selector)].filter((el) => !el.closest('.lang-switch') && inView(el));

    if (!reduceMotion) {
      const outX = from === 'ar' ? -shift : shift; // leave in the old reading direction
      await Promise.all(visible().map((el, i) => el.animate(
        [{ transform: 'none', opacity: 1, filter: 'blur(0)' }, { transform: `translateX(${outX}px)`, opacity: 0, filter: `blur(${blur})` }],
        { duration: num('--motion-lang-out'), delay: i * stagger, easing: token('--ease-swap-out'), fill: 'forwards' }
      ).finished));
    }

    applyLang(to);
    buildHeadline(to, false);
    if (openCollection) renderGallery();

    if (!reduceMotion) {
      const inX = to === 'en' ? -shift : shift; // arrive from where the new language starts reading
      await Promise.all(visible().map((el, i) => el.animate(
        [{ transform: `translateX(${inX}px)`, opacity: 0, filter: `blur(${blur})` }, { transform: 'none', opacity: 1, filter: 'blur(0)' }],
        { duration: num('--motion-lang-in'), delay: i * stagger, easing: token('--ease-soft'), fill: 'forwards' }
      ).finished));
      document.querySelectorAll(selector).forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    }
    switching = false;
  }

  document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
    btn.addEventListener('click', () => switchLang(btn.dataset.lang));
  });

  /* ---------- 12 · Intro (first visit per session) ---------- */
  function closeIntro() {
    store.set('sessionStorage', STORAGE_INTRO, '1');
    root.classList.remove('has-intro');
    if (intro) intro.remove();
  }

  async function runIntro() {
    const letter = intro.querySelector('text');
    const name = intro.querySelector('.intro__name');
    const svg = intro.querySelector('svg');
    const dash = num('--intro-dash');
    const open = num('--motion-intro-open');

    await letter.animate([{ strokeDashoffset: dash }, { strokeDashoffset: 0 }],
      { duration: num('--motion-intro-draw'), easing: token('--ease-draw'), fill: 'forwards' }).finished;
    letter.animate([{ fill: 'transparent' }, { fill: token('--color-sand-300') }],
      { duration: num('--motion-intro-fill'), fill: 'forwards' });
    await name.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: num('--motion-intro-name'), fill: 'forwards' }).finished;
    name.animate([{ opacity: 1 }, { opacity: 0 }], { duration: open / 3, fill: 'forwards' });
    playHero(); // the hero starts animating as the intro opens over it
    svg.animate([{ transform: 'scale(1)' }, { transform: `scale(${num('--intro-zoom')})` }],
      { duration: open, easing: token('--ease-strong'), fill: 'forwards' });
    await intro.animate([{ clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }],
      { duration: open, delay: open / 3, easing: token('--ease-strong'), fill: 'forwards' }).finished;
  }

  /* ---------- 03 · About portrait opens on scroll ---------- */
  const aboutPhoto = document.getElementById('about-photo');
  function frame() {
    if (!aboutPhoto) return;
    const vh = innerHeight;
    const r = aboutPhoto.getBoundingClientRect();
    const p = reduceMotion ? 1 : clamp((vh - r.top) / (vh * 0.85), 0, 1);
    aboutPhoto.style.setProperty('--p', p.toFixed(3));
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { frame(); ticking = false; });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- 06 · Titles rise / 02 · Sketch-to-gown: play once when seen ---------- */
  const playOnce = 'IntersectionObserver' in window && !reduceMotion
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('play');
        el.dataset.played = '1';
        if (el.classList.contains('rise')) {
          const words = el.querySelectorAll('.w > span');
          const last = words[words.length - 1];
          const finish = () => el.classList.add('is-done');
          if (last) last.addEventListener('animationend', finish, { once: true });
          else finish();
        }
        playOnce.unobserve(entry.target);
      });
    }, { threshold: 0.4 })
    : null;

  /* ---------- 07 · Fan ---------- */
  // Desktop: opens on hover or keyboard focus. Phones (no hover): opens by itself when the card
  // is in view and closes when it leaves. A click or tap opens the collection (see Gallery).
  const fans = [...document.querySelectorAll('[data-fan]')];
  const setFan = (fan, open) => {
    fan.classList.toggle('is-open', open);
    fan.setAttribute('aria-expanded', String(open));
  };
  const canHover = matchMedia('(hover: hover)').matches;
  fans.forEach((fan) => {
    if (canHover) {
      const card = fan.closest('.card') || fan;
      card.addEventListener('pointerenter', () => setFan(fan, true));
      card.addEventListener('pointerleave', () => setFan(fan, false));
      card.addEventListener('focusin', () => setFan(fan, true));
      card.addEventListener('focusout', () => setFan(fan, false));
    }
  });
  if (!canHover && 'IntersectionObserver' in window) {
    const fanObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setFan(entry.target, entry.intersectionRatio >= 0.6));
    }, { threshold: [0, 0.6] });
    fans.forEach((fan) => fanObserver.observe(fan));
  }

  /* ---------- Real header height (the hero fills the rest of the screen) ---------- */
  const header = document.querySelector('.site-header');
  const syncHeader = () => { if (header) root.style.setProperty('--header-live', `${header.offsetHeight}px`); };
  syncHeader();
  addEventListener('resize', syncHeader);
  // Phones: the arches take whatever height is left under the hero text
  const heroText = document.querySelector('.hero__text');
  if (heroText && 'ResizeObserver' in window) {
    new ResizeObserver(() => root.style.setProperty('--hero-text-live', `${heroText.offsetHeight}px`)).observe(heroText);
  }

  /* ---------- Gallery: all of a collection's work ---------- */
  const works = window.SITE_WORKS || {};
  const gallery = document.getElementById('gallery');
  const galleryTitle = document.getElementById('gallery-title');
  const galleryBody = document.getElementById('gallery-body');
  let openCollection = null;

  function renderGallery() {
    const c = works[openCollection];
    if (!c || !gallery) return;
    const lang = currentLang;
    const word = content[lang]['gallery.item'];
    galleryTitle.textContent = c.title[lang];
    galleryBody.replaceChildren(...c.groups.map((g) => {
      const section = document.createElement('section');
      section.className = 'gallery__group';
      const h = document.createElement('h3');
      h.className = 'gallery__label t-serif';
      h.textContent = g.label[lang];
      const count = document.createElement('span');
      count.className = 'gallery__count';
      count.textContent = String(g.items.length);
      h.append(' ', count);
      const list = document.createElement('ul');
      list.className = `gallery__grid gallery__grid--${g.fit}`;
      g.items.forEach(({ src, focus }, i) => {
        const li = document.createElement('li');
        const im = document.createElement('img');
        im.src = src;
        if (focus) im.style.setProperty('--focus', focus);
        im.loading = 'lazy';
        im.decoding = 'async';
        im.alt = `${g.label[lang]} · ${word} ${i + 1}`;
        const shape = () => li.classList.toggle('is-landscape', im.naturalWidth > im.naturalHeight);
        if (im.complete && im.naturalWidth) shape(); else im.addEventListener('load', shape, { once: true });
        li.appendChild(im);
        list.appendChild(li);
      });
      section.append(h, list);
      return section;
    }));
  }

  function openGallery(id) {
    if (!gallery || !works[id]) return;
    openCollection = id;
    renderGallery();
    gallery.showModal();
    gallery.scrollTop = 0;
    root.classList.add('has-dialog');
  }

  if (gallery) {
    // The whole card and every accessory photo open their collection too;
    // the buttons stay as the keyboard and screen-reader way in.
    document.querySelectorAll('.card').forEach((card) => {
      const btn = card.querySelector('[data-open]');
      if (!btn) return;
      card.classList.add('is-clickable');
      card.addEventListener('click', (e) => { if (!e.target.closest('[data-open]')) openGallery(btn.dataset.open); });
    });
    document.querySelectorAll('[data-open-area]').forEach((area) => {
      area.classList.add('is-clickable');
      area.addEventListener('click', (e) => { if (e.target.closest('img')) openGallery(area.dataset.openArea); });
    });
    document.querySelectorAll('[data-open]').forEach((btn) => {
      btn.addEventListener('click', () => openGallery(btn.dataset.open));
    });
    gallery.querySelector('[data-close]').addEventListener('click', () => gallery.close());
    gallery.addEventListener('click', (e) => { if (e.target === gallery) gallery.close(); });
    gallery.addEventListener('close', () => {
      root.classList.remove('has-dialog');
      openCollection = null;
    });
  }

  /* ---------- Mobile menu ---------- */
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (menuToggle && navLinks) {
    const setMenu = (open) => {
      navLinks.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
    };
    menuToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('is-open')));
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    navLinks.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { setMenu(false); menuToggle.focus(); }
    });
    menuToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* ---------- Active nav link (follows the section on screen) ---------- */
  if (navLinks) {
    const links = [...navLinks.querySelectorAll('a[href^="#"]')];
    const targets = links.map((a) => document.querySelector(a.getAttribute('href')));
    let ticking = false;
    const markActive = () => {
      ticking = false;
      const line = (header ? header.offsetHeight : 0) + innerHeight / num('--phi', 1.618) / 2;
      const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      let active = -1;
      targets.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) active = i; });
      if (atBottom) active = targets.length - 1;
      links.forEach((a, i) => {
        if (i === active) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    };
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(markActive); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    addEventListener('load', queue);
    markActive();
  }

  /* ---------- Start ---------- */
  const saved = store.get('localStorage', STORAGE_LANG);
  applyLang(saved && content[saved] ? saved : DEFAULT_LANG);
  if (playOnce) document.querySelectorAll('.rise, [data-morph]').forEach((el) => playOnce.observe(el));
  frame();

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, num('--intro-failsafe') / 2));

  Promise.race([fontsReady, timeout]).then(async () => {
    // Write the headline only on the first visit, while the intro covers the swap
    buildHeadline(currentLang, playsIntro);
    if (playsIntro) {
      try { await runIntro(); } finally { closeIntro(); }
    } else if (intro) {
      closeIntro();
    }
    playHero();
    openGift();
  });

  /* ---------- Birthday note: only from the gift link (?gift) ---------- */
  function openGift() {
    const gift = document.getElementById('gift');
    if (!gift || !new URLSearchParams(location.search).has('gift')) return;
    gift.showModal();
    root.classList.add('has-dialog');
    const done = () => { if (gift.open) gift.close(); };
    gift.querySelector('[data-gift-close]').addEventListener('click', done);
    gift.addEventListener('click', (e) => { if (e.target === gift) done(); });
    gift.addEventListener('close', () => root.classList.remove('has-dialog'), { once: true });
  }
})();
