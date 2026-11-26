# Guia de instalação — passo a passo

Escrito para quem não mexe com programação. Leia a **Parte 1** para testar em 2 minutos.
Depois, se gostar, faça a **Parte 2** para deixar instalado para sempre.

---

## Antes de começar

Você recebeu um arquivo chamado **`auvp-play-firefox-1.0.0.xpi`**.
Guarde ele numa pasta fácil de achar, por exemplo a pasta **Downloads**.

Esse arquivo é a extensão inteira. Não precisa descompactar, não precisa abrir.

Você precisa do **Firefox versão 142 ou mais nova** (qualquer Firefox atualizado serve).
Para conferir: menu **☰** → **Ajuda** → **Sobre o Firefox**.

---

## Parte 1 — Testar agora (2 minutos)

Esse jeito funciona na hora, mas a extensão **some quando você fecha o Firefox**.
É só para você ver se gostou.

1. Abra o **Mozilla Firefox**.
2. Clique na barra de endereço (onde você digita os sites), apague o que estiver lá e
   digite exatamente:

   ```
   about:debugging
   ```

   Depois aperte **Enter**.
3. Vai abrir uma página de ferramentas. No menu do lado esquerdo, clique em
   **"Este Firefox"**.
4. Clique no botão **"Carregar extensão temporária…"**.
5. Vai abrir a janela de escolher arquivo. Procure a pasta onde você salvou e
   clique duas vezes em **`auvp-play-firefox-1.0.0.xpi`**.
6. Pronto. A extensão aparece na lista e o ícone dela (um quadrado verde-azulado com um
   "play") aparece na barra de ferramentas do Firefox, lá em cima à direita.

   > Se não aparecer o ícone: clique na peça de quebra-cabeça 🧩 ao lado da barra de
   > endereço, ache "AUVP Play" e clique no alfinete para fixar na barra.
7. Abra **youtube.com**. A prateleira da AUVP aparece no topo da página inicial.

**Lembre-se:** ao fechar o Firefox, a extensão é removida. Para instalar de vez,
siga a Parte 2.

---

## Parte 2 — Instalar para sempre (10 a 15 minutos, uma vez só)

O Firefox só aceita instalar extensões **assinadas pela Mozilla**. A assinatura é
**gratuita** e não exige publicar nada: a extensão fica privada, só sua.

### 2.1 — Criar a conta (se ainda não tiver)

1. Acesse: <https://addons.mozilla.org/pt-BR/firefox/users/register>
2. Crie a conta com o seu e-mail e confirme pelo link que a Mozilla enviar.

### 2.2 — Enviar a extensão para assinar

1. Acesse: <https://addons.mozilla.org/developers/addon/submit/distribution>
2. Vai aparecer a pergunta de como você quer distribuir. Escolha a segunda opção:
   **"Por conta própria"** (em inglês: *On your own*). Clique em **Continuar**.

   > Isso significa "não quero publicar na loja, só quero o arquivo assinado para mim".
3. Clique em **"Selecione um arquivo…"** e escolha o mesmo arquivo
   **`auvp-play-firefox-1.0.0.xpi`**.
4. Espere a validação automática terminar (costuma levar menos de um minuto).
   Avisos amarelos são normais; o que importa é não ter erro vermelho.
5. Clique em **Continuar** e depois em **Enviar versão**.
6. Se perguntarem sobre o código-fonte, responda que **não** usa ferramentas de
   compilação (o código é texto puro, já legível).

### 2.3 — Baixar o arquivo assinado

1. Depois de processar, a página mostra a versão com um botão de **download**
   (ou um link "Baixar" / ícone de seta). Baixe o arquivo `.xpi` **assinado**.
   Se demorar, atualize a página depois de 1 ou 2 minutos.

### 2.4 — Instalar no Firefox

1. No Firefox, clique no menu **☰** (três risquinhos, canto superior direito).
2. Clique em **"Extensões e temas"**.
3. Clique na **engrenagem ⚙** no topo da página e escolha
   **"Instalar extensão a partir de arquivo…"**.
4. Escolha o `.xpi` **assinado** que você acabou de baixar.
5. O Firefox pergunta se você quer adicionar e mostra as permissões. Clique em
   **Adicionar**.

Pronto: agora ela fica instalada mesmo depois de fechar o Firefox.

> **Atalho alternativo (só para quem usa Firefox Developer Edition ou ESR):**
> digite `about:config` na barra de endereço, aceite o aviso, procure por
> `xpinstall.signatures.required` e mude para **false**. Depois instale o `.xpi`
> direto pelo passo 2.4. **Isso não funciona no Firefox normal.**

---

## Como usar

- **Ícone da extensão (barra do Firefox):** abre o menu com todas as opções —
  ligar/desligar a prateleira, escolher canais, ocultar recomendações, ocultar Shorts,
  ocultar assistidos, atualizar os vídeos e limpar o histórico.
- **Na página inicial do YouTube:**
  - as **pílulas coloridas** ligam e desligam cada canal;
  - o **campo de busca** procura só dentro dos vídeos da AUVP;
  - **▶ Reproduzir fila** abre todos os vídeos listados em sequência no YouTube;
  - **☆ Assistir depois** salva na sua lista; **★ Minha lista** abre essa lista como fila;
  - **⇪ Compartilhar** copia o link do vídeo;
  - **▴** recolhe a prateleira.
- O **número verde no ícone** mostra quantos vídeos da AUVP você ainda não assistiu.

---

## Se algo não funcionar

| Problema | O que fazer |
|---|---|
| A prateleira não aparece | Atualize a página do YouTube (tecla **F5**). Confirme que está em `youtube.com`, na página inicial. |
| Aparece "Nenhum vídeo carregado" | Clique em **Atualizar** na prateleira, ou abra o ícone da extensão e clique em **Atualizar vídeos**. |
| O ícone sumiu da barra | Clique na peça 🧩 ao lado da barra de endereço, ache "AUVP Play" e fixe na barra. |
| As recomendações sumiram e eu não quis isso | Abra o ícone da extensão e desmarque **"Ocultar o feed de recomendações"**. |
| Instalei pela Parte 1 e sumiu | É o esperado: o modo temporário dura só até fechar o Firefox. Faça a Parte 2. |
| O Firefox diz que a extensão não pôde ser verificada | Você tentou instalar o arquivo **não assinado** pelo passo 2.4. Use a Parte 1 para testar, ou conclua a assinatura da Parte 2. |

---

## Como desinstalar

Menu **☰** → **Extensões e temas** → ache **AUVP Play** → botão **…** → **Remover**.

---

*Baseado na extensão original para Chrome criada por Matheus Satake de Souza.
Versão não oficial para Firefox. Veja [CREDITS.md](CREDITS.md).*
