-- Estrelas do dia — Fase 2 (Supabase)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- Pode rodar de novo sem problema: tudo usa "if not exists" / "or replace".
--
-- Modelo de acesso: cada aparelho faz um login anônimo (invisível) e entra
-- numa família digitando o código dela. As regras de segurança (RLS) abaixo
-- só deixam ler/gravar dados de famílias das quais o aparelho é membro.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,              -- 8 caracteres, exibido como XXXX-XXXX
  config jsonb not null,                  -- mesmas regras de DEFAULT_CONFIG
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 30),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- Uma linha por dia com atividade. base_stars/goal_stars guardam as regras
-- vigentes naquele dia, para o histórico não mudar se as regras mudarem depois.
create table if not exists public.days (
  family_id uuid not null references public.families (id) on delete cascade,
  date date not null,
  base_stars int,
  goal_stars int,
  reward_used_at bigint,                  -- epoch em ms
  reward_used_by text,
  primary key (family_id, date)
);

-- O saldo do dia NÃO é gravado: é sempre recalculado no app como
-- base_stars + soma dos deltas (mínimo 0). Assim registros simultâneos de
-- aparelhos diferentes nunca deixam o total inconsistente.
create table if not exists public.events (
  id uuid primary key,                    -- gerado no aparelho (permite reenvio offline sem duplicar)
  family_id uuid not null references public.families (id) on delete cascade,
  date date not null,
  delta int not null check (delta <> 0 and delta between -20 and 20),
  reason text not null check (char_length(reason) between 1 and 80),
  time bigint not null,                   -- epoch em ms
  created_by uuid default auth.uid(),
  created_by_name text
);

create index if not exists events_family_date_idx on public.events (family_id, date);

-- ---------------------------------------------------------------------------
-- Segurança (Row Level Security)
-- ---------------------------------------------------------------------------

create or replace function public.is_member(fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.members where family_id = fid and user_id = auth.uid()
  );
$$;

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.days enable row level security;
alter table public.events enable row level security;

drop policy if exists "membros leem a família" on public.families;
create policy "membros leem a família" on public.families
  for select to authenticated using (public.is_member(id));

drop policy if exists "membros alteram as regras" on public.families;
create policy "membros alteram as regras" on public.families
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

-- Só a coluna config pode ser alterada diretamente (o código não)
revoke update on public.families from authenticated;
grant update (config) on public.families to authenticated;

drop policy if exists "membros veem a família" on public.members;
create policy "membros veem a família" on public.members
  for select to authenticated using (public.is_member(family_id));

drop policy if exists "cada um sai sozinho" on public.members;
create policy "cada um sai sozinho" on public.members
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "membros acessam os dias" on public.days;
create policy "membros acessam os dias" on public.days
  for all to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));

drop policy if exists "membros acessam os registros" on public.events;
create policy "membros acessam os registros" on public.events
  for all to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));

-- ---------------------------------------------------------------------------
-- Criar / entrar numa família (únicas portas de entrada)
-- ---------------------------------------------------------------------------

create or replace function public.create_family(p_display_name text, p_config jsonb)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem I, O, 0, 1
  v_code text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(alphabet, 1 + get_byte(gen_random_bytes(1), 0) % 32, 1);
    end loop;
    exit when not exists (select 1 from public.families where code = v_code);
  end loop;

  insert into public.families (code, config) values (v_code, p_config) returning id into v_id;
  insert into public.members (family_id, user_id, display_name)
    values (v_id, auth.uid(), trim(p_display_name));

  return json_build_object('id', v_id, 'code', v_code);
end;
$$;

create or replace function public.join_family(p_code text, p_display_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_id from public.families where code = v_code;
  if v_id is null then
    perform pg_sleep(1); -- atrasa tentativas de adivinhar códigos
    return null;
  end if;

  insert into public.members (family_id, user_id, display_name)
    values (v_id, auth.uid(), trim(p_display_name))
    on conflict (family_id, user_id) do update set display_name = excluded.display_name;

  return json_build_object('id', v_id, 'code', v_code);
end;
$$;

revoke execute on function public.create_family(text, jsonb) from public, anon;
revoke execute on function public.join_family(text, text) from public, anon;
grant execute on function public.create_family(text, jsonb) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Tempo real (um aparelho vê na hora o que o outro registrou)
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['events', 'days', 'families', 'members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
