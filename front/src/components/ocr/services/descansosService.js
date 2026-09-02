// src/components/ocr/services/descansosService.js
// Servicio de descansos médicos - Conecta con FastAPI Backend

import { apiClient } from './apiClient';

export const descansosService = {
  /**
   * Obtener descansos médicos
   * @param {object} params - { area?, mes?, anio? }
   * @returns {Promise<object>}
   */
  async getDescansos(params = {}) {
    try {
      const result = await apiClient.getDescansos(params);
      return {
        success: true,
        data: result.descansos || [],
        total: result.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener descansos',
      };
    }
  },

  /**
   * Obtener mis descansos médicos
   * @param {object} params - { anio? }
   * @returns {Promise<object>}
   */
  async getMisDescansos(params = {}) {
    try {
      const result = await apiClient.getMisDescansos(params);
      return {
        success: true,
        data: result.descansos || [],
        total: result.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener mis descansos',
      };
    }
  },

  /**
   * Registrar un descanso médico
   * @param {object} data - Datos del descanso
   * @returns {Promise<object>}
   */
  async registrarDescanso(data) {
    try {
      const result = await apiClient.registrarDescanso(data);
      return {
        success: true,
        data: result.descanso,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al registrar descanso',
      };
    }
  },

  /**
   * Eliminar un descanso médico
   * @param {string} id - ID del descanso
   * @returns {Promise<object>}
   */
  async eliminarDescanso(id) {
    try {
      await apiClient.eliminarDescanso(id);
      return {
        success: true,
        message: 'Descanso eliminado correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al eliminar descanso',
      };
    }
  },

  /**
   * Validar fechas del descanso
   * @param {string} fechaInicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} fechaFin - Fecha de fin (YYYY-MM-DD)
   * @returns {object} - { valid: boolean, error?: string }
   */
  validarFechas(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) {
      return { valid: false, error: 'Las fechas son requeridas' };
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return { valid: false, error: 'Formato de fecha inválido' };
    }

    if (fin < inicio) {
      return { valid: false, error: 'La fecha de fin no puede ser anterior a la de inicio' };
    }

    return { valid: true };
  },
};

export default descansosService;
