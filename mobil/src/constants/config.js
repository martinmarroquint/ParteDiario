// mobil/src/constants/config.js
// Constantes compartidas para la app movil de Roles PNP

// ============================================
// COLOR PRINCIPAL
// ============================================
export const COLOR_PRIMARIO = '#188C5D';

// ============================================
// CLAVE DE ACCESO ADMIN
// ============================================
// En movil no hay .env, se define aqui por ser app nativa con acceso restringido
export const CLAVE_SECRETA = 'R3curs*sHum@n*s';

// ============================================
// MESES
// ============================================
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Mapa numero de mes -> nombre de hoja en mayusculas
export const MESES_SHEET = {
  1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
  5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
  9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
};

// ============================================
// TURNOS
// ============================================
export const TURNOS = [
  { codigo: 'M',   nombre: 'MAÑANA',                                    horas: 6,  color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'T',   nombre: 'TARDE',                                     horas: 6,  color: '#FEFCBF', texto: '#744210' },
  { codigo: 'F',   nombre: 'FRANCO',                                    horas: 0,  color: '#FED7D7', texto: '#9B2C2C' },
  { codigo: 'MT',  nombre: '12 HRS M',                                  horas: 12, color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'N',   nombre: '12 HRS N',                                  horas: 12, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'FE',  nombre: 'FERIADO',                                   horas: 0,  color: '#FED7D7', texto: '#44337A' },
  { codigo: 'V',   nombre: 'VACACIONES',                                horas: 0,  color: '#FF0000', texto: '#FFFFFF' },
  { codigo: 'FS',  nombre: 'FALTO AL SERVICIO',                         horas: 0,  color: '#FEEBC8', texto: '#7B341E' },
  { codigo: 'LG',  nombre: 'LICENCIA DE GRAVIDEZ',                      horas: 0,  color: '#FED7E2', texto: '#702459' },
  { codigo: 'DM',  nombre: 'DESCANSO MEDICO',                           horas: 0,  color: '#D08AFF', texto: '#FFFFFF' },
  { codigo: 'L12', nombre: 'LEY 12633',                                 horas: 0,  color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'H',   nombre: 'HOSPITALIZADO',                             horas: 0,  color: '#FEEBC8', texto: '#7B341E' },
  { codigo: 'C',   nombre: 'COMISION',                                  horas: 0,  color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'PR',  nombre: 'PERMISO DE RADIACION',                      horas: 0,  color: '#E9D8FD', texto: '#44337A' },
  { codigo: 'AVC', nombre: 'ADAPTACION A LA VIDA CIVIL',                horas: 0,  color: '#FED7E2', texto: '#702459' },
  { codigo: 'LEGF',nombre: 'LICENCIA ENFERMEDAD GRAVE FAMILIAR',        horas: 0,  color: '#FECACA', texto: '#991B1B' },
  { codigo: 'PCV', nombre: 'PERMISO A CUENTA DE VACACIONES',            horas: 0,  color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'RL',  nombre: 'REFERIDO A LIMA',                           horas: 0,  color: '#E9D8FD', texto: '#44337A' },
  { codigo: 'SL',  nombre: 'SOMETIDO A LEY',                            horas: 0,  color: '#FED7D7', texto: '#9B2C2C' },
  { codigo: '24',  nombre: '24 X 48',                                   horas: 24, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'SC',  nombre: 'SERVICIO CONTINUO',                         horas: 24, color: '#FFD129', texto: '#22543D' },
  { codigo: 'EXT', nombre: 'EXTERNO',                                   horas: 0,  color: '#E2E8F0', texto: '#2D3748' },
  { codigo: 'R',   nombre: 'RETEN',                                     horas: 24, color: '#FEEBC8', texto: '#7B341E' },
  { codigo: 'S',   nombre: 'SERVICIO',                                  horas: 24, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'M/N', nombre: 'MAÑANA - 12 HRS N',                         horas: 18, color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'T/N', nombre: 'TARDE - 12 HRS N',                          horas: 18, color: '#FEFCBF', texto: '#744210' },
  { codigo: 'ADM', nombre: 'ADMINISTRATIVO',                            horas: 8,  color: '#E2E8F0', texto: '#2D3748' },
  { codigo: 'LFC', nombre: 'LICENCIA FALLECIMIENTO CONYUGUE',           horas: 0,  color: '#FED7D7', texto: '#9B2C2C' },
  { codigo: 'PP',  nombre: 'PAPELETA DE PERMISO',                       horas: 0,  color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'COU', nombre: 'CAMBIADO OTRA UNIDAD',                      horas: 0,  color: '#E2E8F0', texto: '#2D3748' },
  { codigo: '24M', nombre: '24 HRS MTN',                                horas: 24, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'LP',  nombre: 'LICENCIA POR PATERNIDAD',                   horas: 0,  color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'PD',  nombre: 'OFICIAL DE PERMANENCIA (DIURNO)',           horas: 12, color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'PN',  nombre: 'OFICIAL DE PERMANENCIA (NOCTURNO)',         horas: 12, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'PM',  nombre: 'OFICIAL DE PERMANENCIA (MAÑANA)',           horas: 6,  color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'PT',  nombre: 'OFICIAL DE PERMANENCIA (TARDE)',            horas: 6,  color: '#FEFCBF', texto: '#744210' },
];

// Mapa de busqueda rapida por codigo
export const TURNO_MAP = {};
TURNOS.forEach(t => { TURNO_MAP[t.codigo] = t; });

// ============================================
// TURNOS DE DESCANSO (se marcan en rojo en el Parte Diario)
// ============================================
export const TURNOS_DESCANSO = [
  'FRANCO', 'FERIADO', 'VACACIONES', 'DESCANSO MEDICO',
  'FALTO AL SERVICIO', 'HOSPITALIZADO', 'COMISION',
  'PERMISO DE RADIACION', 'REFERIDO A LIMA', 'SOMETIDO A LEY',
  'ADAPTACION A LA VIDA CIVIL', 'LICENCIA DE GRAVIDEZ',
  'LICENCIA ENFERMEDAD GRAVE FAMILIAR', 'LICENCIA FALLECIMIENTO CONYUGUE',
  'PERMISO A CUENTA DE VACACIONES', 'PAPELETA DE PERMISO',
  'CAMBIADO OTRA UNIDAD', 'LICENCIA POR PATERNIDAD', 'EXTERNO',
];

// ============================================
// HORARIOS POR TURNO (entrada y salida)
// ============================================
export const HORARIOS_TURNO = {
  'MAÑANA':                             { entrada: '07:00', salida: '15:00' },
  'TARDE':                              { entrada: '15:00', salida: '23:00' },
  'FRANCO':                             { entrada: '-',     salida: '-' },
  '12 HRS M':                           { entrada: '07:00', salida: '19:00' },
  '12 HRS N':                           { entrada: '19:00', salida: '07:00' },
  'FERIADO':                            { entrada: '-',     salida: '-' },
  'VACACIONES':                         { entrada: '-',     salida: '-' },
  'FALTO AL SERVICIO':                  { entrada: '-',     salida: '-' },
  'LICENCIA DE GRAVIDEZ':               { entrada: '-',     salida: '-' },
  'DESCANSO MEDICO':                    { entrada: '-',     salida: '-' },
  'LEY 12633':                          { entrada: '-',     salida: '-' },
  'HOSPITALIZADO':                      { entrada: '-',     salida: '-' },
  'COMISION':                           { entrada: '-',     salida: '-' },
  'PERMISO DE RADIACION':               { entrada: '-',     salida: '-' },
  'ADAPTACION A LA VIDA CIVIL':         { entrada: '-',     salida: '-' },
  'LICENCIA ENFERMEDAD GRAVE FAMILIAR': { entrada: '-',     salida: '-' },
  'PERMISO A CUENTA DE VACACIONES':     { entrada: '-',     salida: '-' },
  'REFERIDO A LIMA':                    { entrada: '-',     salida: '-' },
  'SOMETIDO A LEY':                     { entrada: '-',     salida: '-' },
  '24 X 48':                            { entrada: '07:00', salida: '07:00' },
  'SERVICIO CONTINUO':                  { entrada: '07:00', salida: '07:00' },
  'EXTERNO':                            { entrada: '-',     salida: '-' },
  'RETEN':                              { entrada: '24 hrs', salida: 'Retén' },
  'SERVICIO':                           { entrada: '07:00', salida: '07:00' },
  'MAÑANA - 12 HRS N':                  { entrada: '07:00', salida: '01:00' },
  'TARDE - 12 HRS N':                   { entrada: '15:00', salida: '09:00' },
  'ADMINISTRATIVO':                     { entrada: '08:00', salida: '16:00' },
  'LICENCIA FALLECIMIENTO CONYUGUE':    { entrada: '-',     salida: '-' },
  'PAPELETA DE PERMISO':                { entrada: '-',     salida: '-' },
  'CAMBIADO OTRA UNIDAD':               { entrada: '-',     salida: '-' },
  '24 HRS MTN':                         { entrada: '07:00', salida: '07:00' },
  'LICENCIA POR PATERNIDAD':            { entrada: '-',     salida: '-' },
  'OFICIAL DE PERMANENCIA (DIURNO)':    { entrada: '07:00', salida: '19:00' },
  'OFICIAL DE PERMANENCIA (NOCTURNO)':  { entrada: '19:00', salida: '07:00' },
  'OFICIAL DE PERMANENCIA (MAÑANA)':    { entrada: '07:00', salida: '13:00' },
  'OFICIAL DE PERMANENCIA (TARDE)':     { entrada: '13:00', salida: '19:00' },
};

// ============================================
// CONFIGURACION POR DEFECTO DE GOOGLE SHEETS
// ============================================
export const DEFAULT_GOOGLE_CONFIG = {
  sheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',  // Reemplazar con tu Sheet ID real
  sheetName: 'AGOSTO',
  apiKey: '',  // Se configura en el archivo .env del proyecto
  appsScriptUrl: '',  // URL del Web App de Apps Script
};

// ============================================
// CODIGOS DE AREAS - Hospital Regional Policial Arequipa
// ============================================
export const CODIGOS_AREA = {
  'DIRECTOR DEL HOSPITAL REGIONAL AREQUIPA': 'H-001',
  'SECRETARIA': 'H-002',
  'AREA DE PLANEAMIENTO': 'H-003',
  'AREA DE EDUCACION': 'H-004',
  'OFICINA DE ADMINISTRACION': 'H-005',
  'AREA DE RECURSOS HUMANOS': 'H-006',
  'AREA DE LOGISTICA': 'H-007',
  'AREA DE CONTABILIDAD': 'H-008',
  'UNIDAD DE RELACIONES PUBLICAS Y ATENCION AL USUARIO': 'H-009',
  'UNIDAD DE GESTION DE LA CALIDAD': 'H-010',
  'UNIDAD DE ADMISION Y REGISTROS MEDICOS': 'H-011',
  'AREA DE ESTADISTICA': 'H-012',
  'AREA DE EPIDEMIOLOGIA': 'H-013',
  'AREA DE PROGRAMAS Y ESTRATEGIAS SANITARIAS': 'H-014',
  'UNIDAD DE TECNOLOGIA DE LA INFORMACION Y COMUNICACIONES': 'H-015',
  'DIVISION DE MEDICINA Y ESPECIALIDADES MEDICAS': 'H-016',
  'RECONOCIMIENTO MEDICO': 'H-017',
  'OFICINA DE REFERENCIAS Y CONTRAREFERENCIAS': 'H-018',
  'JUNTA MEDICA': 'H-019',
  'DIVISION DE CIRUGIA Y ESPECIALIDADES QUIRURGICAS': 'H-020',
  'DEPARTAMENTO DE OBSTETRICIA': 'H-022',
  'DEPARTAMENTO DE GINECOLOGIA': 'H-023',
  'DEPARTAMENTO DE MEDICINA PEDIATRICA': 'H-024',
  'DIVISION DE EMERGENCIA Y AREAS CRITICAS': 'H-025',
  'DEPARTAMENTO DE ASISTENCIA SOCIAL': 'H-026',
  'DEPARTAMENTO DE DIAGNOSTICO POR IMAGENES': 'H-027',
  'DEPARTAMENTO DE MEDICINA FISICA Y REHABILITACION': 'H-028',
  'DEPARTAMENTO DE NUTRICION': 'H-029',
  'DEPARTAMENTO DE ODONTOESTOMATOLOGIA': 'H-030',
  'DEPARTAMENTO DE PATOLOGIA CLINICA': 'H-031',
  'DEPARTAMENTO DE PSICOLOGIA': 'H-032',
  'DEPARTAMENTO DE FARMACIA': 'H-033',
  'DIVISION DE ENFERMERIA': 'H-034',
  'ÁREA DE MEDICINA Y ESPECIALIDADES MÉDICAS': 'H-035',
  'ÁREA DE CIRUGÍA Y ESPECIALIDADES QUIRÚRGICAS': 'H-036',
  'ANESTESIOLOGÍA Y CENTRO QUIRÚRGICO': 'H-037',
  'ÁREA MATERNO INFANTIL': 'H-038',
  'ÁREA DE EMERGENCIA Y ÁREAS CRÍTICAS': 'H-039',
  'ÁREA DE ATENCIÓN AMBULATORIA': 'H-040',
  'OFICIAL DE PERMANENCIA': 'H-041',
  'UNIDAD DE TRAMITE DOCUMENTARIO': 'H-042',
  'DEPARTAMENTO DE ANESTECIOLOGÍA Y CENTRO QUIRURGICO': 'H-043',
  'POSTA MEDICA POLICIAL SAN MARTIN DE PORRES': 'H-044',
  'POSTA MEDICA POLICIAL CAMANA': 'H-045',
  'POSTA MEDICA POLICIAL ISLAY': 'H-046',
  'ESCUELA DE EDUCACION SUPERIOR TECNICO PROFESIONAL': 'H-047',
  'UNIDAD DESCONCENTRADA DE DOSAJE ETILICO': 'H-048',
};

export const obtenerCodigoArea = (nombreArea) => {
  if (!nombreArea) return '';
  if (CODIGOS_AREA[nombreArea]) return CODIGOS_AREA[nombreArea];
  const nombreSinTildes = nombreArea.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  for (const [key, value] of Object.entries(CODIGOS_AREA)) {
    const keySinTildes = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (keySinTildes === nombreSinTildes) return value;
  }
  return '';
};
