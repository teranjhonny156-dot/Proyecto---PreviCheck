-- ============================================================
-- MÓDULO: CONTROL DE INGRESOS
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. DIRECTORIO DE PERSONAL (para el autocompletado por DNI)
-- ------------------------------------------------------------
create table public.personal_directorio (
    dni text primary key,
    nombre text not null,
    empresa text,
    area text,
    actualizado_en timestamptz default now()
);

alter table public.personal_directorio enable row level security;

create policy "directorio_lectura" on public.personal_directorio
    for select using (auth.role() = 'authenticated');

create policy "directorio_escritura" on public.personal_directorio
    for all using (public.es_editor()) with check (public.es_editor());

-- ------------------------------------------------------------
-- 2. CONTROL DE INGRESOS Y SALIDAS
-- ------------------------------------------------------------
create table public.control_ingresos (
    id bigint generated always as identity primary key,
    dni text not null,
    nombre text not null,
    empresa text,
    area text,
    fecha_ingreso timestamptz not null,
    fecha_salida timestamptz,
    observaciones text,
    equipos_retirados text,
    creado_por uuid references auth.users(id),
    creado_en timestamptz default now()
);

alter table public.control_ingresos enable row level security;

create policy "ingresos_lectura" on public.control_ingresos
    for select using (auth.role() = 'authenticated');

create policy "ingresos_escritura" on public.control_ingresos
    for all using (public.es_editor()) with check (public.es_editor());

-- ------------------------------------------------------------
-- 3. RETIRO DE EQUIPOS (PDA)
-- ------------------------------------------------------------
create table public.equipos_pda (
    id bigint generated always as identity primary key,
    codigo_equipo text not null,
    quien_retira text not null,
    autorizado_por text not null,
    fecha_retiro timestamptz not null default now(),
    fecha_retorno timestamptz,
    estado text not null default 'retirado' check (estado in ('retirado', 'devuelto')),
    creado_por uuid references auth.users(id),
    creado_en timestamptz default now()
);

alter table public.equipos_pda enable row level security;

create policy "pda_lectura" on public.equipos_pda
    for select using (auth.role() = 'authenticated');

create policy "pda_escritura" on public.equipos_pda
    for all using (public.es_editor()) with check (public.es_editor());

-- ------------------------------------------------------------
-- 4. PERSONAL RESTRINGIDO
-- ------------------------------------------------------------
create table public.personal_restringido (
    id bigint generated always as identity primary key,
    nombres_apellidos text not null,
    cargo text,
    dni text,
    solicitado_por text,
    creado_por uuid references auth.users(id),
    creado_en timestamptz default now()
);

alter table public.personal_restringido enable row level security;

create policy "restringido_lectura" on public.personal_restringido
    for select using (auth.role() = 'authenticated');

create policy "restringido_escritura" on public.personal_restringido
    for all using (public.es_editor()) with check (public.es_editor());

-- ============================================================
-- FIN. Después de correr esto, importa (Table Editor > Insert >
-- Import data from CSV) en este orden:
--   1. personal_directorio_import.csv   -> personal_directorio
--   2. control_ingresos_import.csv      -> control_ingresos
--   3. personal_restringido_import.csv  -> personal_restringido
-- ============================================================
