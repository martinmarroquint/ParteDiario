// src/components/ocr/services/vacacionesService.js
// Servicio de vacaciones - Conecta con FastAPI Backend

import { apiClient } from './apiClient';

export const vacacionesService = {
  /**
   * Obtener vacaciones
   * @param {object} params - { area?, anio? }
   * @returns {Promise<object>}
   */
  async getVacaciones(params = {}) {
    try {
      const result = await apiClient.getVacaciones(params);
      return {
        success: true,
        data: result.vacaciones || [],
        total: result.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener vacaciones',
      };
    }
  },

  /**
   * Obtener mis vacaciones
   * @param {object} params - { anio? }
   * @returns {Promise<object>}
   */
  async getMisVacaciones(params = {}) {
    try {
      const result = await apiClient.getMisVacaciones(params);
      return {
        success: true,
        data: result.vacaciones || [],
        total: result.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener mis vacaciones',
      };
    }
  },

  /**
   * Registrar una vacación
   * @param {object} data - { usuario_id, fecha_inicio, fecha_fin, tipo }
   * @returns {Promise<object>}
   */
  async registrarVacacion(data) {
    try {
      const result = await apiClient.registrarVacacion(data);
      return {
        success: true,
        data: result.vacacion,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al registrar vacación',
      };
    }
  },

  /**
   * Eliminar una vacación
   * @param {string} id - ID de la vacación
   * @returns {Promise<object>}
   */
  async eliminarVacacion(id) {
    try {
      await apiClient.eliminarVacacion(id);
      return {
        success: true,
        message: 'Vacación eliminada correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al eliminar vacación',
      };
    }
  },

  /**
   * Validar fechas de vacación
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

  /**
   * Calcular días de vacación
   * @param {string} fechaInicio - Fecha de inicio
   * @param {string} fechaFin - Fecha de fin
   * @returns {number}
   */
  calcularDias(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diffTime = Math.abs(fin - inicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  },
};

export default vacacionesService;
