
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(trim(title)) > 0),
  description  text default '',
  completed    boolean not null default false,
  created_at   timestamptz not null default now(),
  deadline     date,
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high'))
);

-- Índice útil para ordenar por fecha de creación
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

-- Row Level Security (RLS)

-- Supabase activa RLS por defecto en tablas nuevas creadas desde el
-- dashboard, pero al crearla por SQL puede quedar desactivada.
-- La habilitamos y agregamos una política abierta para este laboratorio
-- (uso educativo con la clave "anon"). En un proyecto real, las políticas
-- deberían restringirse por usuario autenticado.

alter table public.tasks enable row level security;

drop policy if exists "Acceso publico de lectura" on public.tasks;
create policy "Acceso publico de lectura"
  on public.tasks for select
  using (true);

drop policy if exists "Acceso publico de insercion" on public.tasks;
create policy "Acceso publico de insercion"
  on public.tasks for insert
  with check (true);

drop policy if exists "Acceso publico de actualizacion" on public.tasks;
create policy "Acceso publico de actualizacion"
  on public.tasks for update
  using (true);

drop policy if exists "Acceso publico de eliminacion" on public.tasks;
create policy "Acceso publico de eliminacion"
  on public.tasks for delete
  using (true);

-- Registros de prueba (opcional, para verificar la tabla)
insert into public.tasks (title, description, completed, deadline, priority)
values
  ('Configurar proyecto en Supabase', 'Crear el proyecto y la tabla tasks', true, current_date - 1, 'high'),
  ('Conectar JavaScript con Supabase', 'Reemplazar localStorage por el cliente de Supabase', false, current_date + 2, 'high'),
  ('Desplegar en Vercel', 'Vincular el repositorio de GitHub y publicar', false, current_date + 5, 'medium');