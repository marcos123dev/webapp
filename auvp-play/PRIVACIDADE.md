# Política de privacidade — AUVP Tube

**Resumo: o AUVP Tube não coleta, não armazena em servidores e não compartilha nenhum dado
pessoal. Não há servidor próprio, não há analytics e não há telemetria.**

Última atualização: 26 de novembro de 2026.

## Dados que a extensão coleta

Nenhum. O autor da extensão não recebe nada sobre você: nem o que você assiste, nem o que
você clica, nem identificadores, nem estatísticas de uso.

## Dados que ficam no seu navegador

Tudo que a extensão guarda fica apenas no seu computador, na área de armazenamento local
do Firefox (`storage.local`), e nunca sai dele:

- suas preferências (quais canais mostrar, ordenação, o que ocultar);
- a lista de vídeos que você salvou em "assistir depois";
- quais vídeos você marcou como assistidos;
- uma cópia temporária da lista de vídeos recentes dos canais, para a prateleira abrir rápido.

Esses dados são apagados quando você desinstala a extensão. Você também pode limpar o
histórico de assistidos a qualquer momento, pelo botão no menu da extensão.

## Conexões que a extensão faz

A extensão acessa apenas endereços públicos do YouTube, sem login e sem chave de API:

- `https://www.youtube.com/feeds/videos.xml` — o feed público de cada canal, para obter a
  lista de vídeos recentes;
- `https://i.ytimg.com/` — as imagens de capa dos vídeos;
- `https://www.youtube.com/@...` — apenas se o identificador de algum canal mudar, para
  redescobri-lo.

Nenhuma dessas requisições envia dados seus. Nenhuma passa por servidores do autor, porque
não existe servidor do autor.

## Link de indicação

O botão "Seja aluno" abre um endereço da AUVP com o código de indicação do autor da
extensão. Ele **só abre quando você clica**. A extensão nunca redireciona você
automaticamente, nunca altera links de páginas que você visita e nunca insere código de
indicação em sites de terceiros.

## Permissões e por que cada uma é necessária

| Permissão | Para quê |
|---|---|
| `storage` | Guardar suas preferências e listas no seu próprio navegador |
| `alarms` | Atualizar a lista de vídeos periodicamente em segundo plano |
| `clipboardWrite` | Copiar o link de um vídeo quando você clica em "Compartilhar" |
| Acesso a `youtube.com` | Montar a prateleira na página e ler os feeds públicos dos canais |

A extensão funciona apenas em páginas do `youtube.com`. Ela não tem acesso a nenhum outro
site que você visita.

## Compartilhamento com terceiros

Não há. Nenhum dado é vendido, cedido ou compartilhado, porque nenhum dado é coletado.

## Código aberto

O código-fonte completo está publicado e pode ser auditado por qualquer pessoa:
<https://github.com/marcos123dev/webapp/tree/main/auvp-play>

## Contato

Dúvidas ou problemas de privacidade: abra uma issue em
<https://github.com/marcos123dev/webapp/issues>.
