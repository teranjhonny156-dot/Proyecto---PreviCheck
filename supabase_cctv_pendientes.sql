-- ============================================================
-- AJUSTE — Motivo del pendiente por caso
-- Módulo: Estadísticas CCTV (estadisticas_cctv)
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- (Requiere haber corrido antes supabase_cctv_cerrado.sql)
-- ============================================================
alter table public.estadisticas_cctv
    add column if not exists motivo_pendiente text;
