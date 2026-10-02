-- ============================================================
-- MÓDULO: CONTROL DE GRABACIONES CCTV (auditoría de cámaras)
-- QOLQAS + 7 Centros de Transferencia (Trujillo, Chiclayo, Piura,
-- Arequipa, Ica, Chimbote, Huancayo)
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

create table public.camaras_cctv (
    id bigint generated always as identity primary key,
    sede text not null,
    numero integer,
    camara text not null,
    tipo_camara text,
    nvr_asociado text,
    estado text check (estado is null or estado in ('operativo', 'inoperativo')),
    dias_grabacion integer,
    auditor text,
    fecha_auditoria date,
    link_imagen text,
    observaciones text,
    creado_por uuid references auth.users(id),
    actualizado_en timestamptz default now()
);

alter table public.camaras_cctv enable row level security;

create policy "camaras_cctv_lectura" on public.camaras_cctv
    for select using (auth.role() = 'authenticated');

create policy "camaras_cctv_escritura" on public.camaras_cctv
    for all using (public.es_editor()) with check (public.es_editor());

-- ============================================================
-- FIN. Después de correr esto, importa (Table Editor > Insert >
-- Import data from CSV) el archivo:
--   camaras_cctv_import.csv  ->  camaras_cctv
-- (231 cámaras: 110 QOLQAS + 121 en las 7 sedes CT. Los campos
-- estado, días de grabación, auditor, fecha y observaciones vienen
-- vacíos — es el inventario base, listo para auditar desde la app)
-- ============================================================
