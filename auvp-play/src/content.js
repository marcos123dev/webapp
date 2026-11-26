/*
 * AUVP Play para Firefox (não oficial) — script de conteúdo
 *
 * Port independente para Firefox, baseado na extensão original para Chrome
 * "AUVP Play", criada por Matheus Satake de Souza.
 *
 * Toda a interface é construída com createElement/textContent e estilizada
 * pelo content.css. Nenhum uso de innerHTML, eval ou script inline:
 * isso garante compatibilidade total com a CSP e com o Trusted Types do YouTube.
 */
(function () {
  'use strict';

  if (window.top !== window.self) { return; }
  if (window.__auvpPlayLoaded) { return; }
  window.__auvpPlayLoaded = true;

  var api = AUVP.api;
  var SHELF_ID = 'auvp-play-shelf';
  var FLAG_CACHE = 'auvpPlayFlags';

  var state = {
    settings: null,
    videos: [],
    watched: {},
    later: [],
    query: '',
    limit: 8,
    fetchedAt: 0,
    errors: [],
    loading: false
  };

  /* ================= utilidades de DOM ================= */

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) { return; }
        if (k === 'class') { n.className = v; }
        else if (k === 'text') { n.textContent = v; }
        else if (k === 'dataset') {
          Object.keys(v).forEach(function (d) { n.dataset[d] = v[d]; });
        } else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          n.addEventListener(k.slice(2), v);
        } else { n.setAttribute(k, v); }
      });
    }
    if (kids) {
      kids.forEach(function (c) { if (c) { n.appendChild(c); } });
    }
    return n;
  }

  function toast(message) {
    var old = document.getElementById('auvp-toast');
    if (old && old.parentNode) { old.parentNode.removeChild(old); }
    var t = el('div', { id: 'auvp-toast', class: 'auvp-toast', text: message });
    (document.body || document.documentElement).appendChild(t);
    setTimeout(function () {
      if (t.parentNode) { t.parentNode.removeChild(t); }
    }, 2600);
  }

  /* ================= sinalizadores globais (CSS) ================= */

  function applyFlags(settings) {
    var root = document.documentElement;
    if (!root) { return; }
    root.setAttribute('data-auvp-hide-recs', settings.hideRecommendations ? '1' : '0');
    root.setAttribute('data-auvp-hide-shorts', settings.hideShorts ? '1' : '0');
    try {
      window.sessionStorage.setItem(FLAG_CACHE, JSON.stringify({
        hideRecommendations: !!settings.hideRecommendations,
        hideShorts: !!settings.hideShorts,
        shortsAsVideo: !!settings.shortsAsVideo
      }));
    } catch (e) { /* sessionStorage pode estar bloqueado */ }
  }

  /* Aplica imediatamente os sinalizadores da última visita, para evitar
     que o feed de recomendações apareça por uma fração de segundo. */
  function applyCachedFlagsEarly() {
    try {
      var raw = window.sessionStorage.getItem(FLAG_CACHE);
      if (!raw) { return null; }
      var f = JSON.parse(raw);
      document.documentElement.setAttribute('data-auvp-hide-recs', f.hideRecommendations ? '1' : '0');
      document.documentElement.setAttribute('data-auvp-hide-shorts', f.hideShorts ? '1' : '0');
      return f;
    } catch (e) { return null; }
  }

  /* ================= Shorts ================= */

  function shortsIdFromPath(pathname) {
    var m = (pathname || '').match(/^\/shorts\/([A-Za-z0-9_-]{6,20})/);
    return m ? m[1] : null;
  }

  function redirectShortsIfNeeded() {
    if (!state.settings || !state.settings.shortsAsVideo) { return false; }
    var id = shortsIdFromPath(location.pathname);
    if (!id) { return false; }
    var target = 'https://www.youtube.com/watch?v=' + id;
    location.replace(target);
    return true;
  }

  /* Reescreve links de Shorts para o player normal e esconde blocos de Shorts. */
  function sweepShorts() {
    if (!state.settings) { return; }

    if (state.settings.shortsAsVideo) {
      var links = document.querySelectorAll('a[href^="/shorts/"], a[href*="youtube.com/shorts/"]');
      for (var i = 0; i < links.length; i++) {
        var a = links[i];
        var href = a.getAttribute('href') || '';
        var m = href.match(/\/shorts\/([A-Za-z0-9_-]{6,20})/);
        if (m && a.dataset.auvpRewritten !== '1') {
          a.setAttribute('href', '/watch?v=' + m[1]);
          a.dataset.auvpRewritten = '1';
        }
      }
    }

    if (state.settings.hideShorts) {
      var WRAPPERS = [
        'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer',
        'ytd-grid-video-renderer', 'ytd-item-section-renderer', 'ytd-rich-section-renderer',
        'ytm-shorts-lockup-view-model', 'ytm-shorts-lockup-view-model-v2', 'yt-lockup-view-model'
      ];
      var shortLinks = document.querySelectorAll('a[href^="/shorts/"]:not([data-auvp-rewritten]), a[href*="youtube.com/shorts/"]:not([data-auvp-rewritten])');
      for (var j = 0; j < shortLinks.length; j++) {
        var node = shortLinks[j];
        for (var up = 0; up < 8 && node; up++) {
          var tag = (node.tagName || '').toLowerCase();
          if (WRAPPERS.indexOf(tag) !== -1) {
            if (node.getAttribute('data-auvp-hidden') !== '1') {
              node.setAttribute('data-auvp-hidden', '1');
            }
            break;
          }
          node = node.parentElement;
        }
      }
    }
  }

  /* ================= marcar como assistido ================= */

  var watchHook = { videoId: null, done: false, video: null, handler: null };

  function currentWatchId() {
    if (location.pathname !== '/watch') { return null; }
    try {
      return new URLSearchParams(location.search).get('v');
    } catch (e) { return null; }
  }

  function markWatched(videoId, on) {
    if (!videoId) { return Promise.resolve(); }
    if (on === false) {
      delete state.watched[videoId];
    } else {
      state.watched[videoId] = Date.now();
    }
    var out = {};
    out[AUVP.KEYS.watched] = state.watched;
    return AUVP.storageSet(out);
  }

  function hookWatchPage() {
    var id = currentWatchId();
    if (!state.settings || !state.settings.autoMarkWatched) { return; }
    if (!id || id === watchHook.videoId) { return; }

    detachWatchHook();
    watchHook.videoId = id;
    watchHook.done = false;

    var isAuvp = state.videos.some(function (v) { return v.videoId === id; });
    if (!isAuvp) { return; }

    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      var video = document.querySelector('video.html5-main-video, video');
      if (video) {
        clearInterval(timer);
        watchHook.video = video;
        watchHook.handler = function () {
          if (watchHook.done) { return; }
          var dur = video.duration || 0;
          var cur = video.currentTime || 0;
          if (cur >= 30 || (dur > 0 && cur / dur >= 0.15)) {
            watchHook.done = true;
            markWatched(id, true).then(function () { renderShelf(); });
          }
        };
        video.addEventListener('timeupdate', watchHook.handler);
      }
      if (attempts > 40) { clearInterval(timer); }
    }, 500);
  }

  function detachWatchHook() {
    if (watchHook.video && watchHook.handler) {
      try { watchHook.video.removeEventListener('timeupdate', watchHook.handler); } catch (e) { /* ignora */ }
    }
    watchHook.video = null;
    watchHook.handler = null;
  }

  /* ================= "minha lista" ================= */

  function isLater(videoId) { return state.later.indexOf(videoId) !== -1; }

  function toggleLater(videoId) {
    var i = state.later.indexOf(videoId);
    if (i === -1) { state.later.push(videoId); } else { state.later.splice(i, 1); }
    var out = {};
    out[AUVP.KEYS.later] = state.later;
    return AUVP.storageSet(out);
  }

  function copyLink(url) {
    function fallback() {
      try {
        var ta = el('textarea', { class: 'auvp-clip' });
        ta.value = url;
        (document.body || document.documentElement).appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        if (ta.parentNode) { ta.parentNode.removeChild(ta); }
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        toast('Link copiado: ' + url);
      }).catch(function () {
        toast(fallback() ? 'Link copiado: ' + url : 'Não foi possível copiar. Link: ' + url);
      });
    } else {
      toast(fallback() ? 'Link copiado: ' + url : 'Não foi possível copiar. Link: ' + url);
    }
  }

  /* ================= dados ================= */

  function loadFromStorage() {
    return Promise.all([AUVP.getSettings(), AUVP.getState()]).then(function (r) {
      state.settings = r[0];
      state.watched = r[1].watched || {};
      state.later = r[1].later || [];
      state.videos = (r[1].cache && r[1].cache.videos) || [];
      state.fetchedAt = (r[1].cache && r[1].cache.fetchedAt) || 0;
      state.errors = (r[1].cache && r[1].cache.errors) || [];
      return state;
    });
  }

  /* Busca os feeds a partir da própria página do YouTube (mesma origem),
     o que funciona mesmo se a permissão de host não estiver concedida. */
  function refreshFromPage() {
    if (state.loading) { return Promise.resolve(null); }
    state.loading = true;
    renderShelf();
    return AUVP.refreshAll().then(function (cache) {
      state.loading = false;
      return cache;
    }).catch(function (err) {
      state.loading = false;
      throw err;
    });
  }

  function requestRefresh() {
    if (state.loading) { return; }
    refreshFromPage().then(function (cache) {
      if (!cache) { return; }
      state.videos = cache.videos;
      state.fetchedAt = cache.fetchedAt;
      state.errors = cache.errors || [];
      renderShelf();
      if (state.errors.length) {
        toast('Alguns canais não responderam: ' + state.errors.map(function (e) { return e.channel; }).join(', '));
      } else {
        toast('Vídeos atualizados (' + cache.videos.length + ').');
      }
      try { api.runtime.sendMessage({ type: 'auvp:badgeRefresh' }); } catch (e) { /* ignora */ }
    }).catch(function (err) {
      renderShelf();
      toast('Não foi possível atualizar: ' + (err && err.message ? err.message : err));
    });
  }

  /* ================= prateleira ================= */

  function isHome() {
    if (location.pathname !== '/' && location.pathname !== '') { return false; }
    return true;
  }

  function findMount() {
    var browse = document.querySelector('ytd-browse[page-subtype="home"]:not([hidden])') ||
                 document.querySelector('ytd-browse[page-subtype="home"]');
    if (browse) {
      return browse.querySelector('ytd-two-column-browse-results-renderer #primary') ||
             browse.querySelector('#primary') ||
             browse;
    }
    return document.querySelector('ytd-two-column-browse-results-renderer #primary');
  }

  function removeShelf() {
    var old = document.getElementById(SHELF_ID);
    if (old && old.parentNode) { old.parentNode.removeChild(old); }
  }

  function renderShelf() {
    if (!state.settings) { return; }
    if (!state.settings.shelfEnabled || !isHome()) { removeShelf(); return; }

    var mount = findMount();
    if (!mount) { return; }

    var old = document.getElementById(SHELF_ID);
    var active = document.activeElement;
    var keepFocus = !!(old && active && old.contains(active) && active.classList.contains('auvp-search'));
    var caret = keepFocus ? active.selectionStart : null;

    var shelf = buildShelf();
    if (old && old.parentNode === mount) {
      mount.replaceChild(shelf, old);
    } else {
      removeShelf();
      mount.insertBefore(shelf, mount.firstChild);
    }

    if (keepFocus) {
      var field = shelf.querySelector('.auvp-search');
      if (field) {
        field.focus();
        try { field.setSelectionRange(caret, caret); } catch (e) { /* ignora */ }
      }
    }
  }

  function buildShelf() {
    var s = state.settings;
    var filtered = AUVP.selectVideos(state.videos, s, state.watched, state.query);
    var shown = filtered.slice(0, state.limit);

    var root = el('section', {
      id: SHELF_ID,
      class: 'auvp-shelf' + (s.collapsed ? ' auvp-is-collapsed' : ''),
      role: 'region',
      'aria-label': 'Vídeos da AUVP'
    });

    /* ---- cabeçalho ---- */
    var brand = el('div', { class: 'auvp-brand' }, [
      el('span', { class: 'auvp-logo', 'aria-hidden': 'true' }),
      el('span', { class: 'auvp-brand-name', text: 'AUVP Play' }),
      el('span', {
        class: 'auvp-count',
        text: filtered.length + (filtered.length === 1 ? ' vídeo' : ' vídeos')
      })
    ]);

    var search = el('input', {
      class: 'auvp-search',
      type: 'search',
      placeholder: 'Buscar só nos vídeos da AUVP',
      'aria-label': 'Buscar nos vídeos da AUVP',
      value: state.query,
      oninput: function (ev) {
        state.query = ev.target.value;
        state.limit = 8;
        renderShelf();
      }
    });

    var sort = el('select', {
      class: 'auvp-select',
      'aria-label': 'Ordenar vídeos',
      onchange: function (ev) {
        AUVP.saveSettings({ sortOrder: ev.target.value }).then(function (next) {
          state.settings = next;
          renderShelf();
        });
      }
    }, [
      el('option', { value: 'recent', text: 'Mais recentes' }),
      el('option', { value: 'oldest', text: 'Mais antigos' }),
      el('option', { value: 'views', text: 'Mais vistos' })
    ]);
    sort.value = s.sortOrder || 'recent';

    var btnRefresh = el('button', {
      class: 'auvp-btn',
      type: 'button',
      title: 'Buscar os vídeos mais recentes dos canais',
      text: state.loading ? 'Atualizando…' : 'Atualizar',
      disabled: state.loading ? 'disabled' : null,
      onclick: requestRefresh
    });

    var btnPlayAll = el('button', {
      class: 'auvp-btn',
      type: 'button',
      title: 'Abrir os vídeos listados como uma fila de reprodução no YouTube',
      text: '▶ Reproduzir fila',
      onclick: function () {
        var url = AUVP.playlistUrl(filtered.map(function (v) { return v.videoId; }));
        if (!url) { toast('Nenhum vídeo para reproduzir.'); return; }
        window.location.href = url;
      }
    });

    var btnLater = el('button', {
      class: 'auvp-btn' + (state.later.length ? ' auvp-btn-accent' : ''),
      type: 'button',
      title: 'Abrir a sua lista salva como fila de reprodução',
      text: '★ Minha lista (' + state.later.length + ')',
      onclick: function () {
        var url = AUVP.playlistUrl(state.later);
        if (!url) { toast('Sua lista está vazia. Use o ★ nos vídeos para salvar.'); return; }
        window.location.href = url;
      }
    });

    var btnCollapse = el('button', {
      class: 'auvp-btn auvp-btn-icon',
      type: 'button',
      title: s.collapsed ? 'Expandir' : 'Recolher',
      text: s.collapsed ? '▾' : '▴',
      onclick: function () {
        AUVP.saveSettings({ collapsed: !s.collapsed }).then(function (next) {
          state.settings = next;
          renderShelf();
        });
      }
    });

    var cta = el('a', {
      class: 'auvp-cta',
      href: AUVP.META.ctaUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: AUVP.META.ctaNote,
      text: 'Seja aluno'
    });

    var head = el('header', { class: 'auvp-head' }, [
      brand,
      el('div', { class: 'auvp-actions' }, [search, sort, btnRefresh, btnPlayAll, btnLater, btnCollapse, cta])
    ]);
    root.appendChild(head);

    /* ---- filtros de canal ---- */
    var chips = el('div', { class: 'auvp-chips' });
    AUVP.CHANNELS.forEach(function (ch) {
      var on = (s.channels || []).indexOf(ch.key) !== -1;
      var n = state.videos.filter(function (v) { return v.channelKey === ch.key; }).length;
      chips.appendChild(el('button', {
        class: 'auvp-chip' + (on ? ' auvp-chip-on' : ''),
        type: 'button',
        style: 'border-color:' + ch.color + (on ? ';background:' + ch.color : ''),
        'aria-pressed': on ? 'true' : 'false',
        text: ch.name + (n ? ' (' + n + ')' : ''),
        onclick: function () {
          var list = (state.settings.channels || []).slice();
          var i = list.indexOf(ch.key);
          if (i === -1) { list.push(ch.key); } else if (list.length > 1) { list.splice(i, 1); }
          else { toast('Mantenha pelo menos um canal selecionado.'); return; }
          AUVP.saveSettings({ channels: list }).then(function (next) {
            state.settings = next;
            state.limit = 8;
            renderShelf();
          });
        }
      }));
    });

    chips.appendChild(el('button', {
      class: 'auvp-chip auvp-chip-plain' + (s.hideWatched ? ' auvp-chip-on-plain' : ''),
      type: 'button',
      'aria-pressed': s.hideWatched ? 'true' : 'false',
      text: s.hideWatched ? '◉ Ocultando assistidos' : '○ Ocultar assistidos',
      onclick: function () {
        AUVP.saveSettings({ hideWatched: !s.hideWatched }).then(function (next) {
          state.settings = next;
          renderShelf();
        });
      }
    }));

    if (state.fetchedAt) {
      chips.appendChild(el('span', {
        class: 'auvp-stamp',
        text: 'atualizado ' + AUVP.relativeDate(new Date(state.fetchedAt).toISOString())
      }));
    }
    root.appendChild(chips);

    /* ---- grade de vídeos ---- */
    var grid = el('div', { class: 'auvp-grid' });

    if (state.loading && !shown.length) {
      grid.appendChild(el('p', { class: 'auvp-empty', text: 'Buscando os vídeos dos canais da AUVP…' }));
    } else if (!state.videos.length) {
      grid.appendChild(el('p', { class: 'auvp-empty', text: 'Nenhum vídeo carregado ainda. Clique em "Atualizar" para buscar.' }));
    } else if (!shown.length) {
      grid.appendChild(el('p', {
        class: 'auvp-empty',
        text: state.query ? 'Nenhum vídeo encontrado para "' + state.query + '".'
                          : 'Nenhum vídeo com os filtros atuais.'
      }));
    } else {
      shown.forEach(function (v) { grid.appendChild(buildCard(v)); });
    }
    root.appendChild(grid);

    if (filtered.length > shown.length) {
      root.appendChild(el('div', { class: 'auvp-more' }, [
        el('button', {
          class: 'auvp-btn auvp-btn-wide',
          type: 'button',
          text: 'Mostrar mais ' + Math.min(8, filtered.length - shown.length) + ' de ' + filtered.length,
          onclick: function () { state.limit += 8; renderShelf(); }
        })
      ]));
    } else if (shown.length > 8) {
      root.appendChild(el('div', { class: 'auvp-more' }, [
        el('button', {
          class: 'auvp-btn auvp-btn-wide',
          type: 'button',
          text: 'Mostrar menos',
          onclick: function () { state.limit = 8; renderShelf(); }
        })
      ]));
    }

    if (state.errors && state.errors.length) {
      root.appendChild(el('p', {
        class: 'auvp-warn',
        text: 'Não foi possível ler: ' + state.errors.map(function (e) { return e.channel; }).join(', ') + '.'
      }));
    }

    /* ---- rodapé com os créditos ---- */
    root.appendChild(el('footer', { class: 'auvp-foot' }, [
      el('span', { class: 'auvp-credit', text: AUVP.META.creditLine }),
      el('span', { class: 'auvp-foot-links' }, [
        el('a', {
          class: 'auvp-link',
          href: AUVP.META.originalStoreUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          text: 'extensão original no Chrome'
        })
      ])
    ]));

    return root;
  }

  function buildCard(v) {
    var href = '/watch?v=' + v.videoId;
    var watched = !!state.watched[v.videoId];
    var ch = AUVP.channelByKey(v.channelKey);

    var img = el('img', {
      class: 'auvp-img',
      src: v.thumb,
      alt: '',
      loading: 'lazy',
      decoding: 'async',
      referrerpolicy: 'no-referrer'
    });
    img.addEventListener('error', function () {
      if (v.thumbFallback && img.src !== v.thumbFallback) { img.src = v.thumbFallback; }
    });

    var thumbLink = el('a', { class: 'auvp-thumb', href: href, 'aria-label': v.title }, [
      img,
      watched ? el('span', { class: 'auvp-flag', text: 'assistido' }) : null
    ]);

    var sub = el('div', { class: 'auvp-sub' }, [
      el('span', {
        class: 'auvp-chan',
        style: ch ? 'color:' + ch.color : null,
        text: v.channelName || v.author || ''
      }),
      el('span', { class: 'auvp-dot', text: '·' }),
      el('span', { class: 'auvp-date', title: AUVP.absoluteDate(v.published), text: AUVP.relativeDate(v.published) }),
      v.views ? el('span', { class: 'auvp-dot', text: '·' }) : null,
      v.views ? el('span', { class: 'auvp-views', text: AUVP.compactNumber(v.views) + ' views' }) : null
    ]);

    var btns = el('div', { class: 'auvp-btns' }, [
      el('button', {
        class: 'auvp-mini' + (isLater(v.videoId) ? ' auvp-mini-on' : ''),
        type: 'button',
        title: isLater(v.videoId) ? 'Remover da minha lista' : 'Salvar na minha lista para assistir depois',
        text: isLater(v.videoId) ? '★ Na lista' : '☆ Assistir depois',
        onclick: function () {
          toggleLater(v.videoId).then(function () {
            toast(isLater(v.videoId) ? 'Salvo na sua lista.' : 'Removido da sua lista.');
            renderShelf();
          });
        }
      }),
      el('button', {
        class: 'auvp-mini' + (watched ? ' auvp-mini-on' : ''),
        type: 'button',
        title: watched ? 'Marcar como não assistido' : 'Marcar como assistido',
        text: watched ? '✓ Assistido' : 'Marcar assistido',
        onclick: function () {
          markWatched(v.videoId, !watched).then(function () { renderShelf(); });
        }
      }),
      el('button', {
        class: 'auvp-mini',
        type: 'button',
        title: 'Copiar o link do vídeo',
        text: '⇪ Compartilhar',
        onclick: function () { copyLink(AUVP.watchUrl(v.videoId)); }
      })
    ]);

    return el('article', {
      class: 'auvp-card' + (watched ? ' auvp-card-watched' : ''),
      dataset: { auvpVid: v.videoId }
    }, [
      thumbLink,
      el('div', { class: 'auvp-meta' }, [
        el('a', { class: 'auvp-title', href: href, title: v.title, text: v.title }),
        sub,
        btns
      ])
    ]);
  }

  /* ================= ciclo de vida ================= */

  var lastUrl = location.href;
  var sweepTimer = null;

  function scheduleSweep() {
    if (sweepTimer) { return; }
    sweepTimer = setTimeout(function () {
      sweepTimer = null;
      sweepShorts();
      if (isHome() && state.settings && state.settings.shelfEnabled && !document.getElementById(SHELF_ID)) {
        renderShelf();
      }
    }, 250);
  }

  function onNavigate() {
    if (redirectShortsIfNeeded()) { return; }
    state.query = '';
    state.limit = 8;
    detachWatchHook();
    watchHook.videoId = null;
    if (isHome()) { renderShelf(); } else { removeShelf(); }
    hookWatchPage();
    sweepShorts();
  }

  function start() {
    applyCachedFlagsEarly();

    loadFromStorage().then(function () {
      applyFlags(state.settings);
      if (redirectShortsIfNeeded()) { return; }

      renderShelf();
      hookWatchPage();
      sweepShorts();

      /* dados velhos? atualiza em segundo plano */
      var idade = Date.now() - (state.fetchedAt || 0);
      if (!state.videos.length || idade > 30 * 60 * 1000) {
        refreshFromPage().then(function (cache) {
          if (!cache) { return; }
          state.videos = cache.videos;
          state.fetchedAt = cache.fetchedAt;
          state.errors = cache.errors || [];
          renderShelf();
          try { api.runtime.sendMessage({ type: 'auvp:badgeRefresh' }); } catch (e) { /* ignora */ }
        }).catch(function () { renderShelf(); });
      }
    });

    /* navegação interna do YouTube */
    ['yt-navigate-finish', 'yt-page-data-updated', 'yt-navigate-start'].forEach(function (evt) {
      window.addEventListener(evt, function () {
        if (location.href !== lastUrl) { lastUrl = location.href; }
        onNavigate();
      }, true);
    });

    setInterval(function () {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onNavigate();
      }
    }, 800);

    var obs = new MutationObserver(scheduleSweep);
    function observe() {
      var target = document.body || document.documentElement;
      if (target) { obs.observe(target, { childList: true, subtree: true }); }
    }
    if (document.body) { observe(); } else {
      document.addEventListener('DOMContentLoaded', observe, { once: true });
    }

    /* mudanças feitas no popup refletem na página na hora */
    if (api.storage && api.storage.onChanged) {
      api.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') { return; }
        loadFromStorage().then(function () {
          applyFlags(state.settings);
          renderShelf();
        });
      });
    }

    /* o script de fundo pode pedir que a página faça a busca (mesma origem) */
    api.runtime.onMessage.addListener(function (msg) {
      if (!msg || msg.type !== 'auvp:refreshFromPage') { return undefined; }
      return AUVP.refreshAll().then(function (cache) {
        state.videos = cache.videos;
        state.fetchedAt = cache.fetchedAt;
        state.errors = cache.errors || [];
        renderShelf();
        return { ok: true, cache: cache };
      }).catch(function (err) {
        return { ok: false, error: String(err && err.message ? err.message : err) };
      });
    });
  }

  start();
})();
