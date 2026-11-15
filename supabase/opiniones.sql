-- The Conuco: opiniones (feedback) que deja la gente al final de la portada.
-- Pegar completo en Supabase → SQL Editor → New query → Run.
--
-- Cualquiera puede ENVIAR una opinión, pero nadie puede leerlas ni cambiarlas desde la
-- web: no hay reglas de lectura. El equipo las ve en Supabase → Table Editor → opiniones.

create table if not exists public.opiniones (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  quien        text not null default 'otro'
               check (quien in ('agricultor', 'tecnico', 'juez', 'estudiante', 'otro')),
  calificacion smallint check (calificacion is null or calificacion between 1 and 5),
  mensaje      text not null check (char_length(mensaje) between 1 and 1000),
  idioma       text not null default 'es' check (idioma in ('es', 'en'))
);

alter table public.opiniones enable row level security;

drop policy if exists "enviar opinion" on public.opiniones;
create policy "enviar opinion" on public.opiniones
  for insert to anon, authenticated with check (true);
-- Sin políticas de select/update/delete: desde la web nadie puede leerlas ni borrarlas.
