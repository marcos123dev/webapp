/*
 * AUVP Tube — script de fundo
 *
 * Extensão independente para Firefox, inspirada na extensão AUVP Play para
 * Chrome, de Matheus Satake de Souza. Código escrito do zero.
 *
 * Responsabilidades:
 *  - gravar as configurações padrão na instalação;
 *  - atualizar os vídeos periodicamente;
 *  - responder às mensagens do popup e do content script;
 *  - mostrar no ícone quantos vídeos novos ainda não foram assistidos.
 *
 * Em Firefox MV3 este é um "event page": pode ser encerrado quando ocioso,
 * por isso todos os listeners são registrados no topo do arquivo e nada
 * importante fica guardado apenas na memória.
 */
(function () {
  'use strict';

  var api = AUVP.api;
  var ALARM = 'auvp-refresh';

  /* ---------------- contador no ícone ---------------- */

  function updateBadge() {
    return Promise.all([AUVP.getSettings(), AUVP.getState()]).then(function (r) {
      var settings = r[0];
      var state = r[1];
      if (!settings.showBadge) {
        return setBadge('');
      }
      var active = settings.channels || [];
      var novos = (state.cache.videos || []).filter(function (v) {
        return active.indexOf(v.channelKey) !== -1 && !state.watched[v.videoId];
      }).length;
      return setBadge(novos > 0 ? String(novos > 99 ? '99+' : novos) : '');
    }).catch(function () { /* nada a fazer */ });
  }

  function setBadge(text) {
    try {
      if (!api.action) { return Promise.resolve(); }
      api.action.setBadgeText({ text: text });
      if (api.action.setBadgeBackgroundColor) {
        api.action.setBadgeBackgroundColor({ color: '#1f9d55' });
      }
      if (api.action.setBadgeTextColor) {
        api.action.setBadgeTextColor({ color: '#ffffff' });
      }
    } catch (e) { /* ignora */ }
    return Promise.resolve();
  }

  /* ---------------- atualização ---------------- */

  /* Tenta buscar no próprio script de fundo. Se a permissão de host não
     estiver concedida, pede a uma aba do YouTube para buscar (mesma origem). */
  function refresh() {
    return AUVP.refreshAll()
      .then(function (cache) {
        if (!cache.videos.length && cache.errors.length) {
          return refreshViaTab().catch(function () { return cache; });
        }
        return cache;
      })
      .catch(function () { return refreshViaTab(); })
      .then(function (cache) {
        return updateBadge().then(function () { return cache; });
      });
  }

  function refreshViaTab() {
    if (!api.tabs || !api.tabs.query) { return Promise.reject(new Error('sem acesso a abas')); }
    return api.tabs.query({ url: ['*://www.youtube.com/*', '*://m.youtube.com/*'] }).then(function (tabs) {
      if (!tabs || !tabs.length) {
        throw new Error('Abra uma aba do YouTube para atualizar os vídeos.');
      }
      var lastErr = new Error('falha ao atualizar');
      function tryTab(i) {
        if (i >= tabs.length) { throw lastErr; }
        return api.tabs.sendMessage(tabs[i].id, { type: 'auvp:refreshFromPage' })
          .then(function (res) {
            if (res && res.ok) { return res.cache; }
            throw new Error((res && res.error) || 'sem resposta da aba');
          })
          .catch(function (err) { lastErr = err; return tryTab(i + 1); });
      }
      return tryTab(0);
    });
  }

  function ensureAlarm() {
    return AUVP.getSettings().then(function (s) {
      var minutes = Math.max(15, Number(s.refreshMinutes) || 30);
      if (!api.alarms) { return; }
      return Promise.resolve(api.alarms.get(ALARM)).then(function (existing) {
        if (existing && Math.abs((existing.periodInMinutes || 0) - minutes) < 0.01) { return; }
        api.alarms.create(ALARM, { periodInMinutes: minutes, delayInMinutes: 1 });
      }).catch(function () {
        api.alarms.create(ALARM, { periodInMinutes: minutes, delayInMinutes: 1 });
      });
    });
  }

  /* ---------------- listeners ---------------- */

  api.runtime.onInstalled.addListener(function () {
    AUVP.getSettings()
      .then(function (s) { return AUVP.saveSettings(s); })
      .then(ensureAlarm)
      .then(refresh);
  });

  if (api.runtime.onStartup) {
    api.runtime.onStartup.addListener(function () {
      ensureAlarm().then(updateBadge);
    });
  }

  if (api.alarms && api.alarms.onAlarm) {
    api.alarms.onAlarm.addListener(function (alarm) {
      if (alarm && alarm.name === ALARM) { refresh(); }
    });
  }

  api.runtime.onMessage.addListener(function (msg) {
    if (!msg || !msg.type) { return undefined; }

    if (msg.type === 'auvp:refresh') {
      return refresh()
        .then(function (cache) { return { ok: true, cache: cache }; })
        .catch(function (err) { return { ok: false, error: String(err && err.message ? err.message : err) }; });
    }

    if (msg.type === 'auvp:getData') {
      return Promise.all([AUVP.getSettings(), AUVP.getState()]).then(function (r) {
        return { ok: true, settings: r[0], state: r[1] };
      });
    }

    if (msg.type === 'auvp:badgeRefresh') {
      return updateBadge().then(function () { return { ok: true }; });
    }

    return undefined;
  });

  /* Mantém o contador em dia quando o usuário marca vídeos como assistidos. */
  if (api.storage && api.storage.onChanged) {
    api.storage.onChanged.addListener(function (changes, areaName) {
      if (areaName !== 'local') { return; }
      if (changes[AUVP.KEYS.watched] || changes[AUVP.KEYS.cache] || changes[AUVP.KEYS.settings]) {
        updateBadge();
      }
    });
  }

  /* Primeira carga quando a extensão é ativada. */
  ensureAlarm().then(function () {
    return AUVP.getState();
  }).then(function (state) {
    var idade = Date.now() - (state.cache.fetchedAt || 0);
    if (!state.cache.videos.length || idade > 30 * 60 * 1000) { return refresh(); }
    return updateBadge();
  });
})();
