// src/components/ocr/services/rolesService.js
// Servicio de roles de servicio - Conecta con FastAPI Backend

import { apiClient } from './apiClient';

export const rolesService = {
  /**
   * Obtener roles para un mes/año/área específico
   * @param {number} mes - Mes (1-12)
   * @param {number} anio - Año
   * @param {string} area - Nombre del área
   * @returns {Promise<object>}
   */
  async getRoles(mes, anio, area) {
    try {
      const result = await apiClient.getRoles(mes, anio, area);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener roles',
      };
    }
  },

  /**
   * Guardar roles completos
   * @param {object} data - { mes, anio, area, personas: [...] }
   * @returns {Promise<object>}
   */
  async saveRoles(data) {
    try {
      const result = await apiClient.saveRoles(data);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al guardar roles',
      };
    }
  },

  /**
   * Actualizar una celda específica (turno de un día)
   * @param {object} data - { mes, anio, area, persona, dia, turno }
   * @returns {Promise<object>}
   */
  async updateCelda(data) {
    try {
      const result = await apiClient.updateCelda(data);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al actualizar turno',
      };
    }
  },

  /**
   * Sincronizar roles completos (reemplazar todos)
   * @param {object} data - { mes, anio, area, datos: [...] }
   * @returns {Promise<object>}
   */
  async syncRoles(data) {
    try {
      const result = await apiClient.syncRoles(data);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al sincronizar roles',
      };
    }
  },

  /**
   * Finalizar rol (bloquear edición)
   * @param {number} mes - Mes
   * @param {number} anio - Año
   * @param {string} area - Área
   * @returns {Promise<object>}
   */
  async finalizarRol(mes, anio, area) {
    try {
      const result = await apiClient.finalizarRol({ mes, anio, area });
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al finalizar rol',
      };
    }
  },

  /**
   * Desfinalizar rol (desbloquear edición)
   * @param {number} mes - Mes
   * @param {number} anio - Año
   * @param {string} area - Área
   * @returns {Promise<object>}
   */
  async desfinalizarRol(mes, anio, area) {
    try {
      const result = await apiClient.desfinalizarRol({ mes, anio, area });
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al desfinalizar rol',
      };
    }
  },

  /**
   * Verificar si un área está bloqueada
   * @param {string} area - Código del área
   * @param {number} mes - Mes
   * @param {number} anio - Año
   * @returns {Promise<boolean>}
   */
  async isAreaLocked(area, mes, anio) {
    try {
      const result = await apiClient.isAreaLocked(area, mes, anio);
      return result.bloqueado || false;
    } catch (error) {
      console.error('Error checking area lock:', error);
      return false;
    }
  },
};

export default rolesService;
