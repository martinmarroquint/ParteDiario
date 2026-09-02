// src/components/ocr/services/authService.js
// Servicio de autenticación - Conecta con FastAPI Backend

import { apiClient } from './apiClient';

export const authService = {
  /**
   * Iniciar sesión
   * @param {string} usuario - Nombre de usuario
   * @param {string} password - Contraseña
   * @returns {Promise<{success: boolean, token?: string, user?: object, error?: string}>}
   */
  async login(usuario, password) {
    try {
      const result = await apiClient.login(usuario, password);
      return {
        success: true,
        token: result.token,
        usuario: result.user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al iniciar sesión',
      };
    }
  },

  /**
   * Cerrar sesión
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async logout() {
    try {
      await apiClient.logout();
      return {
        success: true,
        message: 'Sesión cerrada correctamente',
      };
    } catch (error) {
      // Even if the API call fails, clear local storage
      apiClient.removeToken();
      return {
        success: true,
        message: 'Sesión cerrada',
      };
    }
  },

  /**
   * Verificar si hay sesión activa
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = apiClient.getToken();
    return !!token;
  },

  /**
   * Verificar token con el backend
   * @param {string} token - Token JWT a verificar
   * @returns {Promise<{success: boolean, usuario?: object, error?: string}>}
   */
  async verifyToken(token) {
    try {
      const result = await apiClient.get('/users/me', {}, { _skipAuthRedirect: true });
      return {
        success: true,
        usuario: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Token invalido',
      };
    }
  },

  /**
   * Obtener usuario actual del localStorage
   * @returns {object|null}
   */
  getCurrentUser() {
    return apiClient.getUser();
  },

  /**
   * Refrescar token
   * @returns {Promise<{success: boolean, token?: string, error?: string}>}
   */
  async refreshToken() {
    try {
      const result = await apiClient.refreshToken();
      return {
        success: true,
        token: result.token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al refrescar token',
      };
    }
  },

  /**
   * Cambiar contraseña
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const result = await apiClient.changePassword(currentPassword, newPassword);
      return {
        success: true,
        message: result.message || 'Contraseña actualizada correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al cambiar contraseña',
      };
    }
  },

  /**
   * Solicitar recuperación de contraseña
   * @param {string} correo - Email del usuario
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async forgotPassword(correo) {
    try {
      const result = await apiClient.post('/auth/forgot-password', { correo });
      return {
        success: true,
        message: result.message || 'Si el correo existe, se enviará un enlace de recuperación',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al solicitar recuperación',
      };
    }
  },

  /**
   * Restablecer contraseña con token
   * @param {string} token - Token de recuperación
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async resetPassword(token, newPassword) {
    try {
      const result = await apiClient.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      return {
        success: true,
        message: result.message || 'Contraseña actualizada correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al restablecer contraseña',
      };
    }
  },

  /**
   * Verificar si el usuario tiene un rol específico
   * @param {number} role - Número de rol (0-4)
   * @returns {boolean}
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    if (!user) return false;
    return user.roles && user.roles.includes(role);
  },

  /**
   * Verificar si el usuario tiene al menos uno de los roles
   * @param {number[]} roles - Array de números de rol
   * @returns {boolean}
   */
  hasAnyRole(roles) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (!user.roles) return false;
    return roles.some(role => user.roles.includes(role));
  },

  /**
   * Verificar si el usuario tiene acceso a un área
   * @param {string} area - Nombre del área
   * @returns {boolean}
   */
  hasArea(area) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (!user.areas) return false;
    return user.areas.includes(area);
  },

  /**
   * Obtener el rol principal del usuario
   * @returns {number} - 0=usuario, 1=jefe_area, 2=jefe_depto, 3=jefe_div, 4=admin
   */
  getPrimaryRole() {
    const user = this.getCurrentUser();
    if (!user) return 0;
    return user.rol_principal || 0;
  },

  /**
   * Verificar si es administrador
   * @returns {boolean}
   */
  isAdmin() {
    return this.hasRole(4);
  },

  /**
   * Verificar si es jefe (área, departamento o división)
   * @returns {boolean}
   */
  isJefe() {
    return this.hasAnyRole([1, 2, 3, 4]);
  },

  /**
   * Verificar si puede crear solicitudes (todos los usuarios)
   * @returns {boolean}
   */
  canCreateSolicitud() {
    return this.isAuthenticated();
  },

  /**
   * Verificar si puede aprobar solicitudes
   * @returns {boolean}
   */
  canApproveSolicitud() {
    return this.isJefe();
  },

  /**
   * Obtener areas del usuario
   * @returns {string[]}
   */
  getUserAreas() {
    const user = this.getCurrentUser();
    if (!user) return [];
    return user.areas || [];
  },
};

export default authService;
