/* ==========================================================
   CONEXIÓN A SUPABASE — HOME Delivery Logistics
   Cárgalo DESPUÉS de errores.js y del <script> del SDK de Supabase:

   <script src="errores.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="supabase-config.js"></script>
   ========================================================== */

const SUPABASE_URL = 'https://jsbtqfqhdaghtglxnsjb.supabase.co';
const SUPABASE_KEY = 'sb_publishable__a8IHpZQwJgV9x2_P6HLpg_2RklCFah';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Estilos para elementos restringidos a "editor" ---------- */
(function inyectarEstilosRol() {
    const style = document.createElement('style');
    style.textContent = `.deshabilitado-lector { opacity: 0.5; cursor: not-allowed !important; pointer-events: none; }`;
    document.head.appendChild(style);
})();

/* ---------- 1. Sesión y roles ---------- */

/**
 * Verifica que haya una sesión de Supabase activa; si no, redirige al login.
 * Debe llamarse (con await) al inicio de cada página protegida.
 */
async function exigirSesion() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.href = 'index.html';
        return null;
    }
    // Si no tenemos el rol en esta pestaña (recarga de página), lo recuperamos.
    if (!sessionStorage.getItem('rolUsuario')) {
        const perfil = await obtenerPerfilActual();
        if (!perfil) {
            mostrarAviso('Tu cuenta no tiene un perfil asignado. Contacta al administrador.', 'error', 7000);
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
            return null;
        }
        sessionStorage.setItem('rolUsuario', perfil.rol);
        sessionStorage.setItem('nombreUsuario', perfil.nombre);
    }
    aplicarRestriccionesRol();
    return session;
}

/** Consulta la tabla perfiles para el usuario autenticado actual. */
async function obtenerPerfilActual() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabaseClient
        .from('perfiles')
        .select('nombre, rol')
        .eq('id', user.id)
        .single();
    if (error) {
        console.error('[supabase-config] Error obteniendo perfil:', error);
        return null;
    }
    return data;
}

function esLector() {
    return sessionStorage.getItem('rolUsuario') === 'lector';
}

/** Oculta o deshabilita todo elemento marcado data-solo-editor cuando el rol es "lector". */
function aplicarRestriccionesRol() {
    if (!esLector()) return;
    document.querySelectorAll('[data-solo-editor]').forEach(el => {
        if (el.dataset.soloEditor === 'ocultar') {
            el.style.display = 'none';
        } else {
            if ('disabled' in el) el.disabled = true;
            el.classList.add('deshabilitado-lector');
        }
    });
}

/* ---------- 2. Manejo de errores de Supabase ---------- */
function manejarErrorSupabase(error, contexto = '') {
    console.error(`[Supabase]${contexto ? ' ' + contexto : ''}:`, error);
    const mensaje = (error && error.message) || '';
    if (error && (error.code === '42501' || /row-level security|permission denied/i.test(mensaje))) {
        mostrarAviso('No tienes permiso para realizar esta acción (tu cuenta es de solo lectura).', 'advertencia');
    } else if (/Failed to fetch|NetworkError/i.test(mensaje)) {
        mostrarAviso('No se pudo conectar con el servidor. Verifica tu conexión a internet.', 'error');
    } else {
        mostrarAviso('Ocurrió un error al comunicarse con el servidor. Inténtalo de nuevo.', 'error');
    }
}

/**
 * Trae TODAS las filas de una tabla, sin importar cuántas haya.
 * Supabase limita cada consulta a un máximo de 1000 filas por defecto;
 * esta función pagina automáticamente en bloques de 1000 hasta traerlas todas.
 */
async function listarTodasLasFilas(tabla, columnaOrden, ascendente = false, contexto = '') {
    const TAM_PAGINA = 1000;
    let desde = 0;
    let todas = [];

    while (true) {
        const { data, error } = await supabaseClient
            .from(tabla)
            .select('*')
            .order(columnaOrden, { ascending: ascendente })
            .range(desde, desde + TAM_PAGINA - 1);

        if (error) { manejarErrorSupabase(error, contexto || `listando ${tabla}`); return todas; }

        todas = todas.concat(data || []);
        if (!data || data.length < TAM_PAGINA) break;
        desde += TAM_PAGINA;
    }
    return todas;
}

/* ---------- 3. Casos CCTV ---------- */
async function listarCasosCCTV() {
    return await listarTodasLasFilas('estadisticas_cctv', 'fecha_solicitud', false, 'listando casos CCTV');
}

async function guardarCasoCCTVRemoto(registro, idExistente) {
    if (idExistente) {
        const { error } = await supabaseClient.from('estadisticas_cctv').update(registro).eq('id', idExistente);
        if (error) { manejarErrorSupabase(error, 'actualizando caso CCTV'); return false; }
    } else {
        const { error } = await supabaseClient.from('estadisticas_cctv').insert(registro);
        if (error) { manejarErrorSupabase(error, 'creando caso CCTV'); return false; }
    }
    return true;
}

async function eliminarCasoCCTVRemoto(id) {
    const { error } = await supabaseClient.from('estadisticas_cctv').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando caso CCTV'); return false; }
    return true;
}
/* ---------- 4. Casilleros ---------- */
async function listarCasilleros() {
    let data = await listarTodasLasFilas('casilleros', 'numero', true, 'listando casilleros');

    if (data.length === 0 && !esLector()) {
        const filas = Array.from({ length: 180 }, (_, i) => ({ numero: i + 1, estado: 'disponible' }));
        const { error: errorSiembra } = await supabaseClient.from('casilleros').insert(filas);
        if (errorSiembra) {
            manejarErrorSupabase(errorSiembra, 'sembrando casilleros');
        } else {
            data = await listarTodasLasFilas('casilleros', 'numero', true, 'listando casilleros');
        }
    }
    return data;
}

async function actualizarCasillero(id, campos) {
    const { error } = await supabaseClient.from('casilleros').update(campos).eq('id', id);
    if (error) { manejarErrorSupabase(error, 'actualizando casillero'); return false; }
    return true;
}

/* ---------- 5. Inspecciones de casilleros ---------- */
async function listarInspeccionesCasilleros() {
    return await listarTodasLasFilas('inspecciones_casilleros', 'fecha', false, 'listando inspecciones');
}

async function guardarInspeccionCasillero(registro) {
    const { error } = await supabaseClient.from('inspecciones_casilleros').insert(registro);
    if (error) { manejarErrorSupabase(error, 'guardando inspección'); return false; }
    return true;
}

async function eliminarInspeccionCasillero(id) {
    const { error } = await supabaseClient.from('inspecciones_casilleros').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando inspección'); return false; }
    return true;
}

/* ---------- 6. Precintos ---------- */
async function listarPrecintos() {
    return await listarTodasLasFilas('precintos', 'fecha', false, 'listando precintos');
}

async function guardarPrecintoRemoto(registro, idExistente) {
    if (idExistente) {
        const { error } = await supabaseClient.from('precintos').update(registro).eq('id', idExistente);
        if (error) { manejarErrorSupabase(error, 'actualizando precinto'); return false; }
    } else {
        const { error } = await supabaseClient.from('precintos').insert(registro);
        if (error) { manejarErrorSupabase(error, 'creando precinto'); return false; }
    }
    return true;
}

async function eliminarPrecintoRemoto(id) {
    const { error } = await supabaseClient.from('precintos').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando precinto'); return false; }
    return true;
}

/* ---------- 7. Listas editables de precintos.html (destino, encargado, color) ---------- */
/**
 * Funciones genéricas para cualquier "lista editable" de precintos.html
 * (destino, encargado, color...). Cada una vive en su propia tabla
 * (misma estructura: id + valor), así que basta con pasar el nombre
 * de la tabla en vez de duplicar estas 3 funciones para cada lista.
 */
async function listarOpciones(tabla) {
    return await listarTodasLasFilas(tabla, 'valor', true, `listando ${tabla}`);
}

async function agregarOpcion(tabla, valor) {
    const { error } = await supabaseClient.from(tabla).insert({ valor: valor.toUpperCase() });
    if (error) {
        if (error.code === '23505') {
            mostrarAviso('Esa opción ya existe en la lista.', 'advertencia');
        } else {
            manejarErrorSupabase(error, `agregando a ${tabla}`);
        }
        return false;
    }
    return true;
}

async function eliminarOpcion(tabla, id) {
    const { error } = await supabaseClient.from(tabla).delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, `eliminando de ${tabla}`); return false; }
    return true;
}

/* ---------- 8. Personal por Área + Capacitaciones Obligatorias ---------- */
async function listarPersonalCapacitaciones() {
    return await listarTodasLasFilas('personal_capacitaciones', 'area', true, 'listando personal de capacitaciones');
}

async function agregarPersonalCapacitaciones(registro) {
    const { error } = await supabaseClient.from('personal_capacitaciones').insert(registro);
    if (error) { manejarErrorSupabase(error, 'agregando personal'); return false; }
    return true;
}

async function actualizarPersonalCapacitaciones(id, campos) {
    const { error } = await supabaseClient.from('personal_capacitaciones').update(campos).eq('id', id);
    if (error) { manejarErrorSupabase(error, 'actualizando personal'); return false; }
    return true;
}

async function eliminarPersonalCapacitaciones(id) {
    const { error } = await supabaseClient.from('personal_capacitaciones').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando personal'); return false; }
    return true;
}

/* ---------- 9. Cámaras CCTV (Control de Grabaciones) ---------- */
async function listarCamarasCCTV() {
    return await listarTodasLasFilas('camaras_cctv', 'numero', true, 'listando cámaras');
}

async function agregarCamara(registro) {
    const { error } = await supabaseClient.from('camaras_cctv').insert(registro);
    if (error) { manejarErrorSupabase(error, 'agregando cámara'); return false; }
    return true;
}

async function actualizarCamara(id, campos) {
    const { error } = await supabaseClient.from('camaras_cctv').update(campos).eq('id', id);
    if (error) { manejarErrorSupabase(error, 'actualizando cámara'); return false; }
    return true;
}

async function eliminarCamara(id) {
    const { error } = await supabaseClient.from('camaras_cctv').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando cámara'); return false; }
    return true;
}

/* ---------- 10. Link de Imágenes por Sede (Control de Grabaciones) ---------- */
async function obtenerLinkImagenesSede(sede) {
    const { data, error } = await supabaseClient.from('grabaciones_imagenes').select('link').eq('sede', sede).maybeSingle();
    if (error) { manejarErrorSupabase(error, 'obteniendo el link de imágenes'); return null; }
    return data ? data.link : null;
}

async function guardarLinkImagenesSede(sede, link) {
    const { error } = await supabaseClient.from('grabaciones_imagenes').upsert({ sede, link, actualizado_en: new Date().toISOString() });
    if (error) { manejarErrorSupabase(error, 'guardando el link de imágenes'); return false; }
    return true;
}
