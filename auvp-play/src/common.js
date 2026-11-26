/*
 * AUVP Tube — módulo comum
 *
 * Extensão independente para Firefox, inspirada na extensão AUVP Play para
 * Chrome, de Matheus Satake de Souza. Código escrito do zero.
 * Este arquivo foi escrito do zero: nenhum código da extensão original foi copiado.
 *
 * Observação técnica: a página do YouTube aplica "Trusted Types", que bloqueia
 * DOMParser e innerHTML. Por isso o feed é lido com um parser próprio baseado em
 * expressões regulares e toda a interface é construída com createElement/textContent.
 * Assim a extensão nunca viola a CSP do YouTube.
 */
var AUVP = (function () {
  'use strict';

  var api = (typeof browser !== 'undefined' && browser && browser.storage) ? browser
    : ((typeof chrome !== 'undefined' && chrome && chrome.storage) ? chrome : null);

  var META = {
    version: '1.0.2',
    originalAuthor: 'Matheus Satake de Souza',
    originalStoreUrl: 'https://chromewebstore.google.com/detail/auvp-play/akjmabmimndjlnbgficabihjclinbpdc',
    ctaUrl: 'https://auvp.net/?id=AUVP25-I7I5T',
    ctaNote: 'Link de indicação do mantenedor desta versão',
    creditLine: 'Inspirado na extensão AUVP Play para Chrome, de Matheus Satake de Souza'
  };

  /* Canais da AUVP. Os IDs foram verificados diretamente no YouTube;
     se algum mudar, a extensão redescobre o ID pelo @handle automaticamente. */
  var CHANNELS = [
    { key: 'sardinha', name: 'Investidor Sardinha', handle: 'investidorsardinha', id: 'UCM3vJxmuJJkk1r0yzFI9eZg', color: '#2f6fed' },
    { key: 'capital',  name: 'AUVP Capital',        handle: 'auvpcapital',        id: 'UCtXWjt7GelTcrlaHVey00WQ', color: '#8b5cf6' },
    { key: 'agro',     name: 'AUVP Agro',           handle: 'auvpagro',           id: 'UCI7kwFJ4W2k69Uuv4PH3ZXw', color: '#1f9d55' },
    { key: 'atlas',    name: 'AUVP Atlas',          handle: 'auvpatlas',          id: 'UC1Ef1W0-XenuFMqMyeNXRzQ', color: '#d08700' }
  ];

  var DEFAULT_SETTINGS = {
    shelfEnabled: true,        // mostrar a prateleira AUVP no topo da home
    hideRecommendations: false, // ocultar o feed de recomendações da home
    hideShorts: false,          // ocultar Shorts em todo o YouTube
    shortsAsVideo: true,        // abrir links de Shorts no player normal
    hideWatched: false,         // ocultar da prateleira os vídeos já assistidos
    autoMarkWatched: true,      // marcar como assistido ao assistir no player
    sortOrder: 'recent',        // 'recent' | 'oldest' | 'views'
    channels: ['sardinha', 'capital', 'agro', 'atlas'],
    collapsed: false,
    showBadge: true,
    refreshMinutes: 30
  };

  var KEYS = {
    settings: 'settings',
    cache: 'cache',
    watched: 'watched',
    later: 'later',
    resolved: 'resolvedIds'
  };

  /* ---------------- armazenamento ---------------- */

  function storageGet(keys) {
    var r = api.storage.local.get(keys);
    if (r && typeof r.then === 'function') { return r; }
    return new Promise(function (resolve) { api.storage.local.get(keys, resolve); });
  }

  function storageSet(obj) {
    var r = api.storage.local.set(obj);
    if (r && typeof r.then === 'function') { return r; }
    return new Promise(function (resolve) { api.storage.local.set(obj, resolve); });
  }

  function getSettings() {
    return storageGet(KEYS.settings).then(function (data) {
      var s = {};
      var stored = (data && data[KEYS.settings]) || {};
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        s[k] = (stored[k] === undefined) ? DEFAULT_SETTINGS[k] : stored[k];
      });
      if (!Array.isArray(s.channels) || s.channels.length === 0) {
        s.channels = DEFAULT_SETTINGS.channels.slice();
      }
      return s;
    });
  }

  function saveSettings(patch) {
    return getSettings().then(function (cur) {
      var next = Object.assign({}, cur, patch);
      var out = {};
      out[KEYS.settings] = next;
      return storageSet(out).then(function () { return next; });
    });
  }

  function getState() {
    return storageGet([KEYS.cache, KEYS.watched, KEYS.later, KEYS.resolved]).then(function (d) {
      return {
        cache: (d && d[KEYS.cache]) || { fetchedAt: 0, videos: [], errors: [] },
        watched: (d && d[KEYS.watched]) || {},
        later: Array.isArray(d && d[KEYS.later]) ? d[KEYS.later] : [],
        resolved: (d && d[KEYS.resolved]) || {}
      };
    });
  }

  /* ---------------- texto ---------------- */

  var NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

  function decodeEntities(s) {
    if (!s) { return ''; }
    return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (m, g) {
      if (g.charAt(0) === '#') {
        var hex = (g.charAt(1) === 'x' || g.charAt(1) === 'X');
        var n = hex ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        if (isNaN(n) || n < 0 || n > 0x10FFFF) { return m; }
        try { return String.fromCodePoint(n); } catch (e) { return m; }
      }
      var v = NAMED[g.toLowerCase()];
      return (v === undefined) ? m : v;
    });
  }

  function normalize(s) {
    return decodeEntities(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  function firstTag(block, name) {
    var re = new RegExp('<' + name.replace(':', ':') + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>');
    var m = block.match(re);
    return m ? decodeEntities(m[1].trim()) : null;
  }

  function attrOf(block, tag, attr) {
    var re = new RegExp('<' + tag + '\\b[^>]*\\b' + attr + '="([^"]*)"');
    var m = block.match(re);
    return m ? decodeEntities(m[1]) : null;
  }

  /* ---------------- leitura do feed público do YouTube ---------------- */

  function parseFeed(xml) {
    var videos = [];
    if (!xml || typeof xml !== 'string') { return videos; }
    var re = /<entry>([\s\S]*?)<\/entry>/g;
    var m;
    while ((m = re.exec(xml)) !== null) {
      var b = m[1];
      var videoId = firstTag(b, 'yt:videoId');
      if (!videoId || !/^[A-Za-z0-9_-]{8,16}$/.test(videoId)) { continue; }
      var authorMatch = b.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/);
      videos.push({
        videoId: videoId,
        channelId: firstTag(b, 'yt:channelId') || '',
        title: firstTag(b, 'title') || '(sem título)',
        author: decodeEntities(authorMatch ? authorMatch[1].trim() : ''),
        published: firstTag(b, 'published') || firstTag(b, 'updated') || null,
        description: (firstTag(b, 'media:description') || '').slice(0, 1200),
        thumb: 'https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg',
        thumbFallback: attrOf(b, 'media:thumbnail', 'url') || '',
        views: parseInt(attrOf(b, 'media:statistics', 'views') || '0', 10) || 0,
        likes: parseInt(attrOf(b, 'media:starRating', 'count') || '0', 10) || 0
      });
    }
    return videos;
  }

  function feedUrl(channelId) {
    return 'https://www.youtube.com/feeds/videos.xml?channel_id=' + encodeURIComponent(channelId);
  }

  function fetchText(url) {
    return fetch(url, { credentials: 'omit', cache: 'no-store', redirect: 'follow' })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.text();
      });
  }

  /* Redescobre o channelId a partir do @handle, caso o ID fixo deixe de valer. */
  function resolveChannelId(handle) {
    return fetchText('https://www.youtube.com/@' + encodeURIComponent(handle)).then(function (html) {
      var m = html.match(/"(?:channelId|externalId)":"(UC[A-Za-z0-9_-]{20,24})"/);
      if (!m) { throw new Error('channelId não encontrado para @' + handle); }
      return m[1];
    });
  }

  function fetchChannel(channel, resolvedIds) {
    var id = (resolvedIds && resolvedIds[channel.key]) || channel.id;
    return fetchText(feedUrl(id))
      .then(function (xml) { return { videos: parseFeed(xml), id: id }; })
      .then(function (r) {
        if (r.videos.length === 0) { throw new Error('feed vazio'); }
        return r;
      })
      .catch(function () {
        /* fallback: redescobre o ID pelo handle e tenta de novo */
        return resolveChannelId(channel.handle).then(function (newId) {
          return fetchText(feedUrl(newId)).then(function (xml) {
            return { videos: parseFeed(xml), id: newId, rediscovered: true };
          });
        });
      });
  }

  /* Busca os 4 canais e devolve a lista unificada. */
  function refreshAll() {
    return getState().then(function (state) {
      var resolved = Object.assign({}, state.resolved);
      var errors = [];
      var jobs = CHANNELS.map(function (ch) {
        return fetchChannel(ch, resolved).then(function (r) {
          if (r.rediscovered && r.id) { resolved[ch.key] = r.id; }
          return r.videos.map(function (v) {
            v.channelKey = ch.key;
            v.channelName = ch.name;
            return v;
          });
        }).catch(function (err) {
          errors.push({ channel: ch.name, message: String(err && err.message ? err.message : err) });
          return [];
        });
      });

      return Promise.all(jobs).then(function (lists) {
        var seen = Object.create(null);
        var videos = [];
        lists.forEach(function (list) {
          list.forEach(function (v) {
            if (seen[v.videoId]) { return; }
            seen[v.videoId] = true;
            videos.push(v);
          });
        });
        videos.sort(function (a, b) { return tsOf(b) - tsOf(a); });

        var cache = { fetchedAt: Date.now(), videos: videos, errors: errors };
        var out = {};
        out[KEYS.cache] = cache;
        out[KEYS.resolved] = resolved;
        return storageSet(out).then(function () { return cache; });
      });
    });
  }

  function tsOf(v) {
    var t = v && v.published ? Date.parse(v.published) : NaN;
    return isNaN(t) ? 0 : t;
  }

  /* ---------------- formatação ---------------- */

  function relativeDate(iso) {
    var t = Date.parse(iso || '');
    if (isNaN(t)) { return ''; }
    var diff = Math.max(0, Date.now() - t);
    var min = Math.floor(diff / 60000);
    if (min < 1) { return 'agora mesmo'; }
    if (min < 60) { return 'há ' + min + (min === 1 ? ' minuto' : ' minutos'); }
    var h = Math.floor(min / 60);
    if (h < 24) { return 'há ' + h + (h === 1 ? ' hora' : ' horas'); }
    var d = Math.floor(h / 24);
    if (d < 30) { return 'há ' + d + (d === 1 ? ' dia' : ' dias'); }
    var mo = Math.floor(d / 30);
    if (mo < 12) { return 'há ' + mo + (mo === 1 ? ' mês' : ' meses'); }
    var y = Math.floor(mo / 12);
    return 'há ' + y + (y === 1 ? ' ano' : ' anos');
  }

  function absoluteDate(iso) {
    var t = Date.parse(iso || '');
    if (isNaN(t)) { return ''; }
    try {
      return new Date(t).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return new Date(t).toISOString(); }
  }

  function compactNumber(n) {
    n = Number(n) || 0;
    if (n < 1000) { return String(n); }
    if (n < 1000000) { return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace('.', ',') + ' mil'; }
    return (n / 1000000).toFixed(1).replace('.', ',') + ' mi';
  }

  function watchUrl(videoId) { return 'https://www.youtube.com/watch?v=' + videoId; }

  function playlistUrl(ids) {
    var list = (ids || []).filter(Boolean).slice(0, 50);
    if (list.length === 0) { return null; }
    return 'https://www.youtube.com/watch_videos?video_ids=' + list.join(',');
  }

  function channelByKey(key) {
    for (var i = 0; i < CHANNELS.length; i++) {
      if (CHANNELS[i].key === key) { return CHANNELS[i]; }
    }
    return null;
  }

  /* Aplica filtros/ordenação às opções escolhidas pelo usuário. */
  function selectVideos(videos, settings, watched, query) {
    var q = normalize(query || '').trim();
    var terms = q ? q.split(/\s+/) : [];
    var active = settings.channels || [];
    var out = (videos || []).filter(function (v) {
      if (active.indexOf(v.channelKey) === -1) { return false; }
      if (settings.hideWatched && watched && watched[v.videoId]) { return false; }
      if (terms.length) {
        var hay = normalize(v.title + ' ' + v.channelName + ' ' + v.description);
        for (var i = 0; i < terms.length; i++) {
          if (hay.indexOf(terms[i]) === -1) { return false; }
        }
      }
      return true;
    });
    if (settings.sortOrder === 'oldest') {
      out.sort(function (a, b) { return tsOf(a) - tsOf(b); });
    } else if (settings.sortOrder === 'views') {
      out.sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
    } else {
      out.sort(function (a, b) { return tsOf(b) - tsOf(a); });
    }
    return out;
  }

  return {
    api: api,
    META: META,
    CHANNELS: CHANNELS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    KEYS: KEYS,
    storageGet: storageGet,
    storageSet: storageSet,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getState: getState,
    decodeEntities: decodeEntities,
    normalize: normalize,
    parseFeed: parseFeed,
    feedUrl: feedUrl,
    fetchText: fetchText,
    resolveChannelId: resolveChannelId,
    refreshAll: refreshAll,
    tsOf: tsOf,
    relativeDate: relativeDate,
    absoluteDate: absoluteDate,
    compactNumber: compactNumber,
    watchUrl: watchUrl,
    playlistUrl: playlistUrl,
    channelByKey: channelByKey,
    selectVideos: selectVideos
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = AUVP; }
