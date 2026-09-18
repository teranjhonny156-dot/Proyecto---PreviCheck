-- ============================================================
-- 1. TABLA DE OPCIONES DE DESTINO (editable desde la app)
-- ============================================================
create table public.opciones_destino (
    id bigint generated always as identity primary key,
    valor text not null unique
);

alter table public.opciones_destino enable row level security;

create policy "opciones_destino_lectura" on public.opciones_destino
    for select using (auth.role() = 'authenticated');

create policy "opciones_destino_escritura" on public.opciones_destino
    for all using (public.es_editor()) with check (public.es_editor());

insert into public.opciones_destino (valor) values
('AREQUIPA'), ('BTL'), ('CAJAMARCA'), ('CAÑETE'), ('CD VES'), ('CHICLAYO'),
('CHIMBOTE'), ('CUSCO'), ('DEVOLUCIONES'), ('HUANCAYO'), ('HUARAZ'), ('ICA'),
('INTERCORP'), ('MASTER BOX'), ('MOTORIZADOS'), ('NORTE CHICO'), ('PIURA'),
('SERVICORP'), ('SODIMAC'), ('TACNA'), ('TRUJILLO')
on conflict (valor) do nothing;

-- ============================================================
-- 2. REEMPLAZAR LOS DATOS DE PRECINTOS (el archivo nuevo corrige
--    enero-septiembre completo). Vac\u00eda la tabla antes de importar
--    el nuevo CSV: precintos_2026_import_v2.csv
-- ============================================================
truncate table public.precintos restart identity;
