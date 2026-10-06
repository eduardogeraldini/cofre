-- Cofre — schema do Supabase
-- Execute este arquivo inteiro no SQL Editor do Supabase (Dashboard > SQL Editor > New query > Run).

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

create table public.transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense')),
  amount double precision not null,
  category_id text not null,
  date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete cascade
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

-- Row Level Security: cada usuário só enxerga os próprios dados.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.settings enable row level security;

create policy "profiles own rows" on public.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "categories own rows" on public.categories
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions own rows" on public.transactions
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
