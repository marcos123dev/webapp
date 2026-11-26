/*
 * AUVP Play para Firefox (não oficial) — lógica do popup
 *
 * Port independente para Firefox, baseado na extensão original para Chrome
 * "AUVP Play", criada por Matheus Satake de Souza.
 *
 * Sem scripts nem estilos embutidos no HTML: compatível com a CSP padrão
 * das extensões em Manifest V3.
 */
(function () {
  'use strict';

  var api = AUVP.api;
  var current = { settings: null, state: null };

  var TOGGLES = {
    'rows-home': [
      {
        key: 'shelfEnabled',
        name: 'Mostrar a prateleira da AUVP no topo',
        hint: 'Reúne os vídeos dos canais da AUVP acima do feed da página inicial.'
      },
      {
        key: 'hideRecommendations',
        name: 'Ocultar o feed de recomendações',
        hint: 'A página inicial passa a mostrar apenas a prateleira da AUVP.'
      }
    ],
    'rows-shorts': [
      {
        key: 'hideShorts',
        name: 'Ocultar os Shorts',
        hint: 'Remove as prateleiras e os itens de Shorts em todo o YouTube.'
      },
      {
        key: 'shortsAsVideo',
        name: 'Abrir Shorts no player normal',
        hint: 'Links de /shorts passam a abrir como vídeo comum, com controles.'
      }
    ],
    'rows-watched': [
      {
        key: 'hideWatched',
        name: 'Ocultar vídeos já assistidos',
        hint: 'Esconde da prateleira o que você já viu.'
      },
      {
        key: 'autoMarkWatched',
        name: 'Marcar automaticamente ao assistir',
        hint: 'Marca o vídeo depois de 30 segundos ou 15% de reprodução.'
      },
      {
        key: 'showBadge',
        name: 'Mostrar contador no ícone da extensão',
        hint: 'Número de vídeos da AUVP ainda não assistidos.'
      }
    ]
  };

  function $(id) { return document.getElementById(id); }

  function setMessage(text, kind) {
    var m = $('message');
    m.textContent = text || '';
    m.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function buildToggle(cfg) {
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'chk-' + cfg.key;
    input.checked = !!current.settings[cfg.key];
    input.addEventListener('change', function () {
      var patch = {};
      patch[cfg.key] = input.checked;
      AUVP.saveSettings(patch).then(function (next) {
        current.settings = next;
        if (cfg.key === 'showBadge') {
          try { api.runtime.sendMessage({ type: 'auvp:badgeRefresh' }); } catch (e) { /* ignora */ }
        }
        setMessage('Preferência salva.', 'ok');
      });
    });

    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = cfg.name;

    var hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = cfg.hint;

    var label = document.createElement('span');
    label.className = 'label';
    label.appendChild(name);
    label.appendChild(hint);

    var row = document.createElement('label');
    row.className = 'row';
    row.setAttribute('for', input.id);
    row.appendChild(input);
    row.appendChild(label);
    return row;
  }

  function renderToggles() {
    Object.keys(TOGGLES).forEach(function (containerId) {
      var box = $(containerId);
      box.textContent = '';
      TOGGLES[containerId].forEach(function (cfg) { box.appendChild(buildToggle(cfg)); });
    });
  }

  function renderChannels() {
    var box = $('channels');
    box.textContent = '';
    AUVP.CHANNELS.forEach(function (ch) {
      var on = (current.settings.channels || []).indexOf(ch.key) !== -1;
      var total = (current.state.cache.videos || []).filter(function (v) {
        return v.channelKey === ch.key;
      }).length;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.style.borderColor = ch.color;
      if (on) { btn.style.background = ch.color; }
      btn.textContent = ch.name + (total ? ' (' + total + ')' : '');
      btn.addEventListener('click', function () {
        var list = (current.settings.channels || []).slice();
        var i = list.indexOf(ch.key);
        if (i === -1) {
          list.push(ch.key);
        } else if (list.length > 1) {
          list.splice(i, 1);
        } else {
          setMessage('Mantenha pelo menos um canal selecionado.', 'err');
          return;
        }
        AUVP.saveSettings({ channels: list }).then(function (next) {
          current.settings = next;
          renderChannels();
          setMessage('Canais atualizados.', 'ok');
        });
      });
      box.appendChild(btn);
    });
  }

  function renderStats() {
    var cache = current.state.cache || { videos: [], fetchedAt: 0 };
    $('stat-videos').textContent = String((cache.videos || []).length);
    $('stat-updated').textContent = cache.fetchedAt
      ? AUVP.relativeDate(new Date(cache.fetchedAt).toISOString())
      : 'nunca';
    $('stat-watched').textContent = String(Object.keys(current.state.watched || {}).length);
    $('stat-later').textContent = String((current.state.later || []).length);

    if (cache.errors && cache.errors.length) {
      setMessage('Canais que não responderam: ' + cache.errors.map(function (e) {
        return e.channel;
      }).join(', ') + '.', 'err');
    }
  }

  function renderSort() {
    $('sortOrder').value = current.settings.sortOrder || 'recent';
  }

  function renderCredits() {
    $('version').textContent = 'v' + AUVP.META.version;
    $('credit').textContent = AUVP.META.creditLine + '.';
    $('link-original').href = AUVP.META.originalStoreUrl;
    $('link-auvp').href = AUVP.META.auvpSite;
  }

  function openTab(url) {
    if (api.tabs && api.tabs.create) {
      api.tabs.create({ url: url });
      window.close();
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  function load() {
    return Promise.all([AUVP.getSettings(), AUVP.getState()]).then(function (r) {
      current.settings = r[0];
      current.state = r[1];
      renderCredits();
      renderToggles();
      renderChannels();
      renderSort();
      renderStats();
    });
  }

  function wire() {
    $('sortOrder').addEventListener('change', function (ev) {
      AUVP.saveSettings({ sortOrder: ev.target.value }).then(function (next) {
        current.settings = next;
        setMessage('Ordenação salva.', 'ok');
      });
    });

    $('btn-refresh').addEventListener('click', function () {
      var btn = $('btn-refresh');
      btn.disabled = true;
      btn.textContent = 'Atualizando…';
      setMessage('Buscando os vídeos mais recentes…');

      Promise.resolve(api.runtime.sendMessage({ type: 'auvp:refresh' })).then(function (res) {
        if (res && res.ok) {
          return AUVP.getState().then(function (st) {
            current.state = st;
            renderChannels();
            renderStats();
            var n = (st.cache.videos || []).length;
            setMessage(n + ' vídeos carregados.', 'ok');
          });
        }
        setMessage((res && res.error) || 'Não foi possível atualizar agora.', 'err');
      }).catch(function (err) {
        setMessage('Falha ao atualizar: ' + (err && err.message ? err.message : err), 'err');
      }).then(function () {
        btn.disabled = false;
        btn.textContent = 'Atualizar vídeos';
      });
    });

    $('btn-open').addEventListener('click', function () {
      openTab('https://www.youtube.com/');
    });

    $('btn-playlist').addEventListener('click', function () {
      var url = AUVP.playlistUrl(current.state.later || []);
      if (!url) {
        setMessage('Sua lista está vazia. Salve vídeos com o ☆ na prateleira.', 'err');
        return;
      }
      openTab(url);
    });

    $('btn-clear').addEventListener('click', function () {
      var out = {};
      out[AUVP.KEYS.watched] = {};
      AUVP.storageSet(out).then(function () {
        current.state.watched = {};
        renderStats();
        try { api.runtime.sendMessage({ type: 'auvp:badgeRefresh' }); } catch (e) { /* ignora */ }
        setMessage('Histórico de assistidos limpo.', 'ok');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    load().then(wire).catch(function (err) {
      setMessage('Erro ao carregar: ' + (err && err.message ? err.message : err), 'err');
    });
  });
})();
