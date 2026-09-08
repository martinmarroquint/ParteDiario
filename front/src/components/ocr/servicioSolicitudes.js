// src/components/ocr/servicioSolicitudes.js
// Servicio de SOLICITUDES DE CAMBIO DE TURNO — CADENA MULTINIVEL
// La cadena de aprobación se almacena en la columna 'detalle' (JSON existente)
// No se modifican columnas del sheet ni el Apps Script
import { esPersonalCivil, DEFAULT_GOOGLE_CONFIG } from './constantes';

export const HOJA_SOLICITUDES = 'SOLICITUDES_CAMBIOS';

export const ESTADOS = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  DESAPROBADO: 'DESAPROBADO',
};

export const ESTADOS_META = {
  [ESTADOS.PENDIENTE]:   { etiqueta: 'Pendiente',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  [ESTADOS.APROBADO]:    { etiqueta: 'Aprobado',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  [ESTADOS.DESAPROBADO]: { etiqueta: 'Desaprobado', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const NIVEL_LABELS = {
  1: 'Jefe de Área',
  2: 'Jefe de Departamento',
  3: 'Jefe de División',
  4: 'Administrador',
};

export const getNivelLabel = (nivel) => NIVEL_LABELS[nivel] || `Nivel ${nivel}`;

export const TIPOS_CAMBIO = [
  { value: 'INTERCAMBIO CON COMPAÑERO', label: 'Intercambio con compañero' },
  { value: 'DESCANSO MEDICO', label: 'Descanso médico' },
  { value: 'COMISION', label: 'Comisión' },
  { value: 'EMERGENCIA', label: 'Emergencia' },
  { value: 'COORDINACION', label: 'Coordinación' },
  { value: 'OTRO', label: 'Otro' },
];

const IND = {
  id: 0, fecha: 1, solicitante: 2, areaSolicitante: 3,
  hoja: 4, mes: 5, anio: 6, dias: 7, tipo: 8, motivo: 9, pormenores: 10,
  estado: 11, revisadoPor: 12, fechaRevision: 13, observacion: 14,
  p1: { trabajador: 15, dni: 16, fila: 17, area: 18, turnoActual: 19, turnoActualNombre: 20, turnoSolicitado: 21, turnoSolicitadoNombre: 22 },
  p2: { trabajador: 23, dni: 24, fila: 25, area: 26, turnoActual: 27, turnoActualNombre: 28, turnoSolicitado: 29, turnoSolicitadoNombre: 30 },
  detalle: 31,
};

const leerParticipante = (c, p) => {
  if (!String(c[p.trabajador] || '').trim()) return null;
  return {
    trabajador: String(c[p.trabajador] || '').trim(),
    dni: String(c[p.dni] || '').trim(),
    fila: parseInt(c[p.fila]) || 0,
    area: String(c[p.area] || '').trim(),
    turno_actual: String(c[p.turnoActual] || '').trim(),
    turno_actual_nombre: String(c[p.turnoActualNombre] || '').trim(),
    turno_solicitado: String(c[p.turnoSolicitado] || '').trim(),
    turno_solicitado_nombre: String(c[p.turnoSolicitadoNombre] || '').trim(),
  };
};

// ============================================
// CÁLCULO DE RUTA DE APROBACIÓN
// Lee USUARIOS_OCR desde Google Sheets para construir la cadena
// ============================================
export const calcularRutaAprobacion = async (areaSolicitante) => {
  const config = DEFAULT_GOOGLE_CONFIG;
  if (!config.sheetId || !config.apiKey) return null;

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/USUARIOS_OCR!A1:N?key=${config.apiKey}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    const rows = d.values || [];

    // USUARIOS_OCR columns: A=id, B=nombre, C=email, D=usuario(DNI), ...
    // We need: nombre (B=1), rol (F=5), areas (G=6)
    const jefes = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols || cols.length < 7) continue;
      const nombre = String(cols[1] || '').trim();
      const rol = parseInt(cols[5]) || 0;
      let areasRaw = cols[6] || '[]';
      let areas = [];
      try { areas = JSON.parse(areasRaw); } catch { areas = []; }
      if (!Array.isArray(areas)) areas = [];

      // Solo incluir si tiene rol ≥ 1 (jefe o superior) y cubre el área solicitada
      if (rol >= 1 && rol <= 3 && areas.includes(areaSolicitante)) {
        jefes.push({ nombre, rol, areas });
      }
    }

    // Ordenar por rol ascendente: 1 → 2 → 3
    jefes.sort((a, b) => a.rol - b.rol);

    // Eliminar duplicados (misma persona podría tener múltiples roles en áreas)
    const vistos = new Set();
    const cadena = [];
    for (const j of jefes) {
      if (!vistos.has(j.nombre)) {
        vistos.add(j.nombre);
        cadena.push({ nombre: j.nombre, nivel: j.rol });
      }
    }

    // Siempre agregar admin al final
    cadena.push({ nombre: 'Administrador', nivel: 4 });

    return cadena;
  } catch {
    // Si falla, cadena mínima: solo admin
    return [{ nombre: 'Administrador', nivel: 4 }];
  }
};

// ============================================
// ENVIAR SOLICITUD (con cadena multinivel)
// ============================================
export const enviarSolicitudCambio = async (config, datos) => {
  if (!config.appsScriptUrl) throw new Error('Configure Apps Script primero');

  // Validar días futuros
  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth() + 1;
  const anioActual = fechaActual.getFullYear();
  const diaActual = fechaActual.getDate();

  if (datos.mes === mesActual && datos.anio === anioActual) {
    const diasInvalidos = (datos.dias || []).filter(d => d < diaActual);
    if (diasInvalidos.length > 0) {
      throw new Error(`No se pueden solicitar cambios en dias pasados (${diasInvalidos.join(', ')})`);
    }
  }

  // Calcular cadena de aprobación
  const cadena = await calcularRutaAprobacion(datos.area_solicitante);

  // Construir detalle con cadena incluida
  // La cadena se almacena en la columna 'detalle' (index 31) via __detalleJSON_
  const datosConCadena = {
    ...datos,
    mes: mesActual,
    anio: anioActual,
    // Datos de la cadena multinivel (guardados en columna detalle)
    cadena: cadena || [{ nombre: 'Administrador', nivel: 4 }],
    nivel_actual: 1,
    historial_aprobaciones: [],
  };

  try {
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ 
        accion: 'registrarSolicitudCambio', 
        datos: datosConCadena
      })
    });

    try {
      const resultado = await response.json();
      if (resultado && resultado.ok === false) {
        throw new Error(resultado.error || 'Error al registrar solicitud');
      }
    } catch (parseErr) {
      if (!response.ok && response.status !== 0) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
    }
  } catch (err) {
    if (err.message && err.message.startsWith('No se pueden')) throw err;
    throw new Error('No se pudo enviar la solicitud. Verifique la conexion y el Apps Script.');
  }
};

// ============================================
// ACTUALIZAR SOLICITUD (avanzar nivel o rechazar)
// ============================================
export const actualizarSolicitudCambio = async (config, { id, estado, revisadoPor, observacion = '', nivelActual, cadena, historial }) => {
  if (!config.appsScriptUrl) throw new Error('Configure Apps Script primero');
  try {
    // Reconstruir detalle con cadena actualizada
    const detalleActualizado = {
      cadena: cadena || [],
      nivel_actual: nivelActual,
      historial: historial || [],
    };

    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        accion: 'actualizarSolicitudCambio',
        id,
        estado,
        revisadoPor,
        observacion,
        detalle: JSON.stringify(detalleActualizado),
      })
    });

    try {
      const resultado = await response.json();
      if (resultado && resultado.ok === false) {
        throw new Error(resultado.error || 'Error al actualizar solicitud');
      }
    } catch (parseErr) {
      if (!response.ok && response.status !== 0) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
    }
  } catch (err) {
    if (err.message && err.message.startsWith('Error del servidor')) throw err;
    throw new Error('No se pudo actualizar la solicitud. Verifique la conexion y el Apps Script.');
  }
};

// ============================================
// LEER SOLICITUDES (con cadena multinivel)
// ============================================
export const obtenerSolicitudesCambio = async (config, areaFiltro = null) => {
  if (!config.sheetId || !config.apiKey) return [];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${HOJA_SOLICITUDES}!A1:AF?key=${config.apiKey}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = await r.json();
  const rows = d.values || [];
  const lista = [];
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i];
    if (!c || !String(c[IND.id] || '').trim()) continue;

    const areaSolicitante = String(c[IND.areaSolicitante] || '').trim();
    if (areaFiltro && areaFiltro !== 'TODAS' && areaSolicitante !== areaFiltro) {
      const p1Area = String(c[IND.p1.area] || '').trim();
      const p2Area = String(c[IND.p2.area] || '').trim();
      if (areaSolicitante !== areaFiltro && p1Area !== areaFiltro && p2Area !== areaFiltro) continue;
    }

    const p1 = leerParticipante(c, IND.p1);
    const p2 = leerParticipante(c, IND.p2);
    const participantes = [p1, p2].filter(Boolean);

    // Leer cadena desde columna detalle (index 31)
    // __detalleJSON_ almacena el objeto datos completo como JSON
    let cadena = [{ nombre: 'Administrador', nivel: 4 }];
    let nivel_actual = 4;
    let historial = [];

    const rawDetalle = String(c[IND.detalle] || '').trim();
    if (rawDetalle) {
      try {
        const parsed = JSON.parse(rawDetalle);
        // La cadena viene directamente del objeto datos
        if (parsed.cadena) cadena = parsed.cadena;
        if (parsed.nivel_actual) nivel_actual = parsed.nivel_actual;
        if (parsed.historial_aprobaciones) historial = parsed.historial_aprobaciones;
        // Compatibilidad: si tiene historial (sin _aprobaciones)
        if (!historial.length && parsed.historial) historial = parsed.historial;
      } catch { /* sin cadena */ }
    }

    // Si la cadena tiene solo admin (solicitud vieja sin cadena), compatibilidad
    if (cadena.length <= 1 && (String(c[IND.estado] || '').trim().toUpperCase()) === ESTADOS.PENDIENTE) {
      nivel_actual = 4; // Admin puede aprobar directo
    }

    lista.push({
      id: String(c[IND.id] || '').trim(),
      fecha_solicitud: String(c[IND.fecha] || '').trim(),
      solicitante: String(c[IND.solicitante] || '').trim(),
      area_solicitante: areaSolicitante,
      hoja: String(c[IND.hoja] || '').trim(),
      mes: parseInt(c[IND.mes]) || 0,
      anio: parseInt(c[IND.anio]) || 0,
      dias: String(c[IND.dias] || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)),
      tipo_cambio: String(c[IND.tipo] || '').trim(),
      motivo: String(c[IND.motivo] || '').trim(),
      pormenores: String(c[IND.pormenores] || '').trim(),
      estado: (String(c[IND.estado] || '').trim().toUpperCase()) || ESTADOS.PENDIENTE,
      revisado_por: String(c[IND.revisadoPor] || '').trim(),
      fecha_revision: String(c[IND.fechaRevision] || '').trim(),
      observacion_revision: String(c[IND.observacion] || '').trim(),
      participantes,
      // Multinivel
      cadena,
      nivel_actual,
      historial,
    });
  }
  return lista.sort((a, b) => parseInt(b.id) - parseInt(a.id));
};

// ============================================
// FILTRAR SOLICITUDES POR USUARIO
// Determina qué ve cada usuario según su rol
// ============================================
export const filtrarSolicitudesParaUsuario = (solicitudes, userRol, userAreas, userName) => {
  if (!solicitudes || !solicitudes.length) return [];

  return solicitudes.map(sol => {
    const esAdmin = userRol === 4;
    const nivelActualSol = sol.nivel_actual || 4;
    const estadoSol = sol.estado || ESTADOS.PENDIENTE;

    // Calcular si este usuario puede ver y actuar
    let puedeVer = false;
    let puedeActuar = false;

    if (esAdmin) {
      // Admin ve todo y puede actuar en nivel 4
      puedeVer = true;
      puedeActuar = estadoSol === ESTADOS.PENDIENTE && nivelActualSol === 4;
    } else {
      // Jefe ve solicitudes de su área en su nivel
      const esSuArea = userAreas.includes(sol.area_solicitante) ||
        sol.participantes?.some(p => userAreas.includes(p.area));

      puedeVer = esSuArea && nivelActualSol === userRol && estadoSol === ESTADOS.PENDIENTE;
      puedeActuar = puedeVer;

      // También puede ver aprobadas/rechazadas que ya intervino
      if (estadoSol !== ESTADOS.PENDIENTE) {
        const yaIntervino = sol.historial?.some(h => h.nombre === userName);
        const fueRevisadoPorEl = sol.revisado_por === userName;
        puedeVer = puedeVer || yaIntervino || fueRevisadoPorEl || esAdmin;
      }
    }

    return { ...sol, puedeVer, puedeActuar };
  });
};

// ============================================
// VALIDACIÓN DE FRANCOS
// ============================================
export const validarPropuestaFrancos = ({ turnos, personal, participantes, totalDias }) => {
  const problemas = [];
  if (!participantes || participantes.length === 0) return problemas;

  const hip = {};
  Object.keys(turnos || {}).forEach(k => { hip[k] = { ...(turnos[k] || {}) }; });
  participantes.forEach(p => {
    if (!hip[p.id]) hip[p.id] = {};
    p.dias.forEach(d => { hip[p.id][d] = p.turnoNuevo || ''; });
  });

  participantes.forEach(p => {
    const emp = (personal || []).find(e => e.id === p.id);
    if (!emp) return;
    if (esPersonalCivil(emp.grado)) return;
    let contador = 0, inicio = 0;
    const tramos = [];
    for (let dia = 1; dia <= totalDias; dia++) {
      const t = hip[p.id]?.[dia] || '';
      if (t === 'F') { if (contador === 0) inicio = dia; contador++; }
      else {
        if (contador >= 3) tramos.push({ inicio, fin: dia - 1, cantidad: contador });
        contador = 0;
      }
    }
    if (contador >= 3) tramos.push({ inicio, fin: totalDias, cantidad: contador });
    tramos.forEach(t => {
      problemas.push({ id: p.id, grado: emp.grado, nombre: emp.nombre, inicio: t.inicio, fin: t.fin, cantidad: t.cantidad });
    });
  });
  return problemas;
};
