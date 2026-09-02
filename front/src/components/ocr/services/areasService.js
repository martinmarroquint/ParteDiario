// src/components/ocr/services/areasService.js
// Servicio de áreas - Conecta con FastAPI Backend

import { apiClient } from './apiClient';

export const areasService = {
  /**
   * Obtener todas las áreas
   * @returns {Promise<object>}
   */
  async getAreas() {
    try {
      const result = await apiClient.getAreas();
      return {
        success: true,
        data: result.areas || [],
        total: result.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener áreas',
      };
    }
  },

  /**
   * Verificar si un área está bloqueada
   * @param {string} codigo - Código del área
   * @param {number} mes - Mes
   * @param {number} anio - Año
   * @returns {Promise<object>}
   */
  async isAreaLocked(codigo, mes, anio) {
    try {
      const result = await apiClient.isAreaLocked(codigo, mes, anio);
      return {
        success: true,
        locked: result.bloqueado || false,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al verificar bloqueo',
      };
    }
  },

  /**
   * Bloquear un área
   * @param {number} id - ID del área
   * @param {number} mes - Mes
   * @param {number} anio - Año
   * @returns {Promise<object>}
   */
  async lockArea(id, mes, anio) {
    try {
      const result = await apiClient.lockArea(id, { mes, anio });
      return {
        success: true,
        message: result.message || 'Área bloqueada correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al bloquear área',
      };
    }
  },

  /**
   * Desbloquear un área
   * @param {number} id - ID del área
   * @returns {Promise<object>}
   */
  async unlockArea(id) {
    try {
      const result = await apiClient.unlockArea(id);
      return {
        success: true,
        message: result.message || 'Área desbloqueada correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al desbloquear área',
      };
    }
  },

  /**
   * Obtener áreas del usuario actual
   * @param {string[]} userAreas - Áreas del usuario
   * @param {object[]} allAreas - Todas las áreas
   * @returns {object[]}
   */
  getUserAreas(userAreas, allAreas) {
    if (!userAreas || !allAreas) return [];
    return allAreas.filter(area => userAreas.includes(area.codigo) || userAreas.includes(area.nombre));
  },
};

export default areasService;
