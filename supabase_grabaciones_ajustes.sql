-- ============================================================
-- AJUSTES AL MÓDULO DE CONTROL DE GRABACIONES CCTV
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Ya no se guarda un link de imagen POR cámara (se reemplaza
--    por un único link de imágenes por sede, ver tabla de abajo).
alter table public.camaras_cctv drop column if exists link_imagen;

-- 2. Un solo link de OneDrive por sede, con las imágenes de
--    todas sus cámaras juntas.
create table public.grabaciones_imagenes (
    sede text primary key,
    link text,
    actualizado_en timestamptz default now()
);

alter table public.grabaciones_imagenes enable row level security;

create policy "grabaciones_imagenes_lectura" on public.grabaciones_imagenes
    for select using (auth.role() = 'authenticated');

create policy "grabaciones_imagenes_escritura" on public.grabaciones_imagenes
    for all using (public.es_editor()) with check (public.es_editor());

-- 3. Lista editable de auditores (igual patrón que Destino/
--    Encargado/Color de precintos.html — reutiliza las mismas
--    funciones genéricas listarOpciones/agregarOpcion/eliminarOpcion).
create table public.opciones_auditor (
    id bigint generated always as identity primary key,
    valor text not null unique
);

alter table public.opciones_auditor enable row level security;

create policy "opciones_auditor_lectura" on public.opciones_auditor
    for select using (auth.role() = 'authenticated');

create policy "opciones_auditor_escritura" on public.opciones_auditor
    for all using (public.es_editor()) with check (public.es_editor());

insert into public.opciones_auditor (valor) values
    ('Jhonny Teran'), ('José Hernandez'), ('Eduardo Solano')
on conflict (valor) do nothing;

-- ============================================================
-- HISTORIAL DE AUDITORÍAS POR CÁMARA
-- Cada vez que se guarda una cámara (nueva o editada), queda un
-- registro aquí. Así se puede ver el último estado (en camaras_cctv)
-- y todo el historial de auditorías anteriores de esa cámara.
-- ============================================================
create table public.camaras_cctv_historial (
    id bigint generated always as identity primary key,
    camara_id bigint references public.camaras_cctv(id) on delete cascade,
    estado text,
    dias_grabacion integer,
    auditor text,
    fecha_auditoria date,
    observaciones text,
    registrado_en timestamptz default now(),
    registrado_por uuid references auth.users(id)
);

alter table public.camaras_cctv_historial enable row level security;

create policy "camaras_cctv_historial_lectura" on public.camaras_cctv_historial
    for select using (auth.role() = 'authenticated');

create policy "camaras_cctv_historial_escritura" on public.camaras_cctv_historial
    for all using (public.es_editor()) with check (public.es_editor());
