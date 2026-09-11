-- =========================================================
-- CloudTasks - Esquema de base de datos (Etapa 2 + Auth)
-- =========================================================
-- Ejecutar en Supabase: Project -> SQL Editor -> New query

-- 1) Tabla de tareas -----------------------------------------------------
-- Se agrega user_id para que cada tarea pertenezca a un usuario
-- autenticado (auth.users es la tabla que gestiona Supabase Auth).
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (char_length(trim(title)) > 0),
  description  text default '',
  completed    boolean not null default false,
  created_at   timestamptz not null default now(),
  deadline     date,
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high'))
);

-- Índices útiles
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);
create index if not exists tasks_user_id_idx on public.tasks (user_id);

-- 2) Row Level Security ---------------------------------------------------
-- Cada usuario solo puede ver y modificar SUS PROPIAS tareas.
-- auth.uid() devuelve el id del usuario autenticado que hace la petición.
alter table public.tasks enable row level security;

drop policy if exists "Seleccionar solo tareas propias" on public.tasks;
create policy "Seleccionar solo tareas propias"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Insertar tareas propias" on public.tasks;
create policy "Insertar tareas propias"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Actualizar tareas propias" on public.tasks;
create policy "Actualizar tareas propias"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Eliminar tareas propias" on public.tasks;
create policy "Eliminar tareas propias"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- 3) Nombre y apellido del usuario -----------------------------------
-- No creamos una tabla "profiles" aparte para mantener el laboratorio
-- simple: nombre y apellido se guardan en los metadatos del usuario
-- (auth.users.raw_user_meta_data) al momento del registro, usando la
-- opción "options.data" del método supabase.auth.signUp() en el
-- frontend (ver js/auth.js). Se pueden consultar así:
--
--   select id, email, raw_user_meta_data->>'nombre' as nombre,
--          raw_user_meta_data->>'apellido' as apellido
--   from auth.users;

-- 4) Nota sobre confirmación de correo -------------------------------
-- Por defecto, Supabase exige confirmar el correo antes de poder iniciar
-- sesión. Para el laboratorio (y para no depender de configurar SMTP),
-- puedes desactivarlo en:
--   Authentication -> Providers -> Email -> "Confirm email" = OFF
-- Así, el registro deja al usuario con sesión activa de inmediato.
