-- ============================================================
-- MÓDULOS NUEVOS — Casilleros + Inspecciones + Precintos
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. CASILLEROS (180 casilleros fijos)
-- ------------------------------------------------------------
create table public.casilleros (
    id bigint generated always as identity primary key,
    numero int not null unique,
    personal_asignado text,
    estado text not null default 'disponible' check (estado in ('disponible', 'en_uso')),
    actualizado_en timestamptz default now()
);

alter table public.casilleros enable row level security;

create policy "casilleros_lectura" on public.casilleros
    for select using (auth.role() = 'authenticated');

create policy "casilleros_escritura" on public.casilleros
    for all using (public.es_editor()) with check (public.es_editor());

-- ------------------------------------------------------------
-- 2. INSPECCIONES IMPROVISADAS DE CASILLEROS
-- ------------------------------------------------------------
create table public.inspecciones_casilleros (
    id bigint generated always as identity primary key,
    fecha date not null default current_date,
    checklist jsonb not null default '[]',   -- [{item, cumple}]
    comentarios text,
    link_onedrive text,
    creado_por uuid references auth.users(id),
    creado_en timestamptz default now()
);

alter table public.inspecciones_casilleros enable row level security;

create policy "inspecciones_lectura" on public.inspecciones_casilleros
    for select using (auth.role() = 'authenticated');

create policy "inspecciones_escritura" on public.inspecciones_casilleros
    for all using (public.es_editor()) with check (public.es_editor());

-- ------------------------------------------------------------
-- 3. AMPLIAR LA TABLA "precintos" (ya existía vacía)
-- ------------------------------------------------------------
alter table public.precintos
    add column if not exists fecha date,
    add column if not exists hora time,
    add column if not exists cd_almacen text,
    add column if not exists placa text,
    add column if not exists conductor text,
    add column if not exists precintos_totales int default 0,
    add column if not exists precintos_laterales text,
    add column if not exists precintos_posteriores text,
    add column if not exists color text default 'NARANJA',
    add column if not exists destino text,
    add column if not exists operacion text,
    add column if not exists encargado text,
    add column if not exists creado_por uuid references auth.users(id);

-- ============================================================
-- FIN. Después de correr esto, entra a casilleros.html con un
-- usuario editor: la primera vez sembrará automáticamente los
-- 180 casilleros (numerados 1 a 180, todos "disponible").
-- ============================================================
