// Google Apps Script - MESA DE PARTES HRPA
// VERSION 3.2 - 14 COLUMNAS + ESTADOS
// Columnas: A(N°) B(FECHA) C(TIPO DOC) D(N° DOC ORIGEN) E(FECHA DOC)
//           F(PROCEDENCIA) G(CONTENIDO) H(ESTADO) I(DOC TRAMITE)
//           J(N° DOC TRAMITADO) K(AREA ENTREGADA) L(DESCARGO) M(N° DESCARGO) N(HT)
// PENDIENTE (default) → ENTREGADO → RESUELTO

function doPost(e) {
  try {
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(ex) {}
    }
    if (!data.accion && e && e.parameter) {
      data.accion = e.parameter.accion;
      data.fecha = e.parameter.fecha;
      data.tipoDoc = e.parameter.tipoDoc;
      data.nDocOrigen = e.parameter.nDocOrigen;
      data.fechaDoc = e.parameter.fechaDoc;
      data.procedencia = e.parameter.procedencia;
      data.contenido = e.parameter.contenido;
      data.docTramite = e.parameter.docTramite;
      data.nDocTramitado = e.parameter.nDocTramitado;
      data.areaEntregada = e.parameter.areaEntregada;
      data.descargo = e.parameter.descargo;
      data.nDescargo = e.parameter.nDescargo;
      data.ht = e.parameter.ht;
      data.estado = e.parameter.estado;
      data.fila = e.parameter.fila;
    }
    if (!data.accion) return crearRespuesta({ success: false, error: 'Accion requerida' });
    
    switch(data.accion) {
      case 'registrar': return crearRespuesta(registrarDocumento(data));
      case 'listar': return crearRespuesta(listarDocumentos());
      case 'actualizar': return crearRespuesta(actualizarDocumento(data));
      case 'entregar': return crearRespuesta(entregarDocumento(data));
      case 'descargar': return crearRespuesta(descargarDocumento(data));
      case 'devolver': return crearRespuesta(devolverDocumento(data));
      case 'eliminar': return crearRespuesta(eliminarDocumento(data));
      default: return crearRespuesta({ success: false, error: 'Accion no reconocida' });
    }
  } catch(error) {
    return crearRespuesta({ success: false, error: error.toString() });
  }
}

function doGet(e) {
  return crearRespuesta({ status: 'activo', sistema: 'MESA_PARTES_HRPA', version: '3.2' });
}

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function crearRespuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// REGISTRAR - 14 columnas
// ============================================
function registrarDocumento(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('DOCUMENTOS');
    
    if (!sheet) {
      sheet = ss.insertSheet('DOCUMENTOS');
      sheet.getRange('A1:N1').setValues([[
        'N','FECHA','TIPO DOC.','N DOC. ORIGEN','FECHA DOC.',
        'PROCEDENCIA','CONTENIDO','ESTADO',
        'DOC. DE TRAMITE','N DOC. TRAMITADO','AREA ENTREGADA',
        'DESCARGO','N DESCARGO','HT'
      ]]);
      sheet.getRange('A1:N1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    SpreadsheetApp.flush();
    const lastRow = sheet.getLastRow();
    const num = lastRow;
    const row = lastRow + 1;
    
    sheet.getRange(row, 1, 1, 14).setValues([[
      num,
      data.fecha||'', data.tipoDoc||'', data.nDocOrigen||'', data.fechaDoc||'',
      data.procedencia||'', data.contenido||'',
      'PENDIENTE',
      '', '', '', '', '', ''
    ]]);
    
    SpreadsheetApp.flush();
    return { success: true, numero: num, fila: row };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================
// LISTAR - 14 columnas
// ============================================
function listarDocumentos() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DOCUMENTOS');
    if (!sheet) return { success: true, documentos: [], total: 0 };
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { success: true, documentos: [], total: 0 };
    const docs = rows.slice(1).map((r, i) => ({
      id: i + 2,
      numero: r[0]||'', fecha: r[1]||'', tipoDoc: r[2]||'',
      nDocOrigen: r[3]||'', fechaDoc: r[4]||'', procedencia: r[5]||'',
      contenido: r[6]||'', estado: r[7]||'PENDIENTE',
      docTramite: r[8]||'', nDocTramitado: r[9]||'', areaEntregada: r[10]||'',
      descargo: r[11]||'', nDescargo: r[12]||'', ht: r[13]||''
    }));
    return { success: true, documentos: docs, total: docs.length };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================
// ACTUALIZAR - Solo ETAPA 1 (columnas B-G)
// ============================================
function actualizarDocumento(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DOCUMENTOS');
    const fila = parseInt(data.fila);
    sheet.getRange(fila, 2, 1, 6).setValues([[
      data.fecha||'', data.tipoDoc||'', data.nDocOrigen||'', data.fechaDoc||'',
      data.procedencia||'', data.contenido||''
    ]]);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================
// ENTREGAR - Columnas H(8), I(9), J(10), K(11)
// ============================================
function entregarDocumento(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DOCUMENTOS');
    const fila = parseInt(data.fila);
    sheet.getRange(fila, 8).setValue('ENTREGADO');             // H = ESTADO
    sheet.getRange(fila, 9).setValue(data.docTramite||'');      // I = DOC TRAMITE
    sheet.getRange(fila, 10).setValue(data.nDocTramitado||'');  // J = N° DOC TRAMITADO
    sheet.getRange(fila, 11).setValue(data.areaEntregada||'');  // K = AREA ENTREGADA
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================
// DESCARGAR - Columnas H(8), L(12), M(13)
// ============================================
function descargarDocumento(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DOCUMENTOS');
    const fila = parseInt(data.fila);
    sheet.getRange(fila, 8).setValue('RESUELTO');              // H = ESTADO
    sheet.getRange(fila, 12).setValue(data.descargo||'');      // L = DESCARGO
    sheet.getRange(fila, 13).setValue(data.nDescargo||'');     // M = N° DESCARGO
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================
// DEVOLVER - ENTREGADO → PENDIENTE
// Clear columns I(9), J(10), K(11), N(14), set H(8)=PENDIENTE
// ============================================
function devolverDocumento(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DOCUMENTOS');
    const fila = parseInt(data.fila);
    sheet.getRange(fila, 8).setValue('PENDIENTE');    // H = ESTADO
    sheet.getRange(fila, 9).setValue('');              // I = DOC TRAMITE
    sheet.getRange(fila, 10).setValue('');             // J = N° DOC TRAMITADO
    sheet.getRange(fila, 11).setValue('');             // K = AREA ENTREGADA
    sheet.getRange(fila, 14).setValue('');             // N = HT
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================
// ELIMINAR - Search by N° (column A) and delete
// Safe: won't break other rows' IDs
// ============================================
function eliminarDocumento(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DOCUMENTOS');
    const numero = data.numero || data.fila;
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(numero)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'Documento no encontrado por N° ' + numero };
  } catch(e) { return { success: false, error: e.toString() }; }
}
