# AUVP Play para Firefox (não oficial)

> Na lista de extensões do navegador ela aparece como **"AUVP Play (não oficial)"** — a
> Mozilla não permite as palavras "Firefox" ou "Mozilla" no nome de nenhuma extensão.

Reúne os vídeos mais recentes dos canais **Investidor Sardinha**, **AUVP Capital**,
**AUVP Agro** e **AUVP Atlas** no topo da página inicial do YouTube, com busca,
filtros, ordenação e controle de Shorts.

> **Créditos:** baseado na extensão original para Chrome **AUVP Play**, criada por
> **Matheus Satake de Souza**
> (<https://chromewebstore.google.com/detail/auvp-play/akjmabmimndjlnbgficabihjclinbpdc>).
> Este é um port independente e **não oficial** para Firefox, com o código escrito
> do zero. Detalhes em [CREDITS.md](CREDITS.md).

---

## Como instalar

**Baixe o arquivo assinado:**
👉 **[Página de download (Releases)](https://github.com/marcos123dev/webapp/releases/latest)** — ou [link direto do arquivo](https://github.com/marcos123dev/webapp/raw/main/auvp-play/dist/auvp-play-1.0.0.xpi)

Depois, no Firefox: menu **☰** → **Extensões e temas** → **engrenagem ⚙** →
**"Instalar extensão a partir de arquivo…"** → escolha o `.xpi` baixado → **Adicionar**.

O arquivo é assinado pela Mozilla, então instala de forma permanente, como qualquer
outra extensão. Requer **Firefox 142 ou mais recente**.

O passo a passo detalhado, em linguagem simples e com solução de problemas, está em
**[INSTALACAO.md](INSTALACAO.md)**.

## O que a extensão faz

| Recurso | Como funciona |
|---|---|
| Prateleira AUVP no topo da home | Mostra os vídeos dos 4 canais acima do feed normal do YouTube |
| Filtrar por canal | Clique nas "pílulas" coloridas para ligar/desligar cada canal |
| Ordenar | Mais recentes, mais antigos ou mais vistos |
| Buscar só nos vídeos da AUVP | Campo de busca que ignora acentos e procura no título e na descrição |
| Assistir depois | Salva o vídeo numa lista pessoal (botão ☆) |
| Reproduzir fila | Abre os vídeos listados como uma fila de reprodução no YouTube |
| Compartilhar | Copia o link do vídeo para a área de transferência |
| Ocultar assistidos | Esconde da prateleira o que você já viu |
| Marcar automaticamente | Marca como visto após 30 s ou 15% do vídeo |
| Ocultar recomendações | Deixa a página inicial só com a prateleira da AUVP |
| Ocultar Shorts | Remove prateleiras, itens e atalhos de Shorts do YouTube |
| Abrir Shorts como vídeo | Links `/shorts` passam a abrir no player normal |
| Contador no ícone | Mostra quantos vídeos da AUVP ainda não foram assistidos |

Tudo é ligado e desligado pelo ícone da extensão, na barra do Firefox.

## Privacidade

- **Nenhum dado é coletado, enviado ou compartilhado.** Não há servidor próprio,
  analytics nem telemetria.
- A lista de vídeos vem do **feed público do YouTube**
  (`youtube.com/feeds/videos.xml`), que não exige login nem chave de API.
- As preferências, a lista "assistir depois" e o histórico de assistidos ficam
  **somente no seu computador** (`storage.local` do Firefox).
- A extensão só roda em páginas do `youtube.com`.
- Permissões usadas: `storage` (salvar preferências), `alarms` (atualizar
  periodicamente), `clipboardWrite` (copiar link) e acesso a `youtube.com`.

## Diferenças em relação à extensão original

Foram decisões técnicas conscientes, para que a versão do Firefox funcione sem login
e sem depender de APIs internas e instáveis do YouTube:

1. **"Assistir depois" é uma lista local.** A original adiciona à playlist "Assistir
   mais tarde" da sua conta Google. Fazer isso exigiria usar a API interna não
   documentada do YouTube com as suas credenciais — frágil e invasivo. Aqui a lista
   fica salva no navegador e o botão **"Reproduzir fila"** abre os vídeos como uma
   fila de reprodução real do YouTube.
2. **"Ocultar assistidos" não precisa de login.** A original depende da sua conta;
   esta versão registra localmente o que você assistiu (automática ou manualmente).
3. **Até 15 vídeos por canal (60 no total).** É o que o feed público do YouTube
   entrega. Para o objetivo (ver as novidades dos canais) isso cobre semanas.
4. **O feed público não separa Shorts de vídeos normais**, então um Short eventualmente
   pode aparecer na prateleira. A opção "Ocultar Shorts" continua valendo para o
   restante do YouTube.
5. **Sem código de indicação.** O botão "Seja aluno" leva ao site público da AUVP, sem
   o link de afiliado do autor original, que pertence a ele.

## Estrutura do projeto

```
auvp-play-firefox/
├── manifest.json        Configuração da extensão (Manifest V3 para Gecko/Firefox)
├── src/
│   ├── common.js        Canais, leitura do feed, armazenamento e filtros
│   ├── background.js    Atualização periódica e contador do ícone
│   ├── content.js       Monta a prateleira dentro do YouTube
│   └── content.css      Estilos da prateleira (tema claro e escuro)
├── popup/
│   ├── popup.html       Menu do ícone da extensão
│   ├── popup.css
│   └── popup.js
├── icons/               Ícones originais (PNG 16/32/48/96/128 + SVG)
├── README.md
├── CREDITS.md           Créditos ao autor original
├── INSTALACAO.md        Guia passo a passo
└── LICENSE
```

## Notas técnicas

- **Manifest V3 para Firefox (Gecko)**: usa `background.scripts` (event page), e não
  `service_worker`, que o Firefox não suporta em MV3. Inclui `browser_specific_settings`
  com um ID válido, `strict_min_version` 142 e `data_collection_permissions` declarando que nada é coletado.
- **Sem erros de CSP ou Trusted Types**: a página do YouTube aplica
  `require-trusted-types-for`, que bloqueia `DOMParser` e `innerHTML`. Por isso o feed
  XML é lido por um parser próprio baseado em expressões regulares, e toda a interface é
  construída com `createElement`/`textContent`. Não há `eval`, script inline nem estilo
  inline no HTML.
- **Sem problemas de CORS**: as requisições são feitas para o mesmo domínio
  (`www.youtube.com`) a partir do content script; o script de fundo também pode buscar,
  e cai de volta para o content script se a permissão de host não estiver concedida.
- **IDs dos canais**: ficam fixos no código, mas se algum mudar a extensão redescobre o
  ID automaticamente a partir do `@handle` do canal.
- **API `browser.*` com fallback para `chrome.*`**, então o mesmo código roda também em
  navegadores baseados em Chromium.

## Testes

```bash
node tests/test-parser.js    # testes do parser do feed, filtros e ordenação
npx web-ext lint             # validação oficial da Mozilla
```
