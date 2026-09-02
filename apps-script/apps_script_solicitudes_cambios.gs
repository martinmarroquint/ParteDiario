// Google Apps Script - Sistema de Roles PNP
// VERSION 12.1 - PROXY DE ESCRITURA PARA FASTAPI
// FastAPI maneja auth, JWT, logica de negocio
// Apps Script solo maneja escritura a Google Sheets
//
// DEPLOYMENT:
// 1. Copiar este codigo en Google Apps Script (asociado al Sheet)
// 2. Desplegar como Web App
// 3. Copiar la URL del web app
// 4. Pegar en GOOGLE_APPS_SCRIPT_URL del .env del backend

// ============================================
// CONFIGURACION
// ============================================
const CONFIG = {
  SHEET_NAMES: {
    USUARIOS: 'USUARIOS_OCR',
    AREAS: 'AREAS_OCR',
    RECUPERACION: 'RECUPERACION',
    SOLICITUDES: 'SOLICITUDES_CAMBIOS',
    CAMBIOS: 'CAMBIOS',
    ESTADOS: 'ESTADOS',
    DESCANSOS: 'DESCANSOS_MEDICOS',
    VACACIONES: 'VACACIONES'
  },
  // Hojas de meses (para guardar turnos)
  MESES: ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
          'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
};

// ============================================
// MANEJADOR PRINCIPAL - POST
// ============================================
function doPost(e) {
  console.log('doPost llamado');

  try {
    let data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonError) {
        try {
          const decoded = decodeURIComponent(e.postData.contents);
          if (decoded.startsWith('datos=')) {
            data = JSON.parse(decoded.substring(6));
          }
        } catch (urlError) {
          console.log('Error parseando JSON/URL');
        }
      }
    }

    if (!data.accion && e && e.parameter) {
      data.accion = e.parameter.accion;
      data.hoja = e.parameter.hoja;
      data.fila = e.parameter.fila;
      data.columna = e.parameter.columna;
      data.valor = e.parameter.valor;
      data.origen = e.parameter.origen;
      data.area = e.parameter.area;
      data.responsable = e.parameter.responsable;

      if (e.parameter.valores) {
        try { data.valores = JSON.parse(e.parameter.valores); } catch (ex) { data.valores = [e.parameter.valores]; }
      }
      if (e.parameter.filas) {
        try { data.filas = JSON.parse(e.parameter.filas); } catch (ex) { data.filas = []; }
      }
      if (e.parameter.datos) {
        try { data.datos = JSON.parse(e.parameter.datos); } catch (ex) { data.datos = {}; }
      }
      if (e.parameter.celdas) {
        try { data.celdas = JSON.parse(e.parameter.celdas); } catch (ex) { data.celdas = []; }
      }
    }

    console.log('Accion:', data.accion || 'NINGUNA');

    if (!data.accion) {
      return crearRespuesta({ success: false, error: 'No se recibio accion' });
    }

    const nombreHoja = data.hoja || 'AGOSTO';

    switch (data.accion) {
      // ========== ESCRITURA DE CELDAS ==========
      case 'guardarCelda':
        return crearRespuesta(guardarCelda(data, nombreHoja));
      case 'guardarLote':
        return crearRespuesta(guardarLoteTurnos(data, nombreHoja));
      case 'guardarIndividual':
        return crearRespuesta(guardarIndividual(data, nombreHoja));
      case 'guardarLoteCeldas':
        return crearRespuesta(guardarLoteCeldas(data, nombreHoja));

      // ========== ACCIONES GENERICAS (para FastAPI) ==========
      case 'appendRow':
        return crearRespuesta(appendRowAction(data));
      case 'updateCell':
        return crearRespuesta(updateCellAction(data));
      case 'updateRange':
        return crearRespuesta(updateRangeAction(data));
      case 'deleteRow':
        return crearRespuesta(deleteRowAction(data));

      // ========== GESTION DE USUARIOS ==========
      case 'admin_crearUsuario':
        return crearRespuesta(adminCrearUsuario(data));
      case 'admin_actualizarUsuario':
        return crearRespuesta(adminActualizarUsuario(data));
      case 'admin_resetearPassword':
        return crearRespuesta(adminResetearPassword(data));
      case 'admin_toggleActivo':
        return crearRespuesta(adminToggleActivo(data));
      case 'admin_obtenerUsuarios':
        return crearRespuesta(adminObtenerUsuarios(data));
      case 'admin_obtenerAreas':
        return crearRespuesta(adminObtenerAreas(data));

      // ========== USUARIO ==========
      case 'cambiarPassword':
        return crearRespuesta(cambiarPasswordAction(data));

      // ========== DESCANSOS MEDICOS ==========
      case 'registrarDescansoMedico':
        return crearRespuesta(registrarDescansoMedico(data));

      // ========== VACACIONES ==========
      case 'registrarVacaciones':
        return crearRespuesta(registrarVacaciones(data));

      // ========== ESTADOS (BLOQUEOS) ==========
      case 'marcarFinalizado':
        return crearRespuesta(marcarFinalizado(data));
      case 'desmarcarFinalizado':
        return crearRespuesta(desmarcarFinalizado(data));
      case 'marcarLoteFinalizado':
        return crearRespuesta(marcarLoteFinalizado(data));
      case 'desmarcarLoteFinalizado':
        return crearRespuesta(desmarcarLoteFinalizado(data));

      // ========== CONFIGURACION ==========
      case 'guardarConfigGlobal':
        return crearRespuesta(guardarConfiguracionGlobal(data));
      case 'inicializarEstructura':
        return crearRespuesta(inicializarEstructura(data));

      // ========== SOLICITUDES DE CAMBIO ==========
      case 'registrarSolicitudCambio':
        return crearRespuesta(registrarSolicitudCambio(data));
      case 'actualizarSolicitudCambio':
        return crearRespuesta(actualizarSolicitudCambio(data));

      default:
        return crearRespuesta({ success: false, error: 'Accion no reconocida: ' + data.accion });
    }

  } catch (error) {
    console.error('Error en doPost:', error.toString());
    return crearRespuesta({ success: false, error: 'Error del servidor: ' + error.toString() });
  }
}

// ============================================
// MANEJADOR GET
// ============================================
function doGet(e) {
  return crearRespuesta({
    status: 'activo',
    timestamp: new Date().toISOString(),
    version: '12.1-FASTAPI-PROXY',
    hojasDisponibles: SpreadsheetApp.getActiveSpreadsheet().getSheets().map(s => s.getName())
  });
}

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function crearRespuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// ACCIONES GENERICAS (para FastAPI)
// ============================================

function appendRowAction(data) {
  var sheetName = data.hoja;
  var valores = data.valores;
  if (!sheetName || !valores || !Array.isArray(valores)) {
    return { success: false, error: 'hoja y valores requeridos' };
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Hoja no encontrada: ' + sheetName };
  sheet.appendRow(valores);
  return { success: true, message: 'Fila agregada a ' + sheetName };
}

function updateCellAction(data) {
  var sheetName = data.hoja;
  var celda = data.celda;
  var valor = data.valor;
  if (!sheetName || !celda) {
    return { success: false, error: 'hoja y celda requeridos' };
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Hoja no encontrada: ' + sheetName };
  sheet.getRange(celda).setValue(valor || '');
  return { success: true, celda: celda, valor: valor };
}

function updateRangeAction(data) {
  var sheetName = data.hoja;
  var rango = data.rango;
  var valores = data.valores;
  if (!sheetName || !rango || !valores) {
    return { success: false, error: 'hoja, rango y valores requeridos' };
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Hoja no encontrada: ' + sheetName };
  sheet.getRange(rango).setValues(valores);
  return { success: true, rango: rango };
}

function deleteRowAction(data) {
  var sheetName = data.hoja;
  var fila = parseInt(data.fila);
  if (!sheetName || !fila || fila < 1) {
    return { success: false, error: 'hoja y fila validos requeridos' };
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Hoja no encontrada: ' + sheetName };
  sheet.deleteRow(fila);
  return { success: true, fila: fila };
}

// ============================================
// GESTION DE USUARIOS
// ============================================

function adminCrearUsuario(data) {
  try {
    var datos = data.datos || data;
    var nombre = String(datos.nombre || '').trim();
    var usuario = String(datos.usuario || '').trim();
    var password = String(datos.password || '').trim();
    var email = String(datos.email || '').trim();
    var rol = String(datos.rol || '0').trim();
    var areas = datos.areas || [];
    var activo = datos.activo !== false;

    if (!nombre || !usuario || !password) {
      return { success: false, error: 'Nombre, usuario y password requeridos' };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.USUARIOS);
    if (!sheet) return { success: false, error: 'Hoja USUARIOS_OCR no encontrada' };

    // Verificar si el usuario ya existe
    var dataSheet = sheet.getDataRange().getValues();
    for (var i = 1; i < dataSheet.length; i++) {
      if (dataSheet[i][3] === usuario) {
        return { success: false, error: 'El usuario ya existe' };
      }
    }

    // Generar ID unico
    var maxId = 0;
    for (var i = 1; i < dataSheet.length; i++) {
      var v = Number(dataSheet[i][0]);
      if (!isNaN(v) && v > maxId) maxId = v;
    }
    var userId = maxId + 1;

    // Generar salt y hash (SHA-256 compatible con FastAPI)
    // IMPORTANTE: Utilities.computeDigest retorna bytes firmados (-128..127)
    // Hay que convertir a unsigned (0..255) con (b + 256) % 256
    var salt = Utilities.getUuid();
    var hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password + salt,
      Utilities.Charset.UTF_8
    );
    var hashHex = hash.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');

    sheet.appendRow([
      userId,
      nombre,
      email || '',
      usuario,
      hashHex,
      salt,
      rol,
      JSON.stringify(Array.isArray(areas) ? areas : []),
      new Date().toISOString(),
      '',
      0,
      '',
      activo ? 'TRUE' : 'FALSE',
      'TRUE'
    ]);

    return { success: true, message: 'Usuario creado', userId: userId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function adminActualizarUsuario(data) {
  try {
    var datos = data.datos || data;
    var id = datos.id || datos.usuario;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.USUARIOS);
    if (!sheet) return { success: false, error: 'Hoja USUARIOS_OCR no encontrada' };

    var dataSheet = sheet.getDataRange().getValues();
    var idx = -1;
    for (var i = 1; i < dataSheet.length; i++) {
      if (String(dataSheet[i][0]) === String(id) || String(dataSheet[i][3]) === String(id)) {
        idx = i; break;
      }
    }
    if (idx === -1) return { success: false, error: 'Usuario no encontrado' };

    if (datos.nombre) sheet.getRange(idx + 1, 2).setValue(datos.nombre);
    if (datos.email !== undefined) sheet.getRange(idx + 1, 3).setValue(datos.email);
    if (datos.rol !== undefined) sheet.getRange(idx + 1, 7).setValue(datos.rol);
    if (datos.areas !== undefined) sheet.getRange(idx + 1, 8).setValue(JSON.stringify(datos.areas));
    if (datos.activo !== undefined) sheet.getRange(idx + 1, 13).setValue(datos.activo ? 'TRUE' : 'FALSE');

    return { success: true, message: 'Usuario actualizado' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function adminResetearPassword(data) {
  try {
    var datos = data.datos || data;
    var usuario_id = datos.usuario_id || datos.usuario;
    var password = String(datos.password || '').trim();

    if (!usuario_id) return { success: false, error: 'ID de usuario requerido' };
    if (!password || password.length < 6) return { success: false, error: 'Password minimo 6 caracteres' };

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.USUARIOS);
    if (!sheet) return { success: false, error: 'Hoja USUARIOS_OCR no encontrada' };

    var dataSheet = sheet.getDataRange().getValues();
    var idx = -1;
    for (var i = 1; i < dataSheet.length; i++) {
      if (String(dataSheet[i][0]) === String(usuario_id) || String(dataSheet[i][3]) === String(usuario_id)) {
        idx = i; break;
      }
    }
    if (idx === -1) return { success: false, error: 'Usuario no encontrado' };

    var newSalt = Utilities.getUuid();
    var hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password + newSalt,
      Utilities.Charset.UTF_8
    );
    var hashHex = hash.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');

    sheet.getRange(idx + 1, 5).setValue(hashHex);
    sheet.getRange(idx + 1, 6).setValue(newSalt);
    sheet.getRange(idx + 1, 14).setValue('FALSE');

    return { success: true, message: 'Password restablecido' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function adminToggleActivo(data) {
  try {
    var datos = data.datos || data;
    var usuario_id = datos.usuario_id || datos.usuario;
    var activo = datos.activo;

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.USUARIOS);
    if (!sheet) return { success: false, error: 'Hoja USUARIOS_OCR no encontrada' };

    var dataSheet = sheet.getDataRange().getValues();
    var idx = -1;
    for (var i = 1; i < dataSheet.length; i++) {
      if (String(dataSheet[i][0]) === String(usuario_id) || String(dataSheet[i][3]) === String(usuario_id)) {
        idx = i; break;
      }
    }
    if (idx === -1) return { success: false, error: 'Usuario no encontrado' };

    sheet.getRange(idx + 1, 13).setValue(activo ? 'TRUE' : 'FALSE');
    return { success: true, message: 'Estado actualizado' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function adminObtenerUsuarios(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.USUARIOS);
    if (!sheet) return { success: true, usuarios: [] };

    var dataSheet = sheet.getDataRange().getValues();
    var usuarios = [];
    for (var i = 1; i < dataSheet.length; i++) {
      var row = dataSheet[i];
      usuarios.push({
        id: row[0],
        nombre: row[1],
        email: row[2],
        usuario: row[3],
        rol: row[6],
        areas: JSON.parse(row[7] || '[]'),
        activo: row[12] === 'TRUE',
        requiere_cambio: row[13] === 'TRUE',
        ultimo_acceso: row[9]
      });
    }
    return { success: true, usuarios: usuarios };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function adminObtenerAreas(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.AREAS);
    if (!sheet) return { success: true, areas: [] };

    var dataSheet = sheet.getDataRange().getValues();
    var areas = [];
    for (var i = 1; i < dataSheet.length; i++) {
      if (dataSheet[i][5] !== 'FALSE') {
        areas.push({
          id: dataSheet[i][0],
          nombre: dataSheet[i][1],
          codigo: dataSheet[i][2] || '',
          tipo: dataSheet[i][3] || 'area',
          padre_id: dataSheet[i][4] || ''
        });
      }
    }
    return { success: true, areas: areas };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function cambiarPasswordAction(data) {
  try {
    var usuario_id = data.usuario_id;
    var password_actual = String(data.password_actual || '').trim();
    var password_nueva = String(data.password_nueva || '').trim();

    if (!usuario_id || !password_actual || !password_nueva) {
      return { success: false, error: 'usuario_id, password_actual y password_nueva requeridos' };
    }
    if (password_nueva.length < 6) {
      return { success: false, error: 'La nueva password debe tener al menos 6 caracteres' };
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.USUARIOS);
    if (!sheet) return { success: false, error: 'Hoja USUARIOS_OCR no encontrada' };

    var dataSheet = sheet.getDataRange().getValues();
    var idx = -1;
    for (var i = 1; i < dataSheet.length; i++) {
      if (String(dataSheet[i][0]) === String(usuario_id)) { idx = i; break; }
    }
    if (idx === -1) return { success: false, error: 'Usuario no encontrado' };

    // Verificar password actual
    var storedHash = String(dataSheet[idx][4]);
    var storedSalt = String(dataSheet[idx][5]);
    var checkHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password_actual + storedSalt,
      Utilities.Charset.UTF_8
    );
    var checkHex = checkHash.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');

    if (checkHex !== storedHash) {
      return { success: false, error: 'Password actual incorrecta' };
    }

    // Generar nueva password
    var newSalt = Utilities.getUuid();
    var newHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password_nueva + newSalt,
      Utilities.Charset.UTF_8
    );
    var newHex = newHash.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');

    sheet.getRange(idx + 1, 5).setValue(newHex);
    sheet.getRange(idx + 1, 6).setValue(newSalt);
    sheet.getRange(idx + 1, 14).setValue('FALSE');

    return { success: true, message: 'Password actualizada correctamente' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// CELDAS - HOJA DEL MES
// ============================================

function registrarEnCambios(datos) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName('CAMBIOS');

    if (!logSheet) {
      logSheet = ss.insertSheet('CAMBIOS');
      logSheet.getRange('A1:I1').setValues([[
        'FECHA', 'HORA', 'RESPONSABLE', 'TRABAJADOR', 'DIA',
        'TURNO_ANTERIOR', 'TURNO_NUEVO', 'TIPO', 'AREA'
      ]]);
      logSheet.getRange('A1:I1').setFontWeight('bold').setBackground('#1E3A5F').setFontColor('#FFFFFF');
      logSheet.setFrozenRows(1);
    }

    logSheet.appendRow([
      datos.fecha || new Date(),
      datos.hora || new Date().toTimeString().split(' ')[0],
      datos.responsable || 'ADMIN',
      datos.trabajador || '',
      datos.dia || '',
      datos.turnoAnterior || '',
      datos.turnoNuevo || '',
      datos.tipo || 'CAMBIO_OFICIAL',
      datos.area || ''
    ]);
  } catch (error) {
    console.error('Error al registrar en CAMBIOS:', error.toString());
  }
}

function guardarCelda(data, nombreHoja) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(1000)) return { success: false, error: 'Lock no disponible, intente de nuevo' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(nombreHoja);
    if (!sheet) throw new Error('Hoja no encontrada: ' + nombreHoja);

    var fila = parseInt(data.fila);
    var columna = data.columna || 'F';
    var valorNuevo = String(data.valor || '');
    if (!fila || fila < 2) throw new Error('Numero de fila invalido: ' + fila);

    var celda = columna + fila;
    var grado = String(sheet.getRange('B' + fila).getValue() || '').trim();
    var nombre = String(sheet.getRange('C' + fila).getValue() || '').trim();
    var area = String(sheet.getRange('D' + fila).getValue() || data.area || '').trim();
    var valorActual = String(sheet.getRange(celda).getValue() || '');

    if (valorActual !== valorNuevo) {
      sheet.getRange(celda).setValue(valorNuevo);

      if (data.origen === 'modalCambioTurno') {
        var ahora = new Date();
        var numDia = columnaAIndice(columna) - 4;
        registrarEnCambios({
          fecha: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
          hora: ahora.toTimeString().split(' ')[0],
          responsable: data.responsable || 'ADMIN',
          trabajador: grado + ' ' + nombre,
          dia: numDia,
          turnoAnterior: valorActual || 'SIN ASIGNAR',
          turnoNuevo: valorNuevo || 'SIN ASIGNAR',
          tipo: 'CAMBIO_MANUAL_MODAL',
          area: area
        });
      }
    }

    return { success: true, celda: celda, valor: valorNuevo, anterior: valorActual, cambiado: valorActual !== valorNuevo };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function guardarLoteTurnos(data, nombreHoja) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(3000)) return { success: false, error: 'Lock no disponible, intente de nuevo' };
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
    if (!sheet) throw new Error('Hoja no encontrada: ' + nombreHoja);

    var filas = data.filas;
    if (typeof filas === 'string') { try { filas = JSON.parse(filas); } catch (e) { throw new Error('No se pudo parsear filas'); } }
    if (!filas || !Array.isArray(filas) || filas.length === 0) return { success: false, error: 'No se recibieron filas' };

    var filasActualizadas = 0;
    var errores = [];
    filas.forEach(function(filaData) {
      try {
        var numFila = parseInt(filaData.fila);
        if (!numFila || numFila < 2) return;
        if (filaData.area) sheet.getRange('D' + numFila).setValue(filaData.area);
        if (filaData.valores && Array.isArray(filaData.valores)) {
          var valoresLimpios = filaData.valores.map(function(v) { return (v === undefined || v === null || v === false) ? '' : String(v).trim(); });
          sheet.getRange(numFila, 6, 1, valoresLimpios.length).setValues([valoresLimpios]);
          filasActualizadas++;
        }
      } catch (errorFila) { errores.push({ fila: filaData.fila, error: errorFila.toString() }); }
    });

    return { success: true, filasProcesadas: filasActualizadas, totalFilas: filas.length, errores: errores };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function guardarIndividual(data, nombreHoja) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(1000)) return { success: false, error: 'Lock no disponible, intente de nuevo' };
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
    if (!sheet) throw new Error('Hoja no encontrada: ' + nombreHoja);

    var fila = parseInt(data.fila);
    var colInicio = data.colInicio || 'F';
    var valores = data.valores;
    if (typeof valores === 'string') { try { valores = JSON.parse(valores); } catch (e) { valores = [valores]; } }
    if (!Array.isArray(valores)) valores = [valores];

    var valoresLimpios = valores.map(function(v) { return (v === undefined || v === null || v === false) ? '' : String(v); });
    if (valoresLimpios.length === 1) {
      sheet.getRange(colInicio + fila).setValue(valoresLimpios[0]);
    } else {
      var colFin = columnaFin(colInicio, valoresLimpios.length);
      sheet.getRange(colInicio + fila + ':' + colFin + fila).setValues([valoresLimpios]);
    }
    return { success: true, celda: colInicio + fila };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function guardarLoteCeldas(data, nombreHoja) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(2000)) return { success: false, error: 'Lock no disponible, intente de nuevo' };
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
    if (!sheet) throw new Error('Hoja no encontrada: ' + nombreHoja);

    var celdas = data.celdas || [];
    if (!Array.isArray(celdas) || celdas.length === 0) return { success: false, error: 'No se recibieron celdas' };

    var actualizadas = 0;
    celdas.forEach(function(celdaData) {
      var fila = parseInt(celdaData.fila);
      var columna = celdaData.columna;
      if (!fila || fila < 2 || !columna) return;
      sheet.getRange(columna + fila).setValue(String(celdaData.valor || ''));
      actualizadas++;
    });
    return { success: true, actualizadas: actualizadas };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// DESCANSOS MEDICOS
// ============================================

function registrarDescansoMedico(data) {
  try {
    var datos = data.datos || data;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DESCANSOS_MEDICOS');
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('DESCANSOS_MEDICOS');
      sheet.getRange('A1:P1').setValues([[
        'FECHA_REGISTRO', 'PERSONAL_NOMBRE', 'PERSONAL_GRADO', 'PERSONAL_DNI',
        'PERSONAL_AREA', 'MEDICO_NOMBRE', 'MEDICO_ESPECIALIDAD',
        'FECHA_INICIO', 'FECHA_FIN', 'DIAS_DESCANSO', 'DIAGNOSTICO',
        'OBSERVACIONES', 'HOJA_ROL', 'FILA_ROL', 'DIAS_MARCADOS', 'REGISTRADO_POR'
      ]]);
      sheet.getRange('A1:P1').setFontWeight('bold').setBackground('#059669').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      datos.fecha_registro || new Date().toISOString(),
      datos.personal_nombre || '', datos.personal_grado || '',
      datos.personal_dni || '', datos.area || datos.personal_area || '',
      datos.medico_nombre || '', datos.medico_especialidad || '',
      datos.fecha_inicio || '', datos.fecha_fin || '',
      datos.dias_descanso || 0, datos.diagnostico || '',
      datos.observaciones || '', datos.hoja_rol || '',
      datos.fila_rol || '', datos.dias_marcados || '',
      datos.registrado_por || 'Sistema PNP'
    ]);
    return { success: true, mensaje: 'Descanso medico registrado' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// VACACIONES
// ============================================

function registrarVacaciones(data) {
  try {
    var datos = data.datos || data;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('VACACIONES');
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('VACACIONES');
      sheet.getRange('A1:K1').setValues([[
        'FECHA_REGISTRO', 'PERSONAL_NOMBRE', 'PERSONAL_GRADO', 'PERSONAL_DNI',
        'PERSONAL_AREA', 'FECHA_INICIO', 'FECHA_FIN', 'DIAS_VACACIONES',
        'OBSERVACIONES', 'HOJA_ROL', 'REGISTRADO_POR'
      ]]);
      sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#2563EB').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      datos.fecha_registro || new Date().toISOString(),
      datos.personal_nombre || '', datos.personal_grado || '',
      datos.personal_dni || '', datos.personal_area || '',
      datos.fecha_inicio || '', datos.fecha_fin || '',
      datos.dias_vacaciones || 0, datos.observaciones || '',
      datos.hoja_rol || '', datos.registrado_por || 'Sistema PNP'
    ]);
    return { success: true, mensaje: 'Vacaciones registradas' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// CONFIGURACION
// ============================================

function guardarConfiguracionGlobal(data) {
  try {
    var hojaConfig = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
    if (!hojaConfig) {
      hojaConfig = SpreadsheetApp.getActiveSpreadsheet().insertSheet('CONFIG');
      hojaConfig.getRange('A1:E1').setValues([['hojaActiva', 'mes', 'anio', 'actualizadoPor', 'timestamp']]);
    }
    var v = data.valores || data;
    hojaConfig.getRange('A2:E2').setValues([[
      v.hojaActiva || 'AGOSTO', v.mes || new Date().getMonth() + 1,
      v.anio || new Date().getFullYear(), v.actualizadoPor || 'Sistema',
      v.timestamp || new Date().toISOString()
    ]]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// ESTADOS
// ============================================

function __obtenerHojaEstados_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ESTADOS');
  if (!sheet) {
    sheet = ss.insertSheet('ESTADOS');
    sheet.getRange('A1:C1').setValues([['MES', 'AREA', 'ESTADO']]);
    sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#1E3A5F').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    return sheet;
  }

  var datos = sheet.getDataRange().getValues();
  var cabecera = (datos[0] || []);
  var formatoNuevo = String(cabecera[0] || '').trim().toUpperCase() === 'MES';
  if (formatoNuevo) { sheet.getRange('A1:C1').setValues([['MES', 'AREA', 'ESTADO']]); return sheet; }

  var mesActivo;
  try { var cfg = ss.getSheetByName('CONFIG'); if (cfg) mesActivo = String(cfg.getRange('A2').getValue() || 'AGOSTO').trim(); } catch (e) {}
  if (!mesActivo) mesActivo = 'AGOSTO';

  var filas = [];
  for (var i = 1; i < datos.length; i++) {
    var area = String(datos[i][0] || '').trim();
    var estado = String(datos[i][1] || '').trim();
    if (!area || !estado) continue;
    filas.push([mesActivo, area, estado]);
  }
  sheet.clearContents();
  sheet.getRange('A1:C1').setValues([['MES', 'AREA', 'ESTADO']]);
  sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#1E3A5F').setFontColor('#FFFFFF');
  if (filas.length > 0) sheet.getRange(2, 1, filas.length, 3).setValues(filas);
  sheet.setFrozenRows(1);
  return sheet;
}

function __setEstadoArea_(mes, area, estado) {
  var sheet = __obtenerHojaEstados_();
  var datos = sheet.getDataRange().getValues();
  var encontrado = false;
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0] || '').trim() === mes && String(datos[i][1] || '').trim() === area) {
      sheet.getRange(i + 1, 3).setValue(estado);
      encontrado = true;
      break;
    }
  }
  if (!encontrado) sheet.appendRow([mes, area, estado]);
  return true;
}

function marcarFinalizado(data) {
  try {
    var mes = String(data.mes || data.hoja || 'AGOSTO');
    var area = String(data.area || '');
    __setEstadoArea_(mes, area, 'FINALIZADO');
    return { success: true, mes: mes, area: area, estado: 'FINALIZADO' };
  } catch (error) { return { success: false, error: error.toString() }; }
}

function desmarcarFinalizado(data) {
  try {
    var mes = String(data.mes || data.hoja || 'AGOSTO');
    var area = String(data.area || '');
    __setEstadoArea_(mes, area, 'DISPONIBLE');
    return { success: true, mes: mes, area: area, estado: 'DISPONIBLE' };
  } catch (error) { return { success: false, error: error.toString() }; }
}

function marcarLoteFinalizado(data) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(3000)) return { success: false, error: 'Lock no disponible, intente de nuevo' };
    var mes = String(data.mes || data.hoja || 'AGOSTO');
    var areas = Array.isArray(data.areas) ? data.areas : [];
    var actualizadas = 0;
    areas.forEach(function(a) {
      var nombre = String(a || '').trim();
      if (!nombre) return;
      __setEstadoArea_(mes, nombre, 'FINALIZADO');
      actualizadas++;
    });
    return { success: true, mes: mes, actualizadas: actualizadas, estado: 'FINALIZADO' };
  } catch (error) { return { success: false, error: error.toString() }; }
  finally { lock.releaseLock(); }
}

function desmarcarLoteFinalizado(data) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(3000)) return { success: false, error: 'Lock no disponible, intente de nuevo' };
    var mes = String(data.mes || data.hoja || 'AGOSTO');
    var areas = Array.isArray(data.areas) ? data.areas : [];
    var actualizadas = 0;
    areas.forEach(function(a) {
      var nombre = String(a || '').trim();
      if (!nombre) return;
      __setEstadoArea_(mes, nombre, 'DISPONIBLE');
      actualizadas++;
    });
    return { success: true, mes: mes, actualizadas: actualizadas, estado: 'DISPONIBLE' };
  } catch (error) { return { success: false, error: error.toString() }; }
  finally { lock.releaseLock(); }
}

function inicializarEstructura(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    __obtenerHojaEstados_();

    var hojaConfig = ss.getSheetByName('CONFIG');
    if (!hojaConfig) {
      hojaConfig = ss.insertSheet('CONFIG');
      hojaConfig.getRange('A1:E1').setValues([['hojaActiva', 'mes', 'anio', 'actualizadoPor', 'timestamp']]);
    }
    var v = (data && (data.valores || data)) || {};
    if (v.hojaActiva) {
      hojaConfig.getRange('A2:E2').setValues([[
        v.hojaActiva || 'AGOSTO', v.mes || new Date().getMonth() + 1,
        v.anio || new Date().getFullYear(), v.actualizadoPor || 'Sistema',
        v.timestamp || new Date().toISOString()
      ]]);
    }

    __crearHojaSolicitudes_();

    if (!ss.getSheetByName('CAMBIOS')) {
      var cambios = ss.insertSheet('CAMBIOS');
      cambios.getRange('A1:I1').setValues([['FECHA','HORA','RESPONSABLE','TRABAJADOR','DIA','TURNO_ANTERIOR','TURNO_NUEVO','TIPO','AREA']]);
      cambios.getRange('A1:I1').setFontWeight('bold').setBackground('#1E3A5F').setFontColor('#FFFFFF');
      cambios.setFrozenRows(1);
    }
    if (!ss.getSheetByName('DESCANSOS_MEDICOS')) {
      var descansos = ss.insertSheet('DESCANSOS_MEDICOS');
      descansos.getRange('A1:P1').setValues([['FECHA_REGISTRO','PERSONAL_NOMBRE','PERSONAL_GRADO','PERSONAL_DNI','PERSONAL_AREA','MEDICO_NOMBRE','MEDICO_ESPECIALIDAD','FECHA_INICIO','FECHA_FIN','DIAS_DESCANSO','DIAGNOSTICO','OBSERVACIONES','HOJA_ROL','FILA_ROL','DIAS_MARCADOS','REGISTRADO_POR']]);
      descansos.getRange('A1:P1').setFontWeight('bold').setBackground('#059669').setFontColor('#FFFFFF');
      descansos.setFrozenRows(1);
    }
    if (!ss.getSheetByName('VACACIONES')) {
      var vacaciones = ss.insertSheet('VACACIONES');
      vacaciones.getRange('A1:K1').setValues([['FECHA_REGISTRO','PERSONAL_NOMBRE','PERSONAL_GRADO','PERSONAL_DNI','PERSONAL_AREA','FECHA_INICIO','FECHA_FIN','DIAS_VACACIONES','OBSERVACIONES','HOJA_ROL','REGISTRADO_POR']]);
      vacaciones.getRange('A1:K1').setFontWeight('bold').setBackground('#2563EB').setFontColor('#FFFFFF');
      vacaciones.setFrozenRows(1);
    }

    return { success: true, hojas: ss.getSheets().map(function(s) { return s.getName(); }) };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// SOLICITUDES DE CAMBIO
// ============================================

var __HEADER_SOLICITUDES_ = [
  'id', 'fecha_solicitud', 'solicitante', 'area_solicitante',
  'hoja', 'mes', 'anio', 'dias', 'tipo_cambio', 'motivo', 'pormenores',
  'estado', 'revisado_por', 'fecha_revision', 'observacion_revision',
  'p1_trabajador', 'p1_dni', 'p1_fila', 'p1_area',
  'p1_turno_actual', 'p1_turno_actual_nombre',
  'p1_turno_solicitado', 'p1_turno_solicitado_nombre',
  'p2_trabajador', 'p2_dni', 'p2_fila', 'p2_area',
  'p2_turno_actual', 'p2_turno_actual_nombre',
  'p2_turno_solicitado', 'p2_turno_solicitado_nombre',
  'detalle'
];

var __CODIGO_A_NOMBRE_ = {
  'M': 'MA\u00D1ANA', 'T': 'TARDE', 'F': 'FRANCO', 'MT': '12 HRS M',
  'N': '12 HRS N', 'FE': 'FERIADO', 'V': 'VACACIONES', 'FS': 'FALTO AL SERVICIO',
  'LG': 'LICENCIA DE GRAVIDEZ', 'DM': 'DESCANSO MEDICO', 'L12': 'LEY 12633',
  'H': 'HOSPITALIZADO', 'C': 'COMISION', 'PR': 'PERMISO DE RADIACION',
  'AVC': 'ADAPTACION A LA VIDA CIVIL', 'LEGF': 'LICENCIA ENFERMEDAD GRAVE FAMILIAR',
  'PCV': 'PERMISO A CUENTA DE VACACIONES', 'RL': 'REFERIDO A LIMA',
  'SL': 'SOMETIDO A LEY', '24': '24 X 48', 'SC': 'SERVICIO CONTINUO',
  'EXT': 'EXTERNO', 'R': 'RETEN', 'S': 'SERVICIO',
  'M/N': 'MA\u00D1ANA - 12 HRS N', 'T/N': 'TARDE - 12 HRS N', 'ADM': 'ADMINISTRATIVO',
  'LFC': 'LICENCIA FALLECIMIENTO CONYUGUE', 'PP': 'PAPELETA DE PERMISO',
  'COU': 'CAMBIADO OTRA UNIDAD', '24M': '24 HRS MTN', 'LP': 'LICENCIA POR PATERNIDAD',
  'PD': 'OFICIAL DE PERMANENCIA (DIURNO)', 'PN': 'OFICIAL DE PERMANENCIA (NOCTURNO)',
  'PM': 'OFICIAL DE PERMANENCIA (MA\u00D1ANA)', 'PT': 'OFICIAL DE PERMANENCIA (TARDE)'
};

function __crearHojaSolicitudes_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('SOLICITUDES_CAMBIOS');
  if (!hoja) {
    hoja = ss.insertSheet('SOLICITUDES_CAMBIOS');
    hoja.appendRow(__HEADER_SOLICITUDES_);
    hoja.getRange(1, 1, 1, __HEADER_SOLICITUDES_.length).setFontWeight('bold');
    return hoja;
  }
  var ultimaColumna = hoja.getLastColumn();
  if (ultimaColumna < __HEADER_SOLICITUDES_.length) {
    hoja.getRange(1, ultimaColumna + 1, 1, __HEADER_SOLICITUDES_.length - ultimaColumna)
      .setValues([__HEADER_SOLICITUDES_.slice(ultimaColumna)]);
  }
  return hoja;
}

function __valorCelda_(codigo) {
  codigo = String(codigo || '').trim();
  if (!codigo || codigo === 'S/T' || codigo === 'SIN TURNO') return '';
  return __CODIGO_A_NOMBRE_[codigo] || codigo;
}

function __codigosUnicos_(cambios, campo) {
  var vistos = {};
  var out = [];
  (cambios || []).forEach(function(c) {
    var v = String(c[campo] || '').trim();
    if (v && !vistos[v]) { vistos[v] = 1; out.push(v); }
  });
  return out.join(',');
}

function __filasParticipante_(d, i) {
  var p = (d.participantes && d.participantes[i]) || {};
  var cambios = p.cambios || [];
  var tieneCambios = cambios.length > 0;
  return [
    String(p.trabajador || p.nombre || '').trim(),
    String(p.dni || '').trim(),
    Number(p.fila) || 0,
    String(p.area || '').trim(),
    tieneCambios ? __codigosUnicos_(cambios, 'actual') : String(p.turno_actual || '').trim(),
    String(p.turno_actual_nombre || '').trim(),
    tieneCambios ? __codigosUnicos_(cambios, 'nuevo') : String(p.turno_solicitado || '').trim(),
    String(p.turno_solicitado_nombre || '').trim()
  ];
}

function __detalleJSON_(d) {
  return JSON.stringify({
    participantes: (d.participantes || []).map(function(p) {
      return {
        fila: Number(p.fila) || 0,
        trabajador: String(p.trabajador || '').trim(),
        area: String(p.area || '').trim(),
        cambios: (p.cambios || []).map(function(c) {
          return { dia: Number(c.dia) || 0, actual: String(c.actual || '').trim(), nuevo: String(c.nuevo || '').trim() };
        })
      };
    })
  });
}

function registrarSolicitudCambio(params) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(3000)) return { ok: false, error: 'Lock no disponible, intente de nuevo' };
    var d = params.datos || params;
    var hoja = __crearHojaSolicitudes_();
    var filas = hoja.getDataRange().getValues();
    var maxId = 0;
    for (var i = 1; i < filas.length; i++) {
      var v = Number(filas[i][0]);
      if (!isNaN(v) && v > maxId) maxId = v;
    }
    var nuevoId = maxId + 1;

    var dias = Array.isArray(d.dias) ? d.dias.join(',') : String(d.dias || '');
    var p1 = __filasParticipante_(d, 0);
    var p2 = __filasParticipante_(d, 1);

    hoja.appendRow([
      nuevoId, new Date().toISOString(),
      String(d.solicitante || ''), String(d.area_solicitante || ''),
      String(d.hoja || ''), Number(d.mes) || 0, Number(d.anio) || 0,
      dias,
      String(d.tipo_cambio || ''), String(d.motivo || ''), String(d.pormenores || ''),
      'PENDIENTE', '', '', '',
      p1[0], p1[1], p1[2], p1[3], p1[4], p1[5], p1[6], p1[7],
      p2[0], p2[1], p2[2], p2[3], p2[4], p2[5], p2[6], p2[7],
      __detalleJSON_(d)
    ]);

    return { ok: true, id: nuevoId };
  } catch (e) {
    return { ok: false, error: String(e) };
  } finally {
    lock.releaseLock();
  }
}

function __aplicarDetalleMes_(ss, hojaMes, detalle, responsable) {
  if (!hojaMes || !detalle) return;
  var sh = ss.getSheetByName(hojaMes);
  if (!sh) return;
  var obj;
  try { obj = JSON.parse(detalle); } catch (e) { return; }
  var ultimaFila = sh.getMaxRows();

  (obj.participantes || []).forEach(function(p) {
    var filaNum = Number(p.fila);
    if (!filaNum || filaNum < 1 || filaNum > ultimaFila) return;

    var grado = String(sh.getRange('B' + filaNum).getValue() || '').trim();
    var nombre = String(sh.getRange('C' + filaNum).getValue() || '').trim();
    var trabajador = grado + ' ' + nombre;
    var area = String(p.area || sh.getRange('D' + filaNum).getValue() || '').trim();

    (p.cambios || []).forEach(function(c) {
      var dia = Number(c.dia);
      if (!dia || dia < 1 || dia > 31) return;
      var valorNuevo = __valorCelda_(c.nuevo);
      var actual = String(c.actual || '').trim();
      var actualNombre = actual ? (__CODIGO_A_NOMBRE_[actual] || actual) : 'SIN ASIGNAR';

      sh.getRange(filaNum, 5 + dia).setValue(valorNuevo);
      registrarEnCambios({
        fecha: new Date(),
        hora: new Date().toTimeString().split(' ')[0],
        responsable: responsable || 'ADMIN',
        trabajador: trabajador,
        dia: dia,
        turnoAnterior: actualNombre,
        turnoNuevo: valorNuevo || 'SIN ASIGNAR',
        tipo: 'SOLICITUD_APROBADA',
        area: area
      });
    });
  });
}

function actualizarSolicitudCambio(params) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(3000)) return { ok: false, error: 'Lock no disponible, intente de nuevo' };
    var id = String(params.id || '').trim();
    var estado = String(params.estado || 'PENDIENTE').toUpperCase();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName('SOLICITUDES_CAMBIOS');
    if (!hoja) return { ok: false, error: 'Hoja SOLICITUDES_CAMBIOS no existe' };

    var rango = hoja.getDataRange();
    var filas = rango.getValues();
    var idx = -1;
    for (var i = 1; i < filas.length; i++) {
      if (String(filas[i][0]).trim() === id) { idx = i; break; }
    }
    if (idx === -1) return { ok: false, error: 'Solicitud no encontrada: ' + id };

    var fila = filas[idx];
    fila[11] = estado;
    fila[12] = String(params.revisadoPor || 'ADMIN');
    fila[13] = new Date().toISOString();
    fila[14] = String(params.observacion || '');

    if (estado === 'APROBADO') {
      var hojaMes = String(fila[4] || '');
      var detalle = fila.length > 31 ? String(fila[31] || '') : '';
      if (detalle) __aplicarDetalleMes_(ss, hojaMes, detalle, String(params.revisadoPor || 'ADMIN'));
    }

    hoja.getRange(idx + 1, 1, 1, fila.length).setValues([fila]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function columnaFin(inicio, cantidad) {
  var idxInicio = columnaAIndice(inicio);
  return indiceAColumna(idxInicio + cantidad - 1);
}

function columnaAIndice(columna) {
  columna = columna.toUpperCase();
  var indice = 0;
  for (var i = 0; i < columna.length; i++) {
    indice = indice * 26 + (columna.charCodeAt(i) - 64);
  }
  return indice - 1;
}

function indiceAColumna(indice) {
  var letra = '';
  var n = indice;
  while (n >= 0) {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
    n = Math.floor(n / 26) - 1;
  }
  return letra;
}
