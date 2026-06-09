(function () {
  const STORAGE_KEY = 'ingoo_tutorials_lang';
  const SUPPORTED = ['pt', 'en', 'es', 'zh'];
  const SUBTITLE_LANGS = ['en', 'es', 'zh'];
  const ALL_SUB_LANGS = ['pt', 'en', 'es', 'zh'];

  function detectLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    const nav = (navigator.language || 'pt').toLowerCase();
    if (nav.startsWith('zh')) return 'zh';
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('en')) return 'en';
    return 'pt';
  }

  const state = { lang: detectLang(), data: null };

  async function loadContent() {
    const res = await fetch(`data/content.json?cb=${Date.now()}`);
    if (!res.ok) throw new Error('Failed to load content');
    state.data = await res.json();
  }

  function thumbSvg(slug, idx) {
    const icons = [
      '<g><circle cx="200" cy="125" r="44" fill="none" stroke="%23ff6b00" stroke-width="3" opacity=".4"/><circle cx="200" cy="125" r="28" fill="%23ff6b00"/><circle cx="200" cy="125" r="10" fill="%23000"/></g>',
      '<g fill="none" stroke="%23ff6b00" stroke-width="7" stroke-linecap="round"><path d="M140 158 Q200 95 260 158" opacity=".4"/><path d="M158 168 Q200 122 242 168" opacity=".7"/><path d="M176 178 Q200 150 224 178"/><circle cx="200" cy="190" r="7" fill="%23ff6b00" stroke="none"/></g>',
      '<g><rect x="135" y="92" width="130" height="78" rx="8" fill="none" stroke="%23ff6b00" stroke-width="3"/><rect x="135" y="106" width="130" height="18" fill="%23ff6b00"/><rect x="148" y="138" width="40" height="6" rx="2" fill="%23ff6b00" opacity=".7"/><rect x="148" y="150" width="22" height="6" rx="2" fill="%23ff6b00" opacity=".4"/></g>',
      '<g><g fill="%23ff6b00"><rect x="165" y="90" width="24" height="24" rx="2"/><rect x="211" y="90" width="24" height="24" rx="2"/><rect x="165" y="136" width="24" height="24" rx="2"/></g><g fill="none" stroke="%23ff6b00" stroke-width="3"><rect x="211" y="136" width="24" height="24" rx="2"/></g></g>',
      '<g><rect x="155" y="88" width="90" height="74" rx="10" fill="none" stroke="%23ff6b00" stroke-width="3"/><rect x="170" y="100" width="60" height="50" rx="3" fill="%23ff6b00"/><g fill="%23000"><rect x="178" y="108" width="44" height="3"/><rect x="178" y="118" width="44" height="3"/><rect x="178" y="128" width="32" height="3"/><rect x="178" y="138" width="38" height="3"/></g></g>',
      '<g fill="none" stroke="%23ff6b00" stroke-width="6" stroke-linecap="round"><path d="M150 100 L200 150 L250 100"/><path d="M150 150 L200 200 L250 150" opacity=".5"/></g>'
    ];
    const icon = icons[idx % icons.length];
    return `<svg class="bg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid-${slug}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,107,0,0.08)" stroke-width="1"/>
        </pattern>
        <radialGradient id="glow-${slug}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,107,0,0.25)"/>
          <stop offset="100%" stop-color="rgba(255,107,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="400" height="250" fill="%23000"/>
      <rect width="400" height="250" fill="url(%23grid-${slug})"/>
      <rect width="400" height="250" fill="url(%23glow-${slug})"/>
      ${icon}
    </svg>`;
  }

  function applyI18n(key, t) {
    document.querySelectorAll(`[data-i18n="${key}"]`).forEach((el) => {
      if (t[key] == null) return;
      if (t[key].includes('<')) el.innerHTML = t[key];
      else el.textContent = t[key];
    });
  }

  function renderSite() {
    const t = state.data.site[state.lang];
    document.documentElement.lang = t.htmlLang;
    Object.keys(t).forEach((k) => applyI18n(k, t));

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.dataset.lang === state.lang ? 'true' : 'false');
    });
  }

  function renderTutorials() {
    const t = state.data.site[state.lang];
    const tutorials = state.data.tutorials || [];
    const grid = document.getElementById('tutorialsGrid');
    const total = String(tutorials.length).padStart(2, '0');
    grid.innerHTML = tutorials
      .map((tut, i) => {
        const meta = (tut.i18n && tut.i18n[state.lang]) || (tut.i18n && tut.i18n.pt) || {};
        const num = String(i + 1).padStart(2, '0');
        return `
        <button class="card" data-slug="${tut.slug}" type="button" aria-label="${meta.title || ''}">
          <div class="card-thumb">
            ${thumbSvg(tut.slug, i)}
            <span class="badge">${meta.badge || ''}</span>
            <span class="card-index">${num} <em>/${total}</em></span>
            <span class="play"><span></span></span>
          </div>
          <div class="card-body">
            <h3 class="card-title">${meta.title || ''}</h3>
            <p class="card-desc">${meta.desc || ''}</p>
            <span class="card-foot">${t.watch} <span class="arrow">→</span></span>
          </div>
        </button>`;
      })
      .join('');

    grid.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('click', () => openVideo(card.dataset.slug));
    });
  }

  function renderFaq() {
    const t = state.data.site[state.lang];
    const list = document.getElementById('faqList');
    if (!list) return;
    const items = t.faq || [];
    if (!items.length) {
      document.getElementById('faqSection').style.display = 'none';
      return;
    }
    document.getElementById('faqSection').style.display = '';
    list.innerHTML = items
      .map(
        (item) => `
      <details class="faq-item">
        <summary>${item.q}<span class="faq-icon" aria-hidden="true">+</span></summary>
        <div class="faq-answer">${item.a}</div>
      </details>`
      )
      .join('');
  }

  function renderSupport() {
    const s = state.data.support || {};
    const cities = Array.isArray(s.cities) ? s.cities : [];
    const list = document.getElementById('supportCityList');
    if (list) {
      list.innerHTML = cities.map((c) => `
        <a class="support-city" href="https://wa.me/${c.whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener">
          <span class="support-city-name">${c.name}</span>
          <span class="support-city-num">${c.display || c.whatsapp}</span>
        </a>`).join('');
    }
  }

  function setupSupportPopover() {
    const fab = document.getElementById('supportFab');
    const pop = document.getElementById('supportPopover');
    const wrap = document.getElementById('supportWrap');
    if (!fab || !pop || !wrap) return;
    function open() {
      pop.hidden = false;
      requestAnimationFrame(() => pop.classList.add('open'));
      fab.setAttribute('aria-expanded', 'true');
    }
    function close() {
      pop.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      setTimeout(() => { if (!pop.classList.contains('open')) pop.hidden = true; }, 180);
    }
    function toggle() {
      pop.hidden ? open() : close();
    }
    fab.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    document.querySelectorAll('[data-support-trigger]').forEach((b) => {
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(); fab.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function render() {
    renderSite();
    renderSupport();
    renderTutorials();
    renderFaq();
  }

  function openVideo(slug) {
    const tut = (state.data.tutorials || []).find((x) => x.slug === slug);
    if (!tut) return;
    const meta = (tut.i18n && tut.i18n[state.lang]) || (tut.i18n && tut.i18n.pt) || {};

    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    const title = document.getElementById('modalTitle');

    title.textContent = meta.title || '';
    video.innerHTML = '';

    // burnedLangs: lista de idiomas com legenda já queimada no vídeo.
    // Para esses idiomas usamos videos/${slug}.${lang}.mp4 e não adicionamos <track>.
    // Para os outros idiomas usamos videos/${slug}.mp4 (fallback) e ligamos a faixa VTT correspondente.
    // Compat: burnedSubs:true => burnedLangs: ['pt'].
    const burnedLangs = Array.isArray(tut.burnedLangs)
      ? tut.burnedLangs
      : tut.burnedSubs ? ['pt'] : [];

    const source = document.createElement('source');
    if (burnedLangs.includes(state.lang)) {
      source.src = `videos/${slug}.${state.lang}.mp4`;
    } else {
      source.src = `videos/${slug}.mp4`;
    }
    source.type = 'video/mp4';
    video.appendChild(source);

    const trackLangs = ALL_SUB_LANGS.filter((l) => !burnedLangs.includes(l));
    trackLangs.forEach((lng) => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.src = `subtitles/${slug}.${lng}.vtt`;
      track.srclang = lng;
      track.label = { pt: 'Português', en: 'English', es: 'Español', zh: '中文' }[lng];
      if (lng === state.lang) track.default = true;
      video.appendChild(track);
    });

    video.load();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = tracks[i].language === state.lang ? 'showing' : 'disabled';
      }
      video.play().catch(() => {});
    }, 100);
  }

  function closeVideo() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    video.pause();
    video.removeAttribute('src');
    video.innerHTML = '';
    video.load();
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadContent();
    } catch (e) {
      console.error(e);
      return;
    }

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.lang = btn.dataset.lang;
        localStorage.setItem(STORAGE_KEY, state.lang);
        render();
      });
    });

    document.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', closeVideo);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeVideo();
    });

    setupSupportPopover();
    render();
  });
})();
