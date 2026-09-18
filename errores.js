/* ==========================================================
   MÓDULO CENTRAL DE MANEJO DE ERRORES
   HOME Delivery Logistics — Sistema de Seguridad
   Cárgalo con <script src="errores.js"></script> ANTES que
   el <script> propio de cada página.
   ========================================================== */

/* ---------- 1. Notificaciones no bloqueantes (reemplaza alert) ---------- */
(function inyectarEstilosAviso() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes avisoIn { from { opacity:0; transform:translateX(20px);} to {opacity:1; transform:translateX(0);} }
        #avisoContenedor { position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px; max-width:340px; }
        .aviso-toast { background:#fff; padding:12px 16px; border-radius:6px; font-size:13px; line-height:1.4;
            box-shadow:0 4px 14px rgba(0,0,0,0.15); animation:avisoIn .2s ease-out; border-left:4px solid #0f4c81; color:#334155; }
    `;
    document.head.appendChild(style);
})();

/**
 * Muestra una notificación temporal en la esquina superior derecha.
 * @param {string} mensaje
 * @param {'exito'|'error'|'advertencia'|'info'} tipo
 * @param {number} duracionMs
 */
function mostrarAviso(mensaje, tipo = 'info', duracionMs = 4500) {
    let contenedor = document.getElementById('avisoContenedor');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'avisoContenedor';
        contenedor.setAttribute('role', 'status');
        contenedor.setAttribute('aria-live', 'polite');
        document.body.appendChild(contenedor);
    }
    const colores = { exito: '#16a34a', error: '#ef4444', advertencia: '#e0a800', info: '#1f8bc9' };
    const aviso = document.createElement('div');
    aviso.className = 'aviso-toast';
    aviso.style.borderLeftColor = colores[tipo] || colores.info;
    aviso.textContent = mensaje;
    contenedor.appendChild(aviso);
    setTimeout(() => {
        aviso.style.transition = 'opacity .3s ease';
        aviso.style.opacity = '0';
        setTimeout(() => aviso.remove(), 300);
    }, duracionMs);
}

/* ---------- 1b. Modo sin conexión ---------- */

/**
 * Muestra una barra fija arriba de la pantalla cuando el navegador
 * pierde la conexión a internet, y la retira automáticamente al
 * recuperarla. También expone estaEnLinea() para que un formulario
 * pueda impedir el guardado mientras no haya conexión.
 */
(function inicializarAvisoOffline() {
    function actualizarBarraOffline() {
        let barra = document.getElementById('avisoOffline');
        if (navigator.onLine) {
            if (barra) barra.remove();
            return;
        }
        if (barra) return;
        barra = document.createElement('div');
        barra.id = 'avisoOffline';
        barra.setAttribute('role', 'alert');
        barra.textContent = '⚠️ Sin conexión a internet. Los cambios no se pueden guardar hasta que vuelva la señal.';
        barra.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:10000;background:#ef4444;color:#fff;text-align:center;padding:10px;font-size:13px;font-weight:600;';
        document.body.prepend(barra);
    }
    window.addEventListener('online', actualizarBarraOffline);
    window.addEventListener('offline', actualizarBarraOffline);
    document.addEventListener('DOMContentLoaded', actualizarBarraOffline);
})();

function estaEnLinea() {
    return navigator.onLine;
}

/* ---------- 1c. Validación de enlaces (OneDrive u otros) ---------- */

/**
 * Verifica que un texto sea una URL http(s) válida. Un campo de link
 * vacío se considera válido (el link es opcional en la mayoría de formularios);
 * solo se rechaza si el usuario escribió algo que no es una URL real.
 */
function esUrlValida(texto) {
    const valor = String(texto || '').trim();
    if (!valor) return true;
    try {
        const url = new URL(valor);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

/* ---------- 2. Acceso seguro a localStorage ---------- */

/**
 * Lee y parsea una clave de localStorage. Si el dato está corrupto,
 * avisa al usuario, limpia esa clave y devuelve el valor por defecto
 * en lugar de romper la página con una excepción sin controlar.
 */
function obtenerDatoSeguro(clave, valorPorDefecto) {
    try {
        const crudo = localStorage.getItem(clave);
        if (crudo === null || crudo === undefined) return valorPorDefecto;
        return JSON.parse(crudo);
    } catch (error) {
        console.error(`[errores.js] Dato corrupto en "${clave}":`, error);
        mostrarAviso(`No se pudieron leer los datos guardados ("${clave}"). Esa sección se restableció para evitar que la página falle.`, 'error', 7000);
        try { localStorage.removeItem(clave); } catch (e) { /* almacenamiento no disponible */ }
        return valorPorDefecto;
    }
}

/**
 * Guarda un valor en localStorage de forma segura.
 * Devuelve true/false para que el código que llama decida qué hacer.
 */
function guardarDatoSeguro(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;
    } catch (error) {
        if (error && (error.name === 'QuotaExceededError' || error.code === 22)) {
            mostrarAviso('El almacenamiento local está lleno (fotos y documentos ocupan espacio). Elimina evidencias o registros antiguos y vuelve a intentarlo.', 'error', 8000);
        } else {
            console.error(`[errores.js] Error guardando "${clave}":`, error);
            mostrarAviso('Ocurrió un error inesperado al guardar los datos. Vuelve a intentarlo.', 'error');
        }
        return false;
    }
}

/* ---------- 3. Validación de archivos antes de convertir a Base64 ---------- */
const LIMITE_MB_POR_ARCHIVO = 5;

/**
 * Filtra archivos que superan el límite de tamaño para evitar
 * llenar localStorage con un solo archivo pesado.
 */
function validarArchivos(fileList, limiteMB = LIMITE_MB_POR_ARCHIVO) {
    const validos = [];
    const rechazados = [];
    Array.from(fileList).forEach(f => {
        if (f.size > limiteMB * 1024 * 1024) {
            rechazados.push(f.name);
        } else {
            validos.push(f);
        }
    });
    if (rechazados.length > 0) {
        mostrarAviso(`Se omitieron ${rechazados.length} archivo(s) por superar ${limiteMB}MB: ${rechazados.join(', ')}`, 'advertencia', 6500);
    }
    return validos;
}

/* ---------- 4. Validación de formularios ---------- */

/**
 * Marca en rojo y enfoca el primer campo vacío de la lista de ids.
 * Devuelve true si todo está completo.
 */
function validarCamposRequeridos(ids) {
    const faltantes = [];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!String(el.value || '').trim()) {
            faltantes.push(el);
            el.style.borderColor = '#dc3545';
        } else {
            el.style.borderColor = '';
        }
    });
    if (faltantes.length > 0) {
        mostrarAviso('Completa los campos resaltados antes de continuar.', 'advertencia');
        faltantes[0].focus();
        return false;
    }
    return true;
}

/* ---------- 4b. Interruptor de tema claro / oscuro ---------- */

/** Devuelve el tema activo ahora mismo ('dark' o 'light'). */
function obtenerTemaActual() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/** Aplica un tema, lo recuerda para la próxima visita, y avisa a quien esté escuchando (ej. para redibujar gráficas). */
function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema === 'light' ? 'light' : 'dark');
    try { localStorage.setItem('previcheck-tema', tema); } catch (e) { /* almacenamiento no disponible */ }
    actualizarBotonTema();
    window.dispatchEvent(new CustomEvent('previcheck:tema-cambiado', { detail: { tema } }));
}

function alternarTema() {
    aplicarTema(obtenerTemaActual() === 'dark' ? 'light' : 'dark');
}

function actualizarBotonTema() {
    const boton = document.getElementById('botonTema');
    if (!boton) return;
    const esOscuro = obtenerTemaActual() === 'dark';
    boton.textContent = esOscuro ? '☀️' : '🌙';
    const etiqueta = esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    boton.setAttribute('aria-label', etiqueta);
    boton.title = etiqueta;
}

/** Crea el botón flotante de tema una sola vez, en cualquier página que cargue errores.js. */
function inicializarBotonTema() {
    if (document.getElementById('botonTema')) return;

    const style = document.createElement('style');
    style.textContent = `
        #botonTema {
            position: fixed; bottom: 20px; right: 20px; z-index: 9998;
            width: 44px; height: 44px; border-radius: 50%;
            border: 1px solid var(--border-color, #2a3550);
            background: var(--card-bg, #141b2e);
            box-shadow: var(--shadow-md, 0 10px 28px rgba(0,0,0,0.55));
            font-size: 19px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.15s ease;
        }
        #botonTema:hover { transform: scale(1.08); }
        #botonTema:focus-visible { outline: 2px solid var(--home-azul, #1f8bc9); outline-offset: 2px; }
    `;
    document.head.appendChild(style);

    const boton = document.createElement('button');
    boton.id = 'botonTema';
    boton.type = 'button';
    boton.onclick = alternarTema;
    document.body.appendChild(boton);

    actualizarBotonTema();
}

document.addEventListener('DOMContentLoaded', inicializarBotonTema);

/* ---------- 5. Red de seguridad global ---------- */
window.addEventListener('error', (e) => {
    console.error('[errores.js] Error no controlado:', e.error || e.message);
    mostrarAviso('Ocurrió un error inesperado en la página. Si algo se ve mal, recarga la página.', 'error', 6500);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('[errores.js] Promesa rechazada sin controlar:', e.reason);
    mostrarAviso('Ocurrió un error inesperado al procesar una operación.', 'error', 6500);
});
