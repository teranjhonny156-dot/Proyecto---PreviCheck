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
