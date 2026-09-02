// src/components/ocr/services/solicitudesService.js
// Servicio de solicitudes de cambio de turno - Conecta con FastAPI Backend

import { apiClient } from './apiClient';

export const solicitudesService = {
  /**
   * Obtener solicitudes del usuario
   * @param {object} params - { estado?, area? }
   * @returns {Promise<object>}
   */
  async getSolicitudes(params = {}) {
    try {
      const result = await apiClient.getSolicitudes(params);
      return {
        success: true,
        data: result.solicitudes || [],
        total: result.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener solicitudes',
      };
    }
  },

  /**
   * Obtener una solicitud por ID
   * @param {string} id - ID de la solicitud
   * @returns {Promise<object>}
   */
  async getSolicitud(id) {
    try {
      const result = await apiClient.getSolicitud(id);
      return {
        success: true,
        data: result.solicitud,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener solicitud',
      };
    }
  },

  /**
   * Crear una nueva solicitud de cambio
   * @param {object} data - Datos de la solicitud
   * @returns {Promise<object>}
   */
  async crearSolicitud(data) {
    try {
      const result = await apiClient.crearSolicitud(data);
      return {
        success: true,
        data: result.solicitud,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al crear solicitud',
      };
    }
  },

  /**
   * Aprobar una solicitud
   * @param {string} id - ID de la solicitud
   * @param {object} data - { observaciones? }
   * @returns {Promise<object>}
   */
  async aprobarSolicitud(id, data = {}) {
    try {
      const result = await apiClient.aprobarSolicitud(id, data);
      return {
        success: true,
        data: result.solicitud,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al aprobar solicitud',
      };
    }
  },

  /**
   * Rechazar una solicitud
   * @param {string} id - ID de la solicitud
   * @param {string} motivo - Motivo del rechazo
   * @returns {Promise<object>}
   */
  async rechazarSolicitud(id, motivo) {
    try {
      const result = await apiClient.rechazarSolicitud(id, { motivo_rechazo: motivo });
      return {
        success: true,
        data: result.solicitud,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al rechazar solicitud',
      };
    }
  },

  /**
   * Obtener solicitudes pendientes de aprobación
   * @returns {Promise<object>}
   */
  async getSolicitudesPendientes() {
    return this.getSolicitudes({ estado: 'ENVIADA' });
  },

  /**
   * Obtener historial de solicitudes de una persona
   * @param {string} persona - Nombre de la persona
   * @returns {Promise<object>}
   */
  async getHistorial(persona) {
    try {
      const result = await apiClient.getSolicitudes();
      const solicitudes = (result.solicitudes || []).filter(
        s => s.persona_turno === persona
      );
      return {
        success: true,
        data: solicitudes,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener historial',
      };
    }
  },

  /**
   * Mapear estado a texto legible
   * @param {string} estado - Código del estado
   * @returns {string}
   */
  getEstadoLabel(estado) {
    const labels = {
      'ENVIADA': 'Enviada',
      'REVISION_DEPARTAMENTO': 'En revisión - Departamento',
      'REVISION_DIVISION': 'En revisión - División',
      'APROBADA': 'Aprobada',
      'RECHAZADA': 'Rechazada',
    };
    return labels[estado] || estado;
  },

  /**
   * Obtener color del estado
   * @param {string} estado - Código del estado
   * @returns {string}
   */
  getEstadoColor(estado) {
    const colors = {
      'ENVIADA': 'bg-yellow-100 text-yellow-800',
      'REVISION_DEPARTAMENTO': 'bg-blue-100 text-blue-800',
      'REVISION_DIVISION': 'bg-purple-100 text-purple-800',
      'APROBADA': 'bg-green-100 text-green-800',
      'RECHAZADA': 'bg-red-100 text-red-800',
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  },
};

export default solicitudesService;
