/* ==========================================================
   REGLAS DE NEGOCIO COMPARTIDAS (cctv.html, grabaciones.html, index.html)
   Requiere errores.js (fechaHoyPeru). Sin dependencias de Supabase.
   ========================================================== */

/* ---------- Búsqueda: sin mayúsculas, tildes ni espacios sobrantes ---------- */
function normalizarBusqueda(texto) {
    return (texto || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/* Ejecuta fn recién cuando el usuario deja de escribir (evita redibujar en cada tecla) */
function conPausa(fn, ms = 250) {
    let temporizador;
    return (...args) => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => fn(...args), ms);
    };
}

/* ---------- Días transcurridos desde una fecha 'AAAA-MM-DD' hasta hoy (Perú) ---------- */
function diasDesde(fecha) {
    if (!fecha) return null;
    const [a, m, d] = fecha.split('-').map(Number);
    const [ha, hm, hd] = fechaHoyPeru().split('-').map(Number);
    return Math.max(0, Math.round((Date.UTC(ha, hm - 1, hd) - Date.UTC(a, m - 1, d)) / 86400000));
}

/* ---------- Casos CCTV: un folio = un caso ----------
   Cuenta la respuesta con la fecha de solicitud más antigua (si empatan, la
   cargada primero). Las demás son "ampliaciones": se guardan y se ven, pero
   no suman en las estadísticas. El estado del caso es el de su última respuesta. */
function normalizarFolio(folio) {
    return (folio || '').toString().trim().toLowerCase();
}

function ordenarRegistrosFolio(registros) {
    return [...registros].sort((a, b) =>
        (a.fecha_solicitud || '').localeCompare(b.fecha_solicitud || '') || (a.id - b.id));
}

function construirGruposFolio(lista) {
    const mapa = {};
    lista.forEach(c => {
        const clave = normalizarFolio(c.folio) || ('sin-folio-' + c.id);
        if (!mapa[clave]) mapa[clave] = [];
        mapa[clave].push(c);
    });
    return Object.values(mapa).map(regs => {
        const registros = ordenarRegistrosFolio(regs);
        return { folio: registros[0].folio, registros, principal: registros[0], ultimo: registros[registros.length - 1] };
    });
}

/* Días que lleva pendiente un caso: desde que se respondió (o se solicitó, si no hay respuesta) */
function antiguedadPendiente(grupo) {
    const u = grupo.ultimo;
    return diasDesde(u.fecha_respuesta || u.fecha_solicitud);
}

/* ---------- Grabaciones: semáforo por sede ----------
   Se colorea según la cámara con menos días de grabación disponibles. */
function calcularSemaforoSede(camarasSede) {
    if (!camarasSede || camarasSede.length === 0) {
        return { color: 'gris', titulo: 'Sin cámaras registradas en esta sede.' };
    }

    const auditadas = camarasSede.filter(c => c.dias_grabacion_disponibles !== null && c.dias_grabacion_disponibles !== undefined);
    const sinAuditar = camarasSede.length - auditadas.length;

    if (auditadas.length === 0) {
        return { color: 'gris', titulo: `Ninguna cámara de esta sede ha sido auditada aún (${camarasSede.length}).` };
    }

    const minDias = Math.min(...auditadas.map(c => Number(c.dias_grabacion_disponibles)));
    let color;
    if (minDias <= 7) color = 'rojo';
    else if (minDias <= 14) color = 'amarillo';
    else color = 'verde';

    let titulo = `Cámara más crítica: ${minDias} día${minDias === 1 ? '' : 's'} de grabación disponibles.`;
    if (sinAuditar > 0) titulo += ` ${sinAuditar} cámara${sinAuditar === 1 ? '' : 's'} sin auditar.`;
    return { color, titulo };
}


/* ---------- Plugins de Chart.js (registrar con Chart.register en cada página) ---------- */

/* Dibuja el valor de cada barra. Solo actúa en gráficas de barras y solo si se pide
   explícitamente con options.plugins.valoresEnBarras = { activo: true }.
   (Chart.js entrega un objeto vacío a todo plugin registrado, por eso no basta con "existe"). */
const PLUGIN_VALORES_EN_BARRAS = {
    id: 'valoresEnBarras',
    afterDatasetsDraw(chart, _args, opciones) {
        if (!opciones || !opciones.activo || chart.config.type !== 'bar') return;
        const { ctx } = chart;
        const horizontal = chart.options.indexAxis === 'y';
        ctx.save();
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#334155';
        ctx.font = '600 11px "Segoe UI", sans-serif';
        chart.data.datasets.forEach((dataset, i) => {
            chart.getDatasetMeta(i).data.forEach((barra, j) => {
                const valor = dataset.data[j];
                if (!valor) return;
                const texto = opciones.formato ? opciones.formato(valor) : formatearNumero(valor);
                if (horizontal) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(texto, barra.x + 6, barra.y); }
                else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(texto, barra.x, barra.y - 4); }
            });
        });
        ctx.restore();
    }
};

/* Texto en el centro de una dona. Solo actúa si se le da un texto: options.plugins.textoCentro = { principal, secundario }. */
const PLUGIN_TEXTO_CENTRO = {
    id: 'textoCentro',
    afterDraw(chart, _args, opciones) {
        if (!opciones || opciones.principal === undefined) return;
        const { ctx, chartArea } = chart;
        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;
        const estilos = getComputedStyle(document.documentElement);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = estilos.getPropertyValue('--title-color').trim() || '#0f172a';
        ctx.font = '700 26px "Segoe UI", sans-serif';
        ctx.fillText(opciones.principal, x, y - 8);
        ctx.fillStyle = estilos.getPropertyValue('--text-muted').trim() || '#64748b';
        ctx.font = '600 11px "Segoe UI", sans-serif';
        ctx.fillText(opciones.secundario, x, y + 14);
        ctx.restore();
    }
};

/* ---------- Números en gráficas ---------- */

/* 1234.5 -> "1,234.5"; sin ruido de decimales (45570.200000000004 -> "45,570.2") */
function formatearNumero(n, decimales = 2) {
    return Number(n).toLocaleString('es-PE', { maximumFractionDigits: decimales });
}

function redondear2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
}

/* Tooltip de gráficas circulares: "Cerrados (10): 83%" */
const TOOLTIP_PORCENTAJE = {
    callbacks: {
        label(ctx) {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? Math.round(ctx.parsed / total * 100) : 0;
            return ` ${ctx.label}: ${pct}%`;
        }
    }
};

/* ---------- Respaldo completo a Excel ----------
   hojas: [{ nombre: 'Casos', filas: [ {...}, ... ] }, ...]
   Guarda TODAS las columnas tal como están en la base (incluidos ids y fechas en AAAA-MM-DD),
   para poder restaurar o auditar. Los valores compuestos (JSON) se guardan como texto. */
function exportarRespaldoExcel(nombreBase, hojas) {
    const libro = XLSX.utils.book_new();
    hojas.forEach(h => {
        const filas = h.filas.length === 0 ? [{ '(sin datos)': '' }] : h.filas.map(fila => {
            const plana = {};
            Object.entries(fila).forEach(([k, v]) => {
                plana[k] = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : v);
            });
            return plana;
        });
        XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), h.nombre.slice(0, 31));
    });
    XLSX.writeFile(libro, `respaldo_${nombreBase}_${fechaHoyPeru()}.xlsx`);
}

/* Envuelve la descarga de un respaldo: avisa, bloquea el botón mientras trabaja y captura errores */
async function ejecutarRespaldo(boton, preparar) {
    if (!estaEnLinea()) { mostrarAviso('No hay conexión a internet. Espera a que vuelva la señal.', 'error'); return; }
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Preparando…';
    try {
        await preparar();
        mostrarAviso('Respaldo descargado.', 'exito');
    } catch (e) {
        console.error('[respaldo]', e);
        mostrarAviso('No se pudo generar el respaldo. Inténtalo nuevamente.', 'error');
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}
