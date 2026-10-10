-- ============================================================
-- AJUSTES — Rango de Grabación automático + Observaciones de Sede
-- Módulo: Control de Grabaciones CCTV
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Reemplaza el campo manual "Días de Grabación" por una fecha
--    de inicio ("Grabación desde"). Los días disponibles se
--    calculan en el navegador (hoy - fecha_inicio_grabacion),
--    por lo que ya no se guarda un número fijo.
alter table public.camaras_cctv
    add column if not exists fecha_inicio_grabacion date;

alter table public.camaras_cctv
    drop column if exists dias_grabacion;

-- 2. Mismo cambio en el historial de auditorías: en vez de guardar
--    los días de ese momento, se guarda la fecha de inicio vigente
--    en ese momento (así el historial sigue siendo fiel a lo auditado).
alter table public.camaras_cctv_historial
    add column if not exists fecha_inicio_grabacion date;

alter table public.camaras_cctv_historial
    drop column if exists dias_grabacion;

-- 3. Observaciones GENERALES de la sede (distintas de las
--    observaciones por cámara). Mismo patrón que
--    "grabaciones_imagenes": un solo valor por sede.
create table public.grabaciones_observaciones (
    sede text primary key,
    observaciones text,
    actualizado_en timestamptz default now()
);

alter table public.grabaciones_observaciones enable row level security;

create policy "grabaciones_observaciones_lectura" on public.grabaciones_observaciones
    for select using (auth.role() = 'authenticated');

create policy "grabaciones_observaciones_escritura" on public.grabaciones_observaciones
    for all using (public.es_editor()) with check (public.es_editor());

-- ============================================================
-- FIN. Las cámaras que ya tenían una fecha de auditoría conservan
-- sus demás datos; "Grabación desde" queda vacío hasta la próxima
-- vez que se guarde una auditoría de cada cámara (se completa solo).
-- ============================================================
