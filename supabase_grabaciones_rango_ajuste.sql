-- ============================================================
-- AJUSTE — Rango de Grabación tipo "ventana deslizante" (NVR)
-- Módulo: Control de Grabaciones CCTV
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- (Este script corrige el enfoque anterior: ya NO se guarda una
-- fecha de inicio fija. En vez de eso, el auditor confirma cuántos
-- días de grabación tiene disponibles el NVR, y la app calcula
-- sola el rango "desde–hasta" cada día, deslizando ambas fechas
-- hacia adelante y manteniendo siempre ese mismo ancho.)
-- ============================================================

-- 1. camaras_cctv: fuera fecha_inicio_grabacion, entra el número
--    de días de grabación disponibles (lo que audita la persona).
alter table public.camaras_cctv
    add column if not exists dias_grabacion_disponibles integer;

alter table public.camaras_cctv
    drop column if exists fecha_inicio_grabacion;

-- 2. Mismo cambio en el historial de auditorías.
alter table public.camaras_cctv_historial
    add column if not exists dias_grabacion_disponibles integer;

alter table public.camaras_cctv_historial
    drop column if exists fecha_inicio_grabacion;

-- ============================================================
-- FIN. "Grabación desde" y "Grabación hasta" se calculan en el
-- navegador (hoy menos los días disponibles, y hoy) cada vez que
-- se abre la página — nunca se guardan como fechas fijas.
-- ============================================================
