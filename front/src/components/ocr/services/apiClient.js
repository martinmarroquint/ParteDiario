// src/components/ocr/services/apiClient.js
// Cliente API centralizado para FastAPI Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this._refreshTimer = null;
    this._setupAutoRefresh();
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================
  
  getToken() {
    return localStorage.getItem('ocr_auth_token');
  }

  setToken(token) {
    localStorage.setItem('ocr_auth_token', token);
    this._scheduleRefresh(token);
  }

  removeToken() {
    localStorage.removeItem('ocr_auth_token');
    localStorage.removeItem('ocr_user_data');
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  // ============================================
  // AUTO-REFRESH TOKEN
  // ============================================

  _setupAutoRefresh() {
    const token = this.getToken();
    if (token) this._scheduleRefresh(token);
  }

  _scheduleRefresh(token) {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const refreshIn = expiresAt - now - 300000; // 5 min before expiry
      if (refreshIn > 0) {
        this._refreshTimer = setTimeout(() => this._silentRefresh(), refreshIn);
      } else if (refreshIn > -60000) {
        // Already within 1 min of expiry, refresh now
        this._silentRefresh();
      }
    } catch {
      // Invalid token, ignore
    }
  }

  async _silentRefresh() {
    try {
      const token = this.getToken();
      if (!token) return;
      const result = await this.post('/auth/refresh', { token }, { _skipAuthRedirect: true });
      if (result.token) {
        this.setToken(result.token);
      }
    } catch {
      // Refresh failed, token will expire naturally
      // Don't force logout here - let the next request handle it
    }
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
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Opciones de control (no se envian a fetch)
    const {
      _timeout = 60000,
      _retries = 0,
      _retryDelays = [3000, 8000],
      ...fetchOptions
    } = options;

    for (let intento = 0; intento <= _retries; intento++) {
      // Timeout por peticion: evita que la UI se quede "colgada" para siempre
      // (arbejo en frio de Render puede tardar ~50s en la primera peticion)
      const controller = !options.signal ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), _timeout) : null;

      let response;
      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: options.signal || controller.signal,
        });
      } catch (error) {
        if (timer) clearTimeout(timer);
        const esTransitorio =
          error.name === 'AbortError' ||
          (error.name === 'TypeError' && (error.message.includes('fetch') || error.message === 'Failed to fetch'));
        if (esTransitorio && intento < _retries) {
          await this._esperar(_retryDelays[intento] ?? 5000);
          continue;
        }
        if (esTransitorio) {
          throw new Error('El servidor está iniciando o no responde. Por favor, espere unos segundos e intente nuevamente.');
        }
        throw error;
      }
      if (timer) clearTimeout(timer);

      // Handle 401 - Token expired or invalid
      if (response.status === 401) {
        // _skipAuthRedirect: used for background/polling calls where we don't want to kill the session
        // _onlyThrow: used when caller wants to handle the 401 themselves
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

      // Handle other errors (con reintento automatico en errores transitorios)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const mensaje = errorData.detail || `Error HTTP: ${response.status}`;
        if ([429, 502, 503, 504].includes(response.status) && intento < _retries) {
          await this._esperar(_retryDelays[intento] ?? 5000);
          continue;
        }
        if (response.status === 429) {
          throw new Error('Demasiados intentos en poco tiempo. Espere un momento y vuelva a intentar.');
        }
        throw new Error(mensaje);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    }

    throw new Error('Error de conexión con el servidor.');
  }

  async _esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get(endpoint, params = {}, extraOptions = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET', ...extraOptions });
  }

  async post(endpoint, data = {}, extraOptions = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...extraOptions,
    });
  }

  async put(endpoint, data = {}, extraOptions = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...extraOptions,
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
    // Timeout 90s (arranque en frio puede tardar ~50s) + 2 reintentos con backoff
    const result = await this.post('/auth/login', { usuario, password }, {
      _timeout: 90000,
      _retries: 2,
      _retryDelays: [3000, 8000],
    });
    if (result.token) {
      this.setToken(result.token);
      this.setUser(result.user);
    }
    return result;
  }

  async logout() {
    try {
      await this.post('/auth/logout', {}, { _skipAuthRedirect: true });
    } catch {
      // Token may be expired after password change — that's OK
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

  async validateAdminKey(clave) {
    return this.post('/auth/validate-admin-key', { clave });
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

  async getBandejaSolicitudes() {
    return this.get('/solicitudes/bandeja');
  }

  async getEstadisticasSolicitudes() {
    return this.get('/solicitudes/estadisticas');
  }

  async cancelarSolicitud(id, data = {}) {
    return this.put(`/solicitudes/${id}/cancel`, data);
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
  // SHEETS PROXY — read Google Sheets via backend (no API key exposure)
  // ============================================

  async readSheet(sheetName, range) {
    const params = {};
    if (range) params.range = range;
    // 1 reintento a fallos transitorios de Google Sheets (502) — solo lectura
    return this.get(`/sheets/${sheetName}`, params, { _retries: 1, _retryDelays: [1000], _timeout: 30000 });
  }

  async getSheetMetadata(sheetName) {
    // 2 reintentos: las cargas simultaneas de varios dispositivos provocaban
    // 502 en este endpoint (error "Error al obtener metadata" = no cargaba)
    return this.get(`/sheets/metadata/${sheetName}`, {}, { _retries: 2, _retryDelays: [800, 2000], _timeout: 20000 });
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck() {
    // El endpoint /health esta en la RAIZ, no bajo /api/v1
    const rootUrl = this.baseUrl.replace(/\/api\/v1\/?$/, '');
    return this.request(`${rootUrl}/health`, { method: 'GET', _skipAuthRedirect: true, _timeout: 10000 });
  }

  // ============================================
  // HEARTBEAT — report user is active
  // ============================================

  async sendHeartbeat(area = '', hoja = '', vista = '') {
    return this.post('/auth/heartbeat', { area, hoja, vista }, { _skipAuthRedirect: true });
  }

  async getActiveUsers() {
    return this.get('/auth/active-users');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
