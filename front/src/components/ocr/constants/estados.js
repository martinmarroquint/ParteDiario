// src/components/ocr/constants/estados.js
// Estados de solicitud para el flujo jerarquico OCR

export const ESTADOS_SOLICITUD_OCR = {
  // Estado inicial del usuario
  ENVIADA: 'ENVIADA',
  
  // Nivel 1: Jefe de Area
  REVISION_AREA: 'REVISION_AREA',
  APROBADA_AREA: 'APROBADA_AREA',
  RECHAZADA_AREA: 'RECHAZADA_AREA',
  
  // Nivel 2: Jefe de Departamento
  REVISION_DEPARTAMENTO: 'REVISION_DEPARTAMENTO',
  APROBADA_DEPARTAMENTO: 'APROBADA_DEPARTAMENTO',
  RECHAZADA_DEPARTAMENTO: 'RECHAZADA_DEPARTAMENTO',
  
  // Nivel 3: Jefe de Division
  REVISION_DIVISION: 'REVISION_DIVISION',
  APROBADA_DIVISION: 'APROBADA_DIVISION',
  RECHAZADA_DIVISION: 'RECHAZADA_DIVISION',
  
  // Nivel 4: Administrador
  REVISION_ADMIN: 'REVISION_ADMIN',
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA'
};

export const ESTADOS_META_OCR = {
  [ESTADOS_SOLICITUD_OCR.ENVIADA]: {
    etiqueta: 'Enviada',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    orden: 0
  },
  [ESTADOS_SOLICITUD_OCR.REVISION_AREA]: {
    etiqueta: 'Revision Area',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    orden: 1
  },
  [ESTADOS_SOLICITUD_OCR.APROBADA_AREA]: {
    etiqueta: 'Aprobada Area',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    orden: 1
  },
  [ESTADOS_SOLICITUD_OCR.RECHAZADA_AREA]: {
    etiqueta: 'Rechazada Area',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    orden: 1
  },
  [ESTADOS_SOLICITUD_OCR.REVISION_DEPARTAMENTO]: {
    etiqueta: 'Revision Depto',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    orden: 2
  },
  [ESTADOS_SOLICITUD_OCR.APROBADA_DEPARTAMENTO]: {
    etiqueta: 'Aprobada Depto',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    orden: 2
  },
  [ESTADOS_SOLICITUD_OCR.RECHAZADA_DEPARTAMENTO]: {
    etiqueta: 'Rechazada Depto',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    orden: 2
  },
  [ESTADOS_SOLICITUD_OCR.REVISION_DIVISION]: {
    etiqueta: 'Revision Division',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    orden: 3
  },
  [ESTADOS_SOLICITUD_OCR.APROBADA_DIVISION]: {
    etiqueta: 'Aprobada Division',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    orden: 3
  },
  [ESTADOS_SOLICITUD_OCR.RECHAZADA_DIVISION]: {
    etiqueta: 'Rechazada Division',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    orden: 3
  },
  [ESTADOS_SOLICITUD_OCR.REVISION_ADMIN]: {
    etiqueta: 'Revision Admin',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    orden: 4
  },
  [ESTADOS_SOLICITUD_OCR.APROBADA]: {
    etiqueta: 'Aprobada',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    orden: 4
  },
  [ESTADOS_SOLICITUD_OCR.RECHAZADA]: {
    etiqueta: 'Rechazada',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    orden: 4
  }
};

export const SIGUIENTE_ESTADO_OCR = {
  [ESTADOS_SOLICITUD_OCR.ENVIADA]: ESTADOS_SOLICITUD_OCR.REVISION_AREA,
  [ESTADOS_SOLICITUD_OCR.APROBADA_AREA]: ESTADOS_SOLICITUD_OCR.REVISION_DEPARTAMENTO,
  [ESTADOS_SOLICITUD_OCR.APROBADA_DEPARTAMENTO]: ESTADOS_SOLICITUD_OCR.REVISION_DIVISION,
  [ESTADOS_SOLICITUD_OCR.APROBADA_DIVISION]: ESTADOS_SOLICITUD_OCR.REVISION_ADMIN,
  [ESTADOS_SOLICITUD_OCR.REVISION_AREA]: null,
  [ESTADOS_SOLICITUD_OCR.REVISION_DEPARTAMENTO]: null,
  [ESTADOS_SOLICITUD_OCR.REVISION_DIVISION]: null,
  [ESTADOS_SOLICITUD_OCR.REVISION_ADMIN]: null
};

export const ESTADOS_FINALES = [
  ESTADOS_SOLICITUD_OCR.APROBADA,
  ESTADOS_SOLICITUD_OCR.RECHAZADA,
  ESTADOS_SOLICITUD_OCR.RECHAZADA_AREA,
  ESTADOS_SOLICITUD_OCR.RECHAZADA_DEPARTAMENTO,
  ESTADOS_SOLICITUD_OCR.RECHAZADA_DIVISION
];

export const OBTENER_NIVEL_POR_ESTADO = (estado) => {
  const meta = ESTADOS_META_OCR[estado];
  return meta ? meta.orden : 0;
};

export const ES_ESTADO_FINAL = (estado) => {
  return ESTADOS_FINALES.includes(estado);
};

export const OBTENER_ESTADOS_POR_NIVEL = (nivel) => {
  const estados = [];
  for (const [key, meta] of Object.entries(ESTADOS_META_OCR)) {
    if (meta.orden <= nivel) {
      estados.push(key);
    }
  }
  return estados;
};