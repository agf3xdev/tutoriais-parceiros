(function () {
  const TOKEN_KEY = 'ingoo_admin_session';
  const LANGS = ['pt', 'en', 'es', 'zh'];
  const LANG_LABELS = { pt: 'PT', en: 'EN', es: 'ES', zh: 'ZH' };

  const HERO_FIELDS = [
    { key: 'brand_sub', label: 'Sub-marca (header)', type: 'text' },
    { key: 'hero_eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'hero_title_a', label: 'Título (primeira parte)', type: 'text' },
    { key: 'hero_title_b', label: 'Título (destaque laranja)', type: 'text' },
    { key: 'hero_sub', label: 'Subtítulo (aceita <b>negrito</b>)', type: 'textarea' },
    { key: 'cta_watch', label: 'CTA primário', type: 'text' },
    { key: 'cta_support', label: 'CTA suporte', type: 'text' },
    { key: 'watch', label: 'Texto "assistir vídeo" (cards)', type: 'text' },
    { key: 'modal_hint', label: 'Dica no player', type: 'text' },
    { key: 'support_label', label: 'Label do botão WhatsApp', type: 'text' },
    { key: 'faq_eyebrow', label: 'Eyebrow do FAQ', type: 'text' },
    { key: 'faq_title', label: 'Título do FAQ', type: 'text' },
    { key: 'footer_made', label: 'Texto do footer', type: 'text' }
  ];

  const state = {
    api: '',
    token: '',
    user: '',
    sha: null,
    data: null,
    dirty: false,
    activeLang: 'pt',
    activeFaqLang: 'pt'
  };

  // ---------- toast ----------
  const toastEl = document.getElementById('toast');
  let toastT;
  function toast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (type === 'err' ? ' err' : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 3500);
  }

  // ---------- session ----------
  function saveSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, user }));
  }
  function loadSession() {
    try {
      const s = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
      if (s && s.token) { state.token = s.token; state.user = s.user; return s; }
    } catch {}
    return null;
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    state.token = '';
    state.user = '';
  }

  // ---------- api helpers ----------
  async function apiCall(method, path, body) {
    if (!state.api) throw new Error('Worker não configurado em data/admin-config.json');
    const headers = {};
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(state.api.replace(/\/$/, '') + path, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  // ---------- base64 / utf8 ----------
  function decodeUtf8B64(b64) {
    const clean = b64.replace(/\n/g, '');
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  function encodeUtf8B64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  function abToBase64(ab) {
    const bytes = new Uint8Array(ab);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  // ---------- status ----------
  function setStatus(connected, user) {
    const pill = document.getElementById('statusPill');
    const text = document.getElementById('statusText');
    if (connected) {
      pill.classList.add('ok');
      text.textContent = user ? `Conectado: ${user}` : 'Conectado';
      document.getElementById('logoutBtn').style.display = '';
    } else {
      pill.classList.remove('ok');
      text.textContent = 'Não conectado';
      document.getElementById('logoutBtn').style.display = 'none';
    }
  }

  function markDirty() {
    state.dirty = true;
    const m = document.getElementById('dirtyMsg');
    m.textContent = 'Alterações não salvas';
    m.classList.remove('saved');
  }
  function markSaved() {
    state.dirty = false;
    const m = document.getElementById('dirtyMsg');
    m.textContent = 'Salvo';
    m.classList.add('saved');
    setTimeout(() => { m.textContent = ''; m.classList.remove('saved'); }, 3500);
  }

  // ---------- HERO TAB ----------
  function renderHeroLangRow() {
    const row = document.getElementById('heroLangRow');
    row.innerHTML = LANGS.map((l) =>
      `<button data-lang="${l}" class="${l === state.activeLang ? 'active' : ''}">${LANG_LABELS[l]}</button>`
    ).join('');
    row.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        state.activeLang = b.dataset.lang;
        renderHeroLangRow();
        renderHeroForm();
      });
    });
  }

  function renderHeroForm() {
    const form = document.getElementById('heroForm');
    const t = state.data.site[state.activeLang];
    form.innerHTML = `
      <h2 class="admin-title">Texto inicial <span class="lang-tag">${LANG_LABELS[state.activeLang]}</span></h2>
      <p class="admin-help">Edite os textos que aparecem no topo da página para o idioma <b>${LANG_LABELS[state.activeLang]}</b>.</p>
      <div class="form-stack">
        ${HERO_FIELDS.map((f) => {
          const val = (t[f.key] || '').replace(/"/g, '&quot;');
          return f.type === 'textarea'
            ? `<label><span>${f.label}</span><textarea data-key="${f.key}">${t[f.key] || ''}</textarea></label>`
            : `<label><span>${f.label}</span><input type="text" data-key="${f.key}" value="${val}" /></label>`;
        }).join('')}
      </div>
    `;
    form.querySelectorAll('[data-key]').forEach((el) => {
      el.addEventListener('input', () => {
        t[el.dataset.key] = el.value;
        markDirty();
      });
    });
  }

  // ---------- TUTORIALS TAB ----------
  function renderTutorials() {
    const wrap = document.getElementById('tutorialsList');
    const list = state.data.tutorials || [];
    if (!list.length) {
      wrap.innerHTML = '<p class="admin-help">Nenhum tutorial. Clique em "+ Novo tutorial".</p>';
      return;
    }
    wrap.innerHTML = list.map((t, i) => {
      const ptTitle = (t.i18n?.pt?.title) || t.slug;
      return `
        <div class="tut-item" data-idx="${i}">
          <div class="tut-head">
            <span class="slug">${t.slug}</span>
            <span class="pt-title">${ptTitle}</span>
            <span class="chev">▾</span>
          </div>
          <div class="tut-body">
            <label style="margin-bottom:10px;display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--muted);font-size:13px">
              <input type="checkbox" data-burned ${t.burnedSubs ? 'checked' : ''} style="width:auto"/>
              Vídeo já tem legenda PT queimada (usa <code style="font-family:var(--mono);font-size:12px">${t.slug}.pt.mp4</code> para PT)
            </label>
            ${LANGS.map((l) => {
              const lt = (t.i18n && t.i18n[l]) || { title: '', desc: '', badge: '' };
              return `
                <div class="tut-lang-block" data-lang="${l}">
                  <h4>${LANG_LABELS[l]}</h4>
                  <div class="form-stack">
                    <label><span>Título</span><input type="text" data-field="title" value="${(lt.title||'').replace(/"/g,'&quot;')}"/></label>
                    <label><span>Descrição</span><textarea data-field="desc">${lt.desc||''}</textarea></label>
                    <label><span>Badge</span><input type="text" data-field="badge" value="${(lt.badge||'').replace(/"/g,'&quot;')}"/></label>
                  </div>
                </div>`;
            }).join('')}
            <div class="tut-actions">
              <button class="btn btn-ghost btn-sm" data-action="up">↑ Subir</button>
              <button class="btn btn-ghost btn-sm" data-action="down">↓ Descer</button>
              <button class="btn btn-danger btn-sm" data-action="delete">Excluir tutorial</button>
            </div>
          </div>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.tut-item').forEach((item) => {
      const idx = +item.dataset.idx;
      item.querySelector('.tut-head').addEventListener('click', () => item.classList.toggle('open'));
      item.querySelector('[data-burned]').addEventListener('change', (e) => {
        state.data.tutorials[idx].burnedSubs = e.target.checked;
        markDirty();
      });
      item.querySelectorAll('.tut-lang-block').forEach((blk) => {
        const lang = blk.dataset.lang;
        blk.querySelectorAll('[data-field]').forEach((el) => {
          el.addEventListener('input', () => {
            const tut = state.data.tutorials[idx];
            tut.i18n = tut.i18n || {};
            tut.i18n[lang] = tut.i18n[lang] || {};
            tut.i18n[lang][el.dataset.field] = el.value;
            markDirty();
          });
        });
      });
      item.querySelector('[data-action="up"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx > 0) {
          const arr = state.data.tutorials;
          [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
          markDirty(); renderTutorials();
        }
      });
      item.querySelector('[data-action="down"]').addEventListener('click', (e) => {
        e.stopPropagation();
        const arr = state.data.tutorials;
        if (idx < arr.length - 1) {
          [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
          markDirty(); renderTutorials();
        }
      });
      item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        const slug = state.data.tutorials[idx].slug;
        if (!confirm(`Excluir tutorial "${slug}"? O vídeo e legendas continuam no repositório (remova manualmente depois se quiser). Confirmar?`)) return;
        state.data.tutorials.splice(idx, 1);
        markDirty(); renderTutorials();
      });
    });
  }

  // ---------- FAQ TAB ----------
  function renderFaqLangRow() {
    const row = document.getElementById('faqLangRow');
    row.innerHTML = LANGS.map((l) =>
      `<button data-lang="${l}" class="${l === state.activeFaqLang ? 'active' : ''}">${LANG_LABELS[l]}</button>`
    ).join('');
    row.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        state.activeFaqLang = b.dataset.lang;
        renderFaqLangRow();
        renderFaq();
      });
    });
  }

  function renderFaq() {
    document.getElementById('faqLangTag').textContent = LANG_LABELS[state.activeFaqLang];
    const wrap = document.getElementById('faqList');
    const t = state.data.site[state.activeFaqLang];
    t.faq = t.faq || [];
    if (!t.faq.length) {
      wrap.innerHTML = '<p class="admin-help">Nenhuma pergunta. Clique em "+ Nova pergunta".</p>';
      return;
    }
    wrap.innerHTML = t.faq.map((item, i) => `
      <div class="faq-edit-item" data-idx="${i}">
        <div class="faq-edit-row">
          <div class="col">
            <label><span>Pergunta</span><input type="text" data-field="q" value="${(item.q||'').replace(/"/g,'&quot;')}"/></label>
            <label><span>Resposta</span><textarea data-field="a">${item.a||''}</textarea></label>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" data-action="up">↑</button>
          <button class="btn btn-ghost btn-sm" data-action="down">↓</button>
          <button class="btn btn-danger btn-sm" data-action="delete">Excluir</button>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('.faq-edit-item').forEach((item) => {
      const idx = +item.dataset.idx;
      item.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('input', () => {
          t.faq[idx][el.dataset.field] = el.value;
          markDirty();
        });
      });
      item.querySelector('[data-action="up"]').addEventListener('click', () => {
        if (idx > 0) { [t.faq[idx-1], t.faq[idx]] = [t.faq[idx], t.faq[idx-1]]; markDirty(); renderFaq(); }
      });
      item.querySelector('[data-action="down"]').addEventListener('click', () => {
        if (idx < t.faq.length-1) { [t.faq[idx+1], t.faq[idx]] = [t.faq[idx], t.faq[idx+1]]; markDirty(); renderFaq(); }
      });
      item.querySelector('[data-action="delete"]').addEventListener('click', () => {
        t.faq.splice(idx, 1); markDirty(); renderFaq();
      });
    });
  }

  function addFaq() {
    const t = state.data.site[state.activeFaqLang];
    t.faq = t.faq || [];
    t.faq.push({ q: 'Nova pergunta', a: 'Resposta…' });
    markDirty();
    renderFaq();
  }

  // ---------- SUPPORT TAB ----------
  function renderSupport() {
    state.data.support = state.data.support || {};
    state.data.support.cities = state.data.support.cities || [];
    const wrap = document.getElementById('supportCitiesList');
    const cities = state.data.support.cities;
    if (!cities.length) {
      wrap.innerHTML = '<p class="admin-help">Nenhuma cidade. Clique em "+ Nova cidade".</p>';
      return;
    }
    wrap.innerHTML = cities.map((c, i) => `
      <div class="faq-edit-item" data-idx="${i}">
        <div class="form-grid">
          <label><span>Cidade</span><input type="text" data-field="name" value="${(c.name||'').replace(/"/g,'&quot;')}"/></label>
          <label><span>Texto exibido</span><input type="text" data-field="display" value="${(c.display||'').replace(/"/g,'&quot;')}" placeholder="(21) 92018-3420"/></label>
          <label style="grid-column:1/-1"><span>WhatsApp (só dígitos, com DDI — ex. 5521920183420)</span><input type="text" data-field="whatsapp" value="${(c.whatsapp||'').replace(/"/g,'&quot;')}" placeholder="5521920183420"/></label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" data-action="up">↑</button>
          <button class="btn btn-ghost btn-sm" data-action="down">↓</button>
          <button class="btn btn-danger btn-sm" data-action="delete">Excluir</button>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('.faq-edit-item').forEach((item) => {
      const idx = +item.dataset.idx;
      item.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('input', () => {
          cities[idx][el.dataset.field] = el.value.trim();
          markDirty();
        });
      });
      item.querySelector('[data-action="up"]').addEventListener('click', () => {
        if (idx > 0) { [cities[idx-1], cities[idx]] = [cities[idx], cities[idx-1]]; markDirty(); renderSupport(); }
      });
      item.querySelector('[data-action="down"]').addEventListener('click', () => {
        if (idx < cities.length-1) { [cities[idx+1], cities[idx]] = [cities[idx], cities[idx+1]]; markDirty(); renderSupport(); }
      });
      item.querySelector('[data-action="delete"]').addEventListener('click', () => {
        cities.splice(idx, 1); markDirty(); renderSupport();
      });
    });
  }

  function addCity() {
    state.data.support = state.data.support || {};
    state.data.support.cities = state.data.support.cities || [];
    state.data.support.cities.push({ name: 'Nova cidade', whatsapp: '', display: '' });
    markDirty();
    renderSupport();
  }

  // ---------- TABS ----------
  function setTab(name) {
    document.querySelectorAll('.admin-tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach((p) => p.style.display = p.dataset.panel === name ? '' : 'none');
  }

  // ---------- LOAD / SAVE ----------
  async function loadAll() {
    const r = await apiCall('GET', '/content');
    state.sha = r.sha;
    state.data = JSON.parse(decodeUtf8B64(r.content));
  }

  async function saveAll() {
    if (!state.dirty) { toast('Nada para salvar'); return; }
    document.getElementById('saveBtn').disabled = true;
    try {
      const jsonStr = JSON.stringify(state.data, null, 2);
      const r = await apiCall('PUT', '/content', { sha: state.sha, content: encodeUtf8B64(jsonStr) });
      state.sha = r.sha;
      markSaved();
      toast('Salvo — site atualiza em ~1 min');
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      document.getElementById('saveBtn').disabled = false;
    }
  }

  // ---------- UPLOAD VIDEO ----------
  function openUpload() {
    document.getElementById('newSlug').value = '';
    document.getElementById('newVideoFile').value = '';
    document.getElementById('uploadMsg').textContent = '';
    document.getElementById('uploadModal').classList.add('open');
    document.getElementById('uploadModal').setAttribute('aria-hidden', 'false');
  }
  function closeUpload() {
    document.getElementById('uploadModal').classList.remove('open');
    document.getElementById('uploadModal').setAttribute('aria-hidden', 'true');
  }

  async function doUpload() {
    const slug = document.getElementById('newSlug').value.trim().toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const fileEl = document.getElementById('newVideoFile');
    const file = fileEl.files[0];
    const msg = document.getElementById('uploadMsg');
    msg.className = 'admin-msg';
    msg.textContent = '';

    if (!slug) { msg.textContent = 'Informe um slug.'; msg.classList.add('err'); return; }
    if ((state.data.tutorials || []).some((t) => t.slug === slug)) {
      msg.textContent = 'Já existe tutorial com esse slug.'; msg.classList.add('err'); return;
    }
    if (!file) { msg.textContent = 'Selecione um arquivo .mp4'; msg.classList.add('err'); return; }
    if (file.size > 95 * 1024 * 1024) {
      msg.textContent = `Arquivo muito grande (${(file.size/1024/1024).toFixed(1)} MB). Limite ~95 MB.`;
      msg.classList.add('err'); return;
    }

    const btn = document.getElementById('uploadConfirm');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      msg.textContent = 'Lendo arquivo…';
      const ab = await file.arrayBuffer();
      msg.textContent = 'Enviando…';
      const b64 = abToBase64(ab);
      await apiCall('POST', '/upload', { path: `docs/videos/${slug}.mp4`, content: b64 });

      state.data.tutorials = state.data.tutorials || [];
      state.data.tutorials.push({
        slug,
        burnedSubs: false,
        i18n: {
          pt: { title: slug, desc: '', badge: '' },
          en: { title: slug, desc: '', badge: '' },
          es: { title: slug, desc: '', badge: '' },
          zh: { title: slug, desc: '', badge: '' }
        }
      });
      markDirty();
      renderTutorials();
      setTab('tutorials');
      closeUpload();
      toast('Vídeo enviado. Preencha os textos e clique em "Salvar tudo".');
    } catch (e) {
      msg.textContent = e.message; msg.classList.add('err');
    } finally {
      btn.disabled = false; btn.textContent = 'Adicionar';
    }
  }

  // ---------- AUTH ----------
  async function login(user, pass) {
    const r = await apiCall('POST', '/login', { user, pass });
    saveSession(r.token, r.user);
    return r.user;
  }

  function logout() {
    clearSession();
    location.reload();
  }

  // ---------- INIT ----------
  function bindStaticEvents() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('loginBtn').addEventListener('click', async () => {
      const u = document.getElementById('userInput').value.trim();
      const p = document.getElementById('passInput').value;
      const lm = document.getElementById('loginMsg');
      lm.className = 'admin-msg'; lm.textContent = 'Entrando…';
      try {
        await login(u, p);
        lm.className = 'admin-msg ok'; lm.textContent = 'OK!';
        setStatus(true, state.user);
        await bootApp();
      } catch (e) {
        lm.className = 'admin-msg err'; lm.textContent = e.message;
      }
    });
    // Enter no campo de senha = submit
    document.getElementById('passInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });

    document.querySelectorAll('.admin-tabs .tab').forEach((b) => {
      b.addEventListener('click', () => setTab(b.dataset.tab));
    });
    document.getElementById('saveBtn').addEventListener('click', saveAll);
    document.getElementById('addTutorialBtn').addEventListener('click', openUpload);
    document.getElementById('addFaqBtn').addEventListener('click', addFaq);
    document.querySelectorAll('#uploadModal [data-close]').forEach((el) => {
      el.addEventListener('click', closeUpload);
    });
    document.getElementById('uploadConfirm').addEventListener('click', doUpload);

    document.getElementById('addCityBtn').addEventListener('click', addCity);

    window.addEventListener('beforeunload', (e) => {
      if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  async function bootApp() {
    document.getElementById('loginPanel').style.display = 'none';
    document.getElementById('appPanel').style.display = '';
    try {
      await loadAll();
      renderHeroLangRow();
      renderHeroForm();
      renderTutorials();
      renderFaqLangRow();
      renderFaq();
      renderSupport();
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  async function loadConfig() {
    try {
      const r = await fetch(`data/admin-config.json?cb=${Date.now()}`);
      const c = await r.json();
      state.api = c.api || '';
    } catch {}
  }

  // boot
  (async () => {
    await loadConfig();
    bindStaticEvents();
    if (!state.api) {
      document.getElementById('loginMsg').className = 'admin-msg err';
      document.getElementById('loginMsg').textContent = 'Worker ainda não configurado. Defina a URL em data/admin-config.json.';
      document.getElementById('loginBtn').disabled = true;
      return;
    }
    const s = loadSession();
    if (s) {
      try {
        const me = await apiCall('GET', '/me');
        setStatus(true, me.user);
        await bootApp();
      } catch {
        clearSession();
        setStatus(false);
      }
    }
  })();
})();
