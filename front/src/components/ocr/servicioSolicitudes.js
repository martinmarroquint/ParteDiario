// src/components/ocr/servicioSolicitudes.js
// Servicio de SOLICITUDES DE CAMBIO DE TURNO - CON VALIDACIÓN DE FECHAS
import { esPersonalCivil } from './constantes';

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

// ✅ Enviar solicitud con validación de fechas
export const enviarSolicitudCambio = async (config, datos) => {
  if (!config.appsScriptUrl) throw new Error('Configure Apps Script primero');
  
  // ✅ Validar que los días sean futuros (solo para el mes actual)
  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth() + 1;
  const anioActual = fechaActual.getFullYear();
  const diaActual = fechaActual.getDate();
  
  if (datos.mes === mesActual && datos.anio === anioActual) {
    const diasInvalidos = (datos.dias || []).filter(d => d < diaActual);
    if (diasInvalidos.length > 0) {
      throw new Error(`❌ No se pueden solicitar cambios en días pasados (${diasInvalidos.join(', ')})`);
    }
  }
  
  try {
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ 
        accion: 'registrarSolicitudCambio', 
        datos: {
          ...datos,
          mes: mesActual,
          anio: anioActual
        }
      })
    });
    
    // ✅ Intentar leer la respuesta (aunque sea no-cors, el body puede leerse si el server lo permite)
    try {
      const resultado = await response.json();
      if (resultado && resultado.ok === false) {
        throw new Error(resultado.error || 'Error al registrar solicitud');
      }
    } catch (parseErr) {
      // Si no se puede parsear (modo no-cors), verificar status
      if (!response.ok && response.status !== 0) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
    }
  } catch (err) {
    // Re-lanzar errores de validación propios, envolver errores de red
    if (err.message && err.message.startsWith('❌')) throw err;
    throw new Error('No se pudo enviar la solicitud. Verifique la conexion y el Apps Script.');
  }
};

export const actualizarSolicitudCambio = async (config, { id, estado, revisadoPor, observacion = '' }) => {
  if (!config.appsScriptUrl) throw new Error('Configure Apps Script primero');
  try {
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ accion: 'actualizarSolicitudCambio', id, estado, revisadoPor, observacion })
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

export const obtenerSolicitudesCambio = async (config, areaFiltro = null) => {
  if (!config.sheetId || !config.apiKey) return [];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${HOJA_SOLICITUDES}!A1:AE?key=${config.apiKey}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = await r.json();
  const rows = d.values || [];
  const lista = [];
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i];
    if (!c || !String(c[IND.id] || '').trim()) continue;
    
    // ✅ Filtrar por área si se especifica
    const areaSolicitante = String(c[IND.areaSolicitante] || '').trim();
    if (areaFiltro && areaFiltro !== 'TODAS' && areaSolicitante !== areaFiltro) {
      // Si el área no coincide, verificar si algún participante es del área filtrada
      const p1Area = String(c[IND.p1.area] || '').trim();
      const p2Area = String(c[IND.p2.area] || '').trim();
      if (areaSolicitante !== areaFiltro && p1Area !== areaFiltro && p2Area !== areaFiltro) continue;
    }
    
    const p1 = leerParticipante(c, IND.p1);
    const p2 = leerParticipante(c, IND.p2);
    const participantes = [p1, p2].filter(Boolean);
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
    });
  }
  return lista.sort((a, b) => parseInt(b.id) - parseInt(a.id));
};

// ✅ Validación de francos con validación de fechas
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