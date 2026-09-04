// mobil/src/services/authService.js
// Servicio de autenticación - Conecta con FastAPI Backend
import { apiClient } from './apiClient';

export const authService = {
  /**
   * Iniciar sesión
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
   */
  async logout() {
    try {
      await apiClient.logout();
      return { success: true, message: 'Sesión cerrada correctamente' };
    } catch (error) {
      // Even if API fails, clear local storage
      await apiClient.removeToken();
      return { success: true, message: 'Sesión cerrada' };
    }
  },

  /**
   * Verificar si hay sesión activa
   */
  async isAuthenticated() {
    const token = await apiClient.getToken();
    return !!token;
  },

  /**
   * Verificar token con el backend
   */
  async verifyToken() {
    try {
      const result = await apiClient.getMe();
      return { success: true, usuario: result };
    } catch (error) {
      return { success: false, error: error.message || 'Token inválido' };
    }
  },

  /**
   * Obtener usuario actual del storage
   */
  async getCurrentUser() {
    return await apiClient.getUser();
  },

  /**
   * Refrescar token
   */
  async refreshToken() {
    try {
      const result = await apiClient.refreshToken();
      return { success: true, token: result.token };
    } catch (error) {
      return { success: false, error: error.message || 'Error al refrescar token' };
    }
  },

  /**
   * Cambiar contraseña
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const result = await apiClient.changePassword(currentPassword, newPassword);
      return { success: true, message: result.message || 'Contraseña actualizada' };
    } catch (error) {
      return { success: false, error: error.message || 'Error al cambiar contraseña' };
    }
  },

  /**
   * Verificar si el usuario tiene un rol específico
   */
  async hasRole(role) {
    const user = await apiClient.getUser();
    if (!user) return false;
    return user.roles && user.roles.includes(role);
  },

  /**
   * Verificar si es administrador
   */
  async isAdmin() {
    return this.hasRole(4);
  },

  /**
   * Verificar si es jefe (área, departamento o división)
   */
  async isJefe() {
    return this.hasAnyRole([1, 2, 3, 4]);
  },

  /**
   * Verificar si tiene al menos uno de los roles
   */
  async hasAnyRole(roles) {
    const user = await apiClient.getUser();
    if (!user) return false;
    if (!user.roles) return false;
    return roles.some(role => user.roles.includes(role));
  },
};

export default authService;
