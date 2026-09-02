// src/components/ocr/services/usersService.js
// Servicio de usuarios - Conecta con FastAPI Backend

import { apiClient } from './apiClient';

export const usersService = {
  /**
   * Obtener todos los usuarios (solo admin)
   * @param {object} params - { activo? }
   * @returns {Promise<object>}
   */
  async getUsers(params = {}) {
    try {
      const result = await apiClient.getUsers(params);
      return {
        success: true,
        data: result.users || [],
        total: result.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener usuarios',
      };
    }
  },

  /**
   * Obtener perfil del usuario actual
   * @returns {Promise<object>}
   */
  async getMe() {
    try {
      const result = await apiClient.getMe();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener perfil',
      };
    }
  },

  /**
   * Obtener usuario por ID (admin)
   * @param {number} id
   * @returns {Promise<object>}
   */
  async getUserById(id) {
    try {
      const result = await apiClient.getUserById(id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al obtener usuario',
      };
    }
  },

  /**
   * Crear usuario (admin)
   * @param {object} data - { nombre, usuario, password, correo, roles, areas, grado, dni }
   * @returns {Promise<object>}
   */
  async createUser(data) {
    try {
      const result = await apiClient.createUser(data);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al crear usuario',
      };
    }
  },

  /**
   * Actualizar usuario (admin)
   * @param {number} id
   * @param {object} data - Campos a actualizar
   * @returns {Promise<object>}
   */
  async updateUser(id, data) {
    try {
      const result = await apiClient.updateUser(id, data);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al actualizar usuario',
      };
    }
  },

  /**
   * Desactivar usuario (admin)
   * @param {number} id
   * @returns {Promise<object>}
   */
  async deleteUser(id) {
    try {
      await apiClient.deleteUser(id);
      return {
        success: true,
        message: 'Usuario desactivado correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al desactivar usuario',
      };
    }
  },

  /**
   * Activar/desactivar usuario (admin)
   * @param {number} id
   * @returns {Promise<object>}
   */
  async toggleUser(id) {
    try {
      const result = await apiClient.toggleUser(id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al cambiar estado',
      };
    }
  },

  /**
   * Resetear contraseña de usuario (admin)
   * @param {number} id
   * @returns {Promise<object>}
   */
  async resetPassword(id) {
    try {
      const result = await apiClient.resetUserPassword(id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al resetear contraseña',
      };
    }
  },
};

export default usersService;
