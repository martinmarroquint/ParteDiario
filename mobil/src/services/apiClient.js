// mobil/src/services/apiClient.js
// Cliente API centralizado para FastAPI Backend - React Native (AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Cambiar para producción

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // ============================================
  // TOKEN MANAGEMENT (AsyncStorage)
  // ============================================

  async getToken() {
    return await AsyncStorage.getItem('ocr_auth_token');
  }

  async setToken(token) {
    await AsyncStorage.setItem('ocr_auth_token', token);
  }

  async removeToken() {
    await AsyncStorage.multiRemove(['ocr_auth_token', 'ocr_user_data']);
  }

  async getUser() {
    try {
      const data = await AsyncStorage.getItem('ocr_user_data');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async setUser(user) {
    await AsyncStorage.setItem('ocr_user_data', JSON.stringify(user));
  }

  // ============================================
  // HTTP METHODS
  // ============================================

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = await this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - Token expired or invalid
      if (response.status === 401) {
        await this.removeToken();
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      }

      // Handle 403 - Forbidden
      if (response.status === 403) {
        throw new Error('No tiene permisos para realizar esta acción.');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error HTTP: ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Error de conexión. Verifique que el servidor esté disponible.');
      }
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ============================================
  // AUTH ENDPOINTS
  // ============================================

  async login(usuario, password) {
    const result = await this.post('/auth/login', { usuario, password });
    if (result.token) {
      await this.setToken(result.token);
      await this.setUser(result.user);
    }
    return result;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      await this.removeToken();
    }
  }

  async refreshToken() {
    const token = await this.getToken();
    if (!token) throw new Error('No hay token para refrescar');
    const result = await this.post('/auth/refresh', { token });
    if (result.token) {
      await this.setToken(result.token);
    }
    return result;
  }

  async changePassword(currentPassword, newPassword) {
    return this.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // ============================================
  // USER ENDPOINTS
  // ============================================

  async getMe() {
    return this.get('/users/me');
  }

  // ============================================
  // ROLES ENDPOINTS
  // ============================================

  async getRoles(mes, anio, area) {
    return this.get('/roles', { mes, anio, area });
  }

  async saveRoles(data) {
    return this.post('/roles', data);
  }

  async updateCelda(data) {
    return this.put('/roles/celda', data);
  }

  async syncRoles(data) {
    return this.post('/roles/sync', data);
  }

  async finalizarRol(data) {
    return this.post('/roles/finalizar', data);
  }

  async desfinalizarRol(data) {
    return this.post('/roles/desfinalizar', data);
  }

  // ============================================
  // SOLICITUDES ENDPOINTS
  // ============================================

  async getSolicitudes(params = {}) {
    return this.get('/solicitudes', params);
  }

  async crearSolicitud(data) {
    return this.post('/solicitudes', data);
  }

  async aprobarSolicitud(id, data = {}) {
    return this.put(`/solicitudes/${id}/approve`, data);
  }

  async rechazarSolicitud(id, data) {
    return this.put(`/solicitudes/${id}/reject`, data);
  }

  // ============================================
  // DESCANSOS ENDPOINTS
  // ============================================

  async getDescansos(params = {}) {
    return this.get('/descansos', params);
  }

  async getMisDescansos(params = {}) {
    return this.get('/descansos/mis', params);
  }

  async registrarDescanso(data) {
    return this.post('/descansos', data);
  }

  async eliminarDescanso(id) {
    return this.delete(`/descansos/${id}`);
  }

  // ============================================
  // VACACIONES ENDPOINTS
  // ============================================

  async getVacaciones(params = {}) {
    return this.get('/vacaciones', params);
  }

  async getMisVacaciones(params = {}) {
    return this.get('/vacaciones/mis', params);
  }

  async registrarVacacion(data) {
    return this.post('/vacaciones', data);
  }

  async eliminarVacacion(id) {
    return this.delete(`/vacaciones/${id}`);
  }

  // ============================================
  // AREAS ENDPOINTS
  // ============================================

  async getAreas() {
    return this.get('/areas');
  }

  async isAreaLocked(codigo, mes, anio) {
    return this.get(`/areas/${codigo}/bloqueado`, { mes, anio });
  }

  async lockArea(id, data) {
    return this.post(`/areas/${id}/lock`, data);
  }

  async unlockArea(id) {
    return this.post(`/areas/${id}/unlock`);
  }
}

// Singleton
export const apiClient = new ApiClient();
export default apiClient;
