-- The Conuco: tabla de conucos de cada agricultor.
-- Pegar completo en Supabase → SQL Editor → New query → Run.
--
-- La seguridad a nivel de fila (RLS) garantiza que cada persona SOLO puede
-- ver, crear, cambiar o borrar SU PROPIO conuco, aunque alguien tenga la
-- clave pública de la web.

create table if not exists public.conucos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  nombre        text not null check (char_length(nombre) between 1 and 80),
  lat           double precision not null check (lat between -90 and 90),
  lon           double precision not null check (lon between -180 and 180),
  tareas        numeric check (tareas is null or (tareas > 0 and tareas < 100000)), -- 1 tarea ≈ 629 m²
  siembra_actual text not null default 'maiz-maiz',
  agua          text not null default 'lluvia' check (agua in ('lluvia', 'riego_aveces', 'riego_siempre')),
  prioridades   text[] not null default '{}',
  equipo        text not null default 'manual' check (equipo in ('manual', 'animal', 'tractor')),
  venta         text not null default 'mercado_local' check (venta in ('consumo', 'mercado_local', 'exportacion')),
  notas         text check (notas is null or char_length(notas) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.conucos enable row level security;

drop policy if exists "ver mi conuco" on public.conucos;
drop policy if exists "crear mi conuco" on public.conucos;
drop policy if exists "cambiar mi conuco" on public.conucos;
drop policy if exists "borrar mi conuco" on public.conucos;

create policy "ver mi conuco" on public.conucos
  for select using (auth.uid() = user_id);
create policy "crear mi conuco" on public.conucos
  for insert with check (auth.uid() = user_id);
create policy "cambiar mi conuco" on public.conucos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "borrar mi conuco" on public.conucos
  for delete using (auth.uid() = user_id);

-- Mantener updated_at al día
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists conucos_touch on public.conucos;
create trigger conucos_touch before update on public.conucos
  for each row execute function public.touch_updated_at();
