// src/components/ocr/constantes.js
// Constantes compartidas para el sistema de Roles PNP
// ✅ TODAS las variables sensibles se leen del .env
// ✅ NO hay fallbacks en duro para claves o credenciales

export const COLOR_PRIMARIO = '#188C5D';

// ============================================
// CLAVE DE ACCESO ADMIN - SOLO DESDE .env
// ============================================
// ✅ Se lee SOLO del .env. Si no está definida, será undefined.
// ❌ NO tiene fallback en duro por seguridad.
export const CLAVE_SECRETA = import.meta.env.VITE_CLAVE_SECRETA;

// ============================================
// CONSTANTES FIJAS (NO SENSIBLES)
// ============================================
export const HOJA_CAMBIOS = 'CAMBIOS';

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

// Crear mapas para búsqueda rápida
export const TURNO_MAP = {};
TURNOS.forEach(t => { TURNO_MAP[t.codigo] = t; });

export const NOMBRE_A_CODIGO = {};
TURNOS.forEach(t => { NOMBRE_A_CODIGO[t.nombre] = t.codigo; });

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Años disponibles: dinamicos alrededor del año actual (sin hardcodear).
export const ANIOS = (() => {
  const actual = new Date().getFullYear();
  return [actual - 1, actual, actual + 1, actual + 2];
})();

// Hoja-mes correspondiente a la fecha actual (todo automatico, sin valores fijos).
export const hojaDelMesActual = () => MESES[new Date().getMonth()].toUpperCase();
export const mesActual = () => new Date().getMonth() + 1;
export const anioActual = () => new Date().getFullYear();

// Nombres de las hojas-mes (en mayusculas) para filtrar los desplegables de meses.
const MESES_UPPER = MESES.map(m => m.toUpperCase());
export const esHojaMes = (nombre) => MESES_UPPER.includes(String(nombre || '').trim().toUpperCase());
export const soloHojasMes = (hojas) => (hojas || []).filter(esHojaMes);

// Numero de mes (1-12) que corresponde a una hoja-mes (p. ej. "SEPTIEMBRE" -> 9).
export const MES_DE_HOJA = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
export const mesDeHoja = (hoja) => MES_DE_HOJA[String(hoja || '').trim().toUpperCase()] || new Date().getMonth() + 1;

// El mes NO es global: cada usuario conserva la hoja-mes que eligio.
// Preferencia persistida por area en localStorage.
const STORAGE_HOJA_PREFERIDA = 'ocr_hoja_preferida';
export const leerHojaPreferida = (area = '') => {
  try { return localStorage.getItem(`${STORAGE_HOJA_PREFERIDA}_${area}`) || ''; } catch { return ''; }
};
export const guardarHojaPreferida = (area = '', hoja = '') => {
  try { localStorage.setItem(`${STORAGE_HOJA_PREFERIDA}_${area}`, hoja); } catch { void 0; }
};

// Resuelve la hoja-mes sugerida SIN imponer un mes global (ya no se lee CONFIG).
// Orden: hoja guardada por el usuario > config.sheetName > hoja del mes actual.
export const resolverHojaActiva = async (config, hojaSugerida = '') => {
  const base = (hojaSugerida && String(hojaSugerida).trim()) || config?.sheetName || hojaDelMesActual();
  return base;
};

// Elige la hoja inicial para un area validando contra las hojas-mes reales del libro.
// Siempre inicia en el mes actual para evitar flash al cargar.
export const hojaInicialParaArea = (area = '', config = {}, hojasMes = []) => {
  const actual = hojaDelMesActual();
  if (hojasMes.includes(actual)) return actual;
  const candidatas = [config?.sheetName, ...hojasMes];
  for (const c of candidatas) {
    if (c && hojasMes.includes(c)) return c;
  }
  return hojasMes[0] || actual;
};

export const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes', corto: 'Lun', inicial: 'L' }, 
  { id: 2, nombre: 'Martes', corto: 'Mar', inicial: 'M' },
  { id: 3, nombre: 'Miercoles', corto: 'Mie', inicial: 'M' }, 
  { id: 4, nombre: 'Jueves', corto: 'Jue', inicial: 'J' },
  { id: 5, nombre: 'Viernes', corto: 'Vie', inicial: 'V' }, 
  { id: 6, nombre: 'Sabado', corto: 'Sab', inicial: 'S' },
  { id: 0, nombre: 'Domingo', corto: 'Dom', inicial: 'D' },
];

export const GRUPOS_DIAS_SEMANA = [
  { id: 'lunes-viernes', nombre: 'Lunes a Viernes', dias: [1, 2, 3, 4, 5] },
  { id: 'lunes-sabado', nombre: 'Lunes a Sabado', dias: [1, 2, 3, 4, 5, 6] },
  { id: 'fin-semana', nombre: 'Fin de Semana', dias: [6, 0] },
  { id: 'todos', nombre: 'Todos los dias', dias: [0, 1, 2, 3, 4, 5, 6] },
];

// ============================================
// JERARQUÍA DE GRADOS Y ORDENAMIENTO DE PERSONAL
// ============================================
export const JERARQUIA_GRADOS = [
  "CRNL SPNP", "CMDTE SPNP", "MAY SPNP", "CAP SPNP",
  "SS PNP", "SS SPNP", "SB PNP", "SB SPNP",
  "ST1 PNP", "ST1 SPNP", "ST2 PNP", "ST2 SPNP",
  "ST3 PNP", "ST3 SPNP", "S1 PNP", "S1 SPNP",
  "S2 PNP", "S2 SPNP", "S3 PNP", "S3 SPNP",
];

export const CATEGORIAS_FINAL = ['CIVIL', 'PERSONAL CIVIL', 'PC', 'CAS'];

export const GRADOS_CIVILES = ['CIVIL', 'PERSONAL CIVIL', 'PC', 'EMPLEADO CIVIL', 'TRABAJADOR CIVIL', 'CAS', 'EC.', 'EC PC'];

export const obtenerJerarquiaGrado = (grado) => {
  if (!grado) return 999;
  const gradoUpper = grado.toUpperCase().trim();
  const idx = JERARQUIA_GRADOS.findIndex(g => gradoUpper === g.toUpperCase());
  if (idx !== -1) return idx;
  for (let i = 0; i < JERARQUIA_GRADOS.length; i++) {
    if (gradoUpper.includes(JERARQUIA_GRADOS[i].toUpperCase()) ||
        JERARQUIA_GRADOS[i].toUpperCase().includes(gradoUpper)) return i;
  }
  if (CATEGORIAS_FINAL.some(c => gradoUpper.includes(c.toUpperCase()))) return 998;
  return 997;
};

export const ordenarPersonalPorGrado = (personal) => {
  return [...personal].sort((a, b) => {
    const ja = obtenerJerarquiaGrado(a.grado);
    const jb = obtenerJerarquiaGrado(b.grado);
    if (ja !== jb) return ja - jb;
    return (a.nombre || '').localeCompare(b.nombre || '', 'es');
  });
};

export const esPersonalCivil = (grado) => {
  if (!grado) return false;
  const gradoUpper = grado.toUpperCase().trim();
  return GRADOS_CIVILES.some(gc => gradoUpper.includes(gc) || gc.includes(gradoUpper));
};

// ============================================
// CONFIGURACIÓN DEL BACKEND - SOLO DEL .env
// ============================================
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
};

// ============================================
// CONFIGURACIÓN DE GOOGLE SHEETS (Legacy - usar API_CONFIG)
// ============================================
export const DEFAULT_GOOGLE_CONFIG = {
  sheetId: import.meta.env.VITE_GOOGLE_SHEETS_ID || '',
  sheetName: import.meta.env.VITE_GOOGLE_SHEETS_SHEET_NAME || hojaDelMesActual(),
  apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
  appsScriptUrl: import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''
};

// ============================================
// UTILIDAD: Serializar a JSON 100% ASCII
// ============================================
export const bodyAsciiJson = (obj) => JSON.stringify(obj).replace(/[\u007F-\uFFFF]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));

// ============================================
// APPS SCRIPT: validacion y verificacion de salud
// ============================================
// Valida que la URL tenga el formato de un Web App publicado (/macros/s/<ID>/exec o /dev).
// Descarta URLs tipo /macros/echo (deployment inexistente o mal configurado).
export const esUrlAppsScriptValida = (url) => {
  const u = String(url || '').trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/(exec|dev)\/?$/.test(u);
};

// Verifica si el deployment responde (GET al doGet, peticion simple sin preflight).
// Devuelve { ok, mensaje } sin lanzar excepciones.
export const verificarAppsScript = async (url) => {
  if (!url) return { ok: false, mensaje: 'No esta configurado (VITE_GOOGLE_APPS_SCRIPT_URL vacio en .env).' };
  if (!esUrlAppsScriptValida(url)) {
    return { ok: false, mensaje: 'La URL configurada no es un Web App valido de Apps Script. Debe terminar en /exec o /dev.' };
  }
  try {
    const r = await fetch(`${url}?accion=ping&ts=${Date.now()}`, { method: 'GET', cache: 'no-store' });
    if (r.ok) return { ok: true, mensaje: '' };
    return { ok: false, mensaje: `El deployment respondio ${r.status} (${r.statusText}). Verifique que el Apps Script este desplegado como Web App con acceso "Cualquier persona" y que VITE_GOOGLE_APPS_SCRIPT_URL use el /exec actual.` };
  } catch (e) {
    return { ok: false, mensaje: 'No se pudo conectar con el Apps Script. Revise su URL en el .env.' };
  }
};

// ============================================
// CÓDIGOS DE ÁREAS - Hospital Regional Policial Arequipa
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

/**
 * Obtiene el código de un área por su nombre
 * @param {string} nombreArea - Nombre del área
 * @returns {string} Código del área o cadena vacía
 */
export const obtenerCodigoArea = (nombreArea) => {
  if (!nombreArea) return '';
  
  // Búsqueda exacta
  if (CODIGOS_AREA[nombreArea]) return CODIGOS_AREA[nombreArea];
  
  // Búsqueda sin tildes ni diferencias de acentos
  const nombreSinTildes = nombreArea.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  
  for (const [key, value] of Object.entries(CODIGOS_AREA)) {
    const keySinTildes = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (keySinTildes === nombreSinTildes) return value;
  }
  
  return '';
};