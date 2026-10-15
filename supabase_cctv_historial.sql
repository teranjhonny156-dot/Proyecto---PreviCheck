-- ============================================================
-- HISTORIAL DE CAMBIOS POR CASO — Estadísticas CCTV
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- (Requiere haber corrido antes supabase_cctv_cerrado.sql y
--  supabase_cctv_pendientes.sql)
--
-- Cada vez que se crea, edita o elimina un caso queda un registro:
-- quién lo hizo, cuándo y qué campos cambiaron (antes -> después).
-- Lo registra la propia base de datos (trigger), así no depende de
-- la pantalla y nadie puede editar un caso "sin dejar huella".
-- ============================================================

create table if not exists public.estadisticas_cctv_historial (
    id bigint generated always as identity primary key,
    caso_id bigint not null,
    folio text,
    accion text not null check (accion in ('creado', 'editado', 'eliminado')),
    cambios jsonb,
    usuario_id uuid,
    usuario_nombre text,
    registrado_en timestamptz not null default now()
);

create index if not exists idx_cctv_historial_caso on public.estadisticas_cctv_historial (caso_id, registrado_en desc);

alter table public.estadisticas_cctv_historial enable row level security;

-- Solo lectura para usuarios autenticados. NO hay política de escritura:
-- el único que escribe aquí es el trigger de abajo (security definer).
drop policy if exists "cctv_historial_lectura" on public.estadisticas_cctv_historial;
create policy "cctv_historial_lectura" on public.estadisticas_cctv_historial
    for select using (auth.role() = 'authenticated');

create or replace function public.registrar_historial_cctv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nombre text;
    v_cambios jsonb := '{}'::jsonb;
    v_old jsonb;
    v_new jsonb;
    v_clave text;
begin
    select nombre into v_nombre from public.perfiles where id = auth.uid();

    if tg_op = 'INSERT' then
        insert into public.estadisticas_cctv_historial (caso_id, folio, accion, cambios, usuario_id, usuario_nombre)
        values (new.id, new.folio, 'creado', null, auth.uid(), v_nombre);
        return new;

    elsif tg_op = 'UPDATE' then
        v_old := to_jsonb(old);
        v_new := to_jsonb(new);
        for v_clave in select jsonb_object_keys(v_new) loop
            if v_clave not in ('id', 'creado_por', 'creado_en', 'created_at', 'updated_at', 'actualizado_en')
               and (v_old -> v_clave) is distinct from (v_new -> v_clave) then
                v_cambios := v_cambios || jsonb_build_object(
                    v_clave, jsonb_build_object('antes', v_old -> v_clave, 'despues', v_new -> v_clave));
            end if;
        end loop;
        if v_cambios <> '{}'::jsonb then
            insert into public.estadisticas_cctv_historial (caso_id, folio, accion, cambios, usuario_id, usuario_nombre)
            values (new.id, new.folio, 'editado', v_cambios, auth.uid(), v_nombre);
        end if;
        return new;

    else -- DELETE: se guarda una copia del caso eliminado
        insert into public.estadisticas_cctv_historial (caso_id, folio, accion, cambios, usuario_id, usuario_nombre)
        values (old.id, old.folio, 'eliminado', to_jsonb(old), auth.uid(), v_nombre);
        return old;
    end if;
end;
$$;

drop trigger if exists trg_historial_cctv on public.estadisticas_cctv;
create trigger trg_historial_cctv
    after insert or update or delete on public.estadisticas_cctv
    for each row execute function public.registrar_historial_cctv();
