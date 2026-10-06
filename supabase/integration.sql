-- Cofre — Gasto rápido do Atalho do iPhone (tokens de acesso)
-- Execute este arquivo no SQL Editor do Supabase (depois do schema.sql). Seguro de reexecutar.
--
-- O banco guarda SOMENTE tokens de acesso (apenas o hash sha256), com RLS comum:
-- cada usuário lê e grava apenas as próprias linhas — é a própria tela de
-- Configurações do app que gera, lista e apaga os tokens (sem funções/RPC).
-- A análise com IA acontece fora do banco, na Edge Function
-- supabase/functions/registrar-gasto, que lê a chave definida por você na CLI:
--   supabase secrets set GEMINI_API_KEY=sua_chave_aqui
-- Não existe tabela de chaves, secret nem tela no app para ver/editar a chave.

create table if not exists public.integration_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  label text not null default 'iPhone',
  token_hash text unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- Mesmo padrão do schema.sql: cada dono só enxerga/gerencia as próprias linhas.
alter table public.integration_tokens enable row level security;

drop policy if exists "tokens own rows" on public.integration_tokens;
create policy "tokens own rows" on public.integration_tokens
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Privilegios: o app le, cria e apaga os proprios tokens; apagar a linha e a
-- unica forma de desativar (sem estado de revogado / sem historico).
revoke all on public.integration_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.integration_tokens to authenticated;

-- O Atalho do iPhone não fala com o banco: ele chama a Edge Function
--   https://mpgwmglwwjlxagjawwhi.supabase.co/functions/v1/registrar-gasto
-- que valida o token acima (com service role), chama o Gemini com o
-- GEMINI_API_KEY dos secrets e grava o gasto. A chave nunca passa pelo app
-- nem pelo banco.

notify pgrst, 'reload schema';
