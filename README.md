# Estrelas do dia

App de acompanhamento de comportamento: a criança começa o dia com um número
de estrelas, ganha ou perde estrelas conforme o comportamento registrado, e
ao atingir a meta libera um tempo de Nintendo Switch à noite. Funciona como
PWA — pode ser "instalado" na tela inicial do celular como um app nativo.

Tudo roda **localmente no navegador** (localStorage) nesta versão — não
precisa de servidor nem banco de dados para publicar hoje. Veja "Próximos
passos" no fim deste arquivo para sincronizar entre aparelhos no futuro.

## Rodando localmente

Pré-requisito: [Node.js](https://nodejs.org) 18 ou mais recente instalado.

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Qualquer alteração no código atualiza a
tela na hora.

Para gerar a versão de produção (arquivos estáticos otimizados):

```bash
npm run build
npm run preview   # opcional: testa a build de produção localmente
```

Os arquivos prontos ficam em `dist/`.

## Publicando de graça (sem domínio pago)

A forma mais simples e 100% gratuita é publicar direto de um repositório no
GitHub usando a **Vercel** (ou a Netlify, o processo é quase idêntico):

1. Crie uma conta gratuita em [github.com](https://github.com) (se ainda não
   tiver) e em [vercel.com](https://vercel.com) — pode entrar na Vercel
   direto com a conta do GitHub.
2. Crie um repositório novo no GitHub e suba esta pasta:
   ```bash
   git init
   git add .
   git commit -m "primeira versão do app de estrelas"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/estrelas-do-dia.git
   git push -u origin main
   ```
3. Na Vercel, clique em **Add New → Project**, escolha o repositório que
   você acabou de subir. A Vercel detecta automaticamente que é um projeto
   Vite — não precisa mudar nenhuma configuração. Clique em **Deploy**.
4. Em ~1 minuto o site está no ar, com **HTTPS** e um endereço gratuito do
   tipo `estrelas-do-dia.vercel.app`. Toda vez que você der `git push`, a
   Vercel publica a nova versão automaticamente.
5. Abra o link no celular do seu filho (ou no seu) → no Chrome/Safari,
   use "Adicionar à tela de início" para instalar como se fosse um app.

Quer trocar `estrelas-do-dia.vercel.app` por um nome mais bonito ainda
dentro do domínio grátis? Em **Project Settings → Domains** na Vercel dá
para escolher outro subdomínio `.vercel.app` livremente.

### Domínio próprio (opcional, pago)

Se um dia quiser algo como `estrelinhas.com.br`, compre o domínio em
qualquer registrador (Registro.br, Namecheap etc. — geralmente
R$40–70/ano) e aponte para a Vercel em **Project Settings → Domains → Add**;
ela mesma guia o ajuste do DNS.

## Estrutura do projeto

```
src/
  App.jsx              → tela principal, junta todos os componentes
  hooks/useEstrelas.js → toda a lógica de regras (estrelas, meta, eventos)
  lib/storage.js        → onde os dados são salvos (hoje: localStorage)
  lib/dates.js           → utilitários de data
  components/            → StarRing, WeekSummary, PickerSheet,
                            SettingsSheet, HistorySheet, Sheet
public/icons/            → ícones do PWA (gerados no tema "Brincalhão")
vite.config.js            → build + configuração do PWA (manifest, service worker)
```

## Ajustando as regras no código

Os valores padrão (5 estrelas iniciais, meta de 8, categorias de motivo)
estão em `src/lib/storage.js`, na constante `DEFAULT_CONFIG` — mas o app já
permite editar tudo isso pela tela de Configurações, sem mexer em código.

## Próximos passos (quando quiser evoluir)

- **Sincronizar entre o celular do pai e da mãe:** hoje cada aparelho guarda
  seus próprios dados (localStorage). Para sincronizar de verdade, troque as
  funções de `src/lib/storage.js` por chamadas a um backend como o
  [Supabase](https://supabase.com) (tem camada gratuita) — a assinatura das
  funções (`getConfig`, `setConfig`, `getDay`, `setDay`, `listDayKeys`) foi
  pensada para isso: o resto do app não precisa mudar.
- **Publicar na Play Store / App Store:** empacote esta mesma pasta com o
  [Capacitor](https://capacitorjs.com/) (`npm install @capacitor/core
  @capacitor/cli`, depois `npx cap init` e `npx cap add android` /
  `npx cap add ios`) — ele usa o build do Vite (`dist/`) como app nativo,
  sem reescrever nada.
