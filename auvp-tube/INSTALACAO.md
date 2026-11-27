# Como instalar — passo a passo

Escrito para quem não mexe com programação. Leva uns 2 minutos.

## Antes de começar

Você precisa do **Firefox versão 142 ou mais nova** (qualquer Firefox atualizado serve).
Para conferir: menu **☰** → **Ajuda** → **Sobre o Firefox**.

A extensão é assinada pela Mozilla, então ela instala de forma permanente, como qualquer
outra extensão. Você não precisa criar conta em lugar nenhum.

---

## Instalar

1. **Baixe o arquivo.** Clique aqui:
   [**auvp-tube-1.0.2.xpi**](https://github.com/marcos123dev/webapp/raw/main/auvp-tube/dist/auvp-tube-1.0.2.xpi)

   O Firefox vai salvar o arquivo na sua pasta de downloads.

2. **Abra as extensões.** No Firefox, clique no menu **☰** (três risquinhos, canto
   superior direito) e depois em **"Extensões e temas"**.

3. **Instale pelo arquivo.** Clique na **engrenagem ⚙** no topo da página e escolha
   **"Instalar extensão a partir de arquivo…"**.

4. **Escolha o arquivo** `.xpi` que você acabou de baixar.

5. O Firefox mostra as permissões e pergunta se você quer adicionar. Clique em
   **Adicionar** e depois em **OK**.

Pronto. Abra o **youtube.com** e a prateleira da AUVP aparece no topo da página inicial.

> **O ícone não apareceu na barra?** Clique na peça de quebra-cabeça 🧩 ao lado da barra
> de endereço, ache "AUVP Tube" e clique no alfinete para fixar.

---

## Como usar

- **Ícone da extensão, na barra do Firefox:** abre o menu com todas as opções — ligar e
  desligar a prateleira, escolher os canais, ocultar as recomendações, ocultar os Shorts,
  ocultar os assistidos, atualizar os vídeos e limpar o histórico.
- **Na página inicial do YouTube:**
  - as **pílulas coloridas** ligam e desligam cada canal;
  - o **campo de busca** procura só dentro dos vídeos da AUVP;
  - **▶ Reproduzir fila** abre todos os vídeos listados em sequência no YouTube;
  - **☆ Assistir depois** salva na sua lista, e **★ Minha lista** abre essa lista como fila;
  - **⇪ Compartilhar** copia o link do vídeo;
  - **▴** recolhe a prateleira.
- O **número verde no ícone** mostra quantos vídeos da AUVP você ainda não assistiu.

Cada opção liga e desliga separadamente. Dá, por exemplo, para tirar os Shorts e manter
as recomendações normais do YouTube.

---

## Se algo não funcionar

| Problema | O que fazer |
|---|---|
| A prateleira não aparece | Atualize a página do YouTube (tecla **F5**). Confirme que está na página inicial do `youtube.com`. |
| Aparece "Nenhum vídeo carregado" | Clique em **Atualizar** na prateleira, ou abra o ícone da extensão e clique em **Atualizar vídeos**. |
| O ícone sumiu da barra | Clique na peça 🧩 ao lado da barra de endereço, ache "AUVP Tube" e fixe na barra. |
| As recomendações sumiram e eu não quis isso | Abra o ícone da extensão e desmarque **"Ocultar o feed de recomendações"**. |
| O Firefox diz que a extensão não pôde ser verificada | Você provavelmente baixou um arquivo diferente. Use o link do passo 1. |
| Meu Firefox é mais antigo que o 142 | Atualize o Firefox: menu **☰** → **Ajuda** → **Sobre o Firefox**. |

## Atualizar para uma versão nova

Esta extensão não é instalada pela loja da Mozilla, então ela **não se atualiza sozinha**.
Quando sair uma versão nova, basta repetir os passos de instalação com o arquivo novo: as
suas preferências e a sua lista de "assistir depois" são mantidas.

## Como desinstalar

Menu **☰** → **Extensões e temas** → ache **AUVP Tube** → botão **…** →
**Remover**.

---

## Para quem é da área

O código-fonte completo está neste repositório. Para rodar sem instalar, abra
`about:debugging` → **"Este Firefox"** → **"Carregar extensão temporária…"** e escolha o
`manifest.json`. Os testes ficam em `tests/` (`node tests/test-parser.js`) e o pacote é
gerado com `web-ext build`.

---

*AUVP Tube — extensão independente para Firefox, inspirada na AUVP Play para Chrome,
de Matheus Satake de Souza. Não oficial. Veja [CREDITS.md](CREDITS.md).*
