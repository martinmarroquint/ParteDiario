// src/components/ocr/admin/adminUsuariosService.js
// Servicio para administracion de usuarios OCR
// Todas las operaciones van por el backend FastAPI (bcrypt, JWT, rate limiting)
// NO usa Apps Script directamente — centraliza toda la seguridad en el backend

import apiClient from '../services/apiClient';

export const adminUsuariosService = {
  /**
   * Obtener directorio de personal (hoja OCR)
   * Solo admin puede acceder
   */
  async obtenerPersonal() {
    const data = await apiClient.get('/users/personal');
    return data.personal || [];
  },

  /**
   * Obtener todos los usuarios del sistema
   * Solo admin puede acceder
   */
  async obtenerUsuarios() {
    const data = await apiClient.get('/users');
    return data.users || [];
  },

  /**
   * Crear un nuevo usuario
   * Backend hashea con bcrypt automaticamente
   */
  async crearUsuario(datos) {
    return await apiClient.createUser({
      nombre: datos.nombre,
      usuario: datos.usuario,
      password: datos.password,
      correo: datos.correo || '',
      grado: datos.grado || '',
      dni: datos.dni || datos.usuario,
      roles: datos.roles || [0],
      areas: datos.areas || [],
    });
  },

  /**
   * Actualizar datos de un usuario
   */
  async actualizarUsuario(userId, datos) {
    return await apiClient.updateUser(userId, datos);
  },

  /**
   * Resetear password — genera temporal automaticamente
   * Backend hashea con bcrypt
   */
  async resetearPassword(userId) {
    return await apiClient.resetUserPassword(userId);
  },

  /**
   * Activar/desactivar usuario
   */
  async toggleActivo(userId) {
    return await apiClient.toggleUser(userId);
  },

  /**
   * Cambiar password (requiere password actual)
   * Solo el propio usuario puede usar
   */
  async cambiarPassword(passwordActual, nuevaPassword) {
    return await apiClient.changePassword(passwordActual, nuevaPassword);
  },
};
