// src/components/ocr/permissions/jerarquiaService.js
// Servicio de jerarquia independiente para OCR

import { ROLES_OCR, JERARQUIA_OCR, OBTENER_SIGUIENTE_NIVEL } from './roles';

export const jerarquiaService = {
  obtenerSiguienteNivel(rolActual) {
    return JERARQUIA_OCR[rolActual]?.siguiente || null;
  },

  obtenerSiguienteRol(rolActual) {
    const siguiente = JERARQUIA_OCR[rolActual]?.siguiente;
    return siguiente || null;
  },

  obtenerNivel(rol) {
    return JERARQUIA_OCR[rol]?.nivel || -1;
  },

  esSuperior(rolA, rolB) {
    const nivelA = this.obtenerNivel(rolA);
    const nivelB = this.obtenerNivel(rolB);
    return nivelA > nivelB;
  },

  esInferior(rolA, rolB) {
    const nivelA = this.obtenerNivel(rolA);
    const nivelB = this.obtenerNivel(rolB);
    return nivelA < nivelB;
  },

  obtenerRolesSuperiores(rol) {
    const nivel = this.obtenerNivel(rol);
    const superiores = [];
    for (const [key, value] of Object.entries(JERARQUIA_OCR)) {
      if (value.nivel > nivel) {
        superiores.push(key);
      }
    }
    return superiores;
  },

  obtenerRolesInferiores(rol) {
    const nivel = this.obtenerNivel(rol);
    const inferiores = [];
    for (const [key, value] of Object.entries(JERARQUIA_OCR)) {
      if (value.nivel < nivel) {
        inferiores.push(key);
      }
    }
    return inferiores;
  },

  obtenerSiguienteEstadoParaRol(rol) {
    const siguienteRol = this.obtenerSiguienteRol(rol);
    if (!siguienteRol) return null;

    const mapaEstados = {
      [ROLES_OCR.JEFE_AREA]: 'REVISION_AREA',
      [ROLES_OCR.JEFE_DEPARTAMENTO]: 'REVISION_DEPARTAMENTO',
      [ROLES_OCR.JEFE_DIVISION]: 'REVISION_DIVISION',
      [ROLES_OCR.ADMIN]: 'REVISION_ADMIN'
    };

    return mapaEstados[siguienteRol] || null;
  },

  obtenerEstadoAprobadoPorRol(rol) {
    const mapaEstados = {
      [ROLES_OCR.JEFE_AREA]: 'APROBADA_AREA',
      [ROLES_OCR.JEFE_DEPARTAMENTO]: 'APROBADA_DEPARTAMENTO',
      [ROLES_OCR.JEFE_DIVISION]: 'APROBADA_DIVISION',
      [ROLES_OCR.ADMIN]: 'APROBADA'
    };

    return mapaEstados[rol] || null;
  },

  obtenerEstadoRechazadoPorRol(rol) {
    const mapaEstados = {
      [ROLES_OCR.JEFE_AREA]: 'RECHAZADA_AREA',
      [ROLES_OCR.JEFE_DEPARTAMENTO]: 'RECHAZADA_DEPARTAMENTO',
      [ROLES_OCR.JEFE_DIVISION]: 'RECHAZADA_DIVISION',
      [ROLES_OCR.ADMIN]: 'RECHAZADA'
    };

    return mapaEstados[rol] || null;
  },

  puedeAprobarEstado(estadoActual, rol) {
    const mapaAprobacion = {
      'REVISION_AREA': ROLES_OCR.JEFE_AREA,
      'REVISION_DEPARTAMENTO': ROLES_OCR.JEFE_DEPARTAMENTO,
      'REVISION_DIVISION': ROLES_OCR.JEFE_DIVISION,
      'REVISION_ADMIN': ROLES_OCR.ADMIN
    };

    return mapaAprobacion[estadoActual] === rol;
  },

  obtenerJefeInmediato(rol) {
    return JERARQUIA_OCR[rol]?.siguiente || null;
  },

  obtenerRolPorNivel(nivel) {
    for (const [key, value] of Object.entries(JERARQUIA_OCR)) {
      if (value.nivel === nivel) {
        return key;
      }
    }
    return null;
  },

  esAdministrador(rol) {
    return rol === ROLES_OCR.ADMIN;
  },

  esJefeArea(rol) {
    return rol === ROLES_OCR.JEFE_AREA;
  },

  esJefeDepartamento(rol) {
    return rol === ROLES_OCR.JEFE_DEPARTAMENTO;
  },

  esJefeDivision(rol) {
    return rol === ROLES_OCR.JEFE_DIVISION;
  },

  esUsuario(rol) {
    return rol === ROLES_OCR.USUARIO;
  }
};