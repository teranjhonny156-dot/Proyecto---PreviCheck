-- ============================================================
-- LISTAS EDITABLES DE PRECINTOS.HTML — Encargado y Color
-- (mismo patrón que la tabla "opciones_destino" que ya tienes)
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

create table public.opciones_encargado (
    id bigint generated always as identity primary key,
    valor text not null unique
);

alter table public.opciones_encargado enable row level security;

create policy "opciones_encargado_lectura" on public.opciones_encargado
    for select using (auth.role() = 'authenticated');

create policy "opciones_encargado_escritura" on public.opciones_encargado
    for all using (public.es_editor()) with check (public.es_editor());

insert into public.opciones_encargado (valor) values
    ('Ana Flores'), ('Eduardo Solano'), ('José Hernandez'),
    ('Jhonny Teran'), ('Flor Lopez'), ('Agente ISEG')
on conflict (valor) do nothing;


create table public.opciones_color (
    id bigint generated always as identity primary key,
    valor text not null unique
);

alter table public.opciones_color enable row level security;

create policy "opciones_color_lectura" on public.opciones_color
    for select using (auth.role() = 'authenticated');

create policy "opciones_color_escritura" on public.opciones_color
    for all using (public.es_editor()) with check (public.es_editor());

insert into public.opciones_color (valor) values
    ('NARANJA'), ('AZUL'), ('VERDE'), ('ROJO'), ('AMARILLO')
on conflict (valor) do nothing;
