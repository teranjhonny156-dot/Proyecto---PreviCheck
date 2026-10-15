-- ============================================================
-- AJUSTE — Estado simplificado "Cerrado / Pendiente" por caso
-- Módulo: Estadísticas CCTV (estadisticas_cctv)
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

-- Campo booleano que marca manualmente el operador (no se calcula
-- a partir de la Resolución — un caso "4. Cargado con observaciones"
-- puede seguir pendiente o ya estar resuelto, y eso solo lo sabe
-- quien lo gestiona). Los casos nuevos entran como pendientes.
alter table public.estadisticas_cctv
    add column if not exists cerrado boolean not null default false;

-- ============================================================
-- FIN. No se requiere nada más: el campo folio ya existente no se
-- vuelve único a nivel de base de datos (los folios duplicados que
-- ya existen deben poder seguir consultándose) — la validación de
-- "no permitir un folio duplicado nuevo" se hace en la aplicación.
-- ============================================================
