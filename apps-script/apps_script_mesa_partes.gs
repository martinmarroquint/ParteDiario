// ================================================================
// MESA DE PARTES HRPA v5.0
// Sistema de gestión documental con trazabilidad completa
//
// HOJAS:
//   DOCUMENTOS   — Documentos registrados (inmutables después de crear)
//   MOVIMIENTOS  — Pases, devoluciones, resoluciones (docs derivados)
//   DERIVACIONES — Estado de entrega por área
//   HISTORIAL    — Audit trail: quién hizo qué
//   BD           — Catálogos: Col A=TipoDoc, Col B=TipoMov, Col C=Areas
//
// FLUJO:
//   1. Registrar  → DOCUMENTO (REGISTRADO) — editable solo aquí
//   2. Derivar    → MOVIMIENTO (PASE/DECRETO/etc) + DERIVACIÓN (DERIVADO)
//   3. Recibir    → DERIVACIÓN (RECIBIDO)
//   4. Devolver   → MOVIMIENTO (DEVOLUCIÓN) + DERIVACIÓN (DEVUELTO)
//   5. Cerrar     → MOVIMIENTO (RESOLUCIÓN) + DOCUMENTO (CERRADO)
//
// NUMERACIÓN CORRELATIVA:
//   DOC-001/2026   (registro)
//   PASE-001/2026  (tipo de movimiento de BD Col B)
//   DEV-001/2026   (devolución)
//   RES-001/2026   (resolución)
// ================================================================

function doPost(e) {
  try {
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(ex) {}
    }
    if (!data.accion && e && e.parameter) {
      data = Object.assign(data, e.parameter);
    }
    if (!data.accion) return json({ success: false, error: 'Acción requerida' });

    switch(data.accion) {
      case 'registrar':      return json(registrar(data));
      case 'derivar':        return json(derivar(data));
      case 'recibir':        return json(recibir(data));
      case 'devolver':       return json(devolver(data));
      case 'cerrar':         return json(cerrar(data));
      case 'eliminar':       return json(eliminar(data));
      case 'listar':         return json(listar(data));
      case 'obtener':        return json(obtener(data));
      case 'bandeja':        return json(bandeja(data));
      case 'historial':      return json(historial(data));
      case 'opciones':       return json(opciones(data));
      default:               return json({ success: false, error: 'Acción no reconocida: ' + data.accion });
    }
  } catch(error) {
    return json({ success: false, error: error.toString() });
  }
}

function doGet(e) {
  return json({ status: 'activo', sistema: 'MESA_PARTES_HRPA', version: '5.0' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// HELPERS
// ================================================================

function ensureSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // DOCUMENTOS — el documento original (inmutable)
  let doc = ss.getSheetByName('DOCUMENTOS');
  if (!doc) {
    doc = ss.insertSheet('DOCUMENTOS');
  }
  // SIEMPRE actualizar encabezados (por si cambiaron)
  doc.getRange('A1:L1').setValues([[
    'ID', 'NUMERO', 'FECHA_REGISTRO', 'TIPO_DOC', 'N_DOC_ORIGEN',
    'FECHA_DOC', 'PROCEDENCIA', 'ASUNTO', 'CONTENIDO', 'FUENTE',
    'CREADO_POR', 'ESTADO'
  ]]);
  doc.getRange('A1:L1').setFontWeight('bold').setBackground('#E8F5E9');
  doc.setFrozenRows(1);

  // MOVIMIENTOS — pases, devoluciones, resoluciones
  let mov = ss.getSheetByName('MOVIMIENTOS');
  if (!mov) {
    mov = ss.insertSheet('MOVIMIENTOS');
  }
  mov.getRange('A1:I1').setValues([[
    'ID', 'DOCUMENTO_ID', 'TIPO_MOV', 'NUMERO', 'FECHA',
    'CONTENIDO', 'AREA_DESTINO', 'CREADO_POR', 'N_DOC_REF'
  ]]);
  mov.getRange('A1:I1').setFontWeight('bold').setBackground('#E3F2FD');
  mov.setFrozenRows(1);

  // DERIVACIONES — estado de entrega por área
  let deriv = ss.getSheetByName('DERIVACIONES');
  if (!deriv) {
    deriv = ss.insertSheet('DERIVACIONES');
  }
  deriv.getRange('A1:J1').setValues([[
    'ID', 'DOCUMENTO_ID', 'MOVIMIENTO_ID', 'AREA_DESTINO',
    'FECHA_DERIVACION', 'RECIBIDO_POR', 'FECHA_RECEPCION',
    'DEVUELTO_POR', 'FECHA_DEVOLUCION', 'ESTADO'
  ]]);
  deriv.getRange('A1:J1').setFontWeight('bold').setBackground('#FFF3E0');
  deriv.setFrozenRows(1);

  // HISTORIAL — audit trail
  let hist = ss.getSheetByName('HISTORIAL');
  if (!hist) {
    hist = ss.insertSheet('HISTORIAL');
  }
  hist.getRange('A1:G1').setValues([[
    'ID', 'DOCUMENTO_ID', 'MOVIMIENTO_ID', 'ACCION',
    'DETALLES', 'REALIZADO_POR', 'FECHA'
  ]]);
  hist.getRange('A1:G1').setFontWeight('bold').setBackground('#F3E5F5');
  hist.setFrozenRows(1);

  return { doc, mov, deriv, hist };
}

function now() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', "yyyy-MM-dd HH:mm:ss");
}

function today() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', "yyyy-MM-dd");
}

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

function nextNumero(sheet, prefix) {
  const last = sheet.getLastRow();
  const year = new Date().getFullYear();
  if (last <= 1) return prefix + '-001/' + year;
  const nums = sheet.getRange(2, 4, last - 1, 1).getValues(); // Column D = NUMERO
  let max = 0;
  for (let i = 0; i < nums.length; i++) {
    const m = String(nums[i][0]).match(new RegExp(prefix + '-(\\d+)/'));
    if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
  }
  return prefix + '-' + String(max + 1).padStart(3, '0') + '/' + year;
}

function nextDocNumero(sheet) {
  const last = sheet.getLastRow();
  const year = new Date().getFullYear();
  if (last <= 1) return 'DOC-001/' + year;
  const nums = sheet.getRange(2, 2, last - 1, 1).getValues(); // Column B = NUMERO
  let max = 0;
  for (let i = 0; i < nums.length; i++) {
    const m = String(nums[i][0]).match(/DOC-(\d+)\//);
    if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
  }
  return 'DOC-' + String(max + 1).padStart(3, '0') + '/' + year;
}

// ================================================================
// REGISTRAR — Crear documento original (editable solo aquí)
// ================================================================
function registrar(data) {
  const { doc, hist } = ensureSheets();
  const id = nextId(doc);
  const numero = nextDocNumero(doc);
  const ts = now();

  // Crear documento
  doc.getRange(id + 1, 1, 1, 12).setValues([[
    id, numero, ts,
    data.tipo_doc || '', data.n_doc_origen || '', data.fecha_doc || '',
    data.procedencia || '', data.asunto || '', data.contenido || '',
    data.fuente || 'fisico',
    data.creado_por || '', 'REGISTRADO'
  ]]);

  // Historial
  const hid = nextId(hist);
  hist.getRange(hid + 1, 1, 1, 7).setValues([[
    hid, id, '',
    'REGISTRAR',
    JSON.stringify({ tipo_doc: data.tipo_doc, procedencia: data.procedencia }),
    data.creado_por || '', ts
  ]]);

  return { success: true, id: id, numero: numero, fecha_registro: ts };
}

// ================================================================
// DERIVAR — Crear movimiento (pase/decreto/etc) + derivación
// ================================================================
function derivar(data) {
  const { doc, mov, deriv, hist } = ensureSheets();
  const docId = parseInt(data.documento_id);
  const tipoMov = data.tipo_mov || 'PASE';
  const ts = now();

  // Validar que el documento existe y está en estado correcto
  const docRows = doc.getDataRange().getValues();
  let docFound = false;
  for (let i = 1; i < docRows.length; i++) {
    if (parseInt(docRows[i][0]) === docId) {
      docFound = true;
      const estado = docRows[i][11]; // L = ESTADO
      if (estado !== 'REGISTRADO' && estado !== 'DERIVADO') {
        return { success: false, error: 'El documento no puede derivarse (estado: ' + estado + ')' };
      }
      // Actualizar estado a DERIVADO
      doc.getRange(i + 1, 12).setValue('DERIVADO');
      break;
    }
  }
  if (!docFound) return { success: false, error: 'Documento no encontrado' };

  // Crear movimiento por cada área destino
  const areas = Array.isArray(data.areas) ? data.areas : [data.area_destino];
  const movIds = [];
  const derivIds = [];

  for (let k = 0; k < areas.length; k++) {
    const area = areas[k];
    if (!area || !area.trim()) continue;

    // Crear movimiento
    const movId = nextId(mov);
    const numero = nextNumero(mov, tipoMov.replace(' ', ''));

    mov.getRange(movId + 1, 1, 1, 9).setValues([[
      movId, docId, tipoMov, numero, ts,
      data.contenido || '',
      area,
      data.creado_por || '',
      data.n_doc_ref || ''
    ]]);

    movIds.push(movId);

    // Crear derivación
    const derivId = nextId(deriv);
    deriv.getRange(derivId + 1, 1, 1, 10).setValues([[
      derivId, docId, movId, area,
      ts, '', '', '', '',
      'DERIVADO'
    ]]);
    derivIds.push(derivId);

    // Historial
    const hid = nextId(hist);
    hist.getRange(hid + 1, 1, 1, 7).setValues([[
      hid, docId, movId,
      'DERIVAR',
      JSON.stringify({ area_destino: area, tipo_mov: tipoMov, pase_numero: numero }),
      data.creado_por || '', ts
    ]]);
  }

  return {
    success: true,
    movimientos_ids: movIds,
    derivaciones_ids: derivIds,
    cantidad: areas.length
  };
}

// ================================================================
// RECIBIR — Área confirma recepción
// ================================================================
function recibir(data) {
  const { deriv, hist } = ensureSheets();
  const derivId = parseInt(data.derivacion_id);
  const ts = now();

  const rows = deriv.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === derivId) {
      if (rows[i][9] !== 'DERIVADO') {
        return { success: false, error: 'Esta derivación ya fue recibida' };
      }

      deriv.getRange(i + 1, 6).setValue(data.recibido_por || '');  // F = RECIBIDO_POR
      deriv.getRange(i + 1, 7).setValue(ts);                         // G = FECHA_RECEPCION
      deriv.getRange(i + 1, 10).setValue('RECIBIDO');                // J = ESTADO

      // Historial
      const hid = nextId(hist);
      hist.getRange(hid + 1, 1, 1, 7).setValues([[
        hid, rows[i][1], rows[i][2],
        'RECIBIR',
        JSON.stringify({ area_destino: rows[i][3] }),
        data.recibido_por || '', ts
      ]]);

      return { success: true };
    }
  }
  return { success: false, error: 'Derivación no encontrada' };
}

// ================================================================
// DEVOLVER — Área crea documento de devolución
// ================================================================
function devolver(data) {
  const { mov, deriv, hist } = ensureSheets();
  const derivId = parseInt(data.derivacion_id);
  const ts = now();

  const rows = deriv.getDataRange().getValues();
  let docId = 0;
  let area = '';

  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === derivId) {
      if (rows[i][9] !== 'RECIBIDO') {
        return { success: false, error: 'Solo se puede devolver un documento recibido' };
      }

      docId = parseInt(rows[i][1]);
      area = rows[i][3];

      // Crear movimiento de devolución
      const movId = nextId(mov);
      const numero = nextNumero(mov, 'DEV');

      mov.getRange(movId + 1, 1, 1, 9).setValues([[
        movId, docId, 'DEVOLUCION', numero, ts,
        data.contenido || '',
        'MESA DE PARTES',  // Devuelve a Mesa
        data.devuelto_por || '',
        ''  // n_doc_ref no aplica para devoluciones
      ]]);

      // Actualizar derivación
      deriv.getRange(i + 1, 8).setValue(data.devuelto_por || '');  // H = DEVUELTO_POR
      deriv.getRange(i + 1, 9).setValue(ts);                        // I = FECHA_DEVOLUCION
      deriv.getRange(i + 1, 10).setValue('DEVUELTO');               // J = ESTADO

      // Historial
      const hid = nextId(hist);
      hist.getRange(hid + 1, 1, 1, 7).setValues([[
        hid, docId, movId,
        'DEVOLVER',
        JSON.stringify({ descargo: data.contenido, n_descargo: data.n_descargo }),
        data.devuelto_por || '', ts
      ]]);

      return { success: true, mov_id: movId, numero: numero };
    }
  }
  return { success: false, error: 'Derivación no encontrada' };
}

// ================================================================
// CERRAR — Mesa crea documento de resolución y cierra
// ================================================================
function cerrar(data) {
  const { doc, mov, hist } = ensureSheets();
  const docId = parseInt(data.documento_id);
  const ts = now();

  const rows = doc.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === docId) {
      // Crear movimiento de resolución
      const movId = nextId(mov);
      const numero = nextNumero(mov, 'RES');

      mov.getRange(movId + 1, 1, 1, 9).setValues([[
        movId, docId, 'RESOLUCION', numero, ts,
        data.contenido || '',
        '',  // Sin área destino (es cierre)
        data.creado_por || '',
        ''  // n_doc_ref no aplica para resoluciones
      ]]);

      // Cerrar documento
      doc.getRange(i + 1, 12).setValue('CERRADO');  // L = ESTADO

      // Historial
      const hid = nextId(hist);
      hist.getRange(hid + 1, 1, 1, 7).setValues([[
        hid, docId, movId,
        'CERRAR',
        JSON.stringify({ estado_final: data.estado_final || 'RESUELTO' }),
        data.creado_por || '', ts
      ]]);

      return { success: true, mov_id: movId, numero: numero };
    }
  }
  return { success: false, error: 'Documento no encontrado' };
}

// ================================================================
// ELIMINAR — Borrar documento + movimientos + derivaciones + historial
// ================================================================
function eliminar(data) {
  const { doc, mov, deriv, hist } = ensureSheets();
  const docId = parseInt(data.numero || data.id);

  // Eliminar historial
  const hRows = hist.getDataRange().getValues();
  for (let i = hRows.length - 1; i >= 1; i--) {
    if (parseInt(hRows[i][1]) === docId) hist.deleteRow(i + 1);
  }

  // Eliminar derivaciones
  const dRows = deriv.getDataRange().getValues();
  for (let i = dRows.length - 1; i >= 1; i--) {
    if (parseInt(dRows[i][1]) === docId) deriv.deleteRow(i + 1);
  }

  // Eliminar movimientos
  const mRows = mov.getDataRange().getValues();
  for (let i = mRows.length - 1; i >= 1; i--) {
    if (parseInt(mRows[i][1]) === docId) mov.deleteRow(i + 1);
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

// ================================================================
// LISTAR — Todos los documentos con movimientos y derivaciones
// ================================================================
function listar(data) {
  const { doc, mov, deriv } = ensureSheets();

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
        fuente: r[9], creado_por: r[10], estado: r[11],
        movimientos: [], derivaciones: []
      });
    }
  }

  // Leer movimientos
  const movRows = mov.getDataRange().getValues();
  if (movRows.length > 1) {
    for (let i = 1; i < movRows.length; i++) {
      const r = movRows[i];
      const m = {
        id: r[0], documento_id: r[1], tipo_mov: r[2],
        numero: r[3], fecha: r[4], contenido: r[5],
        area_destino: r[6], creado_por: r[7],
        n_doc_ref: r[8] || ''
      };
      const doc = documentos.find(x => x.id === m.documento_id);
      if (doc) doc.movimientos.push(m);
    }
  }

  // Leer derivaciones
  const derivRows = deriv.getDataRange().getValues();
  if (derivRows.length > 1) {
    for (let i = 1; i < derivRows.length; i++) {
      const r = derivRows[i];
      const d = {
        id: r[0], documento_id: r[1], movimiento_id: r[2],
        area_destino: r[3], fecha_derivacion: r[4],
        recibido_por: r[5], fecha_recepcion: r[6],
        devuelto_por: r[7], fecha_devolucion: r[8],
        estado: r[9]
      };
      const doc = documentos.find(x => x.id === d.documento_id);
      if (doc) doc.derivaciones.push(d);
    }
  }

  // Ordenar por ID descendente
  documentos.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));

  return { success: true, documentos: documentos };
}

// ================================================================
// OBTENER — Documento individual con movimientos y derivaciones
// ================================================================
function obtener(data) {
  const { doc, mov, deriv } = ensureSheets();
  const id = parseInt(data.id);

  const docRows = doc.getDataRange().getValues();
  for (let i = 1; i < docRows.length; i++) {
    if (parseInt(docRows[i][0]) === id) {
      const r = docRows[i];
      const documento = {
        id: r[0], numero: r[1], fecha_registro: r[2],
        tipo_doc: r[3], n_doc_origen: r[4], fecha_doc: r[5],
        procedencia: r[6], asunto: r[7], contenido: r[8],
        fuente: r[9], creado_por: r[10], estado: r[11],
        movimientos: [], derivaciones: []
      };

      // Movimientos
      const movRows = mov.getDataRange().getValues();
      for (let j = 1; j < movRows.length; j++) {
        if (parseInt(movRows[j][1]) === id) {
          const m = movRows[j];
          documento.movimientos.push({
            id: m[0], documento_id: m[1], tipo_mov: m[2],
            numero: m[3], fecha: m[4], contenido: m[5],
            area_destino: m[6], creado_por: m[7]
          });
        }
      }

      // Derivaciones
      const derivRows = deriv.getDataRange().getValues();
      for (let j = 1; j < derivRows.length; j++) {
        if (parseInt(derivRows[j][1]) === id) {
          const d = derivRows[j];
          documento.derivaciones.push({
            id: d[0], documento_id: d[1], movimiento_id: d[2],
            area_destino: d[3], fecha_derivacion: d[4],
            recibido_por: d[5], fecha_recepcion: d[6],
            devuelto_por: d[7], fecha_devolucion: d[8],
            estado: d[9]
          });
        }
      }

      return { success: true, documento: documento };
    }
  }
  return { success: false, error: 'Documento no encontrado' };
}

// ================================================================
// BANDEJA — Documentos derivados a un área específica
// ================================================================
function bandeja(data) {
  const { doc, mov, deriv } = ensureSheets();
  const area = data.area;

  // Leer derivaciones del área
  const derivRows = deriv.getDataRange().getValues();
  const docIds = new Set();
  const derivaciones = [];

  if (derivRows.length > 1) {
    for (let i = 1; i < derivRows.length; i++) {
      const r = derivRows[i];
      if (r[3] && r[3].toString().toUpperCase() === area.toUpperCase()) {
        docIds.add(parseInt(r[1]));
        derivaciones.push({
          id: r[0], documento_id: r[1], movimiento_id: r[2],
          area_destino: r[3], fecha_derivacion: r[4],
          recibido_por: r[5], fecha_recepcion: r[6],
          devuelto_por: r[7], fecha_devolucion: r[8],
          estado: r[9]
        });
      }
    }
  }

  // Leer documentos asociados
  const documentos = [];
  const docRows = doc.getDataRange().getValues();
  if (docRows.length > 1) {
    for (let i = 1; i < docRows.length; i++) {
      const r = docRows[i];
      if (docIds.has(parseInt(r[0]))) {
        documentos.push({
          id: r[0], numero: r[1], fecha_registro: r[2],
          tipo_doc: r[3], n_doc_origen: r[4], fecha_doc: r[5],
          procedencia: r[6], asunto: r[7], contenido: r[8],
          fuente: r[9], creado_por: r[10], estado: r[11],
          derivaciones: derivaciones.filter(d => d.documento_id === r[0])
        });
      }
    }
  }

  // Leer movimientos de esos documentos
  const movRows = mov.getDataRange().getValues();
  if (movRows.length > 1) {
    for (let i = 1; i < movRows.length; i++) {
      const r = movRows[i];
      const doc = documentos.find(x => x.id === parseInt(r[1]));
      if (doc) {
        doc.movimientos = doc.movimientos || [];
        doc.movimientos.push({
          id: r[0], documento_id: r[1], tipo_mov: r[2],
          numero: r[3], fecha: r[4], contenido: r[5],
          area_destino: r[6], creado_por: r[7],
          n_doc_ref: r[8] || ''
        });
      }
    }
  }

  documentos.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));

  return { success: true, documentos: documentos };
}

// ================================================================
// HISTORIAL — Audit trail de un documento
// ================================================================
function historial(data) {
  const { hist } = ensureSheets();
  const docId = parseInt(data.documento_id);
  const registros = [];

  const rows = hist.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][1]) === docId) {
      registros.push({
        id: rows[i][0], documento_id: rows[i][1],
        movimiento_id: rows[i][2], accion: rows[i][3],
        detalles: rows[i][4], realizado_por: rows[i][5],
        fecha: rows[i][6]
      });
    }
  }

  return { success: true, historial: registros };
}

// ================================================================
// OPCIONES — Catálogos desde BD
// ================================================================
function opciones(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bd = ss.getSheetByName('BD');
  if (!bd) return { success: true, tipos_doc: [], tipos_mov: [], areas: [] };

  const rows = bd.getDataRange().getValues();
  const tiposDoc = new Set();
  const tiposMov = new Set();
  const areas = [];

  if (rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      // Col A = Tipo documento (registro)
      if (r[0] && String(r[0]).trim()) {
        const val = String(r[0]).trim();
        if (val.toUpperCase() !== 'TIPO DOC.' && val.toUpperCase() !== 'TIPO') {
          tiposDoc.add(val);
        }
      }
      // Col B = Tipo movimiento (pase/decreto/etc)
      if (r[1] && String(r[1]).trim()) {
        const val = String(r[1]).trim();
        if (val.toUpperCase() !== 'DOC. DE TRAMITE' && val.toUpperCase() !== 'DOC DE TRAMITE') {
          tiposMov.add(val);
        }
      }
      // Col C = Áreas
      if (r[2] && String(r[2]).trim()) {
        const val = String(r[2]).trim();
        if (val.toUpperCase() !== 'AREA ENTREGADA' && val.toUpperCase() !== 'AREA') {
          areas.push(val);
        }
      }
    }
  }

  return {
    success: true,
    tipos_doc: Array.from(tiposDoc).sort(),
    tipos_mov: Array.from(tiposMov).sort(),
    areas: areas  // Mantener orden del sheet (no sort)
  };
}
