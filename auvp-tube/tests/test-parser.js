const A = require(require('path').join(__dirname,'../src/common.js'));
const fs = require('fs');
let fail = 0;
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fail++; console.log('  FALHOU ' + label + ' -> obtido:', JSON.stringify(got), '| esperado:', JSON.stringify(want)); }
  else { console.log('  ok  ' + label); }
}

const xml = fs.readFileSync(require('path').join(__dirname,'feed-sample.xml'), 'utf8');
const v = A.parseFeed(xml);
console.log('parseFeed:');
check('quantidade de entradas', v.length, 2);
check('videoId', v[0].videoId, 'nVtC7ZiQhgk');
check('titulo com acento', v[0].title, 'A bolsa de valores é igual um cassino?');
check('canal (author name)', v[0].author, 'Investidor Sardinha l Raul Sena');
check('channelId da entrada (com UC)', v[0].channelId, 'UCM3vJxmuJJkk1r0yzFI9eZg');
check('views', v[0].views, 9404);
check('likes', v[0].likes, 1974);
check('thumb 16:9', v[0].thumb, 'https://i.ytimg.com/vi/nVtC7ZiQhgk/mqdefault.jpg');
check('entidade & na descricao', v[0].description, 'Aprenda a investir: debêntures & renda fixa. Preço < valor.');
check('nao pega media:title no lugar do title', v[1].title, 'Lula declarou guerra ao mercado & quem paga é você');
check('videoId com - e _', v[1].videoId, 'AbC-123_xyZ');
check('views ausente = 0', v[1].views, 0);

console.log('entidades e normalizacao:');
check('decodeEntities numerica', A.decodeEntities('a&#233;b&#x1F600;'), 'aéb\u{1F600}');
check('normalize sem acento', A.normalize('Debêntures AÇÃO'), 'debentures acao');
check('xml vazio', A.parseFeed(''), []);
check('xml lixo', A.parseFeed('<feed><entry><yt:videoId>x</yt:videoId></entry></feed>'), []);

console.log('ordenacao e filtros:');
const videos = [
  { videoId: 'a', channelKey: 'sardinha', channelName: 'Investidor Sardinha', title: 'Renda fixa hoje', description: '', published: '2026-11-25T00:00:00+00:00', views: 10 },
  { videoId: 'b', channelKey: 'capital', channelName: 'AUVP Capital', title: 'Ações americanas', description: 'bolsa', published: '2026-11-01T00:00:00+00:00', views: 900 },
  { videoId: 'c', channelKey: 'agro', channelName: 'AUVP Agro', title: 'Tratores', description: '', published: '2026-11-10T00:00:00+00:00', views: 50 }
];
const base = Object.assign({}, A.DEFAULT_SETTINGS);
check('mais recentes primeiro', A.selectVideos(videos, base, {}, '').map(x => x.videoId), ['a', 'c', 'b']);
check('mais antigos primeiro', A.selectVideos(videos, Object.assign({}, base, { sortOrder: 'oldest' }), {}, '').map(x => x.videoId), ['b', 'c', 'a']);
check('por visualizacoes', A.selectVideos(videos, Object.assign({}, base, { sortOrder: 'views' }), {}, '').map(x => x.videoId), ['b', 'c', 'a']);
check('filtro de canal', A.selectVideos(videos, Object.assign({}, base, { channels: ['agro'] }), {}, '').map(x => x.videoId), ['c']);
check('busca sem acento acha "acoes"', A.selectVideos(videos, base, {}, 'acoes').map(x => x.videoId), ['b']);
check('busca em 2 termos', A.selectVideos(videos, base, {}, 'auvp bolsa').map(x => x.videoId), ['b']);
check('oculta assistidos', A.selectVideos(videos, Object.assign({}, base, { hideWatched: true }), { a: 1 }, '').map(x => x.videoId), ['c', 'b']);
check('busca sem resultado', A.selectVideos(videos, base, {}, 'xpto').length, 0);

console.log('utilitarios:');
check('playlist url', A.playlistUrl(['a', 'b']), 'https://www.youtube.com/watch_videos?video_ids=a,b');
check('playlist vazia', A.playlistUrl([]), null);
check('numero compacto mil', A.compactNumber(9404), '9,4 mil');
check('numero compacto milhao', A.compactNumber(1250000), '1,3 mi');
check('numero pequeno', A.compactNumber(626), '626');
check('canal por chave', A.channelByKey('atlas').name, 'AUVP Atlas');

console.log(fail === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + fail + ' TESTE(S) FALHARAM');
process.exit(fail === 0 ? 0 : 1);
