// src/components/ocr/tour/TourSteps.jsx
// Definición de pasos del tour guiado por rol
// IMPORTANTE: Solo usar targets de elementos que SIEMPRE existen en el DOM
// Si un target es condicional, será filtrado automáticamente por filterValidSteps()

const TUTORIALES = {
  admin: [
    {
      target: '[data-tour="tour-area-label"]',
      title: 'Bienvenido, Administrador',
      content: 'Tienes control total del sistema. Aquí ves el área seleccionada.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="tour-estado-rol"]',
      title: 'Estado del Rol',
      content: 'Abierto = editable. Cerrado = finalizado. Puedes abrir y cerrar áreas.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-selector-area"]',
      title: 'Filtrar Área',
      content: 'Selecciona un área o "Todas" para ver todo el hospital.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-admin-usuarios"]',
      title: 'Administrar Usuarios',
      content: 'Crea, edita y desactiva usuarios. Asigna roles y áreas.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-carrusel-turnos"]',
      title: 'Turnos Disponibles',
      content: 'Selecciona un turno (M, T, N, F...) y haz clic en la celda para asignarlo.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-tabla-rol"]',
      title: 'Grilla de Turnos',
      content: 'Organiza turnos por día. Haz clic en las celdas para asignar.',
      placement: 'top',
    },
    {
      target: '[data-tour="tour-turnos-rapidos"]',
      title: 'Turnos Rápidos',
      content: 'Asigna turnos masivamente por día de la semana.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-bandeja"]',
      title: 'Bandeja de Solicitudes',
      content: 'Aprueba o rechaza cambios de turno del personal.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-mesa-partes"]',
      title: 'Mesa de Partes',
      content: 'Gestión documentaria: registra, deriva y da seguimiento.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-cambiar-password"]',
      title: 'Cambiar Contraseña',
      content: 'Actualiza tu contraseña de acceso.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-salir"]',
      title: 'Cerrar Sesión',
      content: 'Cierra tu sesión de forma segura.',
      placement: 'bottom',
    },
  ],

  jefe: [
    {
      target: '[data-tour="tour-area-label"]',
      title: 'Tu Área',
      content: 'Aquí ves tu área asignada. Puedes cambiar si tienes acceso a varias.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="tour-estado-rol"]',
      title: 'Estado del Rol',
      content: 'Abierto = puedes editar turnos. Cerrado = finalizado.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-carrusel-turnos"]',
      title: 'Turnos Disponibles',
      content: 'Selecciona un turno y haz clic en la celda del empleado para asignarlo.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-tabla-rol"]',
      title: 'Grilla de Turnos',
      content: 'Organiza los turnos de tu personal. Haz clic en las celdas.',
      placement: 'top',
    },
    {
      target: '[data-tour="tour-guardar"]',
      title: 'Guardar y Finalizar',
      content: 'Guarda los cambios para bloquear el rol.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-bandeja"]',
      title: 'Bandeja de Solicitudes',
      content: 'Aprueba o rechaza solicitudes de cambio de turno.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-solicitar-cambio"]',
      title: 'Solicitar Cambio',
      content: 'También puedes solicitar cambios de turno para ti.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-descanso-medico"]',
      title: 'Descanso Médico',
      content: 'Registra tu descanso médico con certificado.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-mesa-partes"]',
      title: 'Mesa de Partes',
      content: 'Gestión documentaria del hospital.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-cambiar-password"]',
      title: 'Cambiar Contraseña',
      content: 'Actualiza tu contraseña de acceso.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-salir"]',
      title: 'Cerrar Sesión',
      content: 'Cierra tu sesión de forma segura.',
      placement: 'bottom',
    },
  ],

  usuario: [
    {
      target: '[data-tour="tour-area-label"]',
      title: 'Bienvenido',
      content: 'Este es el panel de turnos de tu hospital.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="tour-estado-rol"]',
      title: 'Estado del Rol',
      content: 'Muestra si el rol esta abierto o cerrado.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-mi-horario"]',
      title: 'Mi Horario',
      content: 'Este es tu calendario personal. Aqui ves tus turnos asignados, selecciona el mes y anio con los dropdowns, y haz clic en cualquier dia para ver detalles.',
      placement: 'right',
    },
    {
      target: '[data-tour="tour-solicitar-cambio"]',
      title: 'Solicitar Cambio',
      content: 'Necesitas cambiar un turno? Envia una solicitud a tu jefe.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-descanso-medico"]',
      title: 'Descanso Medico',
      content: 'Registra tu descanso medico con certificado.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-mesa-partes"]',
      title: 'Mesa de Partes',
      content: 'Sigue el estado de tus documentos.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-cambiar-password"]',
      title: 'Cambiar Contrasena',
      content: 'Actualiza tu contrasena periodicamente.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-salir"]',
      title: 'Cerrar Sesion',
      content: 'Cierra tu sesion cuando termines.',
      placement: 'bottom',
    },
  ],

  tramite: [
    {
      target: '[data-tour="tour-area-label"]',
      title: 'Trámite Documentario',
      content: 'Gestionas toda la documentación del hospital.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="tour-mesa-partes"]',
      title: 'Mesa de Partes',
      content: 'Registra, deriva y da seguimiento a documentos.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-mesa-nuevo"]',
      title: 'Registrar Documento',
      content: 'Haz clic en "Nuevo" para registrar un documento.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-mesa-buscar"]',
      title: 'Buscar Documentos',
      content: 'Busca por número o asunto.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-cambiar-password"]',
      title: 'Cambiar Contraseña',
      content: 'Actualiza tu contraseña.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tour-salir"]',
      title: 'Cerrar Sesión',
      content: 'Cierra tu sesión.',
      placement: 'bottom',
    },
  ],
};

/* ============================================================
 * Helpers internos
 * ============================================================ */

/**
 * Devuelve true si estamos en un entorno con DOM y localStorage.
 * Útil para evitar errores en SSR o tests.
 */
const hasDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const hasStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

/**
 * Clave única por usuario para localStorage.
 */
const storageKeyFor = (user) => `ocr_tour_completed_${user.id || user.usuario}`;

/* ============================================================
 * API pública
 * ============================================================ */

/**
 * Obtiene los pasos del tour según el rol del usuario.
 * Devuelve una COPIA defensiva del array (no la referencia original).
 *
 * @param {object|null} user
 * @returns {Array} array de pasos (copia)
 */
export function getTourSteps(user) {
  if (!user) return [...TUTORIALES.usuario];

  const rol = user.rol;
  const rolPrincipal = user.rol_principal;

  if (rol === 'tramite_documentario' || rolPrincipal === 5) {
    return [...TUTORIALES.tramite];
  }
  if (rol === 'admin' || rolPrincipal === 4) {
    return [...TUTORIALES.admin];
  }
  if (
    ['jefe_area', 'jefe_departamento', 'jefe_division'].includes(rol) ||
    [1, 2, 3].includes(rolPrincipal)
  ) {
    return [...TUTORIALES.jefe];
  }
  return [...TUTORIALES.usuario];
}

/**
 * Filtra los pasos dejando solo aquellos cuyo target exista en el DOM.
 * Esto evita el problema de TARGET_NOT_FOUND cuando un elemento es condicional
 * (por ejemplo, botones que solo aparecen en modo edición o con permisos).
 *
 * IMPORTANTE: debe llamarse cuando el DOM ya está renderizado.
 *
 * @param {Array} steps
 * @returns {Array} pasos válidos
 */
export function filterValidSteps(steps) {
  if (!Array.isArray(steps)) return [];
  if (!hasDOM()) return steps; // en SSR no filtramos

  return steps.filter((step) => {
    if (!step?.target) return false;

    // Caso target string (selector CSS)
    if (typeof step.target === 'string') {
      try {
        return !!document.querySelector(step.target);
      } catch {
        return false;
      }
    }

    // Caso target HTMLElement
    if (step.target instanceof Element) {
      return document.body.contains(step.target);
    }

    return false;
  });
}

/**
 * Obtiene los pasos del tour YA FILTRADOS por existencia en el DOM.
 * Esta es la función recomendada para usar desde GuidedTour.
 *
 * @param {object|null} user
 * @returns {Array} pasos válidos
 */
export function getTourStepsForUser(user) {
  const steps = getTourSteps(user);
  return filterValidSteps(steps);
}

/**
 * Verifica si el usuario debe ver el tour (primera vez).
 */
export function shouldShowTour(user) {
  if (!user) return false;
  if (!hasStorage()) return false;
  return !window.localStorage.getItem(storageKeyFor(user));
}

/**
 * Marca el tour como completado.
 */
export function markTourCompleted(user) {
  if (!user) return;
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(storageKeyFor(user), 'true');
  } catch {
    // localStorage lleno o bloqueado — ignorar
  }
}

/**
 * Resetea el tour para que se vuelva a mostrar.
 */
export function resetTour(user) {
  if (!user) return;
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(storageKeyFor(user));
  } catch {
    // ignorar
  }
}

/**
 * Utilidad de debug: lista los targets faltantes para el usuario actual.
 * Útil en consola para saber qué data-tour falta agregar al DOM.
 *
 * Uso: import { debugMissingTargets } from './TourSteps';
 *      debugMissingTargets(user);
 */
export function debugMissingTargets(user) {
  if (!hasDOM()) {
    console.warn('[Tour] debugMissingTargets requiere DOM');
    return;
  }
  const steps = getTourSteps(user);
  const missing = steps
    .filter((s) => typeof s.target === 'string')
    .filter((s) => !document.querySelector(s.target));

  if (missing.length === 0) {
    console.log('[Tour] ✅ Todos los targets existen en el DOM');
  } else {
    console.warn(
      `[Tour] ⚠️ ${missing.length} targets faltantes:`,
      missing.map((s) => s.target)
    );
  }
  return missing;
}

export default TUTORIALES;