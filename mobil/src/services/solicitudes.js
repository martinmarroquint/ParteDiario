// mobil/src/services/solicitudes.js
// Servicio de solicitudes de cambio de turno - Comunica con Apps Script
import { sheetsService } from './sheets';

// ============================================
// ESTADOS DE SOLICITUD
// ============================================
export const ESTADOS = {
  PENDIENTE: 'PENDIENTE',
  ENVIADA: 'ENVIADA',
  REVISION_DEPARTAMENTO: 'REVISION_DEPARTAMENTO',
  REVISION_DIVISION: 'REVISION_DIVISION',
  APROBADA: 'APROBADA',
  APROBADO: 'APROBADO',
  RECHAZADA: 'RECHAZADA',
  DESAPROBADO: 'DESAPROBADO',
};

// ============================================
// FUNCIONES DE SOLICITUDES
// ============================================

/**
 * Obtiene todas las solicitudes de cambio de turno
 * @param {Object} filtros - { estado?, area?, mes?, anio? }
 * @returns {Promise<Array>} Lista de solicitudes
 */
export async function obtenerSolicitudesCambio(filtros = {}) {
  try {
    const result = await sheetsService._postAppsScript('obtenerSolicitudesCambio', filtros);
    return result.solicitudes || result.data || [];
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    return [];
  }
}

/**
 * Actualiza una solicitud (aprobar o rechazar)
 * @param {string} id - ID de la solicitud
 * @param {Object} datos - { accion: 'aprobar'|'rechazar', observaciones?: string }
 * @returns {Promise<Object>} Resultado de la operacion
 */
export async function actualizarSolicitudCambio(id, datos) {
  try {
    const result = await sheetsService._postAppsScript('actualizarSolicitudCambio', {
      id,
      ...datos,
    });
    return result;
  } catch (error) {
    console.error('Error actualizando solicitud:', error);
    throw error;
  }
}

/**
 * Envia una nueva solicitud de cambio de turno
 * @param {Object} solicitud - Datos completos de la solicitud
 * @param {string} solicitud.persona_turno - Persona que tiene el turno actual
 * @param {string} solicitud.area - Area de la persona
 * @param {number} solicitud.mes - Mes del cambio
 * @param {number} solicitud.anio - Anio del cambio
 * @param {Array} solicitud.cambios - Lista de cambios [{ dia, turnoActual, turnoNuevo }]
 * @param {string} solicitud.motivo - Motivo del cambio
 * @param {string} solicitud.tipo - Tipo de cambio ('individual'|'permuta')
 * @param {string} [solicitud.companero] - Companero en caso de permuta
 * @returns {Promise<Object>} Resultado con el ID de la solicitud
 */
export async function enviarSolicitudCambio(solicitud) {
  try {
    const result = await sheetsService._postAppsScript('enviarSolicitudCambio', solicitud);
    return result;
  } catch (error) {
    console.error('Error enviando solicitud:', error);
    throw error;
  }
}

/**
 * Obtiene una solicitud por ID
 * @param {string} id - ID de la solicitud
 * @returns {Promise<Object|null>} Solicitud encontrada o null
 */
export async function obtenerSolicitudPorId(id) {
  try {
    const result = await sheetsService._postAppsScript('obtenerSolicitudPorId', { id });
    return result.solicitud || null;
  } catch (error) {
    console.error('Error obteniendo solicitud:', error);
    return null;
  }
}

export default {
  ESTADOS,
  obtenerSolicitudesCambio,
  actualizarSolicitudCambio,
  enviarSolicitudCambio,
  obtenerSolicitudPorId,
};
