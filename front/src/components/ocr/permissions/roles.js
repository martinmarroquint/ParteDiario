// src/components/ocr/permissions/roles.js
// Roles y permisos exclusivos para el sistema OCR

export const ROLES_OCR = {
  ADMIN: 'admin',
  JEFE_DIVISION: 'jefe_division',
  JEFE_DEPARTAMENTO: 'jefe_departamento',
  JEFE_AREA: 'jefe_area',
  USUARIO: 'usuario'
};

export const JERARQUIA_OCR = {
  [ROLES_OCR.ADMIN]: {
    nivel: 4,
    siguiente: null,
    etiqueta: 'Administrador',
    descripcion: 'Acceso total al sistema'
  },
  [ROLES_OCR.JEFE_DIVISION]: {
    nivel: 3,
    siguiente: ROLES_OCR.ADMIN,
    etiqueta: 'Jefe de Division',
    descripcion: 'Gestiona divisiones y aprueba solicitudes'
  },
  [ROLES_OCR.JEFE_DEPARTAMENTO]: {
    nivel: 2,
    siguiente: ROLES_OCR.JEFE_DIVISION,
    etiqueta: 'Jefe de Departamento',
    descripcion: 'Gestiona departamentos y aprueba solicitudes'
  },
  [ROLES_OCR.JEFE_AREA]: {
    nivel: 1,
    siguiente: ROLES_OCR.JEFE_DEPARTAMENTO,
    etiqueta: 'Jefe de Area',
    descripcion: 'Gestiona areas y aprueba solicitudes'
  },
  [ROLES_OCR.USUARIO]: {
    nivel: 0,
    siguiente: ROLES_OCR.JEFE_AREA,
    etiqueta: 'Usuario',
    descripcion: 'Consulta y solicita cambios'
  }
};

export const PERMISOS_OCR = {
  [ROLES_OCR.ADMIN]: {
    puedeEditar: true,
    puedeAprobar: true,
    puedeVerTodos: true,
    puedeGestionarUsuarios: true,
    puedeConfigurar: true,
    puedeVerAuditoria: true
  },
  [ROLES_OCR.JEFE_DIVISION]: {
    puedeEditar: true,
    puedeAprobar: true,
    puedeVerTodos: false,
    puedeGestionarUsuarios: false,
    puedeConfigurar: false,
    puedeVerAuditoria: false
  },
  [ROLES_OCR.JEFE_DEPARTAMENTO]: {
    puedeEditar: true,
    puedeAprobar: true,
    puedeVerTodos: false,
    puedeGestionarUsuarios: false,
    puedeConfigurar: false,
    puedeVerAuditoria: false
  },
  [ROLES_OCR.JEFE_AREA]: {
    puedeEditar: true,
    puedeAprobar: true,
    puedeVerTodos: false,
    puedeGestionarUsuarios: false,
    puedeConfigurar: false,
    puedeVerAuditoria: false
  },
  [ROLES_OCR.USUARIO]: {
    puedeEditar: false,
    puedeAprobar: false,
    puedeVerTodos: false,
    puedeGestionarUsuarios: false,
    puedeConfigurar: false,
    puedeVerAuditoria: false
  }
};

export const OBTENER_SIGUIENTE_NIVEL = {
  'ENVIADA': ROLES_OCR.JEFE_AREA,
  'APROBADA_AREA': ROLES_OCR.JEFE_DEPARTAMENTO,
  'APROBADA_DEPARTAMENTO': ROLES_OCR.JEFE_DIVISION,
  'APROBADA_DIVISION': ROLES_OCR.ADMIN
};

export const OBTENER_SIGUIENTE_ESTADO = {
  'ENVIADA': 'REVISION_AREA',
  'APROBADA_AREA': 'REVISION_DEPARTAMENTO',
  'APROBADA_DEPARTAMENTO': 'REVISION_DIVISION',
  'APROBADA_DIVISION': 'REVISION_ADMIN'
};

export const OBTENER_ROLES_POR_NIVEL = (nivel) => {
  const roles = [];
  for (const [rol, data] of Object.entries(JERARQUIA_OCR)) {
    if (data.nivel >= nivel) {
      roles.push(rol);
    }
  }
  return roles;
};

export const ES_JEFE = (rol) => {
  return [ROLES_OCR.JEFE_AREA, ROLES_OCR.JEFE_DEPARTAMENTO, ROLES_OCR.JEFE_DIVISION, ROLES_OCR.ADMIN].includes(rol);
};

export const PUEDE_APROBAR = (rol) => {
  return PERMISOS_OCR[rol]?.puedeAprobar || false;
};

export const PUEDE_EDITAR = (rol) => {
  return PERMISOS_OCR[rol]?.puedeEditar || false;
};