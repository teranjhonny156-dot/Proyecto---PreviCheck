-- ============================================================
-- REDISEÑO DEL MÓDULO DE CAPACITACIONES (charlas.html)
-- Personal real organizado por área + las 7 capacitaciones
-- obligatorias que compartiste.
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

-- Si la tabla vieja "cumplimiento_anual" ya no se va a usar,
-- la dejamos intacta por ahora (no se borra nada tuyo).

create table public.personal_capacitaciones (
    id bigint generated always as identity primary key,
    area text not null,
    dni text,
    nombres text not null,
    apellido_paterno text,
    apellido_materno text,
    cargo text,
    fecha_ingreso date,
    -- Las 7 capacitaciones obligatorias:
    -- c1 Primeros Auxilios | c2 Política de SST y Mapa de riesgo
    -- c3 Riesgos Ergonómicos | c4 Uso y manejo de extintor
    -- c5 Prevención hipertensión/diabetes/obesidad
    -- c6 Plan de respuesta ante emergencia | c7 Seguridad y salud como forma de vida
    c1 boolean not null default false,
    c2 boolean not null default false,
    c3 boolean not null default false,
    c4 boolean not null default false,
    c5 boolean not null default false,
    c6 boolean not null default false,
    c7 boolean not null default false,
    creado_por uuid references auth.users(id),
    actualizado_en timestamptz default now()
);

alter table public.personal_capacitaciones enable row level security;

create policy "personal_capacitaciones_lectura" on public.personal_capacitaciones
    for select using (auth.role() = 'authenticated');

create policy "personal_capacitaciones_escritura" on public.personal_capacitaciones
    for all using (public.es_editor()) with check (public.es_editor());

-- ============================================================
-- FIN. Después de correr esto, importa (Table Editor > Insert >
-- Import data from CSV) el archivo:
--   personal_capacitaciones_import.csv  ->  personal_capacitaciones
-- ============================================================
