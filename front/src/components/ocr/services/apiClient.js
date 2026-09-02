// src/components/ocr/services/apiClient.js
// Cliente API centralizado para FastAPI Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================
  
  getToken() {
    return localStorage.getItem('ocr_auth_token');
  }

  setToken(token) {
    localStorage.setItem('ocr_auth_token', token);
  }

  removeToken() {
    localStorage.removeItem('ocr_auth_token');
    localStorage.removeItem('ocr_user_data');
  }

  getUser() {
    try {
      const data = localStorage.getItem('ocr_user_data');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setUser(user) {
    localStorage.setItem('ocr_user_data', JSON.stringify(user));
  }

  // ============================================
  // HTTP METHODS
  // ============================================

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

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
        // Only redirect if not doing initial session check
        if (!options._skipAuthRedirect) {
          this.removeToken();
          window.location.href = '/';
        }
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

  async get(endpoint, params = {}, extraOptions = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET', ...extraOptions });
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
      this.setToken(result.token);
      this.setUser(result.user);
    }
    return result;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      this.removeToken();
    }
  }

  async refreshToken() {
    const token = this.getToken();
    if (!token) throw new Error('No hay token para refrescar');
    const result = await this.post('/auth/refresh', { token });
    if (result.token) {
      this.setToken(result.token);
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

  async getUsers(params = {}) {
    return this.get('/users', params);
  }

  async getMe() {
    return this.get('/users/me');
  }

  async getUserById(id) {
    return this.get(`/users/${id}`);
  }

  async createUser(data) {
    return this.post('/users', data);
  }

  async updateUser(id, data) {
    return this.put(`/users/${id}`, data);
  }

  async deleteUser(id) {
    return this.delete(`/users/${id}`);
  }

  async toggleUser(id) {
    return this.patch(`/users/${id}/toggle`);
  }

  async resetUserPassword(id) {
    return this.post(`/users/${id}/reset-password`);
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

  async getSolicitud(id) {
    return this.get(`/solicitudes/${id}`);
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

  // ============================================
  // ESTRUCTURA JERÁRQUICA ENDPOINTS
  // ============================================

  async getEstructura(userId) {
    return this.get(`/estructura-jerarquica/${userId}`);
  }

  async updateEstructura(userId, data) {
    return this.put(`/estructura-jerarquica/${userId}`, data);
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck() {
    return this.request('/health', { method: 'GET' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
