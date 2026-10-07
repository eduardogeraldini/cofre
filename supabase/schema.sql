-- Cofre — schema do Supabase
-- Execute este arquivo inteiro no SQL Editor do Supabase (Dashboard > SQL Editor > New query > Run).
-- Contém o schema do app + a tabela de tokens do gasto rápido (Atalho do iPhone).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  created_at timestamptz not null default now()
);

create table public.categories (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text not null default 'tag',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.wallets (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  color text not null default 'indigo',
  initial_balance double precision not null default 0,
  created_at timestamptz not null default now()
);

create table public.transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense')),
  amount double precision not null,
  category_id text not null,
  wallet_id uuid references public.wallets (id) on delete set null,
  date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete cascade
);

create table public.transfers (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  from_wallet_id uuid not null references public.wallets (id) on delete cascade,
  to_wallet_id uuid not null references public.wallets (id) on delete cascade,
  amount double precision not null check (amount > 0),
  date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (from_wallet_id <> to_wallet_id)
);

create table public.budgets (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id text not null,
  amount double precision not null,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete cascade
);

create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  privacy_mode boolean not null default false,
  compact_values boolean not null default true,
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_user_wallet_idx on public.transactions (user_id, wallet_id);
create index transfers_user_date_idx on public.transfers (user_id, date desc);

-- Row Level Security: cada usuário só enxerga os próprios dados.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.budgets enable row level security;
alter table public.settings enable row level security;

create policy "profiles own rows" on public.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "categories own rows" on public.categories
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "wallets own rows" on public.wallets
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions own rows" on public.transactions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transfers own rows" on public.transfers
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets own rows" on public.budgets
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings own rows" on public.settings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cria profile + settings automatically ao cadastrar usuário.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;

  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Gasto rápido do Atalho do iPhone (tokens de acesso)
--
-- O banco guarda SOMENTE tokens de acesso (apenas o hash sha256), com RLS comum:
-- cada usuário lê e grava apenas as próprias linhas — é a própria tela de
-- Configurações do app que gera, lista e apaga os tokens (sem funções/RPC).
-- A análise com IA acontece fora do banco, na Edge Function
-- supabase/functions/registrar-gasto, que lê a chave definida por você na CLI:
--   supabase secrets set GEMINI_API_KEY=sua_chave_aqui
-- Não existe tabela de chaves, secret nem tela no app para ver/editar a chave.
-- O Atalho do iPhone chama a Edge Function
--   https://mpgwmglwwjlxagjawwhi.supabase.co/functions/v1/registrar-gasto
-- que valida o token (com service role), chama o Gemini e grava o gasto.

create table public.integration_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  label text not null default 'iPhone',
  token_hash text unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.integration_tokens enable row level security;

create policy "tokens own rows" on public.integration_tokens
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Privilegios: o app le, cria e apaga os proprios tokens; apagar a linha e a
-- unica forma de desativar (sem estado de revogado / sem historico).
revoke all on public.integration_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.integration_tokens to authenticated;
