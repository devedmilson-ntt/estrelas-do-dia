# Estrelas do dia

App de acompanhamento de comportamento: a criança começa o dia com um número
de estrelas, ganha ou perde estrelas conforme o comportamento registrado, e
ao atingir a meta libera um tempo de Nintendo Switch à noite. Funciona como
PWA — pode ser "instalado" na tela inicial do celular como um app nativo.

Os dados ficam no **Supabase** (plano gratuito) e são compartilhados pela
família: pai, mãe, avós etc. registram cada um no seu celular e todos veem
as mudanças na hora. Não há tela de login: cada aparelho entra na família
uma única vez digitando o **código da família**. O app continua funcionando
sem internet — os registros ficam numa fila e são enviados quando a conexão
voltar.

## Configurando o Supabase (uma vez só, ~10 minutos)

1. Crie uma conta em [supabase.com](https://supabase.com) (dá para entrar
   com o GitHub) e clique em **New project**. Nome: `estrelas-do-dia`;
   região: **South America (São Paulo)**; crie uma senha forte para o banco
   e guarde-a (o app não usa, mas o painel pode pedir). Plano: **Free**.
2. No menu lateral, abra **SQL Editor → New query**, cole todo o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Deve
   aparecer "Success. No rows returned".
3. Abra **Authentication → Sign In / Providers** e ative **Allow anonymous
   sign-ins**. Salve. (É o "login invisível" de cada aparelho.)
4. Abra **Project Settings → API Keys** (ou o botão **Connect** no topo) e
   copie a **Project URL** e a **publishable key** (começa com
   `sb_publishable_`; em projetos antigos se chama `anon` key).
5. Para rodar no seu computador: copie `.env.example` para `.env.local` e
   cole os dois valores.
6. Na Vercel: **Project Settings → Environment Variables**, cadastre
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` (marque Production e Preview).
   Variáveis novas só valem no próximo deploy.

> O plano grátis do Supabase **pausa o projeto após 7 dias sem nenhum
> acesso**. Com a família usando todo dia isso não acontece; se acontecer
> (ex.: férias), entre no painel e clique em **Restore** — nada é perdido.

### Primeira vez com a família

1. **No aparelho que já tem os registros da Fase 1** (se for um iPhone com
   o app instalado na tela de início, abra pelo ícone, não pelo Safari),
   toque em **Criar a família**. Os registros e as regras desse aparelho
   vão junto para o banco.
2. Toque em **Enviar convite** e mande pelo WhatsApp. Cada pessoa abre o
   link, escolhe o nome ("Vovô") e pronto.
3. **iPhone:** o app instalado na tela de início tem memória separada do
   Safari. Peça para primeiro "Adicionar à Tela de Início", abrir pelo
   ícone e então digitar o código.
4. O código fica sempre em **Configurações → Família**, junto com a lista
   de quem já entrou.

## Rodando localmente

Pré-requisito: [Node.js](https://nodejs.org) 18 ou mais recente instalado,
e o `.env.local` preenchido (veja acima).

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
  Root.jsx               → decide: tela de entrada na família ou o app
  App.jsx                → tela principal, junta todos os componentes
  hooks/useEstrelas.js   → liga a tela aos dados
  lib/storage.js         → sincronização: cache local, fila offline, tempo real
  lib/family.js          → criar/entrar/sair da família, migração da Fase 1
  lib/supabase.js        → cliente do Supabase (lê as variáveis de ambiente)
  lib/dates.js           → utilitários de data
  components/            → StarRing, WeekSummary, PickerSheet, SettingsSheet,
                           HistorySheet, FamilySetup, Sheet
supabase/schema.sql      → tabelas, regras de segurança e funções do banco
public/icons/            → ícones do PWA
vite.config.js           → build + configuração do PWA (manifest, service worker)
```

O saldo de estrelas nunca é gravado no banco: ele é sempre recalculado como
as estrelas iniciais mais os registros do dia, aplicados em ordem de horário,
sem nunca passar da meta nem ficar abaixo de 0. Por isso dois aparelhos
registrando ao mesmo tempo nunca deixam o total errado.

## Ajustando as regras

Tudo (estrelas iniciais, meta, minutos, motivos) é editado pela tela de
Configurações e vale para a família inteira. Os valores iniciais de uma
família nova estão em `DEFAULT_CONFIG`, em `src/lib/storage.js`. Mudar a
meta afeta o dia atual, mas não altera o histórico dos dias anteriores.

## Próximos passos (quando quiser evoluir)

- **Publicar na Play Store / App Store:** empacote esta mesma pasta com o
  [Capacitor](https://capacitorjs.com/) (`npm install @capacitor/core
  @capacitor/cli`, depois `npx cap init` e `npx cap add android` /
  `npx cap add ios`) — ele usa o build do Vite (`dist/`) como app nativo,
  sem reescrever nada.
