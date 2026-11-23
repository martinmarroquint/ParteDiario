// Pruebas del padron PERSONAL y de generarMes con una simulacion minima de
// SpreadsheetApp (sin tocar Google). Ejecutar:
//   node apps-script/test/test_padron.js
// Sale con codigo 1 si algo falla.
'use strict';
const fs = require('fs');
const path = require('path');

// ---------------- Simulacion de Google Sheets ----------------
function colToNum(c) { let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
function numToCol(n) { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

class Sheet {
  constructor(ss, name, rows = 1, cols = 45) {
    this.ss = ss; this.name = name; this.cells = [];
    this.maxRows = rows; this.maxCols = cols; this.formats = {};
    for (let r = 0; r < rows; r++) this.cells.push(new Array(cols).fill(''));
  }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  getMaxColumns() { return this.maxCols; }
  getMaxRows() { return this.maxRows; }
  getLastRow() {
    for (let r = this.cells.length - 1; r >= 0; r--) if (this.cells[r].some(v => v !== '' && v != null)) return r + 1;
    return 0;
  }
  ensure(r) { while (this.cells.length < r) { this.cells.push(new Array(this.maxCols).fill('')); } this.maxRows = Math.max(this.maxRows, this.cells.length); }
  getRange(a, b, c, d) {
    if (typeof a === 'string') {
      let m = a.match(/^([A-Z]+):([A-Z]+)$/);
      if (m) return new Range(this, 1, colToNum(m[1]), Math.max(this.cells.length, 1), colToNum(m[2]) - colToNum(m[1]) + 1);
      m = a.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if (m) return new Range(this, +m[2], colToNum(m[1]), +m[4] - +m[2] + 1, colToNum(m[3]) - colToNum(m[1]) + 1);
      m = a.match(/^([A-Z]+)(\d+)$/);
      return new Range(this, +m[2], colToNum(m[1]), 1, 1);
    }
    return new Range(this, a, b, c || 1, d || 1);
  }
  insertRowAfter(r) { return this.insertRowsAfter(r, 1); }
  insertRowsAfter(r, n) { this.ensure(r); for (let i = 0; i < n; i++) this.cells.splice(r, 0, new Array(this.maxCols).fill('')); this.maxRows += n; }
  deleteRows(r, n) { this.cells.splice(r - 1, n); this.maxRows -= n; }
  setFrozenRows() { }
  appendRow(v) { const r = this.getLastRow() + 1; this.ensure(r); v.forEach((x, j) => { this.cells[r - 1][j] = x; }); }
  copyTo(ss) { const s = new Sheet(ss, 'Copia de ' + this.name, 0, this.maxCols); s.cells = this.cells.map(r => r.slice()); s.maxRows = this.maxRows; ss.sheets.push(s); return s; }
}
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  _each(fn) { this.sh.ensure(this.r + this.nr - 1); for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) fn(i, j); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const rr = this.sh.cells[this.r - 1 + i]; row.push(rr ? (rr[this.c - 1 + j] ?? '') : ''); } out.push(row); } return out; }
  getDisplayValues() { return this.getValues().map(r => r.map(v => String(v))); }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { if (v.length !== this.nr || v[0].length !== this.nc) throw new Error(`setValues: dimensiones ${v.length}x${v[0].length} != ${this.nr}x${this.nc}`); this._each((i, j) => { this.sh.cells[this.r - 1 + i][this.c - 1 + j] = v[i][j]; }); return this; }
  setValue(v) { this._each((i, j) => { this.sh.cells[this.r - 1 + i][this.c - 1 + j] = v; }); return this; }
  clearContent() { this._each((i, j) => { this.sh.cells[this.r - 1 + i][this.c - 1 + j] = ''; }); return this; }
  setNumberFormat(f) { this.sh.formats[`${this.r},${this.c}`] = f; return this; }
  setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; }
  copyTo(dest) {
    const src = this.getValues();
    dest._each((i, j) => {
      let v = src[i % this.nr][j % this.nc];
      const delta = (dest.r + i) - (this.r + (i % this.nr));
      if (typeof v === 'string' && v.startsWith('=')) v = v.replace(/([A-Z]+)(\d+)/g, (_, col, row) => col + (+row + delta));
      dest.sh.cells[dest.r - 1 + i][dest.c - 1 + j] = v;
    });
  }
}
class Spreadsheet {
  constructor() { this.sheets = []; this.active = null; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n) { const s = new Sheet(this, n, 1, 45); this.sheets.push(s); return s; }
  getSheets() { return this.sheets.slice(); }
  setActiveSheet(s) { this.active = s; }
  moveActiveSheet(pos) { const i = this.sheets.indexOf(this.active); this.sheets.splice(i, 1); this.sheets.splice(pos - 1, 0, this.active); }
}

const ss = new Spreadsheet();
const mocks = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => { } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
  ContentService: { createTextOutput: (t) => ({ setMimeType() { }, getContent: () => t }), MimeType: { JSON: 'json', TEXT: 'text' } },
  Utilities: {},
  console: { log() { }, warn() { }, error() { } },
};
const code = fs.readFileSync(path.join(__dirname, '..', 'apps_script_solicitudes_cambios.gs'), 'utf8');
const api = new Function(...Object.keys(mocks), code +
  '\nreturn { generarMes, padronInicializar, padronGuardar, padronBaja, padronReactivar, guardarCelda, doPost };')(...Object.values(mocks));

// ---------------- Datos: pestana DICIEMBRE como la real ----------------
function crearMes(nombre, personas) {
  const sh = ss.insertSheet(nombre);
  const hdr = ['DNI', 'GRADO', 'APELLIDOS Y NOMBRES', 'AREA', 'MEDICOS'];
  for (let d = 1; d <= 31; d++) hdr.push(46356 + d);
  sh.getRange(1, 1, 1, 36).setValues([hdr]);
  sh.getRange('AK1').setValue('HORAS');
  personas.forEach((p, i) => {
    const r = i + 2;
    sh.getRange(r, 1, 1, 5).setValues([p]);
    sh.getRange(r, 6, 1, 31).setValues([new Array(31).fill('MAÑANA')]);
    sh.getRange(r, 37).setValue(`=SUMPRODUCT(F${r}:AJ${r})`);
  });
  return sh;
}
const base = [
  ['111', 'CRNL', 'TERRAZAS DIAZ, SANDRA', 'DIRECCION', 'TRUE'],
  ['222', 'SO1', 'PEREZ, ANA', 'AREA X', 'FALSE'],
  ['', 'CIVIL', 'VERA FALCONI, NARCY', 'IMAGENES', 'FALSE'],
  ['333', 'CIVIL', 'PALOMINO ACO, MASHIEL', 'PSICOLOGIA', 'FALSE'],
  ['333', 'CIVIL', 'GUTIERREZ LOPEZ, CAMILO', 'PROGRAMAS', 'FALSE'],
];
crearMes('NOVIEMBRE', base);
const dic = crearMes('DICIEMBRE', base);
ss.insertSheet('USUARIOS_OCR');

let fallas = 0, total = 0;
function check(nombre, obtenido, esperado) {
  total++;
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  console.info(`[${ok ? 'OK ' : 'FALLA'}] ${nombre}: ${JSON.stringify(obtenido)}${ok ? '' : ' (esperado ' + JSON.stringify(esperado) + ')'}`);
  if (!ok) fallas++;
}

console.info('\n=== INICIALIZAR PADRON ===');
let r = api.generarMes({ mes: 1, anio: 2027, plantilla: 'DICIEMBRE' });
check('generar sin padron -> error claro', r.success, false);
r = api.padronInicializar({ hojaOrigen: 'DICIEMBRE', responsable: 'ADMIN' });
check('padron creado con 5 personas', [r.success, r.total], [true, 5]);
check('reporta el DNI vacio', r.sinDni, ['VERA FALCONI, NARCY']);
check('reporta el DNI duplicado', r.dniDuplicados, [{ dni: '333', nombres: ['PALOMINO ACO, MASHIEL', 'GUTIERREZ LOPEZ, CAMILO'] }]);
check('no se reinicializa por accidente', api.padronInicializar({ hojaOrigen: 'DICIEMBRE' }).success, false);
const padron = ss.getSheetByName('PERSONAL');
check('encabezado del padron', padron.getRange(1, 1, 1, 6).getValues()[0], ['DNI', 'GRADO', 'APELLIDOS Y NOMBRES', 'AREA', 'MEDICOS', 'ESTADO']);

console.info('\n=== ALTA DE PERSONAL NUEVO ===');
r = api.padronGuardar({ modo: 'alta', persona: { dni: '444', grado: 'so2', nombre: 'nuevo  ingreso, juan', area: 'area x', medico: false }, hojas: ['DICIEMBRE'], responsable: 'ADMIN' });
check('alta OK y normalizada', [r.success, r.persona.nombre, r.persona.grado], [true, 'NUEVO INGRESO, JUAN', 'SO2']);
check('agregada al final de DICIEMBRE (fila 7)', r.hojas, [{ hoja: 'DICIEMBRE', fila: 7, accion: 'agregada' }]);
check('fila nueva: A:E', dic.getRange(7, 1, 1, 5).getValues()[0], ['444', 'SO2', 'NUEVO INGRESO, JUAN', 'AREA X', 'FALSE']);
check('fila nueva: turnos vacios', dic.getRange(7, 6, 1, 31).getValues()[0].every(v => v === ''), true);
check('fila nueva: formula copiada y ajustada', dic.getRange(7, 37).getValue(), '=SUMPRODUCT(F7:AJ7)');
check('filas existentes NO se movieron', dic.getRange(3, 3).getValue(), 'PEREZ, ANA');
check('NOVIEMBRE (pasado) no se toca', ss.getSheetByName('NOVIEMBRE').getLastRow(), 6);
r = api.padronGuardar({ modo: 'alta', persona: { dni: '444', grado: 'SO2', nombre: 'OTRO', area: 'X' }, hojas: [] });
check('DNI repetido se rechaza', [r.success, /Ya existe/.test(r.error)], [false, true]);
r = api.padronGuardar({ modo: 'alta', persona: { dni: '', grado: 'SO2', nombre: 'SIN DNI', area: 'X' }, hojas: [] });
check('alta sin DNI se rechaza', r.success, false);

console.info('\n=== TRASLADO / EDICION ===');
r = api.padronGuardar({ modo: 'editar', clave: { dni: '222', nombre: 'PEREZ, ANA' }, persona: { dni: '222', grado: 'SO1', nombre: 'PEREZ, ANA', area: 'EMERGENCIA', medico: false }, hojas: ['DICIEMBRE'] });
check('traslado aplicado en DICIEMBRE fila 3', [r.success, dic.getRange(3, 4).getValue()], [true, 'EMERGENCIA']);
check('turnos de ANA intactos', dic.getRange(3, 6).getValue(), 'MAÑANA');
r = api.padronGuardar({ modo: 'editar', clave: { dni: '', nombre: 'VERA FALCONI, NARCY' }, persona: { dni: '55555555', grado: 'CIVIL', nombre: 'VERA FALCONI, NARCY', area: 'IMAGENES' }, hojas: ['DICIEMBRE'] });
check('completar DNI faltante (por nombre)', [r.success, dic.getRange(4, 1).getValue()], [true, '55555555']);

console.info('\n=== BAJA Y REACTIVACION ===');
r = api.padronBaja({ clave: { dni: '111', nombre: 'TERRAZAS DIAZ, SANDRA' }, hojas: ['DICIEMBRE'] });
check('baja: area SIN_SERVICIO, fila conservada', [r.success, dic.getRange(2, 4).getValue(), dic.getRange(2, 3).getValue()], [true, 'SIN_SERVICIO', 'TERRAZAS DIAZ, SANDRA']);
check('baja: estado en padron', padron.getRange(2, 6).getValue(), 'BAJA');

console.info('\n=== GENERAR ENERO Y FEBRERO 2027 ===');
r = api.generarMes({ mes: 1, anio: 2027, plantilla: 'DICIEMBRE' });
const ene = ss.getSheetByName('ENERO 2027');
check('ENERO 2027 creada', [r.success, r.creada, r.hoja, r.personal], [true, true, 'ENERO 2027', 5]);
check('sin la persona dada de baja', ene.getRange(1, 3, ene.getLastRow(), 1).getValues().flat().includes('TERRAZAS DIAZ, SANDRA'), false);
check('incluye el alta nueva', ene.getRange(1, 3, ene.getLastRow(), 1).getValues().flat().includes('NUEVO INGRESO, JUAN'), true);
check('turnos en blanco', ene.getRange(2, 6, 5, 31).getValues().flat().every(v => v === ''), true);
check('formulas por fila ajustadas', ene.getRange(6, 37).getValue(), '=SUMPRODUCT(F6:AJ6)');
check('dia 1 = 1-ene-2027 (serie 46388)', ene.getRange(1, 6).getValue(), 46388);
check('dia 31 = 31-ene-2027', ene.getRange(1, 36).getValue(), 46418);
check('no queda fila sobrante', ene.getLastRow(), 6);
check('DICIEMBRE intacta', dic.getRange(3, 6).getValue(), 'MAÑANA');
check('idempotente: no la recrea', api.generarMes({ mes: 1, anio: 2027, plantilla: 'DICIEMBRE' }).creada, false);
r = api.generarMes({ mes: 2, anio: 2027, plantilla: 'ENERO 2027' });
const feb = ss.getSheetByName('FEBRERO 2027');
check('febrero: dias 29-31 en blanco', [feb.getRange(1, 33).getValue(), feb.getRange(1, 34).getValue(), feb.getRange(1, 36).getValue()], [46446, '', '']);
check('orden de pestanas', ss.getSheets().map(s => s.getName()).filter(n => /ENERO|FEBRERO|DICIEMBRE|NOVIEMBRE/.test(n)), ['NOVIEMBRE', 'DICIEMBRE', 'ENERO 2027', 'FEBRERO 2027']);
check('2026 sin sufijo no se genera como ENERO 2026', api.generarMes({ mes: 1, anio: 2026, plantilla: 'DICIEMBRE' }).hoja, 'ENERO');
r = api.padronReactivar({ clave: { dni: '111', nombre: 'TERRAZAS DIAZ, SANDRA' }, area: 'DIRECCION', hojas: ['ENERO 2027'] });
check('reactivar la agrega a ENERO 2027', [r.success, r.hojas[0].accion], [true, 'agregada']);

console.info('\n=== CAMBIOS registra la pestana ===');
api.guardarCelda({ fila: 3, columna: 'F', valor: 'TARDE', origen: 'solicitudAprobada', responsable: 'X' }, 'ENERO 2027');
const cambios = ss.getSheetByName('CAMBIOS');
check('CAMBIOS col J = HOJA', [cambios.getRange('J1').getValue(), cambios.getRange(2, 8).getValue(), cambios.getRange(2, 10).getValue()], ['HOJA', 'SOLICITUD_APROBADA', 'ENERO 2027']);

console.info(`\nRESULTADO: ${total - fallas}/${total} pruebas OK`);
process.exit(fallas ? 1 : 0);
