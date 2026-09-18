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

/* ---------- 3. Capacitaciones ---------- */
async function listarCapacitaciones() {
    return await listarTodasLasFilas('capacitaciones', 'creado_en', false, 'listando capacitaciones');
}

async function guardarCapacitacionRemota(registro, idExistente) {
    if (idExistente) {
        const { error } = await supabaseClient.from('capacitaciones').update(registro).eq('id', idExistente);
        if (error) { manejarErrorSupabase(error, 'actualizando capacitación'); return false; }
    } else {
        const { error } = await supabaseClient.from('capacitaciones').insert(registro);
        if (error) { manejarErrorSupabase(error, 'creando capacitación'); return false; }
    }
    return true;
}

async function eliminarCapacitacionRemota(id) {
    const { error } = await supabaseClient.from('capacitaciones').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando capacitación'); return false; }
    return true;
}

/* ---------- 4. Personal maestro ---------- */
async function listarPersonalMaestro() {
    return await listarTodasLasFilas('personal_maestro', 'nombre', true, 'listando personal');
}

async function agregarPersonalMaestro(nombre) {
    const { error } = await supabaseClient.from('personal_maestro').insert({ nombre });
    if (error) {
        if (error.code === '23505') {
            mostrarAviso('Este colaborador ya se encuentra registrado en el padrón.', 'advertencia');
        } else {
            manejarErrorSupabase(error, 'agregando colaborador');
        }
        return false;
    }
    return true;
}

async function eliminarPersonalMaestro(id) {
    const { error } = await supabaseClient.from('personal_maestro').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando colaborador'); return false; }
    return true;
}

/* ---------- 5. Cumplimiento anual ---------- */
async function listarCumplimiento() {
    return await listarTodasLasFilas('cumplimiento_anual', 'nombre', true, 'listando cumplimiento');
}

async function actualizarCumplimiento(id, campos) {
    const { error } = await supabaseClient.from('cumplimiento_anual').update(campos).eq('id', id);
    if (error) { manejarErrorSupabase(error, 'actualizando cumplimiento'); return false; }
    return true;
}

async function sembrarCumplimientoInicial(nombres) {
    const filas = nombres.map(nombre => ({ nombre, c1: true, c2: true, c3: true, c4: false, c5: false }));
    const { error } = await supabaseClient
        .from('cumplimiento_anual')
        .upsert(filas, { onConflict: 'nombre', ignoreDuplicates: true });
    if (error) console.error('[supabase-config] Error sembrando cumplimiento inicial:', error);
}

/* ---------- 6. Archivos (Storage) ---------- */
async function subirArchivo(file, carpeta) {
    const rutaLimpia = `${carpeta}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const { error: errorSubida } = await supabaseClient.storage.from('evidencias').upload(rutaLimpia, file);
    if (errorSubida) { manejarErrorSupabase(errorSubida, 'subiendo archivo'); return null; }

    const { data, error: errorUrl } = await supabaseClient
        .storage.from('evidencias')
        .createSignedUrl(rutaLimpia, 60 * 60 * 24 * 365); // válido 1 año
    if (errorUrl) { manejarErrorSupabase(errorUrl, 'generando enlace de archivo'); return null; }

    return { nombre: file.name, ruta: rutaLimpia, url: data.signedUrl };
}

async function eliminarArchivo(ruta) {
    if (!ruta) return;
    const { error } = await supabaseClient.storage.from('evidencias').remove([ruta]);
    if (error) console.error('[supabase-config] Error eliminando archivo:', error);
}
/* ---------- 7. Casos CCTV ---------- */
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
/* ---------- 8. Casilleros ---------- */
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

/* ---------- 9. Inspecciones de casilleros ---------- */
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

/* ---------- 10. Precintos ---------- */
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

/* ---------- 11. Opciones de Destino (lista editable de precintos.html) ---------- */
async function listarOpcionesDestino() {
    return await listarTodasLasFilas('opciones_destino', 'valor', true, 'listando destinos');
}

async function agregarOpcionDestino(valor) {
    const { error } = await supabaseClient.from('opciones_destino').insert({ valor: valor.toUpperCase() });
    if (error) {
        if (error.code === '23505') {
            mostrarAviso('Ese destino ya existe en la lista.', 'advertencia');
        } else {
            manejarErrorSupabase(error, 'agregando destino');
        }
        return false;
    }
    return true;
}

async function eliminarOpcionDestino(id) {
    const { error } = await supabaseClient.from('opciones_destino').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando destino'); return false; }
    return true;
}

/* ---------- 12. Control de Ingresos ---------- */

/** Busca un DNI puntual en el directorio (no trae toda la tabla — sería lentísimo con miles de filas). */
async function buscarEnDirectorio(dni) {
    const { data, error } = await supabaseClient
        .from('personal_directorio')
        .select('*')
        .eq('dni', dni)
        .maybeSingle();
    if (error) { manejarErrorSupabase(error, 'buscando en el directorio'); return null; }
    return data;
}

async function guardarEnDirectorio(registro) {
    const { error } = await supabaseClient
        .from('personal_directorio')
        .upsert(registro, { onConflict: 'dni' });
    if (error) { manejarErrorSupabase(error, 'guardando en el directorio'); return false; }
    return true;
}

/** Trae solo los ingresos SIN salida registrada (personal que sigue dentro), más recientes primero. */
async function listarIngresosAbiertos() {
    const { data, error } = await supabaseClient
        .from('control_ingresos')
        .select('*')
        .is('fecha_salida', null)
        .order('fecha_ingreso', { ascending: false });
    if (error) { manejarErrorSupabase(error, 'listando ingresos abiertos'); return []; }
    return data || [];
}

/** Trae los últimos N ingresos (para el historial), sin importar si ya salieron o no. */
async function listarIngresosRecientes(limite = 200) {
    const { data, error } = await supabaseClient
        .from('control_ingresos')
        .select('*')
        .order('fecha_ingreso', { ascending: false })
        .limit(limite);
    if (error) { manejarErrorSupabase(error, 'listando ingresos recientes'); return []; }
    return data || [];
}

async function registrarIngreso(registro) {
    const { data, error } = await supabaseClient.from('control_ingresos').insert(registro).select().single();
    if (error) { manejarErrorSupabase(error, 'registrando ingreso'); return null; }
    return data;
}

async function registrarSalidaIngreso(id, fechaSalida) {
    const { error } = await supabaseClient.from('control_ingresos').update({ fecha_salida: fechaSalida }).eq('id', id);
    if (error) { manejarErrorSupabase(error, 'registrando salida'); return false; }
    return true;
}

/* ---------- 13. Retiro de Equipos (PDA) ---------- */
async function listarEquiposPDA() {
    return await listarTodasLasFilas('equipos_pda', 'fecha_retiro', false, 'listando equipos PDA');
}

async function registrarRetiroPDA(registro) {
    const { error } = await supabaseClient.from('equipos_pda').insert(registro);
    if (error) { manejarErrorSupabase(error, 'registrando retiro de equipo'); return false; }
    return true;
}

async function registrarRetornoPDA(id, fechaRetorno) {
    const { error } = await supabaseClient.from('equipos_pda').update({ fecha_retorno: fechaRetorno, estado: 'devuelto' }).eq('id', id);
    if (error) { manejarErrorSupabase(error, 'registrando retorno de equipo'); return false; }
    return true;
}

/* ---------- 14. Personal Restringido ---------- */
async function listarPersonalRestringido() {
    return await listarTodasLasFilas('personal_restringido', 'nombres_apellidos', true, 'listando personal restringido');
}

async function agregarPersonalRestringido(registro) {
    const { error } = await supabaseClient.from('personal_restringido').insert(registro);
    if (error) { manejarErrorSupabase(error, 'agregando personal restringido'); return false; }
    return true;
}

async function eliminarPersonalRestringido(id) {
    const { error } = await supabaseClient.from('personal_restringido').delete().eq('id', id);
    if (error) { manejarErrorSupabase(error, 'eliminando personal restringido'); return false; }
    return true;
}

/** Verifica si un DNI está en la lista de personal restringido. */
async function estaEnListaRestringida(dni) {
    const { data, error } = await supabaseClient
        .from('personal_restringido')
        .select('id')
        .eq('dni', dni)
        .maybeSingle();
    if (error) { manejarErrorSupabase(error, 'verificando personal restringido'); return false; }
    return !!data;
}

/* ---------- 15. Personal por Área + Capacitaciones Obligatorias ---------- */
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
