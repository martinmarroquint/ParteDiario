// Google Apps Script - MESA DE PARTES HRPA v4.0
// 3 HOJAS: DOCUMENTOS, DERIVACIONES, HISTORIAL
//
// DOCUMENTOS (14 cols):
//   A=ID B=NUMERO C=FECHA_REGISTRO D=TIPO_DOC E=N_DOC_ORIGEN
//   F=FECHA_DOC G=PROCEDENCIA H=ASUNTO I=CONTENIDO J=FUENTE
//   K=ESTADO L=CREADO_POR M=ESTADO_FINAL N=FECHA_CIERRE
//
// DERIVACIONES (14 cols):
//   A=ID B=DOCUMENTO_ID C=AREA_DESTINO D=PASE_NUMERO
//   E=DERIVADO_POR F=FECHA_DERIVACION G=RECIBIDO_POR
//   H=FECHA_RECEPCION I=ESTADO J=DEVUELTO_POR
//   K=FECHA_RESPUESTA L=DESCARGO M=N_DESCARGO N=HT
//
// HISTORIAL (9 cols):
//   A=ID B=DOCUMENTO_ID C=DERIVACION_ID D=ACCION
//   E=ESTADO_ANTERIOR F=ESTADO_NUEVO G=DETALLES
//   H=REALIZADO_POR I=FECHA

function doPost(e) {
  try {
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(ex) {}
    }
    if (!data.accion && e && e.parameter) {
      data = Object.assign(data, e.parameter);
    }
    if (!data.accion) return json({ success: false, error: 'Accion requerida' });

    switch(data.accion) {
      case 'registrar':       return json(registrar(data));
      case 'listar':          return json(listar(data));
      case 'obtener':         return json(obtener(data));
      case 'derivar':         return json(derivar(data));
      case 'recibir':         return json(recibir(data));
      case 'devolver':        return json(devolver(data));
      case 'tramitar':        return json(tramitar(data));
      case 'cerrar':          return json(cerrar(data));
      case 'eliminar':        return json(eliminar(data));
      case 'historial':       return json(historial(data));
      default:                return json({ success: false, error: 'Accion no reconocida: ' + data.accion });
    }
  } catch(error) {
    return json({ success: false, error: error.toString() });
  }
}

function doGet(e) {
  return json({ status: 'activo', sistema: 'MESA_PARTES_HRPA', version: '4.0' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// HELPER: Asegurar que las 3 hojas existen
// ============================================
function ensureSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let doc = ss.getSheetByName('DOCUMENTOS');
  if (!doc) {
    doc = ss.insertSheet('DOCUMENTOS');
    doc.getRange('A1:N1').setValues([['ID','NUMERO','FECHA_REGISTRO','TIPO_DOC','N_DOC_ORIGEN','FECHA_DOC','PROCEDENCIA','ASUNTO','CONTENIDO','FUENTE','ESTADO','CREADO_POR','ESTADO_FINAL','FECHA_CIERRE']]);
    doc.getRange('A1:N1').setFontWeight('bold').setBackground('#E8F5E9');
    doc.setFrozenRows(1);
  }

  let deriv = ss.getSheetByName('DERIVACIONES');
  if (!deriv) {
    deriv = ss.insertSheet('DERIVACIONES');
    deriv.getRange('A1:N1').setValues([['ID','DOCUMENTO_ID','AREA_DESTINO','PASE_NUMERO','DERIVADO_POR','FECHA_DERIVACION','RECIBIDO_POR','FECHA_RECEPCION','ESTADO','DEVUELTO_POR','FECHA_RESPUESTA','DESCARGO','N_DESCARGO','HT']]);
    deriv.getRange('A1:N1').setFontWeight('bold').setBackground('#E3F2FD');
    deriv.setFrozenRows(1);
  }

  let hist = ss.getSheetByName('HISTORIAL');
  if (!hist) {
    hist = ss.insertSheet('HISTORIAL');
    hist.getRange('A1:I1').setValues([['ID','DOCUMENTO_ID','DERIVACION_ID','ACCION','ESTADO_ANTERIOR','ESTADO_NUEVO','DETALLES','REALIZADO_POR','FECHA']]);
    hist.getRange('A1:I1').setFontWeight('bold').setBackground('#FFF3E0');
    hist.setFrozenRows(1);
  }

  return { doc, deriv, hist };
}

// ============================================
// HELPER: Timestamp actual (Argentina)
// ============================================
function now() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', "yyyy-MM-dd HH:mm:ss");
}

function today() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', "yyyy-MM-dd");
}

// ============================================
// HELPER: Siguiente ID para una hoja
// ============================================
function nextId(sheet) {
  const last = sheet.getLastRow();
  if (last <= 1) return 1;
  const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  let max = 0;
  for (let i = 0; i < ids.length; i++) {
    const v = parseInt(ids[i][0]);
    if (!isNaN(v) && v > max) max = v;
  }
  return max + 1;
}

// ============================================
// HELPER: Siguiente número de documento
// ============================================
function nextNumero(sheet) {
  const last = sheet.getLastRow();
  const year = new Date().getFullYear();
  if (last <= 1) return 'DOC-001/' + year;
  const nums = sheet.getRange(2, 2, last - 1, 1).getValues();
  let max = 0;
  for (let i = 0; i < nums.length; i++) {
    const m = String(nums[i][0]).match(/DOC-(\d+)\//);
    if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
  }
  return 'DOC-' + String(max + 1).padStart(3, '0') + '/' + year;
}

// ============================================
// HELPER: Siguiente número de pase
// ============================================
function nextPase(derivSheet) {
  const last = derivSheet.getLastRow();
  const year = new Date().getFullYear();
  if (last <= 1) return 'PASE-001/' + year;
  const pases = derivSheet.getRange(2, 4, last - 1, 1).getValues();
  let max = 0;
  for (let i = 0; i < pases.length; i++) {
    const m = String(pases[i][0]).match(/PASE-(\d+)\//);
    if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
  }
  return 'PASE-' + String(max + 1).padStart(3, '0') + '/' + year;
}

// ============================================
// REGISTRAR nuevo documento
// ============================================
function registrar(data) {
  const { doc, hist } = ensureSheets();
  const id = nextId(doc);
  const numero = nextNumero(doc);
  const ts = now();

  doc.getRange(id + 1, 1, 1, 14).setValues([[
    id, numero, ts,
    data.tipo_doc || '', data.n_doc_origen || '', data.fecha_doc || '',
    data.procedencia || '', data.asunto || '', data.contenido || '',
    data.fuente || 'fisico',
    'REGISTRADO', data.creado_por || '', '', ''
  ]]);

  // Historial
  const hid = nextId(hist);
  hist.getRange(hid + 1, 1, 1, 9).setValues([[
    hid, id, '',
    'REGISTRAR', '', 'REGISTRADO',
    JSON.stringify({ tipo_doc: data.tipo_doc, procedencia: data.procedencia, fuente: data.fuente }),
    data.creado_por || '', ts
  ]]);

  return { success: true, id: id, numero: numero, fecha_registro: ts };
}

// ============================================
// LISTAR documentos con sus derivaciones
// ============================================
function listar(data) {
  const { doc, deriv } = ensureSheets();

  // Leer documentos
  const docRows = doc.getDataRange().getValues();
  const documentos = [];
  if (docRows.length > 1) {
    for (let i = 1; i < docRows.length; i++) {
      const r = docRows[i];
      documentos.push({
        id: r[0], numero: r[1], fecha_registro: r[2],
        tipo_doc: r[3], n_doc_origen: r[4], fecha_doc: r[5],
        procedencia: r[6], asunto: r[7], contenido: r[8],
        fuente: r[9], estado: r[10], creado_por: r[11],
        estado_final: r[12], fecha_cierre: r[13],
        derivaciones: []
      });
    }
  }

  // Leer derivaciones y agrupar por documento
  const derivRows = deriv.getDataRange().getValues();
  if (derivRows.length > 1) {
    for (let i = 1; i < derivRows.length; i++) {
      const r = derivRows[i];
      const docId = r[1];
      const d = {
        id: r[0], documento_id: docId, area_destino: r[2],
        pase_numero: r[3], derivado_por: r[4], fecha_derivacion: r[5],
        recibido_por: r[6], fecha_recepcion: r[7], estado: r[8],
        devuelto_por: r[9], fecha_respuesta: r[10],
        descargo: r[11], n_descargo: r[12], ht: r[13]
      };
      const doc = documentos.find(x => x.id === docId);
      if (doc) doc.derivaciones.push(d);
    }
  }

  // Ordenar por ID descendente (más recientes primero)
  documentos.sort((a, b) => {
    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    return idB - idA;
  });

  return { success: true, documentos: documentos };
}

// ============================================
// OBTENER documento individual con derivaciones
// ============================================
function obtener(data) {
  const { doc, deriv } = ensureSheets();
  const id = parseInt(data.id);

  const docRows = doc.getDataRange().getValues();
  for (let i = 1; i < docRows.length; i++) {
    if (parseInt(docRows[i][0]) === id) {
      const r = docRows[i];
      const documento = {
        id: r[0], numero: r[1], fecha_registro: r[2],
        tipo_doc: r[3], n_doc_origen: r[4], fecha_doc: r[5],
        procedencia: r[6], asunto: r[7], contenido: r[8],
        fuente: r[9], estado: r[10], creado_por: r[11],
        estado_final: r[12], fecha_cierre: r[13],
        derivaciones: []
      };

      const derivRows = deriv.getDataRange().getValues();
      for (let j = 1; j < derivRows.length; j++) {
        if (parseInt(derivRows[j][1]) === id) {
          const d = derivRows[j];
          documento.derivaciones.push({
            id: d[0], documento_id: d[1], area_destino: d[2],
            pase_numero: d[3], derivado_por: d[4], fecha_derivacion: d[5],
            recibido_por: d[6], fecha_recepcion: d[7], estado: d[8],
            devuelto_por: d[9], fecha_respuesta: d[10],
            descargo: d[11], n_descargo: d[12], ht: d[13]
          });
        }
      }

      return { success: true, documento: documento };
    }
  }

  return { success: false, error: 'Documento no encontrado' };
}

// ============================================
// DERIVAR documento a una o más áreas
// ============================================
function derivar(data) {
  const { doc, deriv, hist } = ensureSheets();
  const docId = parseInt(data.documento_id);
  const areas = Array.isArray(data.areas) ? data.areas : [data.area_destino];
  const ts = now();

  // Actualizar estado del documento
  const docRows = doc.getDataRange().getValues();
  for (let i = 1; i < docRows.length; i++) {
    if (parseInt(docRows[i][0]) === docId) {
      doc.getRange(i + 1, 11).setValue('DERIVADO'); // K = ESTADO
      break;
    }
  }

  // Crear derivaciones
  const derivIds = [];
  for (let k = 0; k < areas.length; k++) {
    const area = areas[k];
    const did = nextId(deriv);
    const pase = nextPase(deriv);

    deriv.getRange(did + 1, 1, 1, 14).setValues([[
      did, docId, area, pase,
      data.derivado_por || '', ts,
      '', '', 'DERIVADO',
      '', '', '', '', ''
    ]]);

    derivIds.push(did);

    // Historial de cada derivación
    const hid = nextId(hist);
    hist.getRange(hid + 1, 1, 1, 9).setValues([[
      hid, docId, did,
      'DERIVAR', 'REGISTRADO', 'DERIVADO',
      JSON.stringify({ area_destino: area, pase_numero: pase }),
      data.derivado_por || '', ts
    ]]);
  }

  return { success: true, derivaciones_ids: derivIds, cantidad: areas.length };
}

// ============================================
// RECIBIR - Área confirma recepción
// ============================================
function recibir(data) {
  const { deriv, hist } = ensureSheets();
  const derivId = parseInt(data.derivacion_id);
  const ts = now();

  const rows = deriv.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === derivId) {
      deriv.getRange(i + 1, 7).setValue(data.recibido_por || '');  // G = RECIBIDO_POR
      deriv.getRange(i + 1, 8).setValue(ts);                        // H = FECHA_RECEPCION
      deriv.getRange(i + 1, 9).setValue('RECIBIDO');                // I = ESTADO

      // Historial
      const hid = nextId(hist);
      hist.getRange(hid + 1, 1, 1, 9).setValues([[
        hid, rows[i][1], derivId,
        'RECIBIR', 'DERIVADO', 'RECIBIDO',
        JSON.stringify({ area_destino: rows[i][2] }),
        data.recibido_por || '', ts
      ]]);

      return { success: true };
    }
  }
  return { success: false, error: 'Derivación no encontrada' };
}

// ============================================
// DEVOLVER - Área devuelve con respuesta
// ============================================
function devolver(data) {
  const { deriv, hist } = ensureSheets();
  const derivId = parseInt(data.derivacion_id);
  const ts = now();

  const rows = deriv.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === derivId) {
      deriv.getRange(i + 1, 9).setValue('DEVUELTO');                // I = ESTADO
      deriv.getRange(i + 1, 10).setValue(data.devuelto_por || '');  // J = DEVUELTO_POR
      deriv.getRange(i + 1, 11).setValue(ts);                       // K = FECHA_RESPUESTA
      deriv.getRange(i + 1, 12).setValue(data.descargo || '');      // L = DESCARGO
      deriv.getRange(i + 1, 13).setValue(data.n_descargo || '');    // M = N_DESCARGO
      deriv.getRange(i + 1, 14).setValue(data.ht || '');            // N = HT

      // Historial
      const hid = nextId(hist);
      hist.getRange(hid + 1, 1, 1, 9).setValues([[
        hid, rows[i][1], derivId,
        'DEVOLVER', 'RECIBIDO', 'DEVUELTO',
        JSON.stringify({ descargo: data.descargo, n_descargo: data.n_descargo }),
        data.devuelto_por || '', ts
      ]]);

      return { success: true };
    }
  }
  return { success: false, error: 'Derivación no encontrada' };
}

// ============================================
// TRAMITAR - Mesa procesa devoluciones
// ============================================
function tramitar(data) {
  const { doc, hist } = ensureSheets();
  const docId = parseInt(data.documento_id);
  const ts = now();

  const rows = doc.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === docId) {
      doc.getRange(i + 1, 11).setValue('TRAMITADO'); // K = ESTADO

      const hid = nextId(hist);
      hist.getRange(hid + 1, 1, 1, 9).setValues([[
        hid, docId, '',
        'TRAMITAR', 'DERIVADO', 'TRAMITADO',
        JSON.stringify({ observaciones: data.observaciones || '' }),
        data.realizado_por || '', ts
      ]]);

      return { success: true };
    }
  }
  return { success: false, error: 'Documento no encontrado' };
}

// ============================================
// CERRAR - Mesa cierra el documento
// ============================================
function cerrar(data) {
  const { doc, hist } = ensureSheets();
  const docId = parseInt(data.documento_id);
  const estadoFinal = data.estado_final || 'RESUELTO';
  const ts = now();

  const rows = doc.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === docId) {
      doc.getRange(i + 1, 11).setValue('CERRADO');       // K = ESTADO
      doc.getRange(i + 1, 13).setValue(estadoFinal);      // M = ESTADO_FINAL
      doc.getRange(i + 1, 14).setValue(ts);               // N = FECHA_CIERRE

      const hid = nextId(hist);
      hist.getRange(hid + 1, 1, 1, 9).setValues([[
        hid, docId, '',
        'CERRAR', 'TRAMITADO', 'CERRADO',
        JSON.stringify({ estado_final: estadoFinal }),
        data.realizado_por || '', ts
      ]]);

      return { success: true };
    }
  }
  return { success: false, error: 'Documento no encontrado' };
}

// ============================================
// ELIMINAR documento + derivaciones + historial
// ============================================
function eliminar(data) {
  const { doc, deriv, hist } = ensureSheets();
  const docId = parseInt(data.numero || data.id);

  // Eliminar historial del documento
  const hRows = hist.getDataRange().getValues();
  for (let i = hRows.length - 1; i >= 1; i--) {
    if (parseInt(hRows[i][1]) === docId) {
      hist.deleteRow(i + 1);
    }
  }

  // Eliminar derivaciones del documento
  const dRows = deriv.getDataRange().getValues();
  for (let i = dRows.length - 1; i >= 1; i--) {
    if (parseInt(dRows[i][1]) === docId) {
      deriv.deleteRow(i + 1);
    }
  }

  // Eliminar documento
  const docRows = doc.getDataRange().getValues();
  for (let i = 1; i < docRows.length; i++) {
    if (parseInt(docRows[i][0]) === docId) {
      doc.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: 'Documento no encontrado' };
}

// ============================================
// HISTORIAL - Obtener historial de un documento
// ============================================
function historial(data) {
  const { hist } = ensureSheets();
  const docId = parseInt(data.documento_id);
  const registros = [];

  const rows = hist.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][1]) === docId) {
      registros.push({
        id: rows[i][0], documento_id: rows[i][1],
        derivacion_id: rows[i][2], accion: rows[i][3],
        estado_anterior: rows[i][4], estado_nuevo: rows[i][5],
        detalles: rows[i][6], realizado_por: rows[i][7],
        fecha: rows[i][8]
      });
    }
  }

  return { success: true, historial: registros };
}
