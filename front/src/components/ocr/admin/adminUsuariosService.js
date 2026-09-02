// src/components/ocr/admin/adminUsuariosService.js
// Servicio para administración de usuarios OCR
// Usa mode: 'no-cors' para compatibilidad con Apps Script

const API_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

// Función para serializar JSON a ASCII (sin caracteres especiales)
const bodyAsciiJson = (obj) => JSON.stringify(obj).replace(/[\u007F-\uFFFF]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));

export const adminUsuariosService = {
  async obtenerUsuarios(token) {
    if (!API_URL) {
      console.warn('API_URL no configurada, usando datos mock');
      return this._getMockUsuarios();
    }

    try {
      // Usar mode: 'no-cors' para evitar problemas de CORS
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: bodyAsciiJson({
          accion: 'admin_obtenerUsuarios',
          token: token
        })
      });

      // Con no-cors no podemos leer la respuesta, así que usamos mock
      // En producción, el Apps Script debe responder con un callback o JSONP
      console.warn('Usando datos mock para usuarios (no-cors)');
      return this._getMockUsuarios();
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return this._getMockUsuarios();
    }
  },

  async crearUsuario(token, datos) {
    if (!API_URL) {
      throw new Error('API_URL no configurada');
    }

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: bodyAsciiJson({
          accion: 'admin_crearUsuario',
          token: token,
          datos: datos
        })
      });

      // Con no-cors no podemos leer la respuesta, asumimos éxito
      return { success: true };
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw new Error('Error al crear usuario');
    }
  },

  async actualizarUsuario(token, datos) {
    if (!API_URL) {
      throw new Error('API_URL no configurada');
    }

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: bodyAsciiJson({
          accion: 'admin_actualizarUsuario',
          token: token,
          datos: datos
        })
      });

      return { success: true };
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw new Error('Error al actualizar usuario');
    }
  },

  async resetearPassword(token, usuarioId, nuevaPassword) {
    if (!API_URL) {
      throw new Error('API_URL no configurada');
    }

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: bodyAsciiJson({
          accion: 'admin_resetearPassword',
          token: token,
          datos: {
            usuario_id: usuarioId,
            password: nuevaPassword
          }
        })
      });

      return { success: true };
    } catch (error) {
      console.error('Error reseteando password:', error);
      throw new Error('Error al resetear contraseña');
    }
  },

  async toggleActivo(token, usuarioId, activo) {
    if (!API_URL) {
      throw new Error('API_URL no configurada');
    }

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: bodyAsciiJson({
          accion: 'admin_toggleActivo',
          token: token,
          datos: {
            usuario_id: usuarioId,
            activo: activo
          }
        })
      });

      return { success: true };
    } catch (error) {
      console.error('Error cambiando estado:', error);
      throw new Error('Error al cambiar estado');
    }
  },

  // ============================================================
  // DATOS MOCK PARA PRUEBAS
  // ============================================================
  _getMockUsuarios() {
    return {
      usuarios: [
        {
          id: 'USR001',
          nombre: 'Administrador del Sistema',
          email: 'admin@hrpa.pe',
          usuario: 'admin',
          rol: 'admin',
          areas: ['ADMIN'],
          activo: true,
          ultimo_acceso: '2024-01-15T10:30:00Z'
        },
        {
          id: 'USR002',
          nombre: 'Juan Pérez García',
          email: 'juan.perez@hrpa.pe',
          usuario: 'jperez',
          rol: 'jefe_area',
          areas: ['MEDICINA', 'CIRUGIA'],
          activo: true,
          ultimo_acceso: '2024-01-14T15:20:00Z'
        },
        {
          id: 'USR003',
          nombre: 'María Rodríguez López',
          email: 'maria.rodriguez@hrpa.pe',
          usuario: 'mrodriguez',
          rol: 'usuario',
          areas: ['EMERGENCIA'],
          activo: true,
          ultimo_acceso: '2024-01-13T08:45:00Z'
        },
        {
          id: 'USR004',
          nombre: 'Carlos Sánchez Torres',
          email: 'carlos.sanchez@hrpa.pe',
          usuario: 'csanchez',
          rol: 'jefe_departamento',
          areas: ['DEPARTAMENTO_MEDICO'],
          activo: false,
          ultimo_acceso: '2023-12-20T11:00:00Z'
        }
      ],
      areas: [
        { id: 'ADMIN', nombre: 'Administración' },
        { id: 'MEDICINA', nombre: 'Medicina' },
        { id: 'CIRUGIA', nombre: 'Cirugía' },
        { id: 'EMERGENCIA', nombre: 'Emergencia' },
        { id: 'DEPARTAMENTO_MEDICO', nombre: 'Departamento Médico' }
      ]
    };
  }
};