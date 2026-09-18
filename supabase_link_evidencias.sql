alter table public.capacitaciones
    add column if not exists link_evidencias text;

-- Las columnas "fotos" y "documentos" (jsonb) se dejan intactas por si
-- tienes registros antiguos con archivos ya subidos a Storage — simplemente
-- ya no se usan para los registros nuevos.
