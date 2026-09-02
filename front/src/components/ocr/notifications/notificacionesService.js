// src/components/ocr/notifications/notificacionesService.js
// Servicio de notificaciones independiente para OCR

const API_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

export const notificacionesService = {
  async crear(notificacion, token) {
    if (!API_URL) {
      throw new Error('La URL de Apps Script no esta configurada');
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accion: 'crearNotificacion',
          datos: notificacion
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al crear notificacion');
      }

      return data;
    } catch (error) {
      console.error('Error creando notificacion:', error);
      throw error;
    }
  },

  async obtener(usuarioId, token) {
    if (!API_URL) {
      throw new Error('La URL de Apps Script no esta configurada');
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accion: 'obtenerNotificaciones',
          usuario_id: usuarioId
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al obtener notificaciones');
      }

      return data.notificaciones || [];
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }
  },

  async marcarLeida(notificacionId, token) {
    if (!API_URL) {
      throw new Error('La URL de Apps Script no esta configurada');
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accion: 'marcarNotificacionLeida',
          notificacion_id: notificacionId
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al marcar notificacion');
      }

      return data;
    } catch (error) {
      console.error('Error marcando notificacion:', error);
      throw error;
    }
  },

  async marcarTodasLeidas(usuarioId, token) {
    if (!API_URL) {
      throw new Error('La URL de Apps Script no esta configurada');
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accion: 'marcarTodasNotificacionesLeidas',
          usuario_id: usuarioId
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al marcar notificaciones');
      }

      return data;
    } catch (error) {
      console.error('Error marcando notificaciones:', error);
      throw error;
    }
  },

  async contarNoLeidas(usuarioId, token) {
    if (!API_URL) {
      throw new Error('La URL de Apps Script no esta configurada');
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accion: 'contarNotificacionesNoLeidas',
          usuario_id: usuarioId
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al contar notificaciones');
      }

      return data.total || 0;
    } catch (error) {
      console.error('Error contando notificaciones:', error);
      return 0;
    }
  }
};